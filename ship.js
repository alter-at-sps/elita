export class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2; // pointing up
        this.rotationSpeed = 4;
        this.thrustPower = 300;
        this.maxSpeed = 600;
        this.friction = 0.995;
        this.fuel = 100;
        this.maxFuel = 100;
        this.fuelConsumption = 2;
        this.cargo = [];
        this.docked = false;
        this.dockedPlanet = null;
        this.health = 100;

        // Thrust particles
        this.particles = [];
        this.thrusting = false;

        // Ship sprites
        this.spriteReady = false;
        this.spriteWithJets = new Image();
        this.spriteNoJets = new Image();
        this.spriteWithJets.src = 'src/public/assets/whole space ship.png';
        this.spriteNoJets.src = 'src/public/assets/space ship without jet.png';

        // Invert sprites to white (they're dark on transparent)
        this.invertedWithJets = null;
        this.invertedNoJets = null;

        let loaded = 0;
        const onLoad = () => {
            loaded++;
            if (loaded === 2) {
                this.invertedWithJets = this.invertSprite(this.spriteWithJets);
                this.invertedNoJets = this.invertSprite(this.spriteNoJets);
                this.spriteReady = true;
            }
        };
        this.spriteWithJets.onload = onLoad;
        this.spriteNoJets.onload = onLoad;
    }

    invertSprite(img) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0);
        const data = cx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < data.data.length; i += 4) {
            data.data[i] = 255 - data.data[i];
            data.data[i + 1] = 255 - data.data[i + 1];
            data.data[i + 2] = 255 - data.data[i + 2];
        }
        cx.putImageData(data, 0, 0);
        return c;
    }

    get speed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    update(dt, keys) {
        if (this.docked) return;

        // Rotation
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.angle -= this.rotationSpeed * dt;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.angle += this.rotationSpeed * dt;
        }

        // Thrust
        this.thrusting = false;
        if ((keys['ArrowUp'] || keys['w'] || keys['W']) && this.fuel > 0) {
            this.thrusting = true;
            const ax = Math.cos(this.angle) * this.thrustPower * dt;
            const ay = Math.sin(this.angle) * this.thrustPower * dt;
            this.vx += ax;
            this.vy += ay;
            this.fuel = Math.max(0, this.fuel - this.fuelConsumption * dt);
            this.spawnThrustParticles();
        }

        // Brake
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.vx *= 0.97;
            this.vy *= 0.97;
        }

        // Clamp speed
        const spd = this.speed;
        if (spd > this.maxSpeed) {
            this.vx = (this.vx / spd) * this.maxSpeed;
            this.vy = (this.vy / spd) * this.maxSpeed;
        }

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Move
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Update particles
        this.updateParticles(dt);
    }

    applyGravity(gx, gy) {
        if (this.docked) return;
        this.vx += gx;
        this.vy += gy;
    }

    dock(planet) {
        this.docked = true;
        this.dockedPlanet = planet;
        this.vx = 0;
        this.vy = 0;
        const angle = Math.atan2(this.y - planet.y, this.x - planet.x);
        this.x = planet.x + Math.cos(angle) * (planet.radius + 15);
        this.y = planet.y + Math.sin(angle) * (planet.radius + 15);
        this.angle = angle;
    }

    undock() {
        if (!this.docked) return;
        const planet = this.dockedPlanet;
        const angle = Math.atan2(this.y - planet.y, this.x - planet.x);
        this.vx = Math.cos(angle) * 80;
        this.vy = Math.sin(angle) * 80;
        this.docked = false;
        this.dockedPlanet = null;
    }

    refuel(amount) {
        this.fuel = Math.min(this.maxFuel, this.fuel + amount);
    }

    spawnThrustParticles() {
        const spread = 0.4;
        for (let i = 0; i < 3; i++) {
            const pAngle = this.angle + Math.PI + (Math.random() - 0.5) * spread;
            const speed = 100 + Math.random() * 150;
            this.particles.push({
                x: this.x - Math.cos(this.angle) * 14,
                y: this.y - Math.sin(this.angle) * 14,
                vx: Math.cos(pAngle) * speed + this.vx * 0.3,
                vy: Math.sin(pAngle) * speed + this.vy * 0.3,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.3 + Math.random() * 0.3,
                size: 2 + Math.random() * 3
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.98;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw particles (white/grey)
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            const v = Math.floor(75 - 75 * alpha);
            ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        // Sprites point up (-PI/2), canvas rotation needs +PI/2 offset
        ctx.rotate(this.angle + Math.PI / 2);

        if (this.spriteReady) {
            const sprite = this.thrusting ? this.spriteWithJets : this.spriteNoJets;
            const scale = 0.55;
            const w = sprite.width * scale;
            const h = sprite.height * scale;
            ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
        } else {
            // Fallback shape (white)
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(-10, 12);
            ctx.lineTo(0, 7);
            ctx.lineTo(10, 12);
            ctx.closePath();
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }
}
