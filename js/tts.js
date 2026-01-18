/**
 * Text-to-Speech Controller for shoa-site
 * 使用 Web Speech API 实现，零依赖、零成本
 */

class TTSController {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.voices = [];
        this.currentTextIndex = 0;
        this.textSegments = [];

        // 绑定 UI 元素
        this.playPauseBtn = document.getElementById('tts-play-pause');
        this.stopBtn = document.getElementById('tts-stop');
        this.statusEl = document.getElementById('tts-status');
        this.voiceSelect = document.getElementById('tts-voice-select');
        this.rateSlider = document.getElementById('tts-rate');

        this.initVoices();
        this.initEventListeners();
    }

    // 初始化可用语音列表
    initVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();

            // 优先选择中文语音，其次英文
            const chineseVoices = this.voices.filter(v => v.lang.startsWith('zh'));
            const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
            const preferredVoices = [...chineseVoices, ...englishVoices];

            if (this.voiceSelect) {
                if (preferredVoices.length > 0) {
                    this.voiceSelect.innerHTML = preferredVoices
                        .map((v, i) => `<option value="${this.voices.indexOf(v)}">${v.name} (${v.lang})</option>`)
                        .join('');
                } else {
                    this.voiceSelect.innerHTML = this.voices
                        .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
                        .join('');
                }
            }
        };

        loadVoices();
        // 语音列表异步加载，需要监听变化
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    // 初始化事件监听
    initEventListeners() {
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stop());
        }
        // 语速滑块实时显示
        if (this.rateSlider) {
            const rateValueEl = document.getElementById('tts-rate-value');
            this.rateSlider.addEventListener('input', (e) => {
                if (rateValueEl) {
                    rateValueEl.textContent = parseFloat(e.target.value).toFixed(1);
                }
            });
        }
    }

    // 提取文章文本内容（过滤代码块等不需要朗读的内容）
    extractArticleText() {
        const articleBody = document.querySelector('.blog-article-body');
        if (!articleBody) return '';

        // 克隆节点避免修改原文
        const clonedBody = articleBody.cloneNode(true);

        // 移除不需要朗读的元素
        clonedBody.querySelectorAll('pre, code, .no-speak, script, style').forEach(el => el.remove());

        // 获取纯文本，清理多余空白
        let text = clonedBody.textContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return text;
    }

    // 开始朗读
    speak(text) {
        this.stop();

        if (!text) {
            text = this.extractArticleText();
        }

        if (!text) {
            this.updateStatus('没有可朗读的内容');
            return;
        }

        // 分段处理长文本（避免单次朗读过长被截断）
        this.textSegments = this.splitText(text);
        this.currentTextIndex = 0;

        this.speakNextSegment();
    }

    // 分割文本为适合朗读的段落
    splitText(text) {
        const maxChunkLength = 200; // 每段最大字符数
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

    // 朗读下一段
    speakNextSegment() {
        if (this.currentTextIndex >= this.textSegments.length) {
            this.stop();
            this.updateStatus('朗读完成');
            return;
        }

        const text = this.textSegments[this.currentTextIndex];
        this.utterance = new SpeechSynthesisUtterance(text);

        // 设置语音参数
        if (this.voiceSelect && this.voiceSelect.value) {
            this.utterance.voice = this.voices[parseInt(this.voiceSelect.value)];
        }
        this.utterance.rate = this.rateSlider ? parseFloat(this.rateSlider.value) : 1;
        this.utterance.pitch = 1;
        this.utterance.volume = 1;

        // 事件回调
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.updateStatus(`正在朗读: ${this.currentTextIndex + 1}/${this.textSegments.length}`);
            this.updatePlayButton();
        };

        this.utterance.onend = () => {
            this.currentTextIndex++;
            if (this.currentTextIndex < this.textSegments.length) {
                this.speakNextSegment();
            } else {
                this.isPlaying = false;
                this.updateStatus('朗读完成');
                this.updatePlayButton();
            }
        };

        this.utterance.onerror = (event) => {
            console.error('TTS Error:', event.error);
            this.isPlaying = false;
            this.updateStatus(`朗读出错: ${event.error}`);
            this.updatePlayButton();
        };

        this.synthesis.speak(this.utterance);
    }

    // 切换播放/暂停
    togglePlayPause() {
        if (this.isPlaying) {
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        } else {
            const text = this.extractArticleText();
            if (text) {
                this.speak(text);
            }
        }
    }

    // 暂停
    pause() {
        if (this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
            this.isPaused = true;
            this.updateStatus('已暂停');
            this.updatePlayButton();
        }
    }

    // 继续
    resume() {
        if (this.synthesis.paused) {
            this.synthesis.resume();
            this.isPaused = false;
            this.updateStatus('继续朗读');
            this.updatePlayButton();
        }
    }

    // 停止
    stop() {
        this.synthesis.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTextIndex = 0;
        this.textSegments = [];
        this.updateStatus('已停止');
        this.updatePlayButton();
    }

    // 更新状态显示
    updateStatus(message) {
        if (this.statusEl) {
            this.statusEl.textContent = message;
        }
    }

    // 更新播放按钮图标
    updatePlayButton() {
        if (!this.playPauseBtn) return;

        const icon = this.playPauseBtn.querySelector('i');
        if (!icon) return;

        if (this.isPlaying && !this.isPaused) {
            icon.className = 'fas fa-pause';
            this.playPauseBtn.title = '暂停';
        } else {
            icon.className = 'fas fa-play';
            this.playPauseBtn.title = this.isPlaying ? '继续' : '播放';
        }
    }
}

// 全局 TTS 实例
let ttsController = null;

// 初始化 TTS 功能
function initTTS() {
    // 检查浏览器支持
    if (!('speechSynthesis' in window)) {
        console.warn('当前浏览器不支持语音合成');
        const ttsBtn = document.getElementById('tts-toggle-btn');
        if (ttsBtn) ttsBtn.style.display = 'none';
        return;
    }

    ttsController = new TTSController();

    // TTS 面板开关
    const ttsToggleBtn = document.getElementById('tts-toggle-btn');
    const ttsPanel = document.getElementById('tts-panel');
    const ttsCloseBtn = document.getElementById('tts-panel-close');

    if (ttsToggleBtn && ttsPanel) {
        ttsToggleBtn.addEventListener('click', () => {
            ttsPanel.classList.toggle('active');
            ttsToggleBtn.classList.toggle('active');
        });
    }

    if (ttsCloseBtn) {
        ttsCloseBtn.addEventListener('click', () => {
            ttsPanel.classList.remove('active');
            if (ttsToggleBtn) ttsToggleBtn.classList.remove('active');
        });
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
