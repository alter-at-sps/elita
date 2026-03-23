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

export function renderScene(ctx, ship, pois, zoom = 1, scenery = []) {
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

  // Scenery (stars, planets — non-interactive, drawn behind POIs)
  scenery.forEach(obj => drawPOI(ctx, obj, ship, zoom));

  // POIs
  pois.forEach(poi => drawPOI(ctx, poi, ship, zoom));

  // Target highlight
  if (ship.target) drawTargetHighlight(ctx, ship.target, zoom);

  // Ship
  drawShip(ctx, ship);

  ctx.restore();

  // Off-screen POI direction markers (drawn in screen space)
  drawPOIMarkers(ctx, ship, pois, zoom);

  // Hyperjump overlay (screen space)
  if (ship.jumpState) drawJumpOverlay(ctx, ship);
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
  const s = Math.max(1, 1 / zoom); // scale factor so things stay visible when zoomed out
  ctx.save();
  ctx.translate(poi.x, poi.y);

  switch (poi.type) {
    case 'star': drawStar(ctx, poi, s); break;
    case 'planet': drawPlanet(ctx, poi, s); break;
    case 'station': drawStation(ctx, poi, s); break;
    case 'asteroid_field': drawAsteroidField(ctx, poi, s); break;
    case 'black_hole': drawBlackHole(ctx, poi, s); break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 6 * s, 0, 2 * Math.PI);
      ctx.fillStyle = poi.color || '#333';
      ctx.fill();
  }

  // Label
  ctx.globalAlpha = 0.85;
  ctx.font = `${Math.max(10, 11 * s)}px monospace`;
  ctx.fillStyle = '#222';
  const labelOffset = (poi.size || 10) * s + 6;
  ctx.fillText(poi.name, labelOffset, 4);

  ctx.restore();
}

// ── Target highlight: animated brackets around selected POI ──
function drawTargetHighlight(ctx, poi, zoom) {
  const s = Math.max(1, 1 / zoom);
  const r = (poi.size || 10) * s + 12;
  const t = performance.now() / 1000;
  const pulse = 1 + 0.08 * Math.sin(t * 3);
  const rr = r * pulse;

  ctx.save();
  ctx.translate(poi.x, poi.y);
  ctx.strokeStyle = '#e44';
  ctx.lineWidth = 1.5 * s;
  ctx.globalAlpha = 0.9;

  // Four corner brackets
  const len = rr * 0.35;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(-rr, -rr + len); ctx.lineTo(-rr, -rr); ctx.lineTo(-rr + len, -rr);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(rr - len, -rr); ctx.lineTo(rr, -rr); ctx.lineTo(rr, -rr + len);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(rr, rr - len); ctx.lineTo(rr, rr); ctx.lineTo(rr - len, rr);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(-rr + len, rr); ctx.lineTo(-rr, rr); ctx.lineTo(-rr, rr - len);
  ctx.stroke();

  ctx.restore();
}

// ── Star: glowing circle with corona rays ──
function drawStar(ctx, poi, s) {
  const r = poi.size * s;
  const t = performance.now() / 1000;

  // Outer glow
  const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2);
  grad.addColorStop(0, poi.color);
  grad.addColorStop(0.4, poi.color + '66');
  grad.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.5 + 0.15 * Math.sin(t * 1.5 + poi.extra.pulse);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2, 0, 2 * Math.PI);
  ctx.fill();

  // Rays
  ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 2);
  ctx.strokeStyle = poi.color;
  ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < poi.extra.rays; i++) {
    const a = (i / poi.extra.rays) * Math.PI * 2 + t * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 2.2, Math.sin(a) * r * 2.2);
    ctx.stroke();
  }

  // Core
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = poi.color;
  ctx.shadowColor = poi.color;
  ctx.shadowBlur = 20 * s;
  ctx.fill();
}

// ── Planet: colored sphere with optional ring ──
function drawPlanet(ctx, poi, s) {
  const r = poi.size * s;

  // Planet body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(poi.color, 40));
  grad.addColorStop(1, poi.color);
  ctx.fillStyle = grad;
  ctx.shadowColor = poi.color;
  ctx.shadowBlur = 6 * s;
  ctx.fill();

  // Shadow (terminator)
  ctx.beginPath();
  ctx.arc(r * 0.15, 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Ring
  if (poi.extra.hasRing) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.8, r * 0.35, 0.3, 0, 2 * Math.PI);
    ctx.strokeStyle = poi.extra.ringColor;
    ctx.lineWidth = 2 * s;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Moons
  const t = performance.now() / 1000;
  for (let m = 0; m < poi.extra.moons; m++) {
    const mAngle = t * (0.4 + m * 0.2) + m * 2;
    const mDist = r * (1.6 + m * 0.5);
    const mx = Math.cos(mAngle) * mDist;
    const my = Math.sin(mAngle) * mDist * 0.5;
    ctx.beginPath();
    ctx.arc(mx, my, 2 * s, 0, 2 * Math.PI);
    ctx.fillStyle = '#999';
    ctx.fill();
  }
}

// ── Station: rotating geometric shape ──
function drawStation(ctx, poi, s) {
  const r = poi.size * s;
  const sides = poi.extra.sides;
  const t = performance.now() / 1000;
  const rot = t * poi.extra.rotationSpeed;

  // Outer ring
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.fillStyle = 'rgba(100,100,100,0.15)';
  ctx.fill();

  // Inner structure
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // Center dot (docking bay)
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * s, 0, 2 * Math.PI);
  ctx.fillStyle = '#e44';
  ctx.shadowColor = '#e44';
  ctx.shadowBlur = 6 * s;
  ctx.fill();
  ctx.restore();
}

// ── Asteroid field: scattered rocks ──
function drawAsteroidField(ctx, poi, s) {
  ctx.globalAlpha = 0.85;
  poi.extra.rocks.forEach(rock => {
    ctx.save();
    ctx.translate(rock.ox * s, rock.oy * s);
    ctx.beginPath();
    const rv = rock.r * s;
    for (let v = 0; v <= rock.verts; v++) {
      const a = (v / rock.verts) * Math.PI * 2;
      const wobble = 0.7 + 0.6 * Math.sin(rock.seed + v * 1.7);
      const px = Math.cos(a) * rv * wobble;
      const py = Math.sin(a) * rv * wobble;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.5 * s;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

// ── Black hole: event horizon + accretion disk + jets ──
function drawBlackHole(ctx, poi, s) {
  const r = poi.size * s;
  const ar = (poi.extra.accretionRadius || 120) * s;
  const t = performance.now() / 1000;

  // Gravitational lensing glow
  const lensGrad = ctx.createRadialGradient(0, 0, r * 1.2, 0, 0, ar * 1.5);
  lensGrad.addColorStop(0, 'rgba(160,60,255,0.3)');
  lensGrad.addColorStop(0.4, 'rgba(100,40,200,0.1)');
  lensGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lensGrad;
  ctx.beginPath();
  ctx.arc(0, 0, ar * 1.5, 0, 2 * Math.PI);
  ctx.fill();

  // Accretion disk (ellipse, rotating)
  ctx.save();
  ctx.rotate(t * 0.15);
  for (let ring = 3; ring >= 0; ring--) {
    const ringR = ar * (0.5 + ring * 0.15);
    const alpha = 0.6 - ring * 0.12;
    const hue = 30 + ring * 20; // orange → yellow
    ctx.beginPath();
    ctx.ellipse(0, 0, ringR, ringR * 0.25, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = `hsla(${hue},100%,60%,${alpha})`;
    ctx.lineWidth = (4 - ring) * 2 * s;
    ctx.stroke();
  }
  ctx.restore();

  // Relativistic jets
  if (poi.extra.jets) {
    const jetLen = ar * 2;
    const flicker = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.globalAlpha = 0.4 * flicker;
    // Top jet
    const jetGrad1 = ctx.createLinearGradient(0, -r, 0, -jetLen);
    jetGrad1.addColorStop(0, 'rgba(140,80,255,0.8)');
    jetGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = jetGrad1;
    ctx.beginPath();
    ctx.moveTo(-3 * s, -r);
    ctx.lineTo(0, -jetLen);
    ctx.lineTo(3 * s, -r);
    ctx.closePath();
    ctx.fill();
    // Bottom jet
    const jetGrad2 = ctx.createLinearGradient(0, r, 0, jetLen);
    jetGrad2.addColorStop(0, 'rgba(140,80,255,0.8)');
    jetGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = jetGrad2;
    ctx.beginPath();
    ctx.moveTo(-3 * s, r);
    ctx.lineTo(0, jetLen);
    ctx.lineTo(3 * s, r);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Event horizon (pure black circle with bright photon ring)
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, 2 * Math.PI);
  ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.2 * Math.sin(t * 2)})`;
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();
}

// Helper: lighten a hex color
function lighten(hex, amount) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

const POI_COLORS = {
  'star': '#b8860b',
  'planet': '#0077aa',
  'station': '#333',
  'asteroid_field': '#666',
  'black_hole': '#a040ff',
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

    const isTarget = poi === ship?.target;
    const color = poi.color || POI_COLORS[poi.type] || '#333';

    // Arrow
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fillStyle = isTarget ? '#e44' : color;
    ctx.globalAlpha = isTarget ? 1 : 0.9;
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.globalAlpha = isTarget ? 1 : 0.7;
    ctx.fillStyle = isTarget ? '#e44' : color;
    ctx.font = isTarget ? 'bold 11px monospace' : '10px monospace';
    ctx.fillText(poi.name, sx + 14, sy + 4);
    ctx.restore();
  });
  ctx.restore();
}

// ── Hyperjump overlay ──
function drawJumpOverlay(ctx, ship) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  if (ship.jumpState === 'charging') {
    const progress = ship.jumpTimer / ship.jumpChargeTime;

    // Tunnel / speed-line effect — radial lines from center
    ctx.save();
    const lineCount = 60;
    for (let i = 0; i < lineCount; i++) {
      const a = (i / lineCount) * Math.PI * 2;
      const innerR = 30 + (1 - progress) * 100;
      const outerR = innerR + progress * Math.max(W, H);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      ctx.strokeStyle = `rgba(80,140,255,${progress * 0.6})`;
      ctx.lineWidth = 1 + progress * 2;
      ctx.stroke();
    }

    // Central glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * progress);
    grad.addColorStop(0, `rgba(100,180,255,${progress * 0.5})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Charge bar at bottom center
    const barW = 200;
    const barH = 6;
    const barX = cx - barW / 2;
    const barY = H - 60;
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#4af';
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * progress, barH - 2);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#4af';
    ctx.textAlign = 'center';
    ctx.fillText('CHARGING HYPERJUMP...', cx, barY - 10);
    ctx.textAlign = 'left';
    ctx.restore();

  } else if (ship.jumpState === 'cooldown') {
    const progress = ship.jumpTimer / ship.jumpCooldownTime;

    // Flash on arrival — white flash fading out
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.7 * (1 - progress));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // "ARRIVED" text
    if (progress < 0.7) {
      ctx.globalAlpha = 1 - progress;
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#4af';
      ctx.textAlign = 'center';
      ctx.fillText('JUMP COMPLETE', cx, cy);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
}

function drawShip(ctx, ship) {
  if (ship.destroyed) {
    // Explosion effect
    ctx.save();
    ctx.translate(ship.x, ship.y);
    const t = 3 - ship.destroyTimer; // 0→3
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
      const a = (i / numParticles) * Math.PI * 2;
      const dist = t * 30 + Math.sin(i * 3) * 10;
      const px = Math.cos(a) * dist;
      const py = Math.sin(a) * dist;
      const r = Math.max(0.5, 4 - t * 1.2);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 2 * Math.PI);
      ctx.fillStyle = t < 1 ? '#f80' : '#a33';
      ctx.globalAlpha = Math.max(0, 1 - t / 3);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

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
