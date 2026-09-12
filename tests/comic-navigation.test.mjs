import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('every built homepage exposes comics in desktop, mobile, and main content', () => {
  for (const locale of ['', 'en/', 'ja/', 'ko/', 'th/', 'fr/', 'de/', 'vi/']) {
    const html = readFileSync(new URL(`../dist/${locale}index.html`, import.meta.url), 'utf8');
    const desktop = html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)?.[0];
    const mobile = html.match(/<nav[^>]*id="mobile-nav-panel"[\s\S]*?<\/nav>/)?.[0];
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0];
    for (const [name, section] of Object.entries({desktop, mobile, main})) {
      assert.ok(section, `${locale} ${name} exists`);
      assert.match(section, /href="\/comics\/"/, `${locale} ${name} links to comics`);
    }
  }
});
