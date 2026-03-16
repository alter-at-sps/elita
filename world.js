import { Planet } from './planet.js';

export class World {
    constructor() {
        this.planets = [];
        this.stars = [];
        this.generateStars();
        this.generatePlanets();
    }

    generateStars() {
        const layers = [
            { count: 300, speedFactor: 0.1, sizeRange: [0.5, 1.5], alpha: 0.3 },
            { count: 200, speedFactor: 0.3, sizeRange: [1, 2], alpha: 0.5 },
            { count: 100, speedFactor: 0.5, sizeRange: [1.5, 3], alpha: 0.8 },
        ];

        for (const layer of layers) {
            const stars = [];
            for (let i = 0; i < layer.count; i++) {
                stars.push({
                    x: Math.random() * 4000 - 2000,
                    y: Math.random() * 4000 - 2000,
                    size: layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]),
                    alpha: layer.alpha * (0.5 + Math.random() * 0.5),
                    twinkleSpeed: 1 + Math.random() * 3,
                    twinkleOffset: Math.random() * Math.PI * 2
                });
            }
            this.stars.push({ stars, speedFactor: layer.speedFactor });
        }
    }

    generatePlanets() {
        // Shades of grey instead of colors (0=black, 255=white)
        const planetData = [
            { x: 500, y: -300, radius: 60, name: 'Kepler-7b', shade: 180, hasStation: true },
            { x: -800, y: 600, radius: 45, name: 'Proxima', shade: 100, hasStation: false },
            { x: 1200, y: 800, radius: 80, name: 'Nova Prime', shade: 200, hasStation: true },
            { x: -400, y: -900, radius: 35, name: 'Dusk', shade: 60, hasStation: false },
            { x: 1800, y: -500, radius: 55, name: 'Helios', shade: 220, hasStation: true },
            { x: -1500, y: -200, radius: 70, name: 'Glacius', shade: 150, hasStation: false },
            { x: 600, y: 1500, radius: 50, name: 'Ember', shade: 130, hasStation: true },
            { x: -1200, y: 1200, radius: 90, name: 'Titan Rex', shade: 170, hasStation: true },
        ];

        for (const p of planetData) {
            this.planets.push(new Planet(p.x, p.y, p.radius, p.name, p.shade, p.hasStation));
        }
    }

    drawStars(ctx, camera, time) {
        for (const layer of this.stars) {
            for (const star of layer.stars) {
                const px = star.x - camera.x * layer.speedFactor;
                const py = star.y - camera.y * layer.speedFactor;

                const w = ctx.canvas.width;
                const h = ctx.canvas.height;
                const sx = ((px % w) + w) % w;
                const sy = ((py % h) + h) % h;

                const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
                const alpha = star.alpha * (0.6 + 0.4 * twinkle);

                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    getNearestPlanet(x, y) {
        let nearest = null;
        let minDist = Infinity;
        for (const planet of this.planets) {
            const dx = planet.x - x;
            const dy = planet.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = planet;
            }
        }
        return { planet: nearest, distance: minDist };
    }
}
