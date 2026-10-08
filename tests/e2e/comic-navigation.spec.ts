import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const locales = ['zh', 'en', 'ja', 'ko', 'th', 'fr', 'de', 'vi'] as const;
type Locale = (typeof locales)[number];
const prefix = (locale: Locale) => (locale === 'zh' ? '' : `/${locale}`);
const editionPath = (locale: Locale) => `${prefix(locale)}/comics/gpt-6-astra/`;

// The comic header and footer speak the edition's language, taken from the site dictionaries.
function shellCopy(locale: Locale) {
  const dictionary = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', `${locale}.json`), 'utf8'));
  return {
    open: dictionary.a11y.menuOpen as string,
    close: dictionary.a11y.menuClose as string,
    main: dictionary.a11y.mainNavigation as string,
    mobile: dictionary.a11y.mobileNavigation as string,
    comics: dictionary.nav.comics as string,
    about: dictionary.nav.about as string,
    back: dictionary.comics.backToList as string,
    languageMenu: dictionary.language.menu as string,
  };
}

for (const locale of locales) {
  test(`${locale} comic edition: compact header, mobile menu and footer`, async ({ page }) => {
    const copy = shellCopy(locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(editionPath(locale));

    const bar = page.locator('shoa-comic-header header.bar');
    const box = await bar.boundingBox();
    expect(box).toMatchObject({ x: 0, y: 0, width: 390, height: 68 });
    const brand = page.locator('shoa-comic-header').getByRole('link', { name: 'Shoa Lin' });
    expect((await brand.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    const trigger = page.locator('shoa-comic-header [data-toggle]');
    const panel = page.getByRole('navigation', { name: copy.mobile });
    await expect(trigger).toHaveAccessibleName(copy.open);
    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAccessibleName(copy.close);
    await expect(panel).toBeVisible();
    const menuBox = (await panel.boundingBox())!;
    expect(menuBox.y).toBeGreaterThanOrEqual(68);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
    expect(menuBox.width).toBeLessThanOrEqual(260);
    await expect(panel.getByRole('link')).toHaveCount(7);
    await expect(panel.getByRole('link', { name: copy.comics, exact: true })).toHaveAttribute('aria-current', 'page');

    await page.mouse.click(10, 420);
    await expect(panel).toBeHidden();
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    const footer = page.locator('shoa-comic-footer footer.foot');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toHaveCSS('background-color', 'rgb(247, 248, 250)');
    await expect(footer.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:shoa_lin@outlook.com');
    await expect(footer.getByRole('link', { name: copy.back })).toHaveAttribute('href', `${prefix(locale)}/comics`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    await page.evaluate(() => window.scrollTo(0, 0));
    await trigger.click();
    await panel.getByRole('link', { name: copy.about, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix(locale)}/about/?$`));
  });
}

test('desktop comic header shows the site navigation and switches editions', async ({ page }) => {
  const copy = shellCopy('zh');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(editionPath('zh'));

  const nav = page.getByRole('navigation', { name: copy.main });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: copy.comics, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: copy.open })).toBeHidden();

  const summary = page.locator('shoa-comic-header .lang summary');
  await expect(summary).toHaveAttribute('aria-label', copy.languageMenu);
  await summary.click();
  const options = page.locator('shoa-comic-header .popover a');
  await expect(options).toHaveCount(locales.length);
  await expect(options.filter({ hasText: '简体中文' })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.locator('shoa-comic-header .popover')).toBeHidden();

  await summary.click();
  await options.filter({ hasText: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/comics\/gpt-6-astra\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('shoa-locale'))).toBe('en');
});

test('comic header matches ordinary pages across sizes and survives resize', async ({ page }) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/blog/');
    const reference = (await page.locator('.site-header').boundingBox())!;
    const referenceBrand = (await page.locator('.site-brand').boundingBox())!;
    await page.goto(editionPath('zh'));
    const bar = (await page.locator('shoa-comic-header header.bar').boundingBox())!;
    const brand = (await page.locator('shoa-comic-header .brand').boundingBox())!;
    expect(bar.height).toBe(reference.height);
    expect(bar.width).toBe(reference.width);
    expect(Math.round(brand.x)).toBe(Math.round(referenceBrand.x));

    const trigger = page.locator('shoa-comic-header [data-toggle]');
    await expect(trigger).toHaveAccessibleName(shellCopy('zh').open);
    await trigger.click();
    const panel = page.getByRole('navigation', { name: shellCopy('zh').mobile });
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(panel).toBeHidden();
    await expect(trigger).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width, height: 844 });
    await expect(panel).toBeHidden();
  }
});

test('comic pages load only self-hosted fonts', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(?:googleapis|gstatic)\.com/.test(request.url())) external.push(request.url());
  });
  await page.goto(editionPath('zh'));
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, ''));
  });
  expect(external).toEqual([]);
  expect(loaded).toEqual(expect.arrayContaining(['Bangers', 'ZCOOL KuaiLe']));
});

test('comic CSS cannot restyle the site header and footer', async ({ page }) => {
  await page.goto(editionPath('zh'));
  // The comic styles `footer` globally (dark background); the site footer must keep its own look.
  await expect(page.locator('body > footer').first()).not.toHaveCSS('background-color', 'rgb(247, 248, 250)');
  await expect(page.locator('shoa-comic-footer footer.foot')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
  await expect(page.locator('shoa-comic-header .brand')).toHaveCSS('font-weight', '700');
  await expect(page.locator('shoa-comic-header .brand')).toHaveCSS('color', 'rgb(24, 26, 31)');
});

test('comic header and footer have no serious accessibility violations', async ({ page }) => {
  await page.goto(editionPath('zh'));
  const results = await new AxeBuilder({ page }).include('shoa-comic-header').include('shoa-comic-footer').analyze();
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test('comic lists link every card to a working edition with its cover', async ({ page }) => {
  for (const locale of ['zh', 'en'] as const) {
    await page.goto(`${prefix(locale)}/comics/`);
    const cards = page.locator('.comic-card');
    await expect(cards).not.toHaveCount(0);
    const cover = cards.first().locator('img');
    await expect(cover).toHaveJSProperty('complete', true);
    expect(await cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await cards.first().getByRole('heading').getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`${prefix(locale)}/comics/gpt-6-astra/?$`));
    await expect(page.locator('shoa-comic-header header.bar')).toBeVisible();
  }
});

test('old comic edition URLs redirect to the new addresses', async ({ page }) => {
  await page.goto('/comics/gpt-6-astra/ko/');
  await expect(page).toHaveURL(/\/ko\/comics\/gpt-6-astra\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true });
  test('comic menu items can be tapped', async ({ page }) => {
    const copy = shellCopy('zh');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(editionPath('zh'));
    await page.getByRole('button', { name: copy.open }).tap();
    const menu = page.getByRole('navigation', { name: copy.mobile });
    await expect(menu.getByRole('link')).toHaveCount(7);
    await menu.getByRole('link', { name: copy.comics, exact: true }).tap();
    await expect(page).toHaveURL(/\/comics\/?$/);
    await expect(page.locator('h1')).toHaveText(copy.comics);
  });
});
