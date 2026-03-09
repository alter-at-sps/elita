// world.js
// Generování vesmíru

export const SPACE_SCALE = 1e6;
export const POI_TYPES = ['star', 'planet', 'station', 'asteroid_field'];

function randomCoord(range = 100) {
  return (Math.random() - 0.5) * range * SPACE_SCALE;
}

export function generatePOI(type, range = 100) {
  return {
    type,
    x: randomCoord(range),
    y: randomCoord(range),
    name: `${type}_${Math.floor(Math.random() * 10000)}`
  };
}

export function generateWorld(poiCount = 20, range = 100) {
  const pois = [];
  // Place a few POIs nearby so the player can see them immediately
  const nearTypes = ['station', 'planet', 'asteroid_field'];
  for (let i = 0; i < 5; i++) {
    const type = nearTypes[i % nearTypes.length];
    const angle = (i / 5) * 2 * Math.PI;
    const dist = 2000 + Math.random() * 8000;
    pois.push({
      type,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      name: `${type}_near_${i}`
    });
  }
  // Distant POIs
  for (let i = 0; i < poiCount; i++) {
    const type = POI_TYPES[Math.floor(Math.random() * POI_TYPES.length)];
    pois.push(generatePOI(type, range));
  }
  return { pois };
}
