// main.js (client)
// Herní smyčka pro Elite 2D

import Ship from './ship.js';
import POI from './poi.js';
import { generateWorld } from './world.js';
import { updateShipPhysics } from './physics.js';
import { renderScene } from './renderer.js';
import { drawHUD } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const world = generateWorld(20, 100);
const ship = new Ship();
ship.x = 0;
ship.y = 0;
ship.setTarget(world.pois[0]);

const input = { thrust: false, rotate: 0 };
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.thrust = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.rotate = -1;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.rotate = 1;
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.thrust = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.rotate = 0;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.rotate = 0;
});

function getZoom() {
  // Gentle zoom out as speed increases
  return Math.max(0.15, 1 / (1 + ship.speed / 50000));
}

let lastTime = performance.now();
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateShipPhysics(ship, dt, input);
  renderScene(ctx, ship, world.pois, getZoom());
  drawHUD(ctx, ship, world.pois, getZoom());

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
