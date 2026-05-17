/**
 * Day/Night cycle.
 * tick advances each grid update (~500ms).
 * At tick 0 = dawn, 60 = noon, 120 = dusk, 180 = midnight, 240 = dawn again.
 */
const CYCLE_LENGTH = 240;

export class DayNightSystem {
    constructor() {
        this.tick = 60; // start at noon
    }

    /** Advance one tick (called each grid update) */
    advance() {
        this.tick = (this.tick + 1) % CYCLE_LENGTH;
    }

    /** Normalised phase 0-1 (0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight) */
    get phase() {
        return this.tick / CYCLE_LENGTH;
    }

    /** Brightness 0 (night) — 1 (full day) */
    get brightness() {
        const p = this.phase;
        // Dawn (0-0.08): ramp up; Dusk (0.42-0.5): ramp down
        if (p < 0.08) return 0.3 + p / 0.08 * 0.7;
        if (p < 0.42) return 1.0;
        if (p < 0.5) return 1.0 - (p - 0.42) / 0.08 * 0.7;
        return 0.3;
    }

    get skyColor() {
        const b = this.brightness;
        const r = 0.18 * b + 0.05 * (1 - b);
        const g = 0.27 * b + 0.05 * (1 - b);
        const bl = 0.33 * b + 0.10 * (1 - b);
        return { r, g, b: bl };
    }

    /** Darkness overlay alpha (0 = none at day, ~0.7 at midnight) */
    get darkness() {
        return 1 - this.brightness;
    }

    /** Player light radius in px. Torch extends it. */
    getLightRadius(hasTorch) {
        const base = hasTorch ? 160 : 100;
        // Dim at dusk/dawn, full at night, none during day
        const d = this.darkness;
        return base * d * 1.2;
    }
}
