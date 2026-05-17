const ITEM_ICONS = {
    Apple: '🍎', TreeEntity: '🌲', AIEntity: '🐷',
    PlayerEntity: '🧑', Wood: '🪵', Axe: '🪓',
    Sapling: '🌱', SignEntity: '📋',
    Stone: '🪨', Seed: '🌰', Carrot: '🥕',
};

/* Biome colours for ground tiles */
const BIOMES = {
    grassland: { bg: '#3a5a3a', line: 'rgba(255,255,255,0.06)' },
    forest:    { bg: '#2d4a2d', line: 'rgba(255,255,255,0.06)' },
    desert:    { bg: '#7a7a4a', line: 'rgba(255,255,255,0.06)' },
    snow:      { bg: '#5a6a7a', line: 'rgba(255,255,255,0.06)' },
};

function getBiome(i, j) {
    if (j < -15) return 'snow';
    if (j > 20)  return 'desert';
    if (i < -15 || i > 15) return 'forest';
    return 'grassland';
}

export class Viewer {
    constructor(canvas, grid, player, cellSize) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid = grid;
        this.player = player;
        this.cellSize = cellSize;
        this.spriteCache = new Map();
    }

    /* ============================================================
       Sprites
       ============================================================ */

    _genSprite(type, color, label) {
        const s = this.cellSize, c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(2, 2, s - 2, s - 2);
        ctx.fillStyle = color; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, 0, 3, s);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, s, s);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(s * 0.45)}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, s / 2, s / 2);
        this.spriteCache.set(type, c);
        return c;
    }

    _genPlayerSprite(dir) {
        const s = this.cellSize, c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#4A90D9'; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        const cx = s / 2, cy = s / 2, r = s * 0.3;
        ctx.beginPath();
        switch (dir) {
            case 'up':    ctx.moveTo(cx, cy - r); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy); break;
            case 'down':  ctx.moveTo(cx, cy + r); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy); break;
            case 'left':  ctx.moveTo(cx - r, cy); ctx.lineTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.7); break;
            case 'right': ctx.moveTo(cx + r, cy); ctx.lineTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.7); break;
            default:      ctx.moveTo(cx, cy + r); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, 0, 3, s);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, s, s);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(s * 0.38)}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('玩', cx, cy + s * 0.02);
        this.spriteCache.set('PlayerEntity_' + dir, c);
        return c;
    }

    _sprite(entity) {
        if (entity.type === 'PlayerEntity') {
            const dir = entity.direction || 'down', key = 'PlayerEntity_' + dir;
            if (this.spriteCache.has(key)) return this.spriteCache.get(key);
            return this._genPlayerSprite(dir);
        }
        if (entity.type === 'ItemEntity') {
            const key = 'ItemEntity_' + entity.itemType;
            if (this.spriteCache.has(key)) return this.spriteCache.get(key);
            return this._genSprite(key, entity.color, entity.label);
        }
        if (entity.type === 'FarmlandEntity') {
            const key = 'FarmlandEntity_' + entity.label;
            if (this.spriteCache.has(key)) return this.spriteCache.get(key);
            return this._genSprite(key, entity.color, entity.label);
        }
        if (this.spriteCache.has(entity.type)) return this.spriteCache.get(entity.type);
        return this._genSprite(entity.type, entity.color, entity.label);
    }

    /* ============================================================
       Ground & Grid
       ============================================================ */

    _drawGround(camI, camJ) {
        const { cellSize: s, canvas } = this;
        const ctx = this.ctx;
        const cellsX = Math.ceil(canvas.width / s), cellsY = Math.ceil(canvas.height / s);
        const startI = Math.floor(camI) - Math.floor(cellsX / 2);
        const startJ = Math.floor(camJ) - Math.floor(cellsY / 2);

        for (let i = 0; i <= cellsX + 1; i++) {
            for (let j = 0; j <= cellsY + 1; j++) {
                const gi = startI + i, gj = startJ + j;
                const bio = getBiome(gi, gj);
                ctx.fillStyle = BIOMES[bio].bg;
                ctx.fillRect(i * s, j * s, s, s);
            }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= cellsX + 1; i++) {
            const x = i * s; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let j = 0; j <= cellsY + 1; j++) {
            const y = j * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }

    /* ============================================================
       Entities
       ============================================================ */

    _drawTreeApples(tree, x, y) {
        if (!tree.appleCount || tree.appleCount <= 0) return;
        const ctx = this.ctx, s = this.cellSize;
        const spots = [[0.28, 0.20], [0.65, 0.28], [0.45, 0.48]];
        for (let i = 0; i < Math.min(tree.appleCount, 3); i++) {
            const ax = x + s * spots[i][0], ay = y + s * spots[i][1], r = s * 0.08;
            ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2);
            ctx.fillStyle = '#e53935'; ctx.fill();
            ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 1; ctx.stroke();
            ctx.beginPath(); ctx.arc(ax - r * 0.25, ay - r * 0.25, r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        }
    }

    _drawEntities() {
        const ctx = this.ctx;
        const { cellSize: s, player, canvas } = this;
        const cellsX = Math.ceil(canvas.width / s), cellsY = Math.ceil(canvas.height / s);
        const camI = player.getVisualI(), camJ = player.getVisualJ();
        const startI = Math.floor(camI) - Math.floor(cellsX / 2);
        const startJ = Math.floor(camJ) - Math.floor(cellsY / 2);
        const visible = this.grid.getEntitiesInRect(startI - 1, startJ - 1, startI + cellsX + 2, startJ + cellsY + 2);

        for (const e of visible) {
            const vi = e.getVisualI(), vj = e.getVisualJ();
            const sx = (vi - startI) * s, sy = (vj - startJ) * s + e.getJumpOffset();
            let shake = 0;
            if (e.type === 'TreeEntity' && e.shakeTicks > 0) shake = Math.sin(Date.now() / 40) * 3;
            ctx.drawImage(this._sprite(e), sx + shake, sy);
            if (e.type === 'TreeEntity') this._drawTreeApples(e, sx + shake, sy);
            if (e.type === 'ItemEntity') {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(e.itemType, sx + s / 2, sy + s + 10);
            }
            if (e === player) {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
                ctx.strokeRect(sx, sy, s, s);
            }
        }
    }

    /* ============================================================
       Night overlay (radial gradient around player)
       ============================================================ */

    _drawNightOverlay(darkness, lightRadius) {
        if (darkness <= 0) return;
        const ctx = this.ctx;
        const { canvas, cellSize: s, player } = this;
        const cellsX = Math.ceil(canvas.width / s), cellsY = Math.ceil(canvas.height / s);
        const camI = player.getVisualI(), camJ = player.getVisualJ();
        const startI = Math.floor(camI) - Math.floor(cellsX / 2);
        const startJ = Math.floor(camJ) - Math.floor(cellsY / 2);
        const px = (player.getVisualI() - startI) * s + s / 2;
        const py = (player.getVisualJ() - startJ) * s + s / 2;

        const grad = ctx.createRadialGradient(px, py, lightRadius * 0.2, px, py, lightRadius);
        grad.addColorStop(0, `rgba(0,0,0,0)`);
        grad.addColorStop(0.5, `rgba(0,0,0,${darkness * 0.15})`);
        grad.addColorStop(1, `rgba(0,0,0,${darkness * 0.85})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /* ============================================================
       Bag UI (with selection + drop hint)
       ============================================================ */

    drawBag() {
        const ctx = this.ctx, w = this.canvas.width;
        const ox = 20, oy = 20, ow = 260;
        const slots = this.player.getBagSlots();
        const oh = Math.min(300, 60 + Math.max(1, slots.length) * 30);

        ctx.fillStyle = 'rgba(30,30,50,0.92)';
        this._roundRect(ctx, ox, oy, ow, oh, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 2;
        this._roundRect(ctx, ox, oy, ow, oh, 8); ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('🎒 背包', ox + 14, oy + 12);
        ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('[1-9]选择 [Q]丢弃', ox + 120, oy + 16);

        if (slots.length === 0) {
            ctx.font = '15px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('（空）', ox + 18, oy + 50);
        } else {
            slots.slice(0, 9).forEach(({ type, count }, i) => {
                const iy = oy + 48 + i * 30;
                const sel = i === this.player.selectedSlot;
                const icon = ITEM_ICONS[type] || '📦';
                if (sel) {
                    ctx.fillStyle = 'rgba(255,215,0,0.15)';
                    this._roundRect(ctx, ox + 8, iy - 2, ow - 16, 28, 4); ctx.fill();
                }
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                this._roundRect(ctx, ox + 8, iy - 2, ow - 16, 28, 4); ctx.fill();
                ctx.fillStyle = sel ? '#ffd700' : 'rgba(255,255,255,0.3)';
                ctx.font = '11px sans-serif'; ctx.fillText(`${i + 1}`, ox + 14, iy + 4);
                ctx.font = '16px sans-serif'; ctx.fillText(icon, ox + 32, iy + 2);
                ctx.fillStyle = sel ? '#fff' : '#ccc';
                ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.fillText(type, ox + 54, iy + 3);
                ctx.fillStyle = sel ? '#ffd700' : '#aaa';
                ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
                ctx.fillText(`×${count}`, ox + ow - 16, iy + 3); ctx.textAlign = 'left';
                if (sel) { ctx.fillStyle = '#ffd700'; ctx.font = '16px sans-serif'; ctx.fillText('◀', ox + ow - 50, iy + 2); }
            });
        }

        const total = Object.values(this.player.bag).reduce((s, v) => s + v, 0);
        const ratio = total / this.player.maxBagSize;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this._roundRect(ctx, ox + 14, oy + oh - 18, ow - 28, 7, 3); ctx.fill();
        ctx.fillStyle = ratio > 0.8 ? '#ff6b6b' : '#51cf66';
        this._roundRect(ctx, ox + 14, oy + oh - 18, (ow - 28) * Math.min(ratio, 1), 7, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${total}/${this.player.maxBagSize}`, ox + ow / 2, oy + oh - 13);
    }

    /* ============================================================
       Chest UI (split panel)
       ============================================================ */

    drawChest(chestEntity, activePanel) {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        const chestItems = Object.entries(chestEntity.inventory);
        const bagSlots = this.player.getBagSlots();
        const pH = Math.max(200, 70 + Math.max(chestItems.length, bagSlots.length, 2) * 28);
        const pW = 240, gap = 16;
        const totalW = pW * 2 + gap + 40;
        const lx = (w - totalW) / 2, ty = (h - pH) / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('📦 箱子 — [Tab]切换 [E]转移 [Q]丢弃  空格关闭', w / 2, ty - 30);

        this._panel(ctx, lx, ty, pW, pH, '箱子', chestItems, activePanel === 'chest', chestEntity.selectedSlot, null);
        this._panel(ctx, lx + pW + gap, ty, pW, pH, '背包', bagSlots, activePanel === 'bag', this.player.selectedSlot, this.player);
    }

    _panel(ctx, x, y, w, h, title, items, active, selSlot, _player) {
        ctx.fillStyle = active ? 'rgba(50,50,70,0.94)' : 'rgba(35,35,50,0.88)';
        this._roundRect(ctx, x, y, w, h, 8); ctx.fill();
        ctx.strokeStyle = active ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = active ? 2 : 1;
        this._roundRect(ctx, x, y, w, h, 8); ctx.stroke();
        ctx.fillStyle = active ? '#ffd700' : 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 14px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(active ? `▸ ${title}` : title, x + 12, y + 10);

        if (items.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center'; ctx.fillText('（空）', x + w / 2, y + h / 2 - 8);
        } else {
            items.slice(0, 10).forEach((item, i) => {
                const [name, count] = Array.isArray(item) ? item : [item.type, item.count];
                const iy = y + 42 + i * 28, isSel = i === selSlot;
                const icon = ITEM_ICONS[name] || '📦';
                if (isSel && active) { ctx.fillStyle = 'rgba(255,215,0,0.12)'; ctx.fillRect(x + 6, iy - 1, w - 12, 26); }
                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x + 6, iy - 1, w - 12, 26);
                if (isSel && active) { ctx.fillStyle = '#ffd700'; ctx.font = '12px sans-serif'; ctx.fillText('▶', x + 8, iy + 3); }
                ctx.font = '15px sans-serif';
                ctx.fillStyle = active && isSel ? '#fff' : '#ccc';
                ctx.fillText(icon, x + (isSel && active ? 28 : 14), iy + 2);
                ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.fillText(name, x + (isSel && active ? 50 : 36), iy + 3);
                ctx.fillStyle = active && isSel ? '#ffd700' : '#999';
                ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'right';
                ctx.fillText(`×${count}`, x + w - 14, iy + 3);
            });
        }
    }

    /* ============================================================
       Crafting UI
       ============================================================ */

    drawCrafting(workbench) {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        const recipes = window.__recipes || [];
        if (recipes.length === 0) return;

        const cw = 360, ch = Math.min(400, 80 + recipes.length * 70);
        const cx = (w - cw) / 2, cy = (h - ch) / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(40,35,30,0.94)';
        this._roundRect(ctx, cx, cy, cw, ch, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 2;
        this._roundRect(ctx, cx, cy, cw, ch, 10); ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('🔨 工作台', cx + 16, cy + 14);
        ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('[1-9]选择 [E]合成  空格关闭', cx + 160, cy + 18);

        recipes.forEach((r, i) => {
            const iy = cy + 48 + i * 70;
            const sel = i === workbench.selectedRecipe;
            if (sel) {
                ctx.fillStyle = 'rgba(255,215,0,0.1)';
                this._roundRect(ctx, cx + 8, iy, cw - 16, 64, 6); ctx.fill();
            }
            ctx.fillStyle = sel ? '#fff' : '#ccc';
            ctx.font = 'bold 15px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillText(r.name, cx + 20, iy + 6);

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillText(r.desc, cx + 20, iy + 28);

            // Materials
            const mats = Object.entries(r.inputs);
            ctx.font = '12px sans-serif';
            mats.forEach(([mat, need], mi) => {
                const have = this.player.countItem(mat);
                const mx = cx + 20 + mi * 90;
                ctx.fillStyle = have >= need ? '#81c784' : '#e57373';
                ctx.fillText(`${ITEM_ICONS[mat] || mat} ${have}/${need}`, mx, iy + 48);
            });
        });
    }

    /* ============================================================
       NPC Dialogue
       ============================================================ */

    drawNPCDialogue(npc, state) {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        const text = npc.getDialogue(this.player);

        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, w, h);

        // NPC name
        ctx.fillStyle = '#FFB74D';
        ctx.font = 'bold 18px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('🧑 农夫', w / 2, h / 2 - 40);

        // Dialogue box
        const pad = 20;
        ctx.font = '16px "PingFang SC","Microsoft YaHei",sans-serif';
        const lines = this._wrapText(ctx, text, 500);
        const bh = Math.max(80, 40 + lines.length * 26 + pad);
        const bw = 540;
        const bx = (w - bw) / 2, by = h / 2 - 30;

        ctx.fillStyle = 'rgba(30,30,50,0.92)';
        this._roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1;
        this._roundRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
            ctx.fillText(line, bx + 20, by + 16 + i * 26);
        });

        // Action button
        const btnY = by + bh + 12;
        if (state === 'intro') {
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            this._roundRect(ctx, w / 2 - 80, btnY, 160, 34, 6); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.font = '15px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillText('[E] 接受任务', w / 2, btnY + 8);
        } else if (state === 'active') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.textAlign = 'center';
            ctx.font = '13px sans-serif';
            ctx.fillText('[空格] 关闭', w / 2, btnY + 8);
        } else if (state === 'done') {
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.font = '15px sans-serif';
            ctx.fillText('✅ 任务完成！', w / 2, btnY + 8);
        }
    }

    /* ============================================================
       Sign popup
       ============================================================ */

    drawSign(signEntity) {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, h);

        const bx = (w - 300) / 2, by = (h - 160) / 2;
        ctx.fillStyle = 'rgba(45,40,35,0.94)';
        this._roundRect(ctx, bx, by, 300, 150, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(139,119,101,0.6)'; ctx.lineWidth = 2;
        this._roundRect(ctx, bx, by, 300, 150, 10); ctx.stroke();

        ctx.fillStyle = '#8D6E63';
        ctx.font = 'bold 16px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('📋 路牌', bx + 150, by + 14);

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
        const lines = this._wrapText(ctx, signEntity.message, 260);
        lines.forEach((line, i) => {
            ctx.fillText(line, bx + 150, by + 48 + i * 22);
        });

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px sans-serif';
        ctx.fillText('空格关闭', bx + 150, by + 126);
    }

    _wrapText(ctx, text, maxWidth) {
        if (!text) return [''];
        const words = text.split('');
        const lines = [];
        let line = '';
        for (const ch of text) {
            const test = line + ch;
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = ch;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    /* ============================================================
       Interaction hint
       ============================================================ */

    _drawHint() {
        const ctx = this.ctx, { player, grid, canvas } = this;
        if (player.animating) return;
        let ti = player.i, tj = player.j;
        switch (player.direction) {
            case 'up': tj--; break; case 'down': tj++; break;
            case 'left': ti--; break; case 'right': ti++; break;
            default: return;
        }
        const e = grid.getEntityAt(ti, tj);
        if (!e) return;

        let txt;
        switch (e.type) {
            case 'TreeEntity': txt = e.appleCount > 0 ? `摘苹果 🍎 (${e.appleCount})` : '树上没有苹果了'; break;
            case 'ChestEntity': txt = '打开箱子'; break;
            case 'SaveEntity': txt = '交互存档点'; break;
            case 'ItemEntity': txt = `捡起 ${e.itemType}`; break;
            case 'WorkbenchEntity': txt = '打开工作台 🔨'; break;
            case 'NPCEntity': txt = '对话 💬'; break;
            case 'SignEntity': txt = '阅读路牌 📋'; break;
            case 'StoneEntity': txt = `敲石头 🪨 (${e.rockCount})`; break;
            case 'FarmlandEntity':
                if (e.planted && e.growthStage >= 3) txt = '收获 🥕';
                else if (e.planted) txt = `生长中 (${['·','芽','苗'][e.growthStage] || '苗'})`;
                else txt = '种种子 🌰';
                break;
            default: txt = `与「${e.label}」交互`;
        }

        ctx.font = '15px "PingFang SC","Microsoft YaHei",sans-serif';
        const tw = ctx.measureText(txt).width;
        const bx = (canvas.width - tw - 32) / 2, by = canvas.height - 52;
        this._hintRect = { x: bx, y: by, w: tw + 32, h: 34 };
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this._roundRect(ctx, bx, by, tw + 32, 34, 6); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, bx + 16, by + 17);
    }

    /* ============================================================
       HUD
       ============================================================ */

    _drawHUD() {
        const ctx = this.ctx, { player, canvas } = this;
        const total = Object.values(player.bag).reduce((s, v) => s + v, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRect(ctx, 10, 570 - 26, 96, 22, 4); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`🎒 ${total}/${player.maxBagSize}`, 16, 570 - 15);

        // Tools display
        if (player.tools.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this._roundRect(ctx, 790 - 120, 10, 110, 22, 4); ctx.fill();
            ctx.fillStyle = '#81c784';
            ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(`🧰 ${player.tools.join(' ')}`, 790 - 14, 21);
        }

        // Coordinate display
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRect(ctx, 790 - 130, 570 - 26, 120, 22, 4); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`📍 (${player.i}, ${player.j})`, 790 - 14, 570 - 15);

        // Quest reminder
        if (player.questData.state === 'active') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this._roundRect(ctx, 10, 10, 160, 22, 4); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.font = '11px sans-serif';
            ctx.fillText(`📜 任务进行中...`, 16, 21);
        }
    }

    /* ============================================================
       Main draw
       ============================================================ */

    draw(state = {}) {
        const ctx = this.ctx;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const camI = this.player.getVisualI(), camJ = this.player.getVisualJ();
        this._drawGround(camI, camJ);
        this._drawEntities();

        // Night overlay
        const dn = state.dayNight;
        if (dn && dn.darkness > 0.02) {
            const lr = dn.getLightRadius(this.player.hasTool('torch'));
            this._drawNightOverlay(dn.darkness, lr);
        }

        // UI mode
        if (state.bagOpen) {
            this.drawBag();
        } else if (state.chestEntity) {
            this.drawChest(state.chestEntity, state.activePanel);
        } else if (state.workbenchEntity) {
            this.drawCrafting(state.workbenchEntity);
        } else if (state.npcEntity) {
            this.drawNPCDialogue(state.npcEntity, state.npcState);
        } else if (state.signEntity) {
            this.drawSign(state.signEntity);
        } else {
            this._drawHint();
        }

        this._drawHUD();
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}
