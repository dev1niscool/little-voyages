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
  const checkPassportCounts = async () => {
    assert.equal(await page.locator('.stats-country-count').textContent(), '36');
    assert.equal(await page.locator('.stats-territory-count').textContent(), '9');
    assert.equal(await page.locator('#stats-country-list .stats-country-item').count(), 36);
    assert.equal(await page.locator('#stats-territory-list .stats-territory-item').count(), 9);
    assert.equal(await page.locator('.stats-land-country-count').textContent(), '5');
    assert.equal(await page.locator('.stats-land-territory-count').textContent(), '2');
    assert.equal(await page.locator('.stats-land-country-item').count(), 5);
    assert.equal(await page.locator('.stats-land-territory-item').count(), 2);
  };
  const passportLists = ['#stats-country-list', '#stats-territory-list', '#stats-land-country-list', '#stats-land-territory-list'];
  const expandPassportLists = async () => {
    for (const selector of passportLists) {
      if (!await page.locator(selector).evaluate(details => details.open)) {
        await page.locator(`${selector} > summary`).click();
      }
      assert.equal(await page.locator(`${selector} > ul`).isVisible(), true);
    }
  };

  await page.goto(atlasUrl.href);
  await page.locator('.atlas-map__departure').first().waitFor();
  assert.ok(await page.locator('.atlas-map__departure').count() > 0);
  assert.equal(await page.locator('.atlas-map__departure').evaluateAll(markers => markers.reduce((sum, marker) => sum + Number(marker.dataset.portCount), 0)), 15);
  assert.equal(await page.locator('.atlas-map__departure').evaluateAll(markers => markers.reduce((sum, marker) => sum + Number(marker.dataset.count), 0)), 29);
  assert.equal(await page.locator('.cruise-card').count(), 29);
  await checkNoPageOverflow('Desktop atlas');

  await page.locator('[data-view="statistics"]').press('Enter');
  await waitForView('statistics');
  assert.equal(new URL(page.url()).searchParams.get('view'), 'statistics');
  assert.deepEqual(await page.locator('[data-stats-count]').allTextContents(), [
    '202', '55,200', '2.2', '4,848', '87', '45', '36', '9', '5', '2',
  ]);
  await checkPassportCounts();
  const countryNames = await page.locator('#stats-country-list .stats-country-item strong').allTextContents();
  const specialNames = await page.locator('#stats-territory-list .stats-territory-item strong').allTextContents();
  assert.equal(new Set([...countryNames, ...specialNames]).size, 45, 'Cruise places appear in exactly one category');
  assert.equal(countryNames.filter(name => name === 'United Kingdom').length, 1);
  assert.equal(countryNames.includes('Scotland'), false);
  assert.equal(countryNames.includes('Northern Ireland'), false);
  assert.equal([...countryNames, ...specialNames].includes('Saint Martin'), false, 'Dutch port calls do not imply visiting French Saint Martin');
  assert.deepEqual(specialNames, [
    'Aruba', 'Cayman Islands', 'Curaçao', 'Gibraltar', 'Guernsey',
    'Puerto Rico', 'Sint Maarten', 'Turks and Caicos Islands', 'U.S. Virgin Islands',
  ]);
  const statuses = await page.locator('#stats-territory-list .stats-territory-item').evaluateAll(items => Object.fromEntries(items.map(item => [
    item.querySelector('strong').textContent,
    item.querySelector('.stats-place-status').textContent,
  ])));
  assert.match(statuses.Aruba, /Kingdom of the Netherlands/);
  assert.equal(statuses.Guernsey, 'Crown Dependency');
  assert.equal(statuses['Cayman Islands'], 'British Overseas Territory');
  assert.match(statuses['Puerto Rico'], /U\.S\. territory/);

  const vatican = page.locator('#stats-country-list .stats-country-item').filter({ hasText: 'Vatican City' });
  assert.match(await vatican.locator('strong').textContent(), /^Vatican City\s*\*$/);
  assert.equal(await vatican.locator('.stats-place-flag').textContent(), '🇻🇦');
  assert.doesNotMatch(await vatican.textContent(), /0 ports|0 cruises/);
  const vaticanNote = await page.locator('#stats-vatican-note').textContent();
  assert.match(vaticanNote, /car|driv/i);
  assert.equal(await page.locator('.stats-country-item').filter({ hasText: 'Vatican City' }).locator('small').textContent(), 'Shore excursion');
  assert.match(vaticanNote, /(?:not|isn[’']t) a (?:cruise )?port/i);

  const landCountries = await page.locator('.stats-land-country-item strong').allTextContents();
  const landSpecialPlaces = await page.locator('.stats-land-territory-item strong').allTextContents();
  assert.deepEqual(landCountries, ['China', 'Egypt', 'India', 'Israel', 'South Africa']);
  assert.deepEqual(landSpecialPlaces, ['Palestine', 'Hong Kong']);
  assert.deepEqual(await page.locator('.stats-land-country-item .stats-place-flag').allTextContents(), ['🇨🇳', '🇪🇬', '🇮🇳', '🇮🇱', '🇿🇦']);
  assert.deepEqual(await page.locator('.stats-land-territory-item .stats-place-flag').allTextContents(), ['🇵🇸', '🇭🇰']);
  assert.equal(await page.locator('#stats-land-territories-title').textContent(), 'territories & special places visited NOT by cruise');
  const countryCountAsterisk = page.locator('.stats-land-count-asterisk');
  assert.equal(await countryCountAsterisk.textContent(), '*');
  assert.equal(await countryCountAsterisk.getAttribute('href'), '#stats-land-count-note');
  assert.equal(await page.locator('.stats-land-number').getAttribute('aria-describedby'), 'stats-land-count-note');
  const countNote = page.locator('#stats-land-count-note');
  const countExplanation = await countNote.textContent();
  assert.match(countExplanation, /\b5\b/);
  assert.match(countExplanation, /\b6\b/);
  assert.match(countExplanation, /Palestine/);
  assert.match(countExplanation, /owner|personal/i);
  assert.match(countExplanation, /U\.S\.|United States/);
  const countryCountSize = await page.locator('.stats-land-country-count').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  const asteriskSize = await countryCountAsterisk.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  assert.ok(asteriskSize < countryCountSize / 2, 'The linked asterisk stays visually subordinate to the country total');
  assert.deepEqual([...landCountries, ...landSpecialPlaces].filter(name => [...countryNames, ...specialNames].includes(name)), [], 'Non-cruise visits do not leak into cruise lists');
  assert.equal(await page.locator('.stats-land-passport').evaluate(section => section.previousElementSibling.classList.contains('stats-passport')), true, 'The non-cruise comparison directly follows the cruising passport');
  assert.match(await page.locator('.stats-land-passport h2').textContent(), /NOT/);
  assert.ok(await page.locator('.stats-land-passport h2 strong').filter({ hasText: /^NOT$/ }).count(), 'NOT is explicitly emphasized');
  const landStatuses = await page.locator('.stats-land-territory-item').evaluateAll(items => Object.fromEntries(items.map(item => [
    item.querySelector('strong').textContent,
    item.querySelector('.stats-place-status').textContent,
  ])));
  assert.match(landStatuses.Palestine, /UN non-member observer State/);
  assert.match(landStatuses['Hong Kong'], /Special Administrative Region of China/);
  const palestine = page.locator('.stats-land-territory-item').filter({ hasText: 'Palestine' });
  const hongKong = page.locator('.stats-land-territory-item').filter({ hasText: 'Hong Kong' });
  assert.match(await palestine.textContent(), /majority|most/i);
  assert.match(await palestine.textContent(), /not (?:by )?(?:the )?(?:U\.S\.|United States)|(?:U\.S\.|United States) does not recognize/i);
  assert.match(await hongKong.textContent(), /separate customs territory/i);
  assert.match(await hongKong.textContent(), /member economy/i);
  for (const domain of ['wto.org', 'apec.org']) {
    const officialLinks = hongKong.locator(`a[href*="${domain}"]`);
    assert.ok(await officialLinks.count() > 0, `Hong Kong links to its official ${domain} membership source`);
    for (const link of await officialLinks.all()) {
      assert.match(await link.getAttribute('href'), /^https:\/\//);
      assert.match(await link.getAttribute('rel'), /noopener/);
    }
  }

  for (const [selector, expectedUrl] of [
    ['#stats-territory-list', 'https://en.wikipedia.org/wiki/Status_of_Gibraltar'],
    ['#stats-land-territory-list', 'https://en.wikipedia.org/wiki/Legal_status_of_Palestine'],
  ]) {
    const link = page.locator(`${selector} a[href="${expectedUrl}"]`);
    assert.equal(await link.count(), 1);
    assert.match(await link.textContent(), /dispute|status|background/i);
    assert.match(await link.getAttribute('rel'), /noopener/);
  }
  for (const [index, selector] of passportLists.entries()) {
    const key = index % 2 ? 'Space' : 'Enter';
    const expectedLabel = index % 2 ? 'List of all special places' : 'List of all countries';
    assert.match(await page.locator(`${selector} > summary`).textContent(), new RegExp(expectedLabel, 'i'));
    assert.equal(await page.locator(`${selector} > summary > svg`).count(), 1, 'Every disclosure has its own arrow');
    const missingFlags = await page.locator(`${selector} > ul > li`).evaluateAll(items => items.filter(item => !item.querySelector('.stats-place-flag')?.textContent.trim()).length);
    assert.equal(missingFlags, 0, 'Every destination includes its flag');
    assert.equal(await page.locator(`${selector} > ul`).isVisible(), false);
    await page.locator(`${selector} > summary`).press(key);
    assert.equal(await page.locator(selector).evaluate(details => details.open), true);
    assert.equal(await page.locator(`${selector} > ul`).isVisible(), true);
    await page.locator(`${selector} > summary`).press(key);
    assert.equal(await page.locator(selector).evaluate(details => details.open), false);
  }
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
  assert.equal(await page.locator('.atlas-map__departure').evaluateAll(markers => markers.reduce((sum, marker) => sum + Number(marker.dataset.portCount), 0)), 3);
  assert.equal(await page.locator('.atlas-map__departure').evaluateAll(markers => markers.reduce((sum, marker) => sum + Number(marker.dataset.count), 0)), 3);
  await page.locator('[data-view="statistics"]').click();
  await waitForView('statistics');
  await checkPassportCounts();
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

  await expandPassportLists();
  for (const theme of ['dark', 'light']) {
    if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) {
      await page.locator('#theme-toggle').click();
    }
    for (const width of [320, 390, 800, 1000, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await checkNoPageOverflow(`${width}px ${theme} statistics with expanded place lists`);
      const overflowingPlaces = await page.locator('.stats-country-item, .stats-territory-item, .stats-land-country-item, .stats-land-territory-item').evaluateAll(items => items
        .filter(item => item.scrollWidth > item.clientWidth + 1)
        .map(item => item.querySelector('strong').textContent));
      assert.deepEqual(overflowingPlaces, [], `${width}px ${theme}: destination row overflow`);
      if (theme === 'dark') {
        await page.locator('[data-view="atlas"]').click();
        await waitForView('atlas');
        await checkNoPageOverflow(`${width}px atlas`);
        await page.locator('[data-view="statistics"]').click();
        await waitForView('statistics');
        await expandPassportLists();
      }
    }
  }

  const deepLink = new URL(atlasUrl);
  deepLink.search = '?view=statistics&year=2022';
  await page.goto(deepLink.href);
  await waitForView('statistics');
  await checkPassportCounts();
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
  console.log('Browser checks passed: navigation, statistics, Vatican shore visit, separate non-cruise comparison, flags and status links, four keyboard disclosures, unit conversions, map callbacks, deep links, dark mode, reduced motion, and expanded 320–1440px layouts.');
} finally {
  await browser.close();
}
