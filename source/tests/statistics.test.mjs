import test from 'node:test';
import assert from 'node:assert/strict';
import { cruises } from '../src/data.js';
import { nonCruiseVisits, shoreExcursions } from '../src/personal-visits.js';
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
  assert.equal(stats.countryCount, 0);
  assert.equal(stats.territoryCount, 0);
  assert.deepEqual(stats.countries, []);
  assert.deepEqual(stats.territories, []);
  assert.deepEqual(stats.unclassifiedPlaces, []);
  assert.equal(stats.itineraryPlaceCount, 0);
  assert.deepEqual(stats.shoreExcursionPlaces, []);
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
  assert.equal(stats.countryCount, 35);
  assert.equal(stats.territoryCount, 9);
  assert.equal(stats.placeCount, stats.countryCount + stats.territoryCount);
  assert.deepEqual(stats.unclassifiedPlaces, []);
  assert.deepEqual(stats.territories.map(place => place.name), [
    'Aruba', 'Cayman Islands', 'Curaçao', 'Gibraltar', 'Guernsey',
    'Puerto Rico', 'Sint Maarten', 'Turks and Caicos Islands', 'U.S. Virgin Islands',
  ]);
  assert.deepEqual(stats.countries.find(place => place.name === 'United Kingdom').ports,
    ['Ayr', 'Belfast', 'Glasgow (Greenock)', 'Liverpool'], 'Northern Ireland and Scotland are included once under the United Kingdom');
  assert.deepEqual(stats.countries.find(place => place.name === 'South Korea').ports, ['Jeju']);
  assert.deepEqual(stats.busiestYears.map(row => row.year), [2022]);
  assert.deepEqual(stats.longestCruises.map(cruise => cruise.id), [15, 17, 28]);
  assert.deepEqual(cruises, before);
});

test('destination lists deduplicate calls while preserving direct port evidence and classifications', () => {
  const fixture = [
    { id: 10, ports: [
      { name: 'Oranjestad', country: 'Aruba' },
      { name: 'Willemstad', country: 'Curaçao' },
      { name: 'Oranjestad', country: 'Aruba' },
      { name: 'Harbor A', country: '  Bahamas  ' },
      { name: 'Harbor B', country: 'BAHAMAS' },
      { name: 'Scenic coast', country: 'France', scenic: true },
      { name: 'Scenic strait', country: 'Japan', type: 'scenic' },
      { name: 'Glacier Bay', country: 'Canada' },
      { name: 'San Juan', country: 'Puerto Rico' },
    ] },
    { id: 2, ports: [
      { name: 'San Juan', country: 'Puerto Rico' },
      { name: 'Roadstead', country: 'Future place' },
      { name: 'Other roadstead', country: 'FUTURE PLACE' },
      { name: 'Unspecified stop' },
      { name: 'Oranjestad', country: 'Aruba' },
    ] },
  ];
  const original = structuredClone(fixture);
  const stats = computeStatistics(fixture);
  assert.deepEqual(stats.countries.map(place => place.name), ['Bahamas']);
  assert.deepEqual(stats.countries[0].ports, ['Harbor A', 'Harbor B']);
  assert.deepEqual(stats.territories.map(place => place.name), ['Aruba', 'Curaçao', 'Puerto Rico']);
  assert.deepEqual(stats.territories.find(place => place.name === 'Aruba').cruiseIds, [2, 10]);
  assert.deepEqual(stats.territories.find(place => place.name === 'Aruba').ports, ['Oranjestad']);
  assert.deepEqual(stats.territories.find(place => place.name === 'Puerto Rico').ports, ['San Juan'], 'one-way arrival and departure are eligible calls');
  assert.equal(stats.territories.find(place => place.name === 'Curaçao').status, 'Country within the Kingdom of the Netherlands');
  assert.ok(stats.territories.every(place => place.sources.length > 0), 'special statuses have a source');
  assert.deepEqual(stats.unclassifiedPlaces.map(place => place.name), ['Future place']);
  assert.deepEqual(stats.unclassifiedPlaces[0].ports, ['Other roadstead', 'Roadstead']);
  assert.equal(stats.placeCount, stats.countryCount + stats.territoryCount + stats.unclassifiedPlaces.length);
  assert.equal(stats.scenicStops, 3);
  assert.deepEqual(fixture, original);
});

test('year selections recalculate destinations without inferring visits to associated countries', () => {
  const stats = computeStatistics(cruises.filter(cruise => cruise.year === 2025));
  assert.equal(stats.cruiseCount, 1);
  assert.deepEqual(stats.countries.map(place => place.name), ['Dominican Republic', 'United States']);
  assert.deepEqual(stats.territories.map(place => place.name), ['Aruba', 'Curaçao']);
  assert.equal(stats.countryCount, 2, 'a visit to Aruba or Curaçao does not also add the Netherlands');
  assert.equal(stats.territoryCount, 2);
  assert.ok(stats.countries.every(place => place.name !== 'Vatican City'), 'undated personal visits are not silently assigned to a year');
  assert.deepEqual(stats.territories[0].cruiseIds, [29]);

  const territoryOnly = computeStatistics([{ id: 1, ports: [
    { name: 'St. Peter Port', country: 'Guernsey' },
    { name: 'Gibraltar', country: 'Gibraltar' },
    { name: 'Charlotte Amalie', country: 'U.S. Virgin Islands' },
  ] }]);
  assert.equal(territoryOnly.countryCount, 0, 'Crown Dependencies and territories do not add the UK or US');
  assert.equal(territoryOnly.territoryCount, 3);
});

test('explicit Vatican shore recollection adds one country without inventing port calls or dated sailings', () => {
  const cruisesBefore = structuredClone(cruises);
  const visitsBefore = structuredClone(shoreExcursions);
  const itineraryOnly = computeStatistics(cruises);
  const stats = computeStatistics(cruises, { shoreExcursions });
  assert.equal(stats.countryCount, 36);
  assert.equal(stats.territoryCount, 9);
  assert.equal(stats.placeCount, 45);
  assert.equal(stats.itineraryPlaceCount, 44);
  const vatican = stats.countries.find(place => place.name === 'Vatican City');
  assert.equal(vatican.flag, '🇻🇦');
  assert.equal(vatican.isShoreExcursion, true);
  assert.equal(vatican.approximateVisits, 2, 'two recalled visits count as one country');
  assert.equal(vatican.evidence, 'owner-reported');
  assert.deepEqual(vatican.ports, [], 'Vatican City is not a fabricated cruise port');
  assert.deepEqual(vatican.cruiseIds, [], 'unknown sailings stay unknown');
  assert.match(vatican.note, /shore visit, not a cruise port/);
  assert.deepEqual(stats.shoreExcursionPlaces, [vatican]);
  for (const key of ['cruiseCount', 'totalNights', 'tripHours', 'uniquePorts', 'portCalls', 'scenicStops', 'estimatedKm', 'estimatedMiles', 'earthLaps']) {
    assert.equal(stats[key], itineraryOnly[key], `${key} is unchanged by a personal visit`);
  }
  assert.equal(stats.uniquePorts, 87);
  assert.deepEqual(stats.years, itineraryOnly.years);
  assert.deepEqual(stats.topPorts, itineraryOnly.topPorts);
  assert.deepEqual(cruises, cruisesBefore);
  assert.deepEqual(shoreExcursions, visitsBefore);
});

test('shore supplements deduplicate destinations and never infer ports or unchecked sovereignty', () => {
  const italy = [{ id: 1, ports: [{ name: 'Naples', country: 'Italy' }] }];
  const stats = computeStatistics(italy, { shoreExcursions: [
    ...shoreExcursions, ...shoreExcursions,
    { name: ' ITALY ', approximateVisits: 2, note: 'A personal visit.' },
    { name: 'Unreviewed place', type: 'country' },
  ] });
  assert.equal(stats.countryCount, 2, 'repeated Vatican and Italy supplements add no duplicate country');
  assert.equal(stats.placeCount, 3);
  assert.equal(stats.itineraryPlaceCount, 1);
  assert.equal(stats.uniquePorts, 1);
  assert.equal(stats.portCalls, 1);
  assert.deepEqual(stats.countries.find(place => place.name === 'Italy').ports, ['Naples']);
  assert.deepEqual(stats.countries.find(place => place.name === 'Italy').cruiseIds, [1]);
  assert.deepEqual(stats.unclassifiedPlaces.map(place => place.name), ['Unreviewed place']);
});

test('non-cruise comparison preserves the owner grouping without contributing to cruise statistics', () => {
  assert.deepEqual(nonCruiseVisits.countries.map(place => place.name), ['China', 'Egypt', 'India', 'Israel', 'South Africa']);
  assert.deepEqual(nonCruiseVisits.specialPlaces.map(place => place.name), ['Palestine', 'Hong Kong']);
  for (const place of [...nonCruiseVisits.countries, ...nonCruiseVisits.specialPlaces]) {
    assert.ok(place.flag, `${place.name} includes its flag`);
    assert.equal(place.evidence, 'owner-reported');
  }
  assert.match(nonCruiseVisits.specialPlaces[0].status, /observer State/);
  assert.match(nonCruiseVisits.specialPlaces[0].note, /recognition and borders remain disputed/);
  assert.match(nonCruiseVisits.specialPlaces[0].disputeUrl, /^https:\/\/en\.wikipedia\.org\//);
  assert.match(nonCruiseVisits.specialPlaces[1].status, /Special Administrative Region of China/);
  assert.match(nonCruiseVisits.groupingNote, /not a claim about sovereignty/);
  const stats = computeStatistics(cruises, { shoreExcursions });
  for (const place of [...nonCruiseVisits.countries, ...nonCruiseVisits.specialPlaces]) {
    assert.ok(![...stats.countries, ...stats.territories].some(destination => destination.name === place.name));
  }
  const gibraltar = stats.territories.find(place => place.name === 'Gibraltar');
  assert.equal(gibraltar.disputeUrl, 'https://en.wikipedia.org/wiki/Status_of_Gibraltar');
  assert.match(gibraltar.disputeNote, /sovereignty claimed by Spain/);
});
