import { expect, test } from "@playwright/test";

test("the footer RSS link leads to the subscribe page, whose copy button copies the feed address", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await page.locator(".site-footer__rss").click();
  await expect(page).toHaveURL(/\/subscribe\/?$/);
  const address = (await page.locator("[data-feed-url]").innerText()).trim();
  expect(address).toBe("https://www.bydziwen.top/rss.xml");
  await page.locator("[data-copy-feed]").click();
  await expect(page.locator('[data-copy-status="subscribe-feed-url"]')).toHaveText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);

  // The prompt for the reader's own agent carries the same address.
  await page.locator("[data-copy-prompt]").click();
  await expect(page.locator('[data-copy-status="subscribe-agent-prompt"]')).toHaveText("已复制");
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain(address);
  expect(prompt).toContain("guid");
  // The feed itself is served from the same site.
  const response = await page.request.get("/rss.xml");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<rss version=\"2.0\"");
});

test("each language's subscribe page offers that language's feed", async ({ page }) => {
  await page.goto("/ja/subscribe");
  await expect(page.locator("[data-feed-url]")).toHaveText("https://www.bydziwen.top/ja/rss.xml");
  await expect(page.locator("h1")).toHaveText("購読");
});
