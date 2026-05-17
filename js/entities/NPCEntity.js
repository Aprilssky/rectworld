import { BaseEntity } from './BaseEntity.js';

export const QUESTS = {
    apple_harvest: {
        id: 'apple_harvest',
        name: '🥧 苹果丰收',
        desc: '收集 5 个苹果交给农夫',
        objective: { type: 'collect', item: 'Apple', count: 5 },
        reward: { type: 'bag_upgrade', amount: 3 },
        dialogue: {
            intro: '你好，冒险家！我烤苹果派需要很多苹果。帮我收集5个，我帮你升级背包！',
            active: '还差 %s 个苹果…加油！',
            done: '太感谢了！背包已经帮你扩过了，随时欢迎再来！',
        },
    },
    wood_collect: {
        id: 'wood_collect',
        name: '🪵 木材储备',
        desc: '收集 3 个木材',
        objective: { type: 'collect', item: 'Wood', count: 3 },
        reward: { type: 'tool', toolId: 'axe' },
        dialogue: {
            intro: '伐木工需要帮手！帮我收集3个木材，我送你一把斧头！',
            active: '还差 %s 个木材…继续努力！',
            done: '干得好！这把斧头你拿着，砍树效率更高！',
        },
    },
};

export class NPCEntity extends BaseEntity {
    constructor(i, j, questId) {
        super(i, j, false);
        this.type = 'NPCEntity';
        this.questId = questId || 'apple_harvest';
        this.color = '#FFB74D';
        this.label = '民';
    }

    get quest() {
        return QUESTS[this.questId];
    }

    interact(interactor, grid) {
        return this;
    }

    /** Get dialogue text based on player's quest state */
    getDialogue(player) {
        const q = this.quest;
        if (!q) return '…';

        const qd = player.questData;

        if (qd.activeQuest === this.questId && qd.state === 'active') {
            const need = q.objective.count - qd.progress;
            return q.dialogue.active.replace('%s', Math.max(0, need));
        }

        if (qd.activeQuest === this.questId && qd.state === 'done') {
            return q.dialogue.done;
        }

        // Check if already completed ever
        if (qd.state === 'done' && qd.activeQuest !== this.questId) {
            return q.dialogue.done || '你好！';
        }

        return q.dialogue.intro;
    }

    /** Called when player presses action key near this NPC */
    startQuest(player) {
        const q = this.quest;
        if (!q) return;

        const qd = player.questData;

        // If quest already done for this NPC, skip
        if (qd.activeQuest === this.questId && qd.state === 'done') return;

        // If player has another active quest, don't allow switching
        if (qd.activeQuest && qd.activeQuest !== this.questId && qd.state === 'active') {
            console.warn('你已经有进行中的任务了');
            return;
        }

        qd.activeQuest = this.questId;
        qd.state = 'active';
        qd.progress = player.countItem(q.objective.item);
        console.log(`📜 接受任务: ${q.name}`);
    }
}
