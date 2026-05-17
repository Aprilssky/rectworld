import { BaseEntity } from './BaseEntity.js';
import { ItemEntity } from './ItemEntity.js';

export class TreeEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'TreeEntity';
        this.color = '#4CAF50';
        this.label = '树';
        this.appleCount = 3;
        this.maxApples = 5;
        this.regrowAccum = 0;
        this.regrowInterval = 30000;
        this.shakeTicks = 0;
    }

    interact(interactor, grid) {
        if (this.appleCount > 0) {
            this.appleCount--;
            this.shakeTicks = 6;
            const ok = interactor.storeItem('Apple');
            if (ok) {
                console.log(`🍎 获得苹果! 树上还剩 ${this.appleCount} 个`);
                // Axe bonus: extra wood
                if (interactor.hasTool && interactor.hasTool('axe')) {
                    if (interactor.storeItem('Wood')) {
                        console.log('🪓 斧头额外获得木材!');
                    }
                }
            } else {
                this.appleCount++;
                console.warn('背包已满');
            }
        } else {
            console.log('树上没有苹果了');
        }
    }

    /** Chop down the tree. Requires axe. Drops Wood + chance of Sapling. */
    chop(grid) {
        const woodCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < woodCount; i++) {
            const adj = grid.findAdjacentFree(this.i, this.j);
            adj
                ? grid.addEntity(new ItemEntity(adj[0], adj[1], 'Wood'))
                : grid.addEntity(new ItemEntity(this.i, this.j, 'Wood'));
        }
        if (Math.random() < 0.5) {
            const adj = grid.findAdjacentFree(this.i, this.j);
            if (adj) grid.addEntity(new ItemEntity(adj[0], adj[1], 'Sapling'));
        }
        if (Math.random() < 0.5) {
            const adj = grid.findAdjacentFree(this.i, this.j);
            if (adj) grid.addEntity(new ItemEntity(adj[0], adj[1], 'Seed'));
        }
        grid.removeEntity(this);
        console.log(`🪓 砍倒了一棵树，获得 ${woodCount} 个木材`);
    }

    update(grid, dt) {
        if (this.appleCount < this.maxApples) {
            this.regrowAccum += dt;
            if (this.regrowAccum >= this.regrowInterval) {
                this.appleCount = Math.min(this.maxApples, this.appleCount + 1);
                this.regrowAccum = 0;
            }
        }
        if (this.shakeTicks > 0) this.shakeTicks--;
    }
}
