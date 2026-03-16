// economy.js
// Trade goods, station markets, cargo system

export const CARGO_TYPES = [
  { id: 'food',       name: 'Food Rations',    basePrice: 12,  unit: 'SU', category: 'consumables' },
  { id: 'water',      name: 'Purified Water',  basePrice: 8,   unit: 'SU', category: 'consumables' },
  { id: 'medicine',   name: 'Medicine',         basePrice: 45,  unit: 'SU', category: 'consumables' },
  { id: 'metals',     name: 'Industrial Metals',basePrice: 30,  unit: 'SU', category: 'materials' },
  { id: 'rare_metals',name: 'Rare Metals',      basePrice: 120, unit: 'SU', category: 'materials' },
  { id: 'electronics',name: 'Electronics',      basePrice: 65,  unit: 'SU', category: 'tech' },
  { id: 'weapons',    name: 'Weapons',          basePrice: 90,  unit: 'SU', category: 'tech' },
  { id: 'narcotics',  name: 'Narcotics',        basePrice: 140, unit: 'SU', category: 'contraband' },
  { id: 'textiles',   name: 'Textiles',         basePrice: 18,  unit: 'SU', category: 'consumables' },
  { id: 'machinery',  name: 'Machinery',        basePrice: 55,  unit: 'SU', category: 'tech' },
  { id: 'minerals',   name: 'Minerals',         basePrice: 22,  unit: 'SU', category: 'materials' },
  { id: 'luxury',     name: 'Luxury Goods',     basePrice: 160, unit: 'SU', category: 'contraband' },
];

// Seed-based deterministic random for station trade generation
function seededRandom(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Generate a station market based on station position (for spatial correlation)
export function generateStationMarket(station, allStations) {
  const seed = hashString(station.name);
  const rng = seededRandom(seed);

  // Each station carries 5-8 cargo types with buy/sell prices
  const numGoods = 5 + Math.floor(rng() * 4);
  const shuffled = [...CARGO_TYPES].sort(() => rng() - 0.5);
  const available = shuffled.slice(0, numGoods);

  // Regional demand factor based on station position (nearby stations have similar prices)
  const regionX = station.x / 1e7;
  const regionY = station.y / 1e7;

  const market = available.map(cargo => {
    // Regional bias: sin/cos of position creates smooth spatial variation
    const regionalBias = Math.sin(regionX * 0.7 + cargo.basePrice * 0.1) * 0.15
                       + Math.cos(regionY * 0.5 + cargo.basePrice * 0.05) * 0.1;

    // Station-specific noise
    const noise = (rng() - 0.5) * 0.3;

    // Supply/demand multiplier: 0.6 - 1.4 range (not too extreme)
    const demandMul = Math.max(0.6, Math.min(1.4, 1 + regionalBias + noise));

    // Buy price (what station sells to player) — slightly above base
    const buyPrice = Math.round(cargo.basePrice * demandMul * (1.05 + rng() * 0.1));
    // Sell price (what station buys from player) — slightly below base
    const sellPrice = Math.round(cargo.basePrice * demandMul * (0.85 + rng() * 0.1));

    // Stock available to buy
    const stock = 5 + Math.floor(rng() * 30);
    // Demand (how much station wants to buy)
    const demand = 3 + Math.floor(rng() * 25);

    return {
      cargoId: cargo.id,
      name: cargo.name,
      category: cargo.category,
      buyPrice,   // player buys at this price
      sellPrice,  // player sells at this price
      stock,
      demand,
    };
  });

  return market;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Initialize markets for all stations in the world
export function initializeEconomy(pois) {
  const stations = pois.filter(p => p.type === 'station');
  stations.forEach(st => {
    st.market = generateStationMarket(st, stations);
    st.dockingRequests = new Set(); // track who requested docking
    st.hostile = false; // becomes true if player doesn't request
  });
}

// Get cargo type info by id
export function getCargoInfo(cargoId) {
  return CARGO_TYPES.find(c => c.id === cargoId);
}
