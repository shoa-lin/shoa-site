// 平滑滚动功能
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.padding = '0.5rem 0';
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.padding = '1rem 0';
        navbar.style.boxShadow = 'none';
    }
});

// 页面加载动画
window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// 技能标签动画
const skillTags = document.querySelectorAll('.skill-tag');
skillTags.forEach((tag, index) => {
    tag.style.opacity = '0';
    tag.style.transform = 'translateY(20px)';
    tag.style.transition = 'all 0.3s ease-in-out';

    setTimeout(() => {
        tag.style.opacity = '1';
        tag.style.transform = 'translateY(0)';
    }, 100 * index);
});

// 项目卡片悬停效果增强
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// 统计数字动画
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const timer = setInterval(function() {
        current += increment;
        element.textContent = current + (element.textContent.includes('+') ? '+' : '');
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// 当统计部分进入视野时触发动画
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const stats = entry.target.querySelectorAll('.stat h3');
            stats[0].textContent = '0+';
            stats[1].textContent = '0+';
            stats[2].textContent = '0';

            setTimeout(() => {
                animateValue(stats[0], 0, 5, 1000);
                animateValue(stats[1], 0, 3, 1000);
                stats[2].textContent = '∞';
            }, 200);

            observer.unobserve(entry.target);
        }
    });
});

const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    observer.observe(statsSection);
}

// 表单提交处理（如果使用了表单服务）
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = '发送中...';
        submitBtn.disabled = true;

        // 这里可以添加实际的表单提交逻辑
        setTimeout(() => {
            submitBtn.textContent = '发送成功！';
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                this.reset();
            }, 2000);
        }, 1000);
    });
}

// 添加打字机效果
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// 页面加载时对标题应用打字机效果
window.addEventListener('DOMContentLoaded', function() {
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 80);
        }, 500);
    }
});

// 控制台欢迎信息
console.log('%c欢迎来到 Shoa Lin 的个人主页！', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%c如果你对网站实现感兴趣，欢迎查看源代码！', 'color: #764ba2; font-size: 14px;');