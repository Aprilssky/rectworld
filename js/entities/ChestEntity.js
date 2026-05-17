import { BaseEntity } from './BaseEntity.js';

export class ChestEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'ChestEntity';
        this.color = '#8D6E63';
        this.label = '箱';
        this.inventory = {};
        this.capacity = 20;
    }

    interact(interactor, grid) {
        console.log('箱子被打开');
        return this;
    }

    addItem(itemType) {
        const total = Object.values(this.inventory).reduce((s, v) => s + v, 0);
        if (total >= this.capacity) {
            console.warn('箱子已满');
            return false;
        }
        this.inventory[itemType] = (this.inventory[itemType] || 0) + 1;
        return true;
    }

    removeItem(itemType) {
        if (this.inventory[itemType] && this.inventory[itemType] > 0) {
            this.inventory[itemType]--;
            if (this.inventory[itemType] === 0) delete this.inventory[itemType];
            return true;
        }
        return false;
    }

    getInventory() {
        return { ...this.inventory };
    }
}
