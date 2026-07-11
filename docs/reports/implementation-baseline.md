# Multilingual Redesign Implementation Baseline

Date: 2026-07-11

Branch: `codex/multilingual-site-redesign`

Starting commit: `d1ddf4b5ee2c6acc611c61ffac64cb17004de903`

## Source Checkout Protection

The source checkout remains read-only during implementation. Its pre-existing tracked changes were saved as a binary patch outside the repository.

Pre-existing tracked files:

- `blog.html`
- `css/blog.css`
- `js/blog.js`
- `tests/site-content.test.mjs`

Pre-existing untracked entries include the project-level translation skill and local system files. They are not copied wholesale into this branch; only approved behavior is migrated deliberately.

Patch SHA-256:

```text
268edbc96181d91056ed22b97f0f2244957511782bd18c526af105df542748ee
```

Status snapshot SHA-256:

```text
910cea94e0c06c37b3d2f5d58b6a0038b5157a9be6c8b6e2ced0027782c2c2e0
```

## Preserved Behavior

- Quiet, compact desktop article index
- Horizontally scrollable mobile category filters
- Mobile touch targets of at least 44 CSS pixels
- `aria-current="page"` on the active article
- Category selection does not forcibly close the mobile drawer
- Project-level translation skill migrated to the future Astro content workflow

## Baseline Verification

```text
node --test tests/site-content.test.mjs
13 tests passed, 0 failed, 0 skipped

git diff --check
exit 0
```

No production deployment, remote push, history rewrite, or source-checkout edit was performed.
