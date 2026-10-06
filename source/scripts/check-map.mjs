import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { cruises } from '../src/data.js';

// Run against Vite, a production preview, or the published GitHub Pages site.
// ATLAS_URL=http://localhost:5175/ node scripts/check-map.mjs
const atlasUrl = new URL(process.env.ATLAS_URL || 'http://localhost:5175/');
atlasUrl.search = '';
atlasUrl.hash = '';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const departures = new Map();
for (const cruise of cruises) {
  const port = cruise.ports[0];
  const key = `${Number(port.lon)},${Number(port.lat)}`;
  if (!departures.has(key)) departures.set(key, { ...port, cruises: [] });
  departures.get(key).cruises.push(cruise);
}
const errors = [];
const observeErrors = page => {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
};
const closeEnough = (actual, expected, tolerance, label) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${label}: expected ${expected}, received ${actual}`,
);
const group = (page, name) => page.locator(`.atlas-map__departure[data-port-name="${name}"]`);
const vessel = page => page.locator('.atlas-map__vessel');
const sailingState = page => vessel(page).evaluate(element => ({
  id: Number(element.dataset.cruiseId),
  lon: Number(element.dataset.lon),
  lat: Number(element.dataset.lat),
  progress: Number(element.dataset.progress),
}));
const assertFrozen = (before, after, label) => {
  closeEnough(after.progress, before.progress, 0.00001, `${label}: voyage progress`);
  closeEnough(after.lon, before.lon, 0.00001, `${label}: longitude`);
  closeEnough(after.lat, before.lat, 0.00001, `${label}: latitude`);
};

// Compare the marker's actual rendered geographic origin with the actual route
// path's starting point. This does not reproduce the map's projection or layout.
async function checkDepartureAnchors(page, label, visibleCruises = cruises) {
  const expected = [...departures.values()].map(port => ({
    name: port.name, lon: Number(port.lon), lat: Number(port.lat),
    ids: port.cruises.filter(cruise => visibleCruises.some(item => item.id === cruise.id)).map(cruise => cruise.id),
  })).filter(port => port.ids.length);
  const results = await page.evaluate(ports => [...document.querySelectorAll('.atlas-map__departure')].map(marker => {
    const port = ports.find(item => Number(marker.dataset.lon) === item.lon && Number(marker.dataset.lat) === item.lat);
    const path = port && document.querySelector(`.atlas-map__route-hit[data-cruise-id="${port.ids[0]}"]`);
    if (!port || !path) return { name: marker.dataset.portName, missing: true };
    const point = path.getPointAtLength(0).matrixTransform(path.getScreenCTM());
    const anchor = new DOMPoint(0, 0).matrixTransform(marker.getScreenCTM());
    return {
      name: port.name, count: Number(marker.dataset.count), ports: Number(marker.dataset.portCount),
      ownCount: port.ids.length, error: Math.hypot(point.x - anchor.x, point.y - anchor.y),
    };
  }), expected);
  assert.ok(results.length > 0 && results.length <= expected.length, `${label}: valid departure clustering`);
  assert.equal(results.reduce((sum, group) => sum + group.count, 0), visibleCruises.length, `${label}: every voyage belongs to a departure group`);
  assert.equal(results.reduce((sum, group) => sum + group.ports, 0), expected.length, `${label}: every departure port is represented`);
  for (const result of results) {
    assert.ok(!result.missing, `${label}: ${result.name} is not anchored on a real departure port`);
    assert.ok(result.count >= result.ownCount, `${label}: ${result.name} includes all voyages from its anchor port`);
    if (result.ports === 1) assert.equal(result.count, result.ownCount, `${label}: ${result.name} voyage count`);
    assert.ok(result.error < 0.4, `${label}: ${result.name} slid ${result.error.toFixed(2)}px away from its geographic route origin`);
  }
}

async function checkVesselOnRoute(page, label) {
  const result = await vessel(page).evaluate(element => {
    const route = document.querySelector(`.atlas-map__route-hit[data-cruise-id="${element.dataset.cruiseId}"]`);
    if (!route) return { missing: true };
    const point = new DOMPoint(0, 0).matrixTransform(element.getScreenCTM());
    const matrix = route.getScreenCTM();
    const length = route.getTotalLength();
    let nearest = Infinity;
    for (let index = 0; index <= 2000; index += 1) {
      const sample = route.getPointAtLength(length * index / 2000).matrixTransform(matrix);
      nearest = Math.min(nearest, Math.hypot(point.x - sample.x, point.y - sample.y));
    }
    return { nearest, progress: Number(element.dataset.progress) };
  });
  assert.ok(!result.missing, `${label}: selected route missing`);
  assert.ok(result.nearest < 2, `${label}: vessel left its route by ${result.nearest.toFixed(2)}px`);
  assert.ok(result.progress >= 0 && result.progress <= 1, `${label}: invalid voyage progress`);
}

async function clickRoute(page, cruiseId) {
  // Find an exposed part of the actual hit path; use a real pointer click rather
  // than dispatching a synthetic click that could hide hit-target problems.
  const point = await page.locator(`.atlas-map__route-hit[data-cruise-id="${cruiseId}"]`).evaluate(path => {
    const matrix = path.getScreenCTM();
    const length = path.getTotalLength();
    for (let index = 1; index < 200; index += 1) {
      const point = path.getPointAtLength(length * index / 200).matrixTransform(matrix);
      const hit = document.elementFromPoint(point.x, point.y)?.closest('.atlas-map__route-hit');
      if (hit === path) return { x: point.x, y: point.y };
    }
    return null;
  });
  assert.ok(point, `Voyage ${cruiseId} has no exposed clickable route segment`);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(id => new URL(location.href).searchParams.get('cruise') === String(id), cruiseId);
  assert.equal(Number(await vessel(page).getAttribute('data-cruise-id')), cruiseId, 'Route click selected its own cruise');
}

async function tapDeparture(page, name) {
  await page.locator('#map').scrollIntoViewIfNeeded();
  const point = await group(page, name).evaluate(element => {
    const point = new DOMPoint(0, 0).matrixTransform(element.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  await page.touchscreen.tap(point.x, point.y);
}

async function touchPinch(page, client, onHold = async () => {}) {
  await page.locator('#map').scrollIntoViewIfNeeded();
  const box = await page.locator('.atlas-map__svg').boundingBox();
  const cx = box.x + box.width * 0.55;
  const cy = box.y + box.height * 0.57;
  const points = spread => [
    { x: cx - spread, y: cy - 12, id: 1, radiusX: 3, radiusY: 3 },
    { x: cx + spread, y: cy + 12, id: 2, radiusX: 3, radiusY: 3 },
  ];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(25) });
  for (const spread of [30, 37, 45, 54, 64]) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(spread) });
    await page.waitForTimeout(25);
  }
  await onHold();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await desktop.newPage();
  observeErrors(page);
  await page.goto(atlasUrl.href);
  await page.locator('.atlas-map__departure').first().waitFor();
  await page.locator('.atlas-map__countries path').first().waitFor();
  assert.equal(departures.size, 15, 'The real logbook has 15 distinct departure ports');
  await checkDepartureAnchors(page, 'Initial world map');
  await page.waitForTimeout(250);
  await checkDepartureAnchors(page, 'Stationary world map');

  for (const control of ['#zoom-in', '#zoom-in', '#zoom-out']) {
    await page.locator(control).click();
    await checkDepartureAnchors(page, `After ${control}`);
  }
  const mapBox = await page.locator('.atlas-map__svg').boundingBox();
  const previousTransform = await page.locator('.atlas-map__geography').getAttribute('transform');
  await page.mouse.move(mapBox.x + mapBox.width * 0.75, mapBox.y + mapBox.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + mapBox.width * 0.65, mapBox.y + mapBox.height * 0.75, { steps: 8 });
  await checkDepartureAnchors(page, 'During mouse pan');
  await page.mouse.up();
  assert.notEqual(await page.locator('.atlas-map__geography').getAttribute('transform'), previousTransform, 'Pan changes the map camera');
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(220);
  await checkDepartureAnchors(page, 'After wheel zoom');
  await page.setViewportSize({ width: 1000, height: 844 });
  await page.waitForTimeout(150);
  await checkDepartureAnchors(page, 'After resizing the map');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#reset-map').click();

  const worldCamera = await page.locator('.atlas-map__geography').getAttribute('transform');
  await group(page, 'Port Canaveral').press('Enter');
  assert.ok(await page.locator('.atlas-map__dock-option').count() >= 4, 'Nearby departure chooser separates Florida harbors');
  for (const [name, count] of [['Miami', 4], ['Fort Lauderdale', 2], ['Port Canaveral', 8]]) {
    assert.match(await page.locator(`.atlas-map__dock-option[data-port-name="${name}"]`).textContent(), new RegExp(`${count} voyages`));
  }
  await page.locator('.atlas-map__dock-option[data-port-name="Miami"]').click();
  assert.equal(await group(page, 'Miami').getAttribute('data-count'), '4');
  assert.equal(await group(page, 'Fort Lauderdale').getAttribute('data-count'), '2');
  assert.notEqual(await page.locator('.atlas-map__geography').getAttribute('transform'), worldCamera, 'Opening Miami zooms to its departure port');
  await page.locator('.atlas-map__voyage-option').first().waitFor();
  const miami = departures.get('-80.1765,25.7783').cruises;
  assert.equal(await page.locator('.atlas-map__voyage-option').count(), miami.length, 'Miami chooser contains four voyages');
  for (const cruise of miami) {
    const option = page.locator(`.atlas-map__voyage-option[data-cruise-id="${cruise.id}"]`);
    assert.match(await option.textContent(), new RegExp(cruise.ship));
    assert.match(await option.textContent(), new RegExp(String(cruise.year)), 'Chooser includes voyage date');
  }
  await page.locator('.atlas-map__voyage-option[data-cruise-id="4"]').hover();
  const portCamera = await page.locator('.atlas-map__geography').getAttribute('transform');
  await page.locator('.atlas-map__voyage-option[data-cruise-id="4"]').click();
  await page.locator('.detail-heading h1').waitFor();
  assert.equal(await page.locator('.detail-heading h1').textContent(), 'Carnival Triumph');
  assert.notEqual(await page.locator('.atlas-map__geography').getAttribute('transform'), portCamera, 'Selecting a departure voyage refits its whole route');
  const selectedBounds = await page.locator('.atlas-map__route-hit[data-cruise-id="4"]').boundingBox();
  const focusedMap = await page.locator('.atlas-map__svg').boundingBox();
  assert.ok(selectedBounds.x >= focusedMap.x - 1 && selectedBounds.y >= focusedMap.y - 1
    && selectedBounds.x + selectedBounds.width <= focusedMap.x + focusedMap.width + 1
    && selectedBounds.y + selectedBounds.height <= focusedMap.y + focusedMap.height + 1, 'Selected cruise fits completely in the map');
  const still = await sailingState(page);
  assert.equal(still.progress, 0, 'Reduced motion keeps selected ship at departure');
  closeEnough(still.lon, -80.1765, 0.00001, 'Miami longitude');
  closeEnough(still.lat, 25.7783, 0.00001, 'Miami latitude');
  await page.waitForTimeout(300);
  assertFrozen(still, await sailingState(page), 'Reduced motion');
  await checkVesselOnRoute(page, 'Selected ship at departure');

  await page.locator('#reset-map').click();
  await clickRoute(page, 8);
  assert.equal(await page.locator('.detail-heading h1').textContent(), 'Oosterdam');
  await page.locator('[data-year="2022"]').click();
  const cruises2022 = cruises.filter(cruise => cruise.year === 2022);
  await checkDepartureAnchors(page, '2022 filter', cruises2022);
  assert.equal(await page.locator('.atlas-map__route-hit').count(), 3, 'Year filter updates route hit targets');
  await page.locator('#all-years').click();
  await checkDepartureAnchors(page, 'Cleared year filter');

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  const phone = await mobile.newPage();
  observeErrors(phone);
  await phone.goto(atlasUrl.href);
  await phone.locator('.atlas-map__departure').first().waitFor();
  await tapDeparture(phone, 'Port Canaveral');
  await phone.locator('.atlas-map__dock-option[data-port-name="Miami"]').tap();
  assert.equal(await phone.locator('.atlas-map__voyage-option').count(), 4, 'Real phone tap opens Miami voyages');
  await phone.screenshot({ path: process.env.MAP_SCREENSHOT || '/tmp/map-miami-phone-final.png', fullPage: true });
  await phone.setViewportSize({ width: 320, height: 844 });
  await phone.waitForTimeout(150);
  const closeBox = await phone.locator('.atlas-map__close').boundingBox();
  assert.ok(closeBox.x >= 0 && closeBox.x + closeBox.width <= 320, 'Chooser close button stays reachable at 320px');
  const list = await phone.locator('.atlas-map__chooser-list').evaluate(element => ({ content: element.scrollHeight, height: element.clientHeight }));
  assert.ok(list.height > 0 && list.content > list.height, '320px chooser provides a scrollable voyage list');
  await phone.locator('.atlas-map__close').tap();
  assert.equal(await phone.locator('.atlas-map__chooser').isVisible(), false, 'Phone chooser closes by touch');
  await tapDeparture(phone, 'Miami');
  await phone.locator('.atlas-map__voyage-option[data-cruise-id="26"]').tap();
  assert.equal(new URL(phone.url()).searchParams.get('cruise'), '26', 'Phone can scroll to and select the last Miami voyage');
  assert.equal(await phone.locator('.detail-heading h1').textContent(), 'Norwegian Bliss');
  await phone.locator('.brand').tap();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.waitForTimeout(150);
  const client = await mobile.newCDPSession(phone);
  const beforePinch = await phone.locator('.atlas-map__geography').getAttribute('transform');
  await touchPinch(phone, client, () => checkDepartureAnchors(phone, 'During phone pinch'));
  assert.notEqual(await phone.locator('.atlas-map__geography').getAttribute('transform'), beforePinch, 'Native phone pinch changes the map camera');
  await checkDepartureAnchors(phone, 'After phone pinch');

  await phone.locator('#motion').click();
  await phone.locator('#reset-map').click();
  await phone.waitForTimeout(900);
  await tapDeparture(phone, 'Port Canaveral');
  await phone.locator('.atlas-map__dock-option[data-port-name="Port Canaveral"]').click();
  assert.equal(await phone.locator('.atlas-map__voyage-option').count(), 8, 'Port Canaveral chooser has eight voyages');
  await phone.locator('.atlas-map__voyage-option[data-cruise-id="3"]').click();
  await phone.waitForFunction(() => Number(document.querySelector('.atlas-map__vessel')?.dataset.progress) > 0.03);
  await checkVesselOnRoute(phone, 'Sailing before touch gesture');
  let held;
  await touchPinch(phone, client, async () => {
    held = await sailingState(phone);
    await phone.waitForTimeout(500);
    assertFrozen(held, await sailingState(phone), 'Touch gesture pauses voyage');
    await checkVesselOnRoute(phone, 'Sailing ship stays anchored during pinch');
  });
  await checkVesselOnRoute(phone, 'Sailing resumes after pinch');
  assert.ok((await sailingState(phone)).progress > held.progress, 'Voyage resumes after touch ends');

  await phone.locator('[data-view="statistics"]').click();
  const paused = await sailingState(phone);
  await phone.waitForTimeout(600);
  assertFrozen(paused, await sailingState(phone), 'Hidden Statistics view pauses map');
  await phone.locator('[data-view="atlas"]').click();
  await phone.waitForTimeout(250);
  assert.ok((await sailingState(phone)).progress >= paused.progress, 'Returning to atlas preserves voyage progress');
  await checkVesselOnRoute(phone, 'Returning from Statistics');
  await phone.waitForFunction(() => Number(document.querySelector('.atlas-map__vessel')?.dataset.progress) === 1, null, { timeout: 20000 });
  const completed = await sailingState(phone);
  const cruise = cruises.find(item => item.id === 3);
  closeEnough(completed.lon, cruise.ports.at(-1).lon, 0.00001, 'Completed round trip longitude');
  closeEnough(completed.lat, cruise.ports.at(-1).lat, 0.00001, 'Completed round trip latitude');
  await checkVesselOnRoute(phone, 'Completed round trip');
  await phone.waitForTimeout(600);
  assertFrozen(completed, await sailingState(phone), 'Completed voyage does not loop');
  assert.deepEqual(errors, [], 'Browser runtime or console errors');
  console.log('Map checks passed: 15 departure ports with exact geographic cluster anchors, port grouping and dates, route clicks, zoom/pan/resize, native phone pinch, geographic sailing, gesture/hidden-view pause, one complete round trip, filters, and reduced motion.');
} finally {
  await browser.close();
}
