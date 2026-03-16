export class Planet {
    constructor(x, y, radius, name, shade, hasStation) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.name = name;
        this.shade = shade; // 0-255 grey value
        this.hasStation = hasStation;
        this.gravityStrength = radius * 8;
        this.gravityRange = radius * 6;
        this.dockRange = radius + 40;

        // Surface details - pre-generated craters
        this.craters = [];
        const craterCount = Math.floor(radius / 15) + 2;
        for (let i = 0; i < craterCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            this.craters.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: 3 + Math.random() * (radius * 0.15)
            });
        }
    }

    getGravity(shipX, shipY) {
        const dx = this.x - shipX;
        const dy = this.y - shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.gravityRange || dist < this.radius) return { gx: 0, gy: 0 };

        const force = this.gravityStrength / (dist * dist) * 50;
        return {
            gx: (dx / dist) * force,
            gy: (dy / dist) * force
        };
    }

    canDock(shipX, shipY) {
        const dx = this.x - shipX;
        const dy = this.y - shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.dockRange;
    }

    isColliding(shipX, shipY) {
        const dx = this.x - shipX;
        const dy = this.y - shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + 8;
    }

    draw(ctx) {
        const s = this.shade;

        // Gravity range (subtle indicator)
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius,
            this.x, this.y, this.gravityRange
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0.02)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravityRange, 0, Math.PI * 2);
        ctx.fill();

        // Atmosphere glow
        const atmoGrad = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.8,
            this.x, this.y, this.radius * 1.4
        );
        const is = 255 - s;
        atmoGrad.addColorStop(0, 'rgba(0,0,0,0)');
        atmoGrad.addColorStop(0.5, `rgba(${is},${is},${is},0.1)`);
        atmoGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        const iLighter = Math.max(0, is - 40);
        const bodyGrad = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        bodyGrad.addColorStop(0, `rgb(${iLighter},${iLighter},${iLighter})`);
        bodyGrad.addColorStop(1, `rgb(${is},${is},${is})`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Craters
        const iCrater = Math.min(255, is + 40);
        for (const c of this.craters) {
            ctx.fillStyle = `rgba(${iCrater},${iCrater},${iCrater},0.4)`;
            ctx.beginPath();
            ctx.arc(this.x + c.x, this.y + c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Station indicator
        if (this.hasStation) {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Planet name
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y + this.radius + 30);
    }
}
