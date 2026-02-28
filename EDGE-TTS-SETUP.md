# Edge-TTS 集成指南

## 概述

本站已集成 Microsoft Edge Neural TTS（文本转语音）服务，提供高质量的文章朗读功能。

**当前使用的语音**: `zh-CN-YunyangNeural`（男声，稳重）

## 架构说明

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  前端 (shoa-site)│ ─────> │ Cloudflare Worker│ ─────> │ Edge TTS    │
│  edge-tts.js    │         │ (免费代理服务)     │         │ API         │
└─────────────────┘         └──────────────────┘         └─────────────┘
```

- **前端**: `js/edge-tts.js` - 处理UI交互和音频播放
- **代理**: Cloudflare Worker - 处理Edge TTS API调用
- **服务**: Microsoft Edge TTS - 提供高质量神经语音

## 部署步骤

### 1. 部署 Cloudflare Worker

```bash
# 进入worker目录
cd edge-tts-worker

# 安装依赖（如果需要）
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 部署
wrangler deploy
```

部署成功后，会显示类似以下的URL：
```
https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev
```

### 2. 配置前端

在 `blog.html` 和 `favorites.html` 中，修改Worker URL：

```html
<script>
    // 修改为你的实际Worker URL
    window.EDGE_TTS_WORKER_URL = 'https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts';
</script>
```

### 3. 测试功能

1. 访问博客页面
2. 点击右侧的 🎧 按钮
3. 应该听到高质量的文章朗读

## API 接口说明

### Worker 端点

```
POST https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts
```

### 请求格式

```json
{
  "text": "要转换的文本",
  "voice": "zh-CN-YunyangNeural",
  "rate": "+0%"
}
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | string | 必填 | 要转换为语音的文本 |
| voice | string | zh-CN-YunyangNeural | 语音名称 |
| rate | string | +0% | 语速调整（-50%到+100%） |

### 响应

返回 `audio/mpeg` 格式的音频流。

## 可用语音列表

### 中文语音

| 语音名称 | 性别 | 特点 |
|---------|------|------|
| zh-CN-YunyangNeural | 男 | 稳重、专业（当前使用） |
| zh-CN-XiaoxiaoNeural | 女 | 清新、自然 |
| zh-CN-XiaoyiNeural | 女 | 温柔、亲和 |
| zh-CN-YunxiNeural | 男 | 专业、清晰 |

### 其他语言

Edge TTS 支持 100+ 种语言和方言，详见 [Edge-TTS 文档](https://github.com/rany2/edge-tts)。

## 费用说明

### Cloudflare Workers 免费计划

- ✅ 每天 100,000 次请求
- ✅ 完全免费，无需绑定信用卡
- ✅ 全球CDN加速

### Edge TTS API

- ✅ 完全免费
- ✅ 无请求次数限制
- ✅ 高质量神经语音

## 故障排除

### 1. 没有声音

**检查**:
- 浏览器控制台是否有错误
- Worker URL 是否正确配置
- Cloudflare Worker 是否正常运行

**解决**:
- 系统会自动回退到浏览器原生TTS
- 检查网络连接

### 2. CORS 错误

**原因**: Worker 没有正确返回 CORS 头

**解决**: 检查 `worker.js` 中的 CORS 配置

### 3. 音频质量差

**尝试**:
- 调整 `rate` 参数
- 更换 `voice` 参数
- 检查文本格式（移除特殊字符）

### 4. 部分段落不播放

**原因**: 文本分段有问题或网络中断

**解决**:
- 检查文本提取逻辑
- 增加重试机制

## 性能优化

### 文本分段

- 长文本自动分段（每段约500字）
- 逐段生成音频，减少等待时间
- 自动跳过代码块和无意义内容

### 缓存策略

- Worker 返回 `Cache-Control` 头
- 相同文本可复用音频（1小时）

### 播放体验

- 支持暂停/恢复
- 显示当前播放状态
- 自动处理播放完成事件

## 开发说明

### 修改语音

在 `js/edge-tts.js` 中修改：

```javascript
this.voice = 'zh-CN-XiaoxiaoNeural'; // 改为女声
this.rate = '+10%'; // 稍微加快语速
```

### 添加新功能

Edge-TTS 支持的参数：
- `pitch`: 音调调整
- `volume`: 音量调整
- `emphasis`: 强调某个词

详见 [Microsoft Speech API 文档](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-synthesis-markup)。

## 后续改进

- [ ] 支持语音切换（用户可选择不同语音）
- [ ] 添加语速调节滑块
- [ ] 支持下载音频文件
- [ ] 添加播放进度条
- [ ] 支持跳转到指定段落

## 相关资源

- [Edge-TTS GitHub](https://github.com/rany2/edge-tts)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Web Speech API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
