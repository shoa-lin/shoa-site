// Blog page JavaScript

// Blog list - auto-scanned from blogs/ folder
let blogList = [];
let currentBlogId = null;

// Load blog list from blogs/ folder
async function loadBlogList() {
    const blogFiles = [
        'welcome.md'
        // Add more blog files here - will be auto-scanned in the future
    ];

    blogList = blogFiles.map(filename => {
        const id = filename.replace('.md', '');
        return {
            id: id,
            title: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
            date: '2025-12-28',
            filename: 'blogs/' + filename
        };
    });

    // Try to fetch manifest if exists
    try {
        const response = await fetch('blogs/manifest.json');
        if (response.ok) {
            const manifest = await response.json();
            if (Array.isArray(manifest)) {
                blogList = manifest;
                console.log('Loaded manifest.json:', blogList);
            }
        }
    } catch (e) {
        console.log('Using default blog list:', e);
        // Use default list
    }
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
    if (!blogListEl) return;

    blogListEl.innerHTML = blogList.map(blog => `
        <div class="blog-item" data-blog-id="${blog.id}" onclick="loadBlog('${blog.id}')">
            <div class="blog-item-title">${blog.title}</div>
            <div class="blog-item-date">${blog.date || '最新'}</div>
        </div>
    `).join('');
}

// Load and render a blog post
window.loadBlog = async function(blogId) {
    const blog = blogList.find(b => b.id === blogId);
    if (!blog) {
        console.error('Blog not found:', blogId, 'Available blogs:', blogList);
        return;
    }

    console.log('Loading blog:', blog);

    // Update active state in sidebar
    document.querySelectorAll('.blog-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.blogId === blogId) {
            item.classList.add('active');
        }
    });

    const blogContentEl = document.getElementById('blog-content');
    if (!blogContentEl) {
        console.error('Blog content element not found');
        return;
    }

    try {
        const response = await fetch(blog.filename);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const markdown = await response.text();
        console.log('Markdown loaded, length:', markdown.length);

        const { title, date, content } = extractBlogMetadata(markdown, blog.filename);
        const htmlContent = marked.parse(content);

        blogContentEl.innerHTML = `
            <article class="blog-article">
                <header class="blog-article-header">
                    <h1 class="blog-article-title">${title}</h1>
                    <div class="blog-article-meta">发布于 ${date || '2025-12-28'}</div>
                </header>
                <div class="blog-article-body">
                    ${htmlContent}
                </div>
            </article>
        `;

        currentBlogId = blogId;

        // Scroll to top of content on mobile
        if (window.innerWidth <= 768) {
            blogContentEl.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error('Error loading blog:', error);
        blogContentEl.innerHTML = `
            <div class="blog-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>文章加载失败</p>
                <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem;">错误: ${error.message}</p>
                <p style="font-size: 0.8rem; color: var(--text-tertiary);">文件路径: ${blog.filename}</p>
            </div>
        `;
    }
}

// Initialize blog page
async function initBlogPage() {
    await loadBlogList();
    renderBlogList();

    // Load first blog by default
    if (blogList.length > 0) {
        loadBlog(blogList[0].id);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initBlogPage);
