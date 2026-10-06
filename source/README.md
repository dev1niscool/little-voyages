# Little voyages

An illustrated, interactive atlas of 29 personal cruises, from 2005 to 2025.

**Explore:** https://dev1niscool.github.io/little-voyages/

- Ships anchored to actual departure coordinates, with grouped harbors and a ship/date picker
- Clickable routes, port labels, and a single animated pass through a selected itinerary, with replay
- Year timeline, ship/port search, cruise-line filter, and chronological playback
- Dates, duration, itinerary, historical research notes, and source links for every voyage
- A statistics page with cruise duration, estimated sailing distance, Earth-distance equivalents, repeat ports, cruise-line breakdowns, and clickable year charts
- Colorful glass panels, a persistent light/dark switch, and animated SVG sea creatures
- Responsive desktop and mobile layout; keyboard ship controls and reduced-motion support
- Complete download bundle: JSON logbook and statistics, CSV cruise and port tables, GeoJSON routes, and a Markdown research guide
- Bundled map geometry and fonts; no map API key, trackers, or backend

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Run the browser smoke checks against a local preview or the published site (requires Chromium):

```sh
ATLAS_URL=http://localhost:4173/ node scripts/check-browser.mjs
ATLAS_URL=http://localhost:4173/ node scripts/check-map.mjs
ATLAS_URL=http://localhost:4173/ node scripts/check-downloads.mjs
```

Set `CHROMIUM_EXECUTABLE_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`.

The atlas lives in its own repository, [`dev1niscool/little-voyages`](https://github.com/dev1niscool/little-voyages). The repository root holds the published site, and `source/` holds this source project. GitHub Pages serves the root of the `main` branch. To prepare updated files from this source folder, run `npm run build` followed by `npm run stage`, review the changes, and commit them in this dedicated repository.

## Downloads and authorized AI handoffs

The About panel offers a complete ZIP plus six individual exports from `public/downloads/`. `scripts/build-exports.mjs` generates them from the same cruise records and statistics functions used by the website; `npm run build` regenerates them before Vite builds the site. They describe the full collection rather than the currently filtered map.

- `little-voyages-logbook.json`: complete normalized cruise records, including research notes and source URLs.
- `little-voyages-statistics.json`: full-collection calculations, destination classifications and evidence, and methodology.
- `little-voyages-cruises.csv`: one summary row per voyage.
- `little-voyages-ports.csv`: ordered itinerary entries, including scenic stops and final homeport returns that some statistics exclude.
- `little-voyages-routes.geojson`: illustrative route coordinates in GeoJSON longitude/latitude order, not actual GPS tracks.
- `little-voyages-guide.md`: data dictionary, research notes and source links, interpretation guidance, and permission scope.

The ZIP contains all six. Builds are deterministic, and the guide explains CSV safety escaping and the limitations of historical itinerary estimates. An owner-authorized AI task may use supplied files; downloading them does not grant training or unrelated reuse rights.

Edit `public/AI-USAGE.md`, `public/SECURITY.md`, and `public/robots.txt` as the canonical policy files; the stage step copies them to the repository root. The page-level `noai` / `noimageai` metadata is a voluntary, nonstandard signal. **Project-path robots.txt is advisory only:** crawler rules are normally read from the origin root, which belongs to the separate portfolio site. Do not change that repository as part of this project's build or publication. These notices cannot prevent copying or attacks against a public site.

## Historical research

The starting point was a personal list of ships, destinations, and dates. A supplied date can be departure, arrival, or a day during the cruise. Research comes from historical brochures, archived itineraries, contemporary passenger reviews, and cruise forums. Source links and their specific relevance appear in each voyage’s **Notes & sources** tab.

`research/early.json`, `research/middle.json`, and `research/recent.json` contain the research records. `scripts/build-data.mjs` normalizes their ports, preserves the original notes, assigns map coordinates, and generates `src/data.js` and `public/data/cruises.json`. Regenerate after editing research:

```sh
node scripts/build-data.mjs
npm run exports
npm test
```

Confidence labels distinguish historical matches from likely reconstructions. A historical match does not imply that every port call is independently verified as actually visited. Notes identify scheduled itineraries, known changes, and remaining uncertainty. The owner clarified that the August 2008 cruise was Disney Wonder in the Bahamas. The June 2022 Regal Princess trip was confirmed as the seven-day voyage, matching the June 11–18 Barcelona-to-Civitavecchia schedule.

Map routes are **illustrative**, using port connections and some offshore waypoints. They are not recorded ship tracks or suitable for navigation. Ports, scenic cruising locations, and candidate segments should not be interpreted as independently verified personal visits.

## Map interaction

Ships begin at their recorded departure ports. Nearby harbors form deterministic groups at overview scales; each group is anchored to a real member port, and zooming reveals its ports without moving their coordinates. Tap a harbor to zoom in and choose a dated voyage. Route lines are also selectable; shared stretches offer a choice of the voyages using them.

Selecting a voyage fits its full illustrated route and animates one ship from departure to the final recorded port. Round trips return to their homeport; one-way trips end at their arrival port. Replay runs the route again. The geographic ship position pauses during touch/drag/zoom gestures, and playback pauses when the atlas or browser tab is hidden. With Motion off, the ship stays at departure. The camera retains its geographic center and scale when the mobile viewport resizes.

`node scripts/check-map.mjs` tests geographic marker placement against rendered route origins through zoom, pan, resize, and real touch events, plus departure choices, route selection, filters, and animation endpoints.

## Statistics and appearance

Open the **Statistics** tab or share https://dev1niscool.github.io/little-voyages/?view=statistics.

`src/statistics-data.js` calculates the statistics directly from the corrected itinerary collection. Recorded nights are used as full-day equivalents; hours are nights × 24, including time ashore. These are trip-duration estimates, not a measurement of time physically aboard or underway. Distance is the sum of great-circle segments along the atlas’s schematic routes, so it is approximate rather than GPS mileage. Earth equivalents use the equatorial circumference of 40,075.017 km. The page offers statute miles, nautical miles, and kilometres, with the same underlying distance.

Port counts exclude scenic cruising stops and omit the repeated final homeport on round trips, while preserving meaningful repeat calls such as Disney Wonder’s two visits to Castaway Cay in 2008. The cruising passport lists 35 sovereign countries and 9 territories or special jurisdictions from the recorded itineraries, including departure and one-way arrival ports. `src/destinations.js` explicitly classifies each destination by its current status, with official sources for territories, Crown Dependencies, and constituent countries. Visits to a territory do not also add its associated sovereign country; each destination counts once. Unfamiliar labels remain unclassified until reviewed. Expandable lists include flags, country port/cruise counts, and territory status and ports. The on-page calculation notes explain these definitions and the inherited historical itinerary uncertainty.

The theme follows your system preference initially. The dark-mode switch saves an explicit choice in browser-local storage. Motion follows reduced-motion preferences and can also be turned off from the header.

Design references: [Flighty Passport](https://flighty.com/help/passport), [Polarsteps Travel Tracker](https://www.polarsteps.com/travel-tracker), and [Apple’s materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials). The site uses original layouts and SVG illustrations; no assets from these reference sites are copied.

## Stack and attribution

Vite, vanilla JavaScript, and D3. Static HTML/CSS/JS with no runtime services.

- Map geometry: [Natural Earth, 1:10m countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/), public domain. Shared-arc simplification at 750 metres, small islands retained, Antarctica omitted. Bundled as TopoJSON (about 1.93 MB / 681 KB gzip); no map tiles or runtime service. Optional rebuild: `node scripts/build-map.mjs`, requiring Node.js, npm, and curl. The script pins the source checksum and Mapshaper version.
- [DM Sans](https://github.com/googlefonts/dm-fonts) and [Fraunces](https://github.com/undercasetype/Fraunces), SIL Open Font License. Fonts bundled locally; license texts in `public/fonts/`.
- Ship and whale illustrations are original SVG artwork.
