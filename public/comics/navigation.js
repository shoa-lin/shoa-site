// Disclosure navigation: a small non-modal menu, with no backdrop or scroll lock.
const header = document.querySelector('[data-comic-header]');
if (header) {
  const toggle = header.querySelector('[data-comic-toggle]');
  const menu = header.querySelector('[data-comic-menu]');
  if (toggle instanceof HTMLButtonElement && menu instanceof HTMLElement) {
    function close(restoreFocus = false) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开导航');
      if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => {
      if (!menu.hidden) return close(true);
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '关闭导航');
      menu.querySelector('a')?.focus();
    });
    document.addEventListener('pointerdown', event => {
      if (!menu.hidden && !header.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        close(true);
      }
    });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) close();
    });
    menu.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) close();
    });
    window.addEventListener('resize', () => close());
    window.addEventListener('pageshow', () => close());
  }
}
