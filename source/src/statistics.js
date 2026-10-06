import './statistics.css';
import { computeStatistics, statsMethodology } from './statistics-data.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = (value, digits = 0) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const palette = ['#7964da', '#19a9a2', '#ef927d', '#668ce3', '#d0a140', '#ca77b6', '#75ad85'];
const paths = {
  ship: '<path d="m3 14 3 6h12l3-6-9-3-9 3Z"/><path d="M6 13V7h12v6M9 7V3h6v4M3 22q3-2 6 0 3-2 6 0 3-2 6 0"/>',
  star: '<path d="m12 2 2.8 6.7L22 10l-5.4 4.9 1.3 7.1-5.9-3.7L6.1 22l1.3-7.1L2 10l7.2-1.3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
  flag: '<path d="M5 22V3m0 1c5-5 9 5 15 0v11c-6 5-10-5-15 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18m-13 5h.01m4 0h.01m4 0h.01"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a9 9 0 1 0 10 10Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
};
const icon = name => `<svg class="stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
const counter = (value, digits = 0, cls = '') => `<span class="stats-number ${cls}" data-stats-count="${value}" data-digits="${digits}">${number(value, digits)}</span>`;
const sparkle = (cls = '') => `<svg class="stats-sparkle ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 1c0 13-6 19-19 19 13 0 19 6 19 19 0-13 6-19 19-19-13 0-19-6-19-19Z" fill="currentColor"/></svg>`;
const shipScene = `<svg class="stats-ship-scene" viewBox="0 0 360 160" aria-hidden="true"><path d="M0 122q45-24 90 0t90 0 90 0 90 0v38H0Z" fill="#9ee7df" opacity=".17"/><path d="M0 143q45-24 90 0t90 0 90 0 90 0" fill="none" stroke="#b6fff0" opacity=".3" stroke-width="2"/><g class="stats-bobbing-ship"><path d="M167 52h13v27h-13zm37 6h13v22h-13z" fill="#fdbaa1"/><path d="M150 75h97v27h-97z" fill="#e0fbf6"/><path d="M138 91h123v24H138z" fill="#fff9e8"/><path d="M124 105h159l-18 31H149Z" fill="#fffaf1"/><path d="M134 122h139l-8 14H149Z" fill="#93c5e7"/><path d="M163 85h8m12 0h8m12 0h8m12 0h8" stroke="#466d94" stroke-width="4" stroke-linecap="round"/><g fill="#648bb0"><circle cx="155" cy="113" r="3"/><circle cx="173" cy="113" r="3"/><circle cx="191" cy="113" r="3"/><circle cx="209" cy="113" r="3"/><circle cx="227" cy="113" r="3"/><circle cx="245" cy="113" r="3"/></g><path d="M172 51V25l25 8-25 9" fill="#ffd06f" stroke="#fff4c8" stroke-width="1.5"/><path d="M177 36h11" stroke="#ecaa6e" stroke-width="2"/></g><g class="stats-little-whale"><path d="M38 117c-3-16 20-27 37-15 9 6 9 17 20 10l7-8c6 16-8 25-24 19-15 14-37 9-40-6Z" fill="#a8e1e9"/><path d="M59 127q-8 10-13-1" fill="#71b4ce"/><circle cx="47" cy="111" r="2.1" fill="#185e75"/><path d="M47 118q3 3 6-1M58 91q-3-9-9-7m9 7q3-9 10-7" stroke="#b7f4ee" stroke-width="2" fill="none" stroke-linecap="round"/></g><path d="m305 64 3 7 7 2-7 3-3 7-2-7-7-3 7-2Z" fill="#ffe099"/><circle cx="127" cy="42" r="3" fill="#b4f4e6" opacity=".6"/></svg>`;
const globeScene = `<svg class="stats-globe-scene" viewBox="0 0 250 210" aria-hidden="true"><defs><linearGradient id="stats-globe-ocean" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a9c9fd"/><stop offset="1" stop-color="#7795e1"/></linearGradient><clipPath id="stats-globe-clip"><circle cx="122" cy="106" r="66"/></clipPath></defs><ellipse cx="122" cy="181" rx="56" ry="8" fill="#765cc0" opacity=".1"/><circle cx="122" cy="106" r="66" fill="url(#stats-globe-ocean)"/><g clip-path="url(#stats-globe-clip)"><path d="m53 70 23-20 25 8 10 13-6 13-16 8 4 16-14 7-13-15-15-3ZM93 117l20 5 13 14-5 18-15 19-7-15 1-12-12-13ZM137 48l25 6 17 15-5 13-19-1-6 11-11-1-6-12-13 1-3-16ZM143 98l18-6 22 12 10 31-15 7-9-19-9 6-6 19-16-8-8-18ZM181 152l13 3-6 13-12-4Z" fill="#c8f1dd"/><path d="M56 88h132M56 124h132M122 40c-42 39-42 94 0 132m0-132c42 39 42 94 0 132" fill="none" stroke="#fff" opacity=".25" stroke-width="1.1"/></g><ellipse class="stats-orbit" cx="122" cy="111" rx="105" ry="36" transform="rotate(-25 122 111)" fill="none" stroke="#a080d5" stroke-width="1.5" stroke-dasharray="3 7"/><g class="stats-orbit-boat"><path d="M181 48h25v12h-25z" fill="#fff8ed"/><path d="M188 41h8v8h-8z" fill="#ee8e80"/><path d="M174 56h42l-7 12h-26Z" fill="#fff8ed"/><path d="M179 63h32l-3 5h-25Z" fill="#ee8e80"/><path d="M185 53h3m5 0h3m5 0h3" stroke="#786f9e" stroke-width="2" stroke-linecap="round"/></g><g fill="#ad80c6"><path d="m43 46 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><path d="m208 143 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g><circle cx="38" cy="138" r="3" fill="#eaa886"/><circle cx="183" cy="23" r="2.5" fill="#dd9baf"/></svg>`;
const sunScene = `<svg class="stats-sun-scene" viewBox="0 0 100 100" aria-hidden="true"><g class="stats-sun-rays" fill="none" stroke="#d99944" stroke-width="3" stroke-linecap="round"><path d="M50 9v10m0 62v10M9 50h10m62 0h10M21 21l7 7m44 44 7 7M21 79l7-7m44-44 7-7"/></g><circle cx="50" cy="50" r="25" fill="#f9cd73"/><circle cx="43" cy="48" r="2" fill="#76583d"/><circle cx="58" cy="48" r="2" fill="#76583d"/><path d="M44 58q6 5 12-1" stroke="#76583d" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="37" cy="55" rx="4" ry="2" fill="#e9a17b"/><ellipse cx="64" cy="55" rx="4" ry="2" fill="#e9a17b"/></svg>`;

export function createStatisticsPage(container, { cruises, onSelectCruise = () => {}, onSelectYear = () => {} }) {
  const stats = computeStatistics(cruises);
  let unit = 'mi';
  let hasAnimated = false;
  let frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const years = stats.years;
  const firstYear = years[0]?.year || 2005;
  const lastYear = years.at(-1)?.year || firstYear;
  const fullYears = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => years.find(year => year.year === firstYear + index) || { year: firstYear + index, cruises: 0, nights: 0 });
  const maxYearCruises = Math.max(1, ...years.map(year => year.cruises));
  const longest = stats.longestCruises[0];
  const farthest = stats.farthestCruise;
  const longestCruise = cruises.find(cruise => cruise.id === longest?.id);
  const farthestCruise = cruises.find(cruise => cruise.id === farthest?.id);
  const favoriteLine = stats.lines[0];
  const leadingPorts = stats.topPorts.slice(0, 5);
  const shortLine = name => name.replace(' Cruise Line', '').replace(' Cruises', '').replace(' Line', '');
  const statHeading = (eyebrow, heading, copy = '') => `<div class="stats-section-heading"><span class="stats-eyebrow">${eyebrow}</span><h2>${heading}</h2>${copy ? `<p>${copy}</p>` : ''}</div>`;
  const routeCaption = cruise => cruise ? `${cruise.year} · ${escape(cruise.region)}` : '';
  container.classList.add('statistics-page');
  container.innerHTML = `<div class="stats-content">
    <header class="stats-intro"><div><span class="stats-eyebrow"><span class="stats-live-dot"></span> YOUR LIFE AT SEA</span><h1 id="statistics-title">A little sea.<br class="stats-title-break"> <em>A lot of stories.</em>${sparkle()}</h1><p>All those happy departures, adding up to something wonderful.</p></div><div class="stats-collection-stamp">${icon('ship')}<span>A PERSONAL COLLECTION<strong>${firstYear} — ${lastYear}</strong></span></div></header>

    <div class="stats-hero-grid">
      <section class="stats-card stats-nights-card" aria-labelledby="stats-nights-title"><span class="stats-eyebrow">LIFE LOOKS GOOD AT SEA</span><div class="stats-nights-number">${counter(stats.totalNights)}<span id="stats-nights-title">days of voyage time</span></div><p>${number(stats.totalNights)} cruise nights. About <strong>${number(stats.totalNights / 30.44, 1)} months</strong><br>with a new horizon on the calendar.</p><span class="stats-card-note">Summed cruise nights · includes time ashore</span>${shipScene}</section>
      <section class="stats-card stats-distance-card" aria-labelledby="stats-distance-title"><div class="stats-card-top"><span class="stats-icon-tile">${icon('compass')}</span><label class="stats-unit"><span class="sr-only">Distance unit</span><select id="stats-distance-unit" aria-label="Distance unit"><option value="mi">Miles</option><option value="nm">Nautical miles</option><option value="km">Kilometers</option></select>${icon('chevron')}</label></div><span class="stats-eyebrow" id="stats-distance-title">OH, THE MILES YOU’VE MADE</span><div class="stats-distance-number"><span aria-hidden="true">≈</span>${counter(Math.round(stats.estimatedMiles / 100) * 100, 0, 'stats-distance-value')}</div><h2><span class="stats-distance-label">miles</span> of sea stories</h2><p>One port at a time.<br>One wonderfully winding journey.</p><div class="stats-distance-route" aria-hidden="true"><svg viewBox="0 0 320 74"><path d="M8 52C48-17 110 104 158 40S251 15 314 31" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="3 7"/><circle cx="8" cy="52" r="5" fill="currentColor"/><circle cx="314" cy="31" r="5" fill="currentColor"/><path d="m163 30 19 8-16 9 1-7-9-4Z" fill="currentColor"/></svg></div><span class="stats-card-note">Estimated from the illustrated routes</span></section>
      <section class="stats-card stats-earth-card" aria-labelledby="stats-earth-title"><span class="stats-eyebrow">PUT THAT IN PERSPECTIVE</span>${globeScene}<div class="stats-earth-total">≈ ${counter(stats.earthLaps, 1)}<span>×</span></div><h2 id="stats-earth-title">around the world</h2><p>The same distance as circling<br>Earth at the equator.</p></section>
    </div>

    <div class="stats-fleet-ribbon" aria-label="Your cruise collection"><div>${icon('flag')}<span><strong>${number(stats.cruiseCount)}</strong> voyages</span></div><span class="stats-ribbon-dot"></span><div>${icon('ship')}<span><strong>${number(stats.shipCount)}</strong> different ships</span></div><span class="stats-ribbon-dot"></span><div>${icon('star')}<span><strong>${number(stats.lineCount)}</strong> cruise lines</span></div><span class="stats-ribbon-dot"></span><div>${icon('calendar')}<span><strong>${number(lastYear - firstYear)}</strong> years of memories</span></div></div>

    <div class="stats-small-grid">
      <section class="stats-card stats-small-card stats-hours-card"><span class="stats-icon-tile">${icon('clock')}</span><div>${counter(stats.tripHours)}<h2>hours in cruise mode</h2><p>Voyage time, including adventures ashore.</p></div>${sunScene}</section>
      <section class="stats-card stats-small-card stats-ports-card"><span class="stats-icon-tile">${icon('pin')}</span><div>${counter(stats.uniquePorts)}<h2>ports on your map</h2><p>${number(stats.portCalls)} itinerary port visits. Hello again, horizon.</p></div>${sparkle('stats-small-sparkle')}</section>
      <section class="stats-card stats-small-card stats-places-card"><span class="stats-icon-tile">${icon('globe')}</span><div>${counter(stats.placeCount)}<h2>countries & territories</h2><p>A little collection of very different worlds.</p></div><span class="stats-passport-doodle" aria-hidden="true">${icon('flag')}</span></section>
    </div>

    <div class="stats-insights-grid">
      <section class="stats-card stats-years-card">${statHeading('THE YEARS. THE TIDES. THE MEMORIES.', 'Your cruise era', 'Every bar is another chapter. Pick a year to revisit its voyages.')}<div class="stats-chart-key"><span><i></i> Voyages per year</span><span>${number(stats.averageNights, 1)} nights per voyage on average</span></div><div class="stats-year-chart" role="group" aria-label="Voyages by year; choose a year to open it on the map">${fullYears.map(year => `<button class="stats-year-column ${year.cruises ? '' : 'stats-empty-year'}" data-stats-year="${year.year}" ${year.cruises ? '' : 'disabled'} aria-label="${year.year}: ${year.cruises} ${year.cruises === 1 ? 'voyage' : 'voyages'}, ${year.nights} nights. View on map." title="${year.year} · ${year.cruises} ${year.cruises === 1 ? 'voyage' : 'voyages'} · ${year.nights} nights"><span class="stats-bar-space"><span class="stats-year-value">${year.cruises || ''}</span><span class="stats-year-bar" style="--bar-height:${year.cruises ? year.cruises / maxYearCruises * 80 : 2}px;--bar-color:${year.cruises === maxYearCruises ? '#8b79d8' : '#53b7ba'}"></span></span><span class="stats-year-label">${String(year.year).slice(2)}</span></button>`).join('')}</div><div class="stats-chart-footer"><span>${firstYear}</span><p>${icon('star')} ${stats.busiestYears.length > 1 ? `${stats.busiestYears.length} years tie for your busiest: ${maxYearCruises} voyages each` : `${stats.busiestYears[0]?.year}: your busiest year, with ${maxYearCruises} voyages`}</p><span>${lastYear}</span></div></section>
      <section class="stats-card stats-lines-card">${statHeading('YOUR FLOATING FAVORITES', 'A fleet to fall for')}<div class="stats-line-list" role="list" aria-label="Voyages by cruise line">${stats.lines.map((line, index) => `<div class="stats-line-row" role="listitem"><div class="stats-line-name"><span>${escape(shortLine(line.name))}</span><strong>${line.count}<span class="sr-only"> voyages</span></strong></div><div class="stats-line-track" aria-hidden="true"><span style="width:${line.count / (favoriteLine?.count || 1) * 100}%;--line-shade:${palette[index % palette.length]}"></span></div></div>`).join('')}</div><p class="stats-panel-footnote">${number(stats.lineCount)} cruise lines. Many ways to sail happy.</p></section>

      <section class="stats-card stats-return-card">${statHeading('SOME PLACES FEEL LIKE AN OLD FRIEND', 'Hello, again.', 'Your most revisited ports, including departures.')}<ol class="stats-top-ports">${leadingPorts.map((port, index) => `<li><span class="stats-port-rank">${String(index + 1).padStart(2, '0')}</span><span class="stats-port-name"><strong>${escape(port.name)}</strong><small>${escape(port.country)}</small></span><span class="stats-port-count">${number(port.count)}<small>visits</small></span></li>`).join('')}</ol><p class="stats-panel-footnote">Round-trip homeport counted once per cruise.<br>Repeat calls during a voyage count separately.</p></section>
      <section class="stats-highlights" aria-labelledby="stats-highlights-title"><div class="stats-section-heading"><span class="stats-eyebrow">A FEW PAGES WORTH DOG-EARING</span><h2 id="stats-highlights-title">The memorable milestones</h2></div>
        ${longest && longestCruise ? `<button class="stats-card stats-voyage-card stats-longest-card" data-stats-cruise="${longest.id}" aria-label="View ${escape(longest.ship)}, ${longestCruise.year}, one of your longest voyages at ${longest.nights} nights"><span class="stats-voyage-icon">${icon('moon')}</span><span class="stats-voyage-copy"><span class="stats-eyebrow">${stats.longestCruises.length > 1 ? 'ONE OF YOUR LONGEST GETAWAYS' : 'YOUR LONGEST GETAWAY'}</span><strong>${escape(longest.ship)}</strong><span>${routeCaption(longestCruise)}</span><small>${stats.longestCruises.length > 1 ? `${stats.longestCruises.length} voyages share this lovely record` : 'A little more time to settle into sea life'}</small></span><span class="stats-voyage-metric">${number(longest.nights)}<small>nights</small></span><span class="stats-voyage-arrow">${icon('arrow')}</span></button>` : ''}
        ${farthest && farthestCruise ? `<button class="stats-card stats-voyage-card stats-farthest-card" data-stats-cruise="${farthest.id}" aria-label="View ${escape(farthest.ship)}, ${farthestCruise.year}, your farthest illustrated route"><span class="stats-voyage-icon">${icon('globe')}</span><span class="stats-voyage-copy"><span class="stats-eyebrow">YOUR FARTHEST ILLUSTRATED ROUTE</span><strong>${escape(farthest.ship)}</strong><span>${routeCaption(farthestCruise)}</span><small>So much world, in one wonderful voyage</small></span><span class="stats-voyage-metric stats-farthest-metric">≈ ${number(Math.round(farthest.miles / 100) * 100)}<small>miles</small></span><span class="stats-voyage-arrow">${icon('arrow')}</span></button>` : ''}
        <div class="stats-memory-note">${sparkle()}<p>Some things are hard to count.<br><em>The memories are one of them.</em></p>${icon('ship')}</div>
      </section>
    </div>

    <details class="stats-methodology"><summary><span>${icon('info')} A little note on the numbers</span><span>How we counted ${icon('chevron')}</span></summary><div class="stats-methodology-body"><p><strong>Days & hours.</strong> ${escape(statsMethodology.duration)} A month is shown as 30.44 days. ${stats.unknownDurationCruises ? `${stats.unknownDurationCruises} voyage durations are unknown and excluded from these totals.` : 'All cruise durations in this logbook are included.'}</p><p><strong>Miles & world laps.</strong> ${escape(statsMethodology.distance)} ${escape(statsMethodology.earth)} Rounded distance figures are estimates, not GPS records or actual ship mileage.</p><p><strong>Ports & places.</strong> ${escape(statsMethodology.ports)} ${escape(statsMethodology.places)} The historical itineraries include both confirmed and reconstructed details; changed or missed ports may not be reflected.</p><p><strong>Your collection.</strong> ${escape(statsMethodology.years)} Statistics describe your full logbook, regardless of map filters. Each voyage’s notes and sources explain its historical confidence.</p></div></details>
    <footer class="stats-footer"><span>GOOD TIMES. GREAT TIDES.</span>${icon('ship')}<p>Here’s to whatever’s beyond the next horizon.</p></footer>
  </div>`;

  function distanceForUnit(miles) {
    return unit === 'km' ? miles * 1.609344 : unit === 'nm' ? miles * 1.609344 / 1.852 : miles;
  }

  function updateUnit() {
    const value = Math.round(distanceForUnit(stats.estimatedMiles) / 100) * 100;
    const node = container.querySelector('.stats-distance-value');
    node.dataset.statsCount = value;
    node.textContent = number(value);
    container.querySelector('.stats-distance-label').textContent = unit === 'km' ? 'kilometers' : unit === 'nm' ? 'nautical miles' : 'miles';
    const farthestNode = container.querySelector('.stats-farthest-metric');
    if (farthestNode && farthest) farthestNode.innerHTML = `≈ ${number(Math.round(distanceForUnit(farthest.miles) / 100) * 100)}<small>${unit === 'km' ? 'km' : unit === 'nm' ? 'nautical miles' : 'miles'}</small>`;
  }

  function handleClick(event) {
    const yearButton = event.target.closest('[data-stats-year]');
    const cruiseButton = event.target.closest('[data-stats-cruise]');
    if (yearButton) onSelectYear(Number(yearButton.dataset.statsYear));
    if (cruiseButton) onSelectCruise(Number(cruiseButton.dataset.statsCruise));
  }
  function handleUnit(event) { unit = event.target.value; updateUnit(); }
  container.addEventListener('click', handleClick);
  container.querySelector('#stats-distance-unit').addEventListener('change', handleUnit);

  function show() {
    container.hidden = false;
    if (hasAnimated) return;
    hasAnimated = true;
    if (reducedMotion.matches || document.body.classList.contains('still-seas')) return;
    const counters = [...container.querySelectorAll('[data-stats-count]')];
    const started = performance.now();
    const animate = now => {
      const stopped = reducedMotion.matches || document.body.classList.contains('still-seas') || container.hidden;
      const progress = stopped ? 1 : Math.min(1, (now - started) / 900);
      const ease = 1 - Math.pow(1 - progress, 3);
      for (const node of counters) node.textContent = number(Number(node.dataset.statsCount) * ease, Number(node.dataset.digits));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
  }
  function hide() { container.hidden = true; }
  function destroy() {
    cancelAnimationFrame(frame);
    container.removeEventListener('click', handleClick);
    container.querySelector('#stats-distance-unit')?.removeEventListener('change', handleUnit);
    container.replaceChildren();
  }
  return { show, hide, destroy };
}
