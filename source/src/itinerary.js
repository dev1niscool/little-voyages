const DAY_TYPES = new Set(['port', 'sea', 'scenic', 'unknown']);
const CONFIDENCE_LEVELS = new Set(['confirmed', 'likely', 'unresolved']);
const DAY_MS = 86_400_000;

/** Validate the researched calendar without adding sea days to map port calls. */
export function normalizeDailyItinerary(cruise, schedule) {
  if (schedule == null) return null;
  const fail = message => { throw new Error(`Cruise ${cruise.id ?? '?'} daily itinerary: ${message}`); };
  if (!CONFIDENCE_LEVELS.has(schedule.confidence)) fail('invalid confidence');
  if (!Number.isInteger(cruise.nights) || cruise.nights < 0) fail('a known duration is required');
  if (!Array.isArray(schedule.days) || schedule.days.length !== cruise.nights + 1) {
    fail('days must cover the complete voyage, including departure and arrival');
  }
  let start = null;
  if (cruise.startDate != null) {
    start = Date.parse(`${cruise.startDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cruise.startDate) || !Number.isFinite(start)
      || new Date(start).toISOString().slice(0, 10) !== cruise.startDate) fail('invalid start date');
  }
  const days = schedule.days.map((entry, index) => {
    if (!entry || entry.day !== index + 1) fail('day numbers must be consecutive and unique');
    if (!DAY_TYPES.has(entry.type)) fail(`invalid type on day ${entry.day}`);
    const hasPorts = entry.type === 'port' || entry.type === 'scenic';
    if (hasPorts) {
      if (!Array.isArray(entry.portIndices) || !entry.portIndices.length
        || entry.portIndices.some(i => !Number.isInteger(i) || i < 0 || i >= (cruise.ports?.length ?? 0))) {
        fail(`invalid port references on day ${entry.day}`);
      }
    } else if ('portIndices' in entry) {
      fail(`${entry.type} days cannot have port references`);
    }
    if (entry.type === 'unknown' && schedule.confidence !== 'unresolved') {
      fail('unknown days require unresolved confidence');
    }
    return {
      ...entry,
      ...(hasPorts ? { portIndices: [...entry.portIndices] } : {}),
      date: start === null ? null : new Date(start + index * DAY_MS).toISOString().slice(0, 10),
    };
  });
  return { ...schedule, sources: (schedule.sources || []).map(source => ({ ...source })), days };
}
