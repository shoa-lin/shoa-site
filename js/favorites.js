// Favorites page JavaScript - uses shared articles.js

// Filter buttons
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderArticleCards(button.dataset.filter);
        });
    });
}

// Fullscreen toggle
function toggleFullscreen() {
    const modal = document.getElementById('article-modal');
    const modalContent = modal?.querySelector('.modal-content');
    if (!modalContent) return;

    modalContent.classList.toggle('fullscreen');
    const isFullscreen = modalContent.classList.contains('fullscreen');

    const toggleBtn = document.getElementById('fullscreen-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
        }
        toggleBtn.title = isFullscreen ? '退出全屏' : '全屏阅读';
    }

    if (isFullscreen) {
        const modalBody = document.getElementById('modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }
}

// Override openModal for favorites (with animation + fullscreen reset)
const _origOpenModal = openModal;
openModal = function(modal) {
    if (!modal) return;
    modal.classList.add('active');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        requestAnimationFrame(() => {
            modalContent.classList.add('active');
        });
        modalContent.classList.remove('fullscreen');
        const toggleBtn = document.getElementById('fullscreen-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-expand';
            toggleBtn.title = '全屏阅读';
        }
    }
    document.body.style.overflow = 'hidden';

    if (typeof resetTTS === 'function') {
        resetTTS();
    }
};

// Override closeModal for favorites (with animation delay)
const _origCloseModal = closeModal;
closeModal = function(modal) {
    if (!modal) return;
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('active');
    }
    setTimeout(() => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }, 300);
};

// Initialize
async function initFavoritesPage() {
    await loadArticleList('favorites/articles/manifest.json');
    renderArticleCards();
    initFilterButtons();

    // Setup modal handlers
    const modal = document.getElementById('article-modal');
    setupModalCloseHandlers(modal);

    // Fullscreen toggle
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('click', toggleFullscreen);
    }
}

document.addEventListener('DOMContentLoaded', initFavoritesPage);
