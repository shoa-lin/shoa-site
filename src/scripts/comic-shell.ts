// Behaviour for the comic page header and footer (src/components/comics/). Both live in open
// shadow roots, so events from inside them reach document listeners retargeted to the host.
import { isPreferredLocale, localePreferenceKey } from "../lib/locale-preference";
import { initVisitCounter } from "./visit-counter";

// Browsers older than declarative shadow DOM (2023-24) attach the roots here instead.
for (const template of document.querySelectorAll<HTMLTemplateElement>("template[shadowrootmode]")) {
  const host = template.parentElement;
  if (!host || host.shadowRoot) continue;
  host.attachShadow({ mode: "open" }).appendChild(template.content);
  template.remove();
}

const headerHost = document.querySelector("shoa-comic-header");
const header = headerHost?.shadowRoot;
const toggle = header?.querySelector<HTMLButtonElement>("[data-toggle]");
const menu = header?.querySelector<HTMLElement>("[data-menu]");
const languages = header?.querySelector<HTMLDetailsElement>("[data-lang-menu]");

if (headerHost && toggle && menu) {
  const fromHeader = (event: Event) => event.composedPath().includes(headerHost);
  const closeMenu = (restoreFocus = false) => {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", toggle.dataset.labelOpen ?? "");
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    if (!menu.hidden) return closeMenu(true);
    if (languages) languages.open = false;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", toggle.dataset.labelClose ?? "");
    menu.querySelector("a")?.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });
  document.addEventListener("pointerdown", (event) => {
    if (fromHeader(event)) return;
    closeMenu();
    if (languages) languages.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!menu.hidden) {
      event.preventDefault();
      closeMenu(true);
    } else if (languages?.open) {
      event.preventDefault();
      languages.open = false;
      languages.querySelector("summary")?.focus();
    }
  });
  headerHost.addEventListener("focusout", (event) => {
    const next = (event as FocusEvent).relatedTarget;
    if (next instanceof Node && !headerHost.contains(next)) closeMenu();
  });
  addEventListener("resize", () => closeMenu());
  addEventListener("pageshow", () => closeMenu());
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

const footer = document.querySelector("shoa-comic-footer")?.shadowRoot;
if (footer) void initVisitCounter(footer);
