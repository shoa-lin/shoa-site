// Home page specific JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Stat counter animation
    function animateValue(element, target, duration) {
        const increment = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target + '+';
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + '+';
            }
        }, 16);
    }

    // Trigger stat animation when in view
    const statsSection = document.querySelector('.about-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stats = entry.target.querySelectorAll('.stat h3');
                    if (stats.length >= 2) {
                        animateValue(stats[0], 5, 800);
                        animateValue(stats[1], 3, 800);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(statsSection);
    }
});
