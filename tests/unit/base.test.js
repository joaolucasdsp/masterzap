import { describe, it, expect } from 'vitest';
import { BASE, SITE, CANONICAL_SITE, basePathOf, withBase, rebaseHtml } from '../../src/lib/base.js';

// These run under whatever SITE_URL the build ran with, so the module's own
// values are checked against the environment and the helpers with explicit
// arguments.
describe('base path', () => {
  it('follows SITE_URL, and is the canonical root without it', () => {
    expect(BASE).toBe(basePathOf(process.env.SITE_URL));
    expect(SITE).toBe((process.env.SITE_URL || CANONICAL_SITE).replace(/\/+$/, ''));
    expect(basePathOf(undefined)).toBe('/');
    expect(basePathOf(CANONICAL_SITE)).toBe('/');
    expect(basePathOf(`${CANONICAL_SITE}/`)).toBe('/');
  });

  it('comes from the pathname of SITE_URL, with one trailing slash', () => {
    expect(basePathOf('https://joaolucasdsp.github.io/masterzap')).toBe('/masterzap/');
    expect(basePathOf('https://joaolucasdsp.github.io/masterzap/')).toBe('/masterzap/');
    expect(basePathOf('https://example.org/a/b//')).toBe('/a/b/');
  });

  it('prefixes root-relative paths', () => {
    expect(withBase('/data/calls.json', '/')).toBe('/data/calls.json');
    expect(withBase('data/calls.json', '/')).toBe('/data/calls.json');
    expect(withBase('/data/calls.json', '/masterzap/')).toBe('/masterzap/data/calls.json');
    expect(withBase('/export', '/masterzap/')).toBe('/masterzap/export');
  });

  it('rebases href and src in generated HTML, and nothing else', () => {
    const html = '<a href="/chat/x#msg-1">a</a> <img src="/assets/l.png"> <a href="//cdn/x">b</a> '
      + '<a href="https://example.org/chat/x">c</a> <script src="/masterzap/assets/i.js"></script> '
      + '<meta content="/not-touched">';
    expect(rebaseHtml(html, '/', CANONICAL_SITE)).toBe(html);
    expect(rebaseHtml(html, '/masterzap/', CANONICAL_SITE)).toBe(
      '<a href="/masterzap/chat/x#msg-1">a</a> <img src="/masterzap/assets/l.png"> <a href="//cdn/x">b</a> '
      + '<a href="https://example.org/chat/x">c</a> <script src="/masterzap/assets/i.js"></script> '
      + '<meta content="/not-touched">',
    );
  });

  it('re-points the canonical host at the site being built', () => {
    const html = `<link rel="canonical" href="${CANONICAL_SITE}/"> <a href="/quem">q</a>`;
    expect(rebaseHtml(html, '/', CANONICAL_SITE)).toBe(html);
    expect(rebaseHtml(html, '/masterzap/', 'https://joaolucasdsp.github.io/masterzap'))
      .toBe('<link rel="canonical" href="https://joaolucasdsp.github.io/masterzap/"> <a href="/masterzap/quem">q</a>');
  });
});
