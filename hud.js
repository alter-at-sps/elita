export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.dockPromptAlpha = 0;
        this.dockPromptTarget = 0;
    }

    draw(ctx, ship, world, camera) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.drawSpeedPanel(ctx, ship, w, h);
        this.drawInfoPanel(ctx, ship, world, w, h);
        this.drawPOIArrows(ctx, ship, world, camera, w, h);
        this.drawDockPrompt(ctx, ship, world, w, h);
    }

    drawSpeedPanel(ctx, ship, w, h) {
        const panelX = 20;
        const panelY = h - 90;
        const panelW = 200;
        const panelH = 70;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.stroke();

        // Speed text
        const speed = Math.round(ship.speed);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SPEED', panelX + 12, panelY + 20);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`${speed}`, panelX + 12, panelY + 48);
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('m/s', panelX + 12 + ctx.measureText(`${speed}`).width + 6, panelY + 48);

        // Speed bar
        const barX = panelX + 120;
        const barY = panelY + 12;
        const barW = 65;
        const barH = 46;
        const fillRatio = Math.min(1, speed / ship.maxSpeed);

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.roundRect(ctx, barX, barY, barW, barH, 4);
        ctx.fill();

        // Filled portion (bottom to top)
        const fillH = barH * fillRatio;
        if (fillRatio > 0) {
            const barGrad = ctx.createLinearGradient(barX, barY + barH, barX, barY);
            barGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
            barGrad.addColorStop(0.7, 'rgba(200,200,200,0.6)');
            barGrad.addColorStop(1, 'rgba(150,150,150,0.4)');
            ctx.fillStyle = barGrad;
            this.roundRect(ctx, barX, barY + barH - fillH, barW, fillH, 4);
            ctx.fill();
        }
    }

    drawInfoPanel(ctx, ship, world, w, h) {
        const panelW = 220;
        const panelX = w - panelW - 20;
        const panelY = h - 130;
        const panelH = 110;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.stroke();

        const x = panelX + 12;
        let y = panelY + 20;

        // Fuel
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('FUEL', x, y);

        const fuelRatio = ship.fuel / ship.maxFuel;
        const fuelBarX = x + 50;
        const fuelBarW = panelW - 74;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.roundRect(ctx, fuelBarX, y - 10, fuelBarW, 14, 3);
        ctx.fill();

        if (fuelRatio > 0) {
            const v = fuelRatio > 0.3 ? 255 : fuelRatio > 0.1 ? 180 : 120;
            ctx.fillStyle = `rgba(${v},${v},${v},0.7)`;
            this.roundRect(ctx, fuelBarX, y - 10, fuelBarW * fuelRatio, 14, 3);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px monospace';
        ctx.fillText(`${Math.round(ship.fuel)}%`, fuelBarX + fuelBarW + 4, y);

        // Cargo
        y += 28;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('CARGO', x, y);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        ctx.fillText(ship.cargo.length > 0 ? ship.cargo.join(', ') : 'Empty', x + 55, y);

        // Status
        y += 28;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('STATUS', x, y);
        ctx.fillStyle = ship.docked ? '#fff' : 'rgba(255,255,255,0.5)';
        ctx.font = '10px monospace';
        if (ship.docked) {
            ctx.fillText(`Docked: ${ship.dockedPlanet.name}`, x + 60, y);
        } else if (ship.fuel <= 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText('NO FUEL', x + 60, y);
        } else {
            ctx.fillText('In Flight', x + 60, y);
        }

        // Nearest planet
        y += 28;
        const { planet: nearest, distance } = world.getNearestPlanet(ship.x, ship.y);
        if (nearest) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('NEAR', x, y);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px monospace';
            ctx.fillText(`${nearest.name} (${Math.round(distance)}m)`, x + 50, y);
        }
    }

    drawPOIArrows(ctx, ship, world, camera, w, h) {
        const margin = 50;
        const arrowSize = 10;

        for (const planet of world.planets) {
            const screen = camera.worldToScreen(planet.x, planet.y);

            if (screen.x > -planet.radius && screen.x < w + planet.radius &&
                screen.y > -planet.radius && screen.y < h + planet.radius) {
                continue;
            }

            const cx = w / 2;
            const cy = h / 2;
            const dx = screen.x - cx;
            const dy = screen.y - cy;
            const angle = Math.atan2(dy, dx);

            let ax, ay;
            const slope = Math.abs(dy / dx);
            const edgeSlope = (h / 2 - margin) / (w / 2 - margin);

            if (slope < edgeSlope) {
                ax = dx > 0 ? w - margin : margin;
                ay = cy + (ax - cx) * Math.tan(angle);
            } else {
                ay = dy > 0 ? h - margin : margin;
                ax = cx + (ay - cy) / Math.tan(angle);
            }

            ax = Math.max(margin, Math.min(w - margin, ax));
            ay = Math.max(margin, Math.min(h - margin, ay));

            const dist = Math.sqrt(
                (planet.x - ship.x) ** 2 + (planet.y - ship.y) ** 2
            );

            // Draw arrow (white)
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(arrowSize, 0);
            ctx.lineTo(-arrowSize, -arrowSize * 0.6);
            ctx.lineTo(-arrowSize * 0.4, 0);
            ctx.lineTo(-arrowSize, arrowSize * 0.6);
            ctx.closePath();

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fill();

            ctx.restore();

            // Label
            const labelOffset = 16;
            const lx = ax + Math.cos(angle + Math.PI) * labelOffset;
            const ly = ay + Math.sin(angle + Math.PI) * labelOffset;

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(planet.name, lx, ly - 4);
            ctx.fillText(`${Math.round(dist)}m`, lx, ly + 8);
        }
    }

    drawDockPrompt(ctx, ship, world, w, h) {
        if (ship.docked) {
            this.dockPromptTarget = 1;
            this.dockPromptAlpha += (this.dockPromptTarget - this.dockPromptAlpha) * 0.1;
            ctx.fillStyle = `rgba(255, 255, 255, ${this.dockPromptAlpha * 0.8})`;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`[E] Undock from ${ship.dockedPlanet.name}`, w / 2, h / 2 + 60);

            if (ship.dockedPlanet.hasStation) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.dockPromptAlpha * 0.6})`;
                ctx.font = '12px monospace';
                ctx.fillText('[R] Refuel', w / 2, h / 2 + 82);
            }
            return;
        }

        let canDock = false;
        for (const planet of world.planets) {
            if (planet.canDock(ship.x, ship.y)) {
                canDock = true;
                this.dockPromptTarget = 1;
                this.dockPromptAlpha += (this.dockPromptTarget - this.dockPromptAlpha) * 0.1;
                ctx.fillStyle = `rgba(255, 255, 255, ${this.dockPromptAlpha * 0.8})`;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`[E] Dock at ${planet.name}`, w / 2, h / 2 + 60);
                break;
            }
        }

        if (!canDock) {
            this.dockPromptTarget = 0;
            this.dockPromptAlpha += (this.dockPromptTarget - this.dockPromptAlpha) * 0.1;
        }
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
