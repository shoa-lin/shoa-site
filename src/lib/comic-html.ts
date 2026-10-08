/**
 * Comic HTML handling shared by the Astro comic pages and scripts/comics.mjs.
 *
 * Comics arrive as complete, self-contained HTML documents (inline CSS/JS, often Google
 * Fonts). The site keeps that file as the source and wraps it at build time. This module:
 * - splits a document into the parts the wrapper needs (html/body attributes, head, body);
 * - drops what the wrapper provides itself (title, charset, viewport, SEO tags, icons) and
 *   any site shell left over from earlier versions or from a page saved off the live site;
 * - takes Google Fonts off the critical path (removed when self-hosted fonts exist,
 *   otherwise loaded without blocking rendering, since Google Fonts is blocked in China);
 * - points relative asset URLs at the comic's asset folder.
 * It has no Astro imports so Node scripts and unit tests can use it directly.
 */
import { defaultTreeAdapter as tree, html as parse5Html, parse, serialize, serializeOuter, type DefaultTreeAdapterMap } from "parse5";

type ChildNode = DefaultTreeAdapterMap["childNode"];
type Element = DefaultTreeAdapterMap["element"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];
type Document = DefaultTreeAdapterMap["document"];

const HTML_NS = parse5Html.NS.HTML;
const GOOGLE_FONTS_HOST = /^(?:https?:)?\/\/fonts\.(?:googleapis|gstatic)\.com(?:\/|$)/i;
const GOOGLE_FONTS_CSS = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css2?\b/i;
const GOOGLE_FONTS_IMPORT = /@import\s+(?:url\(\s*)?(["']?)((?:https?:)?\/\/fonts\.googleapis\.com\/[^"')\s;]+)\1\s*\)?[^;]*;?/gi;
const SHELL_META_NAMES = /^(?:description|viewport|theme-color|robots|generator|twitter:.*)$/i;
const SHELL_LINK_RELS = new Set(["canonical", "alternate", "icon", "shortcut", "apple-touch-icon", "mask-icon", "manifest"]);

/** CJK body-text families are not self-hosted; comics fall back to the reader's system fonts. */
export const SYSTEM_TEXT_FAMILIES = /^(?:Noto (?:Sans|Serif)(?: Mono)? (?:SC|TC|HK|JP|KR)|Noto (?:Sans|Serif) CJK.*|Source Han (?:Sans|Serif).*)$/i;

export interface ComicDocument {
  /** Attributes of <html> except lang and dir, which the wrapper sets from the edition locale. */
  htmlAttrs: Record<string, string>;
  bodyAttrs: Record<string, string>;
  /** Serialized head content the comic needs (styles, scripts, non-SEO links). */
  head: string;
  /** Serialized body content. */
  body: string;
  title: string;
  description: string;
  /** Google Fonts stylesheet URLs the comic asked for (links and @import). */
  googleFontUrls: string[];
}

export interface ComicTransformOptions {
  /** Absolute prefix for relative asset URLs, for example "/comics/my-comic/assets/". */
  assetBase?: string;
  /** True when self-hosted @font-face rules replace the comic's Google Fonts. */
  hasLocalFonts?: boolean;
}

function isElement(node: { nodeName: string }): node is Element {
  return "tagName" in node;
}

function isHtml(element: Element): boolean {
  return element.namespaceURI === HTML_NS;
}

function getAttr(element: Element, name: string): string | undefined {
  return element.attrs.find((attribute) => attribute.name === name)?.value;
}

function setAttr(element: Element, name: string, value: string): void {
  const existing = element.attrs.find((attribute) => attribute.name === name);
  if (existing) existing.value = value;
  else element.attrs.push({ name, value });
}

function attrsToRecord(element: Element | undefined, skip: string[] = []): Record<string, string> {
  const record: Record<string, string> = {};
  for (const attribute of element?.attrs ?? []) {
    if (!skip.includes(attribute.name)) record[attribute.name] = attribute.value;
  }
  return record;
}

function relList(element: Element): string[] {
  return (getAttr(element, "rel") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function textContent(node: ParentNode): string {
  let text = "";
  for (const child of node.childNodes) {
    if (child.nodeName === "#text") text += (child as DefaultTreeAdapterMap["textNode"]).value;
    else if (isElement(child)) text += textContent(child);
  }
  return text;
}

function setTextContent(element: Element, text: string): void {
  for (const child of [...element.childNodes]) tree.detachNode(child);
  tree.insertText(element, text);
}

function childElements(node: ParentNode | undefined): Element[] {
  return (node?.childNodes ?? []).filter(isElement);
}

function findChild(node: ParentNode | undefined, tagName: string): Element | undefined {
  return childElements(node).find((element) => element.tagName === tagName);
}

function documentParts(document: Document): { html?: Element; head?: Element; body?: Element } {
  const html = findChild(document, "html");
  return { html, head: findChild(html, "head"), body: findChild(html, "body") };
}

/** Elements the site wrapper owns: earlier shells, injected language bars, bundled scripts. */
function isShellArtifact(element: Element, parent: ParentNode): boolean {
  const tag = element.tagName;
  const className = getAttr(element, "class") ?? "";
  const src = getAttr(element, "src") ?? "";
  const href = getAttr(element, "href") ?? "";
  if (tag === "shoa-comic-header" || tag === "shoa-comic-footer") return true;
  if (getAttr(element, "data-shoa-shell") !== undefined || getAttr(element, "data-comic-header") !== undefined) return true;
  if (getAttr(element, "data-comic-fonts") !== undefined) return true;
  if (tag === "nav" && /\bcomic-langs\b/.test(className)) return true;
  if (tag === "script" && (/\/comics\/(?:navigation|comics)\.js/.test(src) || src.startsWith("/_astro/"))) return true;
  if (tag === "link" && (/\/comics\/navigation\.css/.test(href) || href.startsWith("/_astro/"))) return true;
  if (tag === "style" && /\.comic-langs\s*\{/.test(textContent(element))) return true;
  // Description the old site generated for every comic page.
  if (tag === "meta" && / - Shoa Lin visual comic article$/.test(getAttr(element, "content") ?? "")) return true;
  // The old site appended a bare "Contact" mailto link to <body> to satisfy a test.
  const parentTag = isElement(parent) ? parent.tagName : "";
  if (tag === "a" && parentTag === "body" && href.startsWith("mailto:") && getAttr(element, "aria-label") === "Email") return true;
  return false;
}

/** Head elements the wrapper renders itself from the comic's metadata. */
function isProvidedByWrapper(element: Element): boolean {
  const tag = element.tagName;
  if (tag === "title" || tag === "base") return true;
  if (tag === "meta") {
    if (getAttr(element, "charset") !== undefined) return true;
    if ((getAttr(element, "http-equiv") ?? "").toLowerCase() === "content-type") return true;
    const name = getAttr(element, "name");
    if (name && SHELL_META_NAMES.test(name)) return true;
    const property = getAttr(element, "property");
    if (property && /^og:/i.test(property)) return true;
  }
  if (tag === "link" && relList(element).some((rel) => SHELL_LINK_RELS.has(rel))) return true;
  return false;
}

function isRelativeUrl(url: string): boolean {
  const value = url.trim();
  return value.length > 0 && !/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?|\{\{)/i.test(value);
}

function resolveAsset(url: string, assetBase: string): string {
  const resolved = new URL(url.trim(), `https://comic.invalid${assetBase}`);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function rewriteCssUrls(css: string, assetBase: string): string {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote: string, url: string) => (
    isRelativeUrl(url) && !/^data:/i.test(url) ? `url(${quote}${resolveAsset(url, assetBase)}${quote})` : match
  ));
}

function rewriteSrcset(srcset: string, assetBase: string): string {
  return srcset.split(",").map((candidate) => {
    const [url, ...descriptor] = candidate.trim().split(/\s+/);
    return [url && isRelativeUrl(url) ? resolveAsset(url, assetBase) : url, ...descriptor].join(" ");
  }).join(", ");
}

const URL_ATTRIBUTES: Record<string, string[]> = {
  img: ["src"], source: ["src"], video: ["src", "poster"], audio: ["src"], track: ["src"],
  script: ["src"], link: ["href"], object: ["data"], embed: ["src"], iframe: ["src"], input: ["src"],
  image: ["href", "xlink:href"], use: ["href", "xlink:href"],
};

function rewriteElementUrls(element: Element, assetBase: string): void {
  for (const name of URL_ATTRIBUTES[element.tagName] ?? []) {
    const value = getAttr(element, name);
    if (value && isRelativeUrl(value)) setAttr(element, name, resolveAsset(value, assetBase));
  }
  for (const name of ["srcset", "imagesrcset"]) {
    const value = getAttr(element, name);
    if (value) setAttr(element, name, rewriteSrcset(value, assetBase));
  }
  const style = getAttr(element, "style");
  if (style && /url\(/i.test(style)) setAttr(element, "style", rewriteCssUrls(style, assetBase));
}

function nonBlockingStylesheet(element: Element): void {
  setAttr(element, "media", "print");
  setAttr(element, "onload", "this.media='all'");
}

function walk(parent: ParentNode, visit: (element: Element, parent: ParentNode) => boolean): void {
  for (const child of [...parent.childNodes]) {
    if (!isElement(child)) continue;
    if (!visit(child, parent)) {
      tree.detachNode(child);
      continue;
    }
    walk(child, visit);
    const content = tree.getTemplateContent(child as DefaultTreeAdapterMap["template"]);
    if (child.tagName === "template" && content) walk(content, visit);
  }
}

function dropComments(parent: ParentNode): void {
  for (const child of [...parent.childNodes]) {
    if (child.nodeName === "#comment") tree.detachNode(child);
    else if (isElement(child)) dropComments(child);
  }
}

function serializeChildren(element: Element | undefined): string {
  return (element?.childNodes ?? [])
    .map((child: ChildNode) => (isElement(child) ? serializeOuter(child) : child.nodeName === "#text" ? serializeText(child) : ""))
    .join("")
    .trim();
}

function serializeText(node: ChildNode): string {
  const holder = tree.createElement("div", HTML_NS, []);
  tree.insertText(holder, (node as DefaultTreeAdapterMap["textNode"]).value);
  return serialize(holder);
}

/** Split a comic document into the parts the site wrapper renders. */
export function parseComicHtml(html: string, options: ComicTransformOptions = {}): ComicDocument {
  const document = parse(html);
  const { html: root, head, body } = documentParts(document);
  const googleFontUrls: string[] = [];
  const title = (head && findChild(head, "title") ? textContent(findChild(head, "title")!) : "").replace(/\s+/g, " ").trim();
  const descriptionMeta = childElements(head).find((element) => element.tagName === "meta" && getAttr(element, "name")?.toLowerCase() === "description");
  const description = (descriptionMeta ? getAttr(descriptionMeta, "content") ?? "" : "").trim();
  const assetBase = options.assetBase;

  dropComments(document);
  walk(document, (element, parent) => {
    if (isShellArtifact(element, parent)) return false;
    if (!isHtml(element)) {
      if (assetBase) rewriteElementUrls(element, assetBase);
      return true;
    }
    if (parent === head && isProvidedByWrapper(element)) return false;

    if (element.tagName === "link") {
      const href = getAttr(element, "href") ?? "";
      if (GOOGLE_FONTS_HOST.test(href)) {
        const rels = relList(element);
        if (rels.includes("stylesheet") && GOOGLE_FONTS_CSS.test(href)) {
          googleFontUrls.push(href);
          if (options.hasLocalFonts) return false;
          nonBlockingStylesheet(element);
          return true;
        }
        return false;
      }
    }

    if (element.tagName === "style") {
      let css = textContent(element);
      const imports: string[] = [];
      css = css.replace(GOOGLE_FONTS_IMPORT, (_match, _quote: string, url: string) => {
        imports.push(url);
        return "";
      });
      googleFontUrls.push(...imports);
      if (!options.hasLocalFonts) {
        for (const url of imports) {
          const link = tree.createElement("link", HTML_NS, [{ name: "rel", value: "stylesheet" }, { name: "href", value: url }]);
          nonBlockingStylesheet(link);
          tree.insertBefore(parent, link, element);
        }
      }
      if (assetBase) css = rewriteCssUrls(css, assetBase);
      setTextContent(element, css);
      return true;
    }

    if (assetBase) rewriteElementUrls(element, assetBase);
    return true;
  });

  return {
    htmlAttrs: attrsToRecord(root, ["lang", "dir"]),
    bodyAttrs: attrsToRecord(body),
    head: serializeChildren(head),
    body: serializeChildren(body),
    title,
    description,
    googleFontUrls: [...new Set(googleFontUrls)],
  };
}

/**
 * Remove what the site added (shell elements, anything marked data-shoa-shell, the old
 * site's injected bar and links) from a complete comic document, for example a page saved
 * from the live site. Returns the input unchanged when there is nothing to remove, so a
 * comic received from its author is stored byte for byte.
 */
export function cleanComicSource(html: string): { html: string; removed: number } {
  const document = parse(html);
  let removed = 0;
  walk(document, (element, parent) => {
    if (!isShellArtifact(element, parent)) return true;
    removed += 1;
    return false;
  });
  return removed ? { html: `${serialize(document).trim()}\n`, removed } : { html, removed };
}

export interface GoogleFontRequest {
  family: string;
  /** css2 axis spec, for example "wght@400;700", or "" for the default style. */
  axes: string;
}

/** Families and axes requested by a Google Fonts css or css2 URL. */
export function googleFontRequests(url: string): GoogleFontRequest[] {
  const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
  const requests: GoogleFontRequest[] = [];
  if (/\/css2$/.test(parsed.pathname)) {
    for (const value of parsed.searchParams.getAll("family")) {
      const [family, axes = ""] = value.split(":");
      if (family) requests.push({ family: family.trim(), axes: axes.trim() });
    }
    return requests;
  }
  for (const value of (parsed.searchParams.get("family") ?? "").split("|")) {
    const [family, weights = ""] = value.split(":");
    if (!family) continue;
    const list = weights.split(",").map((weight) => weight.replace(/italic|i$/i, "").trim()).filter((weight) => /^\d+$/.test(weight));
    requests.push({ family: family.trim(), axes: list.length ? `wght@${[...new Set(list)].sort().join(";")}` : "" });
  }
  return requests;
}

/** Warnings about patterns that tend to clash with the site wrapper or load poorly in China. */
export function lintComicHtml(html: string): string[] {
  const warnings: string[] = [];
  const document = parse(html);
  const { head, body } = documentParts(document);
  if (!head || !findChild(head, "title")) warnings.push("No <title>: set the edition title with --title.");
  const css: string[] = [];
  const externalScripts = new Set<string>();
  const externalStyles = new Set<string>();
  const relativeAssets = new Set<string>();
  let hasBase = false;
  walk(document, (element) => {
    if (element.tagName === "style") css.push(textContent(element));
    if (element.tagName === "base") hasBase = true;
    const src = getAttr(element, "src") ?? "";
    const href = getAttr(element, "href") ?? "";
    if (element.tagName === "script" && /^(?:https?:)?\/\//i.test(src)) externalScripts.add(new URL(src, "https://x").host);
    if (element.tagName === "link" && relList(element).includes("stylesheet") && /^(?:https?:)?\/\//i.test(href) && !GOOGLE_FONTS_HOST.test(href)) {
      externalStyles.add(new URL(href, "https://x").host);
    }
    for (const name of URL_ATTRIBUTES[element.tagName] ?? []) {
      const value = getAttr(element, name);
      if (value && isRelativeUrl(value)) relativeAssets.add(value);
    }
    const style = getAttr(element, "style");
    if (style) css.push(`x{${style}}`);
    return true;
  });
  const allCss = css.join("\n");
  for (const match of allCss.matchAll(/(?:^|[}\s,])((?:html|body|:root)[^{,]*)\{([^}]*)\}/g)) {
    const props = match[2] ?? "";
    if (/\b(?:padding|margin)(?:-(?:top|left|right|inline|block))?\s*:\s*(?!0(?:px)?\s*[;}]|0(?:px)?\s*$)/i.test(props)
      || /\bdisplay\s*:\s*(?:flex|grid)/i.test(props) || /\btransform\s*:/i.test(props)
      || /(?:^|[;\s])(?:max-)?width\s*:/i.test(props)) {
      warnings.push(`Page-level rule "${match[1]?.trim()} { ${props.trim().slice(0, 80)} }" also squeezes the site header and footer; move it onto a content wrapper.`);
    }
  }
  const topBars = [...allCss.matchAll(/\{([^}]*position\s*:\s*(?:fixed|sticky)[^}]*)\}/gi)]
    .map((match) => match[1] ?? "")
    .filter((rule) => /\btop\s*:\s*0/i.test(rule))
    // Thin progress bars (height up to 12px) are fine above the site header.
    .filter((rule) => !/\bheight\s*:\s*(?:\d|1[0-2])(?:\.\d+)?px/i.test(rule));
  if (topBars.length) {
    warnings.push("An element is fixed to the top (position: fixed/sticky; top: 0); check that it does not cover the site header.");
  }
  if (/@font-face[^}]*url\(\s*["']?(?:https?:)?\/\/(?!fonts\.gstatic\.com)/i.test(allCss)) {
    warnings.push("@font-face loads a font from another host, which may fail in mainland China; move the file into assets.");
  }
  for (const host of externalScripts) warnings.push(`External script from ${host} may fail or be slow in mainland China.`);
  for (const host of externalStyles) warnings.push(`External stylesheet from ${host} blocks rendering and may fail in mainland China.`);
  if (relativeAssets.size) warnings.push(`Relative asset paths need files in public/comics/<id>/assets/ (pass --assets): ${[...relativeAssets].slice(0, 8).join(", ")}`);
  if (hasBase) warnings.push("<base> is removed; relative paths resolve against the comic assets folder instead.");
  const dataUris = html.match(/data:[^"')\s]{300000,}/g);
  if (dataUris) warnings.push(`${dataUris.length} inline data: URI(s) over 300 KB; consider moving them into asset files.`);
  if (!body) warnings.push("No <body>: the whole file is treated as body content.");
  return warnings;
}
