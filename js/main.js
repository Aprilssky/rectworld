import { Grid } from './Grid.js';
import { Viewer } from './ui/Viewer.js';
import { PlayerEntity } from './entities/PlayerEntity.js';
import { TreeEntity } from './entities/TreeEntity.js';
import { AIEntity } from './entities/AIEntity.js';
import { SaveEntity } from './entities/SaveEntity.js';
import { ChestEntity } from './entities/ChestEntity.js';
import { ItemEntity } from './entities/ItemEntity.js';
import { WorkbenchEntity, RECIPES } from './entities/WorkbenchEntity.js';
import { NPCEntity, QUESTS } from './entities/NPCEntity.js';
import { SignEntity } from './entities/SignEntity.js';
import { StoneEntity } from './entities/StoneEntity.js';
import { FarmlandEntity } from './entities/FarmlandEntity.js';
import { DayNightSystem } from './systems/DayNightSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { initAuth, authState } from './auth.js';

/* ============================================================
   Setup
   ============================================================ */

const canvas = document.getElementById('gameCanvas');
const CELL_SIZE = 40;

const grid = new Grid();

let player = new PlayerEntity(0, 0);
player.addTool('axe');
grid.addEntity(player);

grid.addEntity(new TreeEntity(3, 3));
grid.addEntity(new TreeEntity(7, 7));
grid.addEntity(new TreeEntity(10, 5));

grid.addEntity(new AIEntity(8, 8));
grid.addEntity(new AIEntity(12, 3));

const savePoint = new SaveEntity(5, 5, grid);
grid.addEntity(savePoint);

const chest = new ChestEntity(15, 10);
grid.addEntity(chest);

const chest2 = new ChestEntity(16, 10);
chest2.addItem('Apple');
chest2.addItem('Apple');
chest2.addItem('Wood');
grid.addEntity(chest2);

// Phase 6 entities
grid.addEntity(new WorkbenchEntity(20, 5));
grid.addEntity(new NPCEntity(0, 8, 'apple_harvest'));
grid.addEntity(new NPCEntity(0, 10, 'wood_collect'));
grid.addEntity(new SignEntity(-3, 5, '🌲 欢迎来到 RictWorld！\nWSAD 移动 | 空格交互 | G 跳转坐标\nE 砍树/挖矿/耕地/种树 | B 背包\n⛏️ 镐挖石头 🔧 锄头耕地 🥕 种地'));
grid.addEntity(new SignEntity(5, 8, '⬆ 上方是存档点\n站在下方按空格加载存档\n站在上方按空格保存游戏'));

// Phase 7: Stone & Farmland
grid.addEntity(new StoneEntity(2, 2));
grid.addEntity(new StoneEntity(6, 1));
grid.addEntity(new StoneEntity(8, 9));

const viewer = new Viewer(canvas, grid, player, CELL_SIZE);

// Phase 6 systems
const dayNight = new DayNightSystem();
const audio = new AudioSystem();
window.__recipes = RECIPES;
window.__questData = { QUESTS };

// Touch control buttons (fire once on touch or click)
document.querySelectorAll('.touch-btn').forEach(btn => {
    let touched = false;
    btn.addEventListener('touchstart', (e) => {
        touched = true;
        e.preventDefault();
        handleKey(btn.dataset.key);
    }, { passive: false });
    btn.addEventListener('click', (e) => {
        if (touched) { touched = false; return; }
        e.preventDefault();
        handleKey(btn.dataset.key);
    });
});

/* ============================================================
   Game State
   ============================================================ */

const state = {
    bagOpen: false,
    chestEntity: null,
    activePanel: 'chest', // 'chest' | 'bag'
    workbenchEntity: null,
    npcEntity: null,
    npcState: null,       // 'intro' | 'active' | 'done'
    signEntity: null,
};

let lastGridUpdate = performance.now();
const UPDATE_INTERVAL = 500;

/* ============================================================
   After load: refresh references
   ============================================================ */

window.addEventListener('game:loaded', () => {
    const allEntities = grid.getAllEntities();
    const newPlayer = allEntities.find(e => e.type === 'PlayerEntity');
    if (newPlayer) {
        player = newPlayer;
        viewer.player = newPlayer;
    }
    state.chestEntity = null;
});

/* ============================================================
   Drop / Transfer helpers
   ============================================================ */

function dropSelectedItem() {
    const itemType = player.getSelectedType();
    if (!itemType) return;

    const adj = grid.findAdjacentFree(player.i, player.j);
    if (!adj) {
        console.warn('周围没有空地');
        return;
    }
    if (player.takeItem(itemType)) {
        const dropped = new ItemEntity(adj[0], adj[1], itemType);
        grid.addEntity(dropped);
        player.normalizeSelection();
        audio.drop();
        console.log(`丢掉了 ${itemType}`);
    }
}

function transferItem(direction) {
    // direction: 'toBag' = chest → player,  'toChest' = player → chest
    const chestEnt = state.chestEntity;
    if (!chestEnt) return;

    if (direction === 'toBag') {
        const slots = Object.entries(chestEnt.inventory);
        const sel = chestEnt.selectedSlot;
        if (sel < 0 || sel >= slots.length) return;
        const [itemType, count] = slots[sel];

        if (count > 0 && player.storeItem(itemType)) {
            chestEnt.removeItem(itemType);
            audio.pickup();
            console.log(`从箱子取出 ${itemType}`);
        }
    } else {
        const itemType = player.getSelectedType();
        if (!itemType) return;

        if (chestEnt.addItem(itemType)) {
            player.takeItem(itemType);
            player.normalizeSelection();
            audio.drop();
            console.log(`存入箱子 ${itemType}`);
        }
    }
}

function handleNumberKey(n) {
    // n is 0-9 (0 = slot 9)
    const idx = n === 0 ? 9 : n - 1;

    if (state.chestEntity) {
        if (state.activePanel === 'chest') {
            const chestEnt = state.chestEntity;
            const slots = Object.entries(chestEnt.inventory);
            if (idx < slots.length) {
                chestEnt.selectedSlot = idx;
            }
        } else {
            const slots = player.getBagSlots();
            if (idx < slots.length) {
                player.selectedSlot = idx;
            }
        }
    } else if (state.bagOpen) {
        const slots = player.getBagSlots();
        if (idx < slots.length) {
            player.selectedSlot = idx;
        }
    }
}

/* ---- Crafting helper ---- */

function craftSelected() {
    const wb = state.workbenchEntity;
    if (!wb) return;
    const recipes = window.__recipes || [];
    if (wb.selectedRecipe < 0 || wb.selectedRecipe >= recipes.length) return;
    const recipe = recipes[wb.selectedRecipe];

    // Prevent wasting materials on tools already owned
    if ((recipe.id === 'axe' && player.hasTool('axe')) ||
        (recipe.id === 'basket' && player.hasTool('basket')) ||
        (recipe.id === 'torch' && player.hasTool('torch')) ||
        (recipe.id === 'pickaxe' && player.hasTool('pickaxe')) ||
        (recipe.id === 'hoe' && player.hasTool('hoe'))) {
        audio.error();
        console.warn('已拥有该工具');
        return;
    }

    if (wb.craft(player, recipe.id)) {
        audio.craft();
        player.normalizeSelection();
    } else {
        audio.error();
    }
}

/* ---- NPC state helper ---- */

function getNPCState(npc) {
    const qd = player.questData;
    if (qd.activeQuest === npc.questId && qd.state === 'active') return 'active';
    if (qd.activeQuest === npc.questId && qd.state === 'done') return 'done';
    if (qd.state === 'done') return 'done';
    return 'intro';
}

/* ============================================================
   Input handling
   ============================================================ */

function handleMovement(key) {
    let moved = false;
    switch (key) {
        case 'ArrowUp': case 'w': case 'W':
            player.move(0, -1);
            player.direction = 'up';
            moved = true;
            break;
        case 'ArrowDown': case 's': case 'S':
            player.move(0, 1);
            player.direction = 'down';
            moved = true;
            break;
        case 'ArrowLeft': case 'a': case 'A':
            player.move(-1, 0);
            player.direction = 'left';
            moved = true;
            break;
        case 'ArrowRight': case 'd': case 'D':
            player.move(1, 0);
            player.direction = 'right';
            moved = true;
            break;
    }
    if (moved) audio.step();
}

function handleKey(key) {
    // ─── Crafting UI mode ───
    if (state.workbenchEntity) {
        switch (key) {
            case ' ': case 'Space':
                state.workbenchEntity = null;
                return;
            case 'e': case 'E':
                craftSelected();
                return;
            case 'ArrowUp':
                state.workbenchEntity.selectedRecipe = Math.max(0, (state.workbenchEntity.selectedRecipe || 0) - 1);
                return;
            case 'ArrowDown':
                const recipes = window.__recipes || [];
                state.workbenchEntity.selectedRecipe = Math.min(recipes.length - 1, (state.workbenchEntity.selectedRecipe || 0) + 1);
                return;
            default:
                if (/^[0-9]$/.test(key)) {
                    const idx = parseInt(key);
                    if (idx >= 1 && idx <= 9) {
                        const r = window.__recipes || [];
                        state.workbenchEntity.selectedRecipe = Math.min(r.length - 1, idx - 1);
                    }
                }
                return;
        }
    }

    // ─── NPC dialogue mode ───
    if (state.npcEntity) {
        switch (key) {
            case ' ': case 'Space':
                state.npcEntity = null;
                state.npcState = null;
                return;
            case 'e': case 'E':
                if (state.npcState === 'intro') {
                    state.npcEntity.startQuest(player);
                    audio.interact();
                    const completed = player.checkQuestProgress();
                    state.npcState = completed ? 'done' : 'active';
                    if (completed) audio.questComplete();
                } else if (state.npcState === 'active') {
                    const completed = player.checkQuestProgress();
                    if (completed) {
                        audio.questComplete();
                        state.npcState = 'done';
                    }
                }
                return;
            default:
                return;
        }
    }

    // ─── Sign popup mode ───
    if (state.signEntity) {
        switch (key) {
            case ' ': case 'Space':
                state.signEntity = null;
                return;
            default:
                return;
        }
    }

    // ─── Chest mode ───
    if (state.chestEntity) {
        switch (key) {
            case ' ': case 'Space':
                state.chestEntity = null;
                player.selectedSlot = -1;
                return;
            case 'Tab':
                state.activePanel = state.activePanel === 'chest' ? 'bag' : 'chest';
                return;
            case 'e': case 'E':
                if (state.activePanel === 'chest') {
                    transferItem('toBag');
                } else {
                    transferItem('toChest');
                }
                return;
            case 'q': case 'Q':
                if (state.activePanel === 'bag') {
                    dropSelectedItem();
                }
                return;
            case 'ArrowUp':
                if (state.activePanel === 'chest') {
                    const chestSlots = Object.entries(state.chestEntity.inventory);
                    if (chestSlots.length > 0) {
                        state.chestEntity.selectedSlot = Math.max(0, (state.chestEntity.selectedSlot || 0) - 1);
                    }
                } else {
                    const slots = player.getBagSlots();
                    if (slots.length > 0) {
                        player.selectedSlot = Math.max(0, (player.selectedSlot || 0) - 1);
                    }
                }
                return;
            case 'ArrowDown':
                if (state.activePanel === 'chest') {
                    const chestSlots = Object.entries(state.chestEntity.inventory);
                    if (chestSlots.length > 0) {
                        const cur = state.chestEntity.selectedSlot || 0;
                        state.chestEntity.selectedSlot = Math.min(chestSlots.length - 1, cur + 1);
                    }
                } else {
                    const slots = player.getBagSlots();
                    if (slots.length > 0) {
                        const cur = player.selectedSlot || 0;
                        player.selectedSlot = Math.min(slots.length - 1, cur + 1);
                    }
                }
                return;
            default:
                if (/^[0-9]$/.test(key)) {
                    handleNumberKey(parseInt(key));
                }
                return;
        }
    }

    // ─── Bag mode ───
    if (state.bagOpen) {
        switch (key) {
            case 'b': case 'B':
                state.bagOpen = false;
                player.selectedSlot = -1;
                return;
            case 'q': case 'Q':
                dropSelectedItem();
                return;
            default:
                if (/^[0-9]$/.test(key)) {
                    handleNumberKey(parseInt(key));
                } else {
                    handleMovement(key); // movement still works with bag open
                }
                return;
        }
    }

    // ─── Normal mode ───
    switch (key) {
        case 'ArrowUp': case 'w': case 'W':
        case 'ArrowDown': case 's': case 'S':
        case 'ArrowLeft': case 'a': case 'A':
        case 'ArrowRight': case 'd': case 'D':
            handleMovement(key);
            break;
        case 'g': case 'G': {
            const input = prompt('跳转到坐标 (格式: x,y):', `${player.i},${player.j}`);
            if (input) {
                const parts = input.split(',').map(s => parseInt(s.trim(), 10));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const [ti, tj] = parts;
                    player.animating = false;
                    player.animProgress = 1;
                    player.queuedDx = undefined;
                    player.queuedDy = undefined;
                    player.i = ti;
                    player.j = tj;
                    console.log(`📍 跳转到 (${ti}, ${tj})`);
                } else {
                    console.warn('坐标格式错误，请使用 x,y 格式');
                }
            }
            break;
        }
        case ' ': case 'Space': {
            const target = player.interact(grid);
            if (target) {
                audio.interact();
                if (target.type === 'ChestEntity') {
                    state.chestEntity = target;
                    state.activePanel = 'chest';
                    state.chestEntity.selectedSlot = 0;
                } else if (target.type === 'WorkbenchEntity') {
                    state.workbenchEntity = target;
                    state.workbenchEntity.selectedRecipe = 0;
                } else if (target.type === 'NPCEntity') {
                    state.npcEntity = target;
                    const completed = player.checkQuestProgress();
                    if (completed) audio.questComplete();
                    state.npcState = getNPCState(target);
                } else if (target.type === 'SignEntity') {
                    state.signEntity = target;
                }
            }
            break;
        }
        case 'b': case 'B':
            state.bagOpen = !state.bagOpen;
            player.selectedSlot = state.bagOpen ? 0 : -1;
            break;
        case 'e': case 'E': {
            // Compute facing position
            let fi = player.i, fj = player.j;
            switch (player.direction) {
                case 'up': fj--; break;
                case 'down': fj++; break;
                case 'left': fi--; break;
                case 'right': fi++; break;
            }
            const fe = grid.getEntityAt(fi, fj);

            if (fe && fe.type === 'SignEntity') {
                const newMsg = prompt('编辑路牌文字:', fe.message);
                if (newMsg !== null && newMsg.trim().length > 0) {
                    fe.message = newMsg.trim();
                    audio.interact();
                }
            } else if (fe && fe.type === 'TreeEntity' && player.hasTool('axe')) {
                // Chop tree
                fe.chop(grid);
                audio.drop();
            } else if (fe && fe.type === 'StoneEntity' && player.hasTool('pickaxe')) {
                // Mine stone
                fe.mine(grid);
                audio.drop();
            } else if (fe && fe.type === 'FarmlandEntity') {
                // Plant seed or harvest crop
                fe.interact(player, grid);
                audio.interact();
            } else if (!fe && player.hasTool('hoe')) {
                // Till soil
                grid.addEntity(new FarmlandEntity(fi, fj));
                audio.interact();
                console.log('🔧 开垦了耕地');
            } else if (!fe && player.countItem('Sapling') > 0) {
                // Plant tree on empty ground
                player.takeItem('Sapling');
                grid.addEntity(new TreeEntity(fi, fj));
                audio.interact();
                console.log('🌱 种了一棵树');
            }

            quickPickup();
            const completed = player.checkQuestProgress();
            if (completed) audio.questComplete();
            break;
        }
    }
}

/** Pick up adjacent ItemEntity */
function quickPickup() {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [di, dj] of dirs) {
        const entity = grid.getEntityAt(player.i + di, player.j + dj);
        if (entity && entity.type === 'ItemEntity') {
            if (player.storeItem(entity.itemType)) {
                grid.removeEntity(entity);
                audio.pickup();
                console.log(`捡起了 ${entity.itemType}`);
                return;
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    // Skip if auth modal is open or an input field is focused
    const tag = document.activeElement ? document.activeElement.tagName : null;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.getElementById('authOverlay').classList.contains('show')) return;
    const controlKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        ' ', 'Space', 'b', 'B', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
        'e', 'E', 'q', 'Q', 'Tab', 'g', 'G',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ];
    if (controlKeys.includes(e.key)) {
        e.preventDefault();
        handleKey(e.key);
    }
});

/* ============================================================
   Touch / swipe
   ============================================================ */

let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let clickFromTouch = false;

// Click the hint text at the bottom of the canvas to interact
canvas.addEventListener('click', (e) => {
    if (clickFromTouch) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * sx;
    const cy = (e.clientY - rect.top) * sy;
    const hr = viewer._hintRect;
    if (hr && cx >= hr.x && cx <= hr.x + hr.w && cy >= hr.y && cy <= hr.y + hr.h) {
        handleKey(' ');
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
    touchStartTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    clickFromTouch = true;
    setTimeout(() => clickFromTouch = false, 150);
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (absDx < 20 && absDy < 20 && dt < 250) {
        handleKey(' ');
        return;
    }
    if (absDx > 20 || absDy > 20) {
        handleKey(absDx > absDy
            ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
            : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
    }
}, { passive: false });

/* ============================================================
   Game Loop
   ============================================================ */

let lastTimestamp = 0;
let frameCount = 0;
let fpsTimer = 0;
const fpsDisplay = document.getElementById('fpsDisplay');

function gameLoop(timestamp) {
    const dt = lastTimestamp ? timestamp - lastTimestamp : 16;

    if (timestamp - lastGridUpdate > UPDATE_INTERVAL) {
        grid.update(UPDATE_INTERVAL);
        dayNight.advance();
        lastGridUpdate = timestamp;
    }

    for (const entity of grid.getAllEntities()) {
        entity.updateAnimation(dt);
    }

    viewer.draw({
        bagOpen: state.bagOpen,
        chestEntity: state.chestEntity,
        activePanel: state.activePanel,
        dayNight: dayNight,
        workbenchEntity: state.workbenchEntity,
        npcEntity: state.npcEntity,
        npcState: state.npcState,
        signEntity: state.signEntity,
    });

    frameCount++;
    if (timestamp - fpsTimer > 1000) {
        fpsDisplay.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        fpsTimer = timestamp;
    }

    lastTimestamp = timestamp;
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// Initialize auth module (login/modal + mode toggle)
initAuth();
