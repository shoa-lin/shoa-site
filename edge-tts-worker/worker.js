/**
 * Edge-TTS Cloudflare Worker
 * 免费的Edge TTS代理服务
 * 部署到Cloudflare Workers后，前端可直接调用此API
 */

const EDGE_TTS_WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

// 生成SSML格式的TTS请求
function generateSSML(text, voice = 'zh-CN-YunyangNeural', rate = '+0%') {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${voice}">
      <prosody rate="${rate}">
        ${text}
      </prosody>
    </voice>
  </speak>`;
}

// 处理CORS预检请求
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// 主请求处理
export default {
  async fetch(request, env, ctx) {
    // 处理CORS预检
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // 只支持POST请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { text, voice = 'zh-CN-YunyangNeural', rate = '+0%' } = await request.json();

      if (!text) {
        return new Response('Missing text parameter', { status: 400 });
      }

      // 生成SSML
      const ssml = generateSSML(text, voice, rate);

      // 使用WebSocket连接到Edge TTS
      const audioData = await fetchEdgeTTSAudio(ssml);

      // 返回音频流
      return new Response(audioData, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });

    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};

// 通过WebSocket获取Edge TTS音频
async function fetchEdgeTTSAudio(ssml) {
  return new Promise((resolve, reject) => {
    // 使用Connect API建立WebSocket连接
    const wsUrl = `${EDGE_TTS_WS_URL}?TrustedClientToken=${TRUSTED_TOKEN}`;

    // Cloudflare Workers使用WebSocket客户端
    const ws = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
        'Sec-MS-GEF': 'trusted-client',
      },
    });

    let audioChunks = [];
    let receivedData = false;

    ws.onopen = () => {
      // 发送SSML请求
      const message = `X-Timestamp:${Date.now()}\r\nContent-Type:application/ssml+xml\r\n\r\n${ssml}`;
      ws.send(message);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // 收到音频数据
        const chunk = new Uint8Array(event.data);
        audioChunks.push(chunk);
        receivedData = true;
      } else {
        // 文本消息，可能是控制消息
        const text = new TextDecoder().decode(event.data);
        if (text.includes('turn.end')) {
          // 音频传输完成
          ws.close();
        }
      }
    };

    ws.onerror = (error) => {
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      if (receivedData && audioChunks.length > 0) {
        // 合并所有音频块
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedArray = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          combinedArray.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(combinedArray.buffer);
      } else {
        reject(new Error('No audio data received'));
      }
    };

    // 设置超时
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}
