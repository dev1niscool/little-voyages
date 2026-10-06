// Personal visits supplement the itinerary archive without creating ports,
// ship routes, dated cruise calls, or visits to a place's associated country.
const freezeVisit = visit => Object.freeze({
  ...visit,
  cruiseIds: Object.freeze(visit.cruiseIds || []),
  ...(visit.candidateCruiseIds ? { candidateCruiseIds: Object.freeze(visit.candidateCruiseIds) } : {}),
  sources: Object.freeze(visit.sources || []),
  referenceLinks: Object.freeze((visit.referenceLinks || []).map(link => Object.freeze({ ...link }))),
});

export const shoreExcursions = Object.freeze([
  freezeVisit({
    name: 'Vatican City',
    flag: '🇻🇦',
    type: 'country',
    status: 'Sovereign country',
    isShoreExcursion: true,
    approximateVisits: 2,
    evidence: 'owner-confirmed',
    note: 'The owner confirms visiting Vatican City as a cruise shore excursion, by car while the ship was docked, approximately twice. Counted as one country; no ship port or dated sailing association is added.',
    sources: ['https://www.vaticanstate.va/en/state-and-government/general-informations.html'],
  }),
  freezeVisit({
    name: 'Monaco',
    flag: '🇲🇨',
    type: 'country',
    status: 'Sovereign country',
    isShoreExcursion: true,
    evidence: 'owner-confirmed',
    candidateCruiseIds: [20],
    candidatePort: 'Villefranche',
    note: 'The owner confirms visiting Monaco as a cruise shore excursion from a nearby French port on Celebrity Reflection. The 2018 sailing includes Villefranche, where Celebrity offers Monaco excursions; this is a candidate sailing association. The visit itself is confirmed and counts as one country.',
    sources: [
      'https://www.un.org/en/about-us/member-states',
      'https://www.celebritycruises.com/ports/nice/shore-excursions',
      'https://platinumcruising.com/cruise/6-nights-mediterranean-getaway-cruise-with-celebrity/',
    ],
  }),
]);

const country = (name, flag) => freezeVisit({
  name, flag, type: 'country', status: 'Sovereign country', evidence: 'owner-reported',
});

// This is the owner's requested travel comparison, not a universal sovereignty
// classification. These entries never contribute to cruise statistics.
export const nonCruiseVisits = Object.freeze({
  countries: Object.freeze([
    country('China', '🇨🇳'),
    country('Egypt', '🇪🇬'),
    country('India', '🇮🇳'),
    country('Israel', '🇮🇱'),
    country('South Africa', '🇿🇦'),
  ]),
  specialPlaces: Object.freeze([
    freezeVisit({
      name: 'Palestine',
      flag: '🇵🇸',
      type: 'special-place',
      status: 'UN non-member observer State',
      evidence: 'owner-reported',
      note: 'Shown in this personal “territories & special places” group. Palestine is a UN non-member observer State; recognition and borders remain disputed. A majority of UN member countries recognize Palestine as a state, but the United States does not.',
      disputeNote: 'Recognition and borders remain disputed. Palestine is recognized as a state by a majority of UN member countries, but not by the United States.',
      disputeUrl: 'https://en.wikipedia.org/wiki/Legal_status_of_Palestine',
      sources: [
        'https://www.un.org/en/node/123012',
        'https://www.un.org/unispal/document/special-committee-israeli-practices-report-05sep25/',
        'https://www.cbsnews.com/news/marco-rubio-secretary-of-state-face-the-nation-transcript-10-05-2025/',
      ],
      referenceLinks: [
        { label: 'UN recognition report', url: 'https://www.un.org/unispal/document/special-committee-israeli-practices-report-05sep25/' },
        { label: 'U.S. position', url: 'https://www.cbsnews.com/news/marco-rubio-secretary-of-state-face-the-nation-transcript-10-05-2025/' },
      ],
    }),
    freezeVisit({
      name: 'Hong Kong',
      flag: '🇭🇰',
      type: 'special-place',
      status: 'Special Administrative Region of China',
      evidence: 'owner-reported',
      note: 'A Special Administrative Region of China, listed separately in this personal travel comparison. Hong Kong participates separately as “Hong Kong, China”: a WTO member and separate customs territory, and an APEC member economy. These economic arrangements do not make it an independent country.',
      contextNote: 'Hong Kong participates separately as “Hong Kong, China”: a WTO member and separate customs territory, and an APEC member economy.',
      contextUrl: 'https://en.wikipedia.org/wiki/Hong_Kong',
      sources: [
        'https://www.basiclaw.gov.hk/en/basiclaw/chapter1.html',
        'https://www.wto.org/english/thewto_e/countries_e/hong_kong_china_e.htm',
        'https://www.apec.org/who-we-are/our-members',
        'https://www.tid.gov.hk/en/our_work/hk_participation_in_ito/wto/overview/hk_participation.html',
      ],
      referenceLinks: [
        { label: 'WTO', url: 'https://www.wto.org/english/thewto_e/countries_e/hong_kong_china_e.htm' },
        { label: 'APEC', url: 'https://www.apec.org/who-we-are/our-members' },
      ],
    }),
  ]),
  groupingNote: 'This is a personal travel grouping, not a claim about sovereignty. These owner-reported visits happened without a cruise and are excluded from every cruise total.',
  countNote: 'This personal count uses 5, consistent with U.S. recognition; counting Palestine as a country makes 6.',
});
