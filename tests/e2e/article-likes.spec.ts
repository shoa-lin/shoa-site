import { expect, test, type Page } from "@playwright/test";

const articlePath = "/blog/getting-started-with-loops";
const slug = "getting-started-with-loops";

// The likes button only exists when the build had PUBLIC_VISIT_API_URL set
// (CI injects the real Worker URL; local verify sets a dummy one). Without it
// there is nothing to test, so these cases skip instead of going red.
test.skip(!process.env.PUBLIC_VISIT_API_URL, "PUBLIC_VISIT_API_URL is not set; article pages render no likes button");

// Every likes request is mocked regardless of host, so no test ever touches production.
function mockLikes(page: Page, getCount: number, post: { likes: number; counted: boolean; duplicate?: boolean }) {
  return page.route("**/likes/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, slug, ...post }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, slug, likes: getCount }),
    });
  });
}

test("article like button shows the count, records one like, and remembers it", async ({ page }) => {
  await mockLikes(page, 41, { likes: 42, counted: true });
  await page.goto(articlePath);

  const button = page.locator("[data-likes-button]");
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toContainText("点赞");
  await expect(button).toContainText("41");
  await expect(button).toHaveAccessibleName(/点赞\s*41/);

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toContainText("已赞");
  await expect(button).toContainText("42");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), `shoa-liked:${slug}`)).toBe("1");

  await page.reload();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toContainText("已赞");
  await expect(button).toContainText("41");
});

test("an uncounted like is not recorded and the button stays active", async ({ page }) => {
  await mockLikes(page, 7, { likes: 7, counted: false });
  await page.goto(articlePath);

  const button = page.locator("[data-likes-button]");
  await expect(button).toContainText("7");

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/likes/")),
    button.click(),
  ]);
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toContainText("点赞");
  expect(await page.evaluate((key) => localStorage.getItem(key), `shoa-liked:${slug}`)).toBeNull();
});

test("a duplicate like (already liked within 24h) shows the liked state with the server count", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockLikes(page, 12, { likes: 13, counted: false, duplicate: true });
  await page.goto(articlePath);

  const button = page.locator("[data-likes-button]");
  await expect(button).toContainText("12");

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toContainText("已赞");
  await expect(button).toContainText("13");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), `shoa-liked:${slug}`)).toBe("1");
  expect(errors).toEqual([]);
});

test("the like button stays hidden and quiet when the count cannot be loaded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/likes/**", (route) => route.abort());
  await page.goto(articlePath);

  await expect(page.locator("[data-likes-slug]")).toBeHidden();
  await page.waitForTimeout(300);
  await expect(page.locator("[data-likes-slug]")).toBeHidden();
  expect(errors).toEqual([]);
});
