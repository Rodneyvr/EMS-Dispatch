/**
 * Browser end-to-end smoke run: logs in through the real UI, walks every tab,
 * and reports console errors, page exceptions and failed requests.
 * Usage: node scripts/e2e.cjs [baseUrl] [username] [password] [screenshotTag]
 * Requires the Chromium browser once: npx playwright install chromium
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3000';
const USERNAME = process.argv[3] || 'dispatcher1';
const PASSWORD = process.argv[4] || 'Dispatch123!';
const TAG = process.argv[5] || 'dispatcher';
const errors = [];
const warnings = [];
const failedRequests = [];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') errors.push(`console.error: ${text}`);
    else if (t === 'warning') warnings.push(text);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    failedRequests.push(`${r.url()} -> ${f && f.errorText}`);
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Sign In & Launch Dashboard', { timeout: 15000 });
  console.log('1. Login screen rendered:', (await page.title()) || '(no title)');
  await page.screenshot({ path: `screenshots/${TAG}-01-login.png` });

  // Standard credential login
  await page.fill('input[placeholder="e.g. dispatcher1 or admin"]', USERNAME);
  await page.fill('input[placeholder="Enter security password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForSelector('text=Dashboard', { timeout: 15000 });
  await page.waitForTimeout(600);
  console.log(`2. Logged in as ${USERNAME}.`);
  await page.screenshot({ path: `screenshots/${TAG}-02-dashboard.png`, fullPage: true });

  const tabs = [
    ['New Trip', '03-new-trip'],
    ['Scheduling', '04-scheduling'],
    ['Trip Log', '05-trip-log'],
    ['Overtime', '06-overtime'],
    ['Stock Requests', '07-stock-requests'],
    ['Reports & Exports', '08-reports'],
    ['Settings', '09-settings'],
    ['Dashboard', '10-dashboard-again'],
  ];

  let i = 2;
  for (const [label, file] of tabs) {
    i += 1;
    try {
      await page.click(`button:has-text("${label}")`, { timeout: 8000 });
      await page.waitForTimeout(700);
      const bodyText = await page.evaluate(() => document.body.innerText);
      await page.screenshot({ path: `screenshots/${TAG}-${file}.png`, fullPage: true });
      console.log(`${i}. Tab "${label}" OK (${bodyText.length} chars of visible text)`);
    } catch (e) {
      errors.push(`tab "${label}": ${e.message}`);
      console.log(`${i}. Tab "${label}" FAILED: ${e.message}`);
    }
  }

  // Mobile paramedic view (renders MobileStockRequest, incl. new Shift selector)
  try {
    const hamburger = page.locator('button[title*="Mobile" i]').first();
    if (await hamburger.count()) await hamburger.click();
    await page.waitForTimeout(800);
    const shiftSelect = page.locator('select').filter({ hasText: 'Night' });
    const shiftCount = await shiftSelect.count();
    console.log(`13. Mobile stock view: shift selector found = ${shiftCount > 0}`);
    await page.screenshot({ path: `screenshots/${TAG}-11-mobile-stock.png`, fullPage: true });
  } catch (e) {
    warnings.push(`mobile view check skipped: ${e.message}`);
  }

  await browser.close();

  console.log('\n--- browser results ---');
  console.log(`console errors : ${errors.length}`);
  console.log(`page warnings  : ${warnings.length}`);
  console.log(`failed requests: ${failedRequests.length}`);
  if (errors.length) console.log('\nERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  if (warnings.length)
    console.log('\nWARNINGS:\n' + warnings.slice(0, 10).map((e) => ' - ' + e).join('\n'));
  if (failedRequests.length)
    console.log('\nFAILED REQUESTS:\n' + failedRequests.map((e) => ' - ' + e).join('\n'));

  process.exit(errors.length ? 1 : 0);
})();
