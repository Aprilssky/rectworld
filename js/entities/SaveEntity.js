import { BaseEntity } from './BaseEntity.js';
import {
  isOnline, isLoggedIn, getUsername,
  saveToServer, loadFromServer,
  saveToLocal, loadFromLocal, hasLocalSave,
} from '../saveApi.js';

export class SaveEntity extends BaseEntity {
    constructor(i, j, grid) {
        super(i, j, false);
        this.type = 'SaveEntity';
        this.color = '#FFB300';
        this.label = '存';
        this.grid = grid;
        this.saveData = null;
        this.serverAvailable = null;
    }

    async interact(interactor, grid) {
        if (interactor.j < this.j) {
            // Above → save
            await this.doSave();
        } else if (interactor.j > this.j) {
            // Below → load
            await this.doLoad();
        }
    }

    async doSave() {
        this.saveData = this.grid.serialize();

        if (isOnline()) {
            if (!isLoggedIn()) {
                console.warn('⚠️ 在线模式需要先登录');
                // Fallback to local
                saveToLocal(this.saveData);
                console.log('💾 已保存到本地存储');
                return;
            }
            const result = await saveToServer(this.saveData);
            if (result.success) {
                console.log(`☁️ ${result.message} (${getUsername()})`);
                this.serverAvailable = true;
            } else {
                // Fallback to local
                saveToLocal(this.saveData);
                this.serverAvailable = false;
                console.warn(`⚠️ 服务器保存失败: ${result.error || '未知错误'}`);
                console.log('💾 已回退到本地存储');
            }
        } else {
            // Offline mode
            saveToLocal(this.saveData);
            console.log('💾 已保存到本地存储 (离线模式)');
        }
    }

    async doLoad() {
        if (isOnline()) {
            if (!isLoggedIn()) {
                console.warn('⚠️ 在线模式需要先登录');
                // Fallback to local
                const localSave = loadFromLocal();
                if (localSave) {
                    this.saveData = localSave;
                    this.deserialize();
                    console.log('💾 已从本地存储加载');
                    window.dispatchEvent(new CustomEvent('game:loaded'));
                }
                return;
            }

            const result = await loadFromServer();
            if (result.success && result.saveData) {
                this.saveData = result.saveData;
                this.deserialize();
                this.serverAvailable = true;
                console.log(`☁️ ${result.message} (${getUsername()})`);
                window.dispatchEvent(new CustomEvent('game:loaded'));
                return;
            }

            // Server has no save or error
            if (result.status === 404) {
                console.warn('⚠️ 服务器上没有存档数据');
            } else {
                console.warn(`⚠️ 服务器加载失败: ${result.error || '未知错误'}`);
            }

            // Try local as fallback
            const localSave = loadFromLocal();
            if (localSave) {
                this.saveData = localSave;
                this.deserialize();
                console.log('💾 已从本地存储加载 (回退)');
                window.dispatchEvent(new CustomEvent('game:loaded'));
                return;
            }

            console.warn('没有找到任何存档');
            return;
        }

        // Offline mode
        const localSave = loadFromLocal();
        if (localSave) {
            this.saveData = localSave;
            this.deserialize();
            console.log('💾 已从本地存储加载 (离线模式)');
            window.dispatchEvent(new CustomEvent('game:loaded'));
        } else {
            console.warn('本地没有存档数据');
        }
    }

    serialize() {
        this.saveData = this.grid.serialize();
    }

    deserialize() {
        if (this.saveData) {
            this.grid.deserialize(this.saveData);
        }
    }

    hasSaveData() {
        return this.saveData !== null || hasLocalSave();
    }

    clearSaveData() {
        this.saveData = null;
    }
}
