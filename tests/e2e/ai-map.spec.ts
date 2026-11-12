import { expect, test } from "@playwright/test";

test("AI map lists curated entries and opens a sourced detail panel", async ({ page }) => {
  await page.goto("/ai-map/");
  await expect(page.locator("h1")).toHaveText("AI 产业地图");
  await expect(page.locator(".ai-layer")).toHaveCount(4);
  await expect(page.locator(".ai-cell")).toHaveCount(17);
  expect(await page.locator("[data-ai-chip]").count()).toBeGreaterThan(40);

  const chip = page.locator('[data-ai-chip="nvidia"]');
  await chip.click();
  const panel = page.locator("#ai-entry-nvidia");
  await expect(panel).toBeVisible();
  const facts = panel.locator(".ai-fact");
  expect(await facts.count()).toBeGreaterThan(0);
  for (const link of await panel.locator(".ai-fact__meta a").all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\//);
  }
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("AI map includes the November 2026 additions with sourced facts", async ({ page }) => {
  await page.goto("/ai-map/");
  const codingCell = page.locator(".ai-cell", { has: page.locator('[data-ai-chip="claude-code"]') });
  await expect(codingCell.locator('[data-ai-chip="hermes-agent"]')).toHaveCount(1);
  const enterpriseCell = page.locator(".ai-cell", { has: page.locator('[data-ai-chip="ragflow"]') });
  await expect(enterpriseCell.locator('[data-ai-chip="workbuddy"]')).toHaveCount(1);

  await page.locator('[data-ai-chip="workbuddy"]').click();
  const panel = page.locator("#ai-entry-workbuddy");
  await expect(panel).toBeVisible();
  await expect(panel.locator(".ai-fact")).toHaveCount(3);
  for (const link of await panel.locator(".ai-fact__meta a").all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\//);
  }
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("AI map is usable on a phone without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/ai-map/");
  await expect(page.locator("h1")).toHaveText("AI Industry Map");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('[data-ai-chip="deepseek"]').click();
  const panel = page.locator("#ai-entry-deepseek");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toBeHidden();
});

test("locales without curated copy fall back to English content", async ({ page }) => {
  await page.goto("/ja/ai-map/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("[data-ai-map]")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText("AI Industry Map");
});
