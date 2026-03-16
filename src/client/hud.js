// hud.js
// Uživatelské rozhraní

const AU = 1e6; // 1 AU = 1 000 000 game units

export function drawHUD(ctx, ship, pois, zoom = 1) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Destruction overlay
  if (ship.destroyed) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#200';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#f44';
    ctx.textAlign = 'center';
    ctx.fillText('DESTROYED', W / 2, H / 2 - 20);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#faa';
    ctx.fillText('Station defenses opened fire — no docking clearance', W / 2, H / 2 + 20);
    ctx.fillText(`Respawning in ${Math.ceil(ship.destroyTimer)}s... (-200 SU penalty)`, W / 2, H / 2 + 50);
    ctx.textAlign = 'left';
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#000';
  ctx.font = '16px monospace';
  const speedAU = (ship.speed / AU).toFixed(4);
  ctx.fillText(`Speed: ${speedAU} AU/s`, 20, 30);

  // Credits + cargo summary (top-right area below compass)
  ctx.font = '13px monospace';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'right';
  ctx.fillText(`${ship.credits} SU`, W - 120, 120);
  ctx.fillText(`Cargo: ${ship.cargoUsed()}/${ship.cargoCapacity}`, W - 120, 138);
  ctx.textAlign = 'left';

  // Fuel bar
  const fuelW = 160;
  const fuelH = 12;
  const fuelX = 20;
  const fuelY = 108;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(fuelX, fuelY, fuelW, fuelH);
  const fuelPct = ship.fuel / ship.maxFuel;
  const fuelColor = fuelPct > 0.3 ? '#2a2' : (fuelPct > 0.1 ? '#da0' : '#e33');
  ctx.fillStyle = fuelColor;
  ctx.fillRect(fuelX + 1, fuelY + 1, (fuelW - 2) * fuelPct, fuelH - 2);
  ctx.fillStyle = '#000';
  ctx.font = '12px monospace';
  ctx.fillText(`Fuel: ${Math.round(ship.fuel)}%`, fuelX + fuelW + 8, fuelY + 11);

  // Docking status
  if (ship.docked) {
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#2a2';
    ctx.fillText(`⚓ DOCKED at ${ship.dockedAt.name}`, 20, 148);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.fillText('[F] undock  [T] trade  [I] cargo  [P] ledger', 20, 166);
    ctx.globalAlpha = 0.9;
  } else {
    // Check if near a station for docking prompt
    const stations = pois.filter(p => p.type === 'station');
    for (const st of stations) {
      const d = ship.distanceTo(st);
      if (d < 300) {
        ctx.font = '13px monospace';
        const requested = ship.dockingRequested === st;
        if (requested && d < 80 && ship.speed < 50) {
          ctx.fillStyle = '#2a2';
          ctx.fillText(`[F] Dock at ${st.name}`, 20, 148);
        } else if (requested) {
          ctx.fillStyle = '#28a';
          ctx.fillText(`Docking cleared — approach ${st.name} slowly`, 20, 148);
        } else if (d < 60) {
          ctx.fillStyle = '#e33';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`⚠ NO DOCKING CLEARANCE — station will open fire!`, 20, 148);
          ctx.font = '12px monospace';
          ctx.fillStyle = '#e33';
          ctx.fillText(`[R] Request docking NOW`, 20, 166);
        } else {
          ctx.fillStyle = '#999';
          ctx.fillText(`[R] Request docking at ${st.name}`, 20, 148);
        }
        break;
      }
    }
  }

  if (ship.target) {
    const distAU = (ship.distanceToTarget() / AU).toFixed(2);
    const idx = pois.indexOf(ship.target) + 1;
    ctx.fillStyle = '#e44';
    ctx.fillText(`▶ ${ship.target.name}`, 20, 55);
    ctx.fillStyle = '#000';
    ctx.fillText(`Distance: ${distAU} AU`, 20, 75);
    ctx.globalAlpha = 0.4;
    ctx.font = '12px monospace';
    ctx.fillText(`[Tab] switch target (${idx}/${pois.length})`, 20, 95);
  }

  // Jump status
  if (ship.jumpState === 'charging') {
    ctx.fillStyle = '#4af';
    ctx.font = 'bold 14px monospace';
    ctx.globalAlpha = 0.9;
    const pct = Math.round((ship.jumpTimer / ship.jumpChargeTime) * 100);
    ctx.fillText(`⚡ Hyperjump charging: ${pct}%`, 20, 185);
  } else if (!ship.docked && ship.target && ship.fuel >= ship.jumpFuelCost && !ship.jumpState) {
    ctx.globalAlpha = 0.35;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(`[J] Hyperjump to target (-${ship.jumpFuelCost}% fuel)`, 20, 185);
  } else if (!ship.docked && ship.target && ship.fuel < ship.jumpFuelCost && !ship.jumpState) {
    ctx.globalAlpha = 0.35;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#e33';
    ctx.fillText(`Not enough fuel to jump`, 20, 185);
  }

  // ── Compass ──
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(ctx.canvas.width - 60, 60);
  ctx.rotate(ship.angle);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, 2 * Math.PI);
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(0, 0);
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.restore();

  // ── Enhanced Minimap ──
  drawMinimap(ctx, ship, pois);

  ctx.restore();
}

const TYPE_SYMBOLS = {
  star: '★',
  planet: '●',
  station: '◆',
  asteroid_field: '▪',
};

let minimapZoomLevel = 0; // 0=auto, 1=near, 2=mid, 3=far
const MINIMAP_ZOOM_RANGES = [0, 20000, 200000, 5e7]; // world units radius

export function cycleMinimapZoom() {
  minimapZoomLevel = (minimapZoomLevel + 1) % MINIMAP_ZOOM_RANGES.length;
}

function drawMinimap(ctx, ship, pois) {
  const R = 110; // minimap radius
  const mx = ctx.canvas.width - R - 15;
  const my = ctx.canvas.height - R - 15;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(mx, my);

  // Background
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Determine range (auto or fixed)
  let range;
  if (minimapZoomLevel === 0) {
    // Auto: fit nearest 5 POIs or target, whichever is farther
    const dists = pois.map(p => Math.hypot(p.x - ship.x, p.y - ship.y));
    dists.sort((a, b) => a - b);
    const targetDist = ship.target ? Math.hypot(ship.target.x - ship.x, ship.target.y - ship.y) : 0;
    range = Math.max(dists[Math.min(4, dists.length - 1)] || 10000, targetDist, 5000) * 1.3;
  } else {
    range = MINIMAP_ZOOM_RANGES[minimapZoomLevel];
  }
  const scale = (R - 10) / range;

  // Range rings
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    const rr = (R - 10) * (i / 3);
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Range label
  const rangeAU = (range / 1e6).toFixed(range > 1e6 ? 1 : 4);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#999';
  ctx.textAlign = 'right';
  ctx.fillText(`${rangeAU} AU`, R - 4, -R + 12);
  ctx.textAlign = 'left';

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R - 2, 0, 2 * Math.PI);
  ctx.clip();

  // Draw POIs
  pois.forEach(poi => {
    const dx = (poi.x - ship.x) * scale;
    const dy = (poi.y - ship.y) * scale;
    const dist = Math.hypot(dx, dy);

    // Clamp to edge if outside radius
    let px = dx, py = dy;
    if (dist > R - 6) {
      px = (dx / dist) * (R - 6);
      py = (dy / dist) * (R - 6);
    }

    const isTarget = poi === ship.target;
    const dotR = isTarget ? 5 : 3;

    ctx.beginPath();
    ctx.arc(px, py, dotR, 0, 2 * Math.PI);
    ctx.fillStyle = isTarget ? '#e44' : (poi.color || '#555');
    ctx.fill();

    // Target ring
    if (isTarget) {
      ctx.beginPath();
      ctx.arc(px, py, dotR + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  ctx.restore(); // unclip

  // Ship in center + direction indicator
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Ship heading line
  const hx = Math.cos(ship.angle) * 14;
  const hy = Math.sin(ship.angle) * 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hx, hy);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Zoom level label
  const zoomLabels = ['AUTO', 'NEAR', 'MID', 'FAR'];
  ctx.font = '9px monospace';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText(zoomLabels[minimapZoomLevel], 0, R - 3);
  ctx.fillText('[M] zoom', 0, R + 10);
  ctx.textAlign = 'left';

  ctx.restore();
}
