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
    this.thrustPower = 5000; // units/sec^2
    this.target = null; // selected POI
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
}
