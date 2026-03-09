// renderer.js
// Vykreslování

// Pre-generate fixed background star positions
const BG_STARS = [];
for (let i = 0; i < 400; i++) {
  BG_STARS.push({
    ox: (Math.random() - 0.5) * 20000,
    oy: (Math.random() - 0.5) * 20000,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.4 + 0.1,
  });
}

export function renderScene(ctx, ship, pois, zoom = 1) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Camera transform: center on ship
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-ship.x, -ship.y);

  // Background stars (parallax)
  drawStars(ctx, ship);

  // POIs
  pois.forEach(poi => drawPOI(ctx, poi, ship, zoom));

  // Ship
  drawShip(ctx, ship);

  ctx.restore();

  // Off-screen POI direction markers (drawn in screen space)
  drawPOIMarkers(ctx, ship, pois, zoom);
}

function drawStars(ctx, ship) {
  ctx.save();
  BG_STARS.forEach(s => {
    // Parallax: stars move slower than camera
    const px = s.ox + ship.x * 0.05;
    const py = s.oy + ship.y * 0.05;
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px, py, s.r, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();
}

function drawPOI(ctx, poi, ship, zoom) {
  ctx.save();
  ctx.beginPath();
  // Scale POI circle inversely with zoom so it stays visible
  const radius = Math.max(6, 10 / zoom);
  ctx.arc(poi.x, poi.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = {
    'star': '#b8860b',
    'planet': '#0077aa',
    'station': '#333',
    'asteroid_field': '#666'
  }[poi.type] || '#333';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.font = `${Math.max(10, 12 / zoom)}px monospace`;
  ctx.fillStyle = '#333';
  ctx.fillText(poi.name, poi.x + radius + 4, poi.y + 4);
  ctx.restore();
}

const POI_COLORS = {
  'star': '#b8860b',
  'planet': '#0077aa',
  'station': '#333',
  'asteroid_field': '#666'
};

function drawPOIMarkers(ctx, ship, pois, zoom) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const margin = 40;
  const cx = W / 2;
  const cy = H / 2;

  ctx.save();
  pois.forEach(poi => {
    // POI position relative to ship in screen coords
    const dx = (poi.x - ship.x) * zoom;
    const dy = (poi.y - ship.y) * zoom;

    // Check if on screen
    if (Math.abs(dx) < cx - 20 && Math.abs(dy) < cy - 20) return;

    // Direction angle
    const angle = Math.atan2(dy, dx);
    // Clamp to screen edge
    const edgeX = Math.cos(angle) * (cx - margin);
    const edgeY = Math.sin(angle) * (cy - margin);
    const sx = cx + Math.max(-(cx - margin), Math.min(cx - margin, edgeX));
    const sy = cy + Math.max(-(cy - margin), Math.min(cy - margin, edgeY));

    const color = POI_COLORS[poi.type] || '#333';

    // Arrow
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.fillText(poi.name, sx + 14, sy + 4);
    ctx.restore();
  });
  ctx.restore();
}

function drawShip(ctx, ship) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  // Engine glow
  if (ship.speed > 1) {
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-22 - Math.random() * 8, 0);
    ctx.lineTo(-12, -6);
    ctx.closePath();
    ctx.fillStyle = '#c40';
    ctx.shadowColor = '#c40';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Hull
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, 12);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, -12);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}
