// Blog page JavaScript

let blogList = [];
let filteredBlogList = [];
let currentBlogId = null;
let currentCategory = 'all';
let tocItems = [];
let activeTocId = null;
let isTocPanelOpen = false;
let isDrawerOpen = false;
let scrollObserver = null;

// =====================
// Mobile Drawer
// =====================

function initMobileDrawer() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const sidebar = document.getElementById('mobile-drawer-sidebar');
    const closeBtn = document.getElementById('mobile-drawer-close');

    if (!menuBtn || !overlay || !sidebar || !closeBtn) return;

    function openDrawer() {
        isDrawerOpen = true;
        overlay.classList.add('active');
        sidebar.classList.add('active');
        document.body.classList.add('drawer-open');
    }

    function closeDrawer() {
        isDrawerOpen = false;
        overlay.classList.remove('active');
        sidebar.classList.remove('active');
        document.body.classList.remove('drawer-open');
    }

    menuBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDrawerOpen) closeDrawer();
    });
}

function updateMobileHeader(title) {
    const headerTitle = document.getElementById('mobile-header-title');
    if (headerTitle) headerTitle.textContent = title || '博客';
}

// =====================
// TOC Panel
// =====================

function initTocPanel() {
    const toggleBtn = document.getElementById('toc-toggle-btn');
    const closeBtn = document.getElementById('toc-panel-close');
    const overlay = document.getElementById('toc-overlay');
    const panel = document.getElementById('toc-panel');

    if (!toggleBtn || !closeBtn || !overlay || !panel) return;

    function openTocPanel() {
        isTocPanelOpen = true;
        panel.classList.add('active');
        overlay.classList.add('active');
        toggleBtn.classList.add('active');
    }

    function closeTocPanel() {
        isTocPanelOpen = false;
        panel.classList.remove('active');
        overlay.classList.remove('active');
        toggleBtn.classList.remove('active');
    }

    toggleBtn.addEventListener('click', () => {
        isTocPanelOpen ? closeTocPanel() : openTocPanel();
    });
    closeBtn.addEventListener('click', closeTocPanel);
    overlay.addEventListener('click', closeTocPanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isTocPanelOpen) closeTocPanel();
    });
}

// =====================
// Blog List
// =====================

async function loadBlogList() {
    try {
        const response = await fetch('blogs/manifest.json');
        if (response.ok) {
            const manifest = await response.json();
            if (Array.isArray(manifest) && manifest.length > 0) {
                blogList = manifest.sort((a, b) => new Date(b.date) - new Date(a.date));
                filteredBlogList = [...blogList];
                return;
            }
        }
    } catch (_e) {
        // Silent fail, use fallback
    }

    blogList = [
        {
            id: 'welcome',
            title: '欢迎来到我的博客',
            date: '2025-12-28',
            category: 'general',
            filename: 'blogs/welcome.md'
        }
    ];
    filteredBlogList = [...blogList];
}

function extractBlogMetadata(markdown) {
    let title = '';
    let date = '';
    let content = markdown;

    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const dateMatch = frontmatter.match(/date:\s*(.+)/);

        if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
        if (dateMatch) date = dateMatch[1].trim();

        content = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    }

    if (!title) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match) title = h1Match[1].trim();
    }

    return { title, date, content };
}

function filterBlogList(category) {
    currentCategory = category;
    filteredBlogList = category === 'all'
        ? [...blogList]
        : blogList.filter(blog => blog.category === category);
    renderBlogList();
    updateCategoryActiveState();
}

function updateCategoryActiveState() {
    document.querySelectorAll('.category-filter-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === currentCategory);
    });
}

// Render blog list — XSS-safe using DOM API
function renderBlogList() {
    const blogListEl = document.getElementById('blog-list');
    const mobileBlogListEl = document.getElementById('mobile-blog-list');

    const targets = [blogListEl, mobileBlogListEl].filter(Boolean);

    if (filteredBlogList.length === 0) {
        targets.forEach(el => {
            el.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'blog-item';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'blog-item-title';
            titleDiv.textContent = '该分类暂无文章';
            div.appendChild(titleDiv);
            el.appendChild(div);
        });
        return;
    }

    targets.forEach(el => {
        el.innerHTML = '';
        filteredBlogList.forEach(blog => {
            const item = document.createElement('div');
            item.className = 'blog-item';
            item.dataset.blogId = blog.id;

            const titleDiv = document.createElement('div');
            titleDiv.className = 'blog-item-title';
            titleDiv.textContent = blog.title;

            const dateDiv = document.createElement('div');
            dateDiv.className = 'blog-item-date';
            dateDiv.textContent = blog.date || '最新';

            item.appendChild(titleDiv);
            item.appendChild(dateDiv);

            item.addEventListener('click', () => loadBlog(blog.id));
            el.appendChild(item);
        });
    });
}

// =====================
// TOC
// =====================

function extractTOC(articleBody) {
    const headers = articleBody.querySelectorAll('h2, h3');
    tocItems = [];

    headers.forEach((header, index) => {
        const id = 'section-' + index;
        header.id = id;
        const level = parseInt(header.tagName.charAt(1));

        tocItems.push({
            id: id,
            title: header.textContent.trim(),
            level: level,
            element: header
        });
    });

    return tocItems;
}

function renderTOC() {
    const tocPanelContent = document.getElementById('toc-panel-content');
    const toggleBtn = document.getElementById('toc-toggle-btn');

    if (tocItems.length === 0) {
        if (toggleBtn) toggleBtn.style.display = 'none';
        return;
    }

    if (toggleBtn) toggleBtn.style.display = 'flex';

    if (tocPanelContent) {
        tocPanelContent.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'blog-toc-list';

        tocItems.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#' + item.id;
            a.className = 'blog-toc-item level-' + (item.level - 1);
            a.dataset.tocId = item.id;
            a.textContent = item.title;

            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(item.id);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Close TOC panel
                    const overlay = document.getElementById('toc-overlay');
                    const panel = document.getElementById('toc-panel');
                    const btn = document.getElementById('toc-toggle-btn');
                    if (overlay) overlay.classList.remove('active');
                    if (panel) panel.classList.remove('active');
                    if (btn) btn.classList.remove('active');
                    isTocPanelOpen = false;
                }
            });

            li.appendChild(a);
            ul.appendChild(li);
        });

        tocPanelContent.appendChild(ul);
    }
}

function initScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    if (tocItems.length === 0) return;

    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActiveTocItem(entry.target.id);
            }
        });
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });

    tocItems.forEach(item => scrollObserver.observe(item.element));
    initBackToTopButton();
}

function setActiveTocItem(tocId) {
    document.querySelectorAll('.blog-toc-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector('.blog-toc-item[data-toc-id="' + tocId + '"]');
    if (activeItem) {
        activeItem.classList.add('active');
        activeTocId = tocId;
    }
}

// =====================
// Back to Top
// =====================

function initBackToTopButton() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;

    let ticking = false;
    const toggleButton = () => {
        backToTopBtn.classList.toggle('visible', window.scrollY > 300);
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                toggleButton();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    toggleButton();

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =====================
// Blog Loading
// =====================

async function loadBlog(blogId) {
    const blog = blogList.find(b => b.id === blogId);
    if (!blog) return;

    if (currentCategory !== 'all' && blog.category !== currentCategory) {
        filterBlogList('all');
    }

    // Update active state
    document.querySelectorAll('.blog-item').forEach(item => {
        item.classList.toggle('active', item.dataset.blogId === blogId);
    });

    const blogContentEl = document.getElementById('blog-content');
    if (!blogContentEl) return;

    try {
        const response = await fetch(blog.filename);
        if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);

        const markdown = await response.text();
        const { title, content } = extractBlogMetadata(markdown);
        const htmlContent = marked.parse(content);

        // Build article safely
        const article = document.createElement('article');
        article.className = 'blog-article';

        const body = document.createElement('div');
        body.className = 'blog-article-body';
        body.innerHTML = htmlContent;

        article.appendChild(body);
        blogContentEl.innerHTML = '';
        blogContentEl.appendChild(article);

        extractTOC(body);
        renderTOC();
        initScrollObserver();

        currentBlogId = blogId;
        updateMobileHeader(title);

        // Close mobile drawer if open
        if (isDrawerOpen) {
            const overlay = document.getElementById('mobile-drawer-overlay');
            const sidebar = document.getElementById('mobile-drawer-sidebar');
            if (overlay) overlay.classList.remove('active');
            if (sidebar) sidebar.classList.remove('active');
            document.body.classList.remove('drawer-open');
            isDrawerOpen = false;
        }

        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

    } catch (error) {
        blogContentEl.innerHTML = '';
        const placeholder = document.createElement('div');
        placeholder.className = 'blog-placeholder';

        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';
        placeholder.appendChild(icon);

        const msg = document.createElement('p');
        msg.textContent = '文章加载失败';
        placeholder.appendChild(msg);

        const detail = document.createElement('p');
        detail.style.fontSize = '0.8rem';
        detail.style.color = 'var(--text-tertiary)';
        detail.style.marginTop = '0.5rem';
        detail.textContent = '错误: ' + error.message;
        placeholder.appendChild(detail);

        blogContentEl.appendChild(placeholder);
    }
}

// =====================
// Initialization
// =====================

function initCategoryFilter() {
    document.querySelectorAll('.category-filter-item').forEach(item => {
        item.addEventListener('click', () => {
            filterBlogList(item.dataset.category);

            if (isDrawerOpen) {
                const overlay = document.getElementById('mobile-drawer-overlay');
                const sidebar = document.getElementById('mobile-drawer-sidebar');
                if (overlay) overlay.classList.remove('active');
                if (sidebar) sidebar.classList.remove('active');
                document.body.classList.remove('drawer-open');
                isDrawerOpen = false;
            }
        });
    });
}

async function initBlogPage() {
    if (typeof marked === 'undefined') return;

    await loadBlogList();
    renderBlogList();
    initMobileDrawer();
    initTocPanel();
    initCategoryFilter();

    if (filteredBlogList.length > 0) {
        loadBlog(filteredBlogList[0].id);
    }
}

document.addEventListener('DOMContentLoaded', initBlogPage);
