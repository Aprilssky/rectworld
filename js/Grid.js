import { PlayerEntity } from './entities/PlayerEntity.js';
import { TreeEntity } from './entities/TreeEntity.js';
import { AIEntity } from './entities/AIEntity.js';
import { SaveEntity } from './entities/SaveEntity.js';
import { ChestEntity } from './entities/ChestEntity.js';
import { ItemEntity } from './entities/ItemEntity.js';
import { WorkbenchEntity } from './entities/WorkbenchEntity.js';
import { NPCEntity } from './entities/NPCEntity.js';
import { SignEntity } from './entities/SignEntity.js';
import { StoneEntity } from './entities/StoneEntity.js';
import { FarmlandEntity } from './entities/FarmlandEntity.js';

const ENTITY_MAP = {
    TreeEntity:      (i, j, grid) => new TreeEntity(i, j),
    AIEntity:        (i, j, grid) => new AIEntity(i, j),
    SaveEntity:      (i, j, grid) => { const e = new SaveEntity(i, j, grid); return e; },
    ChestEntity:     (i, j, grid) => new ChestEntity(i, j),
    ItemEntity:      (i, j, grid, data) => new ItemEntity(i, j, data.itemType),
    WorkbenchEntity: (i, j, grid) => new WorkbenchEntity(i, j),
    NPCEntity:       (i, j, grid, data) => new NPCEntity(i, j, data.questId),
    SignEntity:      (i, j, grid, data) => new SignEntity(i, j, data.message),
    StoneEntity:     (i, j, grid) => new StoneEntity(i, j),
    FarmlandEntity:  (i, j, grid, data) => {
        const e = new FarmlandEntity(i, j);
        if (data) {
            e.planted = data.planted || false;
            e.cropType = data.cropType || null;
            e.growthStage = data.growthStage || 0;
            e.growthAccum = data.growthAccum || 0;
            e._applyStage();
        }
        return e;
    },
};

/** Helpers shared by world & player serialization */
function serializeWorldEntity(e) {
    const entry = { type: e.type, i: e.i, j: e.j };
    if (e.saveData !== undefined) entry.saveData = e.saveData;
    if (e.type === 'ChestEntity' && Object.keys(e.inventory).length > 0) entry.inventory = { ...e.inventory };
    if (e.type === 'TreeEntity') entry.appleCount = e.appleCount;
    if (e.type === 'ItemEntity') entry.itemType = e.itemType;
    if (e.type === 'NPCEntity') entry.questId = e.questId;
    if (e.type === 'SignEntity' && e.message) entry.message = e.message;
    if (e.type === 'StoneEntity') entry.rockCount = e.rockCount;
    if (e.type === 'FarmlandEntity') {
        entry.planted = e.planted;
        entry.cropType = e.cropType;
        entry.growthStage = e.growthStage;
        entry.growthAccum = e.growthAccum;
    }
    return entry;
}

function applyEntityData(e, ed) {
    if (ed.saveData !== undefined) e.saveData = ed.saveData;
    if (ed.inventory && e.type === 'ChestEntity') e.inventory = { ...ed.inventory };
    if (ed.appleCount !== undefined && e.type === 'TreeEntity') e.appleCount = ed.appleCount;
    if (ed.rockCount !== undefined && e.type === 'StoneEntity') e.rockCount = ed.rockCount;
    if (e.type === 'FarmlandEntity') {
        e.planted = ed.planted || false;
        e.cropType = ed.cropType || null;
        e.growthStage = ed.growthStage || 0;
        e.growthAccum = ed.growthAccum || 0;
        e._applyStage();
    }
}

export class Grid {
    constructor() { this.entities = new Map(); }

    _key(i, j) { return `${i},${j}`; }

    addEntity(entity) {
        const k = this._key(entity.i, entity.j);
        if (this.entities.has(k)) {
            console.warn(`位置 (${entity.i}, ${entity.j}) 已被占用`);
            return false;
        }
        this.entities.set(k, entity);
        return true;
    }

    removeEntity(entity) {
        for (const [k, v] of this.entities) {
            if (v === entity) { this.entities.delete(k); return; }
        }
    }

    update(dt = 500) {
        const entries = [...this.entities];
        for (const [key, entity] of entries) {
            const [oldI, oldJ] = key.split(',').map(Number);
            entity.update(this, dt);
            if (oldI !== entity.i || oldJ !== entity.j) {
                const newKey = this._key(entity.i, entity.j);
                if (this.isValidPosition(entity.i, entity.j) || newKey === key) {
                    this.entities.delete(key);
                    this.entities.set(newKey, entity);
                } else {
                    entity.i = oldI; entity.j = oldJ;
                }
            }
        }
    }

    isValidPosition(i, j) { return !this.entities.has(this._key(i, j)); }
    getEntityAt(i, j) { return this.entities.get(this._key(i, j)) || null; }

    findAdjacentFree(i, j) {
        for (const [di, dj] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]]) {
            const ni = i + di, nj = j + dj;
            if (this.isValidPosition(ni, nj)) return [ni, nj];
        }
        return null;
    }

    getEntitiesInRect(tlI, tlJ, brI, brJ) {
        const r = [];
        for (const e of this.entities.values()) {
            if (e.i >= tlI && e.i <= brI && e.j >= tlJ && e.j <= brJ) r.push(e);
        }
        return r;
    }

    getAllEntities() { return [...this.entities.values()]; }

    /** Find the PlayerEntity in the grid */
    getPlayer() {
        for (const e of this.entities.values()) {
            if (e.type === 'PlayerEntity') return e;
        }
        return null;
    }

    /* ================================================================
       World serialization (shared across all players)
       ================================================================ */

    /** Serialize only world entities (no PlayerEntity) */
    serializeWorld() {
        const data = { entities: [] };
        for (const e of this.entities.values()) {
            if (e.type === 'PlayerEntity') continue;
            data.entities.push(serializeWorldEntity(e));
        }
        return JSON.stringify(data);
    }

    /** Load world entities into empty grid. Returns false if no data. */
    deserializeWorld(jsonStr) {
        const data = JSON.parse(jsonStr);
        // Remove only non-player entities (keep player)
        for (const [k, v] of [...this.entities]) {
            if (v.type !== 'PlayerEntity') this.entities.delete(k);
        }
        for (const ed of data.entities) {
            const fn = ENTITY_MAP[ed.type];
            if (!fn) { console.warn(`未知世界实体类型: ${ed.type}`); continue; }
            const e = fn(ed.i, ed.j, this, ed);
            applyEntityData(e, ed);
            this.addEntity(e);
        }
        return true;
    }

    /* ================================================================
       Player serialization (per user)
       ================================================================ */

    /** Serialize a single player entity (position, bag, tools, quest) */
    serializePlayer(player) {
        return JSON.stringify({
            i: player.i,
            j: player.j,
            direction: player.direction || 'down',
            bag: { ...player.bag },
            tools: [...(player.tools || [])],
            questData: { ...player.questData },
            bagCapacity: player._bagCapacity,
        });
    }

    /** Create a PlayerEntity from player data and add to grid */
    createPlayerFromData(playerData) {
        const pd = typeof playerData === 'string' ? JSON.parse(playerData) : playerData;
        const p = new PlayerEntity(pd.i, pd.j);
        p.direction = pd.direction || 'down';
        p.bag = { ...(pd.bag || {}) };
        p.tools = [...(pd.tools || [])];
        if (pd.questData) p.questData = { ...p.questData, ...pd.questData };
        if (pd.bagCapacity) p._bagCapacity = pd.bagCapacity;
        return p;
    }

    /* ================================================================
       Legacy full save/load (backward compat for local/offline)
       ================================================================ */

    serialize() {
        const data = { entities: [] };
        for (const e of this.entities.values()) {
            const entry = serializeWorldEntity(e);
            if (e.type === 'PlayerEntity') {
                entry.bag = { ...e.bag };
                entry.tools = [...(e.tools || [])];
                entry.direction = e.direction || 'down';
                entry.bagCapacity = e._bagCapacity;
                entry.questData = { ...e.questData };
            }
            data.entities.push(entry);
        }
        return JSON.stringify(data);
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.entities.clear();
        for (const ed of data.entities) {
            if (ed.type === 'PlayerEntity') {
                // Reuse player creation from data
                const p = new PlayerEntity(ed.i, ed.j);
                p.direction = ed.direction || 'down';
                p.bag = { ...(ed.bag || {}) };
                p.tools = [...(ed.tools || [])];
                if (ed.questData) p.questData = { ...p.questData, ...ed.questData };
                if (ed.bagCapacity) p._bagCapacity = ed.bagCapacity;
                this.addEntity(p);
                continue;
            }
            const fn = ENTITY_MAP[ed.type];
            if (!fn) { console.warn(`未知类型: ${ed.type}`); continue; }
            const e = fn(ed.i, ed.j, this, ed);
            applyEntityData(e, ed);
            this.addEntity(e);
        }
    }
}
