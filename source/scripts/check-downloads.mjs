import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { unzipSync } from 'fflate';

// ATLAS_URL=http://localhost:4176/ node scripts/check-downloads.mjs
// Also works against the published GitHub Pages project URL.
const atlasUrl = new URL(process.env.ATLAS_URL || 'http://localhost:4176/');
atlasUrl.search = '';
atlasUrl.hash = '';
if (!atlasUrl.pathname.endsWith('/')) atlasUrl.pathname += '/';
const fileNames = [
  'little-voyages-complete.zip',
  'little-voyages-logbook.json',
  'little-voyages-statistics.json',
  'little-voyages-cruises.csv',
  'little-voyages-ports.csv',
  'little-voyages-routes.geojson',
  'little-voyages-guide.md',
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});

try {
  const context = await browser.newContext({
    acceptDownloads: true,
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
  const filteredUrl = new URL(atlasUrl);
  filteredUrl.search = '?year=2022';
  await page.goto(filteredUrl.href);
  await page.locator('.cruise-card').first().waitFor();
  assert.equal(await page.locator('.cruise-card').count(), 3, 'The map is filtered before exporting');
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bnoai\b/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bnoimageai\b/);

  const dialog = page.locator('#about-dialog');
  const aboutButton = page.locator('#about');
  const options = dialog.locator('details.download-options');
  const summary = options.locator('summary');
  await aboutButton.press('Enter');
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await options.evaluate(element => element.open), false);
  assert.equal(await dialog.locator('a.download-file').count(), 6);
  assert.equal(await dialog.locator('#download').isVisible(), false);
  await summary.press('Enter');
  assert.equal(await options.evaluate(element => element.open), true);
  assert.equal(await dialog.locator('#download').isVisible(), true);
  await summary.press('Space');
  assert.equal(await options.evaluate(element => element.open), false);
  await summary.press('Space');
  assert.equal(await options.evaluate(element => element.open), true);

  const links = dialog.locator('a.download-bundle, a.download-file');
  assert.equal(await links.count(), fileNames.length);
  const downloaded = new Map();
  for (let index = 0; index < fileNames.length; index += 1) {
    const link = links.nth(index);
    const name = fileNames[index];
    const href = new URL(await link.getAttribute('href'), page.url());
    assert.equal(href.href, new URL(`downloads/${name}`, atlasUrl).href, `${name} stays inside this project`);
    assert.equal(await link.getAttribute('download'), name);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      link.click(),
    ]);
    assert.equal(download.suggestedFilename(), name);
    assert.equal(await download.failure(), null, `${name} downloads successfully`);
    const bytes = await readFile(await download.path());
    assert.ok(bytes.byteLength > 100, `${name} is not an empty file`);
    downloaded.set(name, bytes);
  }
  assert.equal(new URL(page.url()).searchParams.get('year'), '2022', 'Downloading leaves the map filter in place');

  const archive = downloaded.get(fileNames[0]);
  assert.equal(archive.readUInt32LE(0), 0x04034b50, 'The bundle is a ZIP file');
  const archiveFiles = unzipSync(archive);
  assert.deepEqual(Object.keys(archiveFiles).sort(), fileNames.slice(1).sort(), 'The bundle contains all six individual files');
  for (const name of fileNames.slice(1)) {
    assert.deepEqual(Buffer.from(archiveFiles[name]), downloaded.get(name), `${name} matches its standalone download`);
  }

  // Export content assertions are below; the data tests cover serialization edge cases.
  const logbook = JSON.parse(downloaded.get('little-voyages-logbook.json').toString('utf8'));
  const statistics = JSON.parse(downloaded.get('little-voyages-statistics.json').toString('utf8'));
  const routes = JSON.parse(downloaded.get('little-voyages-routes.geojson').toString('utf8'));
  for (const exported of [logbook, statistics, routes]) {
    assert.equal(exported.schemaVersion, 1);
    assert.equal(exported.title, 'Little Voyages');
    assert.match(exported.scope, /complete.*independent of map filters/i);
    assert.match(exported.collectionSha256, /^[a-f0-9]{64}$/);
    assert.equal(exported.collectionSha256, logbook.collectionSha256);
    assert.match(exported.usage.authorizedUse, /authoriz/i);
    assert.match(exported.usage.restrictions, /training/i);
  }
  assert.equal(logbook.cruises.length, 29, 'The JSON contains all cruises despite the 2022 map filter');
  assert.equal(new Set(logbook.cruises.map(cruise => cruise.id)).size, 29);
  assert.equal(logbook.cruises.find(cruise => cruise.id === 3).ship, 'Disney Wonder');
  assert.equal(logbook.cruises.find(cruise => cruise.id === 25).nights, 7);
  assert.equal(logbook.collectionSha256, createHash('sha256').update(JSON.stringify(logbook.cruises)).digest('hex'));
  for (const cruise of logbook.cruises) {
    assert.ok(cruise.ports.length > 1 && cruise.route.length > 1);
    assert.ok(cruise.notes.length > 0 && cruise.sources.length > 0);
    assert.match(cruise.confidence, /^(confirmed|likely|unresolved)$/);
  }
  assert.equal(statistics.statistics.cruiseCount, 29);
  assert.equal(statistics.statistics.totalNights, 202);
  assert.equal(statistics.statistics.countryCount, 36);
  assert.equal(statistics.statistics.territoryCount, 9);
  assert.equal(statistics.statistics.countries.length, 36);
  assert.equal(statistics.statistics.territories.length, 9);
  assert.equal(statistics.statistics.placeCount, 45);
  assert.equal(statistics.statistics.itineraryPlaceCount, 44);
  assert.equal(statistics.statistics.uniquePorts, 87);
  assert.deepEqual(statistics.personalVisits, logbook.personalVisits, 'Both JSON downloads preserve the same owner-reported visits');
  for (const exported of [logbook, statistics]) {
    assert.match(exported.personalVisitsSha256, /^[a-f0-9]{64}$/);
    assert.equal(exported.personalVisitsSha256, createHash('sha256').update(JSON.stringify(exported.personalVisits)).digest('hex'));
  }
  const { shoreExcursions, nonCruiseVisits } = logbook.personalVisits;
  assert.equal(shoreExcursions.length, 1);
  assert.equal(shoreExcursions[0].name, 'Vatican City');
  assert.equal(shoreExcursions[0].flag, '🇻🇦');
  assert.equal(shoreExcursions[0].approximateVisits, 2);
  assert.equal(shoreExcursions[0].evidence, 'owner-reported');
  assert.deepEqual(shoreExcursions[0].cruiseIds, [], 'The Vatican visit has no invented sailing association');
  assert.match(shoreExcursions[0].note, /not a cruise port/i);
  const vatican = statistics.statistics.countries.find(place => place.name === 'Vatican City');
  assert.equal(vatican.isShoreExcursion, true);
  assert.equal(vatican.approximateVisits, 2);
  assert.deepEqual(vatican.ports, []);
  assert.deepEqual(vatican.cruiseIds, []);
  assert.deepEqual(statistics.statistics.shoreExcursionPlaces, [vatican]);
  assert.deepEqual(nonCruiseVisits.countries.map(place => [place.name, place.flag]), [
    ['Egypt', '🇪🇬'], ['South Africa', '🇿🇦'], ['India', '🇮🇳'], ['Israel', '🇮🇱'], ['China', '🇨🇳'],
  ]);
  assert.deepEqual(nonCruiseVisits.specialPlaces.map(place => [place.name, place.flag]), [
    ['Palestine', '🇵🇸'], ['Hong Kong', '🇭🇰'],
  ]);
  assert.equal(nonCruiseVisits.specialPlaces[0].status, 'UN non-member observer State');
  assert.equal(nonCruiseVisits.specialPlaces[1].status, 'Special Administrative Region of China');
  const nonCruiseNames = [...nonCruiseVisits.countries, ...nonCruiseVisits.specialPlaces].map(place => place.name);
  assert.deepEqual([...statistics.statistics.countries, ...statistics.statistics.territories].filter(place => nonCruiseNames.includes(place.name)), [], 'Non-cruise destinations do not contribute to cruise totals');
  assert.deepEqual(logbook.cruises.flatMap(cruise => cruise.ports).filter(port => port.country === 'Vatican City' || nonCruiseNames.includes(port.country)), [], 'Personal visits are not converted into ship port calls');
  assert.match(statistics.methodology.destinations, /departure.*arrival/i);
  assert.match(statistics.precision, /illustrative routes/i);
  assert.equal(routes.type, 'FeatureCollection');
  assert.equal(routes.features.length, 29);
  for (const feature of routes.features) {
    assert.equal(feature.type, 'Feature');
    assert.ok(feature.properties && feature.geometry, 'Each map feature includes context and geometry');
    assert.equal(feature.properties.illustrative, true);
    assert.equal(feature.id, feature.properties.cruiseId);
    assert.equal(feature.geometry.type, 'LineString');
    const cruise = logbook.cruises.find(record => record.id === feature.id);
    assert.deepEqual(feature.geometry.coordinates, cruise.route);
  }
  for (const name of ['little-voyages-cruises.csv', 'little-voyages-ports.csv']) {
    const csv = downloaded.get(name).toString('utf8').replace(/^\uFEFF/, '');
    assert.match(csv.split(/\r?\n/, 1)[0], /cruise/i);
    assert.match(csv, /Disney Wonder/);
    assert.match(csv, /Mardi Gras/);
    assert.doesNotMatch(csv, /Vatican City/, 'The shore excursion does not create a CSV port call or sailing');
    assert.ok(csv.split(/\r?\n/).length > 29);
  }
  const guide = downloaded.get('little-voyages-guide.md').toString('utf8');
  assert.match(guide, /Little Voyages/);
  assert.match(guide, /29/);
  assert.match(guide, /illustrat|reconstruct/i);
  assert.match(guide, /permission|authoriz/i);
  assert.match(guide, /https:\/\//);
  assert.match(guide, /Vatican City\*/);
  assert.match(guide, /approximately twice/);
  assert.match(guide, /non-cruise visits/i);
  assert.match(guide, /UN non-member observer State/);
  assert.match(guide, /Special Administrative Region of China/);
  assert.ok(guide.includes(logbook.personalVisitsSha256));
  assert.equal(guide.match(/^### Cruise \d+:/gm).length, 29, 'The readable guide retains every voyage’s research');

  const usageLink = dialog.getByRole('link', { name: 'Read the usage policy' });
  assert.equal(await usageLink.getAttribute('href'), 'https://github.com/dev1niscool/little-voyages/blob/main/AI-USAGE.md');
  const securityLink = dialog.getByRole('link', { name: /Security & reporting/ });
  assert.equal(await securityLink.getAttribute('href'), 'https://github.com/dev1niscool/little-voyages/blob/main/SECURITY.md');
  for (const name of ['AI-USAGE.md', 'SECURITY.md', 'robots.txt']) {
    const response = await context.request.get(new URL(name, atlasUrl).href);
    assert.equal(response.status(), 200, `${name} is published within this project`);
    assert.ok((await response.text()).length > 100);
  }

  await summary.focus();
  await page.keyboard.press('Escape');
  assert.equal(await dialog.isVisible(), false);
  assert.equal(await aboutButton.evaluate(element => element === document.activeElement), true, 'Escape returns focus to the About button');

  for (const theme of ['light', 'dark']) {
    if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) {
      await page.locator('#theme-toggle').click();
    }
    for (const width of [320, 390, 800, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await aboutButton.press('Enter');
      if (!await options.evaluate(element => element.open)) await summary.press('Enter');
      const dimensions = await dialog.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const initially = element.scrollTop;
        element.scrollTop = element.scrollHeight;
        const scrolls = element.scrollTop > 0;
        element.scrollTop = initially;
        return {
          actual: document.documentElement.scrollWidth,
          expected: window.innerWidth,
          dialogWidth: element.clientWidth,
          contentWidth: element.scrollWidth,
          top: bounds.top,
          bottom: bounds.bottom,
          height: window.innerHeight,
          scrolls,
        };
      });
      const label = `${width}px ${theme} expanded downloads`;
      assert.ok(dimensions.actual <= dimensions.expected + 1, `${label}: no horizontal page overflow`);
      assert.ok(dimensions.contentWidth <= dimensions.dialogWidth + 1, `${label}: no horizontal dialog overflow`);
      assert.ok(dimensions.top >= 0 && dimensions.bottom <= dimensions.height + 1, `${label}: dialog stays in the viewport`);
      assert.equal(dimensions.scrolls, true, `${label}: long dialog can scroll`);
      const overflowingCards = await links.evaluateAll(elements => elements
        .filter(element => element.scrollWidth > element.clientWidth + 1)
        .map(element => element.getAttribute('download')));
      assert.deepEqual(overflowingCards, [], `${label}: download cards contain their text`);
      await securityLink.scrollIntoViewIfNeeded();
      assert.equal(await securityLink.isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await aboutButton.evaluate(element => element === document.activeElement), true);
    }
  }
  assert.deepEqual(browserErrors, [], 'No browser runtime or console errors');
  console.log('Download browser checks passed: seven real downloads, complete ZIP, full collection and separately preserved personal visits under year filtering, verified fingerprints, no invented port calls, policy files and metadata, keyboard controls, focus return, and expanded 320–1440px layouts in both themes.');
} finally {
  await browser.close();
}
