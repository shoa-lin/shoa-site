/**
 * Text-to-Speech Controller for shoa-site
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

    initVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();

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
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    reset() {
        this.stop();
    }

    extractArticleText() {
        let articleBody = document.querySelector('.blog-article-body');
        if (!articleBody) {
            articleBody = document.querySelector('.modal-body');
        }
        if (!articleBody) return '';

        const clonedBody = articleBody.cloneNode(true);
        clonedBody.querySelectorAll('pre, code, .no-speak, script, style, .article-source-footer, .article-meta-header').forEach(el => el.remove());

        return clonedBody.textContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    toggle() {
        if (this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
            this.isPlaying = false;
            this.updateButton();
        } else if (this.synthesis.paused) {
            this.synthesis.resume();
            this.isPlaying = true;
            this.updateButton();
        } else {
            const text = this.extractArticleText();
            if (text) {
                this.speak(text);
            }
        }
    }

    speak(text) {
        this.stop();
        if (!text) return;

        const segments = this.splitText(text);
        const isHighQuality = this.chineseVoice?.name.includes('Neural') ||
                              this.chineseVoice?.name.includes('Enhanced') ||
                              this.chineseVoice?.name.includes('Premium');

        segments.forEach((segment, index) => {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(segment);

                if (this.chineseVoice) {
                    utterance.voice = this.chineseVoice;
                }

                if (isHighQuality) {
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                } else {
                    utterance.rate = 0.95;
                    utterance.pitch = 0.95;
                }
                utterance.volume = 1.0;

                if (index === 0) {
                    utterance.onstart = () => {
                        this.isPlaying = true;
                        this.updateButton();
                    };
                    utterance.onerror = () => {};
                }

                if (index === segments.length - 1) {
                    utterance.onend = () => {
                        this.isPlaying = false;
                        this.updateButton();
                    };
                }

                this.synthesis.speak(utterance);
            }, index * 100);
        });
    }

    splitText(text) {
        const maxChunkLength = 300;
        const sentences = text.split(/([。！？.!?，,；;])/);
        const segments = [];
        let currentSegment = '';

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (!sentence) continue;

            if (currentSegment.length + sentence.length > maxChunkLength && currentSegment.trim()) {
                segments.push(currentSegment.trim());
                currentSegment = sentence;
            } else {
                currentSegment += sentence;
            }
        }

        if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
        }

        return segments.filter(s => s.length > 0);
    }

    stop() {
        this.synthesis.cancel();
        this.isPlaying = false;
        this.updateButton();
    }

    updateButton() {
        const btn = document.getElementById('tts-toggle-btn');
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (!icon) return;

        const isPaused = this.synthesis.paused;

        if (this.isPlaying && !isPaused) {
            icon.className = 'fas fa-pause';
            btn.title = '暂停播放';
            btn.classList.add('playing');
        } else if (isPaused) {
            icon.className = 'fas fa-play';
            btn.title = '继续播放';
            btn.classList.remove('playing');
        } else {
            icon.className = 'fas fa-headphones';
            btn.title = '朗读文章';
            btn.classList.remove('playing');
        }
    }
}

// Global TTS instance
let ttsController = null;

function initTTS() {
    if (!('speechSynthesis' in window)) {
        const ttsBtn = document.getElementById('tts-toggle-btn');
        if (ttsBtn) ttsBtn.style.display = 'none';
        return;
    }

    ttsController = new TTSController();

    const ttsBtn = document.getElementById('tts-toggle-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', () => ttsController.toggle());
    }
}

function resetTTS() {
    if (ttsController) {
        ttsController.reset();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    initTTS();
}

window.addEventListener('beforeunload', () => {
    if (ttsController) ttsController.stop();
});
