// world.js
// Milky Way galaxy generation

export const SPACE_SCALE = 1e6; // 1 AU = 1,000,000 game units
export const POI_TYPES = ['star', 'planet', 'station', 'asteroid_field', 'black_hole'];

// ── Name lists ──
const STAR_NAMES = [
  'Sol', 'Alpha Centauri', 'Sirius', 'Betelgeuse', 'Vega', 'Polaris', 'Rigel', 'Altair',
  'Deneb', 'Arcturus', 'Capella', 'Procyon', 'Aldebaran', 'Antares', 'Spica', 'Fomalhaut',
  'Regulus', 'Canopus', 'Achernar', 'Bellatrix', 'Mira', 'Castor', 'Pollux', 'Mimosa',
  'Hadar', 'Acrux', 'Gacrux', 'Shaula', 'Sargas', 'Nunki', 'Alnilam', 'Alnitak',
  'Mintaka', 'Saiph', 'Wezen', 'Adhara', 'Naos', 'Avior', 'Miaplacidus', 'Atria',
  'Peacock', 'Alnair', 'Rasalhague', 'Kochab', 'Thuban', 'Elnath', 'Alhena', 'Muscida',
];
const PLANET_NAMES = [
  'Kepler-442b', 'Gliese 581d', 'Proxima b', 'Trappist-1e', 'HD 40307g',
  'Tau Ceti e', 'Wolf 1061c', 'Ross 128 b', 'LHS 1140b', 'K2-18b',
  'Novus', 'Erebos', 'Calypso', 'Tethys', 'Ixion', 'Phobos Prime',
  'Elara', 'Nereid', 'Triton IV', 'Oberon V', 'Hyperion', 'Pandora',
  'Ariel', 'Umbriel', 'Miranda', 'Proteus', 'Larissa', 'Galatea',
  'Despina', 'Charon', 'Sedna', 'Haumea', 'Makemake', 'Eris',
  'Varuna', 'Quaoar', 'Orcus', 'Salacia', 'Vanth', 'Dysnomia',
];
const STATION_NAMES = [
  'Coriolis Hub', 'Orbis Gateway', 'Ocellus Dock', 'Jameson Memorial',
  'Hutton Orbital', 'Lave Station', 'Daedalus Port', 'Gagarin Terminal',
  'Armstrong Base', 'Tycho Outpost', 'Copernicus Relay', 'Kepler Waypoint',
  'Sagan Depot', 'Hawking Platform', 'Vostok Array', 'Mir Station',
  'Hermes Platform', 'Prometheus Dock', 'Atlas Hub', 'Hyperion Gate',
  'Titan Refinery', 'Elysium Port', 'Olympus Terminal', 'Arcadia Depot',
  'Frontier Outpost', 'Pilgrim Rest', 'Drake Passage', 'Magellan Point',
  'Cousteau Deep', 'Aldrin Cycler', 'Bernal Sphere', 'Stanford Torus',
  'Von Braun Ring', 'Clarke Station', 'Asimov Outpost', 'Niven Hub',
  'Banks Orbital', 'Rama Dock', 'Babylon Gateway', 'Deep Space Nine',
];
const ASTEROID_NAMES = [
  'Belt Alpha', 'Kuiper Cluster', 'Oort Fragment', 'Hera Field',
  'Trojan Drift', 'Debris Ring Zeta', 'Iron Scatter', 'Ceres Belt',
  'Pallas Field', 'Juno Cluster', 'Vesta Ring', 'Hygiea Drift',
  'Europa Debris', 'Titan Scatter', 'Io Fragment', 'Kirkwood Gap',
  'Hilda Group', 'Cybele Cluster', 'Hungaria Field', 'Phocaea Belt',
];

const STAR_COLORS = ['#fff5c0', '#ffe0a0', '#ffcc60', '#ff9944', '#ff6633', '#aaccff', '#eeeeff'];
const PLANET_COLORS = ['#4488cc', '#44aa66', '#cc8844', '#aa5533', '#7766aa', '#558899', '#889944', '#cc6677'];
const GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu'];

// ── Deterministic RNG ──
function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function gaussRng(rng) {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Name generation ──
let nameCounters = { star: 0, planet: 0, station: 0, asteroid_field: 0, black_hole: 0 };
const NAME_LISTS = { star: STAR_NAMES, planet: PLANET_NAMES, station: STATION_NAMES, asteroid_field: ASTEROID_NAMES };

function nextName(type) {
  const names = NAME_LISTS[type];
  const i = nameCounters[type]++;
  const base = names[i % names.length];
  const cycle = Math.floor(i / names.length);
  return cycle === 0 ? base : `${base} ${GREEK[(cycle - 1) % GREEK.length]}`;
}

// ── Star spectral classes for realistic sizing ──
// Sizes relative to stations (hubs) as baseline (16-24), all 2x previous:
// M red dwarf ~40-60, K orange ~60-90, G Sol-like ~70-110, F white ~80-120,
// B blue giant ~140-240, O blue supergiant ~180-300, Red supergiant ~200-360
const STAR_SPECTRAL = [
  { color: '#fff5c0', minSize: 70,  maxSize: 110 },  // G-type (Sol-like)
  { color: '#ffe0a0', minSize: 60,  maxSize: 90 },   // K-type (orange)
  { color: '#ffcc60', minSize: 80,  maxSize: 120 },  // F-type
  { color: '#ff9944', minSize: 40,  maxSize: 60 },   // M-type (red dwarf)
  { color: '#ff6633', minSize: 200, maxSize: 360 },  // Red supergiant (Betelgeuse)
  { color: '#aaccff', minSize: 140, maxSize: 240 },  // B-type (blue giant)
  { color: '#eeeeff', minSize: 180, maxSize: 300 },  // O-type (blue supergiant)
];

// ── POI factory ──
function makePOI(type, x, y, rng) {
  const name = nextName(type);
  let color, size, extra;

  switch (type) {
    case 'star': {
      const spec = STAR_SPECTRAL[nameCounters.star % STAR_SPECTRAL.length];
      color = spec.color;
      size = spec.minSize + rng() * (spec.maxSize - spec.minSize);
      extra = { rays: 4 + Math.floor(rng() * 5), pulse: rng() * 2 };
      break;
    }
    case 'planet': {
      color = PLANET_COLORS[nameCounters.planet % PLANET_COLORS.length];
      // Rocky planets 28-44, gas giants 50-90 (relative to station base 16-24)
      const isGas = rng() > 0.5;
      size = isGas ? 50 + rng() * 40 : 28 + rng() * 16;
      extra = { hasRing: isGas && rng() > 0.4, ringColor: '#aaa', moons: Math.floor(rng() * 3) };
      break;
    }
    case 'station':
      color = '#888';
      size = 16 + rng() * 8; // base reference size (16-24)
      extra = { sides: 6 + Math.floor(rng() * 3), rotationSpeed: 0.3 + rng() * 0.5 };
      break;
    case 'asteroid_field': {
      color = '#777';
      size = 100 + rng() * 60;
      const rocks = [];
      const count = 8 + Math.floor(rng() * 12);
      for (let r = 0; r < count; r++) {
        const a = rng() * Math.PI * 2;
        const d = rng() * size;
        rocks.push({
          ox: Math.cos(a) * d, oy: Math.sin(a) * d,
          r: 1.5 + rng() * 4, verts: 5 + Math.floor(rng() * 4), seed: rng() * 100,
        });
      }
      extra = { rocks };
      break;
    }
    case 'black_hole':
      color = '#000';
      size = 200; // event horizon — ~10x a station
      extra = { accretionRadius: 500, jets: true };
      break;
  }

  return { type, x, y, name, color, size, extra };
}

// ── Galaxy generation ──
export function generateWorld() {
  nameCounters = { star: 0, planet: 0, station: 0, asteroid_field: 0, black_hole: 0 };
  const pois = [];      // interactive: stations, asteroid fields, black holes
  const scenery = [];    // visual only: stars, planets
  const rng = seededRng(31415);

  const GALAXY_RADIUS = 80 * SPACE_SCALE;
  const ARM_COUNT = 4;            // Perseus, Sagittarius-Carina, Scutum-Centaurus, Norma-Outer
  const SPIRAL_WINDINGS = 1.3;    // how tightly wound the arms are

  // Galactic center offset — Sol sits in the Orion Spur, ~55% from center
  const GC_DIST = GALAXY_RADIUS * 0.55;
  const GC_ANGLE = Math.PI * 0.8;
  const gcX = Math.cos(GC_ANGLE) * GC_DIST;
  const gcY = Math.sin(GC_ANGLE) * GC_DIST;

  // ── Sol's neighborhood (player starts at 0,0) ──
  scenery.push(makePOI('star', 3000, 1500, rng));             // Sol
  pois.push(makePOI('station', -1200, 800, rng));             // nearby station
  scenery.push(makePOI('planet', 4500, -2000, rng));
  pois.push(makePOI('asteroid_field', -3500, -2500, rng));
  scenery.push(makePOI('planet', 6000, 3000, rng));

  // ── Sagittarius A* — supermassive black hole at galactic center ──
  pois.push({ type: 'black_hole', x: gcX, y: gcY, name: 'Sagittarius A*', color: '#000',
    size: 200, extra: { accretionRadius: 500, jets: true } });

  // ── Central bulge — dense cluster around Sagittarius A* ──
  for (let i = 0; i < 25; i++) {
    const r = GALAXY_RADIUS * 0.12 * Math.abs(gaussRng(rng));
    const theta = rng() * 2 * Math.PI;
    const x = gcX + r * Math.cos(theta);
    const y = gcY + r * Math.sin(theta);
    const roll = rng();
    const type = roll < 0.5 ? 'star' : roll < 0.7 ? 'station' : roll < 0.9 ? 'planet' : 'asteroid_field';
    const dest = (type === 'star' || type === 'planet') ? scenery : pois;
    dest.push(makePOI(type, x, y, rng));
  }

  // ── Four major spiral arms ──
  for (let arm = 0; arm < ARM_COUNT; arm++) {
    const armBase = (arm / ARM_COUNT) * 2 * Math.PI;

    for (let i = 0; i < 30; i++) {
      const t = 0.08 + 0.92 * rng();           // 0→1 along the arm
      const r = GALAXY_RADIUS * t;
      const theta = armBase + t * SPIRAL_WINDINGS * 2 * Math.PI;

      // Scatter perpendicular to arm direction
      const scatter = GALAXY_RADIUS * 0.04 * gaussRng(rng);
      const sAngle = theta + Math.PI / 2;

      const x = gcX + r * Math.cos(theta) + scatter * Math.cos(sAngle);
      const y = gcY + r * Math.sin(theta) + scatter * Math.sin(sAngle);

      // Inner arms → more stars; outer → more stations & asteroid fields
      const roll = rng();
      let type;
      if (t < 0.3) {
        type = roll < 0.4 ? 'star' : roll < 0.65 ? 'planet' : roll < 0.85 ? 'station' : 'asteroid_field';
      } else if (t < 0.7) {
        type = roll < 0.25 ? 'star' : roll < 0.5 ? 'planet' : roll < 0.75 ? 'station' : 'asteroid_field';
      } else {
        type = roll < 0.2 ? 'star' : roll < 0.4 ? 'planet' : roll < 0.6 ? 'station' : 'asteroid_field';
      }
      const dest = (type === 'star' || type === 'planet') ? scenery : pois;
      dest.push(makePOI(type, x, y, rng));
    }
  }

  // ── Orion Spur — minor arm between Perseus & Sagittarius, near Sol ──
  const spurAngle = Math.atan2(-gcY, -gcX);
  for (let i = 0; i < 15; i++) {
    const t = 0.4 + 0.35 * rng();
    const r = GALAXY_RADIUS * t;
    const theta = spurAngle + (rng() - 0.5) * 0.5;
    const scatter = GALAXY_RADIUS * 0.03 * gaussRng(rng);
    const sAngle = theta + Math.PI / 2;
    const x = gcX + r * Math.cos(theta) + scatter * Math.cos(sAngle);
    const y = gcY + r * Math.sin(theta) + scatter * Math.sin(sAngle);
    const roll = rng();
    const type = roll < 0.25 ? 'star' : roll < 0.5 ? 'planet' : roll < 0.75 ? 'station' : 'asteroid_field';
    const dest = (type === 'star' || type === 'planet') ? scenery : pois;
    dest.push(makePOI(type, x, y, rng));
  }

  // ── Scattered halo objects ──
  for (let i = 0; i < 10; i++) {
    const r = GALAXY_RADIUS * (0.5 + 0.5 * rng());
    const theta = rng() * 2 * Math.PI;
    const x = gcX + r * Math.cos(theta);
    const y = gcY + r * Math.sin(theta);
    const type = rng() < 0.5 ? 'asteroid_field' : 'star';
    const dest = (type === 'star' || type === 'planet') ? scenery : pois;
    dest.push(makePOI(type, x, y, rng));
  }

  return { pois, scenery, galaxyCenter: { x: gcX, y: gcY } };
}
