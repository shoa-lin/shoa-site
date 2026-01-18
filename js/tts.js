/**
 * Text-to-Speech Controller for shoa-site
 * 简化版：点击 🎧 直接播放当前文章
 */

class TTSController {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.voices = [];
        this.chineseVoice = null;

        this.initVoices();
    }

    // 初始化语音，优先选择中文
    initVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();
            // 优先选择中文语音
            this.chineseVoice = this.voices.find(v => v.lang.startsWith('zh')) || this.voices[0];
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    // 提取文章文本内容（过滤代码块等）
    extractArticleText() {
        // 支持博客和收藏页面
        let articleBody = document.querySelector('.blog-article-body');
        if (!articleBody) {
            articleBody = document.querySelector('.modal-body');
        }
        if (!articleBody) return '';

        // 克隆节点避免修改原文
        const clonedBody = articleBody.cloneNode(true);

        // 移除不需要朗读的元素
        clonedBody.querySelectorAll('pre, code, .no-speak, script, style, .article-source-footer, .article-meta-header').forEach(el => el.remove());

        // 获取纯文本，清理多余空白
        let text = clonedBody.textContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return text;
    }

    // 切换播放/停止
    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            const text = this.extractArticleText();
            if (text) {
                this.speak(text);
            }
        }
    }

    // 开始朗读
    speak(text) {
        this.stop();

        if (!text) return;

        // 分段处理长文本
        const segments = this.splitText(text);

        segments.forEach((segment, index) => {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(segment);
                utterance.voice = this.chineseVoice;
                utterance.rate = 1;
                utterance.pitch = 1;
                utterance.volume = 1;

                if (index === 0) {
                    utterance.onstart = () => {
                        this.isPlaying = true;
                        this.updateButton();
                    };
                }

                if (index === segments.length - 1) {
                    utterance.onend = () => {
                        this.isPlaying = false;
                        this.updateButton();
                    };
                }

                this.synthesis.speak(utterance);
            }, index * 100); // 短暂延迟避免浏览器限制
        });
    }

    // 分割文本为段落
    splitText(text) {
        const maxChunkLength = 200;
        const sentences = text.split(/([。！？.!?])/);
        const segments = [];
        let currentSegment = '';

        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i] + (sentences[i + 1] || '');
            if (currentSegment.length + sentence.length > maxChunkLength && currentSegment) {
                segments.push(currentSegment.trim());
                currentSegment = sentence;
            } else {
                currentSegment += sentence;
            }
        }

        if (currentSegment) {
            segments.push(currentSegment.trim());
        }

        return segments.filter(s => s.length > 0);
    }

    // 停止朗读
    stop() {
        this.synthesis.cancel();
        this.isPlaying = false;
        this.updateButton();
    }

    // 更新按钮状态
    updateButton() {
        const btn = document.getElementById('tts-toggle-btn');
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (!icon) return;

        if (this.isPlaying) {
            icon.className = 'fas fa-stop';
            btn.title = '停止播放';
            btn.classList.add('playing');
        } else {
            icon.className = 'fas fa-headphones';
            btn.title = '朗读文章';
            btn.classList.remove('playing');
        }
    }
}

// 全局 TTS 实例
let ttsController = null;

// 初始化 TTS 功能
function initTTS() {
    if (!('speechSynthesis' in window)) {
        console.warn('当前浏览器不支持语音合成');
        const ttsBtn = document.getElementById('tts-toggle-btn');
        if (ttsBtn) ttsBtn.style.display = 'none';
        return;
    }

    ttsController = new TTSController();

    // 点击按钮直接播放/停止
    const ttsBtn = document.getElementById('tts-toggle-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', () => ttsController.toggle());
    }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    initTTS();
}

// 页面卸载时停止播放
window.addEventListener('beforeunload', () => {
    if (ttsController) {
        ttsController.stop();
    }
});
