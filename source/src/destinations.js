// Classifications are explicit: an unfamiliar itinerary label needs review, not
// an automatic assumption of sovereignty. Parent countries are never inferred
// from a call at a territory or a constituent country of a wider kingdom.
const KINGDOM_SOURCE = 'https://www.government.nl/faq/what-are-the-different-parts-of-the-kingdom-of-the-netherlands';
const UK_TERRITORIES_SOURCE = 'https://www.gov.uk/government/publications/geographical-names-and-information';
const GUERNSEY_SOURCE = 'https://www.gov.uk/government/publications/guernsey-alderney-and-sark-knowledge-base-profile/guernsey-alderney-and-sark-knowledge-base-profile';
const US_TERRITORIES_SOURCE = 'https://www.doi.gov/node/11613';

const country = (name, flag) => ({ name, flag, type: 'country', status: 'Sovereign country', sovereign: null, sources: [] });
const territory = (name, flag, status, sovereign, source) => ({ name, flag, type: 'territory', status, sovereign, sources: [source] });

export const destinations = Object.freeze([
  country('Antigua and Barbuda', '🇦🇬'),
  territory('Aruba', '🇦🇼', 'Country within the Kingdom of the Netherlands', 'Kingdom of the Netherlands', KINGDOM_SOURCE),
  country('Bahamas', '🇧🇸'),
  country('Barbados', '🇧🇧'),
  country('Belize', '🇧🇿'),
  country('Canada', '🇨🇦'),
  territory('Cayman Islands', '🇰🇾', 'British Overseas Territory', 'United Kingdom', UK_TERRITORIES_SOURCE),
  country('Costa Rica', '🇨🇷'),
  country('Croatia', '🇭🇷'),
  country('Cuba', '🇨🇺'),
  territory('Curaçao', '🇨🇼', 'Country within the Kingdom of the Netherlands', 'Kingdom of the Netherlands', KINGDOM_SOURCE),
  country('Denmark', '🇩🇰'),
  country('Dominica', '🇩🇲'),
  country('Dominican Republic', '🇩🇴'),
  country('Estonia', '🇪🇪'),
  country('Finland', '🇫🇮'),
  country('France', '🇫🇷'),
  country('Germany', '🇩🇪'),
  territory('Gibraltar', '🇬🇮', 'British Overseas Territory', 'United Kingdom', UK_TERRITORIES_SOURCE),
  country('Greece', '🇬🇷'),
  country('Grenada', '🇬🇩'),
  territory('Guernsey', '🇬🇬', 'Crown Dependency', 'British Crown', GUERNSEY_SOURCE),
  country('Honduras', '🇭🇳'),
  country('Ireland', '🇮🇪'),
  country('Italy', '🇮🇹'),
  country('Jamaica', '🇯🇲'),
  country('Japan', '🇯🇵'),
  country('Mexico', '🇲🇽'),
  country('Montenegro', '🇲🇪'),
  country('Netherlands', '🇳🇱'),
  country('Panama', '🇵🇦'),
  territory('Puerto Rico', '🇵🇷', 'U.S. territory · Commonwealth', 'United States', US_TERRITORIES_SOURCE),
  country('Russia', '🇷🇺'),
  country('Saint Kitts and Nevis', '🇰🇳'),
  country('Saint Lucia', '🇱🇨'),
  territory('Sint Maarten', '🇸🇽', 'Country within the Kingdom of the Netherlands', 'Kingdom of the Netherlands', KINGDOM_SOURCE),
  country('South Korea', '🇰🇷'),
  country('Spain', '🇪🇸'),
  country('Sweden', '🇸🇪'),
  country('Turkey', '🇹🇷'),
  territory('Turks and Caicos Islands', '🇹🇨', 'British Overseas Territory', 'United Kingdom', UK_TERRITORIES_SOURCE),
  territory('U.S. Virgin Islands', '🇻🇮', 'U.S. territory', 'United States', US_TERRITORIES_SOURCE),
  country('United Kingdom', '🇬🇧'),
  country('United States', '🇺🇸'),
].map(destination => Object.freeze({ ...destination, sources: Object.freeze(destination.sources) })));

const normalized = value => typeof value === 'string' ? value.trim().toLocaleLowerCase('en') : '';
const destinationByName = new Map(destinations.map(destination => [normalized(destination.name), destination]));
const byName = (a, b) => a.name.localeCompare(b.name, 'en');
const byId = (a, b) => typeof a === 'number' && typeof b === 'number'
  ? a - b : String(a).localeCompare(String(b), 'en', { numeric: true });

/** Summarize only eligible port calls supplied by the statistics calculation. */
export function summarizeDestinations(visits = []) {
  const places = new Map();
  for (const { port, cruiseId } of visits) {
    const key = normalized(port?.country);
    if (!key) continue;
    if (!places.has(key)) {
      const definition = destinationByName.get(key);
      places.set(key, {
        ...(definition || { name: port.country.trim(), type: 'unclassified', status: 'Classification pending', flag: '', sovereign: null, sources: [] }),
        ports: new Map(),
        cruiseIds: new Set(),
      });
    }
    const place = places.get(key);
    const portName = normalized(port.name);
    if (portName && !place.ports.has(portName)) place.ports.set(portName, port.name.trim());
    if ((typeof cruiseId === 'number' && Number.isFinite(cruiseId)) || (typeof cruiseId === 'string' && cruiseId.trim())) {
      place.cruiseIds.add(cruiseId);
    }
  }
  const rows = [...places.values()].map(place => ({
    ...place,
    sources: [...place.sources],
    ports: [...place.ports.values()].sort((a, b) => a.localeCompare(b, 'en')),
    cruiseIds: [...place.cruiseIds].sort(byId),
  })).sort(byName);
  const countries = rows.filter(place => place.type === 'country');
  const territories = rows.filter(place => place.type === 'territory');
  return {
    countries,
    territories,
    countryCount: countries.length,
    territoryCount: territories.length,
    unclassifiedPlaces: rows.filter(place => place.type === 'unclassified'),
  };
}
