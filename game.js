import { Ship } from './ship.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { HUD } from './hud.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game objects
const ship = new Ship(0, 0);
const camera = new Camera(canvas);
const world = new World();
const hud = new HUD(canvas);

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // Dock / Undock
    if (e.key === 'e' || e.key === 'E') {
        if (ship.docked) {
            ship.undock();
        } else {
            for (const planet of world.planets) {
                if (planet.canDock(ship.x, ship.y)) {
                    ship.dock(planet);
                    break;
                }
            }
        }
    }

    // Refuel at station
    if ((e.key === 'r' || e.key === 'R') && ship.docked && ship.dockedPlanet.hasStation) {
        ship.refuel(25);
    }

    // Undock with space
    if (e.key === ' ' && ship.docked) {
        ship.undock();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Game loop
let lastTime = performance.now();
let gameTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap delta time
    lastTime = timestamp;
    gameTime += dt;

    // Update
    ship.update(dt, keys);

    // Apply gravity from planets
    for (const planet of world.planets) {
        const { gx, gy } = planet.getGravity(ship.x, ship.y);
        ship.applyGravity(gx, gy);

        // Collision with planet surface
        if (!ship.docked && planet.isColliding(ship.x, ship.y)) {
            // Bounce off
            const dx = ship.x - planet.x;
            const dy = ship.y - planet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / dist;
            const ny = dy / dist;

            // Push out
            ship.x = planet.x + nx * (planet.radius + 10);
            ship.y = planet.y + ny * (planet.radius + 10);

            // Reflect velocity
            const dot = ship.vx * nx + ship.vy * ny;
            ship.vx -= 2 * dot * nx * 0.5;
            ship.vy -= 2 * dot * ny * 0.5;

            camera.addShake(3);
        }
    }

    // Camera follow
    camera.follow(ship);

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background - deep space
    ctx.fillStyle = '#FDF7EF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars (drawn in screen space with parallax)
    world.drawStars(ctx, camera, gameTime);

    // World objects (in world space)
    camera.apply(ctx);

    for (const planet of world.planets) {
        planet.draw(ctx);
    }
    ship.draw(ctx);

    camera.restore(ctx);

    // HUD (screen space)
    hud.draw(ctx, ship, world, camera);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
