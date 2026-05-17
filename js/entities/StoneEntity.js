import { BaseEntity } from './BaseEntity.js';
import { ItemEntity } from './ItemEntity.js';

export class StoneEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'StoneEntity';
        this.color = '#9E9E9E';
        this.label = '石';
        this.rockCount = 3;
        this.maxRocks = 5;
        this.regrowAccum = 0;
        this.regrowInterval = 30000;
    }

    interact(interactor, grid) {
        if (this.rockCount > 0) {
            this.rockCount--;
            const ok = interactor.storeItem('Stone');
            if (ok) {
                console.log(`🪨 获得石头! 矿脉还剩 ${this.rockCount} 个`);
                if (interactor.hasTool && interactor.hasTool('pickaxe')) {
                    if (interactor.storeItem('Stone')) {
                        console.log('⛏️ 镐额外获得石头!');
                    }
                }
            } else {
                this.rockCount++;
                console.warn('背包已满');
            }
        } else {
            console.log('矿脉已枯竭');
        }
    }

    mine(grid) {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const adj = grid.findAdjacentFree(this.i, this.j);
            adj
                ? grid.addEntity(new ItemEntity(adj[0], adj[1], 'Stone'))
                : grid.addEntity(new ItemEntity(this.i, this.j, 'Stone'));
        }
        if (Math.random() < 0.5) {
            const adj = grid.findAdjacentFree(this.i, this.j);
            if (adj) grid.addEntity(new ItemEntity(adj[0], adj[1], 'Seed'));
        }
        grid.removeEntity(this);
        console.log(`⛏️ 开采了石头，获得 ${count} 个石头`);
    }

    update(grid, dt) {
        if (this.rockCount < this.maxRocks) {
            this.regrowAccum += dt;
            if (this.regrowAccum >= this.regrowInterval) {
                this.rockCount = Math.min(this.maxRocks, this.rockCount + 1);
                this.regrowAccum = 0;
            }
        }
    }
}
