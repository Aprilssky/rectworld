import { BaseEntity } from './BaseEntity.js';
import { saveToServer, loadFromServer } from '../saveApi.js';

export class SaveEntity extends BaseEntity {
    constructor(i, j, grid) {
        super(i, j, false);
        this.type = 'SaveEntity';
        this.color = '#FFB300';
        this.label = '存';
        this.grid = grid;
        this.saveData = null;
        this.serverAvailable = null;  // unknown until first check
    }

    async interact(interactor, grid) {
        if (interactor.j < this.j) {
            // Above → save
            await this.doSave();
        } else if (interactor.j > this.j && this.saveData) {
            // Below → load
            await this.doLoad();
        }
        // Side: no action
    }

    async doSave() {
        this.serialize();

        // Try server save
        const result = await saveToServer(this.saveData);
        if (result.success) {
            console.log(`☁️ ${result.message}`);
            this.serverAvailable = true;
        } else {
            // Fallback to localStorage
            localStorage.setItem('rictworld_save', this.saveData);
            if (result.fallback) {
                this.serverAvailable = false;
                console.log('💾 已保存到本地存储 (服务器不可用)');
            } else {
                console.warn(result.message);
            }
        }
    }

    async doLoad() {
        // Try server load first
        const result = await loadFromServer();
        if (result.success && result.saveData) {
            this.saveData = result.saveData;
            this.deserialize();
            this.serverAvailable = true;
            console.log(`☁️ ${result.message}`);
            window.dispatchEvent(new CustomEvent('game:loaded'));
            return;
        }

        // Fallback: check in-memory saveData
        if (this.saveData) {
            this.deserialize();
            console.log('💾 已从内存加载存档');
            window.dispatchEvent(new CustomEvent('game:loaded'));
            return;
        }

        // Fallback: check localStorage
        const localSave = localStorage.getItem('rictworld_save');
        if (localSave) {
            this.saveData = localSave;
            this.deserialize();
            if (result.fallback) this.serverAvailable = false;
            console.log('💾 已从本地存储加载存档');
            window.dispatchEvent(new CustomEvent('game:loaded'));
            return;
        }

        console.warn('没有找到存档数据');
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
        return this.saveData !== null;
    }

    clearSaveData() {
        this.saveData = null;
    }
}
