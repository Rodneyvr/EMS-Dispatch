/**
 * Verifies the single-file standalone build works when opened directly from disk
 * (file:// URL, exactly like double-clicking it on Windows).
 * Usage: node scripts/verify-standalone.cjs [pathToHtml]
 */
const { chromium } = require('playwright');
const path = require('node:path');

const FILE = path.resolve(process.argv[2] || 'dist/ResQ-EMS-Dispatch.html');
const errors = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console.error: ${m.text()}`));

  await page.goto('file://' + FILE, { waitUntil: 'load' });
  await page.waitForSelector('text=Sign In & Launch Dashboard', { timeout: 20000 });
  console.log('1. Login screen rendered from file:// (no server)');

  await page.fill('input[placeholder="e.g. dispatcher1 or admin"]', 'admin');
  await page.fill('input[placeholder="Enter security password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dashboard', { timeout: 20000 });
  console.log('2. Login + dashboard OK');

  for (const label of ['New Trip', 'Scheduling', 'Trip Log', 'Overtime', 'Stock Requests', 'Reports & Exports', 'Settings', 'Dashboard']) {
    await page.click(`button:has-text("${label}")`, { timeout: 10000 });
    await page.waitForTimeout(400);
  }
  console.log('3. All 8 tabs navigated');

  const persisted = await page.evaluate(() => ({
    trips: JSON.parse(localStorage.getItem('resq_trips_v1') || '[]').length,
    stock: JSON.parse(localStorage.getItem('resq_stock_items_v1') || '[]').length,
    users: JSON.parse(localStorage.getItem('resq_users_v1') || '[]').length,
  }));
  console.log(`4. localStorage works on file:// -> ${JSON.stringify(persisted)}`);

  await page.screenshot({ path: 'screenshots/standalone-file.png', fullPage: true });
  const cssApplied = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log(`5. Tailwind CSS applied (body bg = ${cssApplied})`);

  await browser.close();
  if (errors.length) console.log('\nBROWSER ERRORS:\n' + errors.join('\n'));
  const ok = persisted.trips > 0 && !errors.length;
  console.log(`\nRESULT: ${ok ? 'PASS - the single file runs standalone' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
})();
