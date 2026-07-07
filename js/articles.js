// Shared article system for favorites functionality
// Used by both index.html and favorites.html

let articleList = [];

// Load article list from manifest
async function loadArticleList(manifestPath) {
    try {
        const response = await fetch(manifestPath);
        if (!response.ok) {
            articleList = getDefaultArticleList();
            return;
        }
        articleList = await response.json();
    } catch (_error) {
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
        },
        {
            id: 'fix-your-life-in-one-day',
            title: '如何在一天内彻底改变你的人生',
            author: 'Dan Koe',
            date: '2025-12-23',
            source: 'X (Twitter)',
            sourceType: 'other',
            sourceUrl: 'https://x.com/thedankoe/status/2010751592346030461',
            excerpt: '你很可能会放弃你的新年决心。但这没关系。大多数人都会这样做，因为大多数人并不想在深层次、内在的层面上真正改变自己...',
            tags: ['个人成长', '自我提升', '生活哲学', '行为改变'],
            mdFile: 'favorites/articles/fix-your-life-in-one-day.md'
        }
    ];
}

// Get article metadata by ID
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

// Source icon mapping
function getSourceIcon(sourceType) {
    return {
        'wechat': 'fab fa-weixin',
        'blog': 'fas fa-blog',
        'paper': 'fas fa-file-alt',
        'other': 'fas fa-link'
    }[sourceType] || 'fas fa-link';
}

// Create an article card element (XSS-safe)
function createArticleCard(article) {
    const articleDiv = document.createElement('article');
    articleDiv.className = 'article-card';
    articleDiv.dataset.source = article.sourceType;
    articleDiv.dataset.id = article.id;
    articleDiv.dataset.dynamic = 'true';

    const iconClass = getSourceIcon(article.sourceType);

    // Build card using DOM API to prevent XSS
    const header = document.createElement('div');
    header.className = 'article-header';

    const sourceTag = document.createElement('span');
    sourceTag.className = 'article-source-tag source-' + article.sourceType;
    sourceTag.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i> ';
    sourceTag.appendChild(document.createTextNode(article.source));

    const dateSpan = document.createElement('span');
    dateSpan.className = 'article-date';
    dateSpan.textContent = article.date;

    header.appendChild(sourceTag);
    header.appendChild(dateSpan);

    const titleEl = document.createElement('h3');
    titleEl.className = 'article-title';

    const titleLink = document.createElement('button');
    titleLink.type = 'button';
    titleLink.className = 'article-link';
    titleLink.dataset.article = article.id;
    titleLink.textContent = article.title;

    titleEl.appendChild(titleLink);

    const excerpt = document.createElement('p');
    excerpt.className = 'article-excerpt';
    excerpt.textContent = article.excerpt;

    const meta = document.createElement('div');
    meta.className = 'article-meta';

    const author = document.createElement('span');
    author.className = 'article-author';
    author.textContent = article.author;

    const tags = document.createElement('div');
    tags.className = 'article-tags';
    article.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag;
        tags.appendChild(tagSpan);
    });

    meta.appendChild(author);
    meta.appendChild(tags);

    const actions = document.createElement('div');
    actions.className = 'article-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'action-btn view-btn';
    viewBtn.dataset.article = article.id;
    viewBtn.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i> ';
    viewBtn.appendChild(document.createTextNode('查看'));

    const origLink = document.createElement('a');
    origLink.href = article.sourceUrl;
    origLink.target = '_blank';
    origLink.rel = 'noopener noreferrer';
    origLink.className = 'action-btn';
    origLink.innerHTML = '<i class="fas fa-external-link-alt" aria-hidden="true"></i> ';
    origLink.appendChild(document.createTextNode('原文'));

    actions.appendChild(viewBtn);
    actions.appendChild(origLink);

    articleDiv.appendChild(header);
    articleDiv.appendChild(titleEl);
    articleDiv.appendChild(excerpt);
    articleDiv.appendChild(meta);
    articleDiv.appendChild(actions);

    return articleDiv;
}

function createCollectionEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'collection-empty';
    emptyState.dataset.dynamic = 'true';

    const icon = document.createElement('i');
    icon.className = 'fas fa-folder-open';
    icon.setAttribute('aria-hidden', 'true');

    const title = document.createElement('h3');
    title.textContent = '这里暂时没有内容';

    const description = document.createElement('p');
    description.textContent = '当前筛选下暂无符合条件的收藏，换一个来源看看。';

    emptyState.appendChild(icon);
    emptyState.appendChild(title);
    emptyState.appendChild(description);

    return emptyState;
}

// Render article cards
function renderArticleCards(filter) {
    filter = filter || 'all';
    const grid = document.querySelector('.collection-grid');
    if (!grid) return;

    const existingDynamicItems = grid.querySelectorAll('[data-dynamic="true"]');
    existingDynamicItems.forEach(item => item.remove());

    const filteredArticles = filter === 'all'
        ? articleList
        : articleList.filter(a => a.sourceType === filter);

    if (filteredArticles.length === 0) {
        grid.appendChild(createCollectionEmptyState());
        return;
    }

    filteredArticles.forEach(article => {
        grid.appendChild(createArticleCard(article));
    });

    attachCardEventListeners();
}

// Attach event listeners to article cards
function attachCardEventListeners() {
    document.querySelectorAll('.view-btn, .article-link').forEach(button => {
        button.removeEventListener('click', loadArticleHandler);
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

// Load and render Markdown article (XSS-safe meta, marked handles content sanitization)
async function loadArticle(articleId) {
    const meta = getArticleMetadata(articleId);
    const modal = document.getElementById('article-modal');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalBody) return;

    if (!meta) {
        modalBody.textContent = '文章未找到';
        modalBody.style.color = 'var(--text-tertiary)';
        openModal(modal);
        return;
    }

    try {
        const response = await fetch(meta.mdFile);
        if (!response.ok) throw new Error('Failed to load article');

        const markdown = await response.text();
        const htmlContent = marked.parse(markdown);

        // Build meta header safely
        const headerDiv = document.createElement('div');
        headerDiv.className = 'article-meta-header';

        const headerP = document.createElement('p');
        headerP.style.color = 'var(--text-tertiary)';
        headerP.style.marginBottom = '2rem';

        const strong1 = document.createElement('strong');
        strong1.textContent = '作者:';
        headerP.appendChild(strong1);
        headerP.appendChild(document.createTextNode(' ' + meta.author + ' | '));

        const strong2 = document.createElement('strong');
        strong2.textContent = '发布时间:';
        headerP.appendChild(strong2);
        headerP.appendChild(document.createTextNode(' ' + meta.date));

        headerDiv.appendChild(headerP);

        // Build source footer safely
        const footerDiv = document.createElement('div');
        footerDiv.className = 'article-source-footer';

        const footerH4 = document.createElement('h4');
        footerH4.textContent = '文章来源';
        footerDiv.appendChild(footerH4);

        const p1 = document.createElement('p');
        const s1 = document.createElement('strong');
        s1.textContent = '来源:';
        p1.appendChild(s1);
        p1.appendChild(document.createTextNode(' ' + meta.source));
        footerDiv.appendChild(p1);

        const p2 = document.createElement('p');
        const s2 = document.createElement('strong');
        s2.textContent = '原文链接:';
        p2.appendChild(s2);
        p2.appendChild(document.createTextNode(' '));
        const sourceLink = document.createElement('a');
        sourceLink.href = meta.sourceUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = meta.sourceUrl;
        p2.appendChild(sourceLink);
        footerDiv.appendChild(p2);

        const p3 = document.createElement('p');
        p3.className = 'copyright-notice';
        const s3 = document.createElement('strong');
        s3.textContent = '版权声明:';
        p3.appendChild(s3);
        p3.appendChild(document.createTextNode(' 本文版权归原作者及原作者所有，仅供学习交流使用。'));
        footerDiv.appendChild(p3);

        // Content container
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = htmlContent;

        // Clear and append
        modalBody.innerHTML = '';
        modalBody.appendChild(headerDiv);
        modalBody.appendChild(contentDiv);
        modalBody.appendChild(footerDiv);

        openModal(modal);

    } catch (error) {
        modalBody.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.style.textAlign = 'center';
        errorDiv.style.padding = '3rem';

        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';
        icon.style.fontSize = '3rem';
        icon.style.color = 'var(--accent-orange)';
        icon.style.marginBottom = '1rem';
        icon.style.display = 'block';
        errorDiv.appendChild(icon);

        const msg = document.createElement('p');
        msg.style.color = 'var(--text-secondary)';
        msg.textContent = '文章加载失败';
        errorDiv.appendChild(msg);

        const detail = document.createElement('p');
        detail.style.color = 'var(--text-tertiary)';
        detail.style.fontSize = '0.85rem';
        detail.textContent = error.message;
        errorDiv.appendChild(detail);

        modalBody.appendChild(errorDiv);
        openModal(modal);
    }
}

// Open modal
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Setup modal close handlers
function setupModalCloseHandlers(modal) {
    if (!modal) return;

    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => closeModal(modal));
    }

    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => closeModal(modal));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal(modal);
        }
    });
}
