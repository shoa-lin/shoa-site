// Counts one page view per tab session per pathname, then shows the site-wide total.
// Refreshing the same page in the same tab is not recounted; navigating to another page is.

const sessionKeyPrefix = "shoa-visit:";

function alreadyCounted(key: string) {
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage unavailable (private mode, blocked): count every load.
  }
  return false;
}

async function requestTotal(apiUrl: string, count: boolean) {
  const response = count
    ? await fetch(`${apiUrl}/hit`, { method: "POST", keepalive: true })
    : await fetch(`${apiUrl}/total`);
  if (!response.ok) throw new Error(`visit counter HTTP ${response.status}`);
  const { total } = (await response.json()) as { total?: unknown };
  if (typeof total !== "number" || !Number.isFinite(total)) throw new Error("visit counter: bad total");
  return total;
}

export async function initVisitCounter() {
  const container = document.querySelector<HTMLElement>("[data-visit-counter]");
  const output = container?.querySelector<HTMLElement>("[data-visit-total]");
  const apiUrl = container?.dataset.visitApi;
  if (!container || !output || !apiUrl) return;

  // Automated browsers (Playwright, Lighthouse) never increment the counter.
  const count = !navigator.webdriver && !alreadyCounted(`${sessionKeyPrefix}${location.pathname}`);

  try {
    const total = await requestTotal(apiUrl, count);
    output.textContent = new Intl.NumberFormat(document.documentElement.lang || undefined).format(total);
    container.hidden = false;
  } catch {
    // Fail open: keep the counter hidden and leave the page untouched.
  }
}
