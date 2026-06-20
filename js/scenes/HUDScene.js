/* ============================================================
   HUDScene.js — interfaz superpuesta
   ============================================================ */
class HUDScene extends Phaser.Scene {
  constructor() { super("HUDScene"); }

  create() {
    const { width } = this.scale;

    // --- Barra de XP (arriba, ancho completo) ---
    this.xpBg = this.add.rectangle(0, 0, width, 14, 0x10131f).setOrigin(0).setScrollFactor(0);
    this.xpBar = this.add.rectangle(0, 0, 0, 14, 0x6fffb0).setOrigin(0).setScrollFactor(0);
    this.lvlText = this.add.text(8, 16, "Nv 1", {
      fontFamily: "Trebuchet MS", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
    }).setScrollFactor(0);

    // --- Tiempo (centro arriba) ---
    this.timeText = this.add.text(width / 2, 24, "00:00", {
      fontFamily: "Trebuchet MS", fontSize: "34px", color: "#ffffff", fontStyle: "bold",
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0);

    // --- Kills (derecha arriba) ---
    this.killText = this.add.text(width - 12, 26, "☠ 0", {
      fontFamily: "Trebuchet MS", fontSize: "22px", color: "#ff9a9a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0);

    // --- Barra de vida (abajo izquierda) ---
    const hy = this.scale.height - 36;
    this.hpBg = this.add.rectangle(16, hy, 280, 22, 0x10131f).setOrigin(0).setScrollFactor(0).setStrokeStyle(2, 0x000000);
    this.hpBar = this.add.rectangle(18, hy + 2, 276, 18, 0xff4d6a).setOrigin(0).setScrollFactor(0);
    this.hpText = this.add.text(156, hy + 11, "100/100", {
      fontFamily: "Trebuchet MS", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0);

    // --- Iconos de armas/pasivas (abajo) ---
    this.weaponIcons = [];
    this.passiveIcons = [];

    this.game.events.on("hud", this.updateHud, this);
    this.events.once("shutdown", () => this.game.events.off("hud", this.updateHud, this));
  }

  updateHud(d) {
    const { width } = this.scale;
    // XP
    const pct = Phaser.Math.Clamp(d.xp / d.xpNext, 0, 1);
    this.xpBar.width = width * pct;
    this.lvlText.setText("Nv " + d.level);

    // Tiempo
    const totalSec = Math.floor(d.time / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    this.timeText.setText(mm + ":" + ss);

    // Kills
    this.killText.setText("☠ " + d.kills);

    // Vida
    const hpPct = Phaser.Math.Clamp(d.hp / d.maxHp, 0, 1);
    this.hpBar.width = 276 * hpPct;
    this.hpText.setText(d.hp + "/" + d.maxHp);

    // Iconos
    this.renderIcons(d.weapons, d.passives);
  }

  renderIcons(weapons, passives) {
    // Limpia y redibuja (sencillo y robusto)
    for (const ic of this.weaponIcons) ic.destroy();
    for (const ic of this.passiveIcons) ic.destroy();
    this.weaponIcons = [];
    this.passiveIcons = [];

    const startX = 16;
    const yW = this.scale.height - 78;
    weapons.forEach((w, i) => {
      const img = this.add.image(startX + 22 + i * 44, yW, w.icon).setScale(0.62).setScrollFactor(0);
      const lvl = this.add.text(startX + 22 + i * 44 + 12, yW + 10, "" + w.level, {
        fontFamily: "Trebuchet MS", fontSize: "13px", color: "#ffe08a", fontStyle: "bold",
        stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0);
      this.weaponIcons.push(img, lvl);
    });

    const xP = this.scale.width - 16;
    const yP = this.scale.height - 78;
    passives.forEach((p, i) => {
      const img = this.add.image(xP - 22 - i * 40, yP, p.icon).setScale(0.5).setScrollFactor(0);
      const lvl = this.add.text(xP - 22 - i * 40 + 11, yP + 9, "" + p.level, {
        fontFamily: "Trebuchet MS", fontSize: "12px", color: "#9fe0ff", fontStyle: "bold",
        stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0);
      this.passiveIcons.push(img, lvl);
    });
  }
}
