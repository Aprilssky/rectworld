const ITEM_ICONS = {
    Apple: '🍎', TreeEntity: '🌲', AIEntity: '🐷',
    PlayerEntity: '🧑', Wood: '🪵', Axe: '🪓',
    Sapling: '🌱', SignEntity: '📋',
    Stone: '🪨', Seed: '🌰', Carrot: '🥕',
};

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
function getPlayerDisplayName() {
    try {
        const name = localStorage.getItem('rictworld_username');
        return name || null;
    } catch { return null; }
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
            const stage = entity.growthStage || 0;
            const key = 'FarmlandEntity_' + stage;
            if (this.spriteCache.has(key)) return this.spriteCache.get(key);
            const label = stage > 0 ? ['🌱','🌿','🌾'][Math.min(stage, 3) - 1] : '土';
            const col = ['#5a3a1a','#4a7a2a','#3a8a3a','#8a7a3a'][Math.min(stage, 3)];
            return this._genSprite(key, col, label);
        }
        if (entity.type === 'TreeEntity') {
            if (this.spriteCache.has('TreeEntity')) return this.spriteCache.get('TreeEntity');
            const c = document.createElement('canvas');
            const s = this.cellSize; c.width = s; c.height = s;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#5a3a1a'; ctx.fillRect(s * 0.35, s * 0.5, s * 0.3, s * 0.4);
            ctx.fillStyle = '#2d6a2d';
            ctx.beginPath(); ctx.arc(s / 2, s * 0.35, s * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, 0, 3, s);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, s, s);
            this.spriteCache.set('TreeEntity', c); return c;
        }
        if (entity.type === 'StoneEntity') {
            if (this.spriteCache.has('StoneEntity')) return this.spriteCache.get('StoneEntity');
            const c = document.createElement('canvas');
            const s = this.cellSize; c.width = s; c.height = s;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#666'; ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(2, 2, s - 4, s - 4);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(s * 0.3, s * 0.7, s * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(s * 0.7, s * 0.3, s * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, s, s);
            this.spriteCache.set('StoneEntity', c); return c;
        }
        // Default sprite for all other entity types
        const key = entity.type || 'unknown';
        if (this.spriteCache.has(key)) return this.spriteCache.get(key);
        return this._genSprite(key, entity.color || '#888', entity.label || '?');
    }

    _drawTreeApples(e, sx, sy) {
        if (e.appleCount <= 0) return;
        const ctx = this.ctx, s = this.cellSize;
        const count = Math.min(e.appleCount, 3);
        for (let i = 0; i < count; i++) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(sx + 8 + i * 10, sy + s - 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc0000'; ctx.beginPath();
            ctx.arc(sx + 8 + i * 10 - 1, sy + s - 12, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawGround(camI, camJ) {
        const ctx = this.ctx, { cellSize: s, canvas } = this;
        const cellsX = Math.ceil(canvas.width / s), cellsY = Math.ceil(canvas.height / s);
        const startI = Math.floor(camI) - Math.floor(cellsX / 2);
        const startJ = Math.floor(camJ) - Math.floor(cellsY / 2);
        for (let j = 0; j < cellsY + 2; j++) {
            for (let i = 0; i < cellsX + 2; i++) {
                const gi = startI + i, gj = startJ + j;
                const biome = getBiome(gi, gj);
                ctx.fillStyle = BIOMES[biome].bg; ctx.fillRect(i * s, j * s, s, s);
                ctx.strokeStyle = BIOMES[biome].line; ctx.lineWidth = 0.5; ctx.strokeRect(i * s, j * s, s, s);
            }
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
        const pName = getPlayerDisplayName();

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
                // Draw player name above character
                if (pName) {
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.font = 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif';
                    const tw = ctx.measureText(pName).width;
                    const nx = sx + s / 2, ny = sy - 6;
                    ctx.fillRect(nx - tw / 2 - 4, ny - 10, tw + 8, 16);
                    ctx.fillStyle = '#ffd700';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText(pName, nx, ny + 4);
                }
            }
        }
    }

    _drawFps(ts) {
        if (!this._fps) { this._fps = []; this._fpsLast = 0; }
        this._fps.push(ts);
        while (this._fps.length > 0 && this._fps[0] < ts - 1000) this._fps.shift();
        const fps = this._fps.length;
        const el = document.getElementById('fpsDisplay');
        if (el && ts - this._fpsLast > 200) { el.textContent = `FPS: ${fps}`; this._fpsLast = ts; }
    }

    _drawNightOverlay(darkness, lightRadius) {
        const ctx = this.ctx, { canvas, cellSize: s, player } = this;
        const cellsX = Math.ceil(canvas.width / s), cellsY = Math.ceil(canvas.height / s);
        const camI = player.getVisualI(), camJ = player.getVisualJ();
        const startI = Math.floor(camI) - Math.floor(cellsX / 2);
        const startJ = Math.floor(camJ) - Math.floor(cellsY / 2);
        const px = (player.getVisualI() - startI) * s + s / 2, py = (player.getVisualJ() - startJ) * s + s / 2;
        const gradient = ctx.createRadialGradient(px, py, s, px, py, s * lightRadius);
        gradient.addColorStop(0, `rgba(0,0,20,${darkness * 0.4})`);
        gradient.addColorStop(0.3, `rgba(0,0,20,${darkness * 0.7})`);
        gradient.addColorStop(1, `rgba(0,0,20,${darkness})`);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    _drawHint() {
        const ctx = this.ctx, { canvas, player } = this;
        const dir = player.direction || 'down';
        let ti = player.i, tj = player.j;
        switch (dir) {
            case 'up': tj--; break; case 'down': tj++; break;
            case 'left': ti--; break; case 'right': ti++; break;
        }
        const e = this.grid.getEntityAt(ti, tj);
        if (!e) return;
        let txt = '';
        if (e.type === 'SaveEntity') {
            txt = `「${e.label}」站在下方按空格存档，上方按空格读档`;
        } else {
            txt = `与「${e.label}」交互`;
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

    _drawHUD() {
        const ctx = this.ctx, { player, canvas } = this;
        const total = Object.values(player.bag).reduce((s, v) => s + v, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRect(ctx, 10, 570 - 26, 96, 22, 4); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`🎒 ${total}/${player.maxBagSize}`, 16, 570 - 15);
        if (player.tools.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this._roundRect(ctx, 790 - 120, 10, 110, 22, 4); ctx.fill();
            ctx.fillStyle = '#81c784';
            ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(`🧰 ${player.tools.join(' ')}`, 790 - 14, 21);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRect(ctx, 790 - 130, 570 - 26, 120, 22, 4); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`📍 (${player.i}, ${player.j})`, 790 - 14, 570 - 15);
        if (player.questData.state === 'active') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this._roundRect(ctx, 10, 10, 160, 22, 4); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.font = '11px sans-serif';
            ctx.fillText(`📜 任务进行中...`, 16, 21);
        }
    }

    draw(state = {}) {
        const ctx = this.ctx;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const camI = this.player.getVisualI(), camJ = this.player.getVisualJ();
        this._drawGround(camI, camJ);
        this._drawEntities();
        const dn = state.dayNight;
        if (dn && dn.darkness > 0.02) {
            const lr = dn.getLightRadius(this.player.hasTool('torch'));
            this._drawNightOverlay(dn.darkness, lr);
        }
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
