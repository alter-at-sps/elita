// physics.js
// Výpočet pohybu a rychlosti

export const MAX_SPEED = 500000; // units/sec
export const ACCELERATION = 0.04; // exponential factor
export const DECELERATION = 0.02; // exponential factor;

export function updateShipPhysics(ship, dt, input) {
  // input: { thrust: boolean, rotate: number (-1..1) }
  // dt: delta time in seconds

  // Rotation
  ship.angle += input.rotate * ship.rotationSpeed * dt;
  ship.angle %= 2 * Math.PI;

  // Exponential acceleration
  if (input.thrust) {
    ship.speed = Math.min(
      ship.speed * (1 + ACCELERATION) + ship.thrustPower * dt,
      MAX_SPEED
    );
  } else {
    // Exponential deceleration (inertia)
    ship.speed = Math.max(
      ship.speed * (1 - DECELERATION),
      0
    );
  }

  // Update position by vector
  ship.vx = Math.cos(ship.angle) * ship.speed;
  ship.vy = Math.sin(ship.angle) * ship.speed;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}
