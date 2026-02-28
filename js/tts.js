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

    // 初始化语音，优先选择高质量自然语音
    initVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();
            console.log('可用语音列表:', this.voices.map(v => `${v.name} (${v.lang})`));

            // 优先级顺序：
            // 1. Microsoft 神经语音（Neural）- 最高质量
            // 2. Microsoft 增强语音（Enhanced）
            // 3. Microsoft Premium 语音
            // 4. 其他中文语音（排除 Google）
            // 5. 任何可用的语音

            this.chineseVoice = this.voices.find(v =>
                v.lang.startsWith('zh-CN') && v.name.includes('Microsoft') && v.name.includes('Neural')
            ) || this.voices.find(v =>
                v.lang.startsWith('zh-CN') && (
                    v.name.includes('Neural') ||
                    v.name.includes('Enhanced') ||
                    v.name.includes('Premium')
                )
            ) || this.voices.find(v =>
                v.lang.startsWith('zh-CN') && v.name.includes('Microsoft')
            ) || this.voices.find(v =>
                v.lang.startsWith('zh-CN') && !v.name.includes('Google') && !v.name.includes('Tencent')
            ) || this.voices.find(v =>
                v.lang.startsWith('zh-CN')
            ) || this.voices.find(v =>
                v.lang.startsWith('zh')
            ) || this.voices.find(v => !v.name.includes('Google')) || this.voices[0];

            console.log('选择的语音:', this.chineseVoice ? `${this.chineseVoice.name} (${this.chineseVoice.lang})` : '无');

            // 显示语音质量提示
            if (this.chineseVoice) {
                if (this.chineseVoice.name.includes('Neural')) {
                    console.log('✅ 使用高质量神经语音');
                } else if (this.chineseVoice.name.includes('Enhanced') || this.chineseVoice.name.includes('Microsoft')) {
                    console.log('✅ 使用高质量增强语音');
                } else {
                    console.log('⚠️ 使用标准语音（如需更高质量，请在 macOS 设置中下载更多语音）');
                }
            }
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    // 重置状态（当打开新文章时调用）
    reset() {
        this.stop();
        console.log('TTS状态已重置');
    }

    // 提取文章文本内容（过滤代码块等）
    extractArticleText() {
        // 支持博客和收藏页面
        let articleBody = document.querySelector('.blog-article-body');
        if (!articleBody) {
            articleBody = document.querySelector('.modal-body');
        }
        if (!articleBody) {
            console.warn('未找到文章内容容器');
            return '';
        }

        console.log('找到文章容器，子元素数量:', articleBody.children.length);

        // 克隆节点避免修改原文
        const clonedBody = articleBody.cloneNode(true);

        // 移除不需要朗读的元素
        clonedBody.querySelectorAll('pre, code, .no-speak, script, style, .article-source-footer, .article-meta-header').forEach(el => el.remove());

        // 获取纯文本，清理多余空白
        let text = clonedBody.textContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        console.log('提取的文本预览:', text.substring(0, 100) + '...');

        return text;
    }

    // 切换播放/暂停/停止
    toggle() {
        // 检查是否正在播放
        if (this.synthesis.speaking && !this.synthesis.paused) {
            // 正在播放，暂停
            console.log('暂停播放');
            this.synthesis.pause();
            this.isPlaying = false;
            this.updateButton();
        } else if (this.synthesis.paused) {
            // 已暂停，恢复播放
            console.log('恢复播放');
            this.synthesis.resume();
            this.isPlaying = true;
            this.updateButton();
        } else {
            // 没有在播放，开始新的播放
            const text = this.extractArticleText();
            console.log('提取的文本长度:', text.length);
            if (text) {
                console.log('开始播放...');
                this.speak(text);
            } else {
                console.warn('没有可播放的文本内容');
            }
        }
    }

    // 开始朗读
    speak(text) {
        this.stop();

        if (!text) return;

        console.log('准备播放，使用语音:', this.chineseVoice?.name);

        // 分段处理长文本
        const segments = this.splitText(text);
        console.log('文本分段数:', segments.length);

        // 检查是否是高质量语音，调整参数
        const isHighQuality = this.chineseVoice?.name.includes('Neural') ||
                              this.chineseVoice?.name.includes('Enhanced') ||
                              this.chineseVoice?.name.includes('Premium');

        segments.forEach((segment, index) => {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(segment);

                if (this.chineseVoice) {
                    utterance.voice = this.chineseVoice;
                }

                // 根据语音质量调整参数
                if (isHighQuality) {
                    // 高质量语音使用标准参数
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                } else {
                    // 普通语音优化参数以减少机械感
                    utterance.rate = 0.95; // 稍微放慢，增加自然感
                    utterance.pitch = 0.95; // 略微降低音调，更稳重
                }
                utterance.volume = 1.0;

                // 添加语音间的停顿，增加自然感
                utterance.onpause = () => {
                    // 短暂停顿后继续
                    setTimeout(() => {
                        if (this.synthesis.paused) {
                            this.synthesis.resume();
                        }
                    }, 100);
                };

                if (index === 0) {
                    utterance.onstart = () => {
                        console.log('播放开始，使用语音:', this.chineseVoice?.name);
                        this.isPlaying = true;
                        this.updateButton();
                    };

                    utterance.onerror = (event) => {
                        console.error('TTS播放错误:', event.error);
                    };
                }

                if (index === segments.length - 1) {
                    utterance.onend = () => {
                        console.log('播放结束');
                        this.isPlaying = false;
                        this.updateButton();
                    };
                }

                this.synthesis.speak(utterance);
                console.log(`播放第 ${index + 1}/${segments.length} 段`);
            }, index * 100);
        });
    }

    // 分割文本为段落，改进断句逻辑
    splitText(text) {
        // 更大的分段长度，减少频繁断句
        const maxChunkLength = 300;

        // 按句子分割，保留标点
        const sentences = text.split(/([。！？.!?，,；;])/);
        const segments = [];
        let currentSegment = '';

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (!sentence) continue;

            // 如果当前段加上新句子超过长度限制，且当前段不为空，保存当前段
            if (currentSegment.length + sentence.length > maxChunkLength && currentSegment.trim()) {
                segments.push(currentSegment.trim());
                currentSegment = sentence;
            } else {
                currentSegment += sentence;
            }
        }

        // 添加最后一段
        if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
        }

        // 过滤空段落
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

        const isPaused = this.synthesis.paused;

        if (this.isPlaying && !isPaused) {
            // 正在播放
            icon.className = 'fas fa-pause';
            btn.title = '暂停播放';
            btn.classList.add('playing');
        } else if (isPaused) {
            // 已暂停
            icon.className = 'fas fa-play';
            btn.title = '继续播放';
            btn.classList.remove('playing');
        } else {
            // 未播放
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

    // 点击按钮直接播放/暂停/恢复
    const ttsBtn = document.getElementById('tts-toggle-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', () => ttsController.toggle());
    }
}

// 重置TTS状态（打开新文章时调用）
function resetTTS() {
    if (ttsController) {
        ttsController.reset();
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
