// Synthesized sound: two radio stations (gamelan plucks, street blues), engine
// hum, sirens, gunshots, pickups. Everything is generated with WebAudio — no
// files. Audio only starts after the first real input, never during staging.
import { RADIO } from './config.js';

const GAMELAN = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 5, 7, 12, 10, 7, 5];
const BLUES = [0, 0, 3, 0, 5, 3, 0, 7, 5, 3, 0, 3, 5, 7, 10, 7];
const BASE = [220, 196];

export function makeAudio() {
  return {
    ctx: null, master: null, muted: false, step: 0, nextT: 0, timer: null,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, sirenOn: false,
    ensure(G) {
      if (this.ctx || G.shotMode) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);
        this.nextT = this.ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.schedule(G), 60);
        const eng = this.ctx.createOscillator(), eg = this.ctx.createGain();
        eng.type = 'sawtooth'; eng.frequency.value = 55; eg.gain.value = 0;
        const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
        eng.connect(filt); filt.connect(eg); eg.connect(this.master); eng.start();
        this.engineOsc = eng; this.engineGain = eg;
        const sir = this.ctx.createOscillator(), sg = this.ctx.createGain();
        sir.type = 'triangle'; sir.frequency.value = 700; sg.gain.value = 0;
        sir.connect(sg); sg.connect(this.master); sir.start();
        this.sirenOsc = sir; this.sirenGain = sg;
      } catch (e) { /* audio is optional */ }
    },
    schedule(G) {
      if (!this.ctx || this.muted) return;
      const ahead = this.ctx.currentTime + 0.18;
      while (this.nextT < ahead) {
        const st = G.station, scale = st === 0 ? GAMELAN : BLUES, base = BASE[st];
        const note = scale[this.step % scale.length];
        const t = this.nextT;
        if (this.step % 2 === 0 || st === 1) this.pluck(base * Math.pow(2, note / 12), t, st === 0 ? 0.20 : 0.14);
        if (this.step % 8 === 0) this.pluck(base / 2, t, 0.22);
        this.step++;
        if (this.step % 32 === 0) G.track++;
        this.nextT += 0.21;
      }
    },
    pluck(freq, t, vol) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.4);
    },
    shot() {
      if (!this.ctx || this.muted) return;
      const len = this.ctx.sampleRate * 0.12, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; g.gain.value = 0.5;
      src.connect(g); g.connect(this.master); src.start();
    },
    chime() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.pluck(880, t, 0.25); this.pluck(1320, t + 0.09, 0.25);
    },
    horn() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'square'; o.frequency.value = 220; g.gain.value = 0.15;
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + 0.3);
    },
    fanfare() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => this.pluck(f, t + i * 0.11, 0.25));
    },
    update(G) {
      if (!this.ctx) return;
      const p = G.player;
      const spd = p.car ? Math.abs(p.car.speed) : 0;
      if (this.engineGain) {
        this.engineGain.gain.value = this.muted ? 0 : (p.car ? 0.05 + spd * 0.002 : 0);
        this.engineOsc.frequency.value = 50 + spd * 3.2;
      }
      const near = G.policeCars.some((c) => Math.hypot(c.x - (p.car ? p.car.x : p.x), c.z - (p.car ? p.car.z : p.z)) < 60);
      if (this.sirenGain) {
        this.sirenGain.gain.value = this.muted || !near || G.wanted.stars === 0 ? 0 : 0.045;
        this.sirenOsc.frequency.value = (Math.floor(G.time * 2.4) % 2) ? 660 : 880;
      }
    },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.4;
      return this.muted;
    },
  };
}
export const STATION_NAMES = RADIO;
