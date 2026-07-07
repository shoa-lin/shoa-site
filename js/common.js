// Common JavaScript - shared across all pages

const THEME_STORAGE_KEY = 'shoa-theme';

function getStoredTheme() {
    try {
        const theme = localStorage.getItem('shoa-theme');
        return theme === 'dark' ? 'dark' : 'light';
    } catch (_error) {
        return 'light';
    }
}

function storeTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_error) {
        // Theme persistence is progressive enhancement.
    }
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}

applyTheme(getStoredTheme());

// HTML escape utility to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Page load animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

function updateThemeToggle(button, theme) {
    const isDark = theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到暗夜模式');
    button.title = isDark ? '切换到浅色模式' : '切换到暗夜模式';
    button.innerHTML = isDark
        ? '<i class="fas fa-sun" aria-hidden="true"></i>'
        : '<i class="fas fa-moon" aria-hidden="true"></i>';
}

function initThemeToggle() {
    const navContent = document.querySelector('.nav-content');
    if (!navContent || navContent.querySelector('.theme-toggle')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';

    updateThemeToggle(button, getStoredTheme());

    button.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        storeTheme(nextTheme);
        updateThemeToggle(button, nextTheme);
    });

    navContent.appendChild(button);
}

// Navbar scroll effect without per-frame scroll listeners.
function initNavbarScrollState() {
    const navbar = document.querySelector('.navbar');
    if (!navbar || !('IntersectionObserver' in window)) return;

    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '20px';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.style.pointerEvents = 'none';
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(([entry]) => {
        navbar.classList.toggle('scrolled', !entry.isIntersecting);
    });

    observer.observe(sentinel);
}

// Set active nav link based on current page
function normalizePath(path) {
    const cleanPath = path.replace(/\/$/, '') || '/';
    if (cleanPath === '/') return '/';
    return cleanPath.split('/').pop();
}

function isMatchingNavHref(href, currentPath) {
    if (!href) return false;
    if (href === '/' && currentPath === '/') return true;
    if (href !== '/' && currentPath.startsWith(href + '/')) return true;
    return normalizePath(href) === normalizePath(currentPath);
}

function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', isMatchingNavHref(href, currentPath));
    });
}

// Dynamic copyright year
function updateCopyrightYear() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initNavbarScrollState();
    setActiveNavLink();
    updateCopyrightYear();
});
