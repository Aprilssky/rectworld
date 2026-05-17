import { BaseEntity } from './BaseEntity.js';

const ITEM_COLORS = {
    Apple: '#e53935',
    TreeEntity: '#4CAF50',
    AIEntity: '#FF69B4',
    Wood: '#795548',
    Sapling: '#66BB6A',
    Stone: '#9E9E9E',
    Seed: '#D2691E',
    Carrot: '#FF9800',
};

const ITEM_LABELS = {
    Apple: '果',
    TreeEntity: '木',
    AIEntity: '猪',
    Wood: '木',
    Sapling: '苗',
    Stone: '石',
    Seed: '种',
    Carrot: '菜',
};

export class ItemEntity extends BaseEntity {
    constructor(i, j, itemType) {
        super(i, j, false);
        this.type = 'ItemEntity';
        this.itemType = itemType;
        this.color = ITEM_COLORS[itemType] || '#9E9E9E';
        this.label = ITEM_LABELS[itemType] || '?';
    }

    interact(interactor, grid) {
        if (interactor.storeItem(this.itemType)) {
            grid.removeEntity(this);
            console.log(`捡起了 ${this.itemType}`);
        }
    }
}
