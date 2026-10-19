// Reader likes on articles: load the count, then let the visitor add exactly one.
// Same fail-quiet contract as visit-counter.ts — any failure keeps the button hidden.

const likedKeyPrefix = "shoa-liked:";

function isStored(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    // Storage blocked (private mode): the button still works, it just forgets.
    return false;
  }
}

function rememberLike(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Same as above — forgetting silently beats breaking the click.
  }
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as { likes?: unknown; counted?: unknown } | null;
  } catch {
    return null;
  }
}

function readCount(payload: { likes?: unknown } | null) {
  if (payload === null) return null;
  const { likes } = payload;
  return typeof likes === "number" && Number.isSafeInteger(likes) && likes >= 0 ? likes : null;
}

export function initArticleLikes(root: ParentNode = document) {
  const container = root.querySelector<HTMLElement>("[data-likes-slug]");
  const button = container?.querySelector<HTMLButtonElement>("[data-likes-button]");
  const label = container?.querySelector<HTMLElement>("[data-likes-label]");
  const count = container?.querySelector<HTMLElement>("[data-likes-count]");
  const apiUrl = container?.dataset.likesApi;
  const slug = container?.dataset.likesSlug;
  if (!container || !button || !label || !count || !apiUrl || !slug) return;

  const likedKey = `${likedKeyPrefix}${slug}`;
  const likesUrl = `${apiUrl}/likes/${encodeURIComponent(slug)}`;
  const format = new Intl.NumberFormat(document.documentElement.lang || undefined);

  let likes = 0;
  let liked = false;
  let pending = false;

  const render = () => {
    const wording = liked ? container.dataset.labelLiked : container.dataset.labelLike;
    // The visible text ("点赞 41") is the accessible name, so screen readers hear the count too.
    if (wording) label.textContent = wording;
    button.setAttribute("aria-pressed", liked ? "true" : "false");
    count.textContent = format.format(likes);
  };

  button.addEventListener("click", async () => {
    if (liked || pending) return;
    pending = true;
    try {
      // 429 bodies still carry the current count, so parse before checking ok.
      const payload = await readJson(await fetch(likesUrl, { method: "POST", keepalive: true }));
      const next = readCount(payload);
      if (next !== null) likes = next;
      // Trust the server: only counted:true is recorded as liked. Anything
      // else (rate limited, quota skipped) leaves the button clickable.
      if (payload?.counted === true) {
        liked = true;
        rememberLike(likedKey);
      }
      render();
    } catch {
      // Network error: keep the current number and state untouched.
    } finally {
      pending = false;
    }
  });

  void (async () => {
    try {
      const response = await fetch(likesUrl);
      if (!response.ok) return;
      const initial = readCount(await readJson(response));
      if (initial === null) return;
      likes = initial;
      liked = isStored(likedKey);
      render();
      container.hidden = false;
    } catch {
      // Fail quiet: the container stays hidden and the page is untouched.
    }
  })();
}
