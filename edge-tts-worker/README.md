# Edge-TTS Cloudflare Worker 部署指南

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 部署 Worker

```bash
cd edge-tts-worker
wrangler deploy
```

### 4. 获取 Worker URL

部署成功后，会显示类似的URL：
```
https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev
```

## API 使用说明

### 端点

```
POST https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts
```

### 请求格式

```json
{
  "text": "要转换的文本内容",
  "voice": "zh-CN-YunyangNeural",
  "rate": "+0%"
}
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | string | 必填 | 要转换为语音的文本 |
| voice | string | zh-CN-YunyangNeural | 语音名称 |
| rate | string | +0% | 语速调整，范围-50%到+100% |

### 可用的中文语音

- `zh-CN-YunyangNeural` - 男声，稳重（推荐）
- `zh-CN-XiaoxiaoNeural` - 女声，清新
- `zh-CN-XiaoyiNeural` - 女声，温柔
- `zh-CN-YunxiNeural` - 男声，专业

### 响应

返回 audio/mpeg 格式的音频流，可直接播放。

## 示例代码

```javascript
const response = await fetch('https://edge-tts-proxy.YOUR_ACCOUNT.workers.dev/tts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '你好，这是一段测试文本。',
    voice: 'zh-CN-YunyangNeural',
    rate: '+0%'
  })
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

## 免费额度

Cloudflare Workers 免费计划：
- 每天 100,000 次请求
- 完全免费，无需绑定信用卡
- 全球CDN加速

## 故障排除

1. **CORS 错误**: 确保Worker返回了正确的CORS头
2. **连接超时**: 检查网络连接和Edge TTS服务可用性
3. **音频质量问题**: 尝试调整rate参数或更换voice
