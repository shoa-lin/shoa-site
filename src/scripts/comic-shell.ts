// Behaviour for the comic page header and footer (src/components/comics/). Both live in open
// shadow roots on elements that sit beside <body>, so events from inside them reach document
// listeners retargeted to the host element.
import { isPreferredLocale, localePreferenceKey } from "../lib/locale-preference";
import { initVisitCounter } from "./visit-counter";

// Browsers older than declarative shadow DOM (2023-24) attach the roots here instead.
for (const template of document.querySelectorAll<HTMLTemplateElement>("template[shadowrootmode]")) {
  const host = template.parentElement;
  if (!host || host.shadowRoot) continue;
  host.attachShadow({ mode: "open" }).appendChild(template.content);
  template.remove();
}

const root = document.documentElement;
const headerHost = document.querySelector<HTMLElement>("shoa-comic-header");
const footerHost = document.querySelector<HTMLElement>("shoa-comic-footer");
const header = headerHost?.shadowRoot;
const toggle = header?.querySelector<HTMLButtonElement>("[data-toggle]");
const menu = header?.querySelector<HTMLElement>("[data-menu]");
const languages = header?.querySelector<HTMLDetailsElement>("[data-lang-menu]");

// Stacking. The header and footer rest at z-index 1, below the comic's own overlays (lightboxes,
// splash screens) that have a higher z-index. They rise to the top while a site menu is open, while
// focus is in the header (the skip link), or while a small floating element of the comic, such as a
// back-to-top button or a toolbar, sits on one of their links. Large clickable layers count as
// overlays and stay on top. Only elements that would paint above the resting header or footer count.
type Cover = "none" | "small" | "large";
const levels = new Map<Element, number>();

function setLayer(host: HTMLElement, raised: boolean): void {
  const value = raised ? "2147483000" : "1";
  if (host.style.getPropertyValue("z-index") !== value) host.style.setProperty("z-index", value);
}

// The z-index an element paints at among the page's top-level layers (the header and footer are two
// of them): that of its outermost z-indexed ancestor, or 0.
function levelOf(element: Element): number {
  const known = levels.get(element);
  if (known !== undefined) return known;
  let level = 0;
  for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.zIndex === "auto") continue;
    const parent = node.parentElement;
    if (style.position !== "static" || (parent && /flex|grid/.test(getComputedStyle(parent).display))) level = Number.parseInt(style.zIndex, 10) || 0;
  }
  levels.set(element, level);
  return level;
}

// `above` is the lowest level that paints over the resting host: the header comes before <body> in
// the document, so a comic layer at z-index 1 already covers it; the footer comes last.
function coverAt(x: number, y: number, above: number): Cover {
  const limit = innerWidth * innerHeight * 0.25;
  for (const element of document.elementsFromPoint(x, y)) {
    if (element === headerHost || element === footerHost || element === root || element === document.body) continue;
    if (levelOf(element) < above) continue;
    const layer: Element[] = [];
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
      layer.push(node);
      const { position } = getComputedStyle(node);
      if (position !== "fixed" && position !== "sticky") continue;
      const large = layer.some((item) => {
        if (getComputedStyle(item).pointerEvents === "none") return false;
        const rect = item.getBoundingClientRect();
        return rect.width * rect.height > limit;
      });
      return large ? "large" : "small";
    }
    // Raised page content reaching into the header or footer: the site links go above it.
    return "small";
  }
  return "none";
}

function coverOf(host: HTMLElement, controls: string, above: number): Cover {
  const box = host.getBoundingClientRect();
  if (!host.shadowRoot || box.bottom <= 0 || box.top >= innerHeight) return "none";
  let cover: Cover = "none";
  for (const control of host.shadowRoot.querySelectorAll(controls)) {
    const rect = control.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (!rect.width || !rect.height || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    const found = coverAt(x, y, above);
    if (found === "large") return "large";
    if (found === "small") cover = "small";
  }
  return cover;
}

function updateLayers(): void {
  levels.clear();
  if (headerHost) {
    const active = Boolean((menu && !menu.hidden) || languages?.open || headerHost.matches(":focus-within"));
    setLayer(headerHost, active || coverOf(headerHost, "a:not(.skip), button, summary", 1) === "small");
  }
  if (footerHost) setLayer(footerHost, coverOf(footerHost, "a", 2) === "small");
}

// A comic with html, body { height: 100% } lets its content overflow a one-screen body box, and the
// footer would sit right after that box, on top of the content. Push it below the overflow instead,
// unless the body is its own scroll container (then the page scrolls on to the footer by itself).
function placeFooter(): void {
  if (!footerHost || footerHost.parentElement !== root) return;
  const body = document.body;
  const bodyScrolls = getComputedStyle(root).overflowY !== "visible" && getComputedStyle(body).overflowY !== "visible";
  const overflow = Math.ceil(body.scrollHeight - body.clientHeight);
  const value = !bodyScrolls && overflow > 1 ? `${overflow}px` : "0px";
  if (footerHost.style.getPropertyValue("margin-top") !== value) footerHost.style.setProperty("margin-top", value, "important");
}

let frame = 0;
function refresh(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    placeFooter();
    updateLayers();
  });
}

function closeMenu(restoreFocus = false): void {
  if (!toggle || !menu || menu.hidden) return;
  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", toggle.dataset.labelOpen ?? "");
  if (restoreFocus) toggle.focus();
  refresh();
}

function closeLanguages(restoreFocus = false): void {
  if (!languages?.open) return;
  languages.open = false;
  if (restoreFocus) languages.querySelector("summary")?.focus();
  refresh();
}

if (headerHost && toggle && menu) {
  toggle.addEventListener("click", () => {
    if (!menu.hidden) return closeMenu(true);
    closeLanguages();
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", toggle.dataset.labelClose ?? "");
    refresh();
    menu.querySelector("a")?.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });
  languages?.addEventListener("toggle", () => {
    if (languages.open) closeMenu();
    refresh();
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.composedPath().includes(headerHost)) return;
    closeMenu();
    closeLanguages();
  });
  // Escape anywhere closes an open site menu; comics often listen for keys on document too.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!menu.hidden) {
      event.preventDefault();
      closeMenu(true);
    } else if (languages?.open) {
      event.preventDefault();
      closeLanguages(true);
    }
  });
  headerHost.addEventListener("focusin", refresh);
  headerHost.addEventListener("focusout", (event) => {
    const next = (event as FocusEvent).relatedTarget;
    if (!(next instanceof Node) || !headerHost.contains(next)) {
      closeMenu();
      closeLanguages();
    }
    refresh();
  });
  let width = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    closeMenu();
  });
  addEventListener("pageshow", () => {
    closeMenu();
    closeLanguages();
  });
}

// Keys pressed inside the site header or footer belong to them, not to the comic's own
// document-level shortcuts (arrow keys that flip panels, for example).
for (const host of [headerHost, footerHost]) {
  host?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (menu && !menu.hidden) {
        event.preventDefault();
        closeMenu(true);
      } else if (languages?.open) {
        event.preventDefault();
        closeLanguages(true);
      }
    }
    event.stopPropagation();
  });
  for (const type of ["keyup", "keypress"]) host?.addEventListener(type, (event) => event.stopPropagation());
}

languages?.addEventListener("click", (event) => {
  const locale = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-locale]")?.dataset.locale : undefined;
  if (!isPreferredLocale(locale)) return;
  try {
    localStorage.setItem(localePreferenceKey, locale);
  } catch {
    // Navigation still works when storage is unavailable.
  }
});

// Re-check placement and stacking whenever the comic can have moved something: scrolling, resizing,
// late fonts and images, DOM or class changes, CSS-only toggles (:target, :checked), finished transitions.
refresh();
for (const type of ["scroll", "resize", "load", "pageshow", "hashchange"]) addEventListener(type, refresh, { passive: true });
for (const type of ["change", "transitionend", "animationend"]) document.addEventListener(type, refresh, { passive: true });
void document.fonts?.ready.then(refresh);
new MutationObserver(refresh).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(refresh);
  observer.observe(document.body);
  for (const child of document.body.children) observer.observe(child);
}

if (footerHost?.shadowRoot) void initVisitCounter(footerHost.shadowRoot);
