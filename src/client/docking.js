// docking.js
// Side-scroller docking minigame

const CORRIDOR_LENGTH = 1200; // total scroll distance
const CORRIDOR_H = 260;       // corridor height in pixels
const SHIP_W = 24;
const SHIP_H = 14;
const THRUST_ACCEL = 300;     // vertical thrust px/sec²
const VERT_DRAG = 2.5;        // vertical velocity damping
const GRAVITY = 120;          // downward pull px/sec² when slow
const GRAVITY_SPEED_THRESH = 80; // scrollSpeed below this → full gravity
const FWD_DRAG = 0.3;         // forward speed decay rate
const MIN_SCROLL_SPEED = 30;  // minimum forward crawl
const MAX_SCROLL_SPEED = 280; // cap
const FWD_THRUST_BOOST = 60;  // W also pushes forward a bit

let active = false;
let station = null;
let shipY = 0;
let shipVY = 0;     // vertical velocity
let scrollX = 0;
let scrollSpeed = 0; // current forward speed (inertia from entry)
let moveDir = 0;    // -1 up, 0, 1 down
let obstacles = [];
let result = null;   // null | 'success' | 'fail'
let resultTimer = 0;
let corridorSeed = 0;
let entrySpeed = 0;  // original ship speed for display

// Seeded random for deterministic corridor per station
function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isDockingActive() { return active; }
export function getDockingResult() { return result; }

export function startDocking(st, shipSpeed) {
  station = st;
  active = true;
  result = null;
  resultTimer = 0;
  scrollX = 0;
  shipY = 0;
  shipVY = 0;
  moveDir = 0;
  // Map game speed to minigame scroll speed (DOCK_MAX_SPEED=50 → ~180px/s)
  entrySpeed = shipSpeed || 0;
  scrollSpeed = Math.max(MIN_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, (entrySpeed / 50) * 180));
  corridorSeed = hashName(st.name);
  generateObstacles();
}

function generateObstacles() {
  obstacles = [];
  const rng = seededRng(corridorSeed);
  const halfH = CORRIDOR_H / 2;
  const count = 8 + Math.floor(rng() * 5);

  for (let i = 0; i < count; i++) {
    const xPos = 200 + (i / count) * (CORRIDOR_LENGTH - 300);
    const side = rng() > 0.5 ? 1 : -1; // top or bottom
    const height = 30 + rng() * 60;
    const width = 20 + rng() * 30;
    const moving = rng() > 0.6;
    const moveAmp = moving ? 20 + rng() * 30 : 0;
    const moveSpeed = 1 + rng() * 1.5;

    obstacles.push({
      x: xPos,
      baseY: side > 0 ? -halfH : halfH - height,
      w: width,
      h: height,
      side,
      moving,
      moveAmp,
      moveSpeed,
      phase: rng() * Math.PI * 2,
    });
  }

  // Add narrowing entry walls
  obstacles.push({ x: 0, baseY: -halfH, w: 30, h: halfH - 40, side: 1, moving: false, moveAmp: 0, moveSpeed: 0, phase: 0 });
  obstacles.push({ x: 0, baseY: 40, w: 30, h: halfH - 40, side: -1, moving: false, moveAmp: 0, moveSpeed: 0, phase: 0 });
}

export function setDockingMove(dir) {
  moveDir = dir;
}

export function updateDocking(dt) {
  if (!active) return null;

  // Result display timer
  if (result) {
    resultTimer += dt;
    if (resultTimer > 1.5) {
      const res = result;
      active = false;
      result = null;
      return res;
    }
    return null;
  }

  // Forward inertia — decays over time
  scrollSpeed -= scrollSpeed * FWD_DRAG * dt;
  // W key also gives a small forward boost
  if (moveDir === -1) scrollSpeed += FWD_THRUST_BOOST * dt;
  scrollSpeed = Math.max(MIN_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, scrollSpeed));
  scrollX += scrollSpeed * dt;

  // Vertical thrust (inertia-based)
  shipVY += moveDir * THRUST_ACCEL * dt;
  // Vertical drag
  shipVY -= shipVY * VERT_DRAG * dt;

  // Gravity — stronger when forward speed is low
  const gravityFactor = Math.max(0, 1 - scrollSpeed / GRAVITY_SPEED_THRESH);
  shipVY += GRAVITY * gravityFactor * dt;

  shipY += shipVY * dt;
  const halfH = CORRIDOR_H / 2;
  // Bounce off walls gently instead of clamping
  if (shipY < -halfH + SHIP_H) { shipY = -halfH + SHIP_H; shipVY = Math.abs(shipVY) * 0.3; }
  if (shipY > halfH - SHIP_H) { shipY = halfH - SHIP_H; shipVY = -Math.abs(shipVY) * 0.3; }

  // Check collision
  const shipLeft = scrollX + 40; // ship is at fixed screen x = 40 offset from scroll
  const shipRight = shipLeft + SHIP_W;
  const shipTop = shipY - SHIP_H / 2;
  const shipBot = shipY + SHIP_H / 2;
  const t = performance.now() / 1000;

  for (const ob of obstacles) {
    const obY = ob.baseY + (ob.moving ? Math.sin(t * ob.moveSpeed + ob.phase) * ob.moveAmp : 0);
    if (shipRight > ob.x && shipLeft < ob.x + ob.w &&
        shipBot > obY && shipTop < obY + ob.h) {
      result = 'fail';
      resultTimer = 0;
      return null;
    }
  }

  // Check corridor wall collision
  if (shipTop < -halfH || shipBot > halfH) {
    result = 'fail';
    resultTimer = 0;
    return null;
  }

  // Success — reached end
  if (scrollX >= CORRIDOR_LENGTH) {
    result = 'success';
    resultTimer = 0;
    return null;
  }

  return null;
}

export function drawDocking(ctx) {
  if (!active) return;

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const halfH = CORRIDOR_H / 2;
  const t = performance.now() / 1000;

  // Darken background
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#4af';
  ctx.textAlign = 'center';
  ctx.fillText(`DOCKING APPROACH — ${station.name}`, cx, cy - halfH - 30);

  // Progress bar
  const progress = Math.min(1, scrollX / CORRIDOR_LENGTH);
  const barW = 300;
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - barW / 2, cy - halfH - 18, barW, 8);
  ctx.fillStyle = '#4af';
  ctx.fillRect(cx - barW / 2 + 1, cy - halfH - 17, (barW - 2) * progress, 6);

  // Viewport: show a window around the ship position
  const viewLeft = scrollX - 60; // ship at ~60px from left edge of view
  const viewW = Math.min(600, W - 100);
  const viewH = CORRIDOR_H;
  const vx = cx - viewW / 2; // viewport screen x
  const vy = cy - viewH / 2; // viewport screen y

  // Clip to viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(vx, vy, viewW, viewH);
  ctx.clip();

  // Corridor background
  ctx.fillStyle = '#111';
  ctx.fillRect(vx, vy, viewW, viewH);

  // Grid lines for depth feel
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx < viewW; gx += 40) {
    const worldX = viewLeft + (gx / viewW) * (viewW + 120);
    const screenX = vx + gx;
    ctx.beginPath();
    ctx.moveTo(screenX, vy);
    ctx.lineTo(screenX, vy + viewH);
    ctx.stroke();
  }

  // Corridor walls (top/bottom borders)
  ctx.fillStyle = '#334';
  ctx.fillRect(vx, vy, viewW, 3);
  ctx.fillRect(vx, vy + viewH - 3, viewW, 3);

  // Draw obstacles
  obstacles.forEach(ob => {
    const obScreenX = vx + (ob.x - viewLeft) * (viewW / (viewW + 120));
    const obW = ob.w * (viewW / (viewW + 120));
    if (obScreenX + obW < vx || obScreenX > vx + viewW) return;

    const moveOffset = ob.moving ? Math.sin(t * ob.moveSpeed + ob.phase) * ob.moveAmp : 0;
    const obScreenY = vy + halfH + ob.baseY + moveOffset;

    // Obstacle body
    ctx.fillStyle = ob.moving ? '#a44' : '#666';
    ctx.fillRect(obScreenX, obScreenY, obW, ob.h);

    // Hazard stripes
    ctx.strokeStyle = ob.moving ? '#f66' : '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(obScreenX, obScreenY, obW, ob.h);
  });

  // Docking bay at end
  const bayX = vx + (CORRIDOR_LENGTH - viewLeft) * (viewW / (viewW + 120));
  if (bayX > vx && bayX < vx + viewW + 40) {
    ctx.fillStyle = '#2a2';
    ctx.fillRect(bayX, vy + halfH - 30, 20, 60);
    ctx.fillStyle = '#4f4';
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3);
    ctx.fillRect(bayX + 2, vy + halfH - 28, 16, 56);
    ctx.globalAlpha = 1;
  }

  // Ship
  const shipScreenX = vx + 60;
  const shipScreenY = vy + halfH + shipY;

  // Engine flame — bigger when thrusting (W), faint when coasting
  const thrusting = moveDir === -1;
  const flameLen = thrusting ? 14 + Math.random() * 10 : 4 + Math.random() * 4;
  const flameW = thrusting ? 5 : 2;
  ctx.fillStyle = thrusting ? '#f80' : '#a64';
  ctx.globalAlpha = thrusting ? 0.9 : 0.4;
  ctx.beginPath();
  ctx.moveTo(shipScreenX - SHIP_W / 2, shipScreenY - flameW);
  ctx.lineTo(shipScreenX - SHIP_W / 2 - flameLen, shipScreenY);
  ctx.lineTo(shipScreenX - SHIP_W / 2, shipScreenY + flameW);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Hull
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(shipScreenX + SHIP_W / 2, shipScreenY);
  ctx.lineTo(shipScreenX - SHIP_W / 2, shipScreenY - SHIP_H / 2);
  ctx.lineTo(shipScreenX - SHIP_W / 2 + 4, shipScreenY);
  ctx.lineTo(shipScreenX - SHIP_W / 2, shipScreenY + SHIP_H / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore(); // unclip

  // Speed indicator
  ctx.font = '11px monospace';
  ctx.fillStyle = scrollSpeed < GRAVITY_SPEED_THRESH ? '#f84' : '#4af';
  ctx.textAlign = 'center';
  ctx.fillText(`SPD ${Math.round(scrollSpeed)}`, cx + viewW / 2 - 30, cy - halfH - 6);
  if (scrollSpeed < GRAVITY_SPEED_THRESH) {
    ctx.fillStyle = '#f44';
    ctx.fillText('⚠ LOW SPEED — GRAVITY', cx, cy + halfH + 38);
  }

  // Controls hint
  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('[W/↑] up + boost  [S/↓] down — avoid obstacles, maintain speed', cx, cy + halfH + 22);

  // Result overlay
  if (result === 'success') {
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#4f4';
    ctx.fillText('DOCKING SUCCESSFUL', cx, cy);
  } else if (result === 'fail') {
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#f44';
    ctx.fillText('DOCKING FAILED', cx, cy);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#faa';
    ctx.fillText('Hull damage — try again', cx, cy + 24);
  }

  ctx.textAlign = 'left';
  ctx.restore();
}
