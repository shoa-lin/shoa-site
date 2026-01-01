// Blog page JavaScript

// Blog list - auto-scanned from blogs/ folder
let blogList = [];
let currentBlogId = null;

// Mobile drawer state
let isDrawerOpen = false;

// Initialize mobile drawer
function initMobileDrawer() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const sidebar = document.getElementById('mobile-drawer-sidebar');
    const closeBtn = document.getElementById('mobile-drawer-close');

    if (!menuBtn || !overlay || !sidebar || !closeBtn) {
        return;
    }

    // Open drawer
    function openDrawer() {
        isDrawerOpen = true;
        overlay.classList.add('active');
        sidebar.classList.add('active');
        document.body.classList.add('drawer-open');
    }

    // Close drawer
    function closeDrawer() {
        isDrawerOpen = false;
        overlay.classList.remove('active');
        sidebar.classList.remove('active');
        document.body.classList.remove('drawer-open');
    }

    // Event listeners
    menuBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDrawerOpen) {
            closeDrawer();
        }
    });
}

// Update mobile header title
function updateMobileHeader(title) {
    const headerTitle = document.getElementById('mobile-header-title');
    if (headerTitle) {
        headerTitle.textContent = title || '博客';
    }
}

// Load blog list from blogs/ folder
async function loadBlogList() {
    try {
        const response = await fetch('blogs/manifest.json');
        if (response.ok) {
            const manifest = await response.json();
            if (Array.isArray(manifest) && manifest.length > 0) {
                blogList = manifest;
                return;
            }
        }
    } catch (e) {
        // Silent fail, use fallback
    }

    blogList = [
        {
            id: 'welcome',
            title: '欢迎来到我的博客',
            date: '2025-12-28',
            filename: 'blogs/welcome.md'
        }
    ];
}

// Extract metadata from markdown content
function extractBlogMetadata(markdown, filename) {
    let title = filename.replace('.md', '').replace(/-/g, ' ');
    let date = '';
    let content = markdown;

    // Try to extract frontmatter (YAML format)
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const dateMatch = frontmatter.match(/date:\s*(.+)/);

        if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
        if (dateMatch) date = dateMatch[1].trim();

        // Remove frontmatter from content
        content = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    }

    // If no title from frontmatter, try to extract first h1 as title
    if (!title || title === filename.replace('.md', '').replace(/-/g, ' ')) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match) {
            title = h1Match[1].trim();
        }
    }

    return { title, date, content };
}

// Render blog list sidebar
function renderBlogList() {
    const blogListEl = document.getElementById('blog-list');
    const mobileBlogListEl = document.getElementById('mobile-blog-list');

    if (blogList.length === 0) {
        const emptyHTML = '<div class="blog-item"><div class="blog-item-title">暂无文章</div></div>';
        if (blogListEl) blogListEl.innerHTML = emptyHTML;
        if (mobileBlogListEl) mobileBlogListEl.innerHTML = emptyHTML;
        return;
    }

    const listHTML = blogList.map(blog => `
        <div class="blog-item" data-blog-id="${blog.id}" onclick="loadBlog('${blog.id}')">
            <div class="blog-item-title">${blog.title}</div>
            <div class="blog-item-date">${blog.date || '最新'}</div>
        </div>
    `).join('');

    if (blogListEl) blogListEl.innerHTML = listHTML;
    if (mobileBlogListEl) mobileBlogListEl.innerHTML = listHTML;
}

// Load and render a blog post
window.loadBlog = async function(blogId) {
    const blog = blogList.find(b => b.id === blogId);
    if (!blog) {
        return;
    }

    // Update active state in both sidebars
    document.querySelectorAll('.blog-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.blogId === blogId) {
            item.classList.add('active');
        }
    });

    const blogContentEl = document.getElementById('blog-content');
    if (!blogContentEl) {
        return;
    }

    try {
        const response = await fetch(blog.filename);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const markdown = await response.text();
        const { title, date, content } = extractBlogMetadata(markdown, blog.filename);
        const htmlContent = marked.parse(content);

        blogContentEl.innerHTML = `
            <article class="blog-article">
                <div class="blog-article-body">
                    ${htmlContent}
                </div>
            </article>
        `;

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

        // Scroll to top of content on mobile
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

    } catch (error) {
        blogContentEl.innerHTML = `
            <div class="blog-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>文章加载失败</p>
                <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem;">错误: ${error.message}</p>
            </div>
        `;
    }
}

// Initialize blog page
async function initBlogPage() {
    if (typeof marked === 'undefined') {
        return;
    }

    await loadBlogList();
    renderBlogList();
    initMobileDrawer();

    if (blogList.length > 0) {
        loadBlog(blogList[0].id);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initBlogPage);
