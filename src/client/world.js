// world.js
// Generování vesmíru

export const SPACE_SCALE = 1e6;
export const POI_TYPES = ['star', 'planet', 'station', 'asteroid_field'];

// Name lists for realistic naming
const STAR_NAMES = ['Sol', 'Alpha Centauri', 'Sirius', 'Betelgeuse', 'Vega', 'Polaris', 'Rigel', 'Altair', 'Deneb', 'Arcturus', 'Capella', 'Procyon', 'Aldebaran', 'Antares', 'Spica', 'Fomalhaut', 'Regulus', 'Canopus', 'Achernar', 'Bellatrix'];
const PLANET_NAMES = ['Kepler-442b', 'Gliese 581d', 'Proxima b', 'Trappist-1e', 'HD 40307g', 'Tau Ceti e', 'Wolf 1061c', 'Ross 128 b', 'LHS 1140b', 'K2-18b', 'Novus', 'Erebos', 'Calypso', 'Tethys', 'Ixion', 'Phobos Prime', 'Elara', 'Nereid', 'Triton IV', 'Oberon V'];
const STATION_NAMES = ['Coriolis Hub', 'Orbis Gateway', 'Ocellus Dock', 'Jameson Memorial', 'Hutton Orbital', 'Lave Station', 'Daedalus Port', 'Gagarin Terminal', 'Armstrong Base', 'Tycho Outpost', 'Copernicus Relay', 'Kepler Waypoint', 'Sagan Depot', 'Hawking Platform', 'Vostok Array'];
const ASTEROID_NAMES = ['Belt Alpha', 'Kuiper Cluster', 'Oort Fragment', 'Hera Field', 'Trojan Drift', 'Debris Ring Zeta', 'Iron Scatter', 'Ceres Belt', 'Pallas Field', 'Juno Cluster', 'Vesta Ring', 'Hygiea Drift', 'Europa Debris', 'Titan Scatter', 'Io Fragment'];

const STAR_COLORS = ['#fff5c0', '#ffe0a0', '#ffcc60', '#ff9944', '#ff6633', '#aaccff', '#eeeeff'];
const PLANET_COLORS = ['#4488cc', '#44aa66', '#cc8844', '#aa5533', '#7766aa', '#558899', '#889944', '#cc6677'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCoord(range = 100) {
  return (Math.random() - 0.5) * range * SPACE_SCALE;
}

let nameCounters = { star: 0, planet: 0, station: 0, asteroid_field: 0 };

function makePOI(type, x, y) {
  const i = nameCounters[type]++;
  let name, color, size, extra;

  switch (type) {
    case 'star':
      name = STAR_NAMES[i % STAR_NAMES.length];
      color = STAR_COLORS[i % STAR_COLORS.length];
      size = 30 + Math.random() * 40; // big glowing body
      extra = { rays: 4 + Math.floor(Math.random() * 5), pulse: Math.random() * 2 };
      break;
    case 'planet':
      name = PLANET_NAMES[i % PLANET_NAMES.length];
      color = PLANET_COLORS[i % PLANET_COLORS.length];
      size = 14 + Math.random() * 20;
      extra = { hasRing: Math.random() > 0.5, ringColor: '#aaa', moons: Math.floor(Math.random() * 3) };
      break;
    case 'station':
      name = STATION_NAMES[i % STATION_NAMES.length];
      color = '#888';
      size = 8 + Math.random() * 6;
      extra = { sides: 6 + Math.floor(Math.random() * 3), rotationSpeed: 0.3 + Math.random() * 0.5 };
      break;
    case 'asteroid_field':
      name = ASTEROID_NAMES[i % ASTEROID_NAMES.length];
      color = '#777';
      size = 40 + Math.random() * 30;
      // Pre-generate asteroid positions within the field
      const rocks = [];
      const count = 8 + Math.floor(Math.random() * 12);
      for (let r = 0; r < count; r++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * size;
        rocks.push({
          ox: Math.cos(a) * d,
          oy: Math.sin(a) * d,
          r: 1.5 + Math.random() * 4,
          verts: 5 + Math.floor(Math.random() * 4),
          seed: Math.random() * 100,
        });
      }
      extra = { rocks };
      break;
  }

  return { type, x, y, name, color, size, extra };
}

export function generateWorld(poiCount = 20, range = 100) {
  nameCounters = { star: 0, planet: 0, station: 0, asteroid_field: 0 };
  const pois = [];

  // Place a few POIs nearby so the player can see them immediately
  const nearDefs = [
    { type: 'star', dist: 4000 },
    { type: 'station', dist: 1500 },
    { type: 'planet', dist: 3000 },
    { type: 'asteroid_field', dist: 2500 },
    { type: 'planet', dist: 5000 },
  ];
  for (let i = 0; i < nearDefs.length; i++) {
    const { type, dist } = nearDefs[i];
    const angle = (i / nearDefs.length) * 2 * Math.PI;
    const d = dist + Math.random() * 2000;
    pois.push(makePOI(type, Math.cos(angle) * d, Math.sin(angle) * d));
  }

  // Distant POIs
  for (let i = 0; i < poiCount; i++) {
    const type = POI_TYPES[Math.floor(Math.random() * POI_TYPES.length)];
    pois.push(makePOI(type, randomCoord(range), randomCoord(range)));
  }
  return { pois };
}
