import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { csvParse, csvParseRows } from 'd3';
import { strFromU8, unzipSync } from 'fflate';
import { cruises } from '../src/data.js';
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
  assert.deepEqual(exported.statistics, computeStatistics(cruises));
  assert.deepEqual(exported.methodology, statsMethodology);
  assert.equal(exported.statistics.totalNights, 202);
  assert.equal(exported.statistics.countryCount, 35);
  assert.equal(exported.statistics.territoryCount, 9);
  for (const place of exported.statistics.territories) {
    assert.ok(place.sources.length > 0);
    assert.ok(place.cruiseIds.length > 0);
    assert.ok(place.status);
  }
  assert.match(exported.precision, /not real-world accuracy/);
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
  assert.match(guide, /position in the recorded itinerary, not a cruise day/);
  assert.match(guide, /originalShip/);
  assert.match(guide, /owner-authorized AI task/);
  assert.match(guide, /AI-USAGE\.md/);
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
