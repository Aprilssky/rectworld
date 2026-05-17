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
    PlayerEntity:    (i, j, grid) => new PlayerEntity(i, j),
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

    serialize() {
        const data = { entities: [] };
        for (const e of this.entities.values()) {
            const entry = { type: e.type, i: e.i, j: e.j };
            if (e.saveData !== undefined) entry.saveData = e.saveData;
            if (e.type === 'ChestEntity' && Object.keys(e.inventory).length > 0) entry.inventory = { ...e.inventory };
            if (e.type === 'PlayerEntity') {
                if (Object.keys(e.bag).length > 0) entry.bag = { ...e.bag };
                if (e.tools.length > 0) entry.tools = [...e.tools];
            }
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
            data.entities.push(entry);
        }
        return JSON.stringify(data);
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.entities.clear();
        for (const ed of data.entities) {
            const fn = ENTITY_MAP[ed.type];
            if (!fn) { console.warn(`未知类型: ${ed.type}`); continue; }
            const e = fn(ed.i, ed.j, this, ed);
            if (ed.saveData !== undefined) e.saveData = ed.saveData;
            if (ed.inventory && e.type === 'ChestEntity') e.inventory = { ...ed.inventory };
            if (ed.bag && e.type === 'PlayerEntity') e.bag = { ...ed.bag };
            if (ed.tools && e.type === 'PlayerEntity') e.tools = [...ed.tools];
            if (ed.appleCount !== undefined && e.type === 'TreeEntity') e.appleCount = ed.appleCount;
            if (ed.rockCount !== undefined && e.type === 'StoneEntity') e.rockCount = ed.rockCount;
            if (e.type === 'FarmlandEntity') {
                e.planted = ed.planted || false;
                e.cropType = ed.cropType || null;
                e.growthStage = ed.growthStage || 0;
                e.growthAccum = ed.growthAccum || 0;
                e._applyStage();
            }
            this.addEntity(e);
        }
    }
}
