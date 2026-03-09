export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.shake = 0;
    }

    follow(target) {
        this.x = target.x - this.canvas.width / 2;
        this.y = target.y - this.canvas.height / 2;
    }

    addShake(amount) {
        this.shake = Math.max(this.shake, amount);
    }

    apply(ctx) {
        let offsetX = 0;
        let offsetY = 0;
        if (this.shake > 0.5) {
            offsetX = (Math.random() - 0.5) * this.shake * 2;
            offsetY = (Math.random() - 0.5) * this.shake * 2;
            this.shake *= 0.9;
        } else {
            this.shake = 0;
        }
        ctx.save();
        ctx.translate(-this.x + offsetX, -this.y + offsetY);
    }

    restore(ctx) {
        ctx.restore();
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    }
}
