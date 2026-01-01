// Favorites page JavaScript

// Article list
let articleList = [];

// Source type mapping
const sourceTypeMap = {
    '微信公众号': 'wechat',
    '博客': 'blog',
    '论文': 'paper',
    '其他': 'other'
};

// Load article list from favorites/articles folder
async function loadArticleList() {
    try {
        const response = await fetch('favorites/articles/manifest.json');
        if (!response.ok) {
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

// Get article metadata
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

// Render article cards
function renderArticleCards(filter = 'all') {
    const grid = document.querySelector('.collection-grid');
    if (!grid) return;

    // Clear existing cards
    grid.innerHTML = '';

    // Filter articles
    const filteredArticles = filter === 'all'
        ? articleList
        : articleList.filter(a => a.sourceType === filter);

    // Render cards
    filteredArticles.forEach(article => {
        const card = createArticleCard(article);
        grid.appendChild(card);
    });

    // Attach event listeners
    attachCardEventListeners();
}

// Create an article card element
function createArticleCard(article) {
    const articleDiv = document.createElement('article');
    articleDiv.className = 'article-card';
    articleDiv.dataset.source = article.sourceType;
    articleDiv.dataset.id = article.id;

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

// Attach event listeners to article cards
function attachCardEventListeners() {
    document.querySelectorAll('.view-btn, .article-link').forEach(button => {
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
        openModal();
        return;
    }

    try {
        const response = await fetch(meta.mdFile);
        if (!response.ok) throw new Error('Failed to load article');

        const markdown = await response.text();
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
        openModal();

    } catch (error) {
        console.error('Error loading article:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--accent-orange); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">文章加载失败</p>
                <p style="color: var(--text-tertiary); font-size: 0.85rem;">${error.message}</p>
            </div>
        `;
        openModal();
    }
}

// Open modal with animation
function openModal() {
    modal.classList.add('active');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        // Small delay to allow display:block to apply before adding transform
        requestAnimationFrame(() => {
            modalContent.classList.add('active');
        });
    }
    document.body.style.overflow = 'hidden';

    // Reset fullscreen state when opening new article
    modalContent.classList.remove('fullscreen');
    updateFullscreenIcon(false);
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;

    modalContent.classList.toggle('fullscreen');
    const isFullscreen = modalContent.classList.contains('fullscreen');
    updateFullscreenIcon(isFullscreen);

    // Scroll to top when entering fullscreen
    if (isFullscreen) {
        const modalBody = document.getElementById('modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }
}

// Update fullscreen icon
function updateFullscreenIcon(isFullscreen) {
    const toggleBtn = document.getElementById('fullscreen-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    if (icon) {
        icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
    toggleBtn.title = isFullscreen ? '退出全屏' : '全屏阅读';
}

// Modal elements
const modal = document.getElementById('article-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// Close modal
function closeModal() {
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('active');
    }
    // Wait for animation to complete
    setTimeout(() => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }, 300);
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

// Fullscreen toggle button
const fullscreenToggle = document.getElementById('fullscreen-toggle');
if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', toggleFullscreen);
}

const overlay = document.querySelector('.modal-overlay');
if (overlay) {
    overlay.addEventListener('click', closeModal);
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeModal();
    }
});

// Filter buttons
const filterButtons = document.querySelectorAll('.filter-btn');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filter = button.dataset.filter;
        renderArticleCards(filter);
    });
});

// Initialize article system
async function initArticleSystem() {
    await loadArticleList();
    renderArticleCards();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initArticleSystem);
