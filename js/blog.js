// Blog page JavaScript

// Blog list - auto-scanned from blogs/ folder
let blogList = [];
let currentBlogId = null;

// TOC data
let tocItems = [];
let activeTocId = null;

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

    // Initialize mobile drawer tabs
    initMobileDrawerTabs();
}

// Initialize mobile drawer tabs
function initMobileDrawerTabs() {
    const tabs = document.querySelectorAll('.mobile-drawer-tab');
    const blogList = document.getElementById('mobile-blog-list');
    const tocList = document.getElementById('mobile-toc-list');

    if (!tabs.length || !blogList || !tocList) {
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update tab styles
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Toggle content visibility
            if (tabName === 'articles') {
                blogList.style.display = 'block';
                tocList.style.display = 'none';
            } else if (tabName === 'toc') {
                blogList.style.display = 'none';
                tocList.style.display = 'block';
            }
        });
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

// Extract and generate TOC from article content
function extractTOC(articleBody) {
    const headers = articleBody.querySelectorAll('h2, h3');

    // Filter out the first h1 and any h1s before content
    const allHeaders = Array.from(articleBody.querySelectorAll('h1, h2, h3'));
    let skipFirstH1 = true;
    let foundContentStart = false;

    tocItems = [];

    headers.forEach((header, index) => {
        // Skip until we find actual content (after first h1)
        if (!foundContentStart) {
            if (header.tagName === 'H1') {
                return; // Skip first H1
            }
            foundContentStart = true;
        }

        // Generate unique ID for each header
        const id = `section-${index}`;
        header.id = id;

        const level = parseInt(header.tagName.charAt(1)); // 2 for H2, 3 for H3

        tocItems.push({
            id: id,
            title: header.textContent.trim(),
            level: level,
            element: header
        });
    });

    return tocItems;
}

// Render TOC
function renderTOC() {
    const tocSidebar = document.getElementById('blog-toc-sidebar');
    const tocContent = document.getElementById('blog-toc-content');
    const mobileTocList = document.getElementById('mobile-toc-list');

    // Hide TOC if no items
    if (tocItems.length === 0) {
        if (tocSidebar) {
            tocSidebar.classList.remove('has-toc');
            tocSidebar.style.display = 'none';
        }
        return;
    }

    // Show TOC sidebar
    if (tocSidebar) {
        tocSidebar.classList.add('has-toc');
    }

    // Generate TOC HTML
    const tocHTML = `
        <ul class="blog-toc-list">
            ${tocItems.map(item => `
                <li>
                    <a href="#${item.id}"
                       class="blog-toc-item level-${item.level - 1}"
                       data-toc-id="${item.id}">
                        ${item.title}
                    </a>
                </li>
            `).join('')}
        </ul>
    `;

    if (tocContent) {
        tocContent.innerHTML = tocHTML;
    }

    if (mobileTocList) {
        mobileTocList.innerHTML = tocHTML;
    }

    // Add click handlers for TOC items
    const tocLinks = document.querySelectorAll('.blog-toc-item');
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-toc-id');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Smooth scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Close mobile drawer after clicking
                if (window.innerWidth <= 768 && isDrawerOpen) {
                    const overlay = document.getElementById('mobile-drawer-overlay');
                    const sidebar = document.getElementById('mobile-drawer-sidebar');
                    if (overlay) overlay.classList.remove('active');
                    if (sidebar) sidebar.classList.remove('active');
                    document.body.classList.remove('drawer-open');
                    isDrawerOpen = false;
                }
            }
        });
    });
}

// Initialize scroll observer for TOC highlighting
let scrollObserver = null;

function initScrollObserver() {
    // Disconnect existing observer
    if (scrollObserver) {
        scrollObserver.disconnect();
    }

    // Only initialize if we have TOC items
    if (tocItems.length === 0) {
        return;
    }

    const progressBar = document.getElementById('blog-toc-progress-bar');

    const observerOptions = {
        rootMargin: '-100px 0px -60% 0px',  // Trigger when item is in middle of viewport
        threshold: 0
    };

    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tocId = entry.target.id;
                setActiveTocItem(tocId);

                // Update progress bar
                if (progressBar) {
                    const progress = calculateReadingProgress();
                    progressBar.style.height = `${progress}%`;
                }
            }
        });
    }, observerOptions);

    // Observe all TOC items
    tocItems.forEach(item => {
        scrollObserver.observe(item.element);
    });

    // Show/hide back to top button based on scroll position
    initBackToTopButton();
}

// Set active TOC item
function setActiveTocItem(tocId) {
    // Remove active class from all items
    document.querySelectorAll('.blog-toc-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to current item
    const activeItem = document.querySelector(`.blog-toc-item[data-toc-id="${tocId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeTocId = tocId;
    }
}

// Calculate reading progress percentage
function calculateReadingProgress() {
    if (tocItems.length === 0) return 0;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
    return Math.min(100, Math.max(0, progress));
}

// Initialize back to top button
function initBackToTopButton() {
    const backToTopBtn = document.getElementById('back-to-top');

    if (!backToTopBtn) return;

    // Show/hide button based on scroll position
    const toggleButton = () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', toggleButton);
    toggleButton(); // Initial check

    // Click handler
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
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

        // Extract and render TOC after content is loaded
        const articleBody = blogContentEl.querySelector('.blog-article-body');
        if (articleBody) {
            extractTOC(articleBody);
            renderTOC();
            initScrollObserver();
        }

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
