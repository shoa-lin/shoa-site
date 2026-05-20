// Common JavaScript - shared across all pages

// HTML escape utility to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Throttled scroll handler
function onScrollThrottled(callback) {
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                callback();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// Page load animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Navbar scroll effect
onScrollThrottled(function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }
});

// Set active nav link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active');

        if (href === currentPath) {
            link.classList.add('active');
        } else if (currentPath === 'index.html' && href.startsWith('#')) {
            if (!window.location.hash || window.location.hash === '#home') {
                if (href === '#home') link.classList.add('active');
            }
        }
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
    setActiveNavLink();
    updateCopyrightYear();
});
