import { BaseEntity } from './BaseEntity.js';

export class PlayerEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'PlayerEntity';
        this.color = '#4A90D9';
        this.label = '玩';
        this.direction = 'down';
        this.bag = {};
        this._bagCapacity = 10;
        this.selectedSlot = -1;
        this.queuedDx = undefined;
        this.queuedDy = undefined;

        // Permanent tools
        this.tools = [];

        // Quest tracking
        this.questData = {
            activeQuest: null,     // quest id
            state: 'inactive',     // 'inactive' | 'active' | 'done'
            progress: 0,
        };
    }

    /* ---- Tools ---- */

    get maxBagSize() {
        let size = this._bagCapacity;
        if (this.tools.includes('basket')) size += 5;
        return size;
    }

    addTool(id) {
        if (!this.tools.includes(id)) {
            this.tools.push(id);
            return true;
        }
        return false;
    }

    hasTool(id) {
        return this.tools.includes(id);
    }

    /* ---- Bag ---- */

    getBagSlots() {
        return Object.entries(this.bag)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => a.type.localeCompare(b.type));
    }

    getSelectedType() {
        if (this.selectedSlot < 0) return null;
        const slots = this.getBagSlots();
        if (this.selectedSlot >= slots.length) return null;
        return slots[this.selectedSlot].type;
    }

    normalizeSelection() {
        const slots = this.getBagSlots();
        if (slots.length === 0) {
            this.selectedSlot = -1;
        } else if (this.selectedSlot >= slots.length) {
            this.selectedSlot = slots.length - 1;
        } else if (this.selectedSlot === -1) {
            this.selectedSlot = 0; // auto-select first
        }
    }

    storeItem(itemType) {
        const total = Object.values(this.bag).reduce((s, v) => s + v, 0);
        if (total >= this.maxBagSize) {
            console.warn('背包已满');
            return false;
        }
        this.bag[itemType] = (this.bag[itemType] || 0) + 1;
        return true;
    }

    takeItem(itemType) {
        if (this.bag[itemType] && this.bag[itemType] > 0) {
            this.bag[itemType]--;
            if (this.bag[itemType] === 0) delete this.bag[itemType];
            return true;
        }
        return false;
    }

    /** Count of a specific item type in bag */
    countItem(itemType) {
        return this.bag[itemType] || 0;
    }

    /* ---- Quest ---- */

    /** Check and auto-complete active quest if objective met */
    checkQuestProgress() {
        if (!this.questData.activeQuest || this.questData.state !== 'active') return null;
        const { QUESTS } = globalThis.__questData || {};
        if (!QUESTS) return null;
        const quest = QUESTS[this.questData.activeQuest];
        if (!quest) return null;

        if (quest.objective.type === 'collect') {
            const have = this.countItem(quest.objective.item);
            this.questData.progress = have;
            if (have >= quest.objective.count) {
                // Auto-complete — consume items and apply reward
                for (let i = 0; i < quest.objective.count; i++) {
                    this.takeItem(quest.objective.item);
                }
                this.questData.state = 'done';
                this._applyQuestReward(quest);
                return quest;
            }
        }
        return null;
    }

    _applyQuestReward(quest) {
        if (!quest.reward) return;
        switch (quest.reward.type) {
            case 'bag_upgrade':
                this._bagCapacity += quest.reward.amount;
                console.log(`🎒 背包容量 +${quest.reward.amount}！`);
                break;
            case 'tool':
                if (quest.reward.toolId) this.addTool(quest.reward.toolId);
                console.log(`🧰 获得工具：${quest.reward.toolId}`);
                break;
            case 'item':
                if (quest.reward.itemType) {
                    for (let i = 0; i < (quest.reward.count || 1); i++) {
                        this.storeItem(quest.reward.itemType);
                    }
                }
                break;
        }
    }

    /* ---- Movement ---- */

    move(dx, dy) {
        if (this.animating) {
            this.queuedDx = dx;
            this.queuedDy = dy;
            return;
        }
        this.startMove(this.i, this.j, this.i + dx, this.j + dy);
        this.i += dx;
        this.j += dy;
    }

    updateAnimation(dt) {
        super.updateAnimation(dt);
        if (!this.animating && this.queuedDx !== undefined) {
            const dx = this.queuedDx;
            const dy = this.queuedDy;
            this.queuedDx = undefined;
            this.queuedDy = undefined;
            this.move(dx, dy);
        }
    }

    interact(grid) {
        let targetI = this.i, targetJ = this.j;
        switch (this.direction) {
            case 'up':    targetJ -= 1; break;
            case 'down':  targetJ += 1; break;
            case 'left':  targetI -= 1; break;
            case 'right': targetI += 1; break;
            default: return null;
        }
        const entity = grid.getEntityAt(targetI, targetJ);
        if (entity) {
            entity.interact(this, grid);
            return entity;
        }
        return null;
    }
}
