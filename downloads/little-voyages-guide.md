# Little Voyages — export guide

Schema version: 1. Collection fingerprint: `16554d78a47cde944cb0a16bfcf648f25f3e3df7eca20ab98c7bafe7aba02820` (SHA-256 of the compact JSON cruise array).

Personal-visit fingerprint: `ab1a17bd578f74a7d64b5d260f696dc96e1fd1207e30e207e9b2e7af1c40d45f` (SHA-256 of the compact JSON `personalVisits` object; separate from the unchanged cruise-array fingerprint).

This bundle is a portable copy of the complete 29-cruise collection, independent of the website’s map filters. It contains 202 recorded nights, 87 distinct non-scenic ports, 40 countries reached through cruising (including confirmed shore excursions), and 6 territories or special jurisdictions under the definitions below. It also preserves 5 countries and 2 special places reported as non-cruise visits; these do not enter cruise totals. The website is <https://dev1niscool.github.io/little-voyages/>.

## Start here

For an owner-authorized AI task, provide the complete ZIP, or provide this guide together with the logbook and statistics JSON files. State the specific task and ask the agent to retain confidence labels, cite source URLs, and keep approximate quantities approximate. The logbook JSON is the lossless source of record; CSV files are convenient views. These files contain data and research quotations, not instructions from third-party sources to execute code or follow links automatically.

## Files

| File | Contents |
| --- | --- |
| little-voyages-logbook.json | Metadata plus every field of every cruise, including day-by-day schedules with sea days, original labels, ordered ports, schematic route coordinates, confidence, research notes, and source URLs with their relevance; separate owner-confirmed shore excursions and owner-reported non-cruise visits. |
| little-voyages-statistics.json | The full statistics calculation, definitions, current destination classifications, associated cruise IDs and ports, classification evidence URLs, and separately preserved personal visits. |
| little-voyages-cruises.csv | One row per cruise with dates, duration, labels, notes, and source references. |
| little-voyages-ports.csv | One row per ordered port or scenic entry, including final round-trip returns. Sea days are in the logbook JSON and guide, not this port table. |
| little-voyages-routes.geojson | GeoJSON FeatureCollection with one illustrative LineString per known route; unknown routes use null geometry. |
| little-voyages-guide.md | This dictionary, interpretation notes, destination list, and readable day-by-day schedules and research sources for every cruise. |
| little-voyages-complete.zip | All six files above in one ZIP. |

Files are UTF-8. JSON uses null for unavailable values, not a guessed zero or date. Dates are calendar dates in YYYY-MM-DD format; they do not specify a time or timezone. This is a deterministic collection snapshot, not a live itinerary service. No current-time timestamp is added during a rebuild.

## Usage and authorized AI handoffs

The owner may download and provide these files to an AI agent for a specifically authorized task. This export is not general permission for third parties to collect or reuse the collection.

No unauthorized automated harvesting, reuse, model training, fine-tuning, or incorporation into training datasets. A task-specific handoff does not authorize unrelated retention, redistribution, or training. No permission is granted to probe, exploit, or disrupt the site or repository.

Full policy: <https://dev1niscool.github.io/little-voyages/AI-USAGE.md>. These statements express the owner’s usage preferences and do not technically prevent access to public files. This policy does not replace a provider’s data-retention settings or terms. Source material may have separate rights and restrictions.

## Cruise JSON dictionary

The top-level object contains `schemaVersion`, `title`, `siteUrl`, `scope`, `collectionSha256`, `personalVisitsSha256`, `usage`, `dataNotes`, `cruises`, and `personalVisits`. Cruise objects are copied in full from the atlas without renaming or removing fields. The two fingerprints cover independent source objects so updates to personal visits do not imply that historical itineraries changed.

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
| ports | Ordered entries with name, country (a country or territory label), lat, and lon. Repeated calls and final returns are retained. Optional scenic/type fields are retained if present. Array positions describe recorded calls, not day numbers; see dailyItinerary for the daily schedule. |
| dailyItinerary | Day-by-day schedule with its own confidence, note, sources, and days; sea days do not become ports or route points. |
| dailyItinerary.confidence | confirmed, likely, or unresolved for the day-by-day reconstruction, separately from the cruise's overall historical-match confidence. |
| dailyItinerary.note / sources | Schedule explanation and evidence, with source title, exact url, and relevance note. Read these before treating a reconstructed daily schedule as certain. |
| dailyItinerary.days | One entry for each calendar day from departure through arrival, numbered 1 through nights + 1. |
| dailyItinerary.days[].day / date | One-based cruise day and its YYYY-MM-DD calendar date, calculated from startDate plus day minus 1. These dates inherit the sailing-date and schedule confidence; no arrival/departure times or timezone are supplied. |
| dailyItinerary.days[].type | port, sea, scenic, or unknown. Sea means an at-sea day; scenic means scenic cruising, not an ordinary port call. Unknown preserves an unresolved day instead of guessing its activity. |
| dailyItinerary.days[].portIndices | Zero-based references into this cruise's ports array, used only for port/scenic days. An overnight stay can repeat the same index on consecutive days; multiple indices on one day describe multiple calls or scenic locations that day. Neither case adds entries to the ports array. |
| dailyItinerary.days[].note | Optional explanation of that day's activity or uncertainty. |
| route | Illustrative route points in [longitude, latitude] order. Intermediate points may be offshore waypoints, not port calls. |
| anchor | [longitude, latitude] presentation anchor retained from the atlas data; not an actual vessel location or recorded visit. |
| confidence | confirmed, likely, or unresolved; these describe the historical itinerary match, not independent proof of every actual visit. |
| notes | Full research explanation, owner corrections, known changes, and remaining uncertainty. |
| sources | Entries with title, exact url, and note explaining the evidence supported by that source. |
| color | Website presentation color; no geographic or statistical meaning. |

**Confidence:** confirmed identifies a supported historical sailing match, while individual calls may still follow a published schedule rather than a verified actual track. Likely identifies a plausible reconstruction from the available evidence. Unresolved means the available record is insufficient. Notes and source relevance take precedence over a simplified confidence label. Itinerary records alone do not establish that a passenger went ashore, or that cruising was their only means of visiting a place. Separate personal visits are identified explicitly below.

## Personal visits

Both JSON files preserve the same `personalVisits` object. The shore excursions are confirmed by the owner; non-cruise visits are owner-reported. These records are separate from reconstructed ship calls. Classification links explain political status; they are not evidence of a personal visit.

- `shoreExcursions`: additional destinations visited ashore while cruising, each counted once as a country or special place, with a “Shore excursion” label in the website. An empty `cruiseIds` array means no specific sailing is confirmed for that visit. `approximateVisits` records a recollection, not an exact dated count. These visits add no cruise nights, port calls, or sailing miles.
- Optional `candidateCruiseIds` and `candidatePort` preserve possible sailing associations separately from confirmed `cruiseIds`. They do not affect the certainty of the visit or assign a travel date.
- `nonCruiseVisits.countries`: the owner’s separate non-cruise list (China, Egypt, India, Israel, South Africa).
- `nonCruiseVisits.specialPlaces`: the owner’s companion comparison list (Palestine, Hong Kong). These are not cruise destinations in these records.
- Visit rows retain `name`, `flag`, `status`, any `note`, `evidence`, source URLs, and any background/dispute links supplied in the source. Unknown dates and trip associations remain unknown. Fields absent from a personal-visit record must not be inferred from a nearby cruise.

- 🇻🇦 **Vatican City**: The owner confirms visiting Vatican City as a cruise shore excursion, by car while the ship was docked, approximately twice. Counted as one country; no ship port or dated sailing association is added. Evidence: owner-confirmed. Approximate visit count: 2. No port, specific cruise association, travel date, or route is invented.
- 🇲🇨 **Monaco**: The owner confirms visiting Monaco on a shore excursion from Villefranche, France, during the August 15–21, 2018 Celebrity Reflection cruise. Counted as one country. Evidence: owner-confirmed. Approximate visit count: unknown. No port, specific cruise association, travel date, or route is invented.

This is a personal travel grouping, not a claim about sovereignty. These owner-reported visits happened without a cruise and are excluded from every cruise total. The “NOT by cruise” comparison is a playful presentation of the owner’s travel history, grouped as requested by the owner. Palestine is a UN non-member observer State with disputed status; Hong Kong is a Special Administrative Region of China. The status labels describe each place individually.

Country-count footnote: This personal count uses 5, consistent with U.S. recognition; counting Palestine as a country makes 6.

- 🇨🇳 **China** — Sovereign country.
- 🇪🇬 **Egypt** — Sovereign country.
- 🇮🇳 **India** — Sovereign country.
- 🇮🇱 **Israel** — Sovereign country.
- 🇿🇦 **South Africa** — Sovereign country.
- 🇵🇸 **Palestine** — UN non-member observer State. Shown in this personal “territories & special places” group. Palestine is a UN non-member observer State; recognition and borders remain disputed. A majority of UN member countries recognize Palestine as a state, but the United States does not. Dispute background: <https://en.wikipedia.org/wiki/Legal_status_of_Palestine>. Status references: <https://www.un.org/en/node/123012>, <https://www.un.org/unispal/document/special-committee-israeli-practices-report-05sep25/>, <https://www.cbsnews.com/news/marco-rubio-secretary-of-state-face-the-nation-transcript-10-05-2025/>.
- 🇭🇰 **Hong Kong** — Special Administrative Region of China. A Special Administrative Region of China, listed separately in this personal travel comparison. Hong Kong participates separately as “Hong Kong, China”: a WTO member and separate customs territory, and an APEC member economy. These economic arrangements do not make it an independent country. Background: <https://en.wikipedia.org/wiki/Hong_Kong>. Status references: <https://www.basiclaw.gov.hk/en/basiclaw/chapter1.html>, <https://www.wto.org/english/thewto_e/countries_e/hong_kong_china_e.htm>, <https://www.apec.org/who-we-are/our-members>, <https://www.tid.gov.hk/en/our_work/hk_participation_in_ito/wto/overview/hk_participation.html>.

## Statistics JSON dictionary and definitions

The statistics file has the same collection metadata plus `personalVisitsSha256`, `personalVisits`, `methodology`, `precision`, and `statistics`. Values in `statistics` exactly match the atlas calculation for the full collection with explicitly supplied shore excursions:

- `cruiseCount`, `shipCount`, `lineCount`: distinct cruises, normalized ship names, and cruise companies.
- `totalNights`, `tripHours`, `knownDurationCruises`, `unknownDurationCruises`, `averageNights`: duration totals and data coverage; averageNights excludes unknown durations.
- `estimatedKm`, `estimatedMiles`, `estimatedNauticalMiles`, `earthLaps`, `routesMeasured`, `missingRoutes`: approximate route distance and route coverage. Miles are statute miles; nautical miles use 1,852 metres.
- `uniquePorts`, `portCalls`, `scenicStops`: distinct port locations, eligible recorded calls, and scenic entries. Shore excursions do not change these quantities.
- `itineraryPlaceCount`: distinct raw country/territory labels from itinerary ports (44 in the current complete collection). `placeCount` additionally includes distinct confirmed shore-excursion destinations (46 with Monaco and Vatican City). Non-cruise visits do not enter either total.
- `countryCount`, `territoryCount`, `countries`, `territories`, `unclassifiedPlaces`: explicit destination classifications. Destination rows contain name, flag, type, status, sovereign association, classification source URLs, distinct port names, and cruiseIds. Flags are decorative. The country category includes sovereign states plus Aruba, Curaçao, and Sint Maarten, constituent countries of the Kingdom of the Netherlands. Their individual status labels and classification sources are preserved. A sovereign association is not an additional visit.
- `shoreExcursionPlaces`: additional country/territory destination rows with their owner-confirmed shore-excursion evidence. Monaco and Vatican City have empty `ports` arrays. Monaco is linked to cruise 20, the August 15–21, 2018 Celebrity Reflection sailing, through the owner-confirmed excursion from Villefranche, France. Vatican City has no confirmed sailing association, so its `cruiseIds` array remains empty. Each contributes one distinct country, regardless of the number of visits.
- `years`: chronological rows containing year, cruises, nights, and approximate miles.
- `lines`: rows with name, count, nights, and presentation color.
- `regions`: grouped region rows with name, count, nights, and approximate miles.
- `topPorts`: all distinct non-scenic ports, sorted by count, with name, country, and call count.
- `longestCruises`: all tied longest-duration cruises, with id, ship, and nights; `farthestCruise` contains id, ship, and approximate miles, or null if none is measurable.
- `firstDate`, `lastDate`, `spanYears`, `busiestYears`: collection date bounds, calendar-year span, and all tied years with the greatest cruise count.

- **duration:** Cruise days use the recorded night counts. Trip hours are nights × 24 and include time ashore; actual hours aboard and underway were not recorded. Unknown durations are excluded.
- **distance:** Estimated distance adds great-circle segments along the atlas’s schematic routes. These are not GPS tracks or logged ship mileage; actual sailing distances vary. Miles are statute miles.
- **earth:** Earth equivalents divide the estimated distance by the equatorial circumference of 40,075.017 km. This is a distance comparison, not a claim that these voyages circled the globe.
- **ports:** Port visits count recorded itinerary stops, including embarkation and one-way arrival ports. The starting port counts once for a round trip: its final return is excluded, while separate repeat calls such as Castaway Cay count again. Glacier Bay and other scenic cruising stops are counted separately. Port visits do not establish that you went ashore.
- **places:** Places are distinct country and territory labels attached to recorded ports, plus explicitly included personal shore visits. Dependencies and territories are listed separately, so this is not a sovereign-country count. The itinerary-only place count is retained separately. Counts inherit the atlas’s itinerary uncertainty.
- **destinations:** Countries and special places count distinct destinations in recorded cruise itineraries, including departure and one-way arrival ports and excluding scenic cruising. The full collection also includes Monaco and Vatican City, confirmed by the owner as cruise shore excursions. These add countries without adding ship ports, route segments, nights, or mileage. The country list includes sovereign states plus Aruba, Curaçao, and Sint Maarten, constituent countries of the Kingdom of the Netherlands. Other territories and Crown Dependencies appear separately. Visiting a constituent country or territory does not also count as a visit to its associated country. Itinerary records alone do not establish that you went ashore or that cruising was your only way of visiting a place. Counts inherit the atlas’s itinerary uncertainty; unfamiliar labels remain unclassified until reviewed. The separate non-cruise comparison is owner-reported and never contributes to cruise totals.
- **years:** Each trip belongs to the year of your original cruise record, including sailings that cross New Year. The collection’s span is the difference between its first and last recorded calendar years.

Distance values are reproducible calculations from illustrative routes, not measured ship mileage. Extra decimal places express calculation precision only, not real-world accuracy. Trip hours include time ashore. Coordinates are approximate map locations; routes must not be used for navigation. Destination status reflects the atlas’s current classification, not necessarily the constitutional status at the time of each cruise. In particular, the Dutch Caribbean’s status changed in 2010. “Territories & special places” is a presentation grouping, not a claim that these jurisdictions are unrecognized states.

## CSV and GeoJSON conventions

Both CSV files have a header row and use RFC 4180 quoting and CRLF row endings. Quotes are doubled within quoted cells; embedded line breaks stay within the cell. Empty cells represent unavailable optional fields. Formula-like text cells beginning with =, +, -, @, tab, or a line break (including an operator after whitespace) receive a leading apostrophe for safer spreadsheet opening. This affects only the CSV representation; the JSON preserves exact text. Negative numeric coordinates stay numeric. The `sources_json` cell is a JSON array, preserving each source’s title, URL, and note without an ambiguous separator.

The CSV and GeoJSON files cover recorded cruises only. Confirmed shore excursions can appear in the notes of an associated cruise, as Monaco does for cruise 20. The separate personal-visit records remain in the JSON files and this guide; they never create extra cruise rows, port calls, or ship routes.

Cruise CSV columns use the corresponding dictionary fields in snake_case, plus `port_entry_count` (all itinerary entries), `route_point_count` (ports and illustrative waypoints), and `sources_json`. The CSV does not duplicate full geometry; use the logbook or GeoJSON for coordinates.

The ports CSV joins on `cruise_id`. `port_sequence` starts at 1 and means position in the recorded itinerary, not a cruise day or dated call. It is a port/scenic-stop table, not a complete daily schedule: use `dailyItinerary` in the logbook JSON or the readable schedules in this guide for sea days, overnight stays, daily dates, and schedule confidence. `cruise_start_date` and `cruise_end_date` describe the whole voyage. `stop_kind` identifies departure, port call, arrival, round-trip return, or scenic cruising. `is_final_roundtrip_return` marks the repeated endpoint. `included_in_port_statistics` excludes that repeated endpoint and scenic cruising; other repeated calls stay counted. `destination_type` and `destination_status` describe the current country/territory classification. `cruise_confidence` applies to the researched voyage, not independent validation of that particular stop.

GeoJSON follows longitude, latitude order in decimal degrees on WGS 84 (RFC 7946). Feature IDs equal cruise IDs. Feature properties retain the cruise labels, dates, confidence, notes, and source references, and explicitly mark the geometry as illustrative. LineString points are not timed measurements. A line passing a coast or country does not establish a visit. No navigational precision or actual sailing track is claimed.

## Countries and special jurisdictions

- 🇦🇬 **Antigua and Barbuda** — Sovereign country. Ports: Antigua. Cruise IDs: 16.
- 🇦🇼 **Aruba** — Country within the Kingdom of the Netherlands. Ports: Aruba. Cruise IDs: 29. Classification evidence: <https://www.government.nl/faq/what-are-the-different-parts-of-the-kingdom-of-the-netherlands>.
- 🇧🇸 **Bahamas** — Sovereign country. Ports: Castaway Cay; Great Stirrup Cay; Half Moon Cay; Nassau. Cruise IDs: 1, 2, 3, 5, 6, 12, 19, 21, 23, 24.
- 🇧🇧 **Barbados** — Sovereign country. Ports: Barbados. Cruise IDs: 16.
- 🇧🇿 **Belize** — Sovereign country. Ports: Harvest Caye. Cruise IDs: 26.
- 🇨🇦 **Canada** — Sovereign country. Ports: Victoria. Cruise IDs: 8.
- 🇰🇾 **Cayman Islands** — British Overseas Territory. Ports: Grand Cayman. Cruise IDs: 9. Classification evidence: <https://www.gov.uk/government/publications/geographical-names-and-information>.
- 🇨🇷 **Costa Rica** — Sovereign country. Ports: Puerto Limón. Cruise IDs: 7.
- 🇭🇷 **Croatia** — Sovereign country. Ports: Dubrovnik. Cruise IDs: 10.
- 🇨🇺 **Cuba** — Sovereign country. Ports: Havana. Cruise IDs: 21.
- 🇨🇼 **Curaçao** — Country within the Kingdom of the Netherlands. Ports: Curaçao. Cruise IDs: 29. Classification evidence: <https://www.government.nl/faq/what-are-the-different-parts-of-the-kingdom-of-the-netherlands>.
- 🇩🇰 **Denmark** — Sovereign country. Ports: Copenhagen; Fredericia. Cruise IDs: 15.
- 🇩🇲 **Dominica** — Sovereign country. Ports: Dominica. Cruise IDs: 14.
- 🇩🇴 **Dominican Republic** — Sovereign country. Ports: Amber Cove. Cruise IDs: 18, 24, 29.
- 🇪🇪 **Estonia** — Sovereign country. Ports: Tallinn. Cruise IDs: 15.
- 🇫🇮 **Finland** — Sovereign country. Ports: Helsinki. Cruise IDs: 15.
- 🇫🇷 **France** — Sovereign country. Ports: Ajaccio; Le Havre (Paris); Marseille; Villefranche. Cruise IDs: 10, 17, 20, 25.
- 🇩🇪 **Germany** — Sovereign country. Ports: Warnemünde (Berlin). Cruise IDs: 15.
- 🇬🇮 **Gibraltar** — British Overseas Territory. Ports: Gibraltar. Cruise IDs: 25. Administered by the United Kingdom; sovereignty claimed by Spain. Dispute background: <https://en.wikipedia.org/wiki/Status_of_Gibraltar>. Classification evidence: <https://www.gov.uk/government/publications/geographical-names-and-information>.
- 🇬🇷 **Greece** — Sovereign country. Ports: Athens (Piraeus); Mykonos; Santorini. Cruise IDs: 13, 22.
- 🇬🇩 **Grenada** — Sovereign country. Ports: Grenada. Cruise IDs: 14.
- 🇬🇬 **Guernsey** — Crown Dependency. Ports: St. Peter Port (Guernsey). Cruise IDs: 17. Classification evidence: <https://www.gov.uk/government/publications/guernsey-alderney-and-sark-knowledge-base-profile/guernsey-alderney-and-sark-knowledge-base-profile>.
- 🇭🇳 **Honduras** — Sovereign country. Ports: Roatán. Cruise IDs: 26.
- 🇮🇪 **Ireland** — Sovereign country. Ports: Cork (Cobh); Dún Laoghaire (Dublin). Cruise IDs: 17.
- 🇮🇹 **Italy** — Sovereign country. Ports: Cagliari; Civitavecchia (Rome); Genoa; La Spezia; Livorno (Florence/Pisa); Messina; Naples; Venice. Cruise IDs: 10, 13, 20, 22, 25.
- 🇯🇲 **Jamaica** — Sovereign country. Ports: Montego Bay. Cruise IDs: 9.
- 🇯🇵 **Japan** — Sovereign country. Ports: Hiroshima; Kagoshima; Kobe; Kochi; Osaka; Shimizu (Mount Fuji); Yokohama (Tokyo). Cruise IDs: 28.
- 🇲🇽 **Mexico** — Sovereign country. Ports: Cabo San Lucas; Costa Maya; Cozumel; Mazatlán; Progreso. Cruise IDs: 7, 9, 11, 26, 27.
- 🇲🇨 **Monaco** — Sovereign country. Owner-confirmed shore excursion; not a port. The owner confirms visiting Monaco on a shore excursion from Villefranche, France, during the August 15–21, 2018 Celebrity Reflection cruise. Counted as one country. Confirmed cruise IDs: 20. Classification evidence: <https://www.un.org/en/about-us/member-states>, <https://www.celebritycruises.com/ports/nice/shore-excursions>, <https://platinumcruising.com/cruise/6-nights-mediterranean-getaway-cruise-with-celebrity/>.
- 🇲🇪 **Montenegro** — Sovereign country. Ports: Kotor. Cruise IDs: 22.
- 🇳🇱 **Netherlands** — Sovereign country. Ports: Amsterdam. Cruise IDs: 15, 17.
- 🇵🇦 **Panama** — Sovereign country. Ports: Colón. Cruise IDs: 7.
- 🇵🇷 **Puerto Rico** — U.S. territory · Commonwealth. Ports: San Juan. Cruise IDs: 4, 6, 14, 16. Classification evidence: <https://www.doi.gov/node/11613>.
- 🇷🇺 **Russia** — Sovereign country. Ports: St. Petersburg. Cruise IDs: 15.
- 🇰🇳 **Saint Kitts and Nevis** — Sovereign country. Ports: St. Kitts. Cruise IDs: 14.
- 🇱🇨 **Saint Lucia** — Sovereign country. Ports: St. Lucia. Cruise IDs: 16.
- 🇸🇽 **Sint Maarten** — Country within the Kingdom of the Netherlands. Ports: St. Maarten. Cruise IDs: 2, 4, 12, 16. Classification evidence: <https://www.government.nl/faq/what-are-the-different-parts-of-the-kingdom-of-the-netherlands>.
- 🇰🇷 **South Korea** — Sovereign country. Ports: Jeju. Cruise IDs: 28.
- 🇪🇸 **Spain** — Sovereign country. Ports: Barcelona. Cruise IDs: 10, 22, 25.
- 🇸🇪 **Sweden** — Sovereign country. Ports: Stockholm. Cruise IDs: 15.
- 🇹🇷 **Turkey** — Sovereign country. Ports: Istanbul; Kuşadası (Ephesus). Cruise IDs: 13.
- 🇹🇨 **Turks and Caicos Islands** — British Overseas Territory. Ports: Grand Turk. Cruise IDs: 6, 18, 24. Classification evidence: <https://www.gov.uk/government/publications/geographical-names-and-information>.
- 🇻🇮 **U.S. Virgin Islands** — U.S. territory. Ports: St. Croix; St. Thomas. Cruise IDs: 2, 4, 6, 12, 14, 16. Classification evidence: <https://www.doi.gov/node/11613>.
- 🇬🇧 **United Kingdom** — Sovereign country. Ports: Ayr; Belfast; Glasgow (Greenock); Liverpool. Cruise IDs: 17.
- 🇺🇸 **United States** — Sovereign country. Ports: Fort Lauderdale; Galveston; Jacksonville; Juneau; Ketchikan; Los Angeles (San Pedro); Miami; New Orleans; Port Canaveral; San Diego; Seattle; Sitka. Cruise IDs: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 18, 19, 21, 23, 24, 26, 27, 29.
- 🇻🇦 **Vatican City** — Sovereign country. Owner-confirmed shore excursion; not a port. The owner confirms visiting Vatican City as a cruise shore excursion, by car while the ship was docked, approximately twice. Counted as one country; no ship port or dated sailing association is added. No cruise IDs or travel dates are inferred. Classification evidence: <https://www.vaticanstate.va/en/state-and-government/general-informations.html>.

## Complete research notes and sources

### Cruise 1: Disney Wonder — Bahamas

- Original record date: 2005-05-19; recorded year: 2005.
- Researched dates: 2005-05-19 to 2005-05-22; nights: 3; confidence: confirmed.
- Cruise line: Disney Cruise Line.
- Original ship label: Disney Wonder; original destination label: Bahamas.
- Ordered itinerary: Port Canaveral (United States) → Nassau (Bahamas) → Castaway Cay (Bahamas) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. The published 2005 three-night Wonder schedule has a port on every calendar day and no full sea day.

- **Day 1 · 2005-05-19:** Port Canaveral (United States).
- **Day 2 · 2005-05-20:** Nassau (Bahamas).
- **Day 3 · 2005-05-21:** Castaway Cay (Bahamas).
- **Day 4 · 2005-05-22:** Port Canaveral (United States).

Schedule sources:

1. **AllEars: Magical Disney Cruise Guide, August 2005**
   <https://allears.net/wp-content/uploads/archive/cruise/mdcg.pdf>
   Section 2.1, printed page 5: Thursday Port Canaveral, Friday Nassau, Saturday Castaway Cay, Sunday Port Canaveral.

2. **DISboards: May 19, 2005 3 day Wonder**
   <https://www.disboards.com/threads/may-19-2005-3-day-wonder-anyone.632193/>
   Contemporary passenger roll call confirms ship, departure date, and three-night duration.

#### Voyage notes and sources

A contemporary roll call confirms the May 19, 2005 three-night Wonder departure. The port sequence is the published 2005 three-night schedule; individual weather-related changes have not been verified.

1. **DISboards: May 19, 2005 3 day Wonder**
   <https://www.disboards.com/threads/may-19-2005-3-day-wonder-anyone.632193/>
   Contemporary passenger roll call confirms ship, departure date, and three-night duration.

2. **AllEars: Magical Disney Cruise Guide (2005/2006)**
   <https://allears.net/wp-content/uploads/archive/cruise/mdcg.pdf>
   Section 2.1 gives Thursday Port Canaveral, Friday Nassau, Saturday Castaway Cay, Sunday Port Canaveral.

### Cruise 2: Disney Magic — Eastern Caribbean

- Original record date: 2007-02-03; recorded year: 2007.
- Researched dates: 2007-02-03 to 2007-02-10; nights: 7; confidence: likely.
- Cruise line: Disney Cruise Line.
- Original ship label: Disney Magic; original destination label: Eastern Caribbean.
- Ordered itinerary: Port Canaveral (United States) → St. Maarten (Sint Maarten) → St. Thomas (U.S. Virgin Islands) → Castaway Cay (Bahamas) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: likely. Reconstructed from the established Eastern Caribbean schedule and a January 2007 sailing on the same route. Full sea days fall on days 2, 3 and 6; an exact February 3 daily schedule has not been located.

- **Day 1 · 2007-02-03:** Port Canaveral (United States).
- **Day 2 · 2007-02-04:** At sea.
- **Day 3 · 2007-02-05:** At sea.
- **Day 4 · 2007-02-06:** St. Maarten (Sint Maarten).
- **Day 5 · 2007-02-07:** St. Thomas (U.S. Virgin Islands).
- **Day 6 · 2007-02-08:** At sea.
- **Day 7 · 2007-02-09:** Castaway Cay (Bahamas).
- **Day 8 · 2007-02-10:** Port Canaveral (United States).

Schedule sources:

1. **AllEars: Magical Disney Cruise Guide, Eastern itinerary**
   <https://allears.net/wp-content/uploads/archive/cruise/mdcg.pdf>
   Section 2.1, printed page 5: Saturday departure; Sunday and Monday at sea; Tuesday St. Maarten; Wednesday St. Thomas; Thursday at sea; Friday Castaway Cay; Saturday return.

2. **Cruisemans: Disney Magic January 6, 2007**
   <https://cruisemans.com/%40namber/m2v6ac46zzwa6mcn>
   Nearby seven-night Eastern sailing supports the same route and early sea-day placement; it is not the February 3 departure.

3. **DISboards: October 21st 2006 cruise discussion**
   <https://www.disboards.com/threads/october-21st-2006.1059529/>
   Post 18, dated March 27, 2006, says the passenger rebooked the same cabin for the February 3, 2007 Eastern sailing.

#### Voyage notes and sources

A contemporary passenger post explicitly calls February 3, 2007 an Eastern sailing. The seven-night route is reconstructed from Disney's established Eastern itinerary and a January 6, 2007 sailing record. Exact daily calls for this departure remain unverified.

1. **DISboards: October 21st 2006 cruise discussion**
   <https://www.disboards.com/threads/october-21st-2006.1059529/>
   Post 18, dated March 27, 2006, says the passenger rebooked the same cabin for the February 3, 2007 Eastern sailing.

2. **Cruisemans: Disney Magic January 6, 2007**
   <https://cruisemans.com/%40namber/m2v6ac46zzwa6mcn>
   Nearby 2007 seven-night Eastern sailing from Port Canaveral lists St. Maarten, St. Thomas and Castaway Cay.

3. **AllEars: Magical Disney Cruise Guide**
   <https://allears.net/wp-content/uploads/archive/cruise/mdcg.pdf>
   Historical established Eastern sequence: Port Canaveral, St. Maarten, St. Thomas, Castaway Cay, Port Canaveral.

### Cruise 3: Disney Wonder — Bahamas

- Original record date: 2008-08-10; recorded year: 2008.
- Researched dates: 2008-08-10 to 2008-08-14; nights: 4; confidence: confirmed.
- Cruise line: Disney Cruise Line.
- Original ship label: Disney Wonder; original destination label: Bahamas.
- Ordered itinerary: Port Canaveral (United States) → Castaway Cay (Bahamas) → Nassau (Bahamas) → Castaway Cay (Bahamas) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. Disney’s published summer 2008 double-Castaway-Cay schedule applies to the August 10 departure. There are no full sea days on this four-night itinerary.

- **Day 1 · 2008-08-10:** Port Canaveral (United States).
- **Day 2 · 2008-08-11:** Castaway Cay (Bahamas).
- **Day 3 · 2008-08-12:** Nassau (Bahamas).
- **Day 4 · 2008-08-13:** Castaway Cay (Bahamas).
- **Day 5 · 2008-08-14:** Port Canaveral (United States).

Schedule sources:

1. **Cruise Industry News: Disney announces summer 2008 itineraries**
   <https://cruiseindustrynews.com/cruise-news/2007/12/12407-disney-cruise-line-announces-future-itineraries/>
   The December 2007 announcement gives Sunday Port Canaveral, Monday Castaway Cay, Tuesday Nassau, Wednesday Castaway Cay, Thursday return for every four-night sailing May 11–August 24, 2008.

2. **DISboards: Wonder Aug. 10, 2008 — 4 Night**
   <https://www.disboards.com/threads/wonder-aug-10-2008-4-night.1849941/>
   Contemporary passenger roll call identifies Disney Wonder’s August 10, 2008 four-night sailing.

#### Voyage notes and sources

You clarified that this was Disney Wonder in the Bahamas. A contemporary roll call identifies the August 10, 2008 four-night Wonder sailing. Disney’s published summer 2008 schedule confirms the double visit to Castaway Cay: depart Port Canaveral Sunday August 10, Castaway Cay Monday August 11, Nassau Tuesday August 12, Castaway Cay Wednesday August 13, and return Thursday August 14. The itinerary is the historical published schedule; any unrecorded operational changes have not been independently verified.

1. **DISboards: Wonder Aug. 10, 2008 — 4 Night**
   <https://www.disboards.com/threads/wonder-aug-10-2008-4-night.1849941/>
   Contemporary passenger roll call identifies Disney Wonder’s August 10, 2008 four-night sailing.

2. **Cruise Industry News: Disney Cruise Line announces future itineraries**
   <https://cruiseindustrynews.com/cruise-news/2007/12/12407-disney-cruise-line-announces-future-itineraries/>
   Contemporary announcement: four-night Wonder sailings May 11–August 24, 2008 follow Port Canaveral, Castaway Cay, Nassau, Castaway Cay, Port Canaveral.

3. **DISboards: 4-night double-dip schedule**
   <https://www.disboards.com/threads/4-night-dd-question.1343251/>
   Reproduces the summer 2008 departure list, including August 10, and the Sunday-to-Thursday port order.

### Cruise 4: Carnival Triumph — Eastern Caribbean

- Original record date: 2009-03-15; recorded year: 2009.
- Researched dates: 2009-03-15 to 2009-03-22; nights: 7; confidence: likely.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Triumph; original destination label: Eastern Caribbean.
- Ordered itinerary: Miami (United States) → San Juan (Puerto Rico) → St. Thomas (U.S. Virgin Islands) → St. Maarten (Sint Maarten) → Miami (United States).

#### Day-by-day schedule

Schedule confidence: likely. Day placement follows Triumph’s historical seven-night Miami Eastern route: one sea day before San Juan and two after St. Maarten. Nearby April 2009 accounts support the ports; the exact March 15 daily schedule remains unverified.

- **Day 1 · 2009-03-15:** Miami (United States).
- **Day 2 · 2009-03-16:** At sea.
- **Day 3 · 2009-03-17:** San Juan (Puerto Rico).
- **Day 4 · 2009-03-18:** St. Thomas (U.S. Virgin Islands).
- **Day 5 · 2009-03-19:** St. Maarten (Sint Maarten).
- **Day 6 · 2009-03-20:** At sea.
- **Day 7 · 2009-03-21:** At sea.
- **Day 8 · 2009-03-22:** Miami (United States).

Schedule sources:

1. **Carnival Triumph historical itinerary table**
   <https://fr.wikipedia.org/wiki/Carnival_Sunrise#Itin%C3%A9raire>
   The retained Triumph-era Miami route table places San Juan on day 3, St. Thomas on day 4, St. Maarten on day 5, and sea days on days 2, 6 and 7. This undated secondary table supports a reconstruction, not a confirmed March 2009 schedule.

2. **Cruiseline: Carnival Triumph April 26, 2009 passenger review**
   <https://cruiseline.com/ship/carnival-triumph/review/314186>
   Nearby seasonal sailing confirms seven-night Eastern Miami roundtrip and San Juan, St. Thomas, St. Maarten ports, not the exact March date.

3. **Cruise Critic: Just off the Triumph, April 2009**
   <https://boards.cruisecritic.com/topic/922849-just-off-the-triumph-it-was-great>
   Contemporary account of April 12 sailing corroborates the seasonal Eastern operation.

#### Voyage notes and sources

Likely seven-night Miami roundtrip, treating the supplied Sunday date as departure. The route is reconstructed from contemporary Triumph Eastern Caribbean sailings; a source for the exact March 15 departure was not located. Dates and stop order should be treated as provisional.

1. **Cruiseline: Carnival Triumph April 26, 2009 passenger review**
   <https://cruiseline.com/ship/carnival-triumph/review/314186>
   Nearby seasonal sailing confirms seven-night Eastern Miami roundtrip and San Juan, St. Thomas, St. Maarten ports, not the exact March date.

2. **Cruise Critic: Just off the Triumph, April 2009**
   <https://boards.cruisecritic.com/topic/922849-just-off-the-triumph-it-was-great>
   Contemporary account of April 12 sailing corroborates the seasonal Eastern operation.

### Cruise 5: Carnival Fascination — Bahamas

- Original record date: 2009-08-08; recorded year: 2009.
- Researched dates: 2009-08-08 to 2009-08-13; nights: 5; confidence: likely.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Fascination; original destination label: Bahamas.
- Ordered itinerary: Jacksonville (United States) → Nassau (Bahamas) → Half Moon Cay (Bahamas) → Jacksonville (United States).

#### Day-by-day schedule

Schedule confidence: likely. The two sea days are reconstructed from a near-period advertised Saturday Fascination itinerary: days 2 and 5. Carnival’s 2009 operating announcement confirms this five-night Nassau/Half Moon Cay program, but not the exact August 8 day order.

- **Day 1 · 2009-08-08:** Jacksonville (United States).
- **Day 2 · 2009-08-09:** At sea.
- **Day 3 · 2009-08-10:** Nassau (Bahamas).
- **Day 4 · 2009-08-11:** Half Moon Cay (Bahamas).
- **Day 5 · 2009-08-12:** At sea.
- **Day 6 · 2009-08-13:** Jacksonville (United States).

Schedule sources:

1. **Owen Family Newsletter, Summer 2009**
   <https://www.owenfuneralhome.com/download/97998/OwenFamilyNewsletter-2009Summer.pdf>
   Printed page 2 advertises a February 2010 trip with Jacksonville embarkation, sea, Nassau, Half Moon Cay, sea, Jacksonville. Land travel days before and after the cruise are excluded.

2. **Carnival: Fascination refurbishment and operating schedule, August 2009**
   <https://www.carnival-news.com/2009/08/28/reservations-open-today-on-98-new-balcony-staterooms-added-during-carnival-fascinations-multimillion-dollar-refurb>
   Official contemporary source: Saturday five-night sailings from Jacksonville visit Half Moon Cay and Nassau; other weekday departures use different itineraries.

#### Voyage notes and sources

The supplied Saturday date fits Carnival's official 2009 five-night Saturday schedule from Jacksonville to Nassau and Half Moon Cay. Stop order is reconstructed from a near-period advertised itinerary; the exact August 8 departure has not been independently located.

1. **Carnival: Fascination refurbishment and operating schedule, August 2009**
   <https://www.carnival-news.com/2009/08/28/reservations-open-today-on-98-new-balcony-staterooms-added-during-carnival-fascinations-multimillion-dollar-refurb>
   Official contemporary source: Saturday five-night sailings from Jacksonville visit Half Moon Cay and Nassau; other weekday departures use different itineraries.

2. **Owen Family Newsletter, Summer 2009**
   <https://www.owenfuneralhome.com/download/97998/OwenFamilyNewsletter-2009Summer.pdf>
   Advertisement for a February 2010 Saturday Fascination departure provides day order: Jacksonville, sea, Nassau, Half Moon Cay, sea, Jacksonville; supports the reconstruction rather than exact August calls.

### Cruise 6: Carnival Liberty — Eastern Caribbean

- Original record date: 2010-01-23; recorded year: 2010.
- Researched dates: 2010-01-23 to 2010-01-30; nights: 7; confidence: likely.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Liberty; original destination label: Exotic Eastern Caribbean.
- Ordered itinerary: Miami (United States) → Half Moon Cay (Bahamas) → St. Thomas (U.S. Virgin Islands) → San Juan (Puerto Rico) → Grand Turk (Turks and Caicos Islands) → Miami (United States).

#### Day-by-day schedule

Schedule confidence: likely. Full sea days fall on days 3 and 7 in the Exotic Eastern itinerary introduced in April 2009. The January 23, 2010 departure is documented, while its daily positions are reconstructed from the matching route.

- **Day 1 · 2010-01-23:** Miami (United States).
- **Day 2 · 2010-01-24:** Half Moon Cay (Bahamas).
- **Day 3 · 2010-01-25:** At sea.
- **Day 4 · 2010-01-26:** St. Thomas (U.S. Virgin Islands).
- **Day 5 · 2010-01-27:** San Juan (Puerto Rico).
- **Day 6 · 2010-01-28:** Grand Turk (Turks and Caicos Islands).
- **Day 7 · 2010-01-29:** At sea.
- **Day 8 · 2010-01-30:** Miami (United States).

Schedule sources:

1. **Cruise Critic: Liberty’s new Eastern route, April 25–May 2, 2009**
   <https://boards.cruisecritic.com/topic/939147-carnival-liberty-new-eastern-caribbean-route-review-april-25-may2/>
   The contemporary first-sailing review explicitly gives Miami, Half Moon Cay, sea, St. Thomas, San Juan, Grand Turk, sea, Miami.

2. **Military Cruise Deals: archived 2009 fare bulletin**
   <https://militarycruisedeals.blogspot.com/2009/>
   Lists CARNIVAL LIBERTY 1/23/2010 7 MIA EXOTIC EASTERN CARIB, directly supporting date, duration, homeport and route name.

3. **Cruise Critic: Two Sisters Enjoying Liberty, May 2010**
   <https://www.cruisecritic.com/cruise/carnival/carnival-liberty/reviews/68074>
   2010 passenger account corroborates continued Half Moon Cay Eastern itinerary.

#### Voyage notes and sources

A contemporary fare bulletin confirms January 23, 2010, seven nights from Miami, labeled Exotic Eastern Caribbean. Port order is reconstructed from the itinerary introduced in April 2009 and continued in 2010. Exact daily calls for this January departure have not been found.

1. **Military Cruise Deals: archived 2009 fare bulletin**
   <https://militarycruisedeals.blogspot.com/2009/>
   Lists CARNIVAL LIBERTY 1/23/2010 7 MIA EXOTIC EASTERN CARIB, directly supporting date, duration, homeport and route name.

2. **Cruise Critic: Liberty's new Eastern route, April 25–May 2, 2009**
   <https://boards.cruisecritic.com/showthread.php?t=988736>
   Gives route order Miami, Half Moon Cay, sea, St. Thomas, San Juan, Grand Turk, sea, Miami for the same Exotic Eastern program.

3. **Cruise Critic: Two Sisters Enjoying Liberty, May 2010**
   <https://www.cruisecritic.com/cruise/carnival/carnival-liberty/reviews/68074>
   2010 passenger account corroborates continued Half Moon Cay Eastern itinerary.

### Cruise 7: Carnival Freedom — Western Caribbean

- Original record date: 2011-01-15; recorded year: 2011.
- Researched dates: 2011-01-15 to 2011-01-23; nights: 8; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Freedom; original destination label: Exotic Western Caribbean.
- Ordered itinerary: Fort Lauderdale (United States) → Cozumel (Mexico) → Puerto Limón (Costa Rica) → Colón (Panama) → Fort Lauderdale (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. Carnival’s 2011/2012 brochure lists the January 15 departure with full sea days on days 2, 4, 7 and 8. Colón is a port call; the schedule does not include a ship transit of the Panama Canal.

- **Day 1 · 2011-01-15:** Fort Lauderdale (United States).
- **Day 2 · 2011-01-16:** At sea.
- **Day 3 · 2011-01-17:** Cozumel (Mexico).
- **Day 4 · 2011-01-18:** At sea.
- **Day 5 · 2011-01-19:** Puerto Limón (Costa Rica).
- **Day 6 · 2011-01-20:** Colón (Panama).
- **Day 7 · 2011-01-21:** At sea.
- **Day 8 · 2011-01-22:** At sea.
- **Day 9 · 2011-01-23:** Fort Lauderdale (United States).

Schedule sources:

1. **Carnival Cruise Lines: 2011/2012 German brochure, pages 44–45**
   <https://de.scribd.com/doc/44541934/Kreuzfahrten-von-Carnival-Cruise-Lines-Deutschland-auf-einen-Blick-SAISON-2011-2012>
   The eight-night Exotic Western table lists Saturday Fort Lauderdale, Sunday sea, Monday Cozumel, Tuesday sea, Wednesday Limón, Thursday Colón, Friday and Saturday sea, Sunday return. January 15, 2011 is listed without an itinerary-change marker.

2. **Groomer to Groomer, October 2010: Pet Pro Cruise**
   <https://www.groomertogroomer.com/ebooks/GTG_Oct%202010_w_links.pdf>
   Page 49 explicitly advertises January 15–23, 2011 on Carnival Freedom, nine days/eight nights, Fort Lauderdale with Cozumel, Limon, Colon.

#### Voyage notes and sources

A contemporary advertisement confirms the January 15–23, 2011 eight-night sailing from Fort Lauderdale to Cozumel, Limón and Colón. This was an Exotic Western Caribbean itinerary reaching Costa Rica and Panama; it does not imply the ship transited the Panama Canal.

1. **Groomer to Groomer, October 2010: Pet Pro Cruise**
   <https://www.groomertogroomer.com/ebooks/GTG_Oct%202010_w_links.pdf>
   Page 49 explicitly advertises January 15–23, 2011 on Carnival Freedom, nine days/eight nights, Fort Lauderdale with Cozumel, Limon, Colon.

2. **Port Everglades photograph, January 15, 2011**
   <https://www.flickr.com/photos/captainmartini/5467735599>
   Dated ship photograph independently places Carnival Freedom in Port Everglades on January 15, 2011.

### Cruise 8: Oosterdam — Alaska

- Original record date: 2011-06-05; recorded year: 2011.
- Researched dates: 2011-06-05 to 2011-06-12; nights: 7; confidence: confirmed.
- Cruise line: Holland America Line.
- Original ship label: Oosterdam; original destination label: Alaska Explorer.
- Ordered itinerary: Seattle (United States) → Glacier Bay (United States) → Juneau (United States) → Sitka (United States) → Ketchikan (United States) → Victoria (Canada) → Seattle (United States).

#### Day-by-day schedule

Schedule confidence: likely. Reconstructed from the June 12, 2011 published itinerary and May 22 passenger diary for the same seasonal route. Monday is a full sea day; Tuesday in Glacier Bay is scenic cruising and is kept separate.

- **Day 1 · 2011-06-05:** Seattle (United States).
- **Day 2 · 2011-06-06:** At sea.
- **Day 3 · 2011-06-07:** Scenic cruising — Glacier Bay (United States). Scenic cruising in Glacier Bay; no disembarkation.
- **Day 4 · 2011-06-08:** Juneau (United States).
- **Day 5 · 2011-06-09:** Sitka (United States).
- **Day 6 · 2011-06-10:** Ketchikan (United States).
- **Day 7 · 2011-06-11:** Victoria (Canada).
- **Day 8 · 2011-06-12:** Seattle (United States).

Schedule sources:

1. **SSQQ Travel: archived June 2011 Oosterdam itinerary**
   <https://www.ssqq.com/travel/travelfees.htm>
   The April 20, 2011 travel quote lists June 12 Seattle; June 13 at sea; June 14 Glacier Bay; June 15 Juneau; June 16 Sitka; June 17 Ketchikan; June 18 Victoria; June 19 Seattle. This is the departure one week after the recorded voyage.

2. **Cruise Critic: Oosterdam Alaska, May 2011**
   <https://www.cruisecritic.com/cruise/holland-america/oosterdam/reviews/85183>
   The May 22 sailing diary independently places Glacier Bay on Tuesday, Juneau on Wednesday, then Sitka, Ketchikan and Victoria.

3. **Holland America: The Americas 2011–2012 brochure**
   <https://www.rejsy.pl/sites/default/files/armator_files/HAL_AM11_Ebrochure_TA.pdf>
   Alaska section lists Oosterdam 7-day Explorer from Seattle departures including June 5, 2011, and regional calls.

#### Voyage notes and sources

Holland America's 2011 brochure lists the June 5 seven-day Explorer departure from Seattle, and the Southern Medical Association lists June 5–12 on Oosterdam. The seasonal schedule included Glacier Bay; ordered calls are corroborated by a May 22, 2011 passenger diary. Glacier Bay is scenic cruising, not a disembarkation port. Actual day-specific deviations have not been checked.

1. **Holland America: The Americas 2011–2012 brochure**
   <https://www.rejsy.pl/sites/default/files/armator_files/HAL_AM11_Ebrochure_TA.pdf>
   Alaska section lists Oosterdam 7-day Explorer from Seattle departures including June 5, 2011, and regional calls.

2. **Southern Medical Association 2011 calendar**
   <https://sma.org/wp-content/uploads/2012/02/2011-yearbook2.pdf>
   Page 63 lists June 5–12 seven-day Alaska cruise aboard Oosterdam.

3. **Cruise Critic: Oosterdam Alaska, May 2011**
   <https://www.cruisecritic.com/cruise/holland-america/oosterdam/reviews/85183>
   Nearby May 22 departure diary establishes Tuesday Glacier Bay, Wednesday Juneau, then Sitka, Ketchikan and Victoria on this seasonal itinerary.

4. **2011 Seattle cruises to Alaska: Holland America Line**
   <https://eriktomrenwrites.com/2011-seattle-cruises-alaska-holland-america-line/>
   Distinguishes Oosterdam's Glacier Bay route from Westerdam's Hubbard Glacier route in 2011.

### Cruise 9: Carnival Magic — Western Caribbean

- Original record date: 2012-02-19; recorded year: 2012.
- Researched dates: 2012-02-19 to 2012-02-26; nights: 7; confidence: likely.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Magic; original destination label: Western Caribbean.
- Ordered itinerary: Galveston (United States) → Montego Bay (Jamaica) → Grand Cayman (Cayman Islands) → Cozumel (Mexico) → Galveston (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. Newly located Carnival 2011/2012 brochure evidence lists the February 19, 2012 departure and published daily schedule. Full sea days are days 2, 3 and 7.

- **Day 1 · 2012-02-19:** Galveston (United States).
- **Day 2 · 2012-02-20:** At sea.
- **Day 3 · 2012-02-21:** At sea.
- **Day 4 · 2012-02-22:** Montego Bay (Jamaica).
- **Day 5 · 2012-02-23:** Grand Cayman (Cayman Islands).
- **Day 6 · 2012-02-24:** Cozumel (Mexico).
- **Day 7 · 2012-02-25:** At sea.
- **Day 8 · 2012-02-26:** Galveston (United States).

Schedule sources:

1. **Carnival Cruise Lines: 2011/2012 German brochure, pages 60–61**
   <https://de.scribd.com/doc/44541934/Kreuzfahrten-von-Carnival-Cruise-Lines-Deutschland-auf-einen-Blick-SAISON-2011-2012>
   The Galveston Western table gives Sunday embarkation; Monday and Tuesday sea; Wednesday Montego Bay; Thursday Grand Cayman; Friday Cozumel; Saturday sea; Sunday return. Carnival Magic February 19, 2012 appears without the reverse-order marker applied to some nearby dates.

2. **Ray’s Cruise and Travel Blog: Carnival Magic, March 4, 2012**
   <https://snoozemanscruiseblog.blogspot.com/2012/03/carnival-magic.html>
   Nearby sailing diary corroborates full sea days 2, 3 and 7 and the Wednesday-to-Friday port sequence.

#### Voyage notes and sources

Likely seven-night Galveston roundtrip, treating the supplied Sunday date as departure. Carnival's official 2011 deployment announcement and nearby February/March 2012 accounts identify its Western route as Montego Bay, Grand Cayman and Cozumel. Exact February 19–26 documentation was not located; dates and order are reconstructed.

1. **Carnival: Magic's Galveston deployment announcement**
   <https://www.carnival-news.com/2010/06/23/carnival-magic-to-operate-seven-day-cruises-from-galveston-to-be-ports-largest-ship>
   Official source identifies seven-day Western Caribbean route from Galveston to Montego Bay, Grand Cayman and Cozumel beginning November 2011.

2. **Cajun Radio: Carnival Magic February 5–12, 2012 cruise**
   <https://cajunradio.com/cruise-the-caribbean-with-damon-troy-on-new-carnival-magic/>
   Nearby February 2012 seven-day departure from Galveston calls Jamaica, Grand Cayman and Cozumel.

3. **Ray's Cruise and Travel Blog: Carnival Magic March 2012**
   <https://snoozemanscruiseblog.blogspot.com/2012/03/carnival-magic.html>
   Nearby March 4 sailing account corroborates ordered Galveston, Montego Bay, Grand Cayman, Cozumel route; not the exact February departure.

### Cruise 10: Carnival Sunshine — Mediterranean

- Original record date: 2013-06-07; recorded year: 2013.
- Researched dates: 2013-06-07 to 2013-06-16; nights: 9; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Sunshine; original destination label: Mediterranean.
- Ordered itinerary: Barcelona (Spain) → Marseille (France) → Livorno (Florence/Pisa) (Italy) → Civitavecchia (Rome) (Italy) → Naples (Italy) → Messina (Italy) → Dubrovnik (Croatia) → Venice (Italy).

#### Day-by-day schedule

Schedule confidence: likely. The June 2013 passenger account confirms one sea day, and the archived sailing listing includes an overnight in Venice. Day 7 is a reconstruction of the sea-day placement between Messina and Dubrovnik; the exact daily schedule has not been independently recovered.

- **Day 1 · 2013-06-07:** Barcelona (Spain).
- **Day 2 · 2013-06-08:** Marseille (France).
- **Day 3 · 2013-06-09:** Livorno (Florence/Pisa) (Italy).
- **Day 4 · 2013-06-10:** Civitavecchia (Rome) (Italy).
- **Day 5 · 2013-06-11:** Naples (Italy).
- **Day 6 · 2013-06-12:** Messina (Italy).
- **Day 7 · 2013-06-13:** At sea.
- **Day 8 · 2013-06-14:** Dubrovnik (Croatia).
- **Day 9 · 2013-06-15:** Venice (Italy). Overnight in Venice.
- **Day 10 · 2013-06-16:** Venice (Italy). Disembarkation after the overnight in Venice.

Schedule sources:

1. **Family Travel Gurus: Carnival Sunshine review, June 2013**
   <https://familytravelgurus.com/carnival-sunshine-review-june-2013/>
   Nine-night Barcelona-to-Venice passenger account confirms all ordered ports and exactly one sea day.

2. **ARKS Travel Agency: archived 2013 Carnival departures**
   <https://arkstravelagency.weebly.com/cruises.html>
   The June 7 nine-night itinerary lists Venice twice, supporting the final overnight stay.

3. **Cruiseline: Carnival Sunshine, June 7, 2013 — 9 Night Italy & Adriatic**
   <https://cruiseline.com/ship/carnival-sunshine/review/381014>
   Exact departure, nine nights, endpoints and ordered ports.

#### Voyage notes and sources

Exact sailing match in a contemporary passenger review: 9-night Italy & Adriatic cruise from Barcelona to Venice. Port sequence follows the sailing review; the end date is calculated from the verified departure and nine-night duration. This was Sunshine's first Mediterranean season after the conversion from Carnival Destiny.

1. **Cruiseline: Carnival Sunshine, June 7, 2013 — 9 Night Italy & Adriatic**
   <https://cruiseline.com/ship/carnival-sunshine/review/381014>
   Exact departure, nine nights, endpoints and ordered ports.

2. **Travel Weekly: Carnival Sunshine metamorphosis was ambitious and complicated**
   <https://www.travelweekly.com/Cruise-Travel/Carnival-Sunshine-metamorphosis-was-ambitious-and-complicated>
   Contemporary June 2013 account corroborates the June 7 sailing and first-season refurbishment context.

### Cruise 11: Carnival Elation — Western Caribbean

- Original record date: 2013-12-28; recorded year: 2013.
- Researched dates: 2013-12-28 to 2014-01-02; nights: 5; confidence: likely.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Elation; original destination label: Western Caribbean.
- Ordered itinerary: New Orleans (United States) → Progreso (Mexico) → Cozumel (Mexico) → New Orleans (United States).

#### Day-by-day schedule

Schedule confidence: likely. The period Carnival brochure supplies the five-night New Orleans pattern, with sea days on Days 2 and 5. The date-to-sailing match and port order retain the uncertainty described in the voyage notes.

- **Day 1 · 2013-12-28:** New Orleans (United States).
- **Day 2 · 2013-12-29:** At sea.
- **Day 3 · 2013-12-30:** Progreso (Mexico).
- **Day 4 · 2013-12-31:** Cozumel (Mexico).
- **Day 5 · 2014-01-01:** At sea.
- **Day 6 · 2014-01-02:** New Orleans (United States).

Schedule sources:

1. **Carnival Cruise Lines 2014 brochure: five-day Western Caribbean from New Orleans**
   <https://www.slideshare.net/slideshow/carnival-cruise-lines-2014/28593553>
   Published day order is New Orleans, sea, Progreso, Cozumel, sea, New Orleans; this is a period route pattern rather than an exact December 28 sailing record.

#### Voyage notes and sources

Seasonal reconstruction, not an independently verified exact sailing. Elation was based in New Orleans on four- and five-night Mexico cruises in December 2013. The five-night Progreso/Cozumel itinerary and next four-night departure on January 2, 2014 support a December 28–January 2 sailing. Port order and the assumption that the supplied date is embarkation need confirmation; December 28 could instead be disembarkation from the preceding five-night cruise.

1. **New Orleans tourism: December 2013 / January 2014 industry update**
   <https://www.neworleans.com/articles/post/whats-new-in-new-orleans-hospitality-industry-december-2013january-2014/>
   Contemporary confirmation of Elation's year-round New Orleans homeport.

2. **Carnival Cruise Lines 2014 brochure**
   <https://www.slideshare.net/slideshow/carnival-cruise-lines-2014/28593553>
   Period brochure shows the five-night New Orleans–Progreso–Cozumel itinerary and January 2, 2014 four-night departure. Does not directly verify December 28, 2013.

3. **Cruise with Jill: New Orleans cruise port, December 4, 2013**
   <https://cruisewithjill.wordpress.com/>
   Contemporary post describes Elation's four-night Cozumel and five-night Western Caribbean cruises.

### Cruise 12: Allure of the Seas — Eastern Caribbean

- Original record date: 2014-03-15; recorded year: 2014.
- Researched dates: 2014-03-16 to 2014-03-23; nights: 7; confidence: likely.
- Cruise line: Royal Caribbean.
- Original ship label: Allure of the Seas; original destination label: Eastern Caribbean.
- Ordered itinerary: Fort Lauderdale (United States) → Nassau (Bahamas) → St. Thomas (U.S. Virgin Islands) → St. Maarten (Sint Maarten) → Fort Lauderdale (United States).

#### Day-by-day schedule

Schedule confidence: likely. The contemporary Allure Eastern Caribbean Cruise Compass sequence places sea days on Days 3, 6 and 7. This follows the period route pattern; the voyage still uses the likely March 16 departure described in its notes.

- **Day 1 · 2014-03-16:** Fort Lauderdale (United States).
- **Day 2 · 2014-03-17:** Nassau (Bahamas).
- **Day 3 · 2014-03-18:** At sea.
- **Day 4 · 2014-03-19:** St. Thomas (U.S. Virgin Islands).
- **Day 5 · 2014-03-20:** St. Maarten (Sint Maarten).
- **Day 6 · 2014-03-21:** At sea.
- **Day 7 · 2014-03-22:** At sea.
- **Day 8 · 2014-03-23:** Fort Lauderdale (United States).

Schedule sources:

1. **DISboards: Allure Eastern Caribbean Cruise Compass sequence, 2013–14**
   <https://www.disboards.com/threads/the-allure-of-the-seas-review-eastern-caribbean-august-2013.3267193/page-2>
   Passenger transcription identifies Nassau Day 2, sea Day 3, St. Thomas Day 4, St. Maarten Day 5 and sea Days 6–7, with February 2014 compasses for the latter days.

2. **Cruise Critic: Alluring cruise — March 16–23, 2014**
   <https://www.cruisecritic.com/cruise/royal-caribbean/allure-of-the-seas/reviews/253085>
   Passenger explicitly gives March 16–23 and Eastern Caribbean.

#### Voyage notes and sources

Likely one-day date correction: a passenger review explicitly identifies the March 16–23, 2014 Eastern Caribbean sailing. The supplied March 15 is the day before departure. That season's Eastern route was Fort Lauderdale–Nassau–St. Thomas–St. Maarten; the date-to-user-trip match remains an inference. The March 9 sailing containing March 15 was Western Caribbean, so it conflicts with the supplied destination.

1. **Cruise Critic: Alluring cruise — March 16–23, 2014**
   <https://www.cruisecritic.com/cruise/royal-caribbean/allure-of-the-seas/reviews/253085>
   Passenger explicitly gives March 16–23 and Eastern Caribbean.

2. **Royal Caribbean: Allure inaugural-season itinerary announcement**
   <https://www.royalcaribbeanpresscenter.com/download-press-kit/35/>
   Historical Fort Lauderdale Eastern route via Nassau, Charlotte Amalie and Philipsburg; route pattern, not exact 2014 sailing verification.

3. **Cruiseline: Allure March 9, 2014 Western Caribbean**
   <https://cruiseline.com/ship/allure-of-the-seas/review/386483>
   Confirms the preceding sailing was Western, supporting the one-day date discrepancy rather than an Eastern voyage on March 15.

### Cruise 13: Celebrity Reflection — Eastern Mediterranean

- Original record date: 2014-06-02; recorded year: 2014.
- Researched dates: 2014-06-02 to 2014-06-13; nights: 11; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Reflection; original destination label: Eastern Mediterranean.
- Ordered itinerary: Civitavecchia (Rome) (Italy) → Santorini (Greece) → Istanbul (Turkey) → Kuşadası (Ephesus) (Turkey) → Mykonos (Greece) → Athens (Piraeus) (Greece) → Naples (Italy) → Civitavecchia (Rome) (Italy).

#### Day-by-day schedule

Schedule confidence: confirmed. The contemporary photo diary dates every port call, including the two-day Istanbul stay; the three intervening sailing days are June 3, June 5 and June 11.

- **Day 1 · 2014-06-02:** Civitavecchia (Rome) (Italy).
- **Day 2 · 2014-06-03:** At sea.
- **Day 3 · 2014-06-04:** Santorini (Greece).
- **Day 4 · 2014-06-05:** At sea.
- **Day 5 · 2014-06-06:** Istanbul (Turkey). Overnight in Istanbul.
- **Day 6 · 2014-06-07:** Istanbul (Turkey). Second day of the Istanbul overnight stay.
- **Day 7 · 2014-06-08:** Kuşadası (Ephesus) (Turkey).
- **Day 8 · 2014-06-09:** Mykonos (Greece).
- **Day 9 · 2014-06-10:** Athens (Piraeus) (Greece).
- **Day 10 · 2014-06-11:** At sea.
- **Day 11 · 2014-06-12:** Naples (Italy).
- **Day 12 · 2014-06-13:** Civitavecchia (Rome) (Italy).

Schedule sources:

1. **Flickr travel diary: Mediterranean Cruise on Celebrity Reflection — June 2014**
   <https://api.flickr.com/photos/escriteur/albums/72157645178029754/with/14451670303/>
   First-hand contemporary album explicitly lists dates and all ordered ports.

#### Voyage notes and sources

Contemporary passenger photo album explicitly records June 2–13, 2014 and dated calls: Santorini June 4; Istanbul June 6–7 overnight; Kusadasi June 8; Mykonos June 9; Athens June 10; Naples June 12. Piraeus is the port for Athens, and Civitavecchia is the port for Rome.

1. **Flickr travel diary: Mediterranean Cruise on Celebrity Reflection — June 2014**
   <https://api.flickr.com/photos/escriteur/albums/72157645178029754/with/14451670303/>
   First-hand contemporary album explicitly lists dates and all ordered ports.

### Cruise 14: Celebrity Summit — Southern Caribbean

- Original record date: 2015-03-14; recorded year: 2015.
- Researched dates: 2015-03-14 to 2015-03-21; nights: 7; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Summit; original destination label: Southern Caribbean.
- Ordered itinerary: San Juan (Puerto Rico) → St. Croix (U.S. Virgin Islands) → St. Kitts (Saint Kitts and Nevis) → Dominica (Dominica) → Grenada (Grenada) → St. Thomas (U.S. Virgin Islands) → San Juan (Puerto Rico).

#### Day-by-day schedule

Schedule confidence: confirmed. The archived official 2015 brochure includes the March 14 departure and its full day order, including a sea day between Grenada and St. Thomas.

- **Day 1 · 2015-03-14:** San Juan (Puerto Rico).
- **Day 2 · 2015-03-15:** St. Croix (U.S. Virgin Islands).
- **Day 3 · 2015-03-16:** St. Kitts (Saint Kitts and Nevis).
- **Day 4 · 2015-03-17:** Dominica (Dominica).
- **Day 5 · 2015-03-18:** Grenada (Grenada).
- **Day 6 · 2015-03-19:** At sea.
- **Day 7 · 2015-03-20:** St. Thomas (U.S. Virgin Islands).
- **Day 8 · 2015-03-21:** San Juan (Puerto Rico).

Schedule sources:

1. **Celebrity Cruises 2015 brochure: Southern Caribbean, page 52**
   <https://doczz.net/doc/6035429/sehenswert---bei-rcl-cruises-ltd.>
   Archived official brochure lists March 14, 2015 and Days 1–8, with sea on Day 6.

2. **Cruiseline: Celebrity Summit — March 14, 2015**
   <https://cruiseline.com/ship/celebrity-summit/review/401906>
   Exact departure, seven-night duration, San Juan roundtrip and ordered ports.

#### Voyage notes and sources

Exact date matched to a passenger review of the seven-night San Juan roundtrip. All five intermediate ports are listed in itinerary order. End date calculated from verified departure and duration.

1. **Cruiseline: Celebrity Summit — March 14, 2015**
   <https://cruiseline.com/ship/celebrity-summit/review/401906>
   Exact departure, seven-night duration, San Juan roundtrip and ordered ports.

### Cruise 15: Celebrity Silhouette — Scandinavia & Russia

- Original record date: 2015-05-28; recorded year: 2015.
- Researched dates: 2015-05-28 to 2015-06-09; nights: 12; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Silhouette; original destination label: Scandinavia & Russia.
- Ordered itinerary: Stockholm (Sweden) → Helsinki (Finland) → St. Petersburg (Russia) → Tallinn (Estonia) → Warnemünde (Berlin) (Germany) → Fredericia (Denmark) → Copenhagen (Denmark) → Amsterdam (Netherlands).

#### Day-by-day schedule

Schedule confidence: confirmed. The official 2015 Europe Guide gives the complete May 28 day-by-day itinerary, including sea Days 7 and 12 and overnight stays in Stockholm, St. Petersburg and Copenhagen.

- **Day 1 · 2015-05-28:** Stockholm (Sweden). Overnight in Stockholm after embarkation.
- **Day 2 · 2015-05-29:** Stockholm (Sweden). Second day of the Stockholm overnight stay.
- **Day 3 · 2015-05-30:** Helsinki (Finland).
- **Day 4 · 2015-05-31:** St. Petersburg (Russia). Overnight in St. Petersburg.
- **Day 5 · 2015-06-01:** St. Petersburg (Russia). Second day of the St. Petersburg overnight stay.
- **Day 6 · 2015-06-02:** Tallinn (Estonia).
- **Day 7 · 2015-06-03:** At sea.
- **Day 8 · 2015-06-04:** Warnemünde (Berlin) (Germany).
- **Day 9 · 2015-06-05:** Fredericia (Denmark).
- **Day 10 · 2015-06-06:** Copenhagen (Denmark). Overnight in Copenhagen.
- **Day 11 · 2015-06-07:** Copenhagen (Denmark). Second day of the Copenhagen overnight stay.
- **Day 12 · 2015-06-08:** At sea.
- **Day 13 · 2015-06-09:** Amsterdam (Netherlands).

Schedule sources:

1. **Celebrity Cruises 2015 Europe Guide, page 59**
   <https://www.scribd.com/doc/246907520/Celebrity-Cruises-2015-Europa>
   Archived official brochure contains exact departure date and day-by-day itinerary.

#### Voyage notes and sources

Exact 12-night Stockholm-to-Amsterdam sailing appears in the Celebrity 2015 Europe brochure, page 59, and a verified passenger review. Overnight stays in Stockholm, St. Petersburg and Copenhagen. Brochure day order: Stockholm May 28–29, Helsinki May 30, St. Petersburg May 31–June 1, Tallinn June 2, sea June 3, Warnemunde June 4, Fredericia June 5, Copenhagen June 6–7, sea June 8, Amsterdam June 9.

1. **Celebrity Cruises 2015 Europe Guide, page 59**
   <https://www.scribd.com/doc/246907520/Celebrity-Cruises-2015-Europa>
   Archived official brochure contains exact departure date and day-by-day itinerary.

2. **Cruiseline: Baltic Cruise on Celebrity Silhouette — May 28, 2015**
   <https://cruiseline.com/ship/celebrity-silhouette/review/405389>
   Verified passenger review confirms May 28, twelve nights, Stockholm-to-Amsterdam and visits.

3. **Fodor's: Scandinavia and St. Petersburg forum**
   <https://www.fodors.com/community/cruises/scandinavia-and-st-petersburg-1037670/>
   February 2015 passenger planning post explicitly names the May 28 Stockholm–Amsterdam sailing and two-day St. Petersburg visit.

### Cruise 16: Celebrity Summit — Southern Caribbean

- Original record date: 2016-03-19; recorded year: 2016.
- Researched dates: 2016-03-19 to 2016-03-26; nights: 7; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Summit; original destination label: Southern Caribbean.
- Ordered itinerary: San Juan (Puerto Rico) → Barbados (Barbados) → St. Lucia (Saint Lucia) → Antigua (Antigua and Barbuda) → St. Maarten (Sint Maarten) → St. Thomas (U.S. Virgin Islands) → San Juan (Puerto Rico).

#### Day-by-day schedule

Schedule confidence: confirmed. The official 2016–17 brochure lists the March 19, 2016 departure and the complete sequence, beginning with a sea day before Barbados.

- **Day 1 · 2016-03-19:** San Juan (Puerto Rico).
- **Day 2 · 2016-03-20:** At sea.
- **Day 3 · 2016-03-21:** Barbados (Barbados).
- **Day 4 · 2016-03-22:** St. Lucia (Saint Lucia).
- **Day 5 · 2016-03-23:** Antigua (Antigua and Barbuda).
- **Day 6 · 2016-03-24:** St. Maarten (Sint Maarten).
- **Day 7 · 2016-03-25:** St. Thomas (U.S. Virgin Islands).
- **Day 8 · 2016-03-26:** San Juan (Puerto Rico).

Schedule sources:

1. **Celebrity Cruises 2016–17 worldwide brochure, page 37**
   <https://doczz.net/doc/558975/luxury-cruises---celebrity-cruises>
   The March 19 Summit departure follows San Juan, sea, Barbados, St. Lucia, Antigua, St. Maarten, St. Thomas and San Juan.

2. **Crew Center: Philipsburg 2016 cruise ship port calendar**
   <https://crew-center.com/philipsburg-st-maarten-cruise-ship-port-calendar-2016>
   Celebrity Summit listed March 24, 2016.

#### Voyage notes and sources

Exact departure and seven-night San Juan roundtrip matched to verified passenger review. Port call sequence differs from the 2015 Summit cruise. Philipsburg on March 24 is independently supported by the 2016 port calendar. This was the first sailing after Summit's March 2016 drydock.

1. **Cruiseline: Celebrity Summit — March 19, 2016**
   <https://cruiseline.com/ship/celebrity-summit/review/419687>
   Exact departure, duration, endpoints and ordered ports.

2. **Crew Center: Philipsburg 2016 cruise ship port calendar**
   <https://crew-center.com/philipsburg-st-maarten-cruise-ship-port-calendar-2016>
   Celebrity Summit listed March 24, 2016.

3. **Cruise Industry News: Celebrity announces ship refresh for Infinity and Summit**
   <https://cruiseindustrynews.com/cruise-news/2015/10/celebrity-announces-ship-refresh-for-infinity-and-summit/>
   Identifies March 19, 2016 as the beginning of post-refurbishment sailings.

### Cruise 17: Celebrity Silhouette — British Isles

- Original record date: 2016-07-13; recorded year: 2016.
- Researched dates: 2016-07-13 to 2016-07-25; nights: 12; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Silhouette; original destination label: British Isles.
- Ordered itinerary: Amsterdam (Netherlands) → Belfast (United Kingdom) → Ayr (United Kingdom) → Glasgow (Greenock) (United Kingdom) → Liverpool (United Kingdom) → Dún Laoghaire (Dublin) (Ireland) → Cork (Cobh) (Ireland) → St. Peter Port (Guernsey) (Guernsey) → Le Havre (Paris) (France) → Amsterdam (Netherlands).

#### Day-by-day schedule

Schedule confidence: confirmed. Historical port calendars and the exact-sailing passenger review establish the day order. Liverpool spans July 18–19 as an overnight stay; the sea days are July 14 and July 24.

- **Day 1 · 2016-07-13:** Amsterdam (Netherlands).
- **Day 2 · 2016-07-14:** At sea.
- **Day 3 · 2016-07-15:** Belfast (United Kingdom).
- **Day 4 · 2016-07-16:** Ayr (United Kingdom).
- **Day 5 · 2016-07-17:** Glasgow (Greenock) (United Kingdom).
- **Day 6 · 2016-07-18:** Liverpool (United Kingdom). Overnight in Liverpool.
- **Day 7 · 2016-07-19:** Liverpool (United Kingdom). Second day of the Liverpool overnight stay.
- **Day 8 · 2016-07-20:** Dún Laoghaire (Dublin) (Ireland).
- **Day 9 · 2016-07-21:** Cork (Cobh) (Ireland).
- **Day 10 · 2016-07-22:** St. Peter Port (Guernsey) (Guernsey).
- **Day 11 · 2016-07-23:** Le Havre (Paris) (France).
- **Day 12 · 2016-07-24:** At sea.
- **Day 13 · 2016-07-25:** Amsterdam (Netherlands).

Schedule sources:

1. **Cruiseline: Celebrity Silhouette — July 13, 2016**
   <https://cruiseline.com/ship/celebrity-silhouette/review/425905>
   Exact departure, duration, roundtrip and all ordered ports.

2. **Belfast Harbour 2016 schedule, archived by NI Ferry**
   <https://www.niferry.co.uk/downloads/Belfast%20Cruise%20Schedule%202016.pdf>
   Lists Celebrity Silhouette at Belfast on July 15.

3. **PortNews: Ayr and Troon receive record cruise calls in 2016**
   <https://en.portnews.ru/news/220079/>
   Contemporary ABP announcement identifies Silhouette's July 16 Ayr call for The Open.

4. **Crew Center: Liverpool 2016 port calendar**
   <https://crew-center.com/liverpool-england-cruise-ship-port-calendar-2016>
   Records arrival July 18 and departure July 19, confirming the overnight in Liverpool.

5. **Crew Center: Dublin 2016 port calendar**
   <https://crew-center.com/dublin-ireland-cruise-ship-port-calendar-2016>
   Lists the Dublin-area call on July 20.

6. **data.gg: historical Guernsey cruise sailings**
   <https://data.gg/Developers/Sailings/Cruises/View>
   Lists Celebrity Silhouette in Guernsey on July 22, arriving from Cork and sailing to Le Havre.

7. **Crew Center: Le Havre 2016 port calendar**
   <https://crew-center.com/le-havre-france-cruise-ship-port-calendar-2016>
   Lists Celebrity Silhouette at Le Havre on July 23.

8. **Crew Center: Amsterdam 2016 port calendar**
   <https://crew-center.com/amsterdam-holland-cruise-ship-port-calendar-2016>
   Records the July 13 departure and July 25 return.

#### Voyage notes and sources

Exact match: 12-night British Isles & The Open, Amsterdam roundtrip. Verified passenger review supplies ordered ports including both Ayr and Greenock. Ayr call on July 16 is confirmed by a contemporary port announcement for The Open at Royal Troon. The return date is calculated from departure plus twelve nights.

1. **Cruiseline: Celebrity Silhouette — July 13, 2016**
   <https://cruiseline.com/ship/celebrity-silhouette/review/425905>
   Exact departure, duration, roundtrip and all ordered ports.

2. **Cruiseline: To maximize your experience, do your homework**
   <https://cruiseline.com/ship/celebrity-silhouette/review/425853>
   Second verified review of July 13 sailing corroborates duration and most ports.

3. **PortNews: Ayr and Troon receive record cruise calls in 2016**
   <https://en.portnews.ru/news/220079/>
   Contemporary ABP announcement identifies Silhouette's July 16 Ayr call for The Open.

4. **Cruise Critic: Great ship and cruise with a few inconsistencies**
   <https://www.cruisecritic.com/cruise/celebrity/celebrity-silhouette/reviews/544246>
   Passenger explicitly states July 13 twelve-day Amsterdam British Isles roundtrip.

### Cruise 18: Carnival Sunshine — Eastern Caribbean

- Original record date: 2017-03-12; recorded year: 2017.
- Researched dates: 2017-03-12 to 2017-03-17; nights: 5; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Sunshine; original destination label: Eastern Caribbean.
- Ordered itinerary: Port Canaveral (United States) → Amber Cove (Dominican Republic) → Grand Turk (Turks and Caicos Islands) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. The official deployment announcement and dated port calendars place Amber Cove on March 14 and Grand Turk on March 15, with sea days on March 13 and March 16.

- **Day 1 · 2017-03-12:** Port Canaveral (United States).
- **Day 2 · 2017-03-13:** At sea.
- **Day 3 · 2017-03-14:** Amber Cove (Dominican Republic).
- **Day 4 · 2017-03-15:** Grand Turk (Turks and Caicos Islands).
- **Day 5 · 2017-03-16:** At sea.
- **Day 6 · 2017-03-17:** Port Canaveral (United States).

Schedule sources:

1. **Carnival Cruise Line: Sunshine 2016–17 deployment announcement**
   <https://www.carnival-news.com/2015/03/16/carnival-sunshine-to-operate-unique-schedule-of-two-to-10-day-voyages-from-new-york-june-to-october-2016>
   Official release explicitly names March 12, 2017 five-day Amber Cove/Grand Turk sailing from Port Canaveral.

2. **Crew Center: Amber Cove 2017 port calendar**
   <https://crew-center.com/amber-cove-cruise-ship-schedule-2017>
   Lists Carnival Sunshine at Amber Cove on March 14, 2017.

3. **Crew Center: Grand Turk 2017 port calendar**
   <https://crew-center.com/grand-turk-turks-and-caicos-cruise-ship-schedule-2017>
   Lists Carnival Sunshine at Grand Turk on March 15, 2017.

#### Voyage notes and sources

Exact match to official Carnival deployment announcement and verified sailing review: five-night Eastern Caribbean cruise from Port Canaveral to Amber Cove and Grand Turk. End date calculated from verified departure and duration.

1. **Carnival Cruise Line: Sunshine 2016–17 deployment announcement**
   <https://www.carnival-news.com/2015/03/16/carnival-sunshine-to-operate-unique-schedule-of-two-to-10-day-voyages-from-new-york-june-to-october-2016>
   Official release explicitly names March 12, 2017 five-day Amber Cove/Grand Turk sailing from Port Canaveral.

2. **Cruiseline: Carnival Sunshine — March 12, 2017**
   <https://cruiseline.com/ship/carnival-sunshine/review/442535>
   Verified review confirms departure, duration and ordered ports.

### Cruise 19: Carnival Liberty — Bahamas

- Original record date: 2017-12-21; recorded year: 2017.
- Researched dates: 2017-12-21 to 2017-12-24; nights: 3; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Liberty; original destination label: Bahamas.
- Ordered itinerary: Port Canaveral (United States) → Nassau (Bahamas) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: likely. Reconstructed from the same ship’s three-night Port Canaveral itinerary documented in May 2017: Nassau on Day 2 and a full sea day on Day 3. The December 21 passenger review confirms the duration and Nassau call, but does not independently date the port or sea day.

- **Day 1 · 2017-12-21:** Port Canaveral (United States).
- **Day 2 · 2017-12-22:** Nassau (Bahamas).
- **Day 3 · 2017-12-23:** At sea.
- **Day 4 · 2017-12-24:** Port Canaveral (United States).

Schedule sources:

1. **Carnival Liberty — December 21, 2017 passenger review**
   <https://cruiseline.com/ship/carnival-liberty/review/460341>
   Exact departure, three-night duration, Port Canaveral roundtrip and Nassau.

2. **Sweet Escapes — Carnival Liberty three-day cruise, May 2017**
   <https://susancrow.blogspot.com/2017/05/carnival-liberty.html>
   Same-year firsthand account follows embarkation, Nassau the next morning, then a full sea day. A seasonal comparison, not the December 21 sailing.

#### Voyage notes and sources

An exact-date passenger review identifies a three-night Bahamas sailing from Port Canaveral and lists Nassau. Return date is calculated from the published duration.

1. **Carnival Liberty — December 21, 2017 passenger review**
   <https://cruiseline.com/ship/carnival-liberty/review/460341>
   Exact departure, three-night duration, Port Canaveral roundtrip and Nassau.

### Cruise 20: Celebrity Reflection — Mediterranean Getaway

- Original record date: 2018-08-15; recorded year: 2018.
- Researched dates: 2018-08-15 to 2018-08-21; nights: 6; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Reflection; original destination label: Mediterranean.
- Ordered itinerary: Civitavecchia (Rome) (Italy) → La Spezia (Italy) → Villefranche (France) → Ajaccio (France) → Cagliari (Italy) → Naples (Italy) → Civitavecchia (Rome) (Italy).

#### Day-by-day schedule

Schedule confidence: confirmed. The exact-date archived itinerary lists a port on every calendar day; this six-night voyage had no full sea days.

- **Day 1 · 2018-08-15:** Civitavecchia (Rome) (Italy).
- **Day 2 · 2018-08-16:** La Spezia (Italy).
- **Day 3 · 2018-08-17:** Villefranche (France).
- **Day 4 · 2018-08-18:** Ajaccio (France).
- **Day 5 · 2018-08-19:** Cagliari (Italy).
- **Day 6 · 2018-08-20:** Naples (Italy).
- **Day 7 · 2018-08-21:** Civitavecchia (Rome) (Italy).

Schedule sources:

1. **Archived Celebrity Mediterranean Getaway itinerary, August 15–21, 2018**
   <https://platinumcruising.com/cruise/6-nights-mediterranean-getaway-cruise-with-celebrity/>
   Full day-by-day historical schedule and Reflection ship identification.

#### Voyage notes and sources

Archived exact-date offer supplies the complete six-night itinerary. Every day had a port: La Spezia Aug 16, Villefranche Aug 17, Ajaccio Aug 18, Cagliari Aug 19 and Naples Aug 20. During our stop in Villefranche, France, we visited Monaco on a shore excursion.

1. **Archived Celebrity Mediterranean Getaway itinerary, August 15–21, 2018**
   <https://platinumcruising.com/cruise/6-nights-mediterranean-getaway-cruise-with-celebrity/>
   Full day-by-day historical schedule and Reflection ship identification.

2. **Celebrity 2018 Mediterranean offers**
   <https://www.cruisebay.com/uploads/cruise-specials/docs/celebrity-cruises-1312.pdf>
   Promotional brochure separately identifies Reflection's six-night August 15, 2018 departure.

### Cruise 21: Norwegian Sky — Cuba & Bahamas

- Original record date: 2019-06-03; recorded year: 2019.
- Researched dates: 2019-06-03 to 2019-06-07; nights: 4; confidence: confirmed.
- Cruise line: Norwegian Cruise Line.
- Original ship label: NCL Sky; original destination label: Cuba.
- Ordered itinerary: Miami (United States) → Havana (Cuba) → Great Stirrup Cay (Bahamas) → Miami (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. Historical port calendars give Havana June 4 through the early morning of June 5, then Great Stirrup Cay June 6. June 5 retains the overnight Havana call and is not counted as a full sea day. The Great Stirrup Cay visit remains a scheduled call.

- **Day 1 · 2019-06-03:** Miami (United States).
- **Day 2 · 2019-06-04:** Havana (Cuba). Overnight in Havana.
- **Day 3 · 2019-06-05:** Havana (Cuba). The overnight Havana call ended at 06:00; sailing later that day is not a full sea day.
- **Day 4 · 2019-06-06:** Great Stirrup Cay (Bahamas).
- **Day 5 · 2019-06-07:** Miami (United States).

Schedule sources:

1. **Port of Miami ship calendar, May–August 2019**
   <https://crew-center.com/port-miami-cruise-ship-schedule-may-august-2019>
   Sky in Miami June 3 and June 7.

2. **Havana ship calendar, January–June 2019**
   <https://crew-center.com/havana-cuba-cruise-ship-schedule-january-june-2019>
   Sky scheduled Havana June 4, 07:00 through June 5, 06:00.

3. **Great Stirrup Cay ship calendar 2019**
   <https://crew-center.com/great-stirrup-cay-bahamas-cruise-ship-schedule-2019>
   Sky scheduled June 6, 08:00–17:00.

#### Voyage notes and sources

Matched across historical port calendars: Miami June 3, overnight Havana June 4–5, Great Stirrup Cay June 6, Miami June 7. Contemporary coverage documents Sky passengers in Havana June 4. This was one of the final US-to-Cuba cruise visits as the June 5 restrictions took effect; the similarly named Norwegian Sun was diverted, so its cancellation should not be applied to this sailing. Great Stirrup Cay is the scheduled call, not independently confirmed by a passenger report.

1. **Port of Miami ship calendar, May–August 2019**
   <https://crew-center.com/port-miami-cruise-ship-schedule-may-august-2019>
   Sky in Miami June 3 and June 7.

2. **Havana ship calendar, January–June 2019**
   <https://crew-center.com/havana-cuba-cruise-ship-schedule-january-june-2019>
   Sky scheduled Havana June 4, 07:00 through June 5, 06:00.

3. **Great Stirrup Cay ship calendar 2019**
   <https://crew-center.com/great-stirrup-cay-bahamas-cruise-ship-schedule-2019>
   Sky scheduled June 6, 08:00–17:00.

4. **US cruises to Cuba banned: the end of an era**
   <https://oncubanews.com/en/cuba-usa/u-s-cruises-to-cuba-banned-the-end-of-an-era/>
   Contemporary June 6 reporting and photographs identify Sky passengers ashore in Havana on June 4.

5. **With Cuba calls suddenly banned, cruise lines make changes at sea**
   <https://www.travelweekly.com/Cruise-Travel/With-Cuba-calls-suddenly-banned-cruise-lines-make-changes-at-sea>
   Specifically identifies Norwegian Sun, rather than Sky, as diverted from its June 5 Havana call.

### Cruise 22: Emerald Princess — Mediterranean & Adriatic

- Original record date: 2019-08-03; recorded year: 2019.
- Researched dates: 2019-08-03 to 2019-08-10; nights: 7; confidence: confirmed.
- Cruise line: Princess Cruises.
- Original ship label: Emerald Princess; original destination label: Mediterranean.
- Ordered itinerary: Athens (Piraeus) (Greece) → Santorini (Greece) → Kotor (Montenegro) → Messina (Italy) → Naples (Italy) → Barcelona (Spain).

#### Day-by-day schedule

Schedule confidence: likely. The original Princess brochure confirms the August 3 sailing and ordered ports. Sea days on Days 3 and 7 follow a day-by-day firsthand account of the identical July 13–20, 2019 route; the exact August departure’s day-by-day timetable was not located.

- **Day 1 · 2019-08-03:** Athens (Piraeus) (Greece).
- **Day 2 · 2019-08-04:** Santorini (Greece).
- **Day 3 · 2019-08-05:** At sea.
- **Day 4 · 2019-08-06:** Kotor (Montenegro).
- **Day 5 · 2019-08-07:** Messina (Italy).
- **Day 6 · 2019-08-08:** Naples (Italy).
- **Day 7 · 2019-08-09:** At sea.
- **Day 8 · 2019-08-10:** Barcelona (Spain).

Schedule sources:

1. **Princess Europe 2019 brochure — Mediterranean & Adriatic, page 20**
   <https://www.princess.com/downloads/pdf/sin_brochures/2019/europe-2019.pdf>
   Primary brochure: Emerald Princess Aug 3 departure, seven days, Athens–Santorini–Kotor–Messina–Naples–Barcelona.

2. **Emerald Princess July 13–20, 2019 day-by-day trip report**
   <https://cameltravel.co.uk/emerald-princess-cruise/>
   Same-season Athens–Barcelona itinerary explicitly lists sea days on the third and seventh days, with Santorini, Kotor, Messina and Naples in between.

#### Voyage notes and sources

Princess's original Europe 2019 brochure (printed page 20) explicitly lists August 3 for the seven-day Athens-to-Barcelona Mediterranean & Adriatic sailing and supplies the port order. Return date follows its seven-night duration. This route was also available as part of longer combinations; the seven-night departure is the direct match to the supplied date.

1. **Princess Europe 2019 brochure — Mediterranean & Adriatic, page 20**
   <https://www.princess.com/downloads/pdf/sin_brochures/2019/europe-2019.pdf>
   Primary brochure: Emerald Princess Aug 3 departure, seven days, Athens–Santorini–Kotor–Messina–Naples–Barcelona.

2. **Emerald Princess Mediterranean & Adriatic trip report, July 2019**
   <https://cameltravel.co.uk/emerald-princess-cruise/>
   Same season's seven-night route and ports, useful corroboration but not the exact departure.

### Cruise 23: Carnival Magic — Bahamas

- Original record date: 2021-08-12; recorded year: 2021.
- Researched dates: 2021-08-12 to 2021-08-16; nights: 4; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Magic; original destination label: Bahamas.
- Ordered itinerary: Port Canaveral (United States) → Nassau (Bahamas) → Half Moon Cay (Bahamas) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: likely. Likely day order reconstructed from the 2021 short-cruise pattern: Nassau on Day 2, Half Moon Cay on Day 3 and sea on Day 4. Exact August 12 passenger reviews confirm both ports and four nights; a September 23–27 Magic vlog places Half Moon Cay on Day 3, while Carnival’s nearby-period Port Canaveral brochure places the sea day last. Exact August port-day timing remains unverified.

- **Day 1 · 2021-08-12:** Port Canaveral (United States).
- **Day 2 · 2021-08-13:** Nassau (Bahamas).
- **Day 3 · 2021-08-14:** Half Moon Cay (Bahamas).
- **Day 4 · 2021-08-15:** At sea.
- **Day 5 · 2021-08-16:** Port Canaveral (United States).

Schedule sources:

1. **Carnival Magic — First Cruise Back, August 12, 2021**
   <https://cruiseline.com/ship/carnival-magic/review/529973>
   Exact departure, four nights, Port Canaveral, Nassau and Half Moon Cay.

2. **Carnival Magic — Great Family Cruise, August 12, 2021**
   <https://cruiseline.com/ship/carnival-magic/review/542302>
   Separate passenger corroborates exact departure, four nights and both stops.

3. **GarnerTV — Carnival Magic 2021, Day 3 Half Moon Cay**
   <https://www.youtube.com/watch?v=MFP4Hz9dlqo>
   Video title and description explicitly identify Day 3 at Half Moon Cay on the September 23–27, 2021 four-night Port Canaveral sailing; same-season comparison, not the August 12 departure.

4. **Carnival 2019–2021 cruise brochure, printed page 31**
   <https://arrigogroup.com.mt/wp-content/uploads/2019/06/Carnival-2020-Brochure.pdf>
   Primary brochure’s four-day Port Canaveral route has Nassau Day 2, a private island Day 3, sea Day 4, and return Day 5. This example names Princess Cays rather than Half Moon Cay, so it supports only the seasonal day pattern.

5. **Carnival announces Magic replacing Elation on short Port Canaveral cruises**
   <https://www.carnival-news.com/2021/06/10/carnival-cruise-line-confirms-first-sailing-for-mardi-gras-announces-more-ships-returning-in-august>
   Official June 10, 2021 announcement says Magic would take over Elation’s four- and five-day Bahamas itineraries August 7–October 7.

#### Voyage notes and sources

Two independent exact-date passenger reviews identify a four-night Port Canaveral roundtrip with Nassau and Half Moon Cay. Return date is calculated from the duration; another passenger's next sailing begins August 16. Precise port-day timing was not found. An isolated blog's August 15 end date conflicts with the two four-night reviews.

1. **Carnival Magic — First Cruise Back, August 12, 2021**
   <https://cruiseline.com/ship/carnival-magic/review/529973>
   Exact departure, four nights, Port Canaveral, Nassau and Half Moon Cay.

2. **Carnival Magic — Great Family Cruise, August 12, 2021**
   <https://cruiseline.com/ship/carnival-magic/review/542302>
   Separate passenger corroborates exact departure, four nights and both stops.

### Cruise 24: Mardi Gras — Eastern Caribbean & Bahamas

- Original record date: 2022-03-12; recorded year: 2022.
- Researched dates: 2022-03-12 to 2022-03-19; nights: 7; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Mardi Gras 2.0; original destination label: Bahamas.
- Ordered itinerary: Port Canaveral (United States) → Nassau (Bahamas) → Amber Cove (Dominican Republic) → Grand Turk (Turks and Caicos Islands) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. The exact March 12–19, 2022 archived schedule explicitly lists full sea days on March 13, 15 and 18. These are scheduled days, subject to any unrecorded operational changes.

- **Day 1 · 2022-03-12:** Port Canaveral (United States).
- **Day 2 · 2022-03-13:** At sea.
- **Day 3 · 2022-03-14:** Nassau (Bahamas).
- **Day 4 · 2022-03-15:** At sea.
- **Day 5 · 2022-03-16:** Amber Cove (Dominican Republic).
- **Day 6 · 2022-03-17:** Grand Turk (Turks and Caicos Islands).
- **Day 7 · 2022-03-18:** At sea.
- **Day 8 · 2022-03-19:** Port Canaveral (United States).

Schedule sources:

1. **Mardi Gras March 12–19, 2022 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-eastern-caribbean-from-port-canaveral-%28orlando%29-cruise_mardi-gras_3-12-2022.html>
   Exact dates, duration and ordered port schedule.

#### Voyage notes and sources

The date matches an archived seven-night Eastern Caribbean itinerary. Nassau March 14, Amber Cove March 16 and Grand Turk March 17; Bahamas is only one part of the route. The modern ship's official name is Mardi Gras (the user's '2.0' distinguishes it from Carnival's original ship). Historical schedule, subject to any unrecorded operational changes.

1. **Mardi Gras March 12–19, 2022 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-eastern-caribbean-from-port-canaveral-%28orlando%29-cruise_mardi-gras_3-12-2022.html>
   Exact dates, duration and ordered port schedule.

2. **Mardi Gras March 12, 2022 passenger review**
   <https://cruiseline.com/ship/mardi-gras/review/536637>
   Exact-date sailing review corroborates Eastern Caribbean designation.

### Cruise 25: Regal Princess — Mediterranean

- Original record date: 2022-06-16; recorded year: 2022.
- Researched dates: 2022-06-11 to 2022-06-18; nights: 7; confidence: confirmed.
- Cruise line: Princess Cruises.
- Original ship label: Regal Princess; original destination label: Mediterranean.
- Ordered itinerary: Barcelona (Spain) → Gibraltar (Gibraltar) → Marseille (France) → Genoa (Italy) → Livorno (Florence/Pisa) (Italy) → Civitavecchia (Rome) (Italy).

#### Day-by-day schedule

Schedule confidence: confirmed. The archived June 11 departure gives sea days June 12 and 14. Only its first seven nights are included, matching the owner-confirmed Barcelona–Civitavecchia voyage.

- **Day 1 · 2022-06-11:** Barcelona (Spain).
- **Day 2 · 2022-06-12:** At sea.
- **Day 3 · 2022-06-13:** Gibraltar (Gibraltar).
- **Day 4 · 2022-06-14:** At sea.
- **Day 5 · 2022-06-15:** Marseille (France).
- **Day 6 · 2022-06-16:** Genoa (Italy).
- **Day 7 · 2022-06-17:** Livorno (Florence/Pisa) (Italy).
- **Day 8 · 2022-06-18:** Civitavecchia (Rome) (Italy).

Schedule sources:

1. **Regal Princess June 11, 2022 archived Mediterranean itinerary**
   <https://www.icruise.com/itineraries/14-night-mediterranean-with-greek-isles-france-and-turkey-cruise_regal-princess_6-11-2022.html>
   Historical schedule for June 11–18: Barcelona, Gibraltar, Marseille, Genoa, Livorno and Civitavecchia. Published as the first week of a longer itinerary; the owner confirms sailing the seven-day voyage.

#### Voyage notes and sources

You confirmed this was the seven-day Regal Princess cruise. The historical schedule containing your June 16 date matches the June 11–18, 2022 Barcelona-to-Civitavecchia (Rome) sailing, seven nights: Gibraltar June 13, Marseille June 15, Genoa June 16, Livorno June 17, and Civitavecchia June 18. June 16 was the Genoa port day. The archived longer itinerary includes this same first week; your confirmed duration identifies the seven-night voyage.

1. **Regal Princess June 11, 2022 archived Mediterranean itinerary**
   <https://www.icruise.com/itineraries/14-night-mediterranean-with-greek-isles-france-and-turkey-cruise_regal-princess_6-11-2022.html>
   Historical schedule for June 11–18: Barcelona, Gibraltar, Marseille, Genoa, Livorno and Civitavecchia. Published as the first week of a longer itinerary; the owner confirms sailing the seven-day voyage.

### Cruise 26: Norwegian Bliss — Western Caribbean

- Original record date: 2022-12-31; recorded year: 2022.
- Researched dates: 2022-12-31 to 2023-01-07; nights: 7; confidence: confirmed.
- Cruise line: Norwegian Cruise Line.
- Original ship label: NCL Bliss; original destination label: Mexico, Honduras & Belize.
- Ordered itinerary: Miami (United States) → Roatán (Honduras) → Harvest Caye (Belize) → Costa Maya (Mexico) → Cozumel (Mexico) → Miami (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. The exact December 31, 2022–January 7, 2023 archived itinerary lists full sea days on January 1 and January 6.

- **Day 1 · 2022-12-31:** Miami (United States).
- **Day 2 · 2023-01-01:** At sea.
- **Day 3 · 2023-01-02:** Roatán (Honduras).
- **Day 4 · 2023-01-03:** Harvest Caye (Belize).
- **Day 5 · 2023-01-04:** Costa Maya (Mexico).
- **Day 6 · 2023-01-05:** Cozumel (Mexico).
- **Day 7 · 2023-01-06:** At sea.
- **Day 8 · 2023-01-07:** Miami (United States).

Schedule sources:

1. **Norwegian Bliss December 31, 2022 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-caribbean-harvest-caye-cozumel-and-roatan-cruise_norwegian-bliss_12-31-2022.html>
   Exact dates, duration, Miami roundtrip and ordered stops.

#### Voyage notes and sources

Exact archived seven-night sailing crosses into 2023: Roatán Jan 2, Harvest Caye Jan 3, Costa Maya Jan 4, Cozumel Jan 5. The Bahamas are not on this route. Historical scheduled itinerary, with a same-departure passenger review.

1. **Norwegian Bliss December 31, 2022 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-caribbean-harvest-caye-cozumel-and-roatan-cruise_norwegian-bliss_12-31-2022.html>
   Exact dates, duration, Miami roundtrip and ordered stops.

2. **Norwegian Bliss December 31, 2022 passenger review**
   <https://cruiseline.com/ship/norwegian-bliss/review/549720>
   Same-departure Western Caribbean passenger review.

### Cruise 27: Celebrity Solstice — Mexican Riviera & San Diego

- Original record date: 2023-03-18; recorded year: 2023.
- Researched dates: 2023-03-11 to 2023-03-18; nights: 7; confidence: likely.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Solstice; original destination label: Mexican Riviera.
- Ordered itinerary: Los Angeles (San Pedro) (United States) → Cabo San Lucas (Mexico) → Mazatlán (Mexico) → San Diego (United States) → Los Angeles (San Pedro) (United States).

#### Day-by-day schedule

Schedule confidence: likely. The archived March 11–18, 2023 schedule explicitly lists sea days March 12, 15 and 16. Day positions are documented for that sailing; matching it to the owner’s March 18 date remains likely, as described in the voyage notes.

- **Day 1 · 2023-03-11:** Los Angeles (San Pedro) (United States).
- **Day 2 · 2023-03-12:** At sea.
- **Day 3 · 2023-03-13:** Cabo San Lucas (Mexico).
- **Day 4 · 2023-03-14:** Mazatlán (Mexico).
- **Day 5 · 2023-03-15:** At sea.
- **Day 6 · 2023-03-16:** At sea.
- **Day 7 · 2023-03-17:** San Diego (United States).
- **Day 8 · 2023-03-18:** Los Angeles (San Pedro) (United States).

Schedule sources:

1. **Celebrity Solstice March 11–18, 2023 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-mexican-riviera-cruise_celebrity-solstice_3-11-2023.html>
   Exact return-date match and Cabo–Mazatlán–San Diego itinerary.

#### Voyage notes and sources

Your date is most likely the return date: the documented March 11–18 voyage matches your Cabo and Mazatlán memories, and also visited San Diego. Archived dates: Cabo March 13, Mazatlán March 14, San Diego March 17. A verified passenger review corroborates all three stops. The separate March 18 departure was marketed with Catalina Island and Cabo instead, making March 11–18 the stronger match. No Puerto Vallarta stop is supported for this sailing.

1. **Celebrity Solstice March 11–18, 2023 archived itinerary**
   <https://www.icruise.com/itineraries/7-night-mexican-riviera-cruise_celebrity-solstice_3-11-2023.html>
   Exact return-date match and Cabo–Mazatlán–San Diego itinerary.

2. **Verified Solstice March 11, 2023 passenger review**
   <https://cruiseline.com/ship/celebrity-solstice/review/553203>
   Passenger lists Cabo San Lucas, Mazatlán and San Diego.

3. **Archived Celebrity 2023 cruise offers**
   <https://blog.cruises-n-more.com/press-and-cruise-news/family-owned-and-operated-going-on-25-years-cruises-n-more-offers-respected-expertise-and-superior-deals-prices-amenities/>
   March 18 departure advertised Catalina and Cabo, supporting interpretation of anchor as return date.

### Cruise 28: Celebrity Millennium — Best of Japan & South Korea

- Original record date: 2024-07-02; recorded year: 2024.
- Researched dates: 2024-07-02 to 2024-07-14; nights: 12; confidence: confirmed.
- Cruise line: Celebrity Cruises.
- Original ship label: Celebrity Millennium; original destination label: Japan & South Korea.
- Ordered itinerary: Yokohama (Tokyo) (Japan) → Kobe (Japan) → Osaka (Japan) → Kochi (Japan) → Hiroshima (Japan) → Jeju (South Korea) → Kagoshima (Japan) → Shimizu (Mount Fuji) (Japan) → Yokohama (Tokyo) (Japan).

#### Day-by-day schedule

Schedule confidence: confirmed. The corrected July 2–14 itinerary has full sea days July 3, 9 and 12. Kobe and Osaka are overnight calls: July 5 includes departure from Kobe and arrival in Osaka, not a sea day.

- **Day 1 · 2024-07-02:** Yokohama (Tokyo) (Japan).
- **Day 2 · 2024-07-03:** At sea.
- **Day 3 · 2024-07-04:** Kobe (Japan). Overnight in Kobe.
- **Day 4 · 2024-07-05:** Kobe (Japan) → Osaka (Japan). Depart Kobe at 05:00, arrive Osaka at 08:00 and stay overnight.
- **Day 5 · 2024-07-06:** Osaka (Japan). Overnight Osaka call continues until the 17:00 departure.
- **Day 6 · 2024-07-07:** Kochi (Japan).
- **Day 7 · 2024-07-08:** Hiroshima (Japan).
- **Day 8 · 2024-07-09:** At sea.
- **Day 9 · 2024-07-10:** Jeju (South Korea).
- **Day 10 · 2024-07-11:** Kagoshima (Japan).
- **Day 11 · 2024-07-12:** At sea.
- **Day 12 · 2024-07-13:** Shimizu (Mount Fuji) (Japan).
- **Day 13 · 2024-07-14:** Yokohama (Tokyo) (Japan).

Schedule sources:

1. **Celebrity official July 2, 2024 itinerary correction**
   <https://www.celebritycruises.com/content/dam/celebrity/pdf/ML-7-2-24-12-nights-best-of-japan-cruises-Itinerary-Modification-Guest-Letter.pdf>
   Primary correction adds Kochi July 7, moves Hiroshima to July 8 and Jeju to July 10, replaces Nagasaki with sea day.

2. **Celebrity Millennium July 2–14, 2024 archived itinerary**
   <https://www.icruise.com/itineraries/12-night-best-of-japan-cruise_celebrity-millennium_7-2-2024.html>
   Full corrected route, dates and overnight calls.

#### Voyage notes and sources

Exact twelve-night departure with an official corrected itinerary letter. Kobe July 4–5, Osaka July 5–6, Kochi July 7, Hiroshima July 8, Jeju July 10, Kagoshima July 11 and Shimizu July 13. The official change added Kochi and removed Nagasaki; map follows that revision. Kobe and Osaka are separate calls with overnight stays.

1. **Celebrity official July 2, 2024 itinerary correction**
   <https://www.celebritycruises.com/content/dam/celebrity/pdf/ML-7-2-24-12-nights-best-of-japan-cruises-Itinerary-Modification-Guest-Letter.pdf>
   Primary correction adds Kochi July 7, moves Hiroshima to July 8 and Jeju to July 10, replaces Nagasaki with sea day.

2. **Celebrity Millennium July 2–14, 2024 archived itinerary**
   <https://www.icruise.com/itineraries/12-night-best-of-japan-cruise_celebrity-millennium_7-2-2024.html>
   Full corrected route, dates and overnight calls.

### Cruise 29: Mardi Gras — Southern Caribbean — Aruba & Curaçao

- Original record date: 2025-06-07; recorded year: 2025.
- Researched dates: 2025-06-07 to 2025-06-15; nights: 8; confidence: confirmed.
- Cruise line: Carnival Cruise Line.
- Original ship label: Carnival Mardi Gras 2.0; original destination label: Aruba & Curaçao.
- Ordered itinerary: Port Canaveral (United States) → Aruba (Aruba) → Curaçao (Curaçao) → Amber Cove (Dominican Republic) → Port Canaveral (United States).

#### Day-by-day schedule

Schedule confidence: confirmed. The updated June 7–15, 2025 schedule explicitly lists sea days June 8, 9, 12 and 14; Amber Cove is retained as the revised June 13 call.

- **Day 1 · 2025-06-07:** Port Canaveral (United States).
- **Day 2 · 2025-06-08:** At sea.
- **Day 3 · 2025-06-09:** At sea.
- **Day 4 · 2025-06-10:** Aruba (Aruba).
- **Day 5 · 2025-06-11:** Curaçao (Curaçao).
- **Day 6 · 2025-06-12:** At sea.
- **Day 7 · 2025-06-13:** Amber Cove (Dominican Republic).
- **Day 8 · 2025-06-14:** At sea.
- **Day 9 · 2025-06-15:** Port Canaveral (United States).

Schedule sources:

1. **Mardi Gras June 7–15, 2025 archived itinerary**
   <https://www.icruise.com/itineraries/8-night-southern-caribbean-from-port-canaveral-%28orlando%29-cruise_mardi-gras_6-7-2025.html>
   Exact dates, eight nights and updated Aruba–Curaçao–Amber Cove route.

2. **Carnival replaces Grand Turk calls on selected 2025 itineraries**
   <https://www.cruisehive.com/carnival-passes-up-caribbean-port-for-multiple-itineraries/170377>
   Specifically identifies June 7 Mardi Gras sailing's substitution of Amber Cove for Grand Turk.

#### Voyage notes and sources

Exact eight-night Port Canaveral roundtrip: Aruba June 10, Curaçao June 11 and Amber Cove June 13. Amber Cove replaced the originally planned Grand Turk call; the map uses the updated itinerary. Modern ship officially named Mardi Gras.

1. **Mardi Gras June 7–15, 2025 archived itinerary**
   <https://www.icruise.com/itineraries/8-night-southern-caribbean-from-port-canaveral-%28orlando%29-cruise_mardi-gras_6-7-2025.html>
   Exact dates, eight nights and updated Aruba–Curaçao–Amber Cove route.

2. **Carnival replaces Grand Turk calls on selected 2025 itineraries**
   <https://www.cruisehive.com/carnival-passes-up-caribbean-port-for-multiple-itineraries/170377>
   Specifically identifies June 7 Mardi Gras sailing's substitution of Amber Cove for Grand Turk.
