# Little Voyages

![Little Voyages: the cream-colored ship and coral flag on a teal glass badge](social/little-voyages-brand-card.jpg)

An illustrated atlas and personal logbook of 29 cruises, with animated ship routes, a year timeline, historical itinerary sources, and playful travel statistics.

**[Explore the atlas](https://dev1niscool.github.io/little-voyages/)** · **[Statistics](https://dev1niscool.github.io/little-voyages/?view=statistics)**

This dedicated repository contains the complete Little Voyages website. It is independent of the portfolio repository.

## Take the logbook with you

Open **About → Download everything** on the website, or [download the complete ZIP](https://dev1niscool.github.io/little-voyages/downloads/little-voyages-complete.zip). The bundle contains the full cruise logbook and travel statistics as JSON, cruise and port spreadsheets as CSV, illustrative routes as GeoJSON, and a readable Markdown guide with definitions, research notes, and source links. The JSON and guide also preserve separately reported shore excursions and non-cruise visits. Individual files are available in the same panel. Every download covers all 29 voyages, regardless of map filters.

For an owner-authorized AI handoff, unzip the bundle and give the agent `little-voyages-guide.md` together with the files relevant to your task. Research uncertainty and estimated routes are documented in the exports.

## Data use and crawler preferences

The [AI-use policy](AI-USAGE.md) allows tasks explicitly authorized by the logbook owner and withholds permission for unauthorized AI collection, model training, and unrelated reuse. [SECURITY.md](SECURITY.md) describes responsible reporting and prohibits unauthorized access and disruption. Third-party licenses still apply.

[robots.txt](robots.txt) lists AI crawler exclusions, and the page includes voluntary `noai` / `noimageai` metadata. These are permission signals, not protection against copying or attacks. Because this is a project site at `/little-voyages/`, its robots file is an **advisory template**: effective rules must be served at the domain's `/robots.txt`. The separate portfolio repository remains untouched. GitHub's own domain controls crawling of repository pages.

## Development

The repository root is the static GitHub Pages site. The app, research, data generator, and tests are in [`source/`](source/). See the [source README](source/README.md) for research notes, statistics methodology, and browser checks.

```sh
cd source
npm ci
npm run dev
```

To publish an update:

```sh
npm test
npm run build
npm run stage
```

Commit the updated source and generated site in this repository. GitHub Pages deploys from `main` → `/ (root)`.

## Link previews and home-screen icon

The website has static Open Graph and Twitter card metadata using the [cruise banner](social/little-voyages-brand-card.jpg), inspired by the ship badge in the website header. Saving the website to a home screen uses that same original ship drawing; Apple touch icons and an Android web manifest with a maskable icon are included. The app requires an internet connection; no offline support is implied.

GitHub repository links use a separate preview setting. To set the repository banner, download `social/little-voyages-brand-card.jpg` (1200 × 630, below 1 MB), open [repository settings](https://github.com/dev1niscool/little-voyages/settings), and choose **Social preview → Edit → Upload an image**. GitHub does not offer a supported public API to change this setting.

If Pages has not yet been enabled, open [Pages settings](https://github.com/dev1niscool/little-voyages/settings/pages), select **Deploy from a branch → main → / (root)**, and save. Website previews and home-screen saving require the published HTTPS site. Messaging apps may cache an older preview for a while.
