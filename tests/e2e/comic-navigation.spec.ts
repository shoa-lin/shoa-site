import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const locales = ['zh', 'en', 'ja', 'ko', 'th', 'fr', 'de', 'vi'] as const;
type Locale = (typeof locales)[number];
const prefix = (locale: Locale) => (locale === 'zh' ? '' : `/${locale}`);
const comicsRoot = join(process.cwd(), 'src', 'comics');

// Every published comic, read from src/comics, so each new comic is smoke-tested automatically.
const comics = readdirSync(comicsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(comicsRoot, entry.name, 'comic.json')))
  .map((entry) => ({ id: entry.name, meta: JSON.parse(readFileSync(join(comicsRoot, entry.name, 'comic.json'), 'utf8')) }))
  .filter(({ meta }) => !meta.draft)
  .sort((left, right) => right.meta.publishedAt.localeCompare(left.meta.publishedAt));
const editionsOf = (comic: (typeof comics)[number]) => locales.filter((locale) => comic.meta.editions[locale]);
// The comic with the most editions exercises the language menu and every localized header.
const fixture = [...comics].sort((left, right) => editionsOf(right).length - editionsOf(left).length)[0]!;
const editionPath = (locale: Locale, id = fixture.id) => `${prefix(locale)}/comics/${id}/`;
const fixtureLocale: Locale = editionsOf(fixture).includes('zh') ? 'zh' : fixture.meta.sourceLocale;

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
    skip: dictionary.a11y.skip as string,
  };
}

// Icon fonts (Material Icons / Symbols) are the one kind of font comics still load from Google.
function isIconFontRequest(url: string): boolean {
  const parsed = new URL(url);
  if (parsed.hostname === 'fonts.gstatic.com') return /^\/s\/material(?:icons|symbols)/i.test(parsed.pathname);
  if (parsed.pathname === '/icon') return true;
  const families = parsed.searchParams.getAll('family').map((value) => value.split(':')[0]!.trim());
  return families.length > 0 && families.every((family) => /^Material (?:Icons|Symbols)\b/i.test(family));
}

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('request', (request) => {
    const url = request.url();
    if (/fonts\.(?:googleapis|gstatic)\.com/.test(url) && !isIconFontRequest(url)) problems.push(`google: ${url}`);
  });
  return problems;
}

for (const locale of editionsOf(fixture)) {
  test(`${locale} comic edition: compact header, mobile menu and footer`, async ({ page }) => {
    const copy = shellCopy(locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(editionPath(locale));

    expect(await page.locator('shoa-comic-header header.bar').boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 68 });
    expect((await page.locator('shoa-comic-header .brand').boundingBox())!.height).toBeGreaterThanOrEqual(44);

    const trigger = page.locator('shoa-comic-header [data-toggle]');
    const panel = page.getByRole('navigation', { name: copy.mobile });
    await expect(trigger).toHaveAccessibleName(copy.open);
    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAccessibleName(copy.close);
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
  const copy = shellCopy(fixtureLocale);
  const target = editionsOf(fixture).find((locale) => locale !== fixtureLocale);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(editionPath(fixtureLocale));

  const nav = page.getByRole('navigation', { name: copy.main });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: copy.comics, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('shoa-comic-header [data-toggle]')).toBeHidden();
  test.skip(!target, 'the fixture comic has a single edition');

  const summary = page.locator('shoa-comic-header .lang summary');
  await summary.click();
  const options = page.locator('shoa-comic-header .popover a');
  await expect(options).toHaveCount(editionsOf(fixture).length);
  await page.keyboard.press('Escape');
  await expect(page.locator('shoa-comic-header .popover')).toBeHidden();

  await summary.click();
  await page.locator(`shoa-comic-header .popover a[data-locale="${target}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${prefix(target!)}/comics/${fixture.id}/?$`));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('shoa-locale'))).toBe(target);
});

test('comic header matches ordinary pages across sizes and survives resize', async ({ page }) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${prefix(fixtureLocale)}/blog/`);
    const reference = (await page.locator('.site-header').boundingBox())!;
    const referenceBrand = (await page.locator('.site-brand').boundingBox())!;
    await page.goto(editionPath(fixtureLocale));
    const bar = (await page.locator('shoa-comic-header header.bar').boundingBox())!;
    const brand = (await page.locator('shoa-comic-header .brand').boundingBox())!;
    expect(bar.height).toBe(reference.height);
    expect(bar.width).toBe(reference.width);
    expect(Math.round(brand.x)).toBe(Math.round(referenceBrand.x));

    const trigger = page.locator('shoa-comic-header [data-toggle]');
    await trigger.click();
    const panel = page.getByRole('navigation', { name: shellCopy(fixtureLocale).mobile });
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(panel).toBeHidden();
    await expect(trigger).toBeHidden();
    await page.setViewportSize({ width, height: 844 });
    await expect(panel).toBeHidden();
  }
});

test('desktop headers fit just above the mobile breakpoint in every language', async ({ page }) => {
  for (const width of [861, 900, 960, 1023]) {
    await page.setViewportSize({ width, height: 800 });
    for (const locale of locales) {
      await page.goto(`${prefix(locale)}/blog/`);
      const site = await page.evaluate(() => {
        const nav = document.querySelector('.desktop-nav')!.getBoundingClientRect();
        const tools = document.querySelector('.site-header__tools')!.getBoundingClientRect();
        return { gap: tools.left - nav.right, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(site.gap, `${locale} site header at ${width}px`).toBeGreaterThanOrEqual(8);
      expect(site.overflow, `${locale} site page at ${width}px`).toBeLessThanOrEqual(1);
      if (!editionsOf(fixture).includes(locale)) continue;
      await page.goto(editionPath(locale));
      const comic = await page.evaluate(() => {
        const root = document.querySelector('shoa-comic-header')!.shadowRoot!;
        const nav = root.querySelector('.nav')!.getBoundingClientRect();
        const tools = root.querySelector('.tools')!.getBoundingClientRect();
        return { gap: tools.left - nav.right, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(comic.gap, `${locale} comic header at ${width}px`).toBeGreaterThanOrEqual(8);
      expect(comic.overflow, `${locale} comic page at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test('the skip link is hidden until focused and jumps past the site header', async ({ page }) => {
  await page.goto(editionPath(fixtureLocale));
  const skip = page.locator('shoa-comic-header .skip');
  expect((await skip.boundingBox())!.width).toBeLessThanOrEqual(1);
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveText(shellCopy(fixtureLocale).skip);
  expect((await skip.boundingBox())!.width).toBeGreaterThan(40);
  await page.keyboard.press('Enter');
  await expect(page.locator('#shoa-comic-content')).toBeFocused();
});

test('comic pages load only self-hosted fonts', async ({ page }) => {
  const problems = collectProblems(page);
  const cssPath = join(comicsRoot, fixture.id, 'fonts', `${fixtureLocale}.css`);
  const manifest = existsSync(cssPath) ? /comic-fonts (\{.*?\}) \*\//.exec(readFileSync(cssPath, 'utf8'))?.[1] : undefined;
  const selfHosted: string[] = manifest ? JSON.parse(manifest).selfHosted : [];
  await page.goto(editionPath(fixtureLocale));
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, ''));
  });
  expect(problems).toEqual([]);
  expect(loaded).toEqual(expect.arrayContaining(selfHosted));
});

test('comic CSS cannot restyle the site header and footer', async ({ page }) => {
  await page.goto(editionPath(fixtureLocale));
  const dark = (await page.locator('shoa-comic-footer').getAttribute('data-theme')) === 'dark';
  await expect(page.locator('shoa-comic-footer footer.foot')).toHaveCSS('background-color', dark ? 'rgb(17, 19, 23)' : 'rgb(247, 248, 250)');
  await expect(page.locator('shoa-comic-header .brand')).toHaveCSS('font-weight', '700');
  await expect(page.locator('shoa-comic-header .brand')).toHaveCSS('font-size', '16px');
  // The header and footer sit beside <body>, so body-level layout rules cannot reach them.
  expect(await page.evaluate(() => [...document.documentElement.children].map((element) => element.localName)))
    .toEqual(['head', 'shoa-comic-header', 'shoa-comic-anchor', 'body', 'shoa-comic-footer']);
});

// Rules an author might plausibly write, aimed at everything the site adds around the comic.
const hostileCss = `
:root { font-size: 62.5%; }
* { margin: 0; padding: 0; box-sizing: content-box; font-size: 1.4rem !important; line-height: 2.6 !important; letter-spacing: .2em !important;
  font-family: Georgia, serif !important; color: #c0f !important; text-transform: uppercase !important; word-break: break-all !important; }
html, body { height: 100%; scroll-behavior: smooth; }
body { max-width: 560px; margin: 0 auto; padding: 32px; display: flex; flex-direction: column; gap: 48px; }
header, footer, nav { position: sticky; top: 0; padding: 40px; background: #222; }
a, button, summary { display: block; padding: 20px; border: 4px solid red; }
`;

function shellStyles(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('shoa-comic-header')!.shadowRoot!;
    const footer = document.querySelector('shoa-comic-footer')!.shadowRoot!;
    const read = (element: Element | null) => {
      const style = getComputedStyle(element!);
      const box = element!.getBoundingClientRect();
      const properties = ['font-family', 'font-size', 'line-height', 'letter-spacing', 'color', 'text-transform', 'word-break', 'padding-top', 'display'];
      return [Math.round(box.width), Math.round(box.height), ...properties.map((name) => style.getPropertyValue(name))];
    };
    return {
      bar: read(header.querySelector('.bar')),
      brand: read(header.querySelector('.brand')),
      nav: read(header.querySelector('.nav a')),
      language: read(header.querySelector('.lang summary')),
      foot: read(footer.querySelector('.foot')),
      back: read(footer.querySelector('.back')),
      email: read(footer.querySelector('a[href^="mailto:"]')),
    };
  });
}

test('hostile comic CSS, full-height bodies, overlays and floating buttons leave the site shell usable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(editionPath(fixtureLocale));
  const baseline = await shellStyles(page);

  const problems = collectProblems(page);
  await page.route(`**${editionPath(fixtureLocale)}`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('</head>', `<style>${hostileCss}</style></head>`) });
  });
  await page.goto(editionPath(fixtureLocale));
  expect(await shellStyles(page)).toEqual(baseline);

  // html, body { height: 100% } lets the comic overflow a one-screen body; the footer still follows the content.
  expect(await page.evaluate(() => document.body.scrollHeight - document.body.clientHeight)).toBeGreaterThan(100);
  await expect.poll(() => page.evaluate(() => {
    const contentEnd = Math.max(...[...document.body.children].map((child) => child.getBoundingClientRect().bottom));
    return document.querySelector('shoa-comic-footer')!.getBoundingClientRect().top - contentEnd;
  })).toBeGreaterThanOrEqual(-1);

  // A full-screen overlay opened at the top covers the site header, so its close button works.
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const overlay = document.createElement('div');
    overlay.id = 'hostile-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7)';
    const close = document.createElement('div');
    close.id = 'hostile-close';
    close.style.cssText = 'position:absolute;top:10px;right:10px;width:48px;height:48px;background:#fff';
    close.addEventListener('click', () => overlay.remove());
    overlay.append(close);
    document.body.append(overlay);
  });
  await page.locator('#hostile-close').click();
  await expect(page.locator('#hostile-overlay')).toHaveCount(0);

  // A small floating button over a footer link: the footer rises above it, also when the comic has a
  // full-screen fixed background behind everything.
  await page.evaluate(() => {
    const background = document.createElement('div');
    background.style.cssText = 'position:fixed;inset:0;z-index:-1;background:#fde';
    document.body.prepend(background);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  const email = page.locator('shoa-comic-footer a[href^="mailto:"]');
  await expect(email).toBeInViewport();
  const topAtEmail = () => email.evaluate((link) => {
    const rect = link.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return top?.id || top?.localName;
  });
  const box = (await email.boundingBox())!;
  await page.evaluate(({ x, y, width, height }) => {
    const button = document.createElement('div');
    button.id = 'hostile-top';
    button.style.cssText = `position:fixed;left:${x - 6}px;top:${y - 6}px;width:${width + 12}px;height:${height + 12}px;z-index:50;background:red`;
    document.body.append(button);
  }, box);
  await expect.poll(topAtEmail).toBe('shoa-comic-footer');

  // A large overlay opened at the end of the page still covers the footer.
  await page.evaluate(() => {
    const sheet = document.createElement('div');
    sheet.id = 'hostile-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7)';
    document.body.append(sheet);
  });
  await expect.poll(topAtEmail).toBe('hostile-sheet');
  await page.evaluate(() => document.getElementById('hostile-sheet')!.remove());
  await expect.poll(topAtEmail).toBe('shoa-comic-footer');

  // Keys pressed in the site footer do not reach the comic's document-level shortcuts.
  await page.evaluate(() => {
    const seen: string[] = [];
    Object.assign(window, { seenKeys: seen });
    for (const type of ['keydown', 'keypress', 'keyup']) document.addEventListener(type, () => seen.push(type));
  });
  const seenKeys = () => page.evaluate(() => (window as unknown as { seenKeys: string[] }).seenKeys);
  await email.focus();
  await page.keyboard.press('k');
  expect(await seenKeys()).toEqual([]);
  await email.evaluate((link) => (link as HTMLElement).blur());
  await page.keyboard.press('k');
  expect(await seenKeys()).toEqual(['keydown', 'keypress', 'keyup']);
  expect(problems).toEqual([]);
});

test('comic header and footer have no serious accessibility violations, with menus open too', async ({ page }) => {
  const blocking = async () => (await new AxeBuilder({ page }).include('shoa-comic-header').include('shoa-comic-footer').analyze())
    .violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  await page.goto(editionPath(fixtureLocale));
  expect(await blocking()).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 800 });
  if (editionsOf(fixture).length > 1) {
    await page.locator('shoa-comic-header .lang summary').click();
    expect(await blocking()).toEqual([]);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('shoa-comic-header [data-toggle]').click();
  expect(await blocking()).toEqual([]);
});

test('comic lists show every comic, newest first, and every card opens', async ({ page }) => {
  for (const locale of ['zh', 'en'] as const) {
    await page.goto(`${prefix(locale)}/comics/`);
    const cards = page.locator('.comic-card');
    await expect(cards).toHaveCount(comics.length);
    await expect(cards.first()).toHaveClass(/comic-card--featured/);
    const hrefs = await cards.locator('h2 a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs.map((href) => href!.split('/').filter(Boolean).at(-1))).toEqual(comics.map((comic) => comic.id));
    const cover = cards.first().locator('img');
    await expect(cover).toHaveJSProperty('complete', true);
    expect(await cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    for (const href of hrefs) expect((await page.request.get(`${href}/`)).status(), href!).toBe(200);
  }
});

for (const comic of comics) {
  test(`${comic.id}: every edition renders inside the site shell without errors`, async ({ page }) => {
    const problems = collectProblems(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of editionsOf(comic)) {
      await page.goto(editionPath(locale, comic.id));
      await expect(page.locator('html')).toHaveAttribute('lang', locale === 'zh' ? 'zh-CN' : locale);
      await expect(page.locator('shoa-comic-header header.bar')).toBeVisible();
      await expect(page.locator('shoa-comic-footer footer.foot')).toBeAttached();
      expect(await page.evaluate(() => document.body.innerText.trim().length), `${locale} has comic content`).toBeGreaterThan(20);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${locale} overflow`).toBeLessThanOrEqual(1);
    }
    expect(problems).toEqual([]);
  });
}

test('old comic edition URLs redirect to the new addresses', async ({ page }) => {
  await page.goto('/comics/gpt-6-astra/ko/');
  await expect(page).toHaveURL(/\/ko\/comics\/gpt-6-astra\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true });
  test('comic menu items can be tapped', async ({ page }) => {
    const copy = shellCopy(fixtureLocale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(editionPath(fixtureLocale));
    await page.locator('shoa-comic-header [data-toggle]').tap();
    const menu = page.getByRole('navigation', { name: copy.mobile });
    await expect(menu.getByRole('link')).toHaveCount(7);
    await menu.getByRole('link', { name: copy.comics, exact: true }).tap();
    await expect(page).toHaveURL(new RegExp(`${prefix(fixtureLocale)}/comics/?$`));
    await expect(page.locator('h1')).toHaveText(copy.comics);
  });
});
