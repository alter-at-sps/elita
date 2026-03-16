// docking.js
// Side-scroller docking minigame — short approach + station interior with landing pads

// === Layout constants ===
const APPROACH_LEN = 200;     // short approach section before station entry
const STATION_H = 280;        // inner height of the station
const ENTRY_GAP = 60;         // opening height at entry
const SHIP_W = 24;
const SHIP_H = 14;
const PAD_W = 50;             // landing pad width
const PAD_H = 6;              // pad thickness
const LANDING_TOLERANCE = 8;  // vertical tolerance for landing
const LAND_MAX_VY = 60;       // max vertical speed to land safely
const LAND_MAX_SPEED = 40;    // max forward speed to land

// === Physics constants ===
const THRUST_ACCEL = 280;
const VERT_DRAG = 2.2;
const GRAVITY = 100;
const GRAVITY_SPEED_THRESH = 70;
const FWD_DRAG = 0.35;
const MIN_SCROLL_SPEED = 15;
const MAX_SCROLL_SPEED = 250;
const FWD_THRUST_BOOST = 50;

// === State ===
let active = false;
let station = null;
let shipY = 0;
let shipVY = 0;
let scrollX = 0;
let scrollSpeed = 0;
let moveDir = 0;
let thrustFwd = false;        // W also thrusts forward
let result = null;
let resultTimer = 0;
let resultMsg = '';
let assignedPad = 0;
let pads = [];                // { x, y, w, side:'top'|'bot', number }
let totalLength = 0;          // approach + station interior

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

// How many pads a station has — based on station size
export function getPadCount(st) {
  const sz = st.size || 10;
  // size 8..14 → 2..6 pads
  return Math.max(2, Math.min(8, Math.round(sz * 0.5)));
}

export function isDockingActive() { return active; }
export function getDockingResult() { return result; }

export function startDocking(st, shipSpeed, padNumber) {
  station = st;
  active = true;
  result = null;
  resultTimer = 0;
  resultMsg = '';
  scrollX = 0;
  shipY = 0;
  shipVY = 0;
  moveDir = 0;
  thrustFwd = false;
  assignedPad = padNumber || 1;
  scrollSpeed = Math.max(MIN_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, (shipSpeed / 50) * 150));
  generatePads(st);
}

function generatePads(st) {
  pads = [];
  const count = getPadCount(st);
  const rng = seededRng(hashName(st.name));
  const halfH = STATION_H / 2;

  // Station interior starts after approach
  const interiorStart = APPROACH_LEN + 40;
  // Spread pads evenly across station interior
  const interiorLen = count * (PAD_W + 40) + 60;
  totalLength = interiorStart + interiorLen + 80;

  for (let i = 0; i < count; i++) {
    const side = rng() > 0.5 ? 'bot' : 'top';
    const x = interiorStart + 30 + i * (PAD_W + 40) + rng() * 20;
    const y = side === 'bot' ? halfH - PAD_H : -halfH;
    pads.push({
      x, y, w: PAD_W, h: PAD_H, side, number: i + 1,
    });
  }
}

export function setDockingMove(dir) {
  moveDir = dir;
  // W (dir === -1) also adds forward thrust
  thrustFwd = (dir === -1);
}

export function updateDocking(dt) {
  if (!active) return null;

  if (result) {
    resultTimer += dt;
    if (resultTimer > 2) {
      const res = result;
      active = false;
      result = null;
      return res;
    }
    return null;
  }

  // Forward inertia — decays
  scrollSpeed -= scrollSpeed * FWD_DRAG * dt;
  if (thrustFwd) scrollSpeed += FWD_THRUST_BOOST * dt;
  scrollSpeed = Math.max(MIN_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, scrollSpeed));
  scrollX += scrollSpeed * dt;

  // Vertical thrust
  shipVY += moveDir * THRUST_ACCEL * dt;
  shipVY -= shipVY * VERT_DRAG * dt;

  // Gravity when slow
  const gravFactor = Math.max(0, 1 - scrollSpeed / GRAVITY_SPEED_THRESH);
  shipVY += GRAVITY * gravFactor * dt;

  shipY += shipVY * dt;

  const halfH = STATION_H / 2;
  const shipWorldX = scrollX;
  const shipTop = shipY - SHIP_H / 2;
  const shipBot = shipY + SHIP_H / 2;
  const shipLeft = shipWorldX - SHIP_W / 2;
  const shipRight = shipWorldX + SHIP_W / 2;

  // --- Collision with approach walls (narrowing entry) ---
  if (shipWorldX < APPROACH_LEN + 40) {
    // Entry narrows from large opening to ENTRY_GAP
    const t = Math.max(0, shipWorldX / (APPROACH_LEN + 40));
    const currentHalf = halfH - t * (halfH - ENTRY_GAP / 2);
    // Actually the walls should narrow from outside to ENTRY_GAP
    const wallTopY = -currentHalf;
    const wallBotY = currentHalf;
    if (shipTop < wallTopY || shipBot > wallBotY) {
      result = 'fail';
      resultMsg = 'Hit station wall';
      resultTimer = 0;
      return null;
    }
  } else {
    // Inside station — ceiling and floor
    if (shipTop < -halfH || shipBot > halfH) {
      result = 'fail';
      resultMsg = 'Hit station wall';
      resultTimer = 0;
      return null;
    }

    // Check pad collision — landing or crash
    for (const pad of pads) {
      // Is ship overlapping this pad horizontally?
      if (shipRight > pad.x && shipLeft < pad.x + pad.w) {
        if (pad.side === 'bot') {
          // Floor pad — ship must approach from above
          if (shipBot >= pad.y && shipBot <= pad.y + pad.h + 4) {
            // Touching the pad
            if (pad.number === assignedPad && Math.abs(shipVY) < LAND_MAX_VY && scrollSpeed < LAND_MAX_SPEED) {
              result = 'success';
              resultMsg = `Landed on PAD ${pad.number}`;
              resultTimer = 0;
              return null;
            } else if (pad.number !== assignedPad) {
              result = 'fail';
              resultMsg = `Wrong pad! That's PAD ${pad.number}, not ${assignedPad}`;
              resultTimer = 0;
              return null;
            } else {
              result = 'fail';
              resultMsg = 'Too fast — crash landing';
              resultTimer = 0;
              return null;
            }
          }
        } else {
          // Ceiling pad — ship must approach from below
          if (shipTop <= pad.y + pad.h && shipTop >= pad.y - 4) {
            if (pad.number === assignedPad && Math.abs(shipVY) < LAND_MAX_VY && scrollSpeed < LAND_MAX_SPEED) {
              result = 'success';
              resultMsg = `Landed on PAD ${pad.number}`;
              resultTimer = 0;
              return null;
            } else if (pad.number !== assignedPad) {
              result = 'fail';
              resultMsg = `Wrong pad! That's PAD ${pad.number}, not ${assignedPad}`;
              resultTimer = 0;
              return null;
            } else {
              result = 'fail';
              resultMsg = 'Too fast — crash landing';
              resultTimer = 0;
              return null;
            }
          }
        }
      }
    }
  }

  // Flew past the station — fail
  if (scrollX > totalLength) {
    result = 'fail';
    resultMsg = 'Missed the station — flew too far';
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
  const halfH = STATION_H / 2;
  const t = performance.now() / 1000;

  ctx.save();

  // Darken background
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#4af';
  ctx.textAlign = 'center';
  ctx.fillText(`DOCKING — ${station.name}`, cx, cy - halfH - 40);

  // Assigned pad indicator
  const targetPad = pads.find(p => p.number === assignedPad);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#ff0';
  ctx.fillText(`▸ LAND ON PAD ${assignedPad} (${targetPad ? targetPad.side === 'bot' ? 'FLOOR' : 'CEILING' : '?'})`, cx, cy - halfH - 20);

  // Viewport
  const viewW = Math.min(700, W - 60);
  const viewH = STATION_H;
  const vx = cx - viewW / 2;
  const vy = cy - viewH / 2;
  const shipLocalX = 100; // ship screen position from left

  const worldLeft = scrollX - shipLocalX;
  const worldRight = worldLeft + viewW;

  function w2s(wx) { return vx + (wx - worldLeft); }

  // Clip
  ctx.save();
  ctx.beginPath();
  ctx.rect(vx, vy, viewW, viewH);
  ctx.clip();

  // Background
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(vx, vy, viewW, viewH);

  // --- Draw approach section (narrowing entry) ---
  const entryEnd = APPROACH_LEN + 40;
  for (let px = 0; px < viewW; px += 2) {
    const wx = worldLeft + px;
    if (wx < 0 || wx > entryEnd) continue;

    const tt = Math.max(0, wx / entryEnd);
    const currentHalf = halfH - tt * (halfH - ENTRY_GAP / 2);
    const topY = vy + halfH - currentHalf;
    const botY = vy + halfH + currentHalf;

    // Top wall slice
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(vx + px, vy, 2, topY - vy);
    // Bottom wall slice
    ctx.fillRect(vx + px, botY, 2, vy + viewH - botY);
  }

  // --- Draw station interior (flat walls) ---
  const interiorStartScreen = w2s(entryEnd);
  const interiorEndScreen = w2s(totalLength);
  if (interiorEndScreen > vx && interiorStartScreen < vx + viewW) {
    const isx = Math.max(vx, interiorStartScreen);
    const iew = Math.min(vx + viewW, interiorEndScreen);
    const intW = iew - isx;

    // Ceiling
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(isx, vy, intW, 3);
    // Floor
    ctx.fillRect(isx, vy + viewH - 3, intW, 3);

    // Interior wall texture (horizontal lines)
    ctx.strokeStyle = '#1a1a28';
    ctx.lineWidth = 0.5;
    for (let py = 10; py < viewH; py += 20) {
      ctx.beginPath();
      ctx.moveTo(isx, vy + py);
      ctx.lineTo(iew, vy + py);
      ctx.stroke();
    }
    // Vertical ribs
    for (let rx = isx; rx < iew; rx += 60) {
      ctx.strokeStyle = '#222238';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, vy); ctx.lineTo(rx, vy + 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx, vy + viewH - 10); ctx.lineTo(rx, vy + viewH);
      ctx.stroke();
    }
  }

  // --- Draw landing pads ---
  for (const pad of pads) {
    const sx = w2s(pad.x);
    const sw = PAD_W;
    if (sx + sw < vx || sx > vx + viewW) continue;

    const sy = vy + halfH + pad.y;
    const isTarget = pad.number === assignedPad;

    // Pad surface
    ctx.fillStyle = isTarget ? '#cc0' : '#555';
    ctx.fillRect(sx, sy, sw, PAD_H);

    // Pad border
    ctx.strokeStyle = isTarget ? '#ff0' : '#777';
    ctx.lineWidth = isTarget ? 2 : 1;
    ctx.strokeRect(sx, sy, sw, PAD_H);

    // Guide lights on target pad
    if (isTarget) {
      const blink = Math.sin(t * 4) > 0;
      if (blink) {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(sx + 4, sy + PAD_H / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + sw - 4, sy + PAD_H / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Approach arrow
      const arrowY = pad.side === 'bot' ? sy - 20 : sy + PAD_H + 20;
      const arrowDir = pad.side === 'bot' ? 1 : -1;
      ctx.fillStyle = `rgba(255,255,0,${0.4 + 0.3 * Math.sin(t * 3)})`;
      ctx.beginPath();
      ctx.moveTo(sx + sw / 2 - 6, arrowY);
      ctx.lineTo(sx + sw / 2 + 6, arrowY);
      ctx.lineTo(sx + sw / 2, arrowY + 10 * arrowDir);
      ctx.closePath();
      ctx.fill();
    }

    // Pad number label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isTarget ? '#ff0' : '#888';
    ctx.textAlign = 'center';
    const labelY = pad.side === 'bot' ? sy - 4 : sy + PAD_H + 12;
    ctx.fillText(`${pad.number}`, sx + sw / 2, labelY);
  }

  // --- Draw ship ---
  const shipScreenX = vx + shipLocalX;
  const shipScreenY = vy + halfH + shipY;

  // Engine flame
  const thrusting = moveDir !== 0;
  const flameLen = thrustFwd ? 14 + Math.random() * 10 : (thrusting ? 6 : 3 + Math.random() * 3);
  const flameW2 = thrustFwd ? 5 : 2;
  ctx.fillStyle = thrustFwd ? '#f80' : '#a64';
  ctx.globalAlpha = thrustFwd ? 0.9 : 0.3;
  ctx.beginPath();
  ctx.moveTo(shipScreenX - SHIP_W / 2, shipScreenY - flameW2);
  ctx.lineTo(shipScreenX - SHIP_W / 2 - flameLen, shipScreenY);
  ctx.lineTo(shipScreenX - SHIP_W / 2, shipScreenY + flameW2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Vertical thruster indicators
  if (moveDir === -1) {
    ctx.fillStyle = '#48f';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(shipScreenX - 3, shipScreenY + SHIP_H / 2, 6, 4 + Math.random() * 3);
    ctx.globalAlpha = 1;
  } else if (moveDir === 1) {
    ctx.fillStyle = '#48f';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(shipScreenX - 3, shipScreenY - SHIP_H / 2 - 4 - Math.random() * 3, 6, 4);
    ctx.globalAlpha = 1;
  }

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
  ctx.fillText(`SPD ${Math.round(scrollSpeed)}`, cx + viewW / 2 - 40, cy - halfH - 44);

  if (scrollSpeed < GRAVITY_SPEED_THRESH) {
    ctx.fillStyle = '#f44';
    ctx.font = '10px monospace';
    ctx.fillText('⚠ LOW SPEED — GRAVITY', cx, cy + halfH + 36);
  }

  // Controls hint
  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('[W/↑] up + boost  [S/↓] down — land gently on your assigned pad', cx, cy + halfH + 18);

  // Result overlay
  if (result === 'success') {
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#4f4';
    ctx.fillText('DOCKING SUCCESSFUL', cx, cy - 8);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#8f8';
    ctx.fillText(resultMsg, cx, cy + 14);
  } else if (result === 'fail') {
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#f44';
    ctx.fillText('DOCKING FAILED', cx, cy - 8);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#faa';
    ctx.fillText(resultMsg, cx, cy + 14);
  }

  ctx.textAlign = 'left';
  ctx.restore();
}
