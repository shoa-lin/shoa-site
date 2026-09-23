// Public base URL of the site-visits Cloudflare Worker (see workers/site-visits/README.md).
// When unset, the footer view counter is not rendered and no requests are made.
export const visitApiUrl = (import.meta.env.PUBLIC_VISIT_API_URL ?? "").trim().replace(/\/+$/, "");
