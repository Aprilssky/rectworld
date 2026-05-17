/* Easing: ease-out quad */
export function easeOut(t) {
    return t * (2 - t);
}

export class BaseEntity {
    constructor(i, j, autoMove = false) {
        this.i = i;
        this.j = j;
        this.autoMove = autoMove;
        this.type = 'BaseEntity';
        this.color = '#888';
        this.label = '?';

        // Animation state
        this.animFromI = i;
        this.animFromJ = j;
        this.animToI = i;
        this.animToJ = j;
        this.animProgress = 1; // 1 = complete
        this.animDuration = 180; // ms
        this.animJumpHeight = 7; // px
        this.animating = false;
    }

    update(grid, dt) {
        // Override in subclasses
    }

    move(dx, dy) {
        this.i += dx;
        this.j += dy;
    }

    interact(interactor, grid) {
        // Override in subclasses
    }

    /* ---- Animation ---- */

    startMove(fromI, fromJ, toI, toJ) {
        this.animFromI = fromI;
        this.animFromJ = fromJ;
        this.animToI = toI;
        this.animToJ = toJ;
        this.animProgress = 0;
        this.animating = true;
    }

    updateAnimation(dt) {
        if (!this.animating) return;
        this.animProgress += dt / this.animDuration;
        if (this.animProgress >= 1) {
            this.animProgress = 1;
            this.animating = false;
        }
    }

    getVisualI() {
        if (!this.animating) return this.i;
        const t = easeOut(this.animProgress);
        return this.animFromI + (this.animToI - this.animFromI) * t;
    }

    getVisualJ() {
        if (!this.animating) return this.j;
        const t = easeOut(this.animProgress);
        return this.animFromJ + (this.animToJ - this.animFromJ) * t;
    }

    getJumpOffset() {
        if (!this.animating) return 0;
        // Parabolic arc: 0 at t=0, peak at t=0.5, 0 at t=1
        return -this.animJumpHeight * 4 * this.animProgress * (1 - this.animProgress);
    }
}
