export class AudioSystem {
    constructor() {
        this.ctx = null;
    }

    _ensure() {
        if (!this.ctx) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C) return false;
            this.ctx = new C();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    /** Play a simple tone */
    _tone(freq, duration, volume = 0.08, type = 'sine') {
        if (!this._ensure()) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    step() {
        this._tone(180, 0.04, 0.03);
    }

    pickup() {
        this._tone(440, 0.08, 0.06);
        setTimeout(() => this._tone(660, 0.08, 0.06), 60);
    }

    drop() {
        this._tone(300, 0.1, 0.05, 'sawtooth');
    }

    interact() {
        this._tone(520, 0.06, 0.05);
    }

    craft() {
        this._tone(300, 0.08, 0.06);
        setTimeout(() => this._tone(500, 0.08, 0.06), 80);
        setTimeout(() => this._tone(700, 0.12, 0.06), 160);
    }

    questComplete() {
        this._tone(400, 0.1, 0.07);
        setTimeout(() => this._tone(500, 0.1, 0.07), 100);
        setTimeout(() => this._tone(600, 0.1, 0.07), 200);
        setTimeout(() => this._tone(800, 0.2, 0.07), 300);
    }

    error() {
        this._tone(150, 0.15, 0.04, 'sawtooth');
    }
}
