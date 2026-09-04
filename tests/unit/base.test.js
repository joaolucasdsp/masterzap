import { describe, it, expect } from 'vitest';
import { BASE, basePathOf, withBase, rebaseHtml } from '../../src/lib/base.js';

describe('base path', () => {
  it('is the root unless the build says otherwise', () => {
    expect(BASE).toBe('/');
    expect(basePathOf(undefined)).toBe('/');
    expect(basePathOf('https://www.masterwhats.com.br')).toBe('/');
    expect(basePathOf('https://www.masterwhats.com.br/')).toBe('/');
  });

  it('comes from the pathname of SITE_URL, with one trailing slash', () => {
    expect(basePathOf('https://joaolucasdsp.github.io/masterzap')).toBe('/masterzap/');
    expect(basePathOf('https://joaolucasdsp.github.io/masterzap/')).toBe('/masterzap/');
    expect(basePathOf('https://example.org/a/b//')).toBe('/a/b/');
  });

  it('prefixes root-relative paths', () => {
    expect(withBase('/data/calls.json')).toBe('/data/calls.json');
    expect(withBase('data/calls.json')).toBe('/data/calls.json');
    expect(withBase('/data/calls.json', '/masterzap/')).toBe('/masterzap/data/calls.json');
    expect(withBase('/export', '/masterzap/')).toBe('/masterzap/export');
  });

  it('rebases href and src in generated HTML, and nothing else', () => {
    const html = '<a href="/chat/x#msg-1">a</a> <img src="/assets/l.png"> <a href="//cdn/x">b</a> '
      + '<a href="https://www.masterwhats.com.br/chat/x">c</a> <script src="/masterzap/assets/i.js"></script> '
      + '<meta content="/not-touched">';
    expect(rebaseHtml(html)).toBe(html);
    expect(rebaseHtml(html, '/masterzap/')).toBe(
      '<a href="/masterzap/chat/x#msg-1">a</a> <img src="/masterzap/assets/l.png"> <a href="//cdn/x">b</a> '
      + '<a href="https://www.masterwhats.com.br/chat/x">c</a> <script src="/masterzap/assets/i.js"></script> '
      + '<meta content="/not-touched">',
    );
  });
});
