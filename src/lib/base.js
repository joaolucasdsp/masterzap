/**
 * Where the site lives under its host.
 *
 * On www.masterwhats.com.br (and on Vercel previews) that is the root, so every
 * path here comes back unchanged. On GitHub Pages a project site is served
 * under the repository name — https://<user>.github.io/masterzap/ — and every
 * root-relative path the app or the build scripts write has to carry that
 * prefix. Set SITE_URL at build time and the prefix is its pathname:
 *
 *     SITE_URL=https://joaolucasdsp.github.io/masterzap npm run build
 *
 * Vite gets the same value as `base` (see vite.config.js), so anything it
 * rewrites itself — <link>, <script>, <img>, imported assets — agrees with what
 * this module hands out. The scripts run in Node, where import.meta.env does
 * not exist, so they read SITE_URL directly.
 */

const viteEnv = import.meta.env;

/** Path prefix derived from a site URL — always starts and ends with '/'. */
export function basePathOf(siteUrl) {
  if (!siteUrl) return '/';
  return new URL(siteUrl).pathname.replace(/\/*$/, '/');
}

/** '/' at the root; '/masterzap/' under a project site. */
export const BASE = (viteEnv && viteEnv.BASE_URL) || basePathOf(globalThis.process?.env?.SITE_URL);

/** Root-relative path → path under the base. withBase('/data/x.json') → '/masterzap/data/x.json'. */
export const withBase = (path, base = BASE) => base + String(path).replace(/^\/+/, '');

/**
 * Rewrites the root-relative href/src attributes of generated HTML to live
 * under BASE. Attributes already under BASE (Vite rewrote them) and protocol-
 * relative URLs are left alone. A no-op at the root.
 */
export function rebaseHtml(html, base = BASE) {
  if (base === '/') return html;
  const prefix = base.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`\\b(href|src)="/(?!/|${prefix})`, 'g'), `$1="${base}`);
}
