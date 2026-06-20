/* ============================================================
   BootScene.js — genera texturas procedurales
   Temática: Sistema inmune. Jugador = macrófago. Enemigos = virus.
   ============================================================ */
class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  create() {
    this.makePlayer();
    this.makeEnemies();
    this.makeProjectiles();
    this.makePickups();
    this.makeIcons();
    this.makeMisc();
    this.scene.start("MenuScene");
  }

  g() { return this.make.graphics({ x: 0, y: 0, add: false }); }

  // ---- Macrófago (célula blanca ameboide) ----
  makePlayer() {
    const g = this.g();
    const cx = 24, cy = 24;
    // Membrana exterior con lóbulos (pseudópodos)
    g.fillStyle(0xbcd2ff, 1);
    const lobes = [[24,8],[36,14],[40,26],[34,38],[22,40],[10,34],[7,22],[12,11]];
    for (const [x, y] of lobes) g.fillCircle(x, y, 10);
    g.fillCircle(cx, cy, 16);
    // Citoplasma
    g.fillStyle(0xe9f1ff, 1); g.fillCircle(cx, cy, 15);
    g.fillStyle(0xf6faff, 1); g.fillCircle(cx, cy, 12);
    // Núcleo
    g.fillStyle(0x8a6fd0, 1); g.fillCircle(cx + 3, cy - 2, 7);
    g.fillStyle(0x6f54b0, 1); g.fillCircle(cx + 3, cy - 2, 4);
    // Vacuolas
    g.fillStyle(0xcfe0ff, 1);
    g.fillCircle(cx - 6, cy + 5, 2.5);
    g.fillCircle(cx - 8, cy - 4, 2);
    g.fillCircle(cx + 8, cy + 6, 2);
    g.generateTexture("player", 48, 48);
    g.destroy();
  }

  // ---- Virus (con cápside + espículas tipo corona) ----
  makeEnemies() {
    for (const key in ENEMIES) {
      const def = ENEMIES[key];
      const r = def.radius;
      const pad = 10;
      const size = (r + pad) * 2;
      const c = size / 2;
      const g = this.g();
      const col = def.color;
      const dark = Phaser.Display.Color.IntegerToColor(col).darken(45).color;
      const light = Phaser.Display.Color.IntegerToColor(col).lighten(25).color;

      // Espículas (stalk + knob)
      const spikes = 11;
      g.lineStyle(2, dark, 1);
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const x1 = c + Math.cos(a) * (r - 2);
        const y1 = c + Math.sin(a) * (r - 2);
        const x2 = c + Math.cos(a) * (r + pad - 2);
        const y2 = c + Math.sin(a) * (r + pad - 2);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
        g.fillStyle(dark, 1); g.fillCircle(x2, y2, 3);
      }
      // Cápside
      g.fillStyle(dark, 1); g.fillCircle(c, c, r);
      g.fillStyle(col, 1); g.fillCircle(c, c, r - 2);
      g.fillStyle(light, 0.5); g.fillCircle(c - r * 0.3, c - r * 0.3, r * 0.4);
      // Material genético interno
      g.fillStyle(dark, 0.8); g.fillCircle(c, c, r * 0.4);
      // Ojos (para darle "vida" amenazante)
      g.fillStyle(0x14121f, 1);
      g.fillCircle(c - r * 0.32, c - r * 0.05, Math.max(2, r * 0.15));
      g.fillCircle(c + r * 0.32, c - r * 0.05, Math.max(2, r * 0.15));
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(c - r * 0.32 + 1, c - r * 0.05 - 1, 1);
      g.fillCircle(c + r * 0.32 + 1, c - r * 0.05 - 1, 1);

      g.generateTexture(def.key, size, size);
      g.destroy();
    }
  }

  makeProjectiles() {
    // Anticuerpo (forma de Y)
    let g = this.g();
    g.lineStyle(4, 0x8fd8ff, 1);
    g.beginPath();
    g.moveTo(10, 16); g.lineTo(10, 9);
    g.moveTo(10, 9); g.lineTo(5, 3);
    g.moveTo(10, 9); g.lineTo(15, 3);
    g.strokePath();
    g.fillStyle(0xeaffff, 1); g.fillCircle(10, 16, 2.5);
    g.generateTexture("proj_bolt", 20, 20); g.destroy();

    // Radical libre (chispa)
    g = this.g();
    g.fillStyle(0xfff1a0, 1); g.fillCircle(9, 8, 5);
    g.fillStyle(0xff9d4f, 1); g.fillCircle(9, 8, 3);
    g.lineStyle(2, 0xfff1a0, 1);
    g.beginPath(); g.moveTo(0, 8); g.lineTo(5, 8); g.moveTo(13, 8); g.lineTo(18, 8); g.strokePath();
    g.generateTexture("proj_knife", 18, 16); g.destroy();

    // Lisosoma (vesícula)
    g = this.g();
    g.fillStyle(0x9affd6, 0.4); g.fillCircle(10, 10, 9);
    g.fillStyle(0x4fe0a0, 1); g.fillCircle(10, 10, 7);
    g.fillStyle(0xeafff5, 1); g.fillCircle(8, 8, 3);
    g.generateTexture("proj_orbit", 20, 20); g.destroy();

    // Pseudópodo (rectángulo redondeado)
    g = this.g();
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(0, 0, 64, 32, 12);
    g.generateTexture("fx_whip", 64, 32); g.destroy();

    // Aura / onda (círculo suave, se tinta en runtime)
    g = this.g();
    g.fillStyle(0xffffff, 0.22); g.fillCircle(64, 64, 64);
    g.lineStyle(4, 0xffffff, 0.6); g.strokeCircle(64, 64, 61);
    g.generateTexture("fx_aura", 128, 128); g.destroy();
  }

  makePickups() {
    // Gemas = fragmentos de ADN viral (XP)
    const gem = (name, color, glow) => {
      const g = this.g();
      g.fillStyle(glow, 0.4); g.fillCircle(9, 9, 9);
      g.fillStyle(color, 1);
      g.fillRoundedRect(5, 2, 8, 14, 3);
      g.fillStyle(0xffffff, 0.6); g.fillRoundedRect(6, 3, 3, 12, 2);
      g.generateTexture(name, 18, 18); g.destroy();
    };
    gem("gem", 0x6fffb0, 0x6fffb0);
    gem("gem_mid", 0x6fd0ff, 0x6fd0ff);
    gem("gem_big", 0xffb86f, 0xffb86f);

    // Nutriente / vacuna (curación)
    const g = this.g();
    g.fillStyle(0xff5d7a, 1); g.fillCircle(10, 10, 9);
    g.fillStyle(0xffffff, 1); g.fillRect(8, 4, 4, 12); g.fillRect(4, 8, 12, 4);
    g.generateTexture("heart", 20, 20); g.destroy();
  }

  makeIcons() {
    const icon = (name, draw) => {
      const g = this.g();
      g.fillStyle(0x141a2e, 1); g.fillRoundedRect(0, 0, 48, 48, 8);
      g.lineStyle(2, 0x3f6bd6, 1); g.strokeRoundedRect(1, 1, 46, 46, 8);
      draw(g);
      g.generateTexture(name, 48, 48); g.destroy();
    };
    // Armas
    icon("wi_bolt", g => { g.lineStyle(4, 0x8fd8ff, 1); g.beginPath(); g.moveTo(24, 40); g.lineTo(24, 22); g.moveTo(24, 22); g.lineTo(14, 8); g.moveTo(24, 22); g.lineTo(34, 8); g.strokePath(); });
    icon("wi_whip", g => { g.fillStyle(0xbcd2ff, 1); g.fillCircle(16, 24, 9); g.fillStyle(0xeaf1ff, 1); g.fillRoundedRect(20, 19, 22, 10, 5); });
    icon("wi_aura", g => { g.lineStyle(3, 0x6effb0, 1); g.strokeCircle(24, 24, 15); g.fillStyle(0x6effb0, 0.5); g.fillCircle(24, 24, 8); });
    icon("wi_orbit", g => { g.lineStyle(2, 0x556, 1); g.strokeCircle(24, 24, 14); g.fillStyle(0x4fe0a0, 1); g.fillCircle(38, 24, 5); g.fillCircle(10, 24, 5); });
    icon("wi_knife", g => { g.fillStyle(0xfff1a0, 1); g.fillCircle(24, 24, 7); g.lineStyle(3, 0xff9d4f, 1); g.beginPath(); g.moveTo(8, 24); g.lineTo(40, 24); g.moveTo(24, 8); g.lineTo(24, 40); g.strokePath(); });
    icon("wi_nova", g => { g.fillStyle(0xff7a3a, 0.5); g.fillCircle(24, 24, 16); g.lineStyle(3, 0xff7a3a, 1); g.strokeCircle(24, 24, 16); g.strokeCircle(24, 24, 9); });
    icon("wi_chain", g => { g.lineStyle(3, 0x9affd6, 1); g.beginPath(); g.moveTo(8, 10); g.lineTo(20, 24); g.lineTo(12, 30); g.lineTo(28, 40); g.strokePath(); g.fillStyle(0x9affd6, 1); g.fillCircle(28, 40, 3); });
    // Pasivas
    icon("pi_hp",     g => { g.fillStyle(0xff5d7a, 1); g.fillCircle(24, 24, 11); g.fillStyle(0xffffff, 1); g.fillRect(22, 16, 4, 16); g.fillRect(16, 22, 16, 4); });
    icon("pi_speed",  g => { g.fillStyle(0x6fffb0, 1); g.fillTriangle(14, 14, 14, 34, 32, 24); g.fillTriangle(24, 14, 24, 34, 40, 24); });
    icon("pi_might",  g => { g.fillStyle(0x6effb0, 1); g.fillCircle(24, 24, 12); g.fillStyle(0x141a2e, 1); g.fillCircle(20, 22, 2); g.fillCircle(28, 26, 2); });
    icon("pi_haste",  g => { g.lineStyle(3, 0x8fd8ff, 1); g.strokeCircle(24, 24, 12); g.beginPath(); g.moveTo(24, 24); g.lineTo(24, 16); g.moveTo(24, 24); g.lineTo(31, 27); g.strokePath(); });
    icon("pi_area",   g => { g.lineStyle(2, 0xff9d6f, 1); g.strokeCircle(24, 24, 9); g.strokeCircle(24, 24, 15); g.fillStyle(0xff9d6f, 0.4); g.fillCircle(24, 24, 6); });
    icon("pi_amount", g => { g.fillStyle(0x8fd8ff, 1); g.fillCircle(14, 18, 4); g.fillCircle(24, 30, 4); g.fillCircle(34, 18, 4); g.fillCircle(24, 14, 4); });
    icon("pi_crit",   g => { g.fillStyle(0xffd24a, 1); g.fillTriangle(24, 8, 18, 24, 30, 24); g.fillTriangle(18, 24, 30, 24, 24, 40); g.fillStyle(0x141a2e, 1); g.fillCircle(24, 24, 3); });
    icon("pi_armor",  g => { g.fillStyle(0xbcc4d6, 1); g.fillRoundedRect(14, 12, 20, 14, 4); g.fillTriangle(14, 26, 34, 26, 24, 40); });
    icon("pi_magnet", g => { g.fillStyle(0xff5d7a, 1); g.fillRect(14, 12, 8, 18); g.fillRect(26, 12, 8, 18); g.fillRect(14, 12, 20, 7); g.fillStyle(0x141a2e, 1); g.fillRect(16, 26, 4, 6); g.fillRect(28, 26, 4, 6); });
    icon("pi_regen",  g => { g.fillStyle(0x6fffb0, 1); g.fillRect(21, 12, 6, 24); g.fillRect(12, 21, 24, 6); });
    icon("pi_growth", g => { g.fillStyle(0x6fd0ff, 1); g.fillTriangle(10, 38, 16, 38, 13, 22); g.fillTriangle(20, 38, 26, 38, 23, 14); g.fillTriangle(30, 38, 36, 38, 33, 24); });
  }

  makeMisc() {
    // Fondo: tejido / torrente sanguíneo
    const g = this.g();
    g.fillStyle(0x2a0e16, 1); g.fillRect(0, 0, 96, 96);
    g.fillStyle(0x35131d, 1);
    g.fillCircle(20, 24, 16); g.fillCircle(70, 60, 20); g.fillCircle(58, 14, 10); g.fillCircle(10, 78, 12);
    g.fillStyle(0x3e1824, 0.7);
    g.fillCircle(44, 40, 8); g.fillCircle(84, 30, 9); g.fillCircle(30, 64, 7);
    g.fillStyle(0x4a1d2c, 0.5);
    g.fillCircle(70, 60, 8); g.fillCircle(20, 24, 6);
    g.generateTexture("bg_tile", 96, 96); g.destroy();

    // Partícula
    const p = this.g();
    p.fillStyle(0xffffff, 1); p.fillCircle(4, 4, 4);
    p.generateTexture("spark", 8, 8); p.destroy();
  }
}
