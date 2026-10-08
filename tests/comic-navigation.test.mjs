import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const locales = ['zh', 'en', 'ja', 'ko', 'th', 'fr', 'de', 'vi'];
const htmlLang = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', th: 'th', fr: 'fr', de: 'de', vi: 'vi' };
const prefix = (locale) => (locale === 'zh' ? '' : `/${locale}`);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function ensureBuild() {
  if (existsSync(new URL('dist/comics/index.html', root))) return;
  const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
}

// Icon fonts (Material Icons / Symbols) are the one kind of font comics still load from Google.
function isIconFontUrl(url) {
  const parsed = new URL(url.replace(/&amp;/g, '&').replace(/^\/\//, 'https://'));
  if (parsed.hostname === 'fonts.gstatic.com') return /^\/s\/material(?:icons|symbols)/i.test(parsed.pathname);
  if (parsed.pathname === '/icon') return true;
  const families = parsed.searchParams.getAll('family').map((value) => value.split(':')[0].trim());
  return families.length > 0 && families.every((family) => /^Material (?:Icons|Symbols)\b/i.test(family));
}

function comicEditions() {
  return readdirSync(new URL('src/comics/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(new URL(`src/comics/${entry.name}/comic.json`, root)))
    .flatMap((entry) => {
      const meta = JSON.parse(read(`src/comics/${entry.name}/comic.json`));
      return meta.draft ? [] : Object.keys(meta.editions).map((locale) => ({ id: entry.name, locale, meta }));
    });
}

test('every built homepage links to its own comics list in desktop, mobile, and main content', () => {
  ensureBuild();
  for (const locale of locales) {
    const html = read(`dist/${locale === 'zh' ? '' : `${locale}/`}index.html`);
    const desktop = html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)?.[0];
    const mobile = html.match(/<nav[^>]*id="mobile-nav-panel"[\s\S]*?<\/nav>/)?.[0];
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0];
    for (const [name, section] of Object.entries({ desktop, mobile, main })) {
      assert.ok(section, `${locale} ${name} exists`);
      assert.match(section, new RegExp(`href="${prefix(locale)}/comics"`), `${locale} ${name} links to the comics list`);
    }
  }
});

test('comic list pages exist in every locale and link only to built editions', () => {
  ensureBuild();
  for (const locale of locales) {
    const html = read(`dist${prefix(locale)}/comics/index.html`);
    assert.match(html, new RegExp(`<html[^>]+lang="${htmlLang[locale]}"`));
    const links = [...html.matchAll(/<a[^>]+href="((?:\/[a-z]{2})?\/comics\/[a-z0-9-]+)"/g)].map((match) => match[1]);
    assert.ok(links.length > 0, `${locale} list links to comics`);
    for (const link of links) assert.ok(existsSync(new URL(`dist${link}/index.html`, root)), `${locale} list link ${link}`);
  }
});

test('comic editions wrap the author HTML in the isolated site header and footer', () => {
  ensureBuild();
  const editions = comicEditions();
  assert.ok(editions.length > 0);
  for (const { id, locale } of editions) {
    const label = `${id}/${locale}`;
    const html = read(`dist${prefix(locale)}/comics/${id}/index.html`);
    assert.match(html, new RegExp(`<html[^>]*lang="${htmlLang[locale]}"`), `${label} lang`);
    assert.equal((html.match(/<shoa-comic-header\b/g) ?? []).length, 1, `${label} one header`);
    assert.equal((html.match(/<shoa-comic-footer\b/g) ?? []).length, 1, `${label} one footer`);
    assert.equal((html.match(/<template shadowrootmode="open">/g) ?? []).length, 2, `${label} declarative shadow roots`);
    // Cloudflare's email obfuscation cannot be decoded inside a shadow root, so the link opts out of it.
    assert.match(html, /<footer class="foot"[^>]*>[\s\S]*<!--email_off--><a href="mailto:shoa_lin@outlook\.com">Email<\/a><!--\/email_off-->[\s\S]*<\/footer>/, `${label} footer contact`);
    assert.match(html, new RegExp(`class="back" href="${prefix(locale)}/comics"`), `${label} back to the list`);
    const google = [...html.matchAll(/(?:https?:)?\/\/fonts\.(?:googleapis|gstatic)\.com[^"'\s)<>]*/g)].map((match) => match[0]);
    assert.deepEqual(google.filter((url) => !isIconFontUrl(url)), [], `${label} loads no Google Fonts except icon fonts`);
    assert.doesNotMatch(html, /comic-langs|data-comic-header|aria-label="Email">Contact/, `${label} has no old shell leftovers`);
    assert.match(html, new RegExp(`og:image" content="https://www\\.bydziwen\\.top/comics/${id}/covers/${locale}\\.jpg"`), `${label} cover preview`);
    for (const [, url] of html.matchAll(/url\((\/comics\/[^)]+\.woff2)\)/g)) {
      assert.ok(existsSync(new URL(`dist${url}`, root)), `${label} font ${url}`);
    }
  }
});

test('old comic edition URLs redirect to the locale-prefixed scheme', () => {
  ensureBuild();
  for (const locale of locales.filter((item) => item !== 'zh')) {
    const html = read(`dist/comics/gpt-6-astra/${locale}/index.html`);
    assert.match(html, new RegExp(`http-equiv="refresh" content="0;url=/${locale}/comics/gpt-6-astra/?"`), locale);
  }
});
