/* ============================================================
   sfx.js — Efectos de sonido sintetizados (WebAudio)
   Usa el AudioContext del SoundManager de Phaser y respeta el
   muteo de [[Music]].
   ============================================================ */
const Sfx = {
  ctx: null,
  _throttle: {},

  init(scene) {
    try {
      this.ctx = (scene.sound && scene.sound.context) ? scene.sound.context : null;
    } catch (e) { this.ctx = null; }
  },

  _muted() { return (typeof Music !== "undefined" && Music.muted); },

  _now() { return this.ctx ? this.ctx.currentTime : 0; },

  // Evita spam de un sonido (ms mínimos entre repeticiones)
  _ok(name, ms) {
    const now = this._now() * 1000;
    if (this._throttle[name] && now - this._throttle[name] < ms) return false;
    this._throttle[name] = now;
    return true;
  },

  _tone(o) {
    if (!this.ctx || this._muted()) return;
    const ctx = this.ctx;
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    const freq = o.freq || 440, dur = o.dur || 0.12, vol = o.vol || 0.2;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  play(name) {
    switch (name) {
      case "levelup":
        [523, 659, 784, 1046].forEach((f, i) =>
          this._tone({ freq: f, dur: 0.18, type: "triangle", vol: 0.22, delay: i * 0.07 }));
        break;
      case "evolve":
        [659, 880, 1175, 1568, 2093].forEach((f, i) =>
          this._tone({ freq: f, dur: 0.22, type: "triangle", vol: 0.22, delay: i * 0.08 }));
        break;
      case "magnet":
        [400, 620, 900, 1200].forEach((f, i) =>
          this._tone({ freq: f, dur: 0.12, type: "sine", vol: 0.2, delay: i * 0.04 }));
        break;
      case "heal":
        this._tone({ freq: 660, dur: 0.2, type: "sine", vol: 0.22, slideTo: 990 });
        break;
      case "hurt":
        this._tone({ freq: 220, dur: 0.18, type: "sawtooth", vol: 0.22, slideTo: 80 });
        break;
      case "boss":
        this._tone({ freq: 130, dur: 0.55, type: "sawtooth", vol: 0.28, slideTo: 60 });
        this._tone({ freq: 200, dur: 0.55, type: "square", vol: 0.12, slideTo: 90 });
        break;
      case "victory":
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this._tone({ freq: f, dur: 0.26, type: "triangle", vol: 0.24, delay: i * 0.11 }));
        break;
      case "gameover":
        [392, 330, 262, 196].forEach((f, i) =>
          this._tone({ freq: f, dur: 0.32, type: "triangle", vol: 0.24, delay: i * 0.14 }));
        break;
      case "click":
        this._tone({ freq: 680, dur: 0.06, type: "square", vol: 0.14 });
        break;
      case "select":
        this._tone({ freq: 520, dur: 0.1, type: "triangle", vol: 0.2, slideTo: 800 });
        break;
      case "death": // muerte de enemigo (throttle para hordas)
        if (this._ok("death", 55)) this._tone({ freq: 300, dur: 0.06, type: "square", vol: 0.07, slideTo: 130 });
        break;
      case "pickup": // juntar gema de XP (throttle para no saturar con el imán)
        if (this._ok("pickup", 50)) this._tone({ freq: 1040, dur: 0.05, type: "sine", vol: 0.09, slideTo: 1280 });
        break;
    }
  },
};
