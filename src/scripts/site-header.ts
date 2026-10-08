// Behaviour for the main site header (src/components/Header.astro): theme toggle, language menu and
// mobile navigation. The two menus are disclosures that close each other, close on Escape, on a tap
// or click outside, when focus moves elsewhere, when the layout leaves the mobile breakpoint, and
// when the page comes back from the back/forward cache. Comic pages have their own header script.
import { isPreferredLocale, localePreferenceKey } from "../lib/locale-preference";

// Theme ------------------------------------------------------------------------------------------

type Theme = "light" | "dark";
const themeKey = "shoa-theme";
// Matches --bg in tokens.css, so the mobile browser bar follows the chosen theme, not only the system.
const themeColors: Record<Theme, string> = { light: "#f7f8fa", dark: "#111317" };

function savedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(themeKey);
    return value === "light" || value === "dark" ? value : undefined;
  } catch {
    return undefined;
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = themeColors[theme];
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")) {
  button.addEventListener("click", () => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      // The theme still changes for this page when storage is unavailable.
    }
  });
}

// Until the reader picks a theme, follow the system setting, also when it changes while reading.
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (!savedTheme()) applyTheme(event.matches ? "dark" : "light");
});

// Menus ------------------------------------------------------------------------------------------

const languageMenu = document.querySelector<HTMLDetailsElement>(".language-menu");
const nav = document.querySelector<HTMLElement>("[data-mobile-nav]");
const navButton = nav?.querySelector<HTMLButtonElement>("[data-mobile-nav-open]");
const navPanel = nav?.querySelector<HTMLElement>("[data-mobile-nav-panel]");

function closeLanguages(restoreFocus = false): void {
  if (!languageMenu?.open) return;
  languageMenu.open = false;
  if (restoreFocus) languageMenu.querySelector("summary")?.focus();
}

function setNav(open: boolean, restoreFocus = false): void {
  if (!navButton || !navPanel || open === !navPanel.hidden) return;
  navPanel.hidden = !open;
  navButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("nav-open", open);
  if (open) {
    closeLanguages();
    navPanel.querySelector<HTMLElement>("button, a[href]")?.focus();
  } else if (restoreFocus) {
    navButton.focus();
  }
}

navButton?.addEventListener("click", () => setNav(Boolean(navPanel?.hidden)));
nav?.querySelector("[data-mobile-nav-close]")?.addEventListener("click", () => setNav(false, true));
navPanel?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) setNav(false);
});

languageMenu?.addEventListener("toggle", () => {
  if (languageMenu.open) setNav(false);
});
languageMenu?.addEventListener("click", (event) => {
  const locale = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-locale]")?.dataset.locale : undefined;
  if (!isPreferredLocale(locale)) return;
  try {
    localStorage.setItem(localePreferenceKey, locale);
  } catch {
    // Navigation still works when browser storage is unavailable.
  }
});

// A tap or click outside a menu closes it and still reaches what was tapped (no invisible overlay).
document.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Node ? event.target : null;
  if (languageMenu?.open && !languageMenu.contains(target)) closeLanguages();
  if (nav && navPanel && !navPanel.hidden && !nav.contains(target)) setNav(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (navPanel && !navPanel.hidden) {
    event.preventDefault();
    setNav(false, true);
  } else if (languageMenu?.open) {
    event.preventDefault();
    closeLanguages(true);
  }
});

// Moving focus to another part of the page (Tab past the last item) closes the menu it left.
function closeWhenFocusLeaves(container: HTMLElement | null | undefined, close: () => void): void {
  container?.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !container.contains(next)) close();
  });
}
closeWhenFocusLeaves(languageMenu, () => closeLanguages());
closeWhenFocusLeaves(nav, () => setNav(false));

// The mobile navigation only exists below the 860px breakpoint (components.css).
matchMedia("(max-width: 860px)").addEventListener("change", (event) => {
  if (!event.matches) setNav(false);
});

addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  setNav(false);
  closeLanguages();
});
