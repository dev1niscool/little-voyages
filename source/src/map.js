import * as d3 from 'd3';
import { feature } from 'topojson-client';
import './map.css';

const OCEANS = [
  { name: 'NORTH ATLANTIC OCEAN', point: [-36, 29] },
  { name: 'PACIFIC OCEAN', point: [-143, 20] },
  { name: 'INDIAN OCEAN', point: [76, -22] },
  { name: 'SOUTH ATLANTIC OCEAN', point: [-20, -24] },
];
const CONTINENTS = [
  { name: 'NORTH AMERICA', point: [-108, 48] }, { name: 'SOUTH AMERICA', point: [-61, -15] },
  { name: 'EUROPE', point: [26, 56] }, { name: 'AFRICA', point: [22, 6] },
  { name: 'ASIA', point: [92, 44] }, { name: 'AUSTRALIA', point: [134, -25] },
];
const MAX_ZOOM = 220;
const SAILING_DURATION = 12000;
const validPoint = point => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite);
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const pointKey = point => point.map(value => Number(value).toFixed(4)).join(',');
const formatDate = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Date to confirm';
const cruiseDate = cruise => `${formatDate(cruise.startDate || cruise.originalDate)}${cruise.nights ? ` · ${cruise.nights} nights` : ''}`;
const boatIcon = '<svg viewBox="0 0 48 38" aria-hidden="true"><path d="M21 8V2h7v8" fill="currentColor"/><path d="M13 11h22l5 12H7Z" fill="var(--paper,#fffdf7)" stroke="currentColor"/><path d="M3 22h42l-7 11H13Z" fill="currentColor"/><path d="M16 16h3m4 0h3m4 0h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 36q4 2 8 0t8 0t8 0t8 0" fill="none" stroke="currentColor" opacity=".45"/></svg>';

// Both the SVG route and its moving vessel use these same geographic segments.
export function routeFor(cruise) {
  const points = cruise.route?.length ? cruise.route : (cruise.ports || []).map(port => [Number(port.lon), Number(port.lat)]);
  return points.filter(validPoint);
}
export function departurePoint(cruise) {
  const first = cruise.ports?.[0];
  const point = first && [Number(first.lon), Number(first.lat)];
  return validPoint(point) ? point : routeFor(cruise)[0];
}
export function voyagePath(cruise) {
  const points = routeFor(cruise);
  const lengths = points.slice(1).map((point, index) => d3.geoDistance(points[index], point));
  const total = d3.sum(lengths);
  return {
    points, total,
    at(progress) {
      if (!points.length) return null;
      if (progress <= 0 || !total) return points[0];
      if (progress >= 1) return points.at(-1);
      let distance = progress * total;
      for (let index = 0; index < lengths.length; index += 1) {
        if (distance <= lengths[index]) return d3.geoInterpolate(points[index], points[index + 1])(lengths[index] ? distance / lengths[index] : 0);
        distance -= lengths[index];
      }
      return points.at(-1);
    },
  };
}

/** Geographic markers stay fixed to their coordinates; only the selected vessel sails. */
export function createCruiseMap(container, { onSelect = () => {}, onCancel = () => {}, onViewChange = () => {}, onInteract = () => {} } = {}) {
  const instanceId = `cruise-map-${Math.random().toString(36).slice(2, 8)}`;
  const root = d3.select(container).classed('atlas-map', true);
  const svg = root.append('svg').attr('class', 'atlas-map__svg').attr('role', 'group').attr('tabindex', -1)
    .attr('aria-label', 'Cruise map. Choose a departure harbor or a route to explore a voyage. Drag or pinch to explore.');
  const sea = svg.append('rect').attr('class', 'atlas-map__sea').attr('fill', '#dceff0');
  const geography = svg.append('g').attr('class', 'atlas-map__geography');
  const graticule = geography.append('path').attr('class', 'atlas-map__graticule').attr('aria-hidden', 'true').datum(d3.geoGraticule().step([30, 30])());
  const countries = geography.append('g').attr('class', 'atlas-map__countries').attr('aria-hidden', 'true');
  const routes = geography.append('g').attr('class', 'atlas-map__routes');
  const labels = svg.append('g').attr('class', 'atlas-map__labels').attr('aria-hidden', 'true');
  labels.selectAll('.atlas-map__ocean').data(OCEANS).join('text').attr('class', 'atlas-map__ocean').text(d => d.name);
  labels.selectAll('.atlas-map__continent').data(CONTINENTS).join('text').attr('class', 'atlas-map__continent').text(d => d.name);
  const portLayer = svg.append('g').attr('class', 'atlas-map__ports').attr('aria-hidden', 'true');
  const departures = svg.append('g').attr('class', 'atlas-map__departures');
  const vessel = svg.append('g').attr('class', 'atlas-map__vessel atlas-map__ship').attr('role', 'button').attr('tabindex', 0).attr('visibility', 'hidden');
  drawBoat(vessel);
  const tooltip = root.append('div').attr('class', 'atlas-map__tooltip').attr('role', 'tooltip').attr('id', `${instanceId}-tooltip`);
  tooltip.append('span').attr('class', 'atlas-map__tooltip-year');
  tooltip.append('strong');
  tooltip.append('span').attr('class', 'atlas-map__tooltip-region');
  const chooser = root.append('section').attr('class', 'atlas-map__chooser').attr('aria-label', 'Choose a voyage').attr('hidden', true);
  const chooserHeader = chooser.append('div').attr('class', 'atlas-map__chooser-heading');
  const chooserTitles = chooserHeader.append('div');
  chooserTitles.append('span').attr('class', 'atlas-map__chooser-kicker').text('MEET YOU AT THE DOCK');
  const chooserTitle = chooserTitles.append('h3');
  const closeChooserButton = chooserHeader.append('button').attr('class', 'atlas-map__close').attr('type', 'button').attr('aria-label', 'Close departure choices').text('×').on('click', () => closeChooser(true));
  const chooserDescription = chooser.append('p').attr('class', 'atlas-map__chooser-description');
  const chooserList = chooser.append('div').attr('class', 'atlas-map__chooser-list');
  const playbackControl = root.append('div').attr('class', 'atlas-map__playback').attr('hidden', true);
  const playbackCopy = playbackControl.append('div').attr('class', 'atlas-map__playback-copy');
  const playbackStatus = playbackCopy.append('span').attr('class', 'atlas-map__playback-status');
  playbackCopy.append('div').attr('class', 'atlas-map__progress').append('i');
  playbackControl.append('button').attr('type', 'button').attr('class', 'atlas-map__replay').attr('aria-label', 'Replay voyage route').html('<span aria-hidden="true">↻</span> Replay').on('click', replay);
  playbackControl.append('button').attr('type', 'button').attr('class', 'atlas-map__cancel').attr('aria-label', 'Cancel voyage animation').attr('title', 'Close voyage and return to the map').html('<span aria-hidden="true">×</span>').on('click', () => dismissVoyage(true));
  const compass = root.append('div').attr('class', 'atlas-map__compass').attr('aria-hidden', 'true');
  compass.html('<span>N</span><svg viewBox="0 0 40 48"><path d="M20 5 28 35 20 30 12 35Z" fill="#678c8a"/><path d="M20 5 20 30 12 35Z" fill="#f9fbf5"/><circle cx="20" cy="25" r="17" fill="none" stroke="#719593" stroke-width=".6"/></svg>');

  let width = 800, height = 600, initialized = false;
  let data = [], ports = [], selectedId = null, focusedId = null;
  let transform = d3.zoomIdentity;
  let destroyed = false, active = true;
  let motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shipSize = 1, resizeFrame = null, animationFrame = null;
  let playback = null, cameraMoving = false, gestureActive = false, cameraToken = 0, cameraTarget = null;
  let chooserState = null, chooserOrigin = null, departureSignature = '';
  const projection = d3.geoMercator().center([6, 24]);
  const geoPath = d3.geoPath(projection);
  const zoom = d3.zoom().scaleExtent([0.8, MAX_ZOOM]).clickDistance(5)
    .filter(event => (!event.ctrlKey || event.type === 'wheel') && !event.button)
    .on('start', event => {
      if (event.sourceEvent) {
        onInteract();
        gestureActive = true;
        cameraMoving = false;
        cameraToken += 1;
        if (playback) playback.pending = false;
        syncAnimation();
      }
    })
    .on('zoom', event => {
      transform = event.transform;
      geography.attr('transform', transform.toString());
      svg.attr('data-zoom', transform.k).attr('data-pan-x', transform.x).attr('data-pan-y', transform.y);
      updateOverlays();
      hideTooltip();
      onViewChange({ zoomed: Math.abs(transform.k - 1) > 0.05 || Math.abs(transform.x) > 8 || Math.abs(transform.y) > 8, k: transform.k });
    })
    .on('end', event => {
      if (event.sourceEvent) {
        gestureActive = false;
        syncAnimation();
      }
    });
  svg.call(zoom).on('dblclick.zoom', null);
  // Treat a deliberate background tap as dismissal, never the end of a drag or pinch.
  const pointers = new Map();
  let movedPointer = false;
  svg.on('pointerdown.dismiss', event => {
    if (!pointers.size) movedPointer = false;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size > 1) movedPointer = true;
  }).on('pointermove.dismiss', event => {
    const start = pointers.get(event.pointerId);
    if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5) movedPointer = true;
  }).on('click.dismiss', event => {
    if (event.defaultPrevented || movedPointer || event.target.closest('[role="button"]')) return;
    dismissVoyage();
  });
  const releasePointer = event => {
    pointers.delete(event.pointerId);
    if (event.type === 'pointercancel') movedPointer = true;
  };
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  root.classed('is-still', !motion);

  function color(cruise) { return cruise.color || '#358f97'; }
  function screen(point) { return transform.apply(projection(point)); }
  function selectedCruise() { return data.find(cruise => sameId(cruise.id, selectedId)); }
  function inside(point, margin = 35) { return point[0] > -margin && point[0] < width + margin && point[1] > -margin && point[1] < height + margin; }
  function protectedBoxes(selector = '.map-heading, .map-tools, .map-legend, .map-help, .route-disclaimer, .mobile-details, .atlas-map__playback, .atlas-map__chooser') {
    const bounds = container.getBoundingClientRect();
    return [...(container.parentElement?.querySelectorAll(selector) || [])]
      .filter(element => { const style = getComputedStyle(element); return style.display !== 'none' && style.visibility !== 'hidden'; })
      .map(element => { const rect = element.getBoundingClientRect(); return { left: rect.left - bounds.left - 7, right: rect.right - bounds.left + 7, top: rect.top - bounds.top - 7, bottom: rect.bottom - bounds.top + 7 }; });
  }
  function buildPorts() {
    const grouped = new Map();
    for (const cruise of data) {
      const point = departurePoint(cruise);
      if (!point) continue;
      const key = pointKey(point);
      if (!grouped.has(key)) grouped.set(key, { key, point, name: cruise.ports?.[0]?.name || 'Departure harbor', cruises: [] });
      grouped.get(key).cruises.push(cruise);
    }
    ports = [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  // Fixed geographic groups never invent or displace marker coordinates. Their icons sit
  // on a real member port; zooming reveals each of the constituent ports in place.
  function departureGroups() {
    const groups = new Map();
    const detail = transform.k * projection.scale() / 150;
    for (const port of ports) {
      const florida = ['Miami', 'Fort Lauderdale', 'Port Canaveral', 'Jacksonville'].includes(port.name);
      const southFlorida = ['Miami', 'Fort Lauderdale'].includes(port.name);
      const gulf = ['Galveston', 'New Orleans'].includes(port.name);
      const caribbean = florida || gulf || port.name === 'San Juan';
      const europe = port.point[0] > -5 && port.point[0] < 28 && port.point[1] > 35 && port.point[1] < 62;
      const westCoast = ['Seattle', 'Los Angeles (San Pedro)'].includes(port.name);
      const family = caribbean && detail < 1.7 ? 'caribbean' : westCoast && detail < 1.5 ? 'west-coast' : florida && detail < 5 ? 'florida' : gulf && detail < 4 ? 'gulf' : southFlorida && detail < 55 ? 'south-florida' : europe && detail < 1.5 ? 'all-europe' : europe && port.name !== 'Stockholm' && detail < 2.8 ? 'europe' : port.key;
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(port);
    }
    return [...groups].map(([key, members]) => {
      const names = ['Port Canaveral', 'Miami', 'Fort Lauderdale', 'Jacksonville', 'New Orleans', 'Galveston', 'San Juan', 'Civitavecchia (Rome)', 'Barcelona', 'Amsterdam', 'Athens (Piraeus)', 'Stockholm', 'Los Angeles (San Pedro)', 'Seattle'];
      const anchor = [...members].sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name))[0];
      return { key, point: anchor.point, anchor, ports: members, cruises: members.flatMap(port => port.cruises), name: members.length > 1 ? ({ caribbean: 'Caribbean & Gulf departures', 'west-coast': 'Pacific coast departures', florida: 'Florida departures', gulf: 'Gulf coast departures', 'south-florida': 'Miami & Fort Lauderdale', europe: 'European departures', 'all-europe': 'European departures' })[key] : anchor.name };
    });
  }
  function drawBoat(group) {
    group.append('circle').attr('class', 'atlas-map__selection-ring').attr('r', 25);
    group.append('ellipse').attr('class', 'atlas-map__wake').attr('cy', 12).attr('rx', 24).attr('ry', 5);
    const boat = group.append('g').attr('class', 'atlas-map__boat');
    boat.append('circle').attr('class', 'atlas-map__smoke smoke-one').attr('cx', 0).attr('cy', -17).attr('r', 2.5);
    boat.append('path').attr('class', 'atlas-map__funnel').attr('d', 'M-4-8-3-17H3L4-8Z');
    boat.append('path').attr('class', 'atlas-map__upper-deck').attr('d', 'M-14-2-10-9H10L13-2Z');
    boat.append('path').attr('class', 'atlas-map__deck').attr('d', 'M-19 2-16-5H14L19 2Z');
    boat.append('path').attr('class', 'atlas-map__hull').attr('d', 'M-23 1H22L16 12H-13Q-20 9-23 1Z');
    boat.append('path').attr('class', 'atlas-map__hull-highlight').attr('d', 'M-20 3H18');
    boat.append('path').attr('class', 'atlas-map__windows').attr('d', 'M-10-2H-7M-3-2H0M4-2H7M11-2H13');
    boat.selectAll('.atlas-map__porthole').data([-10, -2, 6, 13]).join('circle').attr('class', 'atlas-map__porthole').attr('cx', d => d).attr('cy', 6.5).attr('r', 1.3);
    group.append('circle').attr('class', 'atlas-map__hit-area').attr('r', 26);
  }
  function renderDepartures() {
    const groups = departureGroups();
    const signature = groups.map(group => `${group.key}:${group.cruises.map(cruise => cruise.id).join(',')}`).join('|') + `:${selectedId}`;
    if (signature !== departureSignature) {
      departureSignature = signature;
      const markers = departures.selectAll('.atlas-map__departure').data(groups, group => group.key).join(enter => {
        const group = enter.append('g').attr('class', 'atlas-map__departure atlas-map__ship').attr('role', 'button');
        drawBoat(group);
        group.append('circle').attr('class', 'atlas-map__harbor-dot').attr('r', 3);
        const badge = group.append('g').attr('class', 'atlas-map__count');
        badge.append('circle').attr('r', 10);
        badge.append('text').attr('text-anchor', 'middle').attr('dy', '.35em');
        group.append('text').attr('class', 'atlas-map__departure-label').attr('y', 33).attr('text-anchor', 'middle');
        group.append('title');
        return group;
      });
      markers.style('--ship-color', group => group.cruises.length === 1 ? color(group.cruises[0]) : '#398f9f')
        .classed('is-muted', group => selectedId !== null && !group.cruises.some(cruise => sameId(cruise.id, selectedId)))
        .classed('is-origin', group => group.cruises.some(cruise => sameId(cruise.id, selectedId)))
        .attr('data-port-key', group => group.anchor.key).attr('data-port-name', group => group.anchor.name)
        .attr('data-lon', group => group.point[0]).attr('data-lat', group => group.point[1])
        .attr('data-count', group => group.cruises.length).attr('data-port-count', group => group.ports.length)
        .attr('aria-label', group => `${group.name}, ${group.cruises.length} ${group.cruises.length === 1 ? 'voyage' : 'voyages'}. Choose a departure.`)
        .on('click', (event, group) => { event.stopPropagation(); openDeparture(group, event.currentTarget); })
        .on('keydown', (event, group) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDeparture(group, event.currentTarget); } })
        .on('mouseenter focus', (event, group) => showTooltip(group.point, group.ports.length > 1 ? `${group.ports.length} DEPARTURE PORTS` : `${group.cruises.length} ${group.cruises.length === 1 ? 'VOYAGE' : 'VOYAGES'}`, group.name, group.cruises.length === 1 ? `${group.cruises[0].ship} · ${cruiseDate(group.cruises[0])}` : 'Choose a ship from this harbor'))
        .on('mouseleave blur', hideTooltip);
      markers.select('.atlas-map__count').attr('visibility', group => group.cruises.length > 1 ? 'visible' : 'hidden');
      markers.select('.atlas-map__count text').text(group => group.cruises.length);
      markers.select('title').text(group => `${group.name} · ${group.cruises.length} voyages`);
    }
    departures.selectAll('.atlas-map__departure')
      .attr('transform', group => { const point = screen(group.point); return `translate(${point[0]},${point[1]})`; })
      .attr('visibility', group => inside(screen(group.point)) ? 'visible' : 'hidden')
      .attr('tabindex', group => inside(screen(group.point)) ? 0 : -1);
    departures.selectAll('.atlas-map__count').attr('transform', `translate(${18 * shipSize},${-14 * shipSize})`);
    departures.selectAll('.atlas-map__departure-label').text(group => selectedId !== null && !chooserState ? '' : ({ caribbean: 'Caribbean & Gulf', 'west-coast': 'Pacific coast', 'all-europe': 'Europe', europe: 'Europe', florida: 'Florida', gulf: 'Gulf coast', 'south-florida': 'South Florida' })[group.key] || (transform.k < 5 && group.anchor.name === 'Yokohama (Tokyo)' ? 'Japan' : group.name))
      .attr('y', group => group.key === 'west-coast' ? -27 * shipSize : 27 * shipSize + 7);
    departures.selectAll('.atlas-map__selection-ring').attr('r', 24 * shipSize);
    departures.selectAll('.atlas-map__hit-area').attr('r', Math.max(22, 26 * shipSize));
    departures.selectAll('.atlas-map__wake').attr('cy', 12 * shipSize).attr('rx', 24 * shipSize).attr('ry', 5 * shipSize);
  }
  function updateOverlays() {
    if (destroyed) return;
    labels.selectAll('text').attr('transform', datum => `translate(${screen(datum.point).join(',')})`);
    labels.attr('opacity', Math.max(0, Math.min(1, (3.8 - transform.k) / 2.8)));
    renderDepartures();
    updatePorts();
    updateVessel();
  }
  function updatePorts() {
    const unique = new Map();
    for (const port of selectedCruise()?.ports || []) {
      const point = [Number(port.lon), Number(port.lat)];
      if (validPoint(point) && !unique.has(pointKey(point))) unique.set(pointKey(point), { ...port, point });
    }
    const portData = [...unique.values()].map(port => ({ ...port, screen: screen(port.point) })).filter(port => inside(port.screen, 10));
    const markers = portLayer.selectAll('g').data(portData, port => pointKey(port.point)).join(enter => {
      const group = enter.append('g');
      group.append('path').attr('class', 'atlas-map__port-label-leader');
      group.append('circle').attr('class', 'atlas-map__port-halo').attr('r', 6);
      group.append('circle').attr('class', 'atlas-map__port-dot').attr('r', 2.4);
      group.append('text').attr('class', 'atlas-map__port-label');
      return group;
    }).attr('data-lon', port => port.point[0]).attr('data-lat', port => port.point[1])
      .attr('transform', port => `translate(${port.screen.join(',')})`);
    // Only labels avoid collisions. Geographic dots and vessels never move to make room.
    const boxes = protectedBoxes();
    const vesselPoint = playback?.path.at(playback.progress);
    if (vesselPoint && selectedCruise()) {
      const [x, y] = screen(vesselPoint), radius = 24 * shipSize + 3;
      boxes.push({ left: x - radius, right: x + radius, top: y - radius, bottom: y + radius });
    }
    markers.each(function (port, index) {
      const text = d3.select(this).select('text').text(port.name);
      const labelWidth = Math.min(240, text.node().getComputedTextLength() + 8);
      let placement = { x: 10, dy: -12, right: true, left: port.screen[0] + 10 }, bestScore = Infinity;
      for (const dy of index % 2 ? [18, -12, 34, -28, 50, -44] : [-12, 18, -28, 34, -44, 50]) {
        for (const right of [true, false]) {
          const x = right ? 10 : -10, left = right ? port.screen[0] + x : port.screen[0] + x - labelWidth;
          const top = port.screen[1] + dy - 10;
          if (left < 5 || left + labelWidth > width - 5 || top < 5 || top + 14 > height - 18) continue;
          const score = boxes.reduce((sum, box) => sum + Math.max(0, Math.min(left + labelWidth, box.right) - Math.max(left, box.left)) * Math.max(0, Math.min(top + 14, box.bottom) - Math.max(top, box.top)), 0);
          if (score < bestScore) { placement = { x, left, dy, right }; bestScore = score; }
          if (!score) break;
        }
        if (!bestScore) break;
      }
      const { x, left, dy, right } = placement;
      boxes.push({ left, right: left + labelWidth, top: port.screen[1] + dy - 10, bottom: port.screen[1] + dy + 4 });
      text.attr('x', x).attr('y', dy).attr('text-anchor', right ? 'start' : 'end');
      d3.select(this).select('.atlas-map__port-label-leader').attr('d', Math.abs(dy) > 20 ? `M0,0L${right ? 6 : -6},${dy - 4}H${x}` : null);
    });
  }
  function showTooltip(point, eyebrow, title, detail) {
    const position = screen(point);
    tooltip.select('.atlas-map__tooltip-year').text(eyebrow);
    tooltip.select('strong').text(title);
    tooltip.select('.atlas-map__tooltip-region').text(detail);
    tooltip.style('left', `${Math.max(118, Math.min(width - 118, position[0]))}px`)
      .style('top', `${position[1] > 115 ? position[1] - 31 : position[1] + 114}px`).classed('is-visible', true);
  }
  function hideTooltip() { tooltip.classed('is-visible', false); routes.selectAll('.atlas-map__route').classed('is-hovered', false); }
  function dismissVoyage(restoreFocus = false) {
    onInteract();
    closeChooser();
    hideTooltip();
    if (selectedId !== null) onCancel();
    if (restoreFocus) svg.node().focus({ preventScroll: true });
  }
  function chooseCruise(cruise) {
    closeChooser();
    hideTooltip();
    onSelect(cruise);
  }
  function openDeparture(group, origin) {
    onInteract();
    chooserOrigin = origin;
    chooserState = { type: 'ports', keys: group.ports.map(port => port.key) };
    renderChooser();
    if (group.ports.length === 1) focusPort(group.ports[0]);
    else fitPoints(group.ports.map(port => port.point), true, true, 55);
    closeChooserButton.node().focus({ preventScroll: true });
  }
  function openPort(port) {
    chooserState = { type: 'port', keys: [port.key] };
    renderChooser();
    focusPort(port);
    closeChooserButton.node().focus({ preventScroll: true });
  }
  function closeChooser(restoreFocus = false) {
    chooserState = null;
    chooser.attr('hidden', true);
    root.classed('is-choosing', false);
    syncAnimation();
    if (restoreFocus) {
      if (chooserOrigin?.isConnected) chooserOrigin.focus({ preventScroll: true });
      else departures.select('.atlas-map__departure[visibility="visible"]').node()?.focus({ preventScroll: true });
    }
  }
  function renderChooser() {
    if (!chooserState) return;
    const matchingPorts = ports.filter(port => chooserState.keys?.includes(port.key));
    const choices = chooserState.type === 'routes' ? data.filter(cruise => chooserState.ids.includes(String(cruise.id))) : matchingPorts.flatMap(port => port.cruises);
    if (!choices.length) { closeChooser(); return; }
    chooser.attr('hidden', null);
    root.classed('is-choosing', true);
    syncAnimation();
    chooserList.selectAll('*').remove();
    const choosePorts = chooserState.type === 'ports' && matchingPorts.length > 1;
    chooserTitle.text(choosePorts ? 'Pick your departure' : chooserState.type === 'routes' ? 'Shared waters' : matchingPorts[0]?.name || 'Your voyages');
    chooserDescription.text(choosePorts ? `${choices.length} voyages from ${matchingPorts.length} nearby harbors. Choose a port to meet its ships.` : chooserState.type === 'routes' ? 'These voyages share this stretch of sea. Which one shall we follow?' : `${choices.length} ${choices.length === 1 ? 'voyage starts' : 'voyages start'} here. Choose a ship and watch its journey.`);
    if (choosePorts) {
      const buttons = chooserList.selectAll('button').data(matchingPorts).join('button').attr('type', 'button').attr('class', 'atlas-map__dock-option')
        .attr('data-port-key', port => port.key).attr('data-port-name', port => port.name).on('click', (_, port) => openPort(port));
      buttons.append('span').attr('class', 'atlas-map__option-icon').html(boatIcon);
      const copy = buttons.append('span').attr('class', 'atlas-map__option-copy');
      copy.append('strong').text(port => port.name);
      copy.append('small').text(port => `${port.cruises.length} ${port.cruises.length === 1 ? 'voyage' : 'voyages'} · ${[...new Set(port.cruises.map(cruise => cruise.year))].join(', ')}`);
      buttons.append('span').attr('class', 'atlas-map__option-arrow').attr('aria-hidden', 'true').text('›');
    } else {
      const sorted = [...choices].sort((a, b) => (a.startDate || a.originalDate).localeCompare(b.startDate || b.originalDate));
      const buttons = chooserList.selectAll('button').data(sorted).join('button').attr('type', 'button').attr('class', 'atlas-map__voyage-option')
        .attr('data-cruise-id', cruise => cruise.id).style('--option-color', color)
        .attr('aria-label', cruise => `${cruise.ship}, ${cruiseDate(cruise)}. Explore voyage.`)
        .on('click', (_, cruise) => chooseCruise(cruise))
        .on('mouseenter focus', (_, cruise) => routes.selectAll('.atlas-map__route').classed('is-hovered', item => sameId(item.id, cruise.id)))
        .on('mouseleave blur', hideTooltip);
      buttons.append('span').attr('class', 'atlas-map__option-icon').html(boatIcon);
      const copy = buttons.append('span').attr('class', 'atlas-map__option-copy');
      copy.append('strong').text(cruise => cruise.ship);
      copy.append('small').text(cruiseDate);
      copy.append('span').text(cruise => cruise.line);
      buttons.append('span').attr('class', 'atlas-map__option-arrow').attr('aria-hidden', 'true').text('›');
    }
  }
  chooser.on('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); closeChooser(true); } });

  function routeDistanceToPointer(cruise, pointer) {
    const path = voyagePath(cruise);
    let best = Infinity;
    // Sampling in geographic space follows the same great-circle curves as geoPath.
    for (let i = 0; i < path.points.length - 1; i += 1) {
      const interpolate = d3.geoInterpolate(path.points[i], path.points[i + 1]);
      const start = screen(path.points[i]), end = screen(path.points[i + 1]);
      const steps = Math.min(200, Math.max(2, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 20)));
      let a = start;
      for (let step = 1; step <= steps; step += 1) {
        const b = screen(interpolate(step / steps)), dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((pointer[0] - a[0]) * dx + (pointer[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(pointer[0] - a[0] - t * dx, pointer[1] - a[1] - t * dy));
        a = b;
      }
    }
    return best;
  }
  function routeClick(event, cruise) {
    event.stopPropagation();
    onInteract();
    if (!event.detail) { chooseCruise(cruise); return; }
    const pointer = d3.pointer(event, svg.node());
    const nearby = data.filter(candidate => routeDistanceToPointer(candidate, pointer) < 6);
    if (nearby.length > 1) {
      chooserOrigin = event.currentTarget;
      chooserState = { type: 'routes', ids: nearby.map(item => String(item.id)) };
      renderChooser();
      closeChooserButton.node().focus({ preventScroll: true });
    } else chooseCruise(cruise);
  }
  function renderRoutes() {
    const routable = data.filter(cruise => routeFor(cruise).length > 1);
    const groups = routes.selectAll('.atlas-map__route-group').data(routable, cruise => cruise.id).join(enter => {
      const group = enter.append('g').attr('class', 'atlas-map__route-group');
      group.append('path').attr('class', 'atlas-map__route').attr('aria-hidden', 'true');
      group.append('path').attr('class', 'atlas-map__route-hit').attr('role', 'button').attr('tabindex', 0);
      return group;
    }).sort((a, b) => Number(sameId(a.id, selectedId)) - Number(sameId(b.id, selectedId)));
    groups.selectAll('path').attr('d', cruise => geoPath({ type: 'LineString', coordinates: routeFor(cruise) })).attr('data-cruise-id', cruise => cruise.id);
    groups.select('.atlas-map__route').attr('stroke', color).classed('is-selected', cruise => sameId(cruise.id, selectedId)).classed('is-muted', cruise => selectedId !== null && !sameId(cruise.id, selectedId));
    groups.select('.atlas-map__route-hit').attr('aria-label', cruise => `${cruise.ship}, ${cruiseDate(cruise)}. Explore this route.`)
      .on('click', routeClick)
      .on('keydown', (event, cruise) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseCruise(cruise); } })
      .on('mouseenter focus', (event, cruise) => { routes.selectAll('.atlas-map__route').classed('is-hovered', item => sameId(item.id, cruise.id)); if (event.type === 'focus') showTooltip(departurePoint(cruise), cruiseDate(cruise), cruise.ship, 'Explore this route'); })
      .on('mouseleave blur', hideTooltip);
  }

  function preparePlayback(cruise) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    playback = cruise ? { id: cruise.id, path: voyagePath(cruise), progress: 0, lastTime: null, pending: true } : null;
    playbackControl.attr('hidden', cruise ? null : true);
    updateVessel();
    updatePlaybackStatus();
  }
  function updateVessel() {
    const cruise = selectedCruise();
    const point = playback?.path.at(playback.progress);
    if (!cruise || !point || !sameId(playback.id, cruise.id)) { vessel.attr('visibility', 'hidden').attr('tabindex', -1); return; }
    const position = screen(point);
    vessel.datum(cruise).attr('data-cruise-id', cruise.id).attr('data-lon', point[0]).attr('data-lat', point[1]).attr('data-progress', playback.progress)
      .attr('transform', `translate(${position.join(',')})`).attr('visibility', inside(position) ? 'visible' : 'hidden').attr('tabindex', inside(position) ? 0 : -1)
      .style('--ship-color', color(cruise)).classed('is-selected', true)
      .attr('aria-label', `${cruise.ship}, ${cruiseDate(cruise)}. Replay voyage route.`);
    vessel.select('.atlas-map__selection-ring').attr('r', 24 * shipSize);
    vessel.select('.atlas-map__hit-area').attr('r', Math.max(22, 26 * shipSize));
    vessel.select('.atlas-map__wake').attr('cy', 12 * shipSize).attr('rx', 24 * shipSize).attr('ry', 5 * shipSize);
  }
  vessel.on('click', event => { event.stopPropagation(); replay(); })
    .on('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); replay(); } })
    .on('mouseenter focus', () => { const cruise = selectedCruise(); if (cruise && playback) showTooltip(playback.path.at(playback.progress), cruiseDate(cruise), cruise.ship, 'Tap to replay this voyage'); })
    .on('mouseleave blur', hideTooltip);
  function updatePlaybackStatus() {
    if (!playback) return;
    playbackControl.attr('data-progress', playback.progress);
    playbackControl.select('.atlas-map__progress i').style('transform', `scaleX(${playback.progress})`);
    playbackStatus.text(!motion ? 'At departure · motion off' : playback.progress >= 1 ? 'Voyage complete. What a trip!' : cameraMoving || playback.pending ? 'Getting ready to set sail…' : gestureActive ? 'Paused while you explore' : !active || document.hidden ? 'Voyage paused' : `Sailing the route · ${Math.round(playback.progress * 100)}%`);
    playbackControl.select('.atlas-map__replay').attr('disabled', !motion ? true : null).attr('title', !motion ? 'Turn on Motion to animate this voyage' : 'Sail this route again');
  }
  function canSail() { return playback && playback.progress < 1 && !playback.pending && motion && active && !document.hidden && !gestureActive && !cameraMoving && !chooserState && !destroyed; }
  function animate(time) {
    animationFrame = null;
    if (!canSail()) { if (playback) playback.lastTime = null; return; }
    if (playback.lastTime != null) playback.progress = Math.min(1, playback.progress + Math.max(0, time - playback.lastTime) / SAILING_DURATION);
    playback.lastTime = time;
    updateVessel();
    updatePlaybackStatus();
    if (playback.progress < 1) animationFrame = requestAnimationFrame(animate);
  }
  function syncAnimation() {
    if (!canSail()) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      if (playback) playback.lastTime = null;
    } else if (animationFrame === null) animationFrame = requestAnimationFrame(animate);
    updatePlaybackStatus();
  }
  function replay() {
    onInteract();
    const cruise = selectedCruise();
    if (!cruise || !motion) return;
    preparePlayback(cruise);
    focus(cruise);
  }

  function transitionTo(target, animated = true, after = () => {}) {
    hideTooltip();
    const token = ++cameraToken;
    cameraTarget = target;
    svg.interrupt();
    cameraMoving = motion && animated && active;
    syncAnimation();
    const complete = () => {
      if (token !== cameraToken || destroyed) return;
      cameraMoving = false;
      after();
      syncAnimation();
    };
    if (cameraMoving) svg.transition().duration(850).ease(d3.easeCubicInOut).call(zoom.transform, target).on('end.atlas interrupt.atlas', complete);
    else { svg.call(zoom.transform, target); complete(); }
  }
  function fitPoints(points, animated = true, dock = false, maxScale = 35, after) {
    const projected = points.map(projection).filter(validPoint);
    if (!projected.length) return;
    const bounds = d3.extent(projected, point => point[0]), vertical = d3.extent(projected, point => point[1]);
    const heading = protectedBoxes('.map-heading')[0];
    const padTop = Math.min(height * .43, Math.max(72, (heading?.bottom || 0) + 26));
    const playbackBox = protectedBoxes('.atlas-map__playback')[0];
    const padBottom = Math.max(width < 600 ? 122 : 82, playbackBox ? height - playbackBox.top + 12 : 0);
    const padX = width < 600 ? 43 : 80;
    const rightSpace = dock && width >= 700 ? 330 : width < 600 ? 76 : padX;
    const bottomSpace = dock && width < 700 ? Math.min(height * .47, 220) : padBottom;
    const availableWidth = Math.max(100, width - padX - rightSpace), availableHeight = Math.max(70, height - padTop - bottomSpace);
    const scale = Math.max(1.3, Math.min(maxScale, availableWidth / Math.max(.05, bounds[1] - bounds[0]), availableHeight / Math.max(.05, vertical[1] - vertical[0])));
    const x = padX + availableWidth / 2 - scale * (bounds[0] + bounds[1]) / 2;
    const y = padTop + availableHeight / 2 - scale * (vertical[0] + vertical[1]) / 2;
    transitionTo(d3.zoomIdentity.translate(x, y).scale(scale), animated, after);
  }
  function focusPort(port) {
    focusedId = null;
    const point = projection(port.point), scale = width < 600 ? 200 : 155;
    const x = (width >= 700 ? (width - 310) / 2 : width / 2) - point[0] * scale;
    const y = (width < 700 ? height * .25 : height * .53) - point[1] * scale;
    transitionTo(d3.zoomIdentity.translate(x, y).scale(scale));
  }
  function focus(cruise, animated = true) {
    if (!cruise || destroyed) return;
    focusedId = cruise.id;
    closeChooser();
    // A re-render or returning from Statistics may refit the camera, never restart time.
    fitPoints(routeFor(cruise), animated, false, 45, () => {
      if (playback && sameId(playback.id, cruise.id)) playback.pending = false;
    });
  }
  function resize() {
    if (destroyed) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || initialized && Math.abs(rect.width - width) < .5 && Math.abs(rect.height - height) < .5) return;
    const center = initialized ? projection.invert(transform.invert([width / 2, height / 2])) : null;
    const pixelsPerRadian = projection.scale() * transform.k;
    width = rect.width; height = rect.height;
    shipSize = width < 600 ? .78 : width < 800 ? .88 : 1;
    root.style('--ship-size', shipSize);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    sea.attr('width', width).attr('height', height);
    projection.scale(Math.min(width / (Math.PI * 2) * (width < 600 ? .84 : .94), height / 4.25)).translate([width * .52, height * (width < 600 ? .65 : .51)]);
    graticule.attr('d', geoPath);
    countries.selectAll('path').attr('d', geoPath);
    renderRoutes();
    if (initialized && center) {
      // Browser chrome and responsive layout changes preserve the geographic camera.
      cameraToken += 1;
      svg.interrupt();
      cameraMoving = false;
      const scale = Math.max(.8, Math.min(MAX_ZOOM, pixelsPerRadian / projection.scale()));
      const point = projection(center);
      svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - point[0] * scale, height / 2 - point[1] * scale).scale(scale));
      if (playback) playback.pending = false;
      syncAnimation();
    } else svg.call(zoom.transform, d3.zoomIdentity);
    initialized = true;
  }
  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  resizeObserver.observe(container);
  const controller = new AbortController();
  fetch(`${import.meta.env.BASE_URL}data/world.json`, { signal: controller.signal })
    .then(response => { if (!response.ok) throw new Error(`Map geometry: ${response.status}`); return response.json(); })
    .then(world => { if (!destroyed) countries.selectAll('path').data(world.type === 'Topology' ? feature(world, world.objects.countries).features : world.features).join('path').attr('d', geoPath); })
    .catch(error => {
      if (error.name !== 'AbortError') {
        console.warn('Cruise atlas background could not be loaded.', error);
        root.append('div').attr('class', 'atlas-map__load-message').text('The world map could not load. Your voyage routes are still available.');
      }
    });
  const visibilityChange = () => syncAnimation();
  document.addEventListener('visibilitychange', visibilityChange);
  resize();

  return {
    update(cruises, selection = null) {
      data = Array.isArray(cruises) ? cruises : [];
      const selectionChanged = !sameId(selection, selectedId) && !(selection == null && selectedId == null);
      selectedId = data.some(cruise => sameId(cruise.id, selection)) ? selection : null;
      buildPorts();
      if (selectionChanged || !selectedId && playback) preparePlayback(selectedCruise());
      renderRoutes();
      departureSignature = '';
      updateOverlays();
      if (chooserState) renderChooser();
      syncAnimation();
    },
    focus,
    reset() { onInteract(); focusedId = null; closeChooser(); transitionTo(d3.zoomIdentity, true, () => { if (playback) playback.pending = false; }); },
    zoomIn() { onInteract(); focusedId = null; const scale = Math.min(MAX_ZOOM, transform.k * 1.55); transitionTo(d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(...transform.invert([width / 2, height / 2]).map(value => -value))); },
    zoomOut() { onInteract(); focusedId = null; const scale = Math.max(.8, transform.k / 1.55); transitionTo(d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(...transform.invert([width / 2, height / 2]).map(value => -value))); },
    setMotion(value) {
      motion = Boolean(value);
      root.classed('is-still', !motion);
      if (!motion) {
        cameraToken += 1;
        svg.interrupt();
        cameraMoving = false;
        if (playback) { playback.progress = 0; playback.pending = false; playback.lastTime = null; }
        updateVessel();
      }
      syncAnimation();
    },
    setActive(value) {
      active = Boolean(value);
      hideTooltip();
      if (!active && cameraMoving) {
        // Finish the camera while covered/hidden, so returning never resumes a stale pan.
        svg.interrupt();
        cameraMoving = false;
        if (cameraTarget) svg.call(zoom.transform, cameraTarget);
      }
      syncAnimation();
    },
    destroy() {
      destroyed = true;
      controller.abort(); resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame); cancelAnimationFrame(animationFrame);
      document.removeEventListener('visibilitychange', visibilityChange);
      window.removeEventListener('pointerup', releasePointer);
      window.removeEventListener('pointercancel', releasePointer);
      svg.interrupt().on('.zoom', null).on('.dismiss', null);
      svg.remove(); tooltip.remove(); compass.remove(); chooser.remove(); playbackControl.remove();
    },
  };
}
