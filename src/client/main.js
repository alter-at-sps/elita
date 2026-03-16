// main.js (client)
// Herní smyčka pro Elite 2D

import Ship from './ship.js';
import POI from './poi.js';
import { generateWorld } from './world.js';
import { initializeEconomy } from './economy.js';
import { updateShipPhysics } from './physics.js';
import { renderScene } from './renderer.js';
import { drawHUD, cycleMinimapZoom } from './hud.js';
import { drawPanels, togglePanel, closePanel, getActivePanel, handleTradeKey,
         cycleLedgerSort, toggleLedgerDirection, cycleLedgerFilter } from './panels.js';
import { isDockingActive, startDocking, setDockingMove, updateDocking, drawDocking } from './docking.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const world = generateWorld(20, 100);
initializeEconomy(world.pois);
const ship = new Ship();
ship.x = 0;
ship.y = 0;
ship.setTarget(world.pois[0]);

const input = { thrust: false, rotate: 0 };

// Sort POIs by distance to ship for target cycling
function poisByDistance() {
  return [...world.pois].sort((a, b) => {
    const da = (a.x - ship.x) ** 2 + (a.y - ship.y) ** 2;
    const db = (b.x - ship.x) ** 2 + (b.y - ship.y) ** 2;
    return da - db;
  });
}

const DOCK_RANGE = 80;
const DOCK_MAX_SPEED = 50;
const DOCK_REQUEST_RANGE = 300; // must request docking within this range
const DEFENSE_RANGE = 60; // if inside this without request, get shot
const REFUEL_RATE = 25;

window.addEventListener('keydown', e => {
  // Docking minigame input
  if (isDockingActive()) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') setDockingMove(-1);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') setDockingMove(1);
    return;
  }

  // Panel-specific keys first
  if (getActivePanel()) {
    if (e.code === 'Escape') { closePanel(); return; }
    if (getActivePanel() === 'trade') {
      if (handleTradeKey(e.code, ship)) return;
    }
    if (getActivePanel() === 'ledger') {
      if (e.code === 'KeyL') { cycleLedgerSort(); return; }
      if (e.code === 'KeyK') { toggleLedgerDirection(); return; }
      if (e.code === 'Semicolon') { cycleLedgerFilter(); return; }
    }
    return; // block game keys while panel is open
  }

  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.thrust = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.rotate = -1;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.rotate = 1;
  if (e.code === 'Tab') {
    e.preventDefault();
    const sorted = poisByDistance();
    const curIdx = sorted.indexOf(ship.target);
    const next = (curIdx + 1) % sorted.length;
    ship.setTarget(sorted[next]);
  }
  if (e.code === 'KeyJ') {
    if (!ship.docked && !ship.jumpState && ship.target && ship.fuel >= ship.jumpFuelCost) {
      ship.jumpState = 'charging';
      ship.jumpTimer = 0;
      ship.jumpFrom = { x: ship.x, y: ship.y };
    }
  }
  if (e.code === 'KeyM') {
    cycleMinimapZoom();
  }
  // Docking request: R key
  if (e.code === 'KeyR') {
    if (!ship.docked) {
      const stations = world.pois.filter(p => p.type === 'station');
      for (const st of stations) {
        if (ship.distanceTo(st) < DOCK_REQUEST_RANGE) {
          ship.dockingRequested = st;
          break;
        }
      }
    }
  }
  // Dock/undock: F key
  if (e.code === 'KeyF') {
    if (ship.docked) {
      ship.docked = false;
      ship.dockedAt = null;
      // Keep dockingRequested so station defense doesn't fire on undock
      closePanel();
    } else {
      const stations = world.pois.filter(p => p.type === 'station');
      for (const st of stations) {
        if (ship.distanceTo(st) < DOCK_RANGE && ship.speed < DOCK_MAX_SPEED && ship.dockingRequested === st) {
          // Start docking minigame with current speed as inertia
          const entrySpeed = ship.speed;
          ship.speed = 0;
          startDocking(st, entrySpeed);
          break;
        }
      }
    }
  }
  // Panels
  if (e.code === 'KeyT' && ship.docked) togglePanel('trade');
  if (e.code === 'KeyI') togglePanel('cargo');
  if (e.code === 'KeyP') togglePanel('ledger');
});
window.addEventListener('keyup', e => {
  // Docking minigame key release
  if (isDockingActive()) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') setDockingMove(0);
    return;
  }
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.thrust = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.rotate = 0;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.rotate = 0;
});

// Click to select a POI target
canvas.addEventListener('click', e => {
  const zoom = getZoom();
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const mx = e.clientX;
  const my = e.clientY;

  let bestPoi = null;
  let bestDist = 50; // max click distance in screen pixels

  world.pois.forEach(poi => {
    // POI screen position
    const sx = cx + (poi.x - ship.x) * zoom;
    const sy = cy + (poi.y - ship.y) * zoom;
    const d = Math.hypot(mx - sx, my - sy);
    if (d < bestDist) {
      bestDist = d;
      bestPoi = poi;
    }
  });

  // Also check off-screen markers
  if (!bestPoi) {
    const margin = 40;
    world.pois.forEach(poi => {
      const dx = (poi.x - ship.x) * zoom;
      const dy = (poi.y - ship.y) * zoom;
      if (Math.abs(dx) < cx - 20 && Math.abs(dy) < cy - 20) return; // on screen
      const angle = Math.atan2(dy, dx);
      const edgeX = Math.cos(angle) * (cx - margin);
      const edgeY = Math.sin(angle) * (cy - margin);
      const sx = cx + Math.max(-(cx - margin), Math.min(cx - margin, edgeX));
      const sy = cy + Math.max(-(cy - margin), Math.min(cy - margin, edgeY));
      const d = Math.hypot(mx - sx, my - sy);
      if (d < 30) {
        bestDist = d;
        bestPoi = poi;
      }
    });
  }

  if (bestPoi) ship.setTarget(bestPoi);
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function getZoom() {
  // Gentle zoom out as speed increases
  return Math.max(0.15, 1 / (1 + ship.speed / 50000));
}

let lastTime = performance.now();
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Docking minigame update
  if (isDockingActive()) {
    const dockResult = updateDocking(dt);
    if (dockResult === 'success') {
      // Find the station we were docking at
      const stations = world.pois.filter(p => p.type === 'station');
      for (const st of stations) {
        if (ship.dockingRequested === st && ship.distanceTo(st) < DOCK_RANGE + 50) {
          ship.docked = true;
          ship.dockedAt = st;
          break;
        }
      }
    }
    // On fail — nothing, player stays near station and can try again
    renderScene(ctx, ship, world.pois, getZoom());
    drawDocking(ctx);
    requestAnimationFrame(gameLoop);
    return;
  }

  updateShipPhysics(ship, dt, input);

  // Refuel while docked
  if (ship.docked) {
    ship.fuel = Math.min(ship.maxFuel, ship.fuel + REFUEL_RATE * dt);
  }

  // Station defense check: if too close without docking request — destroy
  if (!ship.docked && !ship.destroyed) {
    const stations = world.pois.filter(p => p.type === 'station');
    for (const st of stations) {
      if (ship.distanceTo(st) < DEFENSE_RANGE && ship.dockingRequested !== st) {
        ship.destroyed = true;
        ship.destroyTimer = 3;
        ship.speed = 0;
        break;
      }
    }
    // Clear docking request once safely outside defense range
    if (ship.dockingRequested && ship.distanceTo(ship.dockingRequested) > DOCK_REQUEST_RANGE) {
      ship.dockingRequested = null;
    }
  }

  // Destroyed state
  if (ship.destroyed) {
    ship.destroyTimer -= dt;
    if (ship.destroyTimer <= 0) {
      // Respawn
      ship.destroyed = false;
      ship.x = 0;
      ship.y = 0;
      ship.speed = 0;
      ship.fuel = 100;
      ship.credits = Math.max(100, ship.credits - 200);
      ship.cargo = {};
      ship.dockingRequested = null;
    }
  }

  // Hyperjump logic
  if (ship.jumpState === 'charging') {
    ship.jumpTimer += dt;
    ship.speed *= 0.9; // slow down during charge
    if (ship.jumpTimer >= ship.jumpChargeTime) {
      // Execute jump — teleport near target
      const t = ship.target;
      const arrivalDist = (t.size || 20) * 3 + 100;
      const angle = Math.atan2(ship.y - t.y, ship.x - t.x);
      ship.x = t.x + Math.cos(angle) * arrivalDist;
      ship.y = t.y + Math.sin(angle) * arrivalDist;
      ship.speed = 0;
      ship.fuel = Math.max(0, ship.fuel - ship.jumpFuelCost);
      ship.jumpState = 'cooldown';
      ship.jumpTimer = 0;
    }
  } else if (ship.jumpState === 'cooldown') {
    ship.jumpTimer += dt;
    if (ship.jumpTimer >= ship.jumpCooldownTime) {
      ship.jumpState = null;
      ship.jumpTimer = 0;
      ship.jumpFrom = null;
    }
  }

  renderScene(ctx, ship, world.pois, getZoom());
  drawHUD(ctx, ship, world.pois, getZoom());
  drawPanels(ctx, ship, world.pois);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
