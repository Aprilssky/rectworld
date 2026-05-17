/**
 * RictWorld Main v3.0 — Shared World + Per-Player State
 */
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
import {
    isOnline, isLoggedIn, getMode, getToken,
    loadWorld, saveWorld, loadPlayerState, savePlayerState,
    saveWorldToLocal, loadWorldFromLocal, hasLocalWorld,
    savePlayerToLocal, loadPlayerFromLocal, hasLocalPlayer,
} from './saveApi.js';

/* ============================================================
   Default World
   ============================================================ */

/** Create/recreate the default world entities (no player) */
function populateDefaultWorld(grid) {
    grid.addEntity(new TreeEntity(3, 3));
    grid.addEntity(new TreeEntity(7, 7));
    grid.addEntity(new TreeEntity(10, 5));
    grid.addEntity(new TreeEntity(12, 8));

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

    grid.addEntity(new WorkbenchEntity(20, 5));
    grid.addEntity(new NPCEntity(0, 8, 'apple_harvest'));
    grid.addEntity(new NPCEntity(0, 10, 'wood_collect'));
    grid.addEntity(new SignEntity(-3, 5,
        '🌲 欢迎来到 RictWorld！\nWSAD 移动 | 空格交互 | G 跳转坐标\n'
        + 'E 砍树/挖矿/耕地/种树 | B 背包\n'
        + '⛏️ 镐挖石头 🔧 锄头耕地 🥕 种地'));
    grid.addEntity(new SignEntity(5, 8,
        '⬆ 上方是存档点\n站在下方按空格加载存档\n站在上方按空格保存游戏'));

    grid.addEntity(new StoneEntity(2, 2));
    grid.addEntity(new StoneEntity(6, 1));
    grid.addEntity(new StoneEntity(8, 9));
}

/* ============================================================
   Setup
   ============================================================ */

const canvas = document.getElementById('gameCanvas');
const CELL_SIZE = 40;

const grid = new Grid();
const dayNight = new DayNightSystem();
const audio = new AudioSystem();

window.__recipes = RECIPES;
window.__questData = { QUESTS };

// Will be set after loading
let player = null;
let viewer = null;

/* ============================================================
   Game State
   ============================================================ */

const state = {
    bagOpen: false,
    chestEntity: null,
    activePanel: 'chest',
    workbenchEntity: null,
    npcEntity: null,
    npcState: null,
    signEntity: null,
};

let lastGridUpdate = performance.now();
const UPDATE_INTERVAL = 500;

/* ============================================================
   Auto-save (player state)
   ============================================================ */

let _lastSaveTime = 0;
const SAVE_INTERVAL = 3000; // ms between auto-saves

function autoSavePlayer() {
    if (!player) return;
    const now = Date.now();
    if (now - _lastSaveTime < SAVE_INTERVAL) return;
    _lastSaveTime = now;

    const playerData = grid.serializePlayer(player);

    // Always save locally
    savePlayerToLocal(playerData);

    // If online, save to server (fire + forget)
    if (isOnline() && isLoggedIn() && getMode() === 'online') {
        savePlayerState(playerData).catch(() => {});
    }
}

function autoSaveWorld() {
    const worldData = grid.serializeWorld();

    // Always cache locally
    saveWorldToLocal(worldData);

    // Fire + forget to server if online
    if (isOnline() && isLoggedIn()) {
        saveWorld(worldData).catch(() => {});
    }
}

/* ============================================================
   Game Initialization
   ============================================================ */

async function initGame() {
    // ── Step 1: Load shared world ──
    let worldLoaded = false;

    // Try server first
    if (isOnline() && getToken()) {
        try {
            const result = await loadWorld();
            if (result.exists && result.worldData) {
                grid.deserializeWorld(result.worldData);
                worldLoaded = true;
                console.log('🌍 从服务器加载世界');
            }
        } catch (e) {
            console.warn('⚠️ 无法从服务器加载世界:', e.message);
        }
    }

    // Fall back to local cache
    if (!worldLoaded && hasLocalWorld()) {
        try {
            const local = loadWorldFromLocal();
            grid.deserializeWorld(local);
            worldLoaded = true;
            console.log('💾 从本地缓存加载世界');
        } catch (e) {
            console.warn('⚠️ 本地世界缓存损坏:', e.message);
        }
    }

    // Fall back to default
    if (!worldLoaded) {
        populateDefaultWorld(grid);
        console.log('🏗️ 创建默认世界');
    }

    // ── Step 2: Load player state ──
    let playerLoaded = false;

    if (isOnline() && isLoggedIn() && getToken()) {
        try {
            const result = await loadPlayerState();
            if (result.exists && result.playerData) {
                player = grid.createPlayerFromData(result.playerData);
                playerLoaded = true;
                console.log(`👤 从服务器加载玩家 (${result.playerData.i}, ${result.playerData.j})`);
            }
        } catch (e) {
            console.warn('⚠️ 无法从服务器加载玩家:', e.message);
        }
    }

    if (!playerLoaded && hasLocalPlayer()) {
        try {
            const local = loadPlayerFromLocal();
            player = grid.createPlayerFromData(local);
            playerLoaded = true;
            console.log('💾 从本地缓存加载玩家');
        } catch (e) {
            console.warn('⚠️ 本地玩家缓存损坏:', e.message);
        }
    }

    // Fall back to new player at spawn
    if (!playerLoaded) {
        player = new PlayerEntity(0, 0);
        player.addTool('axe');
        console.log('🆕 创建新玩家');
    }

    grid.addEntity(player);
    viewer = new Viewer(canvas, grid, player, CELL_SIZE);

    window.dispatchEvent(new CustomEvent('game:loaded'));
    console.log('✅ 游戏初始化完成');
}

/* ============================================================
   Refs update on load
   ============================================================ */

window.addEventListener('game:loaded', () => {
    const allEntities = grid.getAllEntities();
    const newPlayer = allEntities.find(e => e.type === 'PlayerEntity');
    if (newPlayer) {
        player = newPlayer;
        if (viewer) viewer.player = newPlayer;
    }
    state.chestEntity = null;
});

/* ============================================================
   Touch controls
   ============================================================ */

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
   Drop / Transfer helpers
   ============================================================ */

function dropSelectedItem() {
    const itemType = player.getSelectedType();
    if (!itemType) return;
    const adj = grid.findAdjacentFree(player.i, player.j);
    if (!adj) { console.warn('周围没有空地'); return; }
    if (player.takeItem(itemType)) {
        const dropped = new ItemEntity(adj[0], adj[1], itemType);
        grid.addEntity(dropped);
        player.normalizeSelection();
        audio.drop();
        autoSavePlayer();
        autoSaveWorld();
    }
}

function transferItem(direction) {
    const chestEnt = state.chestEntity;
    if (!chestEnt) return;

    if (direction === 'toBag') {
        const slots = Object.entries(chestEnt.inventory);
        const sel = chestEnt.selectedSlot;
        if (sel < 0 || sel >= slots.length) return;
        const [itemType] = slots[sel];
        if (chestEnt.inventory[itemType] > 0 && player.storeItem(itemType)) {
            chestEnt.removeItem(itemType);
            audio.pickup();
            autoSavePlayer();
        }
    } else {
        const itemType = player.getSelectedType();
        if (!itemType) return;
        if (chestEnt.addItem(itemType)) {
            player.takeItem(itemType);
            player.normalizeSelection();
            audio.drop();
            autoSavePlayer();
        }
    }
}

function handleNumberKey(n) {
    const idx = n === 0 ? 9 : n - 1;
    if (state.chestEntity) {
        if (state.activePanel === 'chest') {
            const slots = Object.entries(state.chestEntity.inventory);
            if (idx < slots.length) state.chestEntity.selectedSlot = idx;
        } else {
            const slots = player.getBagSlots();
            if (idx < slots.length) player.selectedSlot = idx;
        }
    } else if (state.bagOpen) {
        const slots = player.getBagSlots();
        if (idx < slots.length) player.selectedSlot = idx;
    }
}

function craftSelected() {
    const wb = state.workbenchEntity;
    if (!wb) return;
    const recipes = window.__recipes || [];
    if (wb.selectedRecipe < 0 || wb.selectedRecipe >= recipes.length) return;
    const recipe = recipes[wb.selectedRecipe];
    if ((recipe.id === 'axe' && player.hasTool('axe')) ||
        (recipe.id === 'basket' && player.hasTool('basket')) ||
        (recipe.id === 'torch' && player.hasTool('torch')) ||
        (recipe.id === 'pickaxe' && player.hasTool('pickaxe')) ||
        (recipe.id === 'hoe' && player.hasTool('hoe'))) {
        audio.error();
        return;
    }
    if (wb.craft(player, recipe.id)) {
        audio.craft();
        player.normalizeSelection();
        autoSavePlayer();
    } else {
        audio.error();
    }
}

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
    if (moved) {
        audio.step();
        autoSavePlayer();
    }
}

function handleKey(key) {
    guard: {
        if (state.workbenchEntity) break guard;
        if (state.npcEntity) break guard;
        if (state.signEntity) break guard;
        if (state.chestEntity) break guard;
        if (state.bagOpen) {
            // Bag mode still allows movement
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(key)) {
                handleMovement(key);
                return;
            }
            switch (key) {
                case 'b': case 'B':
                    state.bagOpen = false;
                    player.selectedSlot = -1;
                    autoSavePlayer(); return;
                case 'q': case 'Q':
                    dropSelectedItem();
                    autoSavePlayer(); return;
                default:
                    if (/^[0-9]$/.test(key)) handleNumberKey(parseInt(key));
                    return;
            }
        }
        // Normal mode
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
                        autoSavePlayer();
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
                    } else if (target.type === 'SaveEntity') {
                        // Save point handled by SaveEntity.interact()
                        autoSaveWorld();
                        autoSavePlayer();
                    }
                }
                break;
            }
            case 'b': case 'B':
                state.bagOpen = !state.bagOpen;
                player.selectedSlot = state.bagOpen ? 0 : -1;
                break;
            case 'e': case 'E': {
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
                        autoSaveWorld();
                    }
                } else if (fe && fe.type === 'TreeEntity' && player.hasTool('axe')) {
                    fe.chop(grid);
                    audio.drop();
                    autoSaveWorld();
                    autoSavePlayer();
                } else if (fe && fe.type === 'StoneEntity' && player.hasTool('pickaxe')) {
                    fe.mine(grid);
                    audio.drop();
                    autoSaveWorld();
                    autoSavePlayer();
                } else if (fe && fe.type === 'FarmlandEntity') {
                    fe.interact(player, grid);
                    audio.interact();
                    autoSaveWorld();
                    autoSavePlayer();
                } else if (!fe && player.hasTool('hoe')) {
                    grid.addEntity(new FarmlandEntity(fi, fj));
                    audio.interact();
                    autoSaveWorld();
                } else if (!fe && player.countItem('Sapling') > 0) {
                    player.takeItem('Sapling');
                    grid.addEntity(new TreeEntity(fi, fj));
                    audio.interact();
                    autoSaveWorld();
                    autoSavePlayer();
                }
                quickPickup();
                const completed = player.checkQuestProgress();
                if (completed) audio.questComplete();
                autoSavePlayer();
                break;
            }
        }
        return;
    }

    // Overlay/UI modes
    if (state.workbenchEntity) {
        switch (key) {
            case ' ': case 'Space': state.workbenchEntity = null; return;
            case 'e': case 'E': craftSelected(); return;
            case 'ArrowUp':
                state.workbenchEntity.selectedRecipe = Math.max(0, (state.workbenchEntity.selectedRecipe || 0) - 1); return;
            case 'ArrowDown': {
                const recipes = window.__recipes || [];
                state.workbenchEntity.selectedRecipe = Math.min(recipes.length - 1, (state.workbenchEntity.selectedRecipe || 0) + 1); return;
            }
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
    if (state.npcEntity) {
        switch (key) {
            case ' ': case 'Space': state.npcEntity = null; state.npcState = null; return;
            case 'e': case 'E':
                if (state.npcState === 'intro') {
                    state.npcEntity.startQuest(player);
                    audio.interact();
                    const completed = player.checkQuestProgress();
                    state.npcState = completed ? 'done' : 'active';
                    if (completed) audio.questComplete();
                } else if (state.npcState === 'active') {
                    const completed = player.checkQuestProgress();
                    if (completed) { audio.questComplete(); state.npcState = 'done'; }
                }
                return;
            default: return;
        }
    }
    if (state.signEntity) {
        switch (key) {
            case ' ': case 'Space': state.signEntity = null; return;
            default: return;
        }
    }
    if (state.chestEntity) {
        switch (key) {
            case ' ': case 'Space': state.chestEntity = null; player.selectedSlot = -1; return;
            case 'Tab': state.activePanel = state.activePanel === 'chest' ? 'bag' : 'chest'; return;
            case 'e': case 'E':
                state.activePanel === 'chest' ? transferItem('toBag') : transferItem('toChest');
                autoSavePlayer(); return;
            case 'q': case 'Q':
                if (state.activePanel === 'bag') dropSelectedItem();
                autoSavePlayer(); return;
            case 'ArrowUp':
                if (state.activePanel === 'chest') {
                    const slots = Object.entries(state.chestEntity.inventory);
                    if (slots.length > 0) state.chestEntity.selectedSlot = Math.max(0, (state.chestEntity.selectedSlot || 0) - 1);
                } else {
                    const slots = player.getBagSlots();
                    if (slots.length > 0) player.selectedSlot = Math.max(0, (player.selectedSlot || 0) - 1);
                }
                return;
            case 'ArrowDown':
                if (state.activePanel === 'chest') {
                    const slots = Object.entries(state.chestEntity.inventory);
                    if (slots.length > 0) {
                        const cur = state.chestEntity.selectedSlot || 0;
                        state.chestEntity.selectedSlot = Math.min(slots.length - 1, cur + 1);
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
                if (/^[0-9]$/.test(key)) handleNumberKey(parseInt(key));
                return;
        }
    }
}

function quickPickup() {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [di, dj] of dirs) {
        const entity = grid.getEntityAt(player.i + di, player.j + dj);
        if (entity && entity.type === 'ItemEntity') {
            if (player.storeItem(entity.itemType)) {
                grid.removeEntity(entity);
                audio.pickup();
                autoSavePlayer();
                autoSaveWorld();
                return;
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
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

canvas.addEventListener('click', (e) => {
    if (clickFromTouch) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * sx;
    const cy = (e.clientY - rect.top) * sy;
    const hr = viewer && viewer._hintRect;
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
    if (absDx < 20 && absDy < 20 && dt < 250) { handleKey(' '); return; }
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

/* ============================================================
   Start!
   ============================================================ */

initGame().then(() => {
    requestAnimationFrame(gameLoop);
});

initAuth();
