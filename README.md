# Little Voyages

![Little Voyages: a pastel cruise ship and a cheerful whale at sea](social/little-voyages-card.jpg)

An illustrated atlas and personal logbook of 29 cruises, with animated ship routes, a year timeline, historical itinerary sources, and playful travel statistics.

**[Explore the atlas](https://dev1niscool.github.io/little-voyages/)** · **[Statistics](https://dev1niscool.github.io/little-voyages/?view=statistics)**

This dedicated repository contains the complete Little Voyages website. It is independent of the portfolio repository.

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

The website has static Open Graph and Twitter card metadata using the [cruise banner](social/little-voyages-card.jpg). Saving the website to a home screen uses the matching cruise-ship icon; Apple touch icons and an Android web manifest are included. The app requires an internet connection; no offline support is implied.

GitHub repository links use a separate preview setting. To set the repository banner, download `social/little-voyages-card.jpg` (1200 × 630, below 1 MB), open [repository settings](https://github.com/dev1niscool/little-voyages/settings), and choose **Social preview → Edit → Upload an image**. GitHub does not offer a supported public API to change this setting.

If Pages has not yet been enabled, open [Pages settings](https://github.com/dev1niscool/little-voyages/settings/pages), select **Deploy from a branch → main → / (root)**, and save. Website previews and home-screen saving require the published HTTPS site. Messaging apps may cache an older preview for a while.
