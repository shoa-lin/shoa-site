/**
 * Comic HTML handling shared by the Astro comic pages and scripts/comics.mjs.
 *
 * Comics arrive as complete, self-contained HTML documents (inline CSS/JS, often Google
 * Fonts). The site keeps that file as the source and wraps it at build time. This module:
 * - splits a document into the parts the wrapper needs (html/body attributes, head, body);
 * - drops what the wrapper provides itself (title, charset, viewport, SEO tags, icons, CSP)
 *   and anything a site shell added, for example on a page saved from the live site;
 * - takes Google Fonts off the critical path: families the comic self-hosts are removed,
 *   anything else loads without blocking rendering (Google Fonts is blocked in China);
 * - maps relative asset references and external scripts to the copies `npm run comic` made.
 * It has no Astro imports so Node scripts and unit tests can use it directly.
 */
import { defaultTreeAdapter as tree, html as parse5Html, parse, serialize, serializeOuter, type DefaultTreeAdapterMap } from "parse5";

type ChildNode = DefaultTreeAdapterMap["childNode"];
type Element = DefaultTreeAdapterMap["element"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];
type Document = DefaultTreeAdapterMap["document"];
type Template = DefaultTreeAdapterMap["template"];

const HTML_NS = parse5Html.NS.HTML;
const GOOGLE_HOST = /^(?:https?:)?\/\/fonts\.(?:googleapis|gstatic)\.com(?:[/?#]|$)/i;
const GOOGLE_CSS = /^(?:https?:)?\/\/fonts\.googleapis\.com\/(?:css2?|icon)(?:[/?#]|$)/i;
const GOOGLE_IMPORT = /@import\s+(?:url\(\s*(["']?)((?:https?:)?\/\/fonts\.googleapis\.com\/[^"')]*?)\1\s*\)|(["'])((?:https?:)?\/\/fonts\.googleapis\.com\/[^"']*)\3)[^;]*;?/gi;
const SHELL_META_NAMES = /^(?:description|viewport|theme-color|robots|generator|twitter:.*)$/i;
const SHELL_HTTP_EQUIV = /^(?:content-type|content-security-policy|refresh)$/i;
const SHELL_LINK_RELS = new Set(["canonical", "alternate", "icon", "shortcut", "apple-touch-icon", "mask-icon", "manifest"]);
const URL_ATTRIBUTES = new Set(["src", "href", "poster", "data", "background"]);
const LEGACY_CONTACT = "mailto:shoa_lin@outlook.com";
// A quoted relative path to a media or data file inside an inline script: "img/panel-1.png".
const SCRIPT_ASSET = /(["'`])((?:\.\/)?[\w\-][\w\-./ ]*\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mp3|ogg|wav|json|woff2?|ttf|otf))\1/gi;

/** CJK body-text families are not self-hosted; comics fall back to the reader's system fonts. */
export const SYSTEM_TEXT_FAMILIES = /^(?:Noto (?:Sans|Serif)(?: Mono)? (?:SC|TC|HK|JP|KR)|Noto (?:Sans|Serif) CJK.*|Source Han (?:Sans|Serif).*)$/i;
/** Icon fonts depend on ligatures and Google's own class rules, so they stay on Google. */
export const ICON_FAMILIES = /^Material (?:Icons|Symbols)\b/i;

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
  /** Google Fonts stylesheet URLs the comic asked for (links, preloads and @import). */
  googleFontUrls: string[];
}

export interface ComicTransformOptions {
  /** Relative asset reference ("img/a.png") to the public URL of the copy made by `npm run comic`. */
  assets?: Record<string, string>;
  /** Lower-case Google font families the edition's generated font CSS accounts for. */
  handledFamilies?: ReadonlySet<string>;
  /** External script or stylesheet URL to the public URL of its downloaded copy. */
  vendored?: Record<string, string>;
}

export function stripBom(html: string): string {
  return html.charCodeAt(0) === 0xfeff ? html.slice(1) : html;
}

function isElement(node: { nodeName: string }): node is Element {
  return "tagName" in node;
}

function isHtml(element: Element): boolean {
  return element.namespaceURI === HTML_NS;
}

function getAttr(element: Element, name: string): string | undefined {
  return element.attrs.find((attribute) => attribute.name === name && !attribute.prefix)?.value;
}

function setAttr(element: Element, name: string, value: string): void {
  const existing = element.attrs.find((attribute) => attribute.name === name && !attribute.prefix);
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

function templateContent(element: Element): ParentNode | undefined {
  return element.tagName === "template" ? tree.getTemplateContent(element as Template) : undefined;
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

/** Visit every element (including template contents); return false to remove it. */
function walk(parent: ParentNode, visit: (element: Element, parent: ParentNode) => boolean): void {
  for (const child of [...parent.childNodes]) {
    if (!isElement(child)) continue;
    if (!visit(child, parent)) {
      tree.detachNode(child);
      continue;
    }
    walk(child, visit);
    const content = templateContent(child);
    if (content) walk(content, visit);
  }
}

function dropComments(parent: ParentNode): void {
  for (const child of [...parent.childNodes]) {
    if (child.nodeName === "#comment") tree.detachNode(child);
    else if (isElement(child)) {
      dropComments(child);
      const content = templateContent(child);
      if (content) dropComments(content);
    }
  }
}

/** Elements a site shell put into the page: shells, injected bars, bundled scripts, markers. */
function isShellArtifact(element: Element, parent: ParentNode): boolean {
  const tag = element.tagName;
  const className = getAttr(element, "class") ?? "";
  const src = getAttr(element, "src") ?? "";
  const href = getAttr(element, "href") ?? "";
  if (tag === "shoa-comic-header" || tag === "shoa-comic-footer" || tag === "shoa-comic-anchor") return true;
  if (getAttr(element, "data-shoa-shell") !== undefined || getAttr(element, "data-comic-header") !== undefined) return true;
  if (tag === "nav" && /\bcomic-langs\b/.test(className)) return true;
  if (tag === "script" && (/\/comics\/(?:navigation|comics)\.js/.test(src) || src.startsWith("/_astro/"))) return true;
  if (tag === "link" && (/\/comics\/navigation\.css/.test(href) || href.startsWith("/_astro/"))) return true;
  if (tag === "style" && /\.comic-langs\s*\{/.test(textContent(element))) return true;
  if (tag === "meta" && / - Shoa Lin visual comic article$/.test(getAttr(element, "content") ?? "")) return true;
  // The old site appended exactly this link to <body> to satisfy a test.
  const parentTag = isElement(parent) ? parent.tagName : "";
  return tag === "a" && parentTag === "body" && href === LEGACY_CONTACT
    && getAttr(element, "aria-label") === "Email" && textContent(element).trim() === "Contact";
}

/** HTML elements the wrapper renders itself from comic.json, wherever the parser put them. */
function isProvidedByWrapper(element: Element): boolean {
  const tag = element.tagName;
  if (tag === "base") return true;
  if (tag === "meta") {
    if (getAttr(element, "charset") !== undefined) return true;
    if (SHELL_HTTP_EQUIV.test(getAttr(element, "http-equiv") ?? "")) return true;
    const name = getAttr(element, "name");
    if (name && SHELL_META_NAMES.test(name)) return true;
    const property = getAttr(element, "property");
    if (property && /^og:/i.test(property)) return true;
  }
  return tag === "link" && relList(element).some((rel) => SHELL_LINK_RELS.has(rel));
}

// ---------------------------------------------------------------------------------------
// Relative references

/** Split a relative reference into its path inside the comic folder and its ?query#hash. */
function splitRelativeRef(ref: string): { path: string; suffix: string; escapes: boolean } | undefined {
  const value = ref.trim();
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?|\{\{|\$\{)/i.test(value)) return undefined;
  let url: URL;
  try {
    url = new URL(value, "https://comic.invalid/root/");
  } catch {
    return undefined;
  }
  const escapes = !url.pathname.startsWith("/root/");
  let path = url.pathname.replace(/^\/root\//, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the encoded form when it is not valid UTF-8.
  }
  return { path, suffix: `${url.search}${url.hash}`, escapes };
}

/** "./img/a.png?v=2" -> "img/a.png"; undefined for absolute URLs, data:, fragments and "../" escapes. */
export function normalizeAssetRef(ref: string): string | undefined {
  const parts = splitRelativeRef(ref);
  return parts && !parts.escapes && parts.path ? parts.path : undefined;
}

function mapAssetRef(ref: string, assets: Record<string, string> | undefined): string | undefined {
  if (!assets) return undefined;
  const parts = splitRelativeRef(ref);
  if (!parts || parts.escapes) return undefined;
  const target = assets[parts.path];
  return target ? `${target}${parts.suffix}` : undefined;
}

/** Rewrite url(...), image-set("...") and @import "..." references in CSS text. */
export function mapCssRefs(css: string, map: (ref: string) => string | undefined): string {
  let output = "";
  let cursor = 0;
  const lower = css.toLowerCase();
  for (let index = lower.indexOf("url(", cursor); index !== -1; index = lower.indexOf("url(", cursor)) {
    let start = index + 4;
    while (/\s/.test(css[start] ?? "")) start += 1;
    const quote = css[start] === "\"" || css[start] === "'" ? css[start]! : "";
    const valueStart = quote ? start + 1 : start;
    let valueEnd = quote ? css.indexOf(quote, valueStart) : css.indexOf(")", valueStart);
    if (valueEnd === -1) break;
    if (!quote) while (valueEnd > valueStart && /\s/.test(css[valueEnd - 1] ?? "")) valueEnd -= 1;
    const value = css.slice(valueStart, valueEnd);
    output += css.slice(cursor, valueStart) + (/^data:/i.test(value.trim()) ? value : map(value) ?? value);
    cursor = valueEnd;
  }
  output += css.slice(cursor);
  const mapStrings = (text: string) => text.replace(/(["'])([^"']+)\1/g, (match, quote: string, value: string) => {
    const mapped = map(value);
    return mapped ? `${quote}${mapped}${quote}` : match;
  });
  return output
    .replace(/((?:-webkit-)?image-set\()([^()]*(?:\([^()]*\)[^()]*)*)\)/gi, (_match, open: string, inner: string) => `${open}${mapStrings(inner)})`)
    .replace(/(@import\s+)(["'][^"']+["'])/gi, (_match, keyword: string, target: string) => `${keyword}${mapStrings(target)}`);
}

function collectCssRefs(css: string): string[] {
  const refs: string[] = [];
  mapCssRefs(css, (ref) => {
    refs.push(ref);
    return undefined;
  });
  return refs;
}

/** Rewrite a srcset; URLs may contain commas (data: URIs), so split on whitespace first. */
export function mapSrcset(srcset: string, map: (ref: string) => string | undefined): string {
  const candidates: string[] = [];
  let index = 0;
  while (index < srcset.length) {
    while (index < srcset.length && /[\s,]/.test(srcset[index] ?? "")) index += 1;
    if (index >= srcset.length) break;
    const start = index;
    while (index < srcset.length && !/\s/.test(srcset[index] ?? "")) index += 1;
    let url = srcset.slice(start, index);
    let descriptor = "";
    if (/,$/.test(url)) url = url.replace(/,+$/, "");
    else {
      const descriptorStart = index;
      while (index < srcset.length && srcset[index] !== ",") index += 1;
      descriptor = srcset.slice(descriptorStart, index).trim();
    }
    candidates.push([/^data:/i.test(url) ? url : map(url) ?? url, descriptor].filter(Boolean).join(" "));
  }
  return candidates.join(", ");
}

function forEachElementRef(element: Element, visit: (ref: string, kind: "url" | "srcset" | "css") => string | undefined): void {
  for (const attribute of element.attrs) {
    if (URL_ATTRIBUTES.has(attribute.name)) {
      // Links to other pages are not assets; only file downloads (a.pdf, a.png) are.
      if (element.tagName === "a" && (!/\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(attribute.value) || /\.html?(?:[?#]|$)/i.test(attribute.value))) continue;
      const mapped = visit(attribute.value, "url");
      if (mapped) attribute.value = mapped;
    } else if (attribute.name === "srcset" || attribute.name === "imagesrcset") {
      attribute.value = mapSrcset(attribute.value, (ref) => visit(ref, "srcset"));
    } else if (attribute.name === "style" && /url\(|image-set/i.test(attribute.value)) {
      attribute.value = mapCssRefs(attribute.value, (ref) => visit(ref, "css"));
    }
  }
}

export interface ComicReferences {
  /** Relative files the comic uses, as paths inside its folder ("img/a.png"). */
  assets: string[];
  /** Quoted relative file paths found in inline scripts ("panels/1.png"); copied when the file exists. */
  scriptAssets: string[];
  /** Relative references that climb out of the comic folder ("../shared/a.png"). */
  escaping: string[];
  /** Classic external scripts and non-Google external stylesheets, which `add` downloads. */
  externalScripts: string[];
  externalStyles: string[];
  googleFontUrls: string[];
}

function isExternal(url: string): boolean {
  return /^(?:https?:)?\/\//i.test(url.trim());
}

function absoluteUrl(url: string): string {
  return url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim();
}

/** Every file and external resource a comic document refers to. */
export function collectComicReferences(input: string): ComicReferences {
  const document = parse(stripBom(input));
  const assets = new Set<string>();
  const escaping = new Set<string>();
  const externalScripts = new Set<string>();
  const externalStyles = new Set<string>();
  const googleFontUrls = new Set<string>();
  const scriptAssets = new Set<string>();
  const note = (ref: string) => {
    const parts = splitRelativeRef(ref);
    if (!parts || !parts.path) return undefined;
    (parts.escapes ? escaping : assets).add(parts.escapes ? ref.trim() : parts.path);
    return undefined;
  };
  walk(document, (element, parent) => {
    // Skip exactly what the page drops: site-shell leftovers and tags the wrapper provides.
    if (isShellArtifact(element, parent) || (isHtml(element) && isProvidedByWrapper(element))) return false;
    if (element.tagName === "style") {
      const css = textContent(element);
      for (const match of css.matchAll(GOOGLE_IMPORT)) googleFontUrls.add(absoluteUrl(match[2] ?? match[4] ?? ""));
      for (const ref of collectCssRefs(css.replace(GOOGLE_IMPORT, ""))) note(ref);
    }
    const src = getAttr(element, "src") ?? "";
    const href = getAttr(element, "href") ?? "";
    if (element.tagName === "script" && !src) {
      for (const match of textContent(element).matchAll(SCRIPT_ASSET)) {
        const path = normalizeAssetRef(match[2] ?? "");
        if (path) scriptAssets.add(path);
      }
    }
    if (element.tagName === "script" && isExternal(src)) {
      if (!/^module$/i.test(getAttr(element, "type") ?? "")) externalScripts.add(absoluteUrl(src));
    }
    if (element.tagName === "link" && isExternal(href)) {
      const rels = relList(element);
      const isStyle = rels.includes("stylesheet") || (rels.includes("preload") && getAttr(element, "as") === "style");
      if (GOOGLE_CSS.test(href) && isStyle) googleFontUrls.add(absoluteUrl(href));
      else if (rels.includes("stylesheet") && !GOOGLE_HOST.test(href)) externalStyles.add(absoluteUrl(href));
    }
    forEachElementRef(element, (ref) => note(ref));
    return true;
  });
  return {
    assets: [...assets].sort(),
    scriptAssets: [...scriptAssets].filter((path) => !assets.has(path)).sort(),
    escaping: [...escaping].sort(),
    externalScripts: [...externalScripts],
    externalStyles: [...externalStyles],
    googleFontUrls: [...googleFontUrls],
  };
}

// ---------------------------------------------------------------------------------------
// Google Fonts

export interface GoogleFontRequest {
  family: string;
  /** css2 axis spec, for example "wght@400;700" or "ital,wght@0,400;1,700"; "" means regular. */
  axes: string;
}

type FontTuple = { italic: boolean; weight: string };

function tuplesFromAxes(axes: string): FontTuple[] {
  const [names = "", values = ""] = axes.split("@");
  if (!axes) return [{ italic: false, weight: "400" }];
  const axisNames = names.split(",").map((name) => name.trim().toLowerCase());
  const tuples: FontTuple[] = [];
  for (const entry of values.split(";").filter(Boolean)) {
    const parts = entry.split(",");
    const italic = axisNames.includes("ital") ? parts[axisNames.indexOf("ital")] === "1" : false;
    const weight = axisNames.includes("wght") ? parts[axisNames.indexOf("wght")] ?? "400" : "400";
    tuples.push({ italic, weight });
  }
  return tuples.length ? tuples : [{ italic: false, weight: "400" }];
}

function axesFromTuples(tuples: FontTuple[]): string {
  if (!tuples.length) return "";
  const unique = [...new Map(tuples.map((tuple) => [`${tuple.italic ? 1 : 0},${tuple.weight}`, tuple])).values()]
    .sort((left, right) => Number(left.italic) - Number(right.italic) || Number.parseFloat(left.weight) - Number.parseFloat(right.weight));
  if (unique.length === 1 && !unique[0]!.italic && unique[0]!.weight === "400") return "";
  if (unique.some((tuple) => tuple.italic)) return `ital,wght@${unique.map((tuple) => `${tuple.italic ? 1 : 0},${tuple.weight}`).join(";")}`;
  return `wght@${unique.map((tuple) => tuple.weight).join(";")}`;
}

const NAMED_WEIGHTS: Record<string, string> = { thin: "100", extralight: "200", light: "300", regular: "400", normal: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800", black: "900" };

/** Families and axes requested by a Google Fonts css, css2 or icon URL. */
export function googleFontRequests(url: string): GoogleFontRequest[] {
  let parsed: URL;
  try {
    parsed = new URL(absoluteUrl(url));
  } catch {
    return [];
  }
  if (/\/css2$/.test(parsed.pathname)) {
    return parsed.searchParams.getAll("family").flatMap((value) => {
      const [family, axes = ""] = value.split(":");
      return family?.trim() ? [{ family: family.trim(), axes: axes.trim() }] : [];
    });
  }
  return (parsed.searchParams.get("family") ?? "").split("|").flatMap((value) => {
    const [family, variants = ""] = value.split(":");
    if (!family?.trim()) return [];
    const tuples = variants.split(",").map((variant) => variant.trim().toLowerCase()).filter(Boolean).map((variant): FontTuple => {
      const italic = /i(?:talic)?$/.test(variant) && variant !== "i";
      const base = variant.replace(/italic$|i$/, "") || "400";
      return { italic: italic || variant === "italic", weight: NAMED_WEIGHTS[base] ?? (/^\d{3}$/.test(base) ? base : "400") };
    });
    return [{ family: family.trim(), axes: tuples.length ? axesFromTuples(tuples) : "" }];
  });
}

/** Merge requests for the same family (several links, or a link plus an @import). */
export function mergeFontRequests(requests: GoogleFontRequest[]): GoogleFontRequest[] {
  const byFamily = new Map<string, FontTuple[]>();
  const verbatim = new Map<string, string>();
  for (const request of requests) {
    const names = (request.axes.split("@")[0] ?? "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
    // Variable-font axes such as wdth, opsz or GRAD cannot be merged as weights; keep the first spec as written.
    if (names.some((name) => name !== "ital" && name !== "wght")) {
      if (!verbatim.has(request.family)) verbatim.set(request.family, request.axes);
      continue;
    }
    byFamily.set(request.family, [...(byFamily.get(request.family) ?? []), ...tuplesFromAxes(request.axes)]);
  }
  const families = [...new Set([...requests.map((request) => request.family)])];
  return families.map((family) => ({ family, axes: verbatim.get(family) ?? axesFromTuples(byFamily.get(family) ?? []) }));
}

/**
 * The part of a Google Fonts URL that still has to load from Google: undefined when every family
 * is self-hosted or left to system fonts, the URL itself when nothing is, otherwise a css2 URL for
 * the remaining families (icon fonts, downloads that failed).
 */
function remainingFontUrl(url: string, handled: ReadonlySet<string>): string | undefined {
  if (/\/icon(?:[?#]|$)/.test(url)) return url;
  const requests = googleFontRequests(url);
  const remaining = requests.filter(({ family }) => ICON_FAMILIES.test(family) || (!SYSTEM_TEXT_FAMILIES.test(family) && !handled.has(family.toLowerCase())));
  if (!remaining.length) return undefined;
  if (remaining.length === requests.length) return url;
  const parsed = new URL(absoluteUrl(url));
  const query = remaining.map(({ family, axes }) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}${axes ? `:${axes}` : ""}`);
  for (const name of ["display", "text"]) {
    const value = parsed.searchParams.get(name);
    if (value) query.push(`${name}=${encodeURIComponent(value)}`);
  }
  return `https://fonts.googleapis.com/css2?${query.join("&")}`;
}

function nonBlockingStylesheet(element: Element): void {
  setAttr(element, "media", "print");
  setAttr(element, "onload", "this.media='all'");
}

/** A Google Fonts css2 URL equivalent to a block of @font-face rules (to undo self-hosting). */
export function googleUrlFromFontFaces(css: string): string | undefined {
  const families = new Map<string, FontTuple[]>();
  for (const [, block = ""] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const family = /font-family:\s*["']?([^;"']+)["']?/.exec(block)?.[1]?.trim();
    if (!family) continue;
    const italic = /font-style:\s*italic/.test(block);
    const weight = /font-weight:\s*([^;]+)/.exec(block)?.[1]?.trim().replace(/\s+/g, "..") ?? "400";
    families.set(family, [...(families.get(family) ?? []), { italic, weight }]);
  }
  if (!families.size) return undefined;
  const query = [...families].map(([family, tuples]) => {
    const axes = axesFromTuples(tuples);
    return `family=${encodeURIComponent(family).replace(/%20/g, "+")}${axes ? `:${axes}` : ""}`;
  }).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

// ---------------------------------------------------------------------------------------
// Parsing for the page

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
export function parseComicHtml(input: string, options: ComicTransformOptions = {}): ComicDocument {
  const document = parse(stripBom(input));
  const { html: root, head, body } = documentParts(document);
  const handled = options.handledFamilies ?? new Set<string>();
  const vendored = options.vendored ?? {};
  const mapRef = (ref: string) => mapAssetRef(ref, options.assets);
  const googleFontUrls: string[] = [];
  let title = "";
  let description = "";

  dropComments(document);
  walk(document, (element, parent) => {
    if (isShellArtifact(element, parent)) return false;
    if (isHtml(element)) {
      const tag = element.tagName;
      if (tag === "title") {
        title ||= textContent(element).replace(/\s+/g, " ").trim();
        return false;
      }
      if (tag === "meta" && getAttr(element, "name")?.toLowerCase() === "description") {
        description ||= (getAttr(element, "content") ?? "").trim();
        return false;
      }
      if (isProvidedByWrapper(element)) return false;
      if (tag === "link") {
        const href = getAttr(element, "href") ?? "";
        const rels = relList(element);
        if (GOOGLE_HOST.test(href)) {
          const isStyle = rels.includes("stylesheet") || (rels.includes("preload") && getAttr(element, "as") === "style");
          if (!GOOGLE_CSS.test(href) || !isStyle) return false;
          googleFontUrls.push(absoluteUrl(href));
          const remaining = remainingFontUrl(href, handled);
          if (!remaining) return false;
          if (remaining !== href) setAttr(element, "href", remaining);
          if (rels.includes("stylesheet") && getAttr(element, "media") !== "print") nonBlockingStylesheet(element);
          return true;
        }
        const local = rels.includes("stylesheet") ? vendored[absoluteUrl(href)] : undefined;
        if (local) {
          setAttr(element, "href", local);
          // The local copy is served from this site and may have been adjusted, so SRI no longer applies.
          element.attrs = element.attrs.filter((attribute) => attribute.name !== "integrity");
        }
      }
      if (tag === "script") {
        const src = getAttr(element, "src");
        const local = src ? vendored[absoluteUrl(src)] : undefined;
        if (local) {
          setAttr(element, "src", local);
          element.attrs = element.attrs.filter((attribute) => attribute.name !== "integrity");
        }
        if (!src && options.assets) {
          const mapped = textContent(element).replace(SCRIPT_ASSET, (match, quote: string, ref: string) => {
            const target = mapAssetRef(ref, options.assets);
            return target ? `${quote}${target}${quote}` : match;
          });
          setTextContent(element, mapped);
        }
      }
      if (tag === "noscript") {
        // A <noscript> fallback that only loads Google Fonts goes away once those fonts are self-hosted.
        const fallback = textContent(element);
        const links = [...fallback.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1] ?? "");
        if (links.length && links.every((url) => GOOGLE_CSS.test(url) && !remainingFontUrl(url, handled)) && !fallback.replace(/<link\b[^>]*>/gi, "").trim()) return false;
      }
    }
    if (element.tagName === "style") {
      let css = textContent(element);
      css = css.replace(GOOGLE_IMPORT, (match, _quote: string, urlInFunction?: string, _stringQuote?: string, urlInString?: string) => {
        const url = absoluteUrl(urlInFunction ?? urlInString ?? "");
        googleFontUrls.push(url);
        const remaining = remainingFontUrl(url, handled);
        if (!remaining) return "";
        if (!isHtml(element) || !isElement(parent)) return remaining === url ? match : `@import url("${remaining}");`;
        const link = tree.createElement("link", HTML_NS, [{ name: "rel", value: "stylesheet" }, { name: "href", value: remaining }]);
        nonBlockingStylesheet(link);
        tree.insertBefore(parent, link, element);
        return "";
      });
      setTextContent(element, mapCssRefs(css, mapRef));
    }
    forEachElementRef(element, mapRef);
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
 * Remove what a site shell added (shell elements, anything marked data-shoa-shell, the old
 * site's injected bar and links) from a complete comic document, for example a page saved
 * from the live site; self-hosted fonts are turned back into a Google Fonts link. Returns the
 * input unchanged (minus a byte-order mark) when there is nothing to remove, so a comic
 * received from its author is stored byte for byte.
 */
export function cleanComicSource(input: string): { html: string; removed: number } {
  const html = stripBom(input);
  const document = parse(html);
  let removed = 0;
  walk(document, (element, parent) => {
    if (element.tagName === "style" && getAttr(element, "data-comic-fonts") !== undefined) {
      const url = googleUrlFromFontFaces(textContent(element));
      if (url) tree.insertBefore(parent, tree.createElement("link", HTML_NS, [{ name: "href", value: url }, { name: "rel", value: "stylesheet" }]), element);
      removed += 1;
      return false;
    }
    if (!isShellArtifact(element, parent)) return true;
    removed += 1;
    return false;
  });
  return removed ? { html: `${serialize(document).trim()}\n`, removed } : { html, removed };
}

// ---------------------------------------------------------------------------------------
// Checks

function cssWithoutComments(html: string): string {
  const css: string[] = [];
  walk(parse(stripBom(html)), (element) => {
    if (element.tagName === "style") css.push(textContent(element));
    const style = getAttr(element, "style");
    // Inline styles on <html> and <body> act like page-level rules.
    if (style) css.push(`${element.tagName === "html" || element.tagName === "body" ? element.tagName : "[style]"}{${style}}`);
    return true;
  });
  return css.join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
}

function rules(css: string): Array<{ selectors: string[]; declarations: string[] }> {
  // Statement at-rules (@import url(...); @charset "..."; @layer a, b;) would otherwise glue onto the next selector.
  const statements = css.replace(/@(?:import|charset|namespace|layer)\b[^;{}]*;/gi, "");
  return [...statements.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = "", body = ""]) => ({
    selectors: selector.split(",").map((item) => item.trim()).filter(Boolean),
    declarations: body.split(";").map((item) => item.trim()).filter(Boolean),
  }));
}

function hostOf(url: string): string {
  try {
    return new URL(absoluteUrl(url)).host;
  } catch {
    return url.slice(0, 60);
  }
}

/** Warnings about patterns that clash with the site wrapper or load poorly in mainland China. */
export function lintComicHtml(input: string): string[] {
  const html = stripBom(input);
  const warnings: string[] = [];
  const css = cssWithoutComments(html);
  const pageRules = rules(css);
  const document = parse(html);
  const references = collectComicReferences(html);

  for (const rule of pageRules) {
    const root = rule.selectors.find((selector) => /^(?:html|:root)(?:[.#[:][^\s>+~]*)?$/i.test(selector));
    if (!root) continue;
    const layout = rule.declarations.filter((declaration) => {
      const spacing = /^(?:padding|margin)(?:-[a-z-]+)?\s*:\s*(.+)$/i.exec(declaration)?.[1];
      if (spacing !== undefined) return !/^(?:(?:0(?:\.0+)?[a-z%]*|auto)\s*)+(?:!important)?$/i.test(spacing.trim());
      return /^(?:display\s*:\s*(?:inline-)?(?:flex|grid)|transform\s*:|zoom\s*:)/i.test(declaration)
        || /^(?:min-|max-)?width\s*:/i.test(declaration);
    });
    if (layout.length) warnings.push(`"${root} { ${layout.join("; ")} }" also lays out the site header and footer; put it on body or a content wrapper instead.`);
  }

  const fixedHeight = pageRules.filter((rule) => rule.selectors.some((selector) => /^(?:html|body)$/i.test(selector))
    && rule.declarations.some((declaration) => /^height\s*:\s*100(?:%|vh|dvh|svh|lvh)/i.test(declaration)));
  if (fixedHeight.some((rule) => rule.selectors.some((selector) => /^body$/i.test(selector)))) {
    warnings.push("body has height: 100% or 100vh; use min-height instead so the page grows with the comic (the site footer is placed after the content either way).");
  }
  const scrollLock = pageRules.filter((rule) => rule.selectors.some((selector) => /^(?:html|body|:root)$/i.test(selector))
    && rule.declarations.some((declaration) => /^overflow(?:-y)?\s*:\s*(?:hidden|clip)/i.test(declaration)));
  if (scrollLock.length) warnings.push("The page itself does not scroll (overflow: hidden on html/body), so readers cannot reach the site footer; let the page scroll or check that it fits one screen.");
  if (pageRules.some((rule) => rule.selectors.some((selector) => /^(?:html|body|:root)$/i.test(selector)) && rule.declarations.some((declaration) => /^scroll-snap-type\s*:[^;]*mandatory/i.test(declaration)))) {
    warnings.push("Mandatory scroll snapping on the page can stop readers from reaching the site footer; use proximity or snap inside a container.");
  }

  const fixedTopBars = pageRules
    .filter((rule) => rule.declarations.some((declaration) => /^position\s*:\s*fixed/i.test(declaration))
      && rule.declarations.some((declaration) => /^top\s*:\s*0(?:px)?\s*(?:!important)?$/i.test(declaration))
      // Thin progress bars and full-height layers (overlays, side panels) are not top bars.
      && !rule.declarations.some((declaration) => /^height\s*:\s*(?:(?:\d|1[0-2])(?:\.\d+)?px|100(?:%|vh|dvh|svh|lvh))|^bottom\s*:\s*0(?:px)?\s*(?:!important)?$/i.test(declaration)))
    .flatMap((rule) => rule.selectors);
  if (fixedTopBars.length) {
    warnings.push(`"${fixedTopBars.slice(0, 3).join('", "')}" is fixed at top: 0, so the 68px site header hides its top until the reader scrolls; position: sticky starts below the header instead.`);
  }
  const unlayeredOverlays = pageRules
    .filter((rule) => rule.declarations.some((declaration) => /^position\s*:\s*fixed/i.test(declaration))
      && !rule.declarations.some((declaration) => /^z-index\s*:/i.test(declaration))
      && (rule.declarations.some((declaration) => /^inset\s*:\s*0(?:px)?\s*(?:!important)?$/i.test(declaration))
        || (rule.declarations.some((declaration) => /^width\s*:\s*100(?:%|vw|dvw)/i.test(declaration))
          && rule.declarations.some((declaration) => /^height\s*:\s*100(?:%|vh|dvh|svh|lvh)/i.test(declaration)))))
    .flatMap((rule) => rule.selectors);
  if (unlayeredOverlays.length) {
    warnings.push(`"${unlayeredOverlays.slice(0, 3).join('", "')}" is a full-screen fixed layer without z-index; if it is an overlay (lightbox, dialog, splash), give it z-index: 2 or more so it covers the site header and footer.`);
  }
  if (/@font-face[^}]*url\(\s*["']?(?:https?:)?\/\/fonts\.gstatic\.com/i.test(css)) {
    warnings.push("@font-face points straight at fonts.gstatic.com, which mainland China blocks; load the font through a Google Fonts CSS link so `npm run comic` can self-host it.");
  } else if (/@font-face[^}]*url\(\s*["']?(?:https?:)?\/\//i.test(css)) {
    warnings.push("@font-face loads a font from another host, which may fail in mainland China; put the file next to the HTML and use a relative path.");
  }
  const externalImports = [...css.matchAll(/@import\s+(?:url\(\s*)?["']?((?:https?:)?\/\/[^"')\s;]+)/gi)].map((match) => match[1] ?? "").filter((url) => !GOOGLE_HOST.test(url));
  for (const url of externalImports) warnings.push(`CSS @import from ${hostOf(url)} blocks rendering and may fail in mainland China.`);

  const moduleImports = new Set<string>();
  const embeds = new Set<string>();
  const externalImages = new Set<string>();
  let localFiles = false;
  walk(document, (element) => {
    if (element.tagName === "script" && /^module$/i.test(getAttr(element, "type") ?? "")) {
      for (const match of textContent(element).matchAll(/\bfrom\s+["']((?:https?:)?\/\/[^"']+)["']|\bimport\s*\(\s*["']((?:https?:)?\/\/[^"']+)["']/g)) moduleImports.add(hostOf(match[1] ?? match[2] ?? ""));
      const src = getAttr(element, "src") ?? "";
      if (isExternal(src)) moduleImports.add(hostOf(src));
    }
    if (["iframe", "embed", "object"].includes(element.tagName)) {
      const url = getAttr(element, "src") ?? getAttr(element, "data") ?? "";
      if (isExternal(url)) embeds.add(hostOf(url));
    }
    if (["img", "source", "video", "audio"].includes(element.tagName)) {
      const url = getAttr(element, "src") ?? "";
      if (isExternal(url)) externalImages.add(hostOf(url));
    }
    for (const attribute of element.attrs) if (/^file:/i.test(attribute.value.trim())) localFiles = true;
    return true;
  });
  if (/url\(\s*["']?file:/i.test(css)) localFiles = true;
  for (const host of moduleImports) warnings.push(`A module script imports from ${host}; it is not downloaded into the site and may fail in mainland China.`);
  for (const host of embeds) warnings.push(`Embedded content from ${host} may not load in mainland China.`);
  if (externalImages.size) warnings.push(`Images load from other sites (${[...externalImages].slice(0, 4).join(", ")}); copy them next to the HTML if they matter.`);
  if (localFiles) warnings.push("Some paths point at files on the author's computer (file:///); replace them with relative paths.");
  for (const ref of references.escaping) warnings.push(`"${ref}" points outside the comic folder; keep assets beside the HTML.`);
  const dataUris = html.match(/data:[^"')\s]{300000,}/g);
  if (dataUris) warnings.push(`${dataUris.length} inline data: URI(s) over 300 KB; consider moving them into asset files.`);
  return warnings;
}

// ---------------------------------------------------------------------------------------
// Page tone

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], navy: [0, 0, 128], maroon: [128, 0, 0], purple: [128, 0, 128], gray: [128, 128, 128], grey: [128, 128, 128],
};

function parseColor(value: string): { rgb: [number, number, number]; alpha: number } | undefined {
  if (/\btransparent\b/i.test(value) && !/#|rgb|hsl/i.test(value)) return { rgb: [255, 255, 255], alpha: 0 };
  const hex = /#([0-9a-f]{3,8})\b/i.exec(value)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    const rgb = [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16)) as [number, number, number];
    return { rgb, alpha: full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1 };
  }
  const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/i.exec(value);
  if (rgb) {
    const alpha = rgb[4] ? (rgb[4].endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4])) : 1;
    return { rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])], alpha };
  }
  const hsl = /hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?/i.exec(value);
  if (hsl) {
    const [h, s, l] = [Number(hsl[1]) / 360, Number(hsl[2]) / 100, Number(hsl[3]) / 100];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (t: number) => {
      const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
      const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
      return Math.round(v * 255);
    };
    const alpha = hsl[4] ? (hsl[4].endsWith("%") ? Number.parseFloat(hsl[4]) / 100 : Number(hsl[4])) : 1;
    return { rgb: [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)], alpha };
  }
  const named = /\b([a-z]+)\b/i.exec(value)?.[1]?.toLowerCase();
  return named && NAMED_COLORS[named] ? { rgb: NAMED_COLORS[named]!, alpha: 1 } : undefined;
}

function luminance([r, g, b]: [number, number, number]): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function withoutMediaBlocks(css: string): string {
  let output = "";
  let cursor = 0;
  for (let index = css.indexOf("@media", cursor); index !== -1; index = css.indexOf("@media", cursor)) {
    const open = css.indexOf("{", index);
    if (open === -1) break;
    let depth = 1;
    let end = open + 1;
    for (; end < css.length && depth > 0; end += 1) {
      if (css[end] === "{") depth += 1;
      else if (css[end] === "}") depth -= 1;
    }
    output += css.slice(cursor, index);
    cursor = end;
  }
  return output + css.slice(cursor);
}

/**
 * Whether the comic paints a dark page, so the site header and footer use the dark palette.
 * Reads the html/body background outside @media blocks (the canvas uses html's background when
 * it has one, body's otherwise) and resolves simple var(--x) references from :root.
 */
export function comicPageTone(input: string): "light" | "dark" | "auto" {
  const allCss = cssWithoutComments(input);
  const base = toneOf(withoutMediaBlocks(allCss));
  if (base === "dark") return "dark";
  // A light comic that turns dark for readers who prefer dark mode gets a header that follows them.
  const darkBlocks = [...allCss.matchAll(/@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/gi)].map((match) => {
    let depth = 1;
    let end = (match.index ?? 0) + match[0].length;
    const start = end;
    for (; end < allCss.length && depth > 0; end += 1) {
      if (allCss[end] === "{") depth += 1;
      else if (allCss[end] === "}") depth -= 1;
    }
    return allCss.slice(start, end - 1);
  });
  return darkBlocks.some((block) => toneOf(`${withoutMediaBlocks(allCss)}\n${block}`) === "dark") ? "auto" : "light";
}

function toneOf(css: string): "light" | "dark" {
  const variables = new Map<string, string>();
  const backgrounds: Record<"html" | "body", string | undefined> = { html: undefined, body: undefined };
  for (const rule of rules(css)) {
    if (rule.selectors.some((selector) => /^(?::root|html)$/i.test(selector))) {
      for (const declaration of rule.declarations) {
        const variable = /^(--[\w-]+)\s*:\s*(.+)$/.exec(declaration);
        if (variable) variables.set(variable[1]!, variable[2]!.trim());
      }
    }
    const background = rule.declarations.map((declaration) => /^background(?:-color)?\s*:\s*(.+)$/i.exec(declaration)?.[1]).filter(Boolean).at(-1);
    if (!background) continue;
    for (const selector of rule.selectors) {
      if (/^(?:html|:root)$/i.test(selector)) backgrounds.html = background;
      if (/^body$/i.test(selector)) backgrounds.body = background;
    }
  }
  const resolve = (value: string | undefined) => value?.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_match, name: string, fallback?: string) => variables.get(name) ?? fallback ?? "");
  const html = parseColor(resolve(backgrounds.html) ?? "");
  const body = parseColor(resolve(backgrounds.body) ?? "");
  const canvas = html && html.alpha >= 0.5 ? html : body && body.alpha >= 0.5 ? body : undefined;
  return canvas && luminance(canvas.rgb) < 0.25 ? "dark" : "light";
}

// ---------------------------------------------------------------------------------------
// Metadata defaults used by `npm run comic -- add`

const COMIC_WORDS = /(?:漫画|漫畫|マンガ|만화|comic|bande dessinée|\bBD\b|truyện tranh|การ์ตูน)/i;

/**
 * Title for the comics list: the HTML title without "| Shoa Lin" or a "· comic edition" tail.
 * Hyphens only separate when they have spaces around them, so "GPT-6 漫画指南" stays whole.
 */
export function listTitle(title: string): string {
  const withoutSite = title.replace(/\s*[|·｜]\s*Shoa Lin\s*$/i, "").trim();
  const parts = withoutSite.split(/\s*[·|｜]\s*|\s+[-–—]\s+/);
  if (parts.length > 1 && COMIC_WORDS.test(parts.at(-1) ?? "")) {
    const kept = withoutSite.slice(0, withoutSite.lastIndexOf(parts.at(-1)!)).replace(/(?:\s*[·|｜]\s*|\s+[-–—]\s+)$/, "").trim();
    if (kept) return kept;
  }
  return withoutSite;
}

function plainText(html: string): string {
  return html
    .replace(/<(script|style|template|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** A one- or two-sentence summary from the first real paragraph, for comics without a meta description. */
export function derivedDescription(body: string, limit = 120): string {
  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => plainText(match[1] ?? "")).filter((text) => text.length >= 20);
  const text = paragraphs[0] ?? "";
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(". "), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return end > limit * 0.5 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}
