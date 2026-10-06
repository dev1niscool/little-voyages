import test from 'node:test';
import assert from 'node:assert/strict';
import { cruises } from '../src/data.js';
import { computeStatistics, haversineKm, routeDistanceKm } from '../src/statistics-data.js';

test('great-circle distances handle familiar landmarks, the dateline and antipodes', () => {
  const londonToNewYork = haversineKm([-0.1278, 51.5074], [-74.006, 40.7128]);
  assert.ok(Math.abs(londonToNewYork - 5_570) < 2, 'London–New York is about 5,570 km');
  assert.equal(haversineKm([12, 40], [12, 40]), 0);
  assert.ok(Math.abs(haversineKm([179, 0], [-179, 0]) - 222.39) < 0.1, 'dateline takes the short arc');
  assert.ok(Math.abs(haversineKm([0, 0], [180, 0]) - 20_015.11) < 0.1);
  assert.equal(routeDistanceKm([[0, 0], [NaN, 3], [10, 0]]), null, 'an invalid waypoint must not create an invented shortcut');
  assert.equal(routeDistanceKm([]), null);
});

test('aggregation preserves repeated interior calls, excludes scenic stops and avoids duplicate homeport returns', () => {
  const home = { name: 'Home', country: 'United States', lon: 0, lat: 0 };
  const cay = { name: 'Island', country: 'Bahamas', lon: 1, lat: 0 };
  const destination = { name: 'Arrival', country: 'Puerto Rico', lon: 2, lat: 0 };
  const fixture = [
    { id: 'a', ship: 'Wonder', line: 'Disney', year: 2008, nights: 4, startDate: '2008-08-10', endDate: '2008-08-14', region: 'Bahamas', ports: [home, cay, { name: 'Glacier Bay', country: 'Canada', lon: 3, lat: 4 }, cay, home], route: [[0, 0], [1, 0], [0, 0]] },
    { id: 'b', ship: 'Wonder', line: 'Disney', year: 2022, nights: 7, startDate: '2022-12-31', endDate: '2023-01-07', region: 'Western Caribbean', ports: [home, destination], route: [[0, 0], [2, 0]] },
    { id: 'c', ship: 'Mystery', line: 'Other', year: 2022, nights: null, ports: [], route: null },
  ];
  const before = structuredClone(fixture);
  const stats = computeStatistics(fixture);
  assert.equal(stats.cruiseCount, 3);
  assert.equal(stats.shipCount, 2);
  assert.equal(stats.lineCount, 2);
  assert.equal(stats.totalNights, 11);
  assert.equal(stats.tripHours, 264);
  assert.equal(stats.averageNights, 5.5, 'unknown duration is not treated as a zero-night vacation');
  assert.equal(stats.unknownDurationCruises, 1);
  assert.equal(stats.portCalls, 5);
  assert.equal(stats.uniquePorts, 3);
  assert.equal(stats.scenicStops, 1);
  assert.equal(stats.placeCount, 3, 'scenic-only Canada does not become a visited country; territories remain separate');
  assert.equal(stats.topPorts.find(port => port.name === 'Island').count, 2);
  assert.equal(stats.topPorts.find(port => port.name === 'Home').count, 2);
  assert.equal(stats.firstDate, '2008-08-10');
  assert.equal(stats.lastDate, '2023-01-07');
  assert.equal(stats.spanYears, 14, 'New Year voyage belongs to its recorded year');
  assert.deepEqual(stats.years.map(row => [row.year, row.cruises, row.nights]), [[2008, 1, 4], [2022, 2, 7]]);
  assert.deepEqual(stats.busiestYears.map(row => row.year), [2022]);
  assert.deepEqual(stats.longestCruises.map(cruise => cruise.id), ['b']);
  assert.equal(stats.regions.find(region => region.name === 'Caribbean & Bahamas').count, 2);
  assert.equal(stats.routesMeasured, 2);
  assert.equal(stats.missingRoutes, 1);
  assert.ok(Math.abs(stats.estimatedKm - 444.78) < 0.1);
  assert.ok(Math.abs(stats.estimatedMiles - 276.37) < 0.1);
  assert.ok(Math.abs(stats.estimatedNauticalMiles - 240.16) < 0.1);
  assert.ok(Math.abs(stats.earthLaps - 0.01110) < 0.00001);
  assert.deepEqual(fixture, before, 'calculations must not alter the itinerary source');
});

test('empty selections have no fictional winners or invalid numeric totals', () => {
  const stats = computeStatistics([]);
  assert.equal(stats.totalNights, 0);
  assert.equal(stats.cruiseCount, 0);
  assert.equal(stats.averageNights, 0);
  assert.equal(stats.earthLaps, 0);
  assert.equal(stats.firstDate, null);
  assert.equal(stats.farthestCruise, null);
  assert.deepEqual(stats.longestCruises, []);
  assert.deepEqual(stats.busiestYears, []);
  assert.deepEqual(stats.years, []);
});

test('all 29 corrected voyages contribute to the live collection without changing their data', () => {
  const before = structuredClone(cruises);
  const stats = computeStatistics(cruises);
  assert.equal(stats.cruiseCount, 29);
  assert.equal(stats.totalNights, 202);
  assert.equal(stats.tripHours, 4_848);
  assert.equal(stats.unknownDurationCruises, 0);
  assert.equal(stats.missingRoutes, 0);
  assert.equal(stats.lineCount, 7);
  assert.equal(stats.scenicStops, 1);
  assert.equal(stats.spanYears, 20);
  assert.deepEqual(stats.busiestYears.map(row => row.year), [2022]);
  assert.deepEqual(stats.longestCruises.map(cruise => cruise.id), [15, 17, 28]);
  assert.deepEqual(cruises, before);
});
