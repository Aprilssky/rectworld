import { BaseEntity } from './BaseEntity.js';
import {
    isOnline, isLoggedIn,
    saveWorld, loadWorld,
    saveWorldToLocal, loadWorldFromLocal, hasLocalWorld,
    savePlayerToLocal, loadPlayerFromLocal,
} from '../saveApi.js';

export class SaveEntity extends BaseEntity {
    constructor(i, j, grid) {
        super(i, j, false);
        this.type = 'SaveEntity';
        this.color = '#FFB300';
        this.label = '存';
        this.grid = grid;
        this.saveData = null;
    }

    async interact(interactor, grid) {
        if (interactor.j < this.j) {
            // Above → save world
            await this.doSave();
        } else if (interactor.j > this.j) {
            // Below → load world
            await this.doLoad();
        }
    }

    async doSave() {
        // Serialize world only (no player entities)
        this.saveData = this.grid.serializeWorld();

        if (isOnline() && isLoggedIn()) {
            const result = await saveWorld(this.saveData);
            if (result.success) {
                console.log(`☁️ 世界已保存 (${result.entityCount} 实体)`);
            } else {
                saveWorldToLocal(this.saveData);
                console.warn(`⚠️ 服务器保存失败: ${result.error || '未知错误'} → 已存本地`);
            }
        } else {
            if (isOnline() && !isLoggedIn()) {
                console.warn('⚠️ 在线模式下需要先登录才能保存世界到服务器');
            }
            saveWorldToLocal(this.saveData);
            console.log('💾 世界已保存到本地');
        }
    }

    async doLoad() {
        let loaded = false;

        // Try server first
        if (isOnline() && isLoggedIn()) {
            const result = await loadWorld();
            if (result.success && result.worldData) {
                this.saveData = result.worldData;
                this.deserialize();
                loaded = true;
                console.log('☁️ 世界已从服务器加载');
                window.dispatchEvent(new CustomEvent('game:loaded'));
                return;
            }
            if (result.status === 404) {
                console.warn('⚠️ 服务器上没有世界存档');
            } else {
                console.warn(`⚠️ 服务器加载失败: ${result.error || '未知错误'}`);
            }
        }

        // Fall back to local
        if (!loaded) {
            const local = loadWorldFromLocal();
            if (local) {
                this.saveData = local;
                this.deserialize();
                console.log('💾 世界已从本地加载');
                window.dispatchEvent(new CustomEvent('game:loaded'));
                return;
            }
        }

        console.warn('⚠️ 没有找到世界存档');
    }

    deserialize() {
        if (this.saveData) {
            this.grid.deserializeWorld(this.saveData);
        }
    }

    hasSaveData() {
        return this.saveData !== null || hasLocalWorld();
    }

    clearSaveData() {
        this.saveData = null;
    }
}
