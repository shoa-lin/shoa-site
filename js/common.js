// Common JavaScript - shared across all pages

// Page load animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Set active nav link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Remove active class first
        link.classList.remove('active');

        // Check if this link should be active
        if (href === currentPath) {
            link.classList.add('active');
        } else if (currentPath === 'index.html' && href.startsWith('#')) {
            // On index page, no hash means home section
            if (!window.location.hash || window.location.hash === '#home') {
                if (href === '#home') link.classList.add('active');
            }
        }
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', setActiveNavLink);
