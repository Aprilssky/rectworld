import { BaseEntity } from './BaseEntity.js';

export const RECIPES = [
    {
        id: 'axe',
        name: '🪓 木斧',
        desc: '砍树额外获得木材',
        inputs: { Wood: 3 },
        onCraft(p) { p.addTool('axe'); },
    },
    {
        id: 'basket',
        name: '🧺 篮子',
        desc: '背包容量 +5',
        inputs: { Wood: 3, Apple: 2 },
        onCraft(p) { p.addTool('basket'); },
    },
    {
        id: 'torch',
        name: '🔥 火把',
        desc: '扩大夜晚视野',
        inputs: { Wood: 2, Apple: 1 },
        onCraft(p) { p.addTool('torch'); },
    },
    {
        id: 'pickaxe',
        name: '⛏️ 镐',
        desc: '开采石头矿脉',
        inputs: { Wood: 2, Stone: 3 },
        onCraft(p) { p.addTool('pickaxe'); },
    },
    {
        id: 'hoe',
        name: '🔧 锄头',
        desc: '开垦耕地种植作物',
        inputs: { Wood: 2, Stone: 2 },
        onCraft(p) { p.addTool('hoe'); },
    },
];

export class WorkbenchEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, false);
        this.type = 'WorkbenchEntity';
        this.color = '#8D6E63';
        this.label = '台';
        this.selectedRecipe = 0;
    }

    interact(interactor, grid) {
        console.log('打开工作台');
        // Return self so main.js can open crafting UI
        return this;
    }

    /** Try to craft the selected recipe; returns true if successful */
    craft(player, recipeId) {
        const recipe = RECIPES.find(r => r.id === recipeId);
        if (!recipe) return false;

        for (const [item, need] of Object.entries(recipe.inputs)) {
            if (player.countItem(item) < need) {
                console.warn(`缺少材料: ${item} ×${need}`);
                return false;
            }
        }

        for (const [item, need] of Object.entries(recipe.inputs)) {
            for (let i = 0; i < need; i++) player.takeItem(item);
        }

        if (recipe.onCraft) recipe.onCraft(player);
        console.log(`🔨 合成了: ${recipe.name}`);
        return true;
    }
}
