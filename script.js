// Notion-style interactions for Shoa Lin Portfolio

// Smooth scroll navigation
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

// Navbar scroll effect - subtle
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Page load animation - simple fade in
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Stat counter animation - simplified
function animateValue(element, target, duration) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

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

const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    observer.observe(statsSection);
}

// Form submission handling
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = '发送中...';
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.textContent = '发送成功！';
            submitBtn.style.background = 'var(--accent-green)';
            submitBtn.style.borderColor = 'var(--accent-green)';
        }, 1000);

        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            submitBtn.style.borderColor = '';
            this.reset();
        }, 3000);
    });
}

// Collection: Filter functionality
const filterButtons = document.querySelectorAll('.filter-btn');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Filter and re-render articles
        const filter = button.dataset.filter;
        renderArticleCards(filter);

        // Re-attach event listeners after rendering
        attachCardEventListeners();
    });
});

// Collection: Article modal functionality
const modal = document.getElementById('article-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// Article list (will be populated from wechat_articles folder)
let articleList = [];

// Source type mapping
const sourceTypeMap = {
    '微信公众号': 'wechat',
    '博客': 'blog',
    '论文': 'paper',
    '其他': 'other'
};

// Auto-load article list from favorites/articles folder
async function loadArticleList() {
    try {
        // Fetch the directory listing (this requires a directory index or a manifest file)
        // For static sites, we'll use a manifest approach
        const response = await fetch('favorites/articles/manifest.json');
        if (!response.ok) {
            // If no manifest, fall back to hardcoded list
            articleList = getDefaultArticleList();
            return;
        }
        articleList = await response.json();
    } catch (error) {
        console.log('Using default article list:', error);
        articleList = getDefaultArticleList();
    }
}

// Default article list (fallback)
function getDefaultArticleList() {
    return [
        {
            id: 'manus-meeting',
            title: '回看过去：Manus 立项会议纪要',
            author: '潜云思绪',
            date: '2025-12-27',
            source: '微信公众号',
            sourceType: 'wechat',
            sourceUrl: 'https://mp.weixin.qq.com/s/Ud0djNpSAqUoFUYpTzasmg',
            excerpt: '一个旨在重新定义智能体、致力于成为人类强大心智延伸的探索之旅，由此正式启航。',
            tags: ['AI Agent', '产品设计', '技术架构'],
            mdFile: 'favorites/articles/manus-meeting.md'
        }
    ];
}

// Generate article metadata from article list
function getArticleMetadata(articleId) {
    const article = articleList.find(a => a.id === articleId);
    if (!article) return null;

    return {
        title: article.title,
        author: article.author,
        date: article.date,
        source: article.source,
        sourceUrl: article.sourceUrl,
        mdFile: article.mdFile
    };
}

// Render article cards dynamically
function renderArticleCards(filter = 'all') {
    const grid = document.querySelector('.collection-grid');
    if (!grid) return;

    // Clear existing cards (except the template if any)
    const existingCards = grid.querySelectorAll('.article-card[data-dynamic]');
    existingCards.forEach(card => card.remove());

    // Filter and render articles
    const filteredArticles = filter === 'all'
        ? articleList
        : articleList.filter(a => a.sourceType === filter);

    filteredArticles.forEach(article => {
        const card = createArticleCard(article);
        grid.appendChild(card);
    });
}

// Create an article card element
function createArticleCard(article) {
    const articleDiv = document.createElement('article');
    articleDiv.className = 'article-card';
    articleDiv.dataset.source = article.sourceType;
    articleDiv.dataset.id = article.id;
    articleDiv.dataset.dynamic = 'true';

    const iconClass = {
        'wechat': 'fab fa-weixin',
        'blog': 'fas fa-blog',
        'paper': 'fas fa-file-alt',
        'other': 'fas fa-link'
    }[article.sourceType] || 'fas fa-link';

    articleDiv.innerHTML = `
        <div class="article-header">
            <span class="article-source-tag source-${article.sourceType}">
                <i class="${iconClass}"></i> ${article.source}
            </span>
            <span class="article-date">${article.date}</span>
        </div>
        <h3 class="article-title">
            <a href="#" class="article-link" data-article="${article.id}">
                ${article.title}
            </a>
        </h3>
        <p class="article-excerpt">${article.excerpt}</p>
        <div class="article-meta">
            <span class="article-author">${article.author}</span>
            <div class="article-tags">
                ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        <div class="article-actions">
            <button class="action-btn view-btn" data-article="${article.id}">
                <i class="fas fa-eye"></i> 查看
            </button>
            <a href="${article.sourceUrl}" target="_blank" class="action-btn">
                <i class="fas fa-external-link-alt"></i> 原文
            </a>
        </div>
    `;

    return articleDiv;
}

// Initialize article system
async function initArticleSystem() {
    await loadArticleList();
    renderArticleCards();

    // Re-attach event listeners for new cards
    attachCardEventListeners();
}

// Attach event listeners to article cards
function attachCardEventListeners() {
    document.querySelectorAll('.view-btn, .article-link').forEach(button => {
        button.removeEventListener('click', loadArticleHandler); // Remove existing
        button.addEventListener('click', loadArticleHandler);
    });
}

// Handler for loading article
function loadArticleHandler(e) {
    e.preventDefault();
    const articleId = e.target.closest('[data-article]')?.dataset.article;
    if (articleId) {
        loadArticle(articleId);
    }
}

// Load and render Markdown article
async function loadArticle(articleId) {
    const meta = getArticleMetadata(articleId);
    if (!meta) {
        modalBody.innerHTML = '<p style="color: var(--text-tertiary);">文章未找到</p>';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }

    try {
        const response = await fetch(meta.mdFile);
        if (!response.ok) throw new Error('Failed to load article');

        const markdown = await response.text();

        // Parse markdown to HTML using marked.js
        const htmlContent = marked.parse(markdown);

        // Add metadata header
        const headerHtml = `
            <div class="article-meta-header">
                <p style="color: var(--text-tertiary); margin-bottom: 2rem;">
                    <strong>作者:</strong> ${meta.author} | <strong>发布时间:</strong> ${meta.date}
                </p>
            </div>
        `;

        // Add source footer
        const footerHtml = `
            <div class="article-source-footer">
                <h4>文章来源</h4>
                <p><strong>来源:</strong> ${meta.source}</p>
                <p><strong>原文链接:</strong> <a href="${meta.sourceUrl}" target="_blank">${meta.sourceUrl}</a></p>
                <p class="copyright-notice"><strong>版权声明:</strong> 本文版权归原作者及原作者所有，仅供学习交流使用。</p>
            </div>
        `;

        modalBody.innerHTML = headerHtml + htmlContent + footerHtml;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('Error loading article:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--accent-orange); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">文章加载失败</p>
                <p style="color: var(--text-tertiary); font-size: 0.85rem;">${error.message}</p>
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal
modalClose.addEventListener('click', closeModal);
modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Initialize article system when DOM is ready
document.addEventListener('DOMContentLoaded', initArticleSystem);
