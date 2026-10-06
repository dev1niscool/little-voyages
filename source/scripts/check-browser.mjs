import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Run against Vite, a production preview, or the published GitHub Pages site.
// ATLAS_URL=http://localhost:5175/ node scripts/check-browser.mjs
const atlasUrl = new URL(process.env.ATLAS_URL || 'http://localhost:5175/');
atlasUrl.search = '';
atlasUrl.hash = '';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  const waitForView = view => page.waitForFunction(expected => {
    const stats = document.querySelector('#statistics-page');
    const atlas = document.querySelector('#atlas-page');
    if (!stats || !atlas) return false;
    const statsVisible = !stats.hidden;
    const atlasVisible = !atlas.hidden;
    return statsVisible === (expected === 'statistics') && atlasVisible === (expected === 'atlas');
  }, view);
  const checkNoPageOverflow = async label => {
    const dimensions = await page.evaluate(() => ({
      actual: document.documentElement.scrollWidth,
      expected: window.innerWidth,
    }));
    assert.ok(dimensions.actual <= dimensions.expected + 1, `${label}: horizontal page overflow`);
  };

  await page.goto(atlasUrl.href);
  await page.locator('.atlas-map__ship').first().waitFor();
  assert.equal(await page.locator('.atlas-map__ship').count(), 29);
  assert.equal(await page.locator('.cruise-card').count(), 29);
  await checkNoPageOverflow('Desktop atlas');

  await page.locator('[data-view="statistics"]').press('Enter');
  await waitForView('statistics');
  assert.equal(new URL(page.url()).searchParams.get('view'), 'statistics');
  assert.deepEqual(await page.locator('[data-stats-count]').allTextContents(), [
    '202', '55,200', '2.2', '4,848', '87', '44',
  ]);
  await page.goBack();
  await waitForView('atlas');
  await page.goForward();
  await waitForView('statistics');

  await page.locator('#stats-distance-unit').selectOption('nm');
  assert.equal(await page.locator('.stats-distance-value').textContent(), '48,000');
  await page.locator('#stats-distance-unit').selectOption('km');
  assert.equal(await page.locator('.stats-distance-value').textContent(), '88,900');
  await page.locator('#stats-distance-unit').selectOption('mi');

  await page.locator('[data-stats-year="2022"]').click();
  await waitForView('atlas');
  assert.equal(new URL(page.url()).searchParams.get('year'), '2022');
  assert.equal(await page.locator('.cruise-card').count(), 3);
  assert.equal(await page.locator('.atlas-map__ship').count(), 3);
  await page.locator('[data-view="statistics"]').click();
  await page.locator('.stats-longest-card').click();
  await waitForView('atlas');
  assert.equal(new URL(page.url()).searchParams.get('cruise'), '15');
  assert.equal(new URL(page.url()).searchParams.get('year'), null);
  assert.equal(await page.locator('.detail-heading h1').textContent(), 'Celebrity Silhouette');

  await page.locator('[data-view="statistics"]').click();
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-checked'), 'true');
  await page.reload();
  await waitForView('statistics');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('little-voyages-theme')), 'dark');

  for (const width of [320, 390, 800, 1000, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await checkNoPageOverflow(`${width}px statistics`);
    await page.locator('[data-view="atlas"]').click();
    await waitForView('atlas');
    await checkNoPageOverflow(`${width}px atlas`);
    await page.locator('[data-view="statistics"]').click();
    await waitForView('statistics');
  }

  const deepLink = new URL(atlasUrl);
  deepLink.search = '?view=statistics&year=2022';
  await page.goto(deepLink.href);
  await waitForView('statistics');
  await page.locator('[data-view="atlas"]').click();
  assert.equal(await page.locator('.cruise-card').count(), 3);
  deepLink.search = '?cruise=3';
  await page.goto(deepLink.href);
  await page.locator('.detail-heading h1').waitFor();
  assert.equal(await page.locator('.detail-heading h1').textContent(), 'Disney Wonder');
  assert.match(await page.locator('.detail-heading').textContent(), /Aug 10.*Aug 14, 2008/);

  const systemContext = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const systemPage = await systemContext.newPage();
  systemPage.on('pageerror', error => browserErrors.push(String(error)));
  deepLink.search = '?view=statistics';
  await systemPage.goto(deepLink.href);
  await systemPage.locator('.stats-intro').waitFor();
  assert.equal(await systemPage.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await systemPage.locator('#motion').getAttribute('aria-pressed'), 'false');
  assert.equal(await systemPage.evaluate(() => [...document.querySelectorAll('*')]
    .filter(element => getComputedStyle(element).animationName !== 'none').length), 0);
  await systemPage.emulateMedia({ colorScheme: 'light' });
  await systemPage.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await systemPage.locator('#theme-toggle').click();
  await systemPage.emulateMedia({ colorScheme: 'dark' });
  await systemPage.emulateMedia({ colorScheme: 'light' });
  await systemPage.waitForTimeout(100);
  assert.equal(await systemPage.evaluate(() => document.documentElement.dataset.theme), 'dark');

  assert.deepEqual(browserErrors, [], 'Browser runtime or console errors');
  console.log('Browser checks passed: navigation, statistics, unit conversions, map callbacks, deep links, dark mode, reduced motion, and 320–1440px layouts.');
} finally {
  await browser.close();
}
