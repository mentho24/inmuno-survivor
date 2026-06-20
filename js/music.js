/* ============================================================
   music.js — Música de fondo en loop + control de muteo global
   ============================================================ */
const Music = {
  sound: null,
  muted: false,
  _listeners: [],

  // Crea y arranca la música (llamar una vez desde BootScene)
  init(scene) {
    try { this.muted = localStorage.getItem("hs_muted") === "1"; } catch (e) {}
    try {
      scene.sound.pauseOnBlur = false;
      const m = scene.sound.add("music", { loop: true, volume: 0.45 });
      m.setMute(this.muted);
      this.sound = m;
      const playIt = () => { try { if (!m.isPlaying) m.play(); } catch (e) {} };
      // Los navegadores bloquean el audio hasta la primera interacción
      if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, playIt);
      else playIt();
    } catch (e) {
      // Si el navegador no puede decodificar el audio, el juego sigue sin música
      this.sound = null;
    }
  },

  toggle() {
    this.muted = !this.muted;
    if (this.sound) this.sound.setMute(this.muted);
    try { localStorage.setItem("hs_muted", this.muted ? "1" : "0"); } catch (e) {}
    // Actualiza todos los íconos visibles
    this._listeners.forEach(f => { try { f(); } catch (e) {} });
    return this.muted;
  },

  iconKey() { return this.muted ? "music_off" : "music_on"; },

  // Agrega un botón de muteo a una escena (toque/clic). Devuelve la imagen.
  addButton(scene, x, y, scale) {
    const btn = scene.add.image(x, y, this.iconKey())
      .setScrollFactor(0).setDepth(70)
      .setScale(scale || 0.8)
      .setInteractive({ useHandCursor: true });
    const refresh = () => { if (btn.active) btn.setTexture(this.iconKey()); };
    this._listeners.push(refresh);
    btn.on("pointerup", () => this.toggle());
    scene.events.once("shutdown", () => {
      const idx = this._listeners.indexOf(refresh);
      if (idx >= 0) this._listeners.splice(idx, 1);
    });
    return btn;
  },

  // Atajo de teclado 'M' para una escena
  bindKey(scene) {
    scene.input.keyboard.on("keydown-M", () => this.toggle());
  },
};
