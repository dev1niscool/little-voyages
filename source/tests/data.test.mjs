import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cruises } from '../src/data.js';

test('all 29 personal voyages survive normalization in their original year', () => {
  assert.equal(cruises.length, 29);
  assert.deepEqual(cruises.map(cruise => cruise.id), Array.from({ length: 29 }, (_, i) => i + 1));
  assert.equal(new Set(cruises.map(cruise => cruise.line)).size, 7);
  for (const cruise of cruises) {
    assert.match(cruise.originalDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(cruise.year, Number(cruise.originalDate.slice(0, 4)));
    assert.ok(cruise.ship && cruise.line && cruise.region && cruise.originalRegion);
    assert.match(cruise.color, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(cruises[25].year, 2022, 'New Year sailing stays under its recorded 2022 year');
});

test('every stated duration agrees with the researched dates', () => {
  for (const cruise of cruises) {
    const label = `Voyage ${cruise.id}: ${cruise.ship}`;
    if (cruise.nights === null) {
      assert.equal(cruise.startDate, null, label);
      assert.equal(cruise.endDate, null, label);
      assert.notEqual(cruise.confidence, 'confirmed', label);
    } else {
      assert.ok(Number.isInteger(cruise.nights) && cruise.nights > 0, label);
      assert.equal((Date.parse(cruise.endDate) - Date.parse(cruise.startDate)) / 86_400_000, cruise.nights, label);
    }
  }
});

test('researched routes are sourced, geographic, and retain every ordered port', () => {
  for (const cruise of cruises) {
    const label = `Voyage ${cruise.id}: ${cruise.ship}`;
    assert.ok(['confirmed', 'likely', 'unresolved'].includes(cruise.confidence), label);
    assert.ok(cruise.notes.length > 30, label);
    assert.ok(cruise.sources.length > 0, label);
    for (const source of cruise.sources) {
      assert.ok(source.title && source.note, label);
      assert.equal(new URL(source.url).protocol, 'https:', label);
    }
    const coordinates = [...cruise.ports.map(port => [port.lon, port.lat]), ...(cruise.route || []), cruise.anchor];
    for (const [lon, lat] of coordinates) {
      assert.ok(Number.isFinite(lon) && Math.abs(lon) <= 180, label);
      assert.ok(Number.isFinite(lat) && Math.abs(lat) <= 90, label);
    }
    for (const port of cruise.ports) assert.ok(port.name && port.country, label);
    if (cruise.ports.length) {
      let routeIndex = 0;
      for (const port of cruise.ports) {
        const nextIndex = cruise.route.findIndex(([lon, lat], i) => i >= routeIndex && lon === port.lon && lat === port.lat);
        assert.ok(nextIndex >= routeIndex, `${label}: missing ordered ${port.name}`);
        routeIndex = nextIndex + 1;
      }
      assert.deepEqual(cruise.route[0], [cruise.ports[0].lon, cruise.ports[0].lat], label);
      assert.deepEqual(cruise.route.at(-1), [cruise.ports.at(-1).lon, cruise.ports.at(-1).lat], label);
    }
  }
});

test('clarified and revised itineraries retain their research distinctions', () => {
  const byId = id => cruises.find(cruise => cruise.id === id);
  assert.equal(byId(3).ship, 'Disney Wonder');
  assert.equal(byId(3).region, 'Bahamas');
  assert.equal(byId(3).originalRegion, 'Bahamas');
  assert.equal(byId(3).ports[0].name, 'Port Canaveral');
  assert.equal(byId(3).nights, 4);
  assert.equal(byId(3).endDate, '2008-08-14');
  assert.deepEqual(byId(3).ports.map(port => port.name), ['Port Canaveral', 'Castaway Cay', 'Nassau', 'Castaway Cay', 'Port Canaveral']);
  assert.equal(byId(25).nights, 7, 'owner confirmed the seven-day sailing');
  assert.equal(byId(25).startDate, '2022-06-11');
  assert.equal(byId(25).endDate, '2022-06-18');
  assert.equal(byId(25).region, 'Mediterranean');
  assert.equal(byId(25).candidateStartDate, undefined);
  assert.equal(byId(25).confidence, 'confirmed');
  assert.equal(byId(21).originalShip, 'NCL Sky');
  assert.equal(byId(24).originalShip, 'Carnival Mardi Gras 2.0');
  assert.equal(byId(26).originalShip, 'NCL Bliss');
  assert.equal(byId(29).originalShip, 'Carnival Mardi Gras 2.0');
  assert.equal(byId(27).endDate, byId(27).originalDate, 'Solstice record most likely represents return date');
  assert.equal(byId(27).confidence, 'likely');
  assert.ok(byId(28).ports.some(port => port.name === 'Kochi'));
  assert.ok(!byId(28).ports.some(port => port.name === 'Nagasaki'));
  assert.ok(byId(29).ports.some(port => port.name === 'Amber Cove'));
  assert.ok(!byId(29).ports.some(port => port.name === 'Grand Turk'));
});

test('downloadable JSON exactly matches the atlas data', () => {
  const downloadable = JSON.parse(fs.readFileSync(new URL('../public/data/cruises.json', import.meta.url), 'utf8'));
  assert.deepEqual(downloadable, cruises);
});
