import { expect, test } from '@playwright/test';

const routes = ['/comics/', '/comics/gpt-6-astra/', '/comics/gpt-6-astra/en/', '/comics/gpt-6-astra/ja/', '/comics/gpt-6-astra/ko/'];

for (const route of routes) {
  test(`comic mobile navigation is compact and interactive: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const header = page.locator('header.site-header');
    const trigger = header.getByRole('button', { includeHidden: true });
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAccessibleName('打开导航');
    const box = await header.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
    expect(box!.width).toBe(390);
    expect(box!.height).toBe(68);
    // A CSS-generated hamburger has no hit target: forbid the original duplicate.
    const fakeIcon = await header.locator(':scope > div').evaluate(el => getComputedStyle(el, '::after').content);
    expect(['none', 'normal', '""']).toContain(fakeIcon);
    const brand = header.getByRole('link', { name: 'Shoa Lin' });
    const brandBox = await brand.boundingBox();
    expect(brandBox!.height).toBeGreaterThanOrEqual(44);
    const textHeight = await brand.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().height; });
    expect(textHeight).toBeLessThan(30);
    expect(await brand.evaluate(el => document.elementFromPoint(el.getBoundingClientRect().x + 5, el.getBoundingClientRect().y + 5)?.closest('a') === el)).toBe(true);
    const panel = page.getByRole('navigation', { name: '移动端导航' });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    const menuBox = await panel.boundingBox();
    expect(menuBox!.width).toBeLessThanOrEqual(260);
    expect(menuBox!.height).toBeLessThanOrEqual(330);
    expect(menuBox!.y).toBeGreaterThanOrEqual(68);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390);
    await expect(panel.getByRole('link', { name: '漫画', exact: true })).toHaveAttribute('aria-current', 'page');
    await trigger.click();
    await expect(panel).toBeHidden();
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(10, 420);
    await expect(panel).toBeHidden();
    await trigger.click();
    await panel.getByRole('link', { name: '关于', exact: true }).click();
    await expect(page).toHaveURL(/\/about\/?$/);
  });
}

test('comic header matches ordinary pages across mobile sizes and survives resize', async ({ page }) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/blog/');
    const reference = await page.locator('.site-header').boundingBox();
    for (const route of ['/comics/', '/comics/gpt-6-astra/']) {
      await page.goto(route);
      const header = page.locator('header.site-header');
      const box = await header.boundingBox();
      expect(box!.height).toBe(reference!.height);
      expect(box!.x).toBe(reference!.x);
      expect(box!.width).toBe(reference!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const trigger = header.getByRole('button', { includeHidden: true });
      await trigger.click();
      const panel = page.getByRole('navigation', { name: '移动端导航' });
      await expect(panel).toBeVisible();
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(panel).toBeHidden();
      await expect(trigger).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(header.getByRole('navigation', { name: '主要导航' }).getByRole('link', { name: '漫画', exact: true })).toBeVisible();
      await page.setViewportSize({ width, height: 844 });
      await expect(panel).toBeHidden();
    }
  }
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true });
  test('every compact menu item can be tapped without covering the whole page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [label, path] of [['首页', '/'], ['关于', '/about'], ['文章', '/blog'], ['漫画', '/comics'], ['美食', '/food'], ['收藏', '/favorites'], ['联系', '/contact']]) {
      await page.goto('/comics/');
      const toggle = page.getByRole('button', { name: '打开导航' });
      await toggle.tap();
      const menu = page.getByRole('navigation', { name: '移动端导航' });
      await expect(menu.getByRole('link')).toHaveCount(7);
      await expect(page.locator('body')).not.toHaveClass(/nav-open/);
      await menu.getByRole('link', { name: label, exact: true }).tap();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/' : path + '/?'}$`));
    }
    await page.goto('/comics/');
    await page.getByRole('button', { name: '打开导航' }).tap();
    await page.touchscreen.tap(10, 420);
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeHidden();
  });
});
