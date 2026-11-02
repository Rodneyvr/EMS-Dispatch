/**
 * Verifies the mobile stock-request Shift field end to end:
 * open Paramedic view -> set Shift = Night -> add item -> review -> submit
 * -> assert the persisted StockRequest has shift === 'Night'.
 * Usage: node scripts/verify-shift.cjs [baseUrl]
 * Requires the Chromium browser once: npx playwright install chromium
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3000';
const errors = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 500, height: 950 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console.error: ${m.text()}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="e.g. dispatcher1 or admin"]', 'admin');
  await page.fill('input[placeholder="Enter security password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dashboard', { timeout: 15000 });

  // Open the paramedic mobile stock app
  await page.click('button[title*="Mobile-First Stock Request" i]');
  await page.waitForSelector('text=Ambulance', { timeout: 15000 });
  console.log('1. Opened mobile stock request view');

  // Identify the Shift select by its options (other selects hold bases/ambulances/roles)
  const shiftSelect = page
    .locator('select')
    .filter({ has: page.locator('option[value="Night"]') })
    .first();
  const options = await shiftSelect.locator('option').allInnerTexts();
  const defaultShift = await shiftSelect.inputValue();
  console.log(`2. Shift selector options=[${options.join(', ')}] default=${defaultShift}`);

  await shiftSelect.selectOption('Night');
  console.log('3. Selected Night shift');

  // Add one item via the custom-item form
  await page.fill('input[placeholder^="Item description"]', 'Smoke test dressing pack');
  await page.click('button:has-text("+ Add Custom Item")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Review & Submit")');
  await page.waitForTimeout(500);
  const reviewText = await page.evaluate(() => document.body.innerText);
  const showsNight = /Night\s+Shift/.test(reviewText);
  console.log(`4. Review screen shows "Night Shift": ${showsNight}`);
  await page.screenshot({ path: 'screenshots/verify-shift-review.png', fullPage: true });

  await page.click('button:has-text("Confirm & Send to Stock Controller")');
  await page.waitForTimeout(800);

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('resq_stock_requests_v1');
    const list = raw ? JSON.parse(raw) : [];
    return list.map((r) => ({ id: r.id, shift: r.shift, urgency: r.urgency, status: r.status }));
  });
  const latest = saved[0];
  console.log(`5. Persisted requests: ${saved.length}, newest = ${JSON.stringify(latest)}`);
  const ok = latest && latest.shift === 'Night';
  console.log(`\nRESULT: shift captured as "${latest && latest.shift}" (expected "Night") -> ${ok ? 'PASS' : 'FAIL'}`);

  await browser.close();
  if (errors.length) {
    console.log('\nBROWSER ERRORS:\n' + errors.join('\n'));
  }
  process.exit(ok && !errors.length ? 0 : 1);
})();
