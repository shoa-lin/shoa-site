// Small HTTP helpers for the AI map collectors: one User-Agent, timeouts, retries, no third-party deps.
const USER_AGENT = "shoa-site-ai-map/1.0 (+https://www.bydziwen.top; shoa_lin@outlook.com)";

export async function request(url, { headers = {}, retries = 2, timeoutMs = 60_000, accept } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, ...(accept ? { Accept: accept } : {}), ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status} for ${url}`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const error = new Error(`HTTP ${response.status} for ${url}: ${body.slice(0, 200)}`);
        error.status = response.status;
        throw error;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (error.status && error.status < 500 && error.status !== 429) throw error;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function fetchJson(url, options = {}) {
  const response = await request(url, { accept: "application/json", ...options });
  return response.json();
}

export async function fetchText(url, options = {}) {
  const response = await request(url, options);
  return response.text();
}

export async function fetchBuffer(url, options = {}) {
  const response = await request(url, options);
  return Buffer.from(await response.arrayBuffer());
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
