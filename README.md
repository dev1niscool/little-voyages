# Little Voyages

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
