// ship.js
// Hráčská loď

export default class Ship {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.angle = 0; // radians
    this.speed = 0;
    this.vx = 0;
    this.vy = 0;
    this.rotationSpeed = Math.PI; // radians/sec
    this.thrustPower = 1500; // units/sec^2
    this.target = null; // selected POI
    this.fuel = 100; // 0-100
    this.maxFuel = 100;
    this.fuelConsumption = 0.8; // per second while thrusting
    this.docked = false;
    this.dockedAt = null;
    // Hyperjump
    this.jumpState = null; // null | 'charging' | 'jumping' | 'cooldown'
    this.jumpTimer = 0;
    this.jumpFuelCost = 15; // fuel per jump
    this.jumpChargeTime = 2.5; // seconds to charge
    this.jumpCooldownTime = 1.5;
    this.jumpFrom = null; // {x,y} origin for animation
    // Cargo
    this.cargo = {}; // { cargoId: quantity }
    this.cargoCapacity = 40; // max SU
    this.credits = 500; // starting money
    // Docking request
    this.dockingRequested = null; // station reference or null
    this.destroyed = false;
    this.destroyTimer = 0;
  }

  setTarget(poi) {
    this.target = poi;
  }

  distanceToTarget() {
    if (!this.target) return null;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceTo(poi) {
    const dx = poi.x - this.x;
    const dy = poi.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  cargoUsed() {
    let total = 0;
    for (const id in this.cargo) total += this.cargo[id];
    return total;
  }

  cargoFree() {
    return this.cargoCapacity - this.cargoUsed();
  }

  addCargo(cargoId, qty) {
    if (qty > this.cargoFree()) return false;
    this.cargo[cargoId] = (this.cargo[cargoId] || 0) + qty;
    return true;
  }

  removeCargo(cargoId, qty) {
    if ((this.cargo[cargoId] || 0) < qty) return false;
    this.cargo[cargoId] -= qty;
    if (this.cargo[cargoId] <= 0) delete this.cargo[cargoId];
    return true;
  }
}
