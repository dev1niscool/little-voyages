import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import { cruises } from '../src/data.js';
import { destinations } from '../src/destinations.js';
import { shoreExcursions, nonCruiseVisits } from '../src/personal-visits.js';
import { computeStatistics, isScenicStop, statsMethodology } from '../src/statistics-data.js';

export const EXPORT_FILES = Object.freeze({
  logbook: 'little-voyages-logbook.json',
  statistics: 'little-voyages-statistics.json',
  cruises: 'little-voyages-cruises.csv',
  ports: 'little-voyages-ports.csv',
  routes: 'little-voyages-routes.geojson',
  guide: 'little-voyages-guide.md',
  complete: 'little-voyages-complete.zip',
});

const SITE_URL = 'https://dev1niscool.github.io/little-voyages/';
const POLICY_URL = `${SITE_URL}AI-USAGE.md`;
const usage = Object.freeze({
  policyUrl: POLICY_URL,
  authorizedUse: 'The owner may download and provide these files to an AI agent for a specifically authorized task. This export is not general permission for third parties to collect or reuse the collection.',
  restrictions: 'No unauthorized automated harvesting, reuse, model training, fine-tuning, or incorporation into training datasets. A task-specific handoff does not authorize unrelated retention, redistribution, or training. No permission is granted to probe, exploit, or disrupt the site or repository.',
  enforcement: 'These statements express the owner’s usage preferences and do not technically prevent access to public files.',
});

const precision = 'Distance values are reproducible calculations from illustrative routes, not measured ship mileage. Extra decimal places express calculation precision only, not real-world accuracy. Trip hours include time ashore. Coordinates are approximate map locations; routes must not be used for navigation.';
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const normalized = value => String(value || '').trim().toLocaleLowerCase('en');
const destinationByName = new Map(destinations.map(place => [normalized(place.name), place]));
const personalVisits = Object.freeze({ shoreExcursions, nonCruiseVisits });
const emptyPersonalVisits = Object.freeze({ shoreExcursions: [], nonCruiseVisits: { countries: [], specialPlaces: [] } });

/** RFC 4180 quoting, with formula-like textual cells made inert for spreadsheets. */
export function csvCell(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('CSV numbers must be finite.');
    return String(value);
  }
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[\t\r\n]|^\s*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function encodeCsv(columns, rows) {
  return [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function samePort(first, last) {
  const validCoordinates = port => Number.isFinite(port?.lon) && Math.abs(port.lon) <= 180
    && Number.isFinite(port?.lat) && Math.abs(port.lat) <= 90;
  const key = port => validCoordinates(port)
    ? `${port.lon.toFixed(4)},${port.lat.toFixed(4)}`
    : `${normalized(port?.name)}|${normalized(port?.country)}`;
  return key(first) === key(last);
}

export function itineraryRows(records) {
  return records.flatMap(cruise => {
    const ports = cruise.ports || [];
    const roundTrip = ports.length > 1 && samePort(ports[0], ports.at(-1));
    return ports.map((port, index) => {
      const finalReturn = roundTrip && index === ports.length - 1;
      const scenic = isScenicStop(port);
      const kind = scenic ? 'scenic cruising' : index === 0 ? 'departure'
        : finalReturn ? 'round-trip return' : index === ports.length - 1 ? 'arrival' : 'port call';
      const place = destinationByName.get(normalized(port.country));
      return [cruise.id, cruise.ship, cruise.line, cruise.startDate, cruise.endDate,
        index + 1, port.name, port.country, port.lon, port.lat, kind,
        finalReturn, !finalReturn && !scenic, place?.type || 'unclassified',
        place?.status || 'Classification pending', cruise.confidence];
    });
  });
}

function readableGuide(records, statistics, metadata, visits, personalVisitsSha256) {
  const definitions = Object.entries(statsMethodology).map(([key, description]) => `- **${key}:** ${description}`).join('\n');
  const places = [...statistics.countries, ...statistics.territories, ...statistics.unclassifiedPlaces]
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .map(place => `- ${place.flag} **${place.name}** — ${place.status}. ${place.isShoreExcursion ? `Owner-confirmed shore excursion; not a port. ${place.note} No cruise IDs or travel dates are inferred.` : `Ports: ${place.ports.join('; ')}. Cruise IDs: ${place.cruiseIds.join(', ')}.`}${place.disputeNote ? ` ${place.disputeNote}` : ''}${place.disputeUrl ? ` Dispute background: <${place.disputeUrl}>.` : ''}${place.sources.length ? ` Classification evidence: ${place.sources.map(url => `<${url}>`).join(', ')}.` : ''}`).join('\n');
  const nonCruisePlaces = [...visits.nonCruiseVisits.countries, ...visits.nonCruiseVisits.specialPlaces]
    .map(place => `- ${place.flag} **${place.name}** — ${place.status}.${place.note ? ` ${place.note}` : ''}${place.disputeUrl ? ` Dispute background: <${place.disputeUrl}>.` : ''}${place.contextUrl ? ` Background: <${place.contextUrl}>.` : ''}${place.sources?.length ? ` Status references: ${place.sources.map(url => `<${url}>`).join(', ')}.` : ''}`).join('\n');
  const excursionNotes = visits.shoreExcursions.map(place => `- ${place.flag} **${place.name}**: ${place.note} Evidence: ${place.evidence}. Approximate visit count: ${place.approximateVisits ?? 'unknown'}. No port, specific cruise association, travel date, or route is invented.`).join('\n');
  const research = records.map(cruise => `### Cruise ${cruise.id}: ${cruise.ship} — ${cruise.region}

- Original record date: ${cruise.originalDate}; recorded year: ${cruise.year}.
- Researched dates: ${cruise.startDate ?? 'unknown'} to ${cruise.endDate ?? 'unknown'}; nights: ${cruise.nights ?? 'unknown'}; confidence: ${cruise.confidence}.
- Cruise line: ${cruise.line}.
- Original ship label: ${cruise.originalShip ?? cruise.ship}; original destination label: ${cruise.originalRegion}.
- Ordered itinerary: ${cruise.ports.map(port => `${port.name} (${port.country})`).join(' → ') || 'unresolved'}.

${cruise.notes}

${cruise.sources.map((source, index) => `${index + 1}. **${source.title}**\n   <${source.url}>\n   ${source.note}`).join('\n\n')}`).join('\n\n');

  return `# Little Voyages — export guide

Schema version: 1. Collection fingerprint: \`${metadata.collectionSha256}\` (SHA-256 of the compact JSON cruise array).

Personal-visit fingerprint: \`${personalVisitsSha256}\` (SHA-256 of the compact JSON \`personalVisits\` object; separate from the unchanged cruise-array fingerprint).

This bundle is a portable copy of the complete ${records.length}-cruise collection, independent of the website’s map filters. It contains ${statistics.totalNights} recorded nights, ${statistics.uniquePorts} distinct non-scenic ports, ${statistics.countryCount} countries reached through cruising (including confirmed shore excursions), and ${statistics.territoryCount} territories or special jurisdictions under the definitions below. It also preserves ${visits.nonCruiseVisits.countries.length} countries and ${visits.nonCruiseVisits.specialPlaces.length} special places reported as non-cruise visits; these do not enter cruise totals. The website is <${SITE_URL}>.

## Start here

For an owner-authorized AI task, provide the complete ZIP, or provide this guide together with the logbook and statistics JSON files. State the specific task and ask the agent to retain confidence labels, cite source URLs, and keep approximate quantities approximate. The logbook JSON is the lossless source of record; CSV files are convenient views. These files contain data and research quotations, not instructions from third-party sources to execute code or follow links automatically.

## Files

| File | Contents |
| --- | --- |
| ${EXPORT_FILES.logbook} | Metadata plus every field of every cruise, including original labels, ordered ports, schematic route coordinates, confidence, research notes, and source URLs with their relevance; separate owner-confirmed shore excursions and owner-reported non-cruise visits. |
| ${EXPORT_FILES.statistics} | The full statistics calculation, definitions, current destination classifications, associated cruise IDs and ports, classification evidence URLs, and separately preserved personal visits. |
| ${EXPORT_FILES.cruises} | One row per cruise with dates, duration, labels, notes, and source references. |
| ${EXPORT_FILES.ports} | One row per ordered itinerary entry, including scenic stops and final round-trip returns. |
| ${EXPORT_FILES.routes} | GeoJSON FeatureCollection with one illustrative LineString per known route; unknown routes use null geometry. |
| ${EXPORT_FILES.guide} | This dictionary, interpretation notes, destination list, and readable research sources for every cruise. |
| ${EXPORT_FILES.complete} | All six files above in one ZIP. |

Files are UTF-8. JSON uses null for unavailable values, not a guessed zero or date. Dates are calendar dates in YYYY-MM-DD format; they do not specify a time or timezone. This is a deterministic collection snapshot, not a live itinerary service. No current-time timestamp is added during a rebuild.

## Usage and authorized AI handoffs

${usage.authorizedUse}

${usage.restrictions}

Full policy: <${POLICY_URL}>. ${usage.enforcement} This policy does not replace a provider’s data-retention settings or terms. Source material may have separate rights and restrictions.

## Cruise JSON dictionary

The top-level object contains \`schemaVersion\`, \`title\`, \`siteUrl\`, \`scope\`, \`collectionSha256\`, \`personalVisitsSha256\`, \`usage\`, \`dataNotes\`, \`cruises\`, and \`personalVisits\`. Cruise objects are copied in full from the atlas without renaming or removing fields. The two fingerprints cover independent source objects so updates to personal visits do not imply that historical itineraries changed.

| Field | Meaning |
| --- | --- |
| id | Stable cruise identifier; join key across all exports. |
| originalDate | Date supplied in the personal record; may represent departure, arrival, or a day during the trip. |
| startDate / endDate | Researched or reconstructed sailing dates; read confidence and notes before treating them as certain. |
| nights | Recorded cruise night count; not an inclusive count of touched calendar dates. |
| ship / line / region | Normalized ship, cruise company, and itinerary region labels. |
| originalShip | Original ship wording, when retained separately from the normalized ship label. Absence means no separate label was needed. |
| originalRegion | Original destination wording retained by the data normalization. |
| year | Year of the original personal record; a cruise crossing New Year stays in this year. |
| ports | Ordered entries with name, country (a country or territory label), lat, and lon. Repeated calls and final returns are retained. Optional scenic/type fields are retained if present. No call dates or day numbers are inferred. |
| route | Illustrative route points in [longitude, latitude] order. Intermediate points may be offshore waypoints, not port calls. |
| anchor | [longitude, latitude] presentation anchor retained from the atlas data; not an actual vessel location or recorded visit. |
| confidence | confirmed, likely, or unresolved; these describe the historical itinerary match, not independent proof of every actual visit. |
| notes | Full research explanation, owner corrections, known changes, and remaining uncertainty. |
| sources | Entries with title, exact url, and note explaining the evidence supported by that source. |
| color | Website presentation color; no geographic or statistical meaning. |

**Confidence:** confirmed identifies a supported historical sailing match, while individual calls may still follow a published schedule rather than a verified actual track. Likely identifies a plausible reconstruction from the available evidence. Unresolved means the available record is insufficient. Notes and source relevance take precedence over a simplified confidence label. Itinerary records alone do not establish that a passenger went ashore, or that cruising was their only means of visiting a place. Separate personal visits are identified explicitly below.

## Personal visits

Both JSON files preserve the same \`personalVisits\` object. The shore excursions are confirmed by the owner; non-cruise visits are owner-reported. These records are separate from reconstructed ship calls. Classification links explain political status; they are not evidence of a personal visit.

- \`shoreExcursions\`: additional destinations visited ashore while cruising, each counted once as a country or special place, with a “Shore excursion” label in the website. An empty \`cruiseIds\` array means no specific sailing is confirmed for that visit. \`approximateVisits\` records a recollection, not an exact dated count. These visits add no cruise nights, port calls, or sailing miles.
- Optional \`candidateCruiseIds\` and \`candidatePort\` preserve possible sailing associations separately from confirmed \`cruiseIds\`. They do not affect the certainty of the visit or assign a travel date.
- \`nonCruiseVisits.countries\`: the owner’s separate non-cruise list (${visits.nonCruiseVisits.countries.map(place => place.name).join(', ') || 'none supplied'}).
- \`nonCruiseVisits.specialPlaces\`: the owner’s companion comparison list (${visits.nonCruiseVisits.specialPlaces.map(place => place.name).join(', ') || 'none supplied'}). These are not cruise destinations in these records.
- Visit rows retain \`name\`, \`flag\`, \`status\`, any \`note\`, \`evidence\`, source URLs, and any background/dispute links supplied in the source. Unknown dates and trip associations remain unknown. Fields absent from a personal-visit record must not be inferred from a nearby cruise.

${excursionNotes || 'No additional shore-excursion destinations are included in this export.'}

${visits.nonCruiseVisits.groupingNote || 'The personal comparison lists are separate from itinerary classifications.'} The “NOT by cruise” comparison is a playful presentation of the owner’s travel history, grouped as requested by the owner. Palestine is a UN non-member observer State with disputed status; Hong Kong is a Special Administrative Region of China. The status labels describe each place individually.

${visits.nonCruiseVisits.countNote ? `Country-count footnote: ${visits.nonCruiseVisits.countNote}` : ''}

${nonCruisePlaces || 'No non-cruise visits are included in this export.'}

## Statistics JSON dictionary and definitions

The statistics file has the same collection metadata plus \`personalVisitsSha256\`, \`personalVisits\`, \`methodology\`, \`precision\`, and \`statistics\`. Values in \`statistics\` exactly match the atlas calculation for the full collection with explicitly supplied shore excursions:

- \`cruiseCount\`, \`shipCount\`, \`lineCount\`: distinct cruises, normalized ship names, and cruise companies.
- \`totalNights\`, \`tripHours\`, \`knownDurationCruises\`, \`unknownDurationCruises\`, \`averageNights\`: duration totals and data coverage; averageNights excludes unknown durations.
- \`estimatedKm\`, \`estimatedMiles\`, \`estimatedNauticalMiles\`, \`earthLaps\`, \`routesMeasured\`, \`missingRoutes\`: approximate route distance and route coverage. Miles are statute miles; nautical miles use 1,852 metres.
- \`uniquePorts\`, \`portCalls\`, \`scenicStops\`: distinct port locations, eligible recorded calls, and scenic entries. Shore excursions do not change these quantities.
- \`itineraryPlaceCount\`: distinct raw country/territory labels from itinerary ports (44 in the current complete collection). \`placeCount\` additionally includes distinct confirmed shore-excursion destinations (46 with Monaco and Vatican City). Non-cruise visits do not enter either total.
- \`countryCount\`, \`territoryCount\`, \`countries\`, \`territories\`, \`unclassifiedPlaces\`: explicit destination classifications. Destination rows contain name, flag, type, status, sovereign association, classification source URLs, distinct port names, and cruiseIds. Flags are decorative. The country category includes sovereign states plus Aruba, Curaçao, and Sint Maarten, constituent countries of the Kingdom of the Netherlands. Their individual status labels and classification sources are preserved. A sovereign association is not an additional visit.
- \`shoreExcursionPlaces\`: additional country/territory destination rows with their owner-confirmed shore-excursion evidence. Monaco and Vatican City have empty \`ports\` and \`cruiseIds\` arrays; these must not be filled by guessing. Each contributes one distinct country, regardless of the number of visits. Monaco’s candidate sailing and port are stored separately from confirmed cruise IDs.
- \`years\`: chronological rows containing year, cruises, nights, and approximate miles.
- \`lines\`: rows with name, count, nights, and presentation color.
- \`regions\`: grouped region rows with name, count, nights, and approximate miles.
- \`topPorts\`: all distinct non-scenic ports, sorted by count, with name, country, and call count.
- \`longestCruises\`: all tied longest-duration cruises, with id, ship, and nights; \`farthestCruise\` contains id, ship, and approximate miles, or null if none is measurable.
- \`firstDate\`, \`lastDate\`, \`spanYears\`, \`busiestYears\`: collection date bounds, calendar-year span, and all tied years with the greatest cruise count.

${definitions}

${precision} Destination status reflects the atlas’s current classification, not necessarily the constitutional status at the time of each cruise. In particular, the Dutch Caribbean’s status changed in 2010. “Territories & special places” is a presentation grouping, not a claim that these jurisdictions are unrecognized states.

## CSV and GeoJSON conventions

Both CSV files have a header row and use RFC 4180 quoting and CRLF row endings. Quotes are doubled within quoted cells; embedded line breaks stay within the cell. Empty cells represent unavailable optional fields. Formula-like text cells beginning with =, +, -, @, tab, or a line break (including an operator after whitespace) receive a leading apostrophe for safer spreadsheet opening. This affects only the CSV representation; the JSON preserves exact text. Negative numeric coordinates stay numeric. The \`sources_json\` cell is a JSON array, preserving each source’s title, URL, and note without an ambiguous separator.

The CSV and GeoJSON files cover recorded cruises only. Confirmed Monaco and Vatican City shore excursions and owner-reported non-cruise travel remain in the JSON files and this guide; they are never fabricated as extra cruise rows, port calls, or ship routes.

Cruise CSV columns use the corresponding dictionary fields in snake_case, plus \`port_entry_count\` (all itinerary entries), \`route_point_count\` (ports and illustrative waypoints), and \`sources_json\`. The CSV does not duplicate full geometry; use the logbook or GeoJSON for coordinates.

The ports CSV joins on \`cruise_id\`. \`port_sequence\` starts at 1 and means position in the recorded itinerary, not a cruise day or dated call. \`cruise_start_date\` and \`cruise_end_date\` describe the whole voyage. \`stop_kind\` identifies departure, port call, arrival, round-trip return, or scenic cruising. \`is_final_roundtrip_return\` marks the repeated endpoint. \`included_in_port_statistics\` excludes that repeated endpoint and scenic cruising; other repeated calls stay counted. \`destination_type\` and \`destination_status\` describe the current country/territory classification. \`cruise_confidence\` applies to the researched voyage, not independent validation of that particular stop.

GeoJSON follows longitude, latitude order in decimal degrees on WGS 84 (RFC 7946). Feature IDs equal cruise IDs. Feature properties retain the cruise labels, dates, confidence, notes, and source references, and explicitly mark the geometry as illustrative. LineString points are not timed measurements. A line passing a coast or country does not establish a visit. No navigational precision or actual sailing track is claimed.

## Countries and special jurisdictions

${places}

## Complete research notes and sources

${research}
`;
}

/** Pure deterministic export generation, usable by tests without writing files. */
export function buildExportFiles(records = cruises, visits = records === cruises ? personalVisits : emptyPersonalVisits) {
  const statistics = computeStatistics(records, { shoreExcursions: visits.shoreExcursions });
  const personalVisitsSha256 = createHash('sha256').update(JSON.stringify(visits)).digest('hex');
  const metadata = {
    schemaVersion: 1,
    title: 'Little Voyages',
    siteUrl: SITE_URL,
    scope: 'Complete cruise collection; independent of map filters.',
    collectionSha256: createHash('sha256').update(JSON.stringify(records)).digest('hex'),
    usage,
  };
  const dataNotes = {
    coordinates: 'WGS 84 decimal degrees; route and anchor arrays are [longitude, latitude]. Port objects use explicit lon and lat fields.',
    precision,
    provenance: 'Original records combined with historical itinerary research and owner corrections. All research notes, confidence labels, and source references are preserved in each cruise.',
    dates: 'Original dates may describe departure, arrival, or a day during the trip. Researched dates inherit the confidence and caveats of their record. No per-port dates or times are inferred.',
    personalVisits: 'The separate personalVisits object records owner-confirmed shore excursions and owner-reported non-cruise destinations, with approximate visit counts when supplied. Empty cruiseIds mean no specific sailing is confirmed for that visit. Optional candidateCruiseIds and candidatePort describe possible sailing associations, not uncertainty about the visit itself. These records add no invented ports, cruises, routes, nights, or sailing miles.',
  };
  const columns = ['cruise_id', 'year', 'original_date', 'start_date', 'end_date', 'nights', 'ship', 'original_ship', 'line', 'region', 'original_region', 'confidence', 'port_entry_count', 'route_point_count', 'notes', 'sources_json'];
  const rows = records.map(cruise => [cruise.id, cruise.year, cruise.originalDate, cruise.startDate, cruise.endDate, cruise.nights, cruise.ship, cruise.originalShip, cruise.line, cruise.region, cruise.originalRegion, cruise.confidence, cruise.ports?.length ?? 0, cruise.route?.length ?? 0, cruise.notes, cruise.sources]);
  const portColumns = ['cruise_id', 'ship', 'line', 'cruise_start_date', 'cruise_end_date', 'port_sequence', 'port_name', 'place_name', 'longitude', 'latitude', 'stop_kind', 'is_final_roundtrip_return', 'included_in_port_statistics', 'destination_type', 'destination_status', 'cruise_confidence'];
  const geojson = {
    type: 'FeatureCollection',
    ...metadata,
    description: dataNotes.coordinates + ' ' + precision,
    features: records.map(cruise => ({
      type: 'Feature',
      id: cruise.id,
      properties: {
        cruiseId: cruise.id, ship: cruise.ship, line: cruise.line, region: cruise.region,
        year: cruise.year, originalDate: cruise.originalDate, startDate: cruise.startDate,
        endDate: cruise.endDate, nights: cruise.nights, confidence: cruise.confidence,
        notes: cruise.notes, sources: cruise.sources, illustrative: true,
        geometryMeaning: 'Schematic itinerary route, not a measured ship track or evidence of shore visits.',
      },
      geometry: Array.isArray(cruise.route) && cruise.route.length >= 2
        ? { type: 'LineString', coordinates: cruise.route } : null,
    })),
  };
  const files = {
    [EXPORT_FILES.logbook]: strToU8(json({ ...metadata, personalVisitsSha256, dataNotes, cruises: records, personalVisits: visits })),
    [EXPORT_FILES.statistics]: strToU8(json({ ...metadata, personalVisitsSha256, methodology: statsMethodology, precision, statistics, personalVisits: visits })),
    [EXPORT_FILES.cruises]: strToU8(encodeCsv(columns, rows)),
    [EXPORT_FILES.ports]: strToU8(encodeCsv(portColumns, itineraryRows(records))),
    [EXPORT_FILES.routes]: strToU8(json(geojson)),
    [EXPORT_FILES.guide]: strToU8(readableGuide(records, statistics, metadata, visits, personalVisitsSha256)),
  };
  // ZIP uses local calendar components. A fixed local date makes bytes stable
  // across rebuild times and timezones while remaining within ZIP's date range.
  const zippedFiles = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, [bytes, { mtime: new Date(2000, 0, 1, 0, 0, 0) }]]));
  files[EXPORT_FILES.complete] = zipSync(zippedFiles, { level: 6 });
  return files;
}

async function writeExports() {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/downloads');
  await mkdir(directory, { recursive: true });
  const files = buildExportFiles();
  for (const [name, bytes] of Object.entries(files)) await writeFile(resolve(directory, name), bytes);
  console.log(`Prepared ${Object.keys(files).length} downloads for ${cruises.length} cruises.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await writeExports();
