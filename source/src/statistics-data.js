// These are itinerary statistics, not a measurement of time aboard or ship tracks.
export const EARTH_CIRCUMFERENCE_KM = 40_075.017;
const MEAN_EARTH_RADIUS_KM = 6_371.0088;
const KM_PER_MILE = 1.609344;
const KM_PER_NAUTICAL_MILE = 1.852;

export const statsMethodology = Object.freeze({
  duration: 'Cruise days use the recorded night counts. Trip hours are nights × 24 and include time ashore; actual hours aboard and underway were not recorded. Unknown durations are excluded.',
  distance: 'Estimated distance adds great-circle segments along the atlas’s schematic routes. These are not GPS tracks or logged ship mileage; actual sailing distances vary. Miles are statute miles.',
  earth: 'Earth equivalents divide the estimated distance by the equatorial circumference of 40,075.017 km. This is a distance comparison, not a claim that these voyages circled the globe.',
  ports: 'Port visits count recorded itinerary stops, including embarkation and one-way arrival ports. The starting port counts once for a round trip: its final return is excluded, while separate repeat calls such as Castaway Cay count again. Glacier Bay and other scenic cruising stops are counted separately. Port visits do not establish that you went ashore.',
  places: 'Places are distinct country and territory labels attached to recorded ports. Dependencies and territories are listed separately, so this is not a sovereign-country count. Counts inherit the atlas’s itinerary uncertainty.',
  years: 'Each trip belongs to the year of your original cruise record, including sailings that cross New Year. The collection’s span is the difference between its first and last recorded calendar years.',
});

function validCoordinate(point) {
  return Array.isArray(point) && point.length >= 2
    && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
    && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90;
}

/** Great-circle distance between [longitude, latitude] points, in kilometres. */
export function haversineKm(from, to) {
  if (!validCoordinate(from) || !validCoordinate(to)) return null;
  const radians = Math.PI / 180;
  const dLat = (to[1] - from[1]) * radians;
  const dLon = (to[0] - from[0]) * radians;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from[1] * radians) * Math.cos(to[1] * radians) * Math.sin(dLon / 2) ** 2;
  return 2 * MEAN_EARTH_RADIUS_KM * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

/** Missing or incomplete routes remain unknown rather than becoming a guessed track. */
export function routeDistanceKm(route) {
  if (!Array.isArray(route) || route.length < 2 || !route.every(validCoordinate)) return null;
  return route.slice(1).reduce((distance, point, i) => distance + haversineKm(route[i], point), 0);
}

export function isScenicStop(port) {
  return port?.scenic === true || port?.type === 'scenic'
    || /glacier bay|hubbard glacier|tracy arm|endicott arm|inside passage|scenic cruis/i.test(port?.name || '');
}

const normalized = value => typeof value === 'string' ? value.trim().toLocaleLowerCase('en') : '';
const hasDuration = cruise => Number.isFinite(cruise.nights) && cruise.nights >= 0;

function portKey(port) {
  return validCoordinate([port.lon, port.lat])
    ? `${port.lon.toFixed(4)},${port.lat.toFixed(4)}`
    : `${normalized(port.name)}|${normalized(port.country)}`;
}

function calendarYear(cruise) {
  if (Number.isInteger(cruise.year) && cruise.year > 0) return cruise.year;
  const value = cruise.originalDate || cruise.startDate;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? Number(value.slice(0, 4)) : null;
}

function regionName(region = '') {
  if (/mediterranean|adriatic/i.test(region)) return 'Mediterranean';
  if (/caribbean|bahamas|cuba/i.test(region)) return 'Caribbean & Bahamas';
  if (/scandinavia|russia|british isle|baltic|northern europe/i.test(region)) return 'Northern Europe';
  if (/alaska/i.test(region)) return 'Alaska';
  if (/mexican riviera|mexico/i.test(region)) return 'Mexican Riviera';
  if (/japan|korea/i.test(region)) return 'Japan & Korea';
  return region || 'Unspecified';
}

function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date));
}

/** Aggregate the supplied selection; neither cruises nor their nested arrays are changed. */
export function computeStatistics(input = []) {
  const cruises = Array.isArray(input) ? input.filter(cruise => cruise && typeof cruise === 'object') : [];
  const ships = new Set();
  const lines = new Map();
  const years = new Map();
  const regions = new Map();
  const ports = new Map();
  const places = new Set();
  const starts = [];
  const ends = [];
  const durations = [];
  let totalNights = 0;
  let estimatedKm = 0;
  let routesMeasured = 0;
  let portCalls = 0;
  let scenicStops = 0;
  let farthestCruise = null;

  for (const cruise of cruises) {
    if (normalized(cruise.ship)) ships.add(normalized(cruise.ship));
    const nights = hasDuration(cruise) ? cruise.nights : 0;
    if (hasDuration(cruise)) durations.push({ id: cruise.id, ship: cruise.ship, nights });
    totalNights += nights;
    const km = routeDistanceKm(cruise.route);
    const miles = (km ?? 0) / KM_PER_MILE;
    if (km !== null) {
      estimatedKm += km;
      routesMeasured += 1;
      if (!farthestCruise || miles > farthestCruise.miles) farthestCruise = { id: cruise.id, ship: cruise.ship, miles };
    }

    const year = calendarYear(cruise);
    if (year !== null) {
      if (!years.has(year)) years.set(year, { year, cruises: 0, nights: 0, miles: 0 });
      const row = years.get(year);
      row.cruises += 1;
      row.nights += nights;
      row.miles += miles;
    }
    if (normalized(cruise.line)) {
      const key = normalized(cruise.line);
      if (!lines.has(key)) lines.set(key, { name: cruise.line, count: 0, nights: 0, color: cruise.color || '#637be2' });
      const row = lines.get(key);
      row.count += 1;
      row.nights += nights;
    }
    const region = regionName(cruise.region);
    if (!regions.has(region)) regions.set(region, { name: region, count: 0, nights: 0, miles: 0 });
    const regionRow = regions.get(region);
    regionRow.count += 1;
    regionRow.nights += nights;
    regionRow.miles += miles;

    // Preserve meaningful repeated calls in the middle (e.g. Disney's double-dip).
    const visits = Array.isArray(cruise.ports) ? cruise.ports.filter(port => port && port.name) : [];
    const roundTrip = visits.length > 1 && portKey(visits[0]) === portKey(visits.at(-1));
    for (const port of roundTrip ? visits.slice(0, -1) : visits) {
      if (isScenicStop(port)) { scenicStops += 1; continue; }
      const key = portKey(port);
      if (!ports.has(key)) ports.set(key, { name: port.name, country: port.country || '', count: 0 });
      ports.get(key).count += 1;
      portCalls += 1;
      if (normalized(port.country)) places.add(normalized(port.country));
    }
    const startDate = validDate(cruise.startDate) ? cruise.startDate : cruise.originalDate;
    const endDate = validDate(cruise.endDate) ? cruise.endDate : cruise.originalDate;
    if (validDate(startDate)) starts.push(startDate);
    if (validDate(endDate)) ends.push(endDate);
  }

  const orderedYears = [...years.values()].sort((a, b) => a.year - b.year);
  const mostCruises = Math.max(0, ...orderedYears.map(row => row.cruises));
  const longest = Math.max(0, ...durations.map(cruise => cruise.nights));
  const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);
  return {
    cruiseCount: cruises.length,
    shipCount: ships.size,
    lineCount: lines.size,
    totalNights,
    tripHours: totalNights * 24,
    knownDurationCruises: durations.length,
    unknownDurationCruises: cruises.length - durations.length,
    estimatedKm,
    estimatedMiles: estimatedKm / KM_PER_MILE,
    estimatedNauticalMiles: estimatedKm / KM_PER_NAUTICAL_MILE,
    earthLaps: estimatedKm / EARTH_CIRCUMFERENCE_KM,
    routesMeasured,
    missingRoutes: cruises.length - routesMeasured,
    uniquePorts: ports.size,
    placeCount: places.size,
    portCalls,
    scenicStops,
    years: orderedYears,
    lines: [...lines.values()].sort(byCount),
    regions: [...regions.values()].sort(byCount),
    topPorts: [...ports.values()].sort(byCount),
    longestCruises: durations.filter(cruise => cruise.nights === longest),
    farthestCruise,
    firstDate: starts.sort()[0] || null,
    lastDate: ends.sort().at(-1) || null,
    spanYears: orderedYears.length ? orderedYears.at(-1).year - orderedYears[0].year : 0,
    busiestYears: orderedYears.filter(row => row.cruises === mostCruises),
    averageNights: durations.length ? totalNights / durations.length : 0,
  };
}
