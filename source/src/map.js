import * as d3 from 'd3';
import './map.css';

const SEA = '#dceff0';
const COLORS = ['#247c82', '#df876a', '#7f82b3', '#c49953', '#4d9291', '#bd798d'];
const OCEANS = [
  { name: 'NORTH ATLANTIC OCEAN', point: [-36, 29] },
  { name: 'PACIFIC OCEAN', point: [-143, 20] },
  { name: 'INDIAN OCEAN', point: [76, -22] },
  { name: 'SOUTH ATLANTIC OCEAN', point: [-20, -24] },
];
const CONTINENTS = [
  { name: 'NORTH AMERICA', point: [-108, 48] },
  { name: 'SOUTH AMERICA', point: [-61, -15] },
  { name: 'EUROPE', point: [26, 56] },
  { name: 'AFRICA', point: [22, 6] },
  { name: 'ASIA', point: [92, 44] },
  { name: 'AUSTRALIA', point: [134, -25] },
];

function validPoint(point) {
  return Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]));
}

function routeFor(cruise) {
  const points = cruise.route?.length ? cruise.route : (cruise.ports || []).map(port => [Number(port.lon), Number(port.lat)]);
  return points.filter(validPoint).map(point => [Number(point[0]), Number(point[1])]);
}

function regionAnchor(cruise) {
  if (validPoint(cruise.anchor)) return cruise.anchor;
  const region = String(cruise.region || '').toLowerCase();
  if (/japan|korea|asia/.test(region)) return [135, 33];
  if (/alaska/.test(region)) return [-135, 57];
  if (/mediterranean/.test(region)) return [17, 37];
  if (/british/.test(region)) return [-6, 55];
  if (/scandinavia|russia|baltic/.test(region)) return [15, 58];
  if (/mexic|cabo/.test(region)) return [-110, 23];
  if (/southern/.test(region)) return [-65, 16];
  return [-77, 24];
}

function midpoint(points) {
  if (points.length === 1) return points[0];
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let walked = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    if (walked + lengths[i] >= half) {
      const ratio = lengths[i] ? (half - walked) / lengths[i] : 0;
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * ratio, points[i][1] + (points[i + 1][1] - points[i][1]) * ratio];
    }
    walked += lengths[i];
  }
  return points[0];
}

/** A self-contained, tile-free atlas. update is controlled; onSelect receives a cruise. */
export function createCruiseMap(container, { onSelect = () => {}, onViewChange = () => {} } = {}) {
  const instanceId = `cruise-map-${Math.random().toString(36).slice(2, 8)}`;
  const root = d3.select(container).classed('atlas-map', true);
  const svg = root.append('svg').attr('class', 'atlas-map__svg').attr('role', 'group')
    .attr('aria-label', 'Interactive cruise map. Use the ship buttons to select a voyage, or drag and zoom the map.');
  const defs = svg.append('defs');
  const shadow = defs.append('filter').attr('id', `${instanceId}-shadow`).attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '240%');
  shadow.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 2.5).attr('flood-color', '#35696d').attr('flood-opacity', 0.15);
  const sea = svg.append('rect').attr('class', 'atlas-map__sea').attr('fill', SEA);
  const geography = svg.append('g').attr('class', 'atlas-map__geography').attr('aria-hidden', 'true');
  const graticule = geography.append('path').attr('class', 'atlas-map__graticule').datum(d3.geoGraticule().step([30, 30])());
  const countries = geography.append('g').attr('class', 'atlas-map__countries');
  const labels = svg.append('g').attr('class', 'atlas-map__labels').attr('aria-hidden', 'true');
  labels.selectAll('.atlas-map__ocean').data(OCEANS).join('text').attr('class', 'atlas-map__ocean').text(d => d.name);
  labels.selectAll('.atlas-map__continent').data(CONTINENTS).join('text').attr('class', 'atlas-map__continent').text(d => d.name);
  const routes = geography.append('g').attr('class', 'atlas-map__routes');
  const portLayer = svg.append('g').attr('class', 'atlas-map__ports').attr('aria-hidden', 'true');
  const leaders = svg.append('g').attr('class', 'atlas-map__leaders').attr('aria-hidden', 'true');
  const ships = svg.append('g').attr('class', 'atlas-map__ships');
  portLayer.raise();
  const tooltip = root.append('div').attr('class', 'atlas-map__tooltip').attr('role', 'tooltip').attr('id', `${instanceId}-tooltip`);
  tooltip.append('span').attr('class', 'atlas-map__tooltip-year');
  tooltip.append('strong');
  tooltip.append('span').attr('class', 'atlas-map__tooltip-region');
  const compass = root.append('div').attr('class', 'atlas-map__compass').attr('aria-hidden', 'true');
  compass.html('<span>N</span><svg viewBox="0 0 40 48"><path d="M20 5 28 35 20 30 12 35Z" fill="#678c8a"/><path d="M20 5 20 30 12 35Z" fill="#f9fbf5"/><circle cx="20" cy="25" r="17" fill="none" stroke="#719593" stroke-width=".6"/><path d="M2 25H7M33 25H38M20 43V39" stroke="#719593" stroke-width=".6"/></svg>');

  let width = 800;
  let height = 600;
  let data = [];
  let selectedId = null;
  let geometry = [];
  let transform = d3.zoomIdentity;
  let destroyed = false;
  let focusedCruise = null;
  let motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let markerPositions = new Map();
  let shipSize = 1;
  let hoveredId = null;
  let resizeFrame = null;
  const projection = d3.geoMercator().center([6, 24]);
  const geoPath = d3.geoPath(projection);
  const zoom = d3.zoom().scaleExtent([0.8, 28]).clickDistance(5)
    .filter(event => !event.target.closest?.('.atlas-map__ship') && (!event.ctrlKey || event.type === 'wheel') && !event.button)
    .on('zoom', event => {
      transform = event.transform;
      geography.attr('transform', transform.toString());
      updateOverlays();
      tooltip.classed('is-visible', false);
      onViewChange({ zoomed: Math.abs(transform.k - 1) > 0.05 || Math.abs(transform.x) > 8 || Math.abs(transform.y) > 8, k: transform.k });
    });
  svg.call(zoom).on('dblclick.zoom', null);
  root.classed('is-still', !motion);

  function color(cruise) {
    return cruise.color || COLORS[(Math.abs(Number(cruise.id)) || data.indexOf(cruise)) % COLORS.length] || COLORS[0];
  }

  function projectedRoute(cruise) {
    return routeFor(cruise).map(point => projection(point));
  }

  function shipAnchor(cruise) {
    const points = projectedRoute(cruise);
    return transform.apply(points.length ? midpoint(points) : projection(regionAnchor(cruise)));
  }

  function protectedBoxes() {
    const bounds = container.getBoundingClientRect();
    return [...(container.parentElement?.querySelectorAll('.map-heading, .map-tools, .map-legend, .map-help, .route-disclaimer, .mobile-details') || [])]
      .filter(element => getComputedStyle(element).display !== 'none')
      .map(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left - bounds.left - 7, right: rect.right - bounds.left + 7, top: rect.top - bounds.top - 7, bottom: rect.bottom - bounds.top + 7 };
      });
  }

  function layoutShips() {
    const positioned = [];
    const reserved = protectedBoxes();
    const visible = data.map(cruise => ({ cruise, anchor: shipAnchor(cruise) }))
      .filter(({ anchor }) => anchor[0] > -55 && anchor[0] < width + 55 && anchor[1] > -55 && anchor[1] < height + 55)
      .sort((a, b) => Number(String(b.cruise.id) === String(selectedId)) - Number(String(a.cruise.id) === String(selectedId)) || String(a.cruise.id).localeCompare(String(b.cruise.id), undefined, { numeric: true }));
    markerPositions = new Map();
    for (const item of visible) {
      const anchor = item.anchor;
      let best = [Math.max(24, Math.min(width - 24, anchor[0])), Math.max(30, Math.min(height - 28, anchor[1]))];
      let found = false;
      for (let ring = 0; ring < 16 && !found; ring += 1) {
        const count = ring === 0 ? 1 : ring * 8;
        for (let step = 0; step < count; step += 1) {
          const angle = (step / count) * Math.PI * 2 - Math.PI / 2;
          const candidate = ring === 0 ? best : [anchor[0] + Math.cos(angle) * ring * 38 * shipSize, anchor[1] + Math.sin(angle) * ring * 34 * shipSize];
          if (candidate[0] < 24 || candidate[0] > width - 24 || candidate[1] < 30 || candidate[1] > height - (width < 600 ? 62 : 54)) continue;
          if (reserved.some(box => candidate[0] + 25 * shipSize > box.left && candidate[0] - 25 * shipSize < box.right && candidate[1] + 19 * shipSize > box.top && candidate[1] - 19 * shipSize < box.bottom)) continue;
          if (positioned.every(other => Math.hypot((candidate[0] - other.point[0]) * 0.88, candidate[1] - other.point[1]) >= 33 * shipSize)) {
            best = candidate;
            found = true;
            break;
          }
        }
      }
      const placed = { ...item, point: best };
      positioned.push(placed);
      markerPositions.set(String(item.cruise.id), placed);
    }
    return positioned;
  }

  function updateOverlays() {
    if (destroyed) return;
    ships.selectAll('.atlas-map__selection-ring').attr('r', 24 * shipSize);
    ships.selectAll('.atlas-map__hit-area').attr('r', 25 * shipSize);
    ships.selectAll('.atlas-map__wake').attr('cy', 12 * shipSize).attr('rx', 24 * shipSize).attr('ry', 5 * shipSize);
    labels.selectAll('text').attr('transform', d => {
      const [x, y] = transform.apply(projection(d.point));
      return `translate(${x},${y})`;
    });
    labels.attr('opacity', Math.max(0, Math.min(1, (3.8 - transform.k) / 2.8)));
    const positions = layoutShips();
    ships.selectAll('.atlas-map__ship').attr('transform', d => {
      const position = markerPositions.get(String(d.id));
      return position ? `translate(${position.point[0]},${position.point[1]})` : 'translate(-100,-100)';
    }).attr('visibility', d => markerPositions.has(String(d.id)) ? 'visible' : 'hidden')
      .attr('tabindex', d => markerPositions.has(String(d.id)) ? 0 : -1);
    leaders.selectAll('path').data(positions.filter(d => Math.hypot(d.point[0] - d.anchor[0], d.point[1] - d.anchor[1]) > 20), d => d.cruise.id)
      .join('path').attr('d', d => `M${d.anchor[0]},${d.anchor[1]} Q${d.anchor[0]},${d.point[1]} ${d.point[0]},${d.point[1]}`)
      .attr('stroke', d => color(d.cruise)).classed('is-selected', d => String(d.cruise.id) === String(selectedId));
    updatePorts();
  }

  function updatePorts() {
    const selected = data.find(cruise => String(cruise.id) === String(selectedId));
    const unique = new Map();
    for (const port of selected?.ports || []) {
      if (Number.isFinite(Number(port.lat)) && Number.isFinite(Number(port.lon))) {
        const key = `${Number(port.lon).toFixed(2)},${Number(port.lat).toFixed(2)}`;
        if (!unique.has(key)) unique.set(key, port);
      }
    }
    const portData = [...unique.values()].map(port => ({ ...port, point: transform.apply(projection([Number(port.lon), Number(port.lat)])) }))
      .filter(port => port.point[0] > -10 && port.point[0] < width + 10 && port.point[1] > -10 && port.point[1] < height + 10);
    const portGroups = portLayer.selectAll('g').data(portData, d => `${d.lon},${d.lat}`).join(enter => {
      const group = enter.append('g');
      group.append('path').attr('class', 'atlas-map__port-label-leader');
      group.append('circle').attr('class', 'atlas-map__port-halo').attr('r', 6);
      group.append('circle').attr('class', 'atlas-map__port-dot').attr('r', 2.4);
      group.append('text').attr('class', 'atlas-map__port-label');
      return group;
    }).attr('transform', d => `translate(${d.point[0]},${d.point[1]})`);
    // Keep nearby island names readable without changing the geographic dot.
    const selectedShip = markerPositions.get(String(selectedId));
    const boxes = [...protectedBoxes(), ...portData.map(({ point }) => ({ left: point[0] - 6, right: point[0] + 6, top: point[1] - 6, bottom: point[1] + 6 }))];
    if (selectedShip) {
      const point = selectedShip.point;
      boxes.push({ left: point[0] - 28 * shipSize, right: point[0] + 28 * shipSize, top: point[1] - 28 * shipSize, bottom: point[1] + 28 * shipSize });
    }
    portGroups.each(function (port, index) {
      const text = d3.select(this).select('text').text(port.name);
      const labelWidth = Math.min(240, text.node().getComputedTextLength() + 8);
      const preferRight = port.point[0] + labelWidth + 12 < width;
      let placement = null;
      let bestScore = Infinity;
      for (const dy of index % 2 ? [18, -12, 34, -28, 50, -44, 66, -60] : [-12, 18, -28, 34, -44, 50, -60, 66]) {
        for (const right of [preferRight, !preferRight]) {
          const x = right ? 10 : -10;
          const left = right ? port.point[0] + x : port.point[0] + x - labelWidth;
          const top = port.point[1] + dy - 10;
          if (left < 5 || left + labelWidth > width - 5 || top < 5 || top + 14 > height - 18) continue;
          const score = boxes.reduce((sum, box) => sum + Math.max(0, Math.min(left + labelWidth, box.right) - Math.max(left, box.left)) * Math.max(0, Math.min(top + 14, box.bottom) - Math.max(top, box.top)), 0);
          if (score < bestScore) { placement = { x, left, dy, right }; bestScore = score; }
          if (!score) break;
        }
        if (!bestScore) break;
      }
      const { x, left, dy, right } = placement || { x: 10, left: port.point[0] + 10, dy: -12, right: true };
      boxes.push({ left, right: left + labelWidth, top: port.point[1] + dy - 10, bottom: port.point[1] + dy + 4 });
      text.attr('x', x).attr('y', dy).attr('text-anchor', right ? 'start' : 'end');
      d3.select(this).select('.atlas-map__port-label-leader').attr('d', Math.abs(dy) > 20 ? `M0,0L${right ? 6 : -6},${dy - 4}H${x}` : null);
    });
  }

  function showTooltip(event, cruise) {
    hoveredId = cruise.id;
    routes.selectAll('.atlas-map__route').classed('is-hovered', d => d.id === hoveredId);
    const placed = markerPositions.get(String(cruise.id));
    if (!placed) return;
    tooltip.select('.atlas-map__tooltip-year').text(cruise.year || 'Voyage');
    tooltip.select('strong').text(cruise.ship);
    tooltip.select('.atlas-map__tooltip-region').text(cruise.region || cruise.line || 'View this voyage');
    tooltip.style('left', `${Math.max(116, Math.min(width - 116, placed.point[0]))}px`)
      .style('top', `${placed.point[1] > 105 ? placed.point[1] - 34 : placed.point[1] + 92}px`).classed('is-visible', true);
  }

  function hideTooltip() {
    hoveredId = null;
    tooltip.classed('is-visible', false);
    routes.selectAll('.atlas-map__route').classed('is-hovered', false);
  }

  function renderShips() {
    const groups = ships.selectAll('.atlas-map__ship').data(data, d => d.id).join(enter => {
      const group = enter.append('g').attr('class', 'atlas-map__ship').attr('role', 'button').attr('tabindex', 0)
        .attr('aria-describedby', `${instanceId}-tooltip`);
      group.append('title');
      group.append('circle').attr('class', 'atlas-map__selection-ring').attr('r', 24);
      group.append('ellipse').attr('class', 'atlas-map__wake').attr('cy', 12).attr('rx', 24).attr('ry', 5);
      const boat = group.append('g').attr('class', 'atlas-map__boat').attr('filter', `url(#${instanceId}-shadow)`);
      boat.append('circle').attr('class', 'atlas-map__smoke smoke-one').attr('cx', 0).attr('cy', -17).attr('r', 2.5);
      boat.append('circle').attr('class', 'atlas-map__smoke smoke-two').attr('cx', 4).attr('cy', -21).attr('r', 2);
      boat.append('path').attr('class', 'atlas-map__funnel').attr('d', 'M-4-8-3-17H3L4-8Z');
      boat.append('path').attr('class', 'atlas-map__upper-deck').attr('d', 'M-14-2-10-9H10L13-2Z');
      boat.append('path').attr('class', 'atlas-map__deck').attr('d', 'M-19 2-16-5H14L19 2Z');
      boat.append('path').attr('class', 'atlas-map__hull').attr('d', 'M-23 1H22L16 12H-13Q-20 9-23 1Z');
      boat.append('path').attr('class', 'atlas-map__hull-highlight').attr('d', 'M-20 3H18');
      boat.append('path').attr('class', 'atlas-map__windows').attr('d', 'M-10-2H-7M-3-2H0M4-2H7M11-2H13');
      boat.selectAll('.atlas-map__porthole').data([-10, -2, 6, 13]).join('circle').attr('class', 'atlas-map__porthole').attr('cx', d => d).attr('cy', 6.5).attr('r', 1.3);
      group.append('circle').attr('class', 'atlas-map__hit-area').attr('r', 25);
      return group;
    });
    groups.style('--ship-color', color).style('--bob-delay', (_, i) => `${-(i % 9) * 0.53}s`)
      .classed('is-selected', d => String(d.id) === String(selectedId))
      .classed('is-muted', d => selectedId !== null && String(d.id) !== String(selectedId))
      .attr('aria-label', d => `${d.ship}, ${d.year}, ${d.region || 'cruise'}. View voyage.`)
      .attr('aria-pressed', d => String(d.id) === String(selectedId) ? 'true' : 'false')
      .on('click', (event, cruise) => { event.stopPropagation(); hideTooltip(); onSelect(cruise); })
      .on('keydown', (event, cruise) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hideTooltip(); onSelect(cruise); }
      })
      .on('mouseenter focus', showTooltip).on('mouseleave blur', hideTooltip);
    groups.select('title').text(d => `${d.ship} · ${d.year} · ${d.region || ''}`);
    groups.sort((a, b) => Number(String(a.id) === String(selectedId)) - Number(String(b.id) === String(selectedId)));
  }

  function renderRoutes() {
    const routable = data.filter(cruise => routeFor(cruise).length > 1);
    routes.selectAll('path').data(routable, d => d.id).join('path').attr('class', 'atlas-map__route')
      .attr('d', cruise => geoPath({ type: 'LineString', coordinates: routeFor(cruise) }))
      .attr('stroke', color).classed('is-selected', d => String(d.id) === String(selectedId))
      .classed('is-muted', d => selectedId !== null && String(d.id) !== String(selectedId))
      .sort((a, b) => Number(String(a.id) === String(selectedId)) - Number(String(b.id) === String(selectedId)));
  }

  function resize() {
    if (destroyed) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    width = rect.width;
    height = rect.height;
    shipSize = width < 600 ? 0.7 : width < 800 ? 0.85 : 1;
    root.style('--ship-size', shipSize);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    sea.attr('width', width).attr('height', height);
    projection.scale(Math.min(width / (Math.PI * 2) * 0.94, height / 4.25)).translate([width * 0.52, height * (width < 600 ? 0.65 : 0.51)]);
    graticule.attr('d', geoPath);
    countries.selectAll('path').attr('d', geoPath);
    renderRoutes();
    if (focusedCruise) focus(focusedCruise, false);
    else svg.call(zoom.transform, d3.zoomIdentity);
  }

  function transitionTo(target, animated = true) {
    hideTooltip();
    if (motion && animated) svg.transition().duration(850).ease(d3.easeCubicInOut).call(zoom.transform, target);
    else svg.interrupt().call(zoom.transform, target);
  }

  function focus(cruise, animated = true) {
    if (!cruise || destroyed) return;
    focusedCruise = cruise;
    const coordinates = routeFor(cruise);
    if (!coordinates.length) coordinates.push(regionAnchor(cruise));
    const projected = coordinates.map(point => projection(point));
    const xs = projected.map(point => point[0]);
    const ys = projected.map(point => point[1]);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const padX = Math.min(110, width * 0.18);
    const padY = Math.min(115, height * 0.23);
    const heading = protectedBoxes()[0];
    const padTop = Math.min(height * 0.45, Math.max(padY, (heading?.bottom || 0) + 28));
    const scale = Math.max(1.3, Math.min(coordinates.length === 1 ? 5 : 18, (width - padX * 2) / Math.max(1, right - left), (height - padTop - padY) / Math.max(1, bottom - top)));
    const x = width / 2 - scale * (left + right) / 2;
    const y = (padTop + height - padY) / 2 - scale * (top + bottom) / 2;
    transitionTo(d3.zoomIdentity.translate(x, y).scale(scale), animated);
  }

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  resizeObserver.observe(container);
  const controller = new AbortController();
  fetch(`${import.meta.env.BASE_URL}data/world.json`, { signal: controller.signal })
    .then(response => { if (!response.ok) throw new Error(`Map geometry: ${response.status}`); return response.json(); })
    .then(world => {
      if (destroyed) return;
      geometry = world.features;
      countries.selectAll('path').data(geometry).join('path').attr('d', geoPath);
    })
    .catch(error => {
      if (error.name !== 'AbortError') {
        console.warn('Cruise atlas background could not be loaded.', error);
        root.append('div').attr('class', 'atlas-map__load-message').text('The world map could not load. Your voyage routes are still available.');
      }
    });
  resize();

  return {
    update(cruises, selection = null) {
      data = Array.isArray(cruises) ? cruises : [];
      selectedId = selection;
      renderRoutes();
      renderShips();
      updateOverlays();
    },
    focus,
    reset() { focusedCruise = null; transitionTo(d3.zoomIdentity); },
    zoomIn() { focusedCruise = null; hideTooltip(); (motion ? svg.transition().duration(300) : svg).call(zoom.scaleBy, 1.55); },
    zoomOut() { focusedCruise = null; hideTooltip(); (motion ? svg.transition().duration(300) : svg).call(zoom.scaleBy, 1 / 1.55); },
    setMotion(value) { motion = Boolean(value); root.classed('is-still', !motion); if (!motion) svg.interrupt(); },
    destroy() { destroyed = true; controller.abort(); resizeObserver.disconnect(); cancelAnimationFrame(resizeFrame); svg.interrupt().on('.zoom', null); svg.remove(); tooltip.remove(); compass.remove(); },
  };
}
