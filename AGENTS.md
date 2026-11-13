# MasterWhats

A WhatsApp Web-like static viewer for 66,387 WhatsApp messages from the seized
phones of Daniel Vorcaro, in 24 conversations: the export of the chat with
Martha Graeff and the Federal Police report IPJ-A 3298613/2026. Vanilla JS +
Vite, no backend: the build turns the source data into static JSON and
pre-rendered pages. What matters most is fidelity to the sources (every quoted
highlight resolves to a real message, or the build fails) and links that keep
working (message permalinks, canonical URLs under any base path). All UI text is
Brazilian Portuguese.

This repository (`joaolucasdsp/masterzap`) is a fork of
`rafaelbressan/masterzap`.

This repository uses the engineering harness. Harness configuration, project
overrides, and project memory live in `.engineering/`. Decisions live in the
ADR directory declared in `.engineering/harness.yaml` (`adr_dir`).

## Commands

Verified on 2026-11-06 with Node 22.12.0 (CI uses Node 22) and Python 3.9.6.
Run from the repository root. There is no Node pin in the repository; Vite 6
fails on Node 16 (`crypto$2.getRandomValues is not a function`).

| Purpose | Command |
|---|---|
| Restore | `npm ci` |
| Build | `npm run build` (about 5 s: `split_data.py`, `export.mjs`, `vite build`, `prerender.mjs`; needs `python3`) |
| Fast tests | `npm test` (Vitest, 22 files, about 4 s; run `npm run build` first, see Testing) |
| Full tests | `npm run verify` (build, unit, E2E; about 5 min) (unverified: Playwright browsers not installed here; `npx playwright install chromium` once) |
| Run locally | `npm run split-data && npm run dev` (Vite at `http://localhost:5173`) |
| Lint / format check | none configured |

Other scripts: `npm run export` (clean export into `public/export/`, after
`split-data`), `npm run prerender` (after `vite build`), `npm run preview`,
`npm run test:e2e`, `npm run test:coverage`. A Pages build is reproduced with
`SITE_URL=https://<owner>.github.io/<repo> npm run build`; `SITE_URL=… npm test`
then checks it.

## Architecture

- **Vanilla JS + Vite**: no framework, static data viewer. `src/main.js` builds
  the layout and keeps one active panel at a time; `src/lib/router.js` is a hash
  router (`#/chat/<id>`, `#/chat/<id>/msg/<n>`, `#/calls`); UI pieces live in
  `src/components/`, logic in `src/lib/`, styles in `src/styles/`.
- **Data**: two sources, 66,387 messages across 24 conversations.
  - 65,772 messages from DV ↔ Martha Graeff (2024-02-10 to 2025-08-13), in
    `data/messages.json`.
  - 615 messages from the Federal Police report IPJ-A 3298613/2026 (23
    conversations, including DV ↔ Alexandre de Moraes), transcribed in
    `data/ipj-3298613/` (JSONL, one line per message; see its `README.md`) and
    built into `data/conversations/` by `scripts/build_ipj_data.py`.
  - `data/source/` holds the original source PDFs.
- **Chunking**: `scripts/split_data.py` splits every source conversation into
  per-date JSON files in `public/data/`.
- **Lazy loading**: the app loads only the day-chunks the user scrolls to
  (`src/lib/scroll-loader.js`), cached in an LRU (`src/lib/data-store.js`).
- **Highlights are citations outside the app**: `scripts/lib/corpus.mjs`
  `createResolver()` runs each `action:search` link against the conversation at
  build time (same normalisation as `src/lib/search.js`), and `renderLinks()`
  emits the message link (`/#/chat/<id>/msg/<n>`, or `#msg-<n>` on the same
  page) plus `⟨date time · laudo p., fig.⟩`. A term that matches nothing **fails
  the build**. The hand-written highlights in `public/llms.txt` and the
  `<noscript>` of `index.html` were linked the same way: re-run the resolver if
  those quotes change.
- **Pre-render**: `scripts/prerender.mjs` runs after `vite build`. For each
  conversation it writes `dist/chat/<id>/index.html` (the built app page
  retitled, profile and first messages as plain HTML in
  `<article id="prerender">`, a one-line script that sets the hash so the app
  opens that chat; `main.js` removes the article at boot). It also writes
  `dist/llms-full.txt`, `dist/sitemap.xml`, and, for static hosts without
  rewrites, `dist/404.html` (the app page plus the `/data/source/` → GitHub
  redirect), `.nojekyll`, and `robots.txt`/`site.webmanifest` re-pointed at the
  site. Shared helpers are in `scripts/lib/corpus.mjs`.
- **Base path**: the site can live under a prefix (GitHub Pages: `/<repo>/`).
  `SITE_URL` at build time sets it: `src/lib/base.js` derives `BASE` from its
  pathname, Vite gets it as `base`, and `scripts/lib/corpus.mjs` uses it as
  `SITE` for canonical URLs. HTML the scripts generate goes through
  `rebaseHtml()` (prerender's `writeHtml`), which also re-points
  `https://www.masterwhats.com.br` at `SITE`; `index.html` gets the same in the
  `siteHtml` plugin in `vite.config.js`, which also drops the Vercel Insights
  script unless Vercel is building.
- **Export**: `scripts/export.mjs` writes `public/export/`: one `.md` and
  `.json` per conversation, one of each with everything, and a zip. It reads the
  conversation list from `public/data/conversations.json`, messages from
  `data/`, and profiles from `src/lib/profile-content.js`.

### Directory structure

- `src/`: application source (`components/`, `lib/`, `styles/`).
- `public/data/`: generated chunked data (gitignored; `npm run split-data`).
- `public/export/`: clean export, md/json per conversation plus zip
  (gitignored; `npm run export`, after `split-data`).
- `public/assets/`: static assets (favicon, avatars, background, SVGs).
- `data/`: source data (`messages.json`, `index.json`, `ipj-3298613/`,
  `conversations/`, `source/`).
- `scripts/`: build scripts.
- `tests/unit/`: Vitest unit tests. `tests/e2e/`: Playwright E2E tests.
- `ref/`: reference files (WDS `style.css`, WhatsApp desktop HTML, branding).
  Gitignored and not present in this clone; the paths named below exist only
  where someone has the files.

### Data format

Each message in `messages.json`:

```json
{
  "id": 1,
  "timestamp": "2024-02-10T11:12:08",
  "date": "2024-02-10",
  "time": "11:12:08",
  "sender": "DV" | "Martha Graeff",
  "content": "...",
  "type": "text" | "image" | "video" | "audio" | "sticker" | "document" | "deleted" | "call" | "system",
  "is_edited": false,
  "attachment": null | "filename",
  "urls": []
}
```

## Conventions

- **Language**: all UI text in Brazilian Portuguese (pt-BR).
- **Never write a root-relative path as a literal** (`'/assets/x.png'`,
  `fetch('/data/…')`): use `withBase('/assets/x.png')` from `src/lib/base.js`.
  Unit tests that look at `dist/` or at URLs import `SITE`/`BASE` instead of
  literals, so `SITE_URL=… npm test` checks a Pages build.
- **Styling**: WDS (WhatsApp Design System) CSS custom properties in
  `src/styles/wds-tokens.css`. References, when `ref/` is present:
  `ref/style/style.css` (WDS tokens, 500+ CSS vars),
  `ref/style/whatsapp-desktop-ref.html` (WhatsApp Web DOM structure),
  `ref/style/whatsapp-background.webp` (chat wallpaper),
  `ref/style/whatsapp-loading.png` (loading screen),
  `ref/branding-design-components/01_Digital/02_SVG/Green/Digital_Glyph_Green.svg`
  (WhatsApp glyph).
- **Message types**: text, image, video, audio, sticker, document, deleted,
  call, system.
- **Outgoing messages**: `sender === "DV"` (right-aligned, green bubble).
- **Conversation ID**: slugified participant name (e.g. `martha-graeff`).
- **Commits**: `type: summary` or `type(scope): summary` in Portuguese, with a
  body that says why. Besides the Conventional Commits types, the history uses
  `geo`, `seo`, `diag`, `data`, and `style`. Commits before 2026-09 are plain
  English sentences.
- Components open with a doc comment that says what the screen does, and 16 of
  18 carry a `Security note` saying why each `innerHTML` is safe. Keep that when
  a component sets `innerHTML`.

## Reference implementations

Copy these when adding something similar:

- Screen component: `src/components/CallsPanel.js`, with its unit test
  `tests/unit/calls-panel.test.js`
- Library module: `src/lib/base.js`, with `tests/unit/base.test.js`
- Build output test: `tests/unit/export-data.test.js` (checks
  `public/export/` produced by `scripts/export.mjs`)
- E2E test across both layouts: `tests/e2e/calls.test.js`

## Testing

- Unit: Vitest with jsdom, configured in `vite.config.js`
  (`tests/unit/**/*.test.js`). Six files (`prerender`, `export-data`,
  `data-store`, `conversations-data`, `calls-data`, `content-links`) read the
  build output in `public/data/`, `public/export/`, and `dist/`, so `npm test`
  fails on a clean clone until `npm run build` has run.
- One test: `npx vitest run tests/unit/calls-panel.test.js -t "folds consecutive"`.
- E2E: Playwright, `tests/e2e/playwright.config.js`, projects `desktop`
  (1280×720), `mobile` (Pixel 5), and `prerender` (against `vite preview` on
  port 4173; the others use `npm run dev` on 5173). Outside CI it reuses a
  server already listening on those ports. E2E covers what jsdom cannot see:
  list scrolling, hover on touch, avatars that actually load, and the
  read/unread wiring. Keep `test:e2e` pointed at
  `tests/e2e/playwright.config.js`: without `--config` Playwright scans
  `tests/`, picks up the Vitest files, and dies on a matcher clash.
- CI (`.github/workflows/pages.yml`) runs `npm run build` and `npm test` with the
  Pages `SITE_URL`, on push to `main` only. E2E runs only in the `pre-push` hook.
- The `pre-push` hook (`.githooks/pre-push`) runs `npm run verify`. Enable it
  once per clone with `git config core.hooksPath .githooks`;
  `git push --no-verify` skips it.

## Observability

Vercel Web Analytics (`/_vercel/insights/script.js`), included only when Vercel
builds the site. No error tracking or logging otherwise; GitHub Pages builds
carry no analytics.

## Delivery

| Item | Value |
|---|---|
| CI on every change | missing (`pages.yml` builds and runs unit tests only on push to `main`, then deploys) |
| Merge gate (required checks and reviewers, resolved threads, stale approvals dismissed) | missing: `main` has no branch protection, ruleset, or CODEOWNERS (checked 2026-11-13) |
| Hosting / provider | GitHub Pages for this fork (`https://joaolucasdsp.github.io/masterzap/`, built by `.github/workflows/pages.yml`); upstream deploys `www.masterwhats.com.br` on Vercel (`vercel.json`) |
| Environments | production only |
| Staging gate | missing |
| Deploy trigger | push to `main` (Pages workflow, or `workflow_dispatch`); Vercel deploys on push where it is connected |
| Rollback | missing (no documented procedure; revert the commit on `main` and let the workflow redeploy) |
| Feature flags | missing |
| Database migrations | none (static site; data is rebuilt at every build) |

What Pages lacks compared with Vercel (`vercel.json`) the build replaces:
`dist/404.html` is the app page, so any unknown path opens the site, and
`/data/source/<pdf>` redirects to the bytes on GitHub. The Vercel security
headers and `Cache-Control` have no Pages equivalent.

## Security notes

- No authentication, no secrets at runtime, no backend. Everything in `data/`
  is published.
- The data is third-party content (leaked messages, a police report). Message
  text reaches the DOM through `innerHTML` after `escapeHtml()` and `linkify()`
  (`src/lib/utils.js`, used by `src/components/ChatView.js`). `escapeHtml()`
  does not escape quotes, and `linkify()` puts the matched URL inside
  `href="…"`, so a URL in a message that contains `"` adds attributes to the
  link (checked on 2026-11-06 with jsdom: `onmouseover` survives). Review any
  new data source with that in mind.
- Vercel sends `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS,
  `Referrer-Policy`, and `Permissions-Policy` (`vercel.json`). There is no
  Content-Security-Policy, and GitHub Pages sends none of these headers.
