/**
 * Edge-TTS Controller for shoa-site
 * 使用 Microsoft Edge Neural TTS API 提供高质量语音合成
 * 语音: zh-CN-YunyangNeural (男声，稳重)
 */

class EdgeTTSController {
    constructor(workerUrl = 'https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts') {
        this.workerUrl = workerUrl;
        this.audio = null;
        this.currentSegmentIndex = 0;
        this.segments = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.onSegmentEnd = null;

        // 配置参数
        this.voice = 'zh-CN-YunyangNeural'; // 男声，稳重
        this.rate = '+0%'; // 正常语速
    }

    // 设置Worker URL（需要根据实际部署修改）
    setWorkerUrl(url) {
        this.workerUrl = url;
    }

    // 重置状态
    reset() {
        this.stop();
        this.segments = [];
        this.currentSegmentIndex = 0;
        console.log('Edge-TTS状态已重置');
    }

    // 提取文章文本内容
    extractArticleText() {
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

        console.log('提取的文本长度:', text.length);

        return text;
    }

    // 分割文本为段落
    splitText(text, maxLength = 500) {
        const segments = [];
        const sentences = text.split(/([。！？.!?])/);
        let currentSegment = '';

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (!sentence) continue;

            if (currentSegment.length + sentence.length > maxLength && currentSegment.trim()) {
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

    // 获取TTS音频
    async fetchTTS(text) {
        try {
            const response = await fetch(this.workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: this.voice,
                    rate: this.rate
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();

        } catch (error) {
            console.error('TTS请求失败:', error);
            throw error;
        }
    }

    // 播放单个音频片段
    playSegment(audioBlob) {
        return new Promise((resolve, reject) => {
            const audioUrl = URL.createObjectURL(audioBlob);
            this.audio = new Audio(audioUrl);

            this.audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };

            this.audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                reject(error);
            };

            this.audio.play().catch(reject);
        });
    }

    // 开始朗读
    async speak(text) {
        this.reset();

        if (!text) {
            console.warn('没有可播放的文本内容');
            return;
        }

        console.log('开始Edge-TTS播放...');

        // 分割文本
        this.segments = this.splitText(text);
        console.log('文本分段数:', this.segments.length);

        this.isPlaying = true;
        this.updateButton();

        // 依次播放每个段落
        for (let i = 0; i < this.segments.length; i++) {
            if (!this.isPlaying) break;

            this.currentSegmentIndex = i;
            console.log(`播放第 ${i + 1}/${this.segments.length} 段`);

            try {
                // 获取音频
                const audioBlob = await this.fetchTTS(this.segments[i]);
                // 播放音频
                await this.playSegment(audioBlob);

                // 触发段落结束回调
                if (this.onSegmentEnd) {
                    this.onSegmentEnd(i);
                }

            } catch (error) {
                console.error(`播放第 ${i + 1} 段失败:`, error);
            }
        }

        // 播放完成
        this.isPlaying = false;
        this.updateButton();
        console.log('Edge-TTS播放完成');
    }

    // 切换播放/暂停/停止
    async toggle() {
        if (this.isPlaying && this.audio && !this.audio.paused) {
            // 正在播放，暂停
            console.log('暂停播放');
            this.audio.pause();
            this.isPaused = true;
            this.updateButton();
        } else if (this.isPaused) {
            // 已暂停，恢复播放
            console.log('恢复播放');
            this.audio.play();
            this.isPaused = false;
            this.updateButton();
        } else {
            // 没有在播放，开始新的播放
            const text = this.extractArticleText();
            if (text) {
                await this.speak(text);
            }
        }
    }

    // 停止朗读
    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButton();
    }

    // 更新按钮状态
    updateButton() {
        const btn = document.getElementById('tts-toggle-btn');
        if (!btn) return;

        const icon = btn.querySelector('i');
        if (!icon) return;

        if (this.isPlaying && !this.isPaused) {
            // 正在播放
            icon.className = 'fas fa-pause';
            btn.title = '暂停播放';
            btn.classList.add('playing');
        } else if (this.isPaused) {
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

// 全局 Edge-TTS 实例
let edgeTTSController = null;

// 初始化 Edge-TTS 功能
function initEdgeTTS() {
    // 从全局配置或使用默认URL
    const workerUrl = window.EDGE_TTS_WORKER_URL || 'https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts';

    // 创建实例
    edgeTTSController = new EdgeTTSController(workerUrl);

    // 点击按钮直接播放/暂停/恢复
    const ttsBtn = document.getElementById('tts-toggle-btn');
    if (ttsBtn) {
        ttsBtn.addEventListener('click', () => edgeTTSController.toggle());
    }

    console.log('Edge-TTS已初始化，Worker URL:', workerUrl);
}

// 重置Edge-TTS状态（打开新文章时调用）
function resetEdgeTTS() {
    if (edgeTTSController) {
        edgeTTSController.reset();
    }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEdgeTTS);
} else {
    initEdgeTTS();
}

// 页面卸载时停止播放
window.addEventListener('beforeunload', () => {
    if (edgeTTSController) {
        edgeTTSController.stop();
    }
});

// 导出到全局（兼容现有代码）
window.TTSController = EdgeTTSController;
window.ttsController = edgeTTSController;
window.resetTTS = resetEdgeTTS;
