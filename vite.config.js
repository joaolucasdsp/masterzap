import { defineConfig } from 'vite';
import { BASE, rebaseHtml } from './src/lib/base.js';

/**
 * What Vite's own HTML pass leaves alone:
 *  - the <a href="/chat/…"> links in the <noscript> article need the base
 *    prefix too when the site is served under one (GitHub Pages);
 *  - the Vercel Insights script only exists on Vercel. Anywhere else it is a
 *    404 in the console, so it goes in only when Vercel is doing the build.
 */
const siteHtml = () => ({
  name: 'masterwhats:site-html',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      if (!process.env.VERCEL) html = html.replace(/^\s*<script defer src="\/_vercel\/insights\/script\.js"><\/script>\n/m, '');
      return rebaseHtml(html);
    },
  },
});

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: BASE,
  plugins: [siteHtml()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  preview: {
    // Reached through `tailscale serve`, which fronts the loopback port with
    // HTTPS on a *.ts.net name. Vite rejects hostnames it does not know, and
    // the browser needs a secure context for the clipboard and the share sheet.
    allowedHosts: ['.ts.net'],
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
  },
});
