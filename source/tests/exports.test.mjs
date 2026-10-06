import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { csvParse, csvParseRows } from 'd3';
import { strFromU8, unzipSync } from 'fflate';
import { cruises } from '../src/data.js';
import { shoreExcursions, nonCruiseVisits } from '../src/personal-visits.js';
import { computeStatistics, statsMethodology } from '../src/statistics-data.js';
import { buildExportFiles, csvCell, encodeCsv, EXPORT_FILES } from '../scripts/build-exports.mjs';

const files = buildExportFiles();
const contents = name => strFromU8(files[name]);
const parse = name => JSON.parse(contents(name));

test('logbook preserves every cruise field, confidence caveat, and source without mutation', () => {
  const original = structuredClone(cruises);
  const freshFiles = buildExportFiles(cruises);
  const logbook = JSON.parse(strFromU8(freshFiles[EXPORT_FILES.logbook]));
  assert.equal(logbook.schemaVersion, 1);
  assert.equal(logbook.title, 'Little Voyages');
  assert.equal(logbook.cruises.length, 29);
  assert.deepEqual(logbook.cruises, cruises);
  assert.match(logbook.collectionSha256, /^[a-f0-9]{64}$/);
  assert.match(logbook.usage.authorizedUse, /owner/);
  assert.match(logbook.usage.restrictions, /model training/);
  assert.match(logbook.dataNotes.precision, /not measured ship mileage/);
  assert.deepEqual(cruises, original);
});

test('statistics preserve the full calculation, methodology, and territorial evidence', () => {
  const exported = parse(EXPORT_FILES.statistics);
  assert.equal(exported.schemaVersion, 1);
  assert.deepEqual(exported.statistics, computeStatistics(cruises, { shoreExcursions }));
  assert.deepEqual(exported.methodology, statsMethodology);
  assert.equal(exported.statistics.totalNights, 202);
  assert.equal(exported.statistics.countryCount, 40);
  assert.equal(exported.statistics.territoryCount, 6);
  assert.equal(exported.statistics.itineraryPlaceCount, 44);
  assert.equal(exported.statistics.placeCount, 46);
  for (const place of exported.statistics.territories) {
    assert.ok(place.sources.length > 0);
    assert.ok(place.cruiseIds.length > 0);
    assert.ok(place.status);
  }
  for (const name of ['Aruba', 'Curaçao', 'Sint Maarten']) {
    const place = exported.statistics.countries.find(destination => destination.name === name);
    assert.equal(place.type, 'country');
    assert.equal(place.status, 'Country within the Kingdom of the Netherlands');
    assert.equal(place.sovereign, 'Kingdom of the Netherlands');
    assert.ok(place.sources.some(url => new URL(url).hostname === 'www.government.nl'));
    assert.ok(!exported.statistics.territories.some(destination => destination.name === name));
  }
  assert.match(exported.methodology.destinations, /constituent countries/i);
  assert.match(exported.precision, /not real-world accuracy/);
});

test('personal travel survives both JSON exports without becoming invented cruise calls or routes', () => {
  const logbook = parse(EXPORT_FILES.logbook);
  const exported = parse(EXPORT_FILES.statistics);
  assert.deepEqual(logbook.personalVisits, { shoreExcursions, nonCruiseVisits });
  assert.deepEqual(exported.personalVisits, logbook.personalVisits);
  assert.equal(logbook.personalVisits.nonCruiseVisits.countries.length, 5);
  assert.equal(logbook.personalVisits.nonCruiseVisits.specialPlaces.length, 2);
  assert.deepEqual(logbook.personalVisits.nonCruiseVisits.countries.map(place => place.name), ['China', 'Egypt', 'India', 'Israel', 'South Africa']);
  assert.deepEqual(logbook.personalVisits.nonCruiseVisits.specialPlaces.map(place => place.name), ['Palestine', 'Hong Kong']);
  for (const place of [...nonCruiseVisits.countries, ...nonCruiseVisits.specialPlaces]) {
    assert.ok(place.flag, `${place.name} is missing its flag`);
    assert.ok(!exported.statistics.countries.some(cruisePlace => cruisePlace.name === place.name));
    assert.ok(!exported.statistics.territories.some(cruisePlace => cruisePlace.name === place.name));
  }
  const vatican = exported.statistics.countries.find(place => place.name === 'Vatican City');
  assert.equal(vatican.flag, '🇻🇦');
  assert.equal(vatican.isShoreExcursion, true);
  assert.equal(vatican.approximateVisits, 2);
  assert.deepEqual(vatican.ports, []);
  assert.deepEqual(vatican.cruiseIds, []);
  assert.ok(!('startDate' in vatican));
  assert.ok(!('endDate' in vatican));
  const monaco = exported.statistics.countries.find(place => place.name === 'Monaco');
  assert.equal(monaco.flag, '🇲🇨');
  assert.equal(monaco.isShoreExcursion, true);
  assert.equal(monaco.evidence, 'owner-confirmed');
  assert.deepEqual(monaco.ports, []);
  assert.deepEqual(monaco.cruiseIds, [20]);
  assert.ok(!('candidateCruiseIds' in monaco));
  assert.ok(!('candidatePort' in monaco));
  assert.ok(!('startDate' in monaco));
  assert.ok(!('endDate' in monaco));
  assert.deepEqual(logbook.personalVisits.shoreExcursions.map(place => place.name), ['Vatican City', 'Monaco']);
  assert.deepEqual(exported.statistics.shoreExcursionPlaces, [monaco, vatican]);
  const itineraryStatistics = computeStatistics(cruises);
  for (const key of ['cruiseCount', 'uniquePorts', 'portCalls', 'totalNights', 'estimatedMiles', 'routesMeasured']) {
    assert.equal(exported.statistics[key], itineraryStatistics[key], `${key} changed because of a shore excursion`);
  }
  assert.ok(!csvParse(contents(EXPORT_FILES.ports)).some(row => ['Vatican City', 'Monaco'].includes(row.place_name)));
  assert.equal(parse(EXPORT_FILES.routes).features.length, 29);
  assert.equal(logbook.collectionSha256, createHash('sha256').update(JSON.stringify(cruises)).digest('hex'));
  assert.equal(logbook.personalVisitsSha256, createHash('sha256').update(JSON.stringify(logbook.personalVisits)).digest('hex'));
  assert.equal(exported.personalVisitsSha256, logbook.personalVisitsSha256);
});

test('CSV quoting round-trips Unicode, punctuation, multiline text, and source objects safely', () => {
  const texts = ['Curaçao', 'Cabo, Mexico', 'He said "hello"', 'two\r\nlines', '=1+2', ' +SUM(A1:A3)', '-cmd', '@SUM(A1:A3)', '\tformula', '\nformula', '\rformula'];
  const source = [{ title: 'A "quoted", source', url: 'https://example.com/?a=1&b=2', note: 'line 1\nline 2' }];
  const output = encodeCsv(['text', 'longitude', 'sources'], texts.map(text => [text, -80.6188, source]));
  const rows = csvParse(output);
  assert.equal(rows.length, texts.length);
  for (const [index, row] of rows.entries()) {
    const guarded = index >= 4 ? `'${texts[index]}` : texts[index];
    assert.equal(row.text, guarded);
    assert.equal(Number(row.longitude), -80.6188, 'negative coordinates remain numeric');
    assert.deepEqual(JSON.parse(row.sources), source);
  }
  assert.equal(csvCell(null), '""');
  assert.throws(() => csvCell(Infinity), /finite/);
  const summaries = csvParse(contents(EXPORT_FILES.cruises));
  assert.equal(summaries.length, 29);
  assert.deepEqual(summaries.map(row => Number(row.cruise_id)), cruises.map(cruise => cruise.id));
  for (const [index, row] of summaries.entries()) {
    assert.equal(row.notes, cruises[index].notes);
    assert.deepEqual(JSON.parse(row.sources_json), cruises[index].sources);
  }
});

test('ordered port export retains returns and repeat calls while matching statistical eligibility', () => {
  const rows = csvParse(contents(EXPORT_FILES.ports));
  const stats = computeStatistics(cruises);
  assert.equal(rows.length, cruises.reduce((count, cruise) => count + cruise.ports.length, 0));
  assert.equal(rows.length, 167);
  assert.equal(rows.filter(row => row.included_in_port_statistics === 'true').length, stats.portCalls);
  assert.equal(rows.filter(row => row.stop_kind === 'scenic cruising').length, stats.scenicStops);
  for (const cruise of cruises) {
    const entries = rows.filter(row => Number(row.cruise_id) === cruise.id);
    assert.deepEqual(entries.map(row => Number(row.port_sequence)), cruise.ports.map((_, index) => index + 1));
    assert.deepEqual(entries.map(row => row.port_name), cruise.ports.map(port => port.name));
    assert.deepEqual(entries.map(row => [Number(row.longitude), Number(row.latitude)]), cruise.ports.map(port => [port.lon, port.lat]));
  }
  const wonder2008 = rows.filter(row => row.cruise_id === '3');
  assert.equal(wonder2008.filter(row => row.port_name === 'Castaway Cay' && row.included_in_port_statistics === 'true').length, 2);
  assert.equal(wonder2008.at(-1).stop_kind, 'round-trip return');
  assert.equal(wonder2008.at(-1).included_in_port_statistics, 'false');
  assert.equal(rows.filter(row => row.cruise_id === '25').at(-1).included_in_port_statistics, 'true', 'one-way arrival is retained in statistical eligibility');
});

test('GeoJSON preserves longitude-latitude route geometry and marks it as illustrative', () => {
  const exported = parse(EXPORT_FILES.routes);
  assert.equal(exported.type, 'FeatureCollection');
  assert.equal(exported.features.length, cruises.length);
  for (const [index, feature] of exported.features.entries()) {
    const cruise = cruises[index];
    assert.equal(feature.id, cruise.id);
    assert.equal(feature.properties.cruiseId, cruise.id);
    assert.equal(feature.properties.illustrative, true);
    assert.equal(feature.geometry.type, 'LineString');
    assert.deepEqual(feature.geometry.coordinates, cruise.route);
    assert.deepEqual(feature.geometry.coordinates[0], [cruise.ports[0].lon, cruise.ports[0].lat]);
    assert.equal(feature.properties.notes, cruise.notes);
    assert.deepEqual(feature.properties.sources, cruise.sources);
  }
});

test('unknown values remain unknown rather than becoming dates, zero durations, or invented routes', () => {
  const record = { ...structuredClone(cruises[0]), startDate: null, endDate: null, nights: null, route: null, confidence: 'unresolved' };
  const unknownFiles = buildExportFiles([record]);
  const logbook = JSON.parse(strFromU8(unknownFiles[EXPORT_FILES.logbook]));
  const geojson = JSON.parse(strFromU8(unknownFiles[EXPORT_FILES.routes]));
  const summary = csvParse(strFromU8(unknownFiles[EXPORT_FILES.cruises]))[0];
  assert.equal(logbook.cruises[0].nights, null);
  assert.equal(logbook.cruises[0].startDate, null);
  assert.equal(summary.nights, '');
  assert.equal(summary.start_date, '');
  assert.equal(geojson.features[0].geometry, null);
  assert.deepEqual(logbook.personalVisits.shoreExcursions, [], 'custom selections do not automatically inherit personal shore visits');
  assert.deepEqual(logbook.personalVisits.nonCruiseVisits.countries, []);
});

test('guide retains complete readable research and explains the transfer and data dictionary', () => {
  const guide = contents(EXPORT_FILES.guide);
  for (const cruise of cruises) {
    assert.ok(guide.includes(cruise.notes));
    for (const source of cruise.sources) {
      assert.ok(guide.includes(source.url));
      assert.ok(guide.includes(source.note));
    }
  }
  assert.match(guide, /not a claim that these jurisdictions are unrecognized states/);
  assert.match(guide, /constituent countries/i);
  assert.doesNotMatch(guide, /40 sovereign countries/i);
  assert.match(guide, /position in the recorded itinerary, not a cruise day/);
  assert.match(guide, /originalShip/);
  assert.match(guide, /owner-authorized AI task/);
  assert.match(guide, /AI-USAGE\.md/);
  assert.match(guide, /Vatican City/);
  assert.match(guide, /Monaco/);
  assert.match(guide, /Villefranche/);
  assert.match(guide, /approximately twice/);
  assert.match(guide, /not a port/);
  assert.match(guide, /No cruise IDs or travel dates are inferred/);
  assert.match(guide, /personalVisitsSha256/);
  assert.match(guide, /Palestine is a UN non-member observer State/);
  assert.match(guide, /Hong Kong is a Special Administrative Region of China/);
  assert.ok(guide.includes(nonCruiseVisits.countNote), 'The readable handoff preserves the country-count explanation');
  for (const place of nonCruiseVisits.specialPlaces) {
    for (const reference of place.referenceLinks || []) {
      assert.ok(guide.includes(reference.url), `${place.name} retains its official context sources in the readable handoff`);
    }
  }
});

test('complete ZIP is deterministic, portable, and byte-identical to the six standalone files', async () => {
  const secondBuild = buildExportFiles();
  const unpacked = unzipSync(files[EXPORT_FILES.complete]);
  assert.deepEqual(Object.keys(unpacked).sort(), Object.values(EXPORT_FILES).filter(name => name !== EXPORT_FILES.complete).sort());
  for (const [name, bytes] of Object.entries(files)) {
    assert.deepEqual(bytes, secondBuild[name], `${name} changes between builds`);
    const checkedIn = await readFile(new URL(`../public/downloads/${name}`, import.meta.url));
    assert.deepEqual(bytes, new Uint8Array(checkedIn), `${name} is stale; run npm run exports`);
    if (name !== EXPORT_FILES.complete) assert.deepEqual(unpacked[name], bytes);
  }
  assert.equal(csvParseRows(strFromU8(unpacked[EXPORT_FILES.cruises])).length, 30);
});
