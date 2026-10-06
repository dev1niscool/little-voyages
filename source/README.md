# Little voyages

An illustrated, interactive atlas of 29 personal cruises, from 2005 to 2025.

**Explore:** https://dev1niscool.github.io/little-voyages/

- Animated, individually selectable ships on a zoomable world map
- Illustrated routes and port labels, with smooth focus on a selected voyage
- Year timeline, ship/port search, cruise-line filter, and chronological playback
- Dates, duration, itinerary, historical research notes, and source links for every voyage
- A statistics page with cruise duration, estimated sailing distance, Earth-distance equivalents, repeat ports, cruise-line breakdowns, and clickable year charts
- Colorful glass panels, a persistent light/dark switch, and animated SVG sea creatures
- Responsive desktop and mobile layout; keyboard ship controls and reduced-motion support
- Downloadable JSON logbook; bundled map geometry and fonts; no map API key, trackers, or backend

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
```

Set `CHROMIUM_EXECUTABLE_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`.

The atlas lives in its own repository, [`dev1niscool/little-voyages`](https://github.com/dev1niscool/little-voyages). The repository root holds the published site, and `source/` holds this source project. GitHub Pages serves the root of the `main` branch. To prepare updated files from this source folder, run `npm run build` followed by `npm run stage`, review the changes, and commit them in this dedicated repository.

## Historical research

The starting point was a personal list of ships, destinations, and dates. A supplied date can be departure, arrival, or a day during the cruise. Research comes from historical brochures, archived itineraries, contemporary passenger reviews, and cruise forums. Source links and their specific relevance appear in each voyage’s **Notes & sources** tab.

`research/early.json`, `research/middle.json`, and `research/recent.json` contain the research records. `scripts/build-data.mjs` normalizes their ports, preserves the original notes, assigns map coordinates, and generates `src/data.js` and `public/data/cruises.json`. Regenerate after editing research:

```sh
node scripts/build-data.mjs
npm test
```

Confidence labels distinguish historical matches from likely reconstructions. A historical match does not imply that every port call is independently verified as actually visited. Notes identify scheduled itineraries, known changes, and remaining uncertainty. The owner clarified that the August 2008 cruise was Disney Wonder in the Bahamas. The June 2022 Regal Princess trip was confirmed as the seven-day voyage, matching the June 11–18 Barcelona-to-Civitavecchia schedule.

Map routes are **illustrative**, using port connections and some offshore waypoints. They are not recorded ship tracks or suitable for navigation. Ports, scenic cruising locations, and candidate segments should not be interpreted as independently verified personal visits.

## Statistics and appearance

Open the **Statistics** tab or share https://dev1niscool.github.io/little-voyages/?view=statistics.

`src/statistics-data.js` calculates the statistics directly from the corrected itinerary collection. Recorded nights are used as full-day equivalents; hours are nights × 24, including time ashore. These are trip-duration estimates, not a measurement of time physically aboard or underway. Distance is the sum of great-circle segments along the atlas’s schematic routes, so it is approximate rather than GPS mileage. Earth equivalents use the equatorial circumference of 40,075.017 km. The page offers statute miles, nautical miles, and kilometres, with the same underlying distance.

Port counts exclude scenic cruising stops and omit the repeated final homeport on round trips, while preserving meaningful repeat calls such as Disney Wonder’s two visits to Castaway Cay in 2008. Countries and territories are counted separately. The on-page calculation notes explain these definitions and the inherited historical itinerary uncertainty.

The theme follows your system preference initially. The dark-mode switch saves an explicit choice in browser-local storage. Motion follows reduced-motion preferences and can also be turned off from the header.

Design references: [Flighty Passport](https://flighty.com/help/passport), [Polarsteps Travel Tracker](https://www.polarsteps.com/travel-tracker), and [Apple’s materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials). The site uses original layouts and SVG illustrations; no assets from these reference sites are copied.

## Stack and attribution

Vite, vanilla JavaScript, and D3. Static HTML/CSS/JS with no runtime services.

- Map geometry: [Natural Earth, 1:110m countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson), public domain. Geometry simplified in precision, properties reduced, Antarctica omitted.
- [DM Sans](https://github.com/googlefonts/dm-fonts) and [Fraunces](https://github.com/undercasetype/Fraunces), SIL Open Font License. Fonts bundled locally; license texts in `public/fonts/`.
- Ship and whale illustrations are original SVG artwork.
