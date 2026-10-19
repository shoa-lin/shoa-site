// Pure helpers for the counter Worker. Kept out of index.js because Workers treat
// every named export of the entry module as a handler.

export const TOTAL_KEY = "site:pv";
export const LIKES_PREFIX = "likes:";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

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

// Slugs become part of a KV key, so anything outside the translationKey charset
// (lowercase letters, digits, dashes) is rejected before touching KV.
export function isValidSlug(slug) {
  return SLUG_PATTERN.test(slug);
}

export function likesKey(slug) {
  return `${LIKES_PREFIX}${slug}`;
}

// Returns the percent-decoded segment after "/likes/", or null when the path is
// not a likes path at all. Undecodable sequences fall back to the raw text,
// which then fails isValidSlug and yields a 400.
export function parseLikesPath(pathname) {
  const match = pathname.match(/^\/likes\/(.*)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
