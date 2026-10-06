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

async function blankMapPoint(page) {
  await page.locator('#map').scrollIntoViewIfNeeded();
  const point = await page.locator('.atlas-map__svg').evaluate(svg => {
    const box = svg.getBoundingClientRect();
    for (const y of [.45, .6, .3, .75, .9]) {
      for (const x of [.6, .4, .8, .2, .5]) {
        const point = { x: box.x + box.width * x, y: box.y + box.height * y };
        const target = document.elementFromPoint(point.x, point.y);
        if (target === svg || target?.matches('.atlas-map__sea')) return point;
      }
    }
    return null;
  });
  assert.ok(point, 'An uncovered map background is available for clicking out');
  return point;
}

async function clickOut(page, touch = false) {
  const point = await blankMapPoint(page);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function assertUnselected(page, label, year = null) {
  await page.waitForFunction(() => !new URL(location.href).searchParams.has('cruise'));
  assert.equal(await vessel(page).isVisible(), false, `${label}: sailing vessel is hidden`);
  assert.equal(await page.locator('.atlas-map__playback').isVisible(), false, `${label}: playback controls are hidden`);
  assert.equal(await page.locator('.atlas-map__chooser').isVisible(), false, `${label}: departure choices are closed`);
  assert.equal(await page.locator('.atlas-map__route.is-selected').count(), 0, `${label}: route selection is cleared`);
  assert.equal(await page.locator('#map-heading.is-selected').count(), 0, `${label}: voyage heading is cleared`);
  assert.equal(await page.locator('#mobile-details').isVisible(), false, `${label}: mobile voyage details are hidden`);
  assert.ok(await page.locator('.logbook-heading').isVisible(), `${label}: logbook returns`);
  assert.equal(new URL(page.url()).searchParams.get('year'), year === null ? null : String(year), `${label}: year filter is preserved`);
}

async function assertCanceled(page, label, year = null) {
  await assertUnselected(page, label, year);
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.atlas-map__svg').dataset.zoom) - 1) < .001);
}

async function assertUnselectedInPlace(page, label, camera, year = null) {
  await assertUnselected(page, label, year);
  assert.equal(await page.locator('.atlas-map__geography').getAttribute('transform'), camera, `${label}: camera does not jump on close`);
  await page.waitForTimeout(950);
  assert.equal(await page.locator('.atlas-map__geography').getAttribute('transform'), camera, `${label}: camera remains fixed after pending animation time`);
}

async function clickAnotherVisibleRoute(page, previousId) {
  const target = await page.evaluate(previous => {
    for (const path of document.querySelectorAll('.atlas-map__route-hit')) {
      if (Number(path.dataset.cruiseId) === previous) continue;
      const matrix = path.getScreenCTM(), length = path.getTotalLength();
      for (let index = 1; index < 200; index += 1) {
        const point = path.getPointAtLength(length * index / 200).matrixTransform(matrix);
        if (document.elementFromPoint(point.x, point.y)?.closest('.atlas-map__route-hit') === path) {
          return { x: point.x, y: point.y, id: path.dataset.cruiseId };
        }
      }
    }
    return null;
  }, previousId);
  assert.ok(target, 'Another cruise remains available in the unchanged map view');
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(id => new URL(location.href).searchParams.get('cruise') === id, target.id);
}

async function checkHeadingCloseTouchTarget(page, width) {
  const button = page.getByRole('button', { name: 'Unselect voyage', exact: true });
  const box = await button.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44, `${width}px heading close has a 44px touch target`);
  assert.ok(box.x >= 0 && box.x + box.width <= width, `${width}px heading close stays in the viewport`);
  assert.equal(await button.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), true, `${width}px heading close is unobstructed`);
}

async function closeHeading(page, touch = false) {
  // Capture at the click itself so an in-flight focus animation cannot advance
  // between reading the camera and the user's close action.
  const [camera] = await Promise.all([
    page.evaluate(() => new Promise(resolve => document.addEventListener('click', () => {
      resolve(document.querySelector('.atlas-map__geography').getAttribute('transform'));
    }, { once: true, capture: true }))),
    touch ? page.locator('#close-voyage').tap() : page.locator('#close-voyage').click(),
  ]);
  return camera;
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
  await group(page, 'Port Canaveral').press('Enter');
  assert.equal(await page.locator('.atlas-map__chooser').isVisible(), true, 'Departure chooser opens before clicking out');
  await clickOut(page);
  assert.equal(await page.locator('.atlas-map__chooser').isVisible(), false, 'Background click dismisses departure chooser');
  await page.locator('#reset-map').click();

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
  assert.equal(await page.locator('.atlas-map__cancel').isEnabled(), true, 'Cancel remains available with motion off');
  await page.getByRole('button', { name: 'Cancel voyage animation', exact: true }).click();
  await assertCanceled(page, 'Reduced-motion cancel button');

  await page.locator('#reset-map').click();
  await clickRoute(page, 8);
  assert.equal(await page.locator('.detail-heading h1').textContent(), 'Oosterdam');
  await clickOut(page);
  await assertCanceled(page, 'Desktop background click');
  await page.locator('[data-year="2022"]').click();
  const cruises2022 = cruises.filter(cruise => cruise.year === 2022);
  await checkDepartureAnchors(page, '2022 filter', cruises2022);
  assert.equal(await page.locator('.atlas-map__route-hit').count(), 3, 'Year filter updates route hit targets');
  await page.locator('.cruise-card[data-cruise="25"]').click();
  await page.keyboard.press('Escape');
  await assertCanceled(page, 'Escape cancels filtered voyage', 2022);
  assert.equal(await page.locator('.atlas-map__route-hit').count(), 3, 'Cancel keeps filtered routes');
  await page.locator('.cruise-card[data-cruise="24"]').click();
  await page.locator('#zoom-out').click();
  const headingPan = await blankMapPoint(page);
  await page.mouse.move(headingPan.x, headingPan.y);
  await page.mouse.down();
  await page.mouse.move(headingPan.x - 35, headingPan.y + 20, { steps: 8 });
  await page.mouse.up();
  const pannedCamera = await page.locator('.atlas-map__geography').getAttribute('transform');
  assert.ok(Number(await page.locator('.atlas-map__svg').getAttribute('data-zoom')) > 1, 'Heading close starts from a zoomed, panned map');
  await closeHeading(page);
  await assertUnselectedInPlace(page, 'Heading close after pan and zoom', pannedCamera, 2022);
  await clickAnotherVisibleRoute(page, 24);
  await page.keyboard.press('Escape');
  await assertCanceled(page, 'Another visible cruise can be selected after heading close', 2022);
  await page.locator('#all-years').click();
  await checkDepartureAnchors(page, 'Cleared year filter');
  await page.locator('#motion').click();
  await page.locator('.atlas-map__route-hit[data-cruise-id="8"]').press('Enter');
  assert.match(await page.locator('.atlas-map__playback-status').textContent(), /Getting ready/, 'Heading close starts while camera focus is pending');
  const earlyCamera = await closeHeading(page);
  await assertUnselectedInPlace(page, 'Heading close during initial focus', earlyCamera);
  await page.locator('#reset-map').click();
  await page.waitForTimeout(900);
  await page.locator('.atlas-map__route-hit[data-cruise-id="8"]').press('Enter');
  assert.match(await page.locator('.atlas-map__playback-status').textContent(), /Getting ready/, 'Early cancel starts during the camera animation');
  await page.locator('.atlas-map__cancel').click();
  await assertCanceled(page, 'Cancel during initial camera animation');
  await page.locator('[data-view="statistics"]').click();
  await page.locator('#motion').click();
  await page.locator('#motion').click();
  await page.locator('[data-view="atlas"]').click();
  await page.waitForTimeout(300);
  await assertCanceled(page, 'Canceled voyage stays stopped after changing view and motion');
  await clickRoute(page, 8);
  await page.waitForFunction(() => Number(document.querySelector('.atlas-map__vessel')?.dataset.progress) > .01);
  const dragStart = await blankMapPoint(page);
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x - 55, dragStart.y + 25, { steps: 8 });
  await page.mouse.up();
  assert.equal(new URL(page.url()).searchParams.get('cruise'), '8', 'Dragging the map does not cancel a voyage');
  await page.locator('.atlas-map__cancel').click();
  await assertCanceled(page, 'Cancel during active sailing');

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
  const cancelBox = await phone.locator('.atlas-map__cancel').boundingBox();
  assert.ok(cancelBox.x >= 0 && cancelBox.x + cancelBox.width <= 320, 'Cancel button stays reachable at 320px');
  const playbackBox = await phone.locator('.atlas-map__playback').boundingBox();
  const mobileDetailsBox = await phone.locator('#mobile-details').boundingBox();
  assert.ok(playbackBox.y + playbackBox.height <= mobileDetailsBox.y, 'Playback controls do not overlap phone voyage details');
  await phone.screenshot({ path: '/tmp/map-cancel-phone-320.png', fullPage: true });
  await checkHeadingCloseTouchTarget(phone, 320);
  const phone320Camera = await closeHeading(phone, true);
  await assertUnselectedInPlace(phone, '320px phone heading close', phone320Camera);
  await phone.screenshot({ path: '/tmp/map-heading-closed-phone-320.png', fullPage: true });
  await phone.locator('.atlas-map__route-hit[data-cruise-id="26"]').press('Enter');
  await phone.locator('.atlas-map__cancel').tap();
  await assertCanceled(phone, 'Phone cancel button');
  await phone.locator('.brand').tap();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.waitForTimeout(150);
  await phone.locator('.atlas-map__route-hit[data-cruise-id="26"]').press('Enter');
  await checkHeadingCloseTouchTarget(phone, 390);
  await phone.screenshot({ path: '/tmp/map-heading-selected-phone-390.png', fullPage: true });
  const phone390Camera = await closeHeading(phone, true);
  await assertUnselectedInPlace(phone, '390px phone heading close', phone390Camera);
  await phone.screenshot({ path: '/tmp/map-heading-closed-phone-390.png', fullPage: true });
  await phone.locator('#reset-map').click();
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
  await phone.locator('.atlas-map__replay').tap();
  await phone.waitForFunction(() => Number(document.querySelector('.atlas-map__vessel')?.dataset.progress) > .01);
  await clickOut(phone, true);
  await assertCanceled(phone, 'Phone background tap cancels active sailing');
  assert.deepEqual(errors, [], 'Browser runtime or console errors');
  console.log('Map checks passed: geographic departure anchors, port grouping and dates, route clicks, zoom/pan/resize, native phone pinch, sailing and gesture pauses, complete round trip, background/cancel/Escape dismissal, heading close preserves camera and allows another cruise, early-animation cancellation, 320/390px close targets, preserved year filters, and reduced motion.');
} finally {
  await browser.close();
}
