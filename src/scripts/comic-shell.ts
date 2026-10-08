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

const headerHost = document.querySelector<HTMLElement>("shoa-comic-header");
const footerHost = document.querySelector<HTMLElement>("shoa-comic-footer");
const header = headerHost?.shadowRoot;
const toggle = header?.querySelector<HTMLButtonElement>("[data-toggle]");
const menu = header?.querySelector<HTMLElement>("[data-menu]");
const languages = header?.querySelector<HTMLDetailsElement>("[data-lang-menu]");

function closeMenu(restoreFocus = false): void {
  if (!toggle || !menu || menu.hidden) return;
  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", toggle.dataset.labelOpen ?? "");
  if (restoreFocus) toggle.focus();
}

function closeLanguages(restoreFocus = false): void {
  if (!languages?.open) return;
  languages.open = false;
  if (restoreFocus) languages.querySelector("summary")?.focus();
}

if (headerHost && toggle && menu) {
  toggle.addEventListener("click", () => {
    if (!menu.hidden) return closeMenu(true);
    closeLanguages();
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", toggle.dataset.labelClose ?? "");
    menu.querySelector("a")?.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });
  languages?.addEventListener("toggle", () => {
    if (languages.open) closeMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.composedPath().includes(headerHost)) return;
    closeMenu();
    closeLanguages();
  });
  // Escape anywhere closes an open menu; comics often listen for keys on document too.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (menu && !menu.hidden) {
      event.preventDefault();
      closeMenu(true);
    } else if (languages?.open) {
      event.preventDefault();
      closeLanguages(true);
    }
  });
  headerHost.addEventListener("focusout", (event) => {
    const next = (event as FocusEvent).relatedTarget;
    if (next instanceof Node && !headerHost.contains(next)) {
      closeMenu();
      closeLanguages();
    }
  });
  addEventListener("resize", () => closeMenu());
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

if (footerHost?.shadowRoot) void initVisitCounter(footerHost.shadowRoot);
