import { BaseEntity } from './BaseEntity.js';

const GROWTH_TIME = 10000;

const STAGES = [
    { label: '·', color: '#6B3410' },
    { label: '芽', color: '#5a8a3a' },
    { label: '苗', color: '#4a9a2a' },
    { label: '菜', color: '#3a8a1a' },
];

export class FarmlandEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'FarmlandEntity';
        this.color = '#8B4513';
        this.label = '土';
        this.planted = false;
        this.cropType = null;
        this.growthStage = 0;
        this.growthAccum = 0;
    }

    _applyStage() {
        if (this.planted) {
            const s = STAGES[this.growthStage];
            this.color = s.color;
            this.label = s.label;
        } else {
            this.color = '#8B4513';
            this.label = '土';
        }
    }

    interact(interactor, grid) {
        if (this.planted && this.growthStage >= 3) {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                if (!interactor.storeItem('Carrot')) break;
            }
            this.planted = false;
            this.cropType = null;
            this.growthStage = 0;
            this.growthAccum = 0;
            this._applyStage();
            console.log(`🥕 收获了 ${count} 个萝卜!`);
            return true;
        }
        if (!this.planted && interactor.countItem('Seed') > 0) {
            interactor.takeItem('Seed');
            this.planted = true;
            this.cropType = 'carrot';
            this.growthStage = 0;
            this.growthAccum = 0;
            this._applyStage();
            console.log('🌱 种下了种子');
            return true;
        }
        return this;
    }

    update(grid, dt) {
        if (this.planted && this.growthStage < 3) {
            this.growthAccum += dt;
            if (this.growthAccum >= GROWTH_TIME) {
                this.growthAccum -= GROWTH_TIME;
                this.growthStage = Math.min(3, this.growthStage + 1);
                this._applyStage();
                console.log(`🌱 作物生长到阶段 ${this.growthStage}`);
            }
        }
    }
}
