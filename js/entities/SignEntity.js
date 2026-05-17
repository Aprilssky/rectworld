import { BaseEntity } from './BaseEntity.js';

export class SignEntity extends BaseEntity {
    constructor(i, j, message) {
        super(i, j, false);
        this.type = 'SignEntity';
        this.color = '#8D6E63';
        this.label = '牌';
        this.message = message || '路牌';
    }

    interact(interactor, grid) {
        return this;
    }
}
