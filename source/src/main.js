import './style.css';
import { cruises } from './data.js';
import { createCruiseMap } from './map.js';
import { createStatisticsPage } from './statistics.js';
import './theme.css';

const icons = {
  chart: '<path d="M4 20h16M7 16v-5M12 16V4M17 16V8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  arrow: '<path d="m14 5-7 7 7 7M7 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
  play: '<path d="m9 5 11 7-11 7z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  wave: '<path d="M2 8q3-4 6 0t6 0 6 0M2 15q3-4 6 0t6 0 6 0"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v5M16 3v5M4 11h16"/>',
  moon: '<path d="M20 14a8 8 0 0 1-10-10A9 9 0 1 0 20 14Z"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.wave}</svg>`;
const boat = (color = '#287e83', cls = '') => `<svg class="boat-art ${cls}" viewBox="0 0 100 78" aria-hidden="true"><ellipse cx="50" cy="68" rx="39" ry="5" fill="${color}" opacity=".1"/><g class="boat-hull"><path d="M34 23h11v13H34z" fill="${color}"/><path d="M57 19h10v17H57z" fill="${color}"/><path d="M28 32h45v17H28z" fill="#fffdf5" stroke="#b2c9c5" stroke-width="1.2"/><path d="M17 43h65l-9 17H29z" fill="#fffdf5" stroke="#b2c9c5" stroke-width="1.2"/><path d="M22 52h55l-4 8H29z" fill="${color}"/><path d="M34 38h5m7 0h5m7 0h5m7 0h3" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="48" r="2" fill="${color}"/><circle cx="43" cy="48" r="2" fill="${color}"/><circle cx="53" cy="48" r="2" fill="${color}"/><circle cx="65" cy="48" r="2" fill="${color}"/><path d="M39 23V12l12 4-12 4" fill="#e7a68a" stroke="#47706f" stroke-width="1.1"/></g><path d="M10 65q6 4 12 0t12 0m27 0q6 4 12 0t12 0" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalized = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const date = value => value ? new Date(value + 'T12:00:00Z') : null;
const formatDate = value => date(value)?.toLocaleDateString('en-US', { month:'short',day:'numeric',year:'numeric',timeZone:'UTC' }) || 'Not yet confirmed';
const shortDate = value => date(value)?.toLocaleDateString('en-US', { month:'short',day:'numeric',timeZone:'UTC' }) || 'Date to confirm';
const dateRange = cruise => cruise.startDate && cruise.endDate ? (cruise.startDate.slice(0,4)!==cruise.endDate.slice(0,4) ? `${formatDate(cruise.startDate)} – ${formatDate(cruise.endDate)}` : `${shortDate(cruise.startDate)} – ${shortDate(cruise.endDate)}, ${date(cruise.endDate).getUTCFullYear()}`) : `Your date: ${formatDate(cruise.originalDate)}`;
const confidenceLabel = { confirmed:'Historical match', likely:'Likely itinerary', unresolved:'A little mystery' };
const years = [...new Set(cruises.map(c => c.year))].sort((a,b)=>a-b);
const lines = [...new Set(cruises.map(c => c.line))];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {view:'atlas',year:null,query:'',line:'',selected:null,newest:true,motion:!reducedMotion.matches,touring:false};
let tourTimer, map, statisticsPage, visible = [], selectedTab = 'itinerary';

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="Little voyages, reset atlas"><span class="brand-mark">${boat('#fff8e8')}</span><span>little voyages<span class="brand-caption">MY CRUISE ATLAS</span></span></a>
    <nav class="view-nav" aria-label="Main navigation"><button data-view="atlas" aria-current="page">${icon('globe')}<span>Cruise atlas</span></button><button data-view="statistics">${icon('chart')}<span>Statistics</span><i class="nav-sparkle">✦</i></button></nav>
    <div class="top-actions"><button class="theme-toggle" id="theme-toggle" role="switch" aria-checked="false" aria-label="Dark mode"><span class="theme-toggle-label">Dark mode</span><span class="theme-track">${icon('sun')}${icon('moon')}<i></i></span></button><button class="motion-button" id="motion" aria-label="Animations" aria-pressed="${state.motion}" title="Toggle animations">${icon('wave')}<span>Motion</span><i></i></button><span class="action-divider"></span><button class="about-button" id="about">${icon('info')}<span>About</span></button></div>
  </header>
  <main class="atlas-layout" id="atlas-page" tabindex="-1" aria-label="Cruise atlas">
    <aside class="logbook" aria-label="Cruise logbook">
      <div id="sidebar"></div>
      <div class="sidebar-footer"><span class="tiny-wave">≈</span> Good times. Great tides.</div>
    </aside>
    <section class="map-section" aria-label="Interactive cruise map">
      <div id="map"></div>
      <div class="map-heading" id="map-heading"></div>
      <div class="map-corner"><span class="live-dot"></span> A LITTLE ATLAS OF A LIFE AT SEA</div>
      <div class="map-tools"><button id="reset-map" aria-label="Show world map" title="Show the whole world">${icon('globe')}</button><span></span><button id="zoom-in" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button id="zoom-out" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
      <button id="mobile-details" class="mobile-details" hidden></button><div class="map-legend" id="map-legend"></div>
      <div class="map-help"><span class="help-desktop">Drag to wander · Scroll to zoom · </span>Tap a ship to explore</div>
      <span class="route-disclaimer">Illustrative routes, not navigation tracks</span>
      <div class="sea-friend" aria-hidden="true"><svg viewBox="0 0 106 58"><path d="M16 31c-3-12 14-23 32-18 12 3 15 13 19 16 5 4 17 1 22-8 4 16-9 23-22 17-10 16-44 15-51-7Z" fill="#79afb1"/><path d="M45 42q-8 10-14-1" fill="#508e91"/><circle cx="24" cy="27" r="2" fill="#255f69"/><path d="M20 33q3 4 6 0M38 8q-2-7-6-5m6 5q3-7 8-5" stroke="#427f85" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M7 50q7 3 14 0m49 0q8 3 16 0" stroke="#79afb1" stroke-width="1.5" fill="none"/></svg><span>oh, the places you’ve sailed.</span></div>
    </section>
    <section class="timeline" aria-label="Filter cruises by year">
      <div class="timeline-intro"><span class="eyebrow">THE YEARS GO BY. THE MEMORIES STAY.</span><div><h2>Your voyage timeline</h2><button id="tour" class="tour-button">${icon('play')}<span>Sail through time</span></button></div></div>
      <div class="timeline-track"><button id="all-years" class="year-all active" aria-pressed="true">All years<span>${cruises.length} voyages</span></button><div class="year-scroll" id="year-scroll">${years.map(year=>{const count=cruises.filter(c=>c.year===year).length;return `<button class="year-item" data-year="${year}" aria-label="${year}, ${count} voyages" aria-pressed="false"><span class="year-bars">${Array.from({length:count},()=>'<i></i>').join('')}</span><span class="year-number">${year}</span><span class="year-count">${count} ${count===1?'voyage':'voyages'}</span></button>`}).join('')}</div></div>
    </section>
  </main>
  <main id="statistics-page" hidden tabindex="-1" aria-labelledby="statistics-title"></main>
  <div class="sr-only" id="announcer" role="status" aria-live="polite"></div>
  <dialog id="about-dialog" aria-labelledby="about-title"><button class="dialog-close icon-button" aria-label="Close about dialog">${icon('close')}</button><div class="dialog-boat">${boat()}</div><span class="eyebrow">A PERSONAL PASSPORT TO THE PAST</span><h2 id="about-title">Every voyage has a story.</h2><p>This is a little home for 29 cruises, from your first Bahamian adventure in 2005 to the southern Caribbean in 2025. Pick a year, follow a ship, and revisit a port.</p><div class="about-rule"></div><h3>A note from the logbook</h3><p>Your original ship, date, and destination are preserved. Historical schedules, cruise brochures, passenger reviews, and forum posts help reconstruct the journeys. Some dates may fall within a sailing, rather than on departure day.</p><div class="confidence-guide"><p><span class="confidence confirmed">Historical match</span> A historical source matches the sailing. Individual details can still have notes.</p><p><span class="confidence likely">Likely itinerary</span> The schedule fits, but some details or the full trip length need confirmation.</p><p><span class="confidence unresolved">A little mystery</span> Records conflict or don’t establish a reliable itinerary.</p></div><p>Each voyage has its own research notes and source links. Map lines are illustrative connections between ports, with sea waypoints where available; they are not the ship’s recorded track. Port totals describe the displayed itinerary, not separately verified personal visits.</p><div class="dialog-actions"><button class="primary-button" id="download">${icon('download')} Download logbook</button><a href="https://github.com/dev1niscool/little-voyages/tree/main/source" target="_blank" rel="noopener noreferrer">View on GitHub ${icon('external')}</a></div><p class="map-credit">Map: Natural Earth · Fonts: DM Sans & Fraunces · Made for the love of the sea.</p></dialog>
`;

function updateVisible() {
  const q=normalized(state.query);
  visible=cruises.filter(c=>(!state.year||c.year===state.year)&&(!state.line||c.line===state.line)&&(!q||normalized([c.ship,c.line,c.region,c.year,...c.ports.map(p=>p.name)].join(' ')).includes(q)));
  if(state.selected && !visible.some(c=>c.id===state.selected)) state.selected=null;
}
function renderSidebar() {
  const selected = cruises.find(c=>c.id===state.selected);
  if(selected) return renderDetail(selected);
  document.querySelector('#sidebar').innerHTML = `<div class="logbook-heading"><div><span class="eyebrow">YOUR COLLECTION</span><h1>The logbook<span class="heading-dot">.</span></h1></div><span class="count-stamp">${visible.length}<span>VOYAGES</span></span></div><div class="filters"><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="Find a ship, port, or memory…" value="${esc(state.query)}" aria-label="Search cruises" autocomplete="off" /></label><div class="filter-row"><label class="line-select"><span class="sr-only">Cruise line</span><select id="line-filter"><option value="">All cruise lines</option>${lines.map(line=>`<option ${state.line===line?'selected':''}>${esc(line)}</option>`).join('')}</select></label><button class="sort-button" id="sort" aria-label="Sort ${state.newest?'oldest':'newest'} first" title="Change sort order">${state.newest?'Newest':'Oldest'} <span>↓</span></button></div></div><div class="list-label"><span>${state.year?`${state.year} · `:''}${visible.length} ${visible.length===1?'voyage':'voyages'} to remember</span>${state.year||state.query||state.line?'<button id="clear-filters">Clear filters</button>':'<span class="list-sparkle">✧</span>'}</div><div class="cruise-list">${[...visible].sort((a,b)=>state.newest?b.id-a.id:a.id-b.id).map(c=>`<button class="cruise-card" data-cruise="${c.id}" style="--line-color:${c.color}" aria-label="Explore ${esc(c.ship)}, ${c.year}, ${esc(c.region)}"><span class="card-boat">${boat(c.color)}</span><span class="card-copy"><span class="card-kicker">${c.year} <i></i> ${esc(c.region)}</span><strong>${esc(c.ship)}</strong><span class="card-meta">${shortDate(c.startDate||c.originalDate)}${c.confidence!=='confirmed'?' <span class="estimate-mark" title="Some details need confirmation">≈</span>':''}<span>·</span>${c.nights?`${c.nights} nights`:'Duration to confirm'}</span></span><span class="card-arrow">${icon('chevron')}</span></button>`).join('')||`<div class="empty-state">${boat()}<h3>No ships on this horizon.</h3><p>Try another ship, port, or cruise line.</p><button class="primary-button" id="empty-reset">Reset filters</button></div>`}</div>`;
  document.querySelector('#search').addEventListener('input', e=>{const caret=e.target.selectionStart;state.query=e.target.value;stopTour();render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(caret,caret)});
  document.querySelector('#line-filter').addEventListener('change',e=>{state.line=e.target.value;stopTour();render();map.reset()});
  document.querySelector('#sort').addEventListener('click',()=>{state.newest=!state.newest;renderSidebar()});
  document.querySelectorAll('[data-cruise]').forEach(el=>el.addEventListener('click',()=>selectCruise(Number(el.dataset.cruise))));
  document.querySelector('#clear-filters')?.addEventListener('click',clearFilters);
  document.querySelector('#empty-reset')?.addEventListener('click',clearFilters);
}
function renderDetail(c) {
  const index=visible.findIndex(v=>v.id===c.id);
  const uniquePorts=c.ports.filter((p,i)=>c.ports.findIndex(o=>o.name===p.name)===i);
  const confirmed=c.confidence==='confirmed';
  document.querySelector('#sidebar').innerHTML=`<div class="detail-toolbar"><button class="back-button" id="back">${icon('arrow')} All voyages</button><span>VOYAGE ${String(c.id).padStart(2,'0')} / ${cruises.length}</span></div><div class="detail-scroll"><div class="detail-hero" style="--line-color:${c.color}"><span class="detail-watermark">${String(c.year).slice(2)}</span>${boat(c.color,'detail-boat')}<span class="detail-region">${esc(c.region)}</span></div><div class="detail-heading"><span class="eyebrow" style="color:${c.color}">${esc(c.line)}</span><h1>${esc(c.ship)}</h1><p>${dateRange(c)}</p><span class="confidence ${c.confidence}">${confidenceLabel[c.confidence]}</span></div><div class="detail-stats"><div>${icon('moon')}<strong>${c.nights??'—'}</strong><span>${confirmed?'nights aboard':'nights · see notes'}</span></div><div>${icon('pin')}<strong>${uniquePorts.length||'—'}</strong><span>itinerary ports</span></div><div>${icon('calendar')}<strong>${c.year}</strong><span>year of voyage</span></div></div><div class="detail-tabs" role="tablist" aria-label="Voyage details"><button role="tab" id="tab-itinerary" aria-controls="detail-content" aria-selected="${selectedTab==='itinerary'}" data-tab="itinerary">The itinerary</button><button role="tab" id="tab-research" aria-controls="detail-content" aria-selected="${selectedTab==='research'}" data-tab="research">Notes & sources <span>${c.sources.length}</span></button></div><div id="detail-content" role="tabpanel" aria-labelledby="tab-${selectedTab}">${selectedTab==='itinerary'?`${!confirmed?`<div class="itinerary-note">${icon('info')}<p>${c.confidence==='unresolved'?'The original memory and historical records don’t quite line up. Open Notes & sources for the clues.':'This route is a historical reconstruction. Some details still need confirmation—see Notes & sources.'}</p></div>`:''}${c.ports.length?`<ol class="port-list" style="--line-color:${c.color}">${c.ports.map((port,i)=>`<li><span class="port-dot">${i===0||i===c.ports.length-1?icon('compass'):i}</span><div><strong>${esc(port.name)}</strong><span>${i===0?(c.candidateStartDate?'SEGMENT START':'DEPARTURE'):i===c.ports.length-1?(c.candidateEndDate?'SEGMENT END':'ARRIVAL'):esc(port.country||'PORT OF CALL')}</span></div>${i===0||i===c.ports.length-1?`<span class="port-date">${shortDate(i===0?(c.startDate||c.candidateStartDate):(c.endDate||c.candidateEndDate)).replace('Date to confirm','')}</span>`:''}</li>`).join('')}</ol><p class="itinerary-footnote">Sea days are not shown. Routes connect the recorded or reconstructed ports.</p>`:`<div class="mystery-art">${boat(c.color)}<p>A voyage worth remembering.<br>A route still to rediscover.</p></div>`}`:`<div class="research-notes"><span class="eyebrow">FROM YOUR ORIGINAL LOGBOOK</span><blockquote>${formatDate(c.originalDate)}<br>${esc(c.originalShip||c.ship)} · ${esc(c.originalRegion||c.region)}</blockquote><h3>What the records tell us</h3><p>${esc(c.notes).replace(/\n/g,'<br>')}</p><h3>Follow the paper trail</h3><div class="source-list">${c.sources.map((source,i)=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer"><span class="source-number">${i+1}</span><span><strong>${esc(source.title)}</strong>${source.note?`<small>${esc(source.note)}</small>`:''}</span>${icon('external')}</a>`).join('')||'<p>No reliable historical source found for this itinerary yet.</p>'}</div></div>`}</div></div><div class="detail-navigation"><button id="prev-cruise" ${index===0?'disabled':''}>${icon('arrow')} Previous voyage</button><button id="next-cruise" ${index===visible.length-1?'disabled':''}>Next voyage ${icon('arrow','flip')}</button></div>`;
  document.querySelector('#back').addEventListener('click',()=>{stopTour();state.selected=null;selectedTab='itinerary';render();map.reset()});
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>{selectedTab=el.dataset.tab;renderDetail(c);document.querySelector(`#tab-${selectedTab}`).focus()}));
  document.querySelector('#prev-cruise').addEventListener('click',()=>selectCruise(visible[index-1]?.id));
  document.querySelector('#next-cruise').addEventListener('click',()=>selectCruise(visible[index+1]?.id));
}
function renderHeading() {
  const c=cruises.find(c=>c.id===state.selected);
  const heading=document.querySelector('#map-heading');
  heading.classList.toggle('is-selected',!!c);
  const mobileDetails=document.querySelector('#mobile-details');mobileDetails.hidden=!c;mobileDetails.innerHTML=c?`${esc(c.ship)}<span>${c.nights?`${c.nights} nights · `:''}View voyage ${icon('chevron')}</span>`:'';
  heading.innerHTML=c?`<span class="eyebrow">FOLLOW THE MEMORY</span><h2>${esc(c.region)}<span class="little-star">✧</span></h2><p>${c.ports.length?`${c.ports[0].name} ${icon('chevron')} ${c.ports.at(-1).name}`:'A port of possibility, a route to rediscover.'}</p>`:`<span class="eyebrow">${state.year?`A CHAPTER CALLED ${state.year}`:'2005 — 2025 · A PERSONAL VOYAGE COLLECTION'}</span><h2>${state.year?'Same sea.': 'A world of places.'}<br><em>${state.year?'New memories.':'A sea of memories.'}</em><span class="little-star">✧</span></h2><p>${state.year?`${visible.length} ${visible.length===1?'journey':'journeys'} from ${state.year}, waiting to be revisited.`:'Every little ship holds a story. Where shall we go?'}</p><div class="map-stats"><div><strong>${visible.length.toString().padStart(2,'0')}</strong><span>voyages</span></div><i></i><div><strong>${new Set(visible.map(c=>c.ship)).size.toString().padStart(2,'0')}</strong><span>ships</span></div><i></i><div><strong>${new Set(visible.map(c=>c.line)).size.toString().padStart(2,'0')}</strong><span>cruise lines</span></div></div>`;
  const shownLines=[...new Set(visible.map(c=>c.line))];
  document.querySelector('#map-legend').innerHTML=shownLines.map(line=>{const cruise=cruises.find(c=>c.line===line);return `<span><i style="background:${cruise.color}"></i>${esc(line.replace(' Cruise Line','').replace(' Cruises','').replace(' Line',''))}</span>`}).join('');
}
function render() {
  updateVisible();renderSidebar();renderHeading();map?.update(visible,state.selected);
  document.querySelectorAll('[data-year]').forEach(el=>{const active=Number(el.dataset.year)===state.year;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active)});
  document.querySelector('#all-years').classList.toggle('active',!state.year);
  document.querySelector('#all-years').setAttribute('aria-pressed',!state.year);
  document.querySelector('#announcer').textContent=`${visible.length} voyages shown${state.year?` from ${state.year}`:''}${state.selected?`. ${cruises.find(c=>c.id===state.selected)?.ship} selected`:''}.`;
  syncUrl();
}
function selectCruise(id,fromTour=false) {
  const c=cruises.find(c=>c.id===id);if(!c)return;
  if(!fromTour)stopTour();state.selected=id;selectedTab='itinerary';render();map.focus(c);
}
function clearFilters() {stopTour();Object.assign(state,{year:null,query:'',line:'',selected:null});render();map.reset()}
function selectYear(year) {stopTour();state.year=year;state.selected=null;render();map.reset();if(visible.length===1)map.focus(visible[0]);document.querySelector(`[data-year="${year}"]`)?.scrollIntoView({behavior:state.motion?'smooth':'instant',block:'nearest',inline:'nearest'})}
function updateTourButton() {document.querySelector('#tour').innerHTML=`${icon(state.touring?'pause':'play')}<span>${state.touring?'Pause the journey':'Sail through time'}</span>`;document.querySelector('#tour').setAttribute('aria-pressed',state.touring)}
function stopTour(){clearTimeout(tourTimer);state.touring=false;updateTourButton()}
function startTour(){if(state.touring){stopTour();return}state.touring=true;state.query='';state.line='';state.year=null;let index=state.selected?cruises.findIndex(c=>c.id===state.selected):0;if(index===cruises.length-1)index=0;const sail=()=>{if(!state.touring)return;selectCruise(cruises[index].id,true);updateTourButton();index++;tourTimer=setTimeout(()=>index<cruises.length?sail():stopTour(),6500)};sail()}

map=createCruiseMap(document.querySelector('#map'),{onSelect:c=>selectCruise(c.id),onViewChange:({zoomed})=>document.querySelector('#reset-map').classList.toggle('zoomed',zoomed)});
map.setMotion(state.motion);
document.body.classList.toggle('still-seas',!state.motion);
document.querySelector('#motion').addEventListener('click',()=>{state.motion=!state.motion;document.querySelector('#motion').setAttribute('aria-pressed',state.motion);document.body.classList.toggle('still-seas',!state.motion);map.setMotion(state.motion)});
reducedMotion.addEventListener('change',e=>{state.motion=!e.matches;document.querySelector('#motion').setAttribute('aria-pressed',state.motion);document.body.classList.toggle('still-seas',!state.motion);map.setMotion(state.motion)});
document.querySelector('#mobile-details').addEventListener('click',()=>document.querySelector('.logbook').scrollIntoView({behavior:state.motion?'smooth':'instant',block:'start'}));
document.querySelector('#reset-map').addEventListener('click',()=>map.reset());
document.querySelector('#zoom-in').addEventListener('click',()=>map.zoomIn());
document.querySelector('#zoom-out').addEventListener('click',()=>map.zoomOut());
document.querySelector('#all-years').addEventListener('click',()=>selectYear(null));
document.querySelectorAll('[data-year]').forEach(el=>el.addEventListener('click',()=>selectYear(Number(el.dataset.year))));
document.querySelector('#tour').addEventListener('click',startTour);
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();clearFilters();setView('atlas')});
const dialog=document.querySelector('#about-dialog');
document.querySelector('#about').addEventListener('click',()=>{stopTour();dialog.showModal()});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close()}});
document.querySelector('#download').addEventListener('click',()=>{const data={title:'Little voyages — My cruise atlas',routeNote:'Illustrative port connections, not recorded navigation tracks.',cruises};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='little-voyages-logbook.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&state.view==='atlas'){stopTour();state.selected=null;render();map.reset()}});
const params=new URLSearchParams(location.search);const year=Number(params.get('year'));if(years.includes(year))state.year=year;
const id=Number(params.get('cruise'));if(cruises.some(c=>c.id===id&&(!state.year||c.year===state.year)))state.selected=id;
statisticsPage=createStatisticsPage(document.querySelector('#statistics-page'),{cruises,onSelectCruise:id=>{Object.assign(state,{year:null,query:'',line:'',selected:Number(id)});setView('atlas');selectCruise(Number(id));},onSelectYear:year=>{Object.assign(state,{query:'',line:''});setView('atlas');selectYear(Number(year));}});
state.view=params.get('view')==='statistics'?'statistics':'atlas';
render();setView(state.view,{push:false,scroll:false});


function syncUrl(push=false){
  const params=new URLSearchParams();
  if(state.view==='statistics')params.set('view','statistics');
  if(state.year)params.set('year',state.year);
  if(state.selected)params.set('cruise',state.selected);
  const url=location.pathname+(params.size?'?'+params.toString():'');
  if(push&&url!==location.pathname+location.search)history.pushState(null,'',url);
  else history.replaceState(null,'',url);
}
function setView(view,{push=true,scroll=true}={}){
  stopTour();state.view=view==='statistics'?'statistics':'atlas';
  const stats=state.view==='statistics';
  document.querySelector('#atlas-page').hidden=stats;
  document.body.classList.toggle('view-statistics',stats);
  document.querySelectorAll('[data-view]').forEach(button=>{if(button.dataset.view===state.view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  document.title=stats?'By the numbers — Little voyages':'Little voyages — My cruise atlas';
  if(stats)statisticsPage?.show();else statisticsPage?.hide();
  syncUrl(push);
  if(scroll)window.scrollTo({top:0,behavior:'instant'});
  if(!stats)requestAnimationFrame(()=>{map.update(visible,state.selected);const cruise=cruises.find(c=>c.id===state.selected);if(cruise)map.focus(cruise,false);else map.reset()});
  document.querySelector('#announcer').textContent=stats?'Statistics page. Your entire cruise collection, by the numbers.':`${visible.length} voyages shown on the cruise atlas.`;
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);const y=Number(p.get('year')),id=Number(p.get('cruise'));Object.assign(state,{year:years.includes(y)?y:null,query:'',line:'',selected:cruises.some(c=>c.id===id)?id:null});state.view=p.get('view')==='statistics'?'statistics':'atlas';render();setView(state.view,{push:false});});
const themePreference=matchMedia('(prefers-color-scheme: dark)');
function setTheme(theme,persist=false){
  document.documentElement.dataset.theme=theme;
  document.querySelector('#theme-toggle').setAttribute('aria-checked',theme==='dark');
  document.querySelector('meta[name="theme-color"]').setAttribute('content',theme==='dark'?'#101a30':'#eff7fa');
  if(persist)try{localStorage.setItem('little-voyages-theme',theme)}catch{}
}
setTheme(document.documentElement.dataset.theme||(themePreference.matches?'dark':'light'));
document.querySelector('#theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true));
themePreference.addEventListener('change',e=>{let saved=null;try{saved=localStorage.getItem('little-voyages-theme')}catch{}if(!['dark','light'].includes(saved))setTheme(e.matches?'dark':'light');});
