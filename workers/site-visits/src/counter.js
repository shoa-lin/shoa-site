// Pure helpers for the counter Worker. Kept out of index.js because Workers treat
// every named export of the entry module as a handler.

export const TOTAL_KEY = "site:pv";

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests/i;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(origin, allowedOrigins = "") {
  if (!origin) return false;
  if (LOCAL_ORIGIN.test(origin)) return true;
  return allowedOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

export function isBot(userAgent) {
  return !userAgent || BOT_PATTERN.test(userAgent);
}
