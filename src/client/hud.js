// hud.js
// Uživatelské rozhraní

const AU = 1e6; // 1 AU = 1 000 000 game units

export function drawHUD(ctx, ship, pois, zoom = 1) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#000';
  ctx.font = '16px monospace';
  const speedAU = (ship.speed / AU).toFixed(4);
  ctx.fillText(`Speed: ${speedAU} AU/s`, 20, 30);

  if (ship.target) {
    const distAU = (ship.distanceToTarget() / AU).toFixed(2);
    ctx.fillText(`Target: ${ship.target.name}`, 20, 50);
    ctx.fillText(`Distance: ${distAU} AU`, 20, 70);
  }

  ctx.save();
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

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.translate(ctx.canvas.width - 120, ctx.canvas.height - 120);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, 2 * Math.PI);
  ctx.strokeStyle = '#000';
  ctx.stroke();
  pois.forEach(poi => {
    ctx.beginPath();
    ctx.arc(poi.x / 1e6, poi.y / 1e6, 4, 0, 2 * Math.PI);
    ctx.fillStyle = {
      'star': '#b8860b',
      'planet': '#0077aa',
      'station': '#333',
      'asteroid_field': '#666'
    }[poi.type] || '#333';
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(ship.x / 1e6, ship.y / 1e6, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
