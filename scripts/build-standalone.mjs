/**
 * Builds a single self-contained HTML file (JS + CSS inlined) that runs by
 * simply double-clicking it - no Node runtime, no dev server, no bundler needed.
 * Output: dist/ResQ-EMS-Dispatch.html
 *
 * Usage: node scripts/build-standalone.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

execSync('npx vite build', { cwd: root, stdio: 'inherit' });

const assets = path.join(dist, 'assets');
const files = readdirSync(assets);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));
if (!jsFile) throw new Error('No JS bundle found in dist/assets');

let html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const js = readFileSync(path.join(assets, jsFile), 'utf8');

// Inline the stylesheet
if (cssFile) {
  const css = readFileSync(path.join(assets, cssFile), 'utf8');
  html = html.replace(
    new RegExp(`<link[^>]*href="[^"]*${cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`),
    () => `<style>\n${css}\n</style>`
  );
}

// Inline the module bundle. Escape any closing-script sequence inside the JS.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
html = html.replace(
  new RegExp(`<script[^>]*src="[^"]*${jsFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`),
  () => `<script type="module">\n${safeJs}\n</script>`
);

// Drop the external font/CDN preconnects that would stall offline file:// loads
html = html.replace(/\s*<link rel="preconnect"[^>]*>/g, '');

const outFile = path.join(dist, 'ResQ-EMS-Dispatch.html');
writeFileSync(outFile, html, 'utf8');

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`\nSingle-file build written: ${outFile} (${kb} KB)`);
if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  console.log('WARNING: some external asset references remain - the file may not open standalone.');
} else {
  console.log('All JS and CSS inlined - this file opens by double-click.');
}
