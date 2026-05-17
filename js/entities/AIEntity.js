import { BaseEntity } from './BaseEntity.js';

export class AIEntity extends BaseEntity {
    constructor(i, j) {
        super(i, j, true);
        this.type = 'AIEntity';
        this.color = '#FF69B4';
        this.label = '猪';
    }

    update(grid, dt) {
        if (!this.autoMove) return;

        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const shuffled = dirs.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of shuffled) {
            const ni = this.i + dx;
            const nj = this.j + dy;
            if (grid.isValidPosition(ni, nj)) {
                this.startMove(this.i, this.j, ni, nj);
                this.i = ni;
                this.j = nj;
                return;
            }
        }
    }
}
