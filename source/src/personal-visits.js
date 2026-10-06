// Personal recollections supplement the itinerary archive without creating ports,
// ship routes, dated cruise calls, or visits to a place's associated country.
const freezeVisit = visit => Object.freeze({
  ...visit,
  cruiseIds: Object.freeze(visit.cruiseIds || []),
  sources: Object.freeze(visit.sources || []),
});

export const shoreExcursions = Object.freeze([
  freezeVisit({
    name: 'Vatican City',
    flag: '🇻🇦',
    type: 'country',
    status: 'Sovereign country',
    isShoreExcursion: true,
    approximateVisits: 2,
    evidence: 'owner-reported',
    note: 'Visited by car while the cruise ship was docked, approximately twice. This was a shore visit, not a cruise port; the exact sailings and dates are not recorded. Counted as one country.',
    sources: ['https://www.vaticanstate.va/en/state-and-government/general-informations.html'],
  }),
]);

const country = (name, flag) => freezeVisit({
  name, flag, type: 'country', status: 'Sovereign country', evidence: 'owner-reported',
});

// This is the owner's requested travel comparison, not a universal sovereignty
// classification. These entries never contribute to cruise statistics.
export const nonCruiseVisits = Object.freeze({
  countries: Object.freeze([
    country('Egypt', '🇪🇬'),
    country('South Africa', '🇿🇦'),
    country('India', '🇮🇳'),
    country('Israel', '🇮🇱'),
    country('China', '🇨🇳'),
  ]),
  specialPlaces: Object.freeze([
    freezeVisit({
      name: 'Palestine',
      flag: '🇵🇸',
      type: 'special-place',
      status: 'UN non-member observer State',
      evidence: 'owner-reported',
      note: 'Shown in this personal “special places” group as requested. Palestine is a UN non-member observer State; recognition and borders remain disputed.',
      disputeNote: 'Recognition and borders remain disputed.',
      disputeUrl: 'https://en.wikipedia.org/wiki/Legal_status_of_Palestine',
      sources: ['https://www.un.org/en/node/123012'],
    }),
    freezeVisit({
      name: 'Hong Kong',
      flag: '🇭🇰',
      type: 'special-place',
      status: 'Special Administrative Region of China',
      evidence: 'owner-reported',
      note: 'A Special Administrative Region of China, listed separately in this personal travel comparison.',
      contextUrl: 'https://en.wikipedia.org/wiki/Hong_Kong',
      sources: ['https://www.basiclaw.gov.hk/en/basiclaw/chapter1.html'],
    }),
  ]),
  groupingNote: 'This is a personal travel grouping, not a claim about sovereignty. These owner-reported visits happened without a cruise and are excluded from every cruise total.',
});
