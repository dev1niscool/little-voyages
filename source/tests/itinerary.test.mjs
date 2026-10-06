import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDailyItinerary } from '../src/itinerary.js';

const cruise = {
  id: 100,
  startDate: '2022-12-30',
  endDate: '2023-01-04',
  nights: 5,
  confidence: 'likely',
  ports: [
    { name: 'Departure', lat: 20, lon: -80 },
    { name: 'Overnight port', lat: 22, lon: -81 },
    { name: 'Scenic inlet', lat: 24, lon: -82 },
    { name: 'Scenic glacier', lat: 25, lon: -82 },
    { name: 'Arrival', lat: 27, lon: -83 },
  ],
  route: [[-80, 20], [-81, 22], [-82, 24], [-82, 25], [-83, 27]],
};

const schedule = {
  confidence: 'likely',
  note: 'A sourced day-by-day reconstruction with an overnight and a scenic day.',
  sources: [{ title: 'Archived itinerary', url: 'https://example.com/itinerary', note: 'The daily schedule.' }],
  days: [
    { day: 1, type: 'port', portIndices: [0] },
    { day: 2, type: 'sea', note: 'A full day at sea.' },
    { day: 3, type: 'port', portIndices: [1], note: 'Overnight stay begins.' },
    { day: 4, type: 'port', portIndices: [1], note: 'The same overnight port, not another sea day.' },
    { day: 5, type: 'scenic', portIndices: [2, 3] },
    { day: 6, type: 'port', portIndices: [4] },
  ],
};

test('daily schedules cross calendar years while preserving sea, overnight, and shared-day stops', () => {
  const inputCruise = structuredClone(cruise);
  const inputSchedule = structuredClone(schedule);
  const actual = normalizeDailyItinerary(inputCruise, inputSchedule);
  assert.equal(actual.confidence, 'likely');
  assert.equal(actual.note, schedule.note);
  assert.deepEqual(actual.sources, schedule.sources);
  assert.deepEqual(actual.days.map(day => day.date), [
    '2022-12-30', '2022-12-31', '2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04',
  ]);
  assert.deepEqual(actual.days.map(({ date, ...day }) => day), schedule.days);
  assert.equal(actual.days.filter(day => day.type === 'sea').length, 1);
  assert.deepEqual(actual.days[2].portIndices, actual.days[3].portIndices);
  assert.deepEqual(actual.days[4].portIndices, [2, 3]);
  assert.deepEqual(inputCruise, cruise, 'Adding calendar days does not modify ports, the route, or cruise confidence');
  assert.deepEqual(inputSchedule, schedule);
  actual.days[2].portIndices.push(4);
  actual.sources.push({ title: 'New source', url: 'https://example.com/new', note: 'Changed result only.' });
  assert.deepEqual(inputSchedule, schedule, 'The normalized result does not share mutable arrays with its source');
});

test('missing dates and unresolved days stay unknown rather than becoming invented sea days', () => {
  assert.equal(normalizeDailyItinerary(cruise), null);
  assert.equal(normalizeDailyItinerary(cruise, null), null);
  const unresolved = structuredClone(schedule);
  unresolved.confidence = 'unresolved';
  unresolved.days[1] = { day: 2, type: 'unknown', note: 'The activity for this date is not established.' };
  const actual = normalizeDailyItinerary({ ...cruise, startDate: null, endDate: null, confidence: 'unresolved' }, unresolved);
  assert.ok(actual.days.every(day => day.date === null));
  assert.equal(actual.days[1].type, 'unknown');
  assert.equal(actual.days.filter(day => day.type === 'sea').length, 0);
});

test('invalid daily schedules cannot invent calendar days or references to map ports', () => {
  const invalidSchedules = [
    ['a missing embarkation day', candidate => candidate.days.shift()],
    ['an extra day beyond disembarkation', candidate => candidate.days.push({ day: 7, type: 'sea' })],
    ['duplicate day numbers', candidate => { candidate.days[2].day = 2; }],
    ['out-of-order dates', candidate => { [candidate.days[2], candidate.days[3]] = [candidate.days[3], candidate.days[2]]; }],
    ['a nonexistent day type', candidate => { candidate.days[1].type = 'holiday'; }],
    ['an unsupported confidence label', candidate => { candidate.confidence = 'certain'; }],
    ['an unmarked unresolved day', candidate => { candidate.days[1].type = 'unknown'; }],
    ['a sea day with a port reference', candidate => { candidate.days[1].portIndices = [0]; }],
    ['an unknown day with a port reference', candidate => { candidate.confidence = 'unresolved'; candidate.days[1] = { day: 2, type: 'unknown', portIndices: [0] }; }],
    ['a port day with no port references', candidate => { delete candidate.days[0].portIndices; }],
    ['an empty list of port references', candidate => { candidate.days[0].portIndices = []; }],
    ['a scenic day with no geographic stop', candidate => { candidate.days[4].portIndices = []; }],
    ['a negative port index', candidate => { candidate.days[0].portIndices = [-1]; }],
    ['a fractional port index', candidate => { candidate.days[0].portIndices = [0.5]; }],
    ['a string port index', candidate => { candidate.days[0].portIndices = ['0']; }],
    ['an index outside the route', candidate => { candidate.days[0].portIndices = [cruise.ports.length]; }],
  ];
  for (const [label, change] of invalidSchedules) {
    const candidate = structuredClone(schedule);
    change(candidate);
    assert.throws(() => normalizeDailyItinerary(cruise, candidate), label);
  }
  for (const nights of [null, -1, 1.5]) {
    assert.throws(() => normalizeDailyItinerary({ ...cruise, nights }, schedule), `Invalid duration ${nights}`);
  }
  assert.throws(() => normalizeDailyItinerary({ ...cruise, startDate: 'not-a-date' }, schedule));
});
