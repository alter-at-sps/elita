// physics.js
// Výpočet pohybu a rychlosti

export const MAX_SPEED = 500000; // units/sec
export const ACCELERATION = 0.012; // exponential factor
export const DECELERATION = 0.015; // exponential factor

export function updateShipPhysics(ship, dt, input) {
  if (ship.destroyed) return;
  // input: { thrust: boolean, rotate: number (-1..1) }
  // dt: delta time in seconds

  // Rotation (blocked during jump)
  if (ship.jumpState !== 'charging') {
    ship.angle += input.rotate * ship.rotationSpeed * dt;
    ship.angle %= 2 * Math.PI;
  }

  // Exponential acceleration
  if (input.thrust && !ship.docked && ship.fuel > 0 && !ship.jumpState) {
    ship.speed = Math.min(
      ship.speed * (1 + ACCELERATION) + ship.thrustPower * dt,
      MAX_SPEED
    );
    ship.fuel = Math.max(0, ship.fuel - ship.fuelConsumption * dt);
  } else {
    // Exponential deceleration (inertia)
    ship.speed = Math.max(
      ship.speed * (1 - DECELERATION),
      0
    );
  }

  // If docked, force stop
  if (ship.docked) {
    ship.speed = 0;
    ship.vx = 0;
    ship.vy = 0;
    return;
  }

  // Update position by vector
  ship.vx = Math.cos(ship.angle) * ship.speed;
  ship.vy = Math.sin(ship.angle) * ship.speed;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}
