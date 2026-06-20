/* ============================================================
   LevelUpScene.js — elegir mejora al subir de nivel
   ============================================================ */
class LevelUpScene extends Phaser.Scene {
  constructor() { super("LevelUpScene"); }

  init(data) {
    this.choices = data.choices;
    this.remaining = data.levels;
    this.gameScene = data.gameScene;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000010, 0.72).setOrigin(0).setScrollFactor(0);

    this.add.text(width / 2, height * 0.16, "¡SUBISTE DE NIVEL!", {
      fontFamily: "Trebuchet MS", fontSize: "48px", color: "#ffe08a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.16 + 48, "elige una mejora", {
      fontFamily: "Trebuchet MS", fontSize: "20px", color: "#9fb0d8",
    }).setOrigin(0.5);

    const n = this.choices.length;
    const cardW = 280, cardH = 320, gap = 36;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = width / 2 - totalW / 2 + cardW / 2;
    const cy = height * 0.55;

    this.choices.forEach((c, i) => {
      this.makeCard(startX + i * (cardW + gap), cy, cardW, cardH, c, i);
    });

    // Selección por teclado 1/2/3
    this.input.keyboard.on("keydown", (e) => {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < this.choices.length) this.pick(this.choices[idx]);
    });
  }

  makeCard(x, y, w, h, choice, index) {
    const container = this.add.container(x, y);

    const isNew = choice.isNew;
    const isEvo = choice.kind === "evolve";
    const accent = isEvo ? 0xffd24a
      : (choice.kind === "passive" ? 0x6fd0ff : (isNew ? 0x6fffb0 : 0xffe08a));

    const bg = this.add.rectangle(0, 0, w, h, isEvo ? 0x2a2410 : 0x171b30).setStrokeStyle(isEvo ? 4 : 3, accent);
    const top = this.add.rectangle(0, -h / 2 + 4, w, 8, accent).setOrigin(0.5, 0);

    const icon = this.add.image(0, -h / 2 + 64, choice.icon).setScale(1.6);
    if (isEvo) icon.setTint(0xffe89a);

    let tag, tagColor;
    if (isEvo) { tag = "★ EVOLUCIÓN ★"; tagColor = "#ffd24a"; }
    else if (isNew) { tag = "¡NUEVO!"; tagColor = "#6fffb0"; }
    else { tag = (choice.kind === "weapon" || choice.kind === "passive") ? "Nivel " + choice.level : ""; tagColor = "#ffe08a"; }
    const tagText = this.add.text(0, -h / 2 + 118, tag, {
      fontFamily: "Trebuchet MS", fontSize: "16px", color: tagColor, fontStyle: "bold",
    }).setOrigin(0.5);

    const name = this.add.text(0, -h / 2 + 150, choice.name, {
      fontFamily: "Trebuchet MS", fontSize: "26px", color: "#ffffff", fontStyle: "bold",
      align: "center", wordWrap: { width: w - 30 },
    }).setOrigin(0.5);

    const desc = this.add.text(0, -h / 2 + 215, choice.desc, {
      fontFamily: "Trebuchet MS", fontSize: "18px", color: "#b8c2e0",
      align: "center", wordWrap: { width: w - 40 },
    }).setOrigin(0.5);

    const hint = this.add.text(0, h / 2 - 28, "[ " + (index + 1) + " ]", {
      fontFamily: "Trebuchet MS", fontSize: "18px", color: "#7c89b0", fontStyle: "bold",
    }).setOrigin(0.5);

    container.add([bg, top, icon, tagText, name, desc, hint]);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

    const baseColor = isEvo ? 0x2a2410 : 0x171b30;
    const hoverColor = isEvo ? 0x3a3216 : 0x1e2340;
    container.on("pointerover", () => { container.setScale(1.05); bg.setFillStyle(hoverColor); });
    container.on("pointerout", () => { container.setScale(1); bg.setFillStyle(baseColor); });
    container.on("pointerdown", () => this.pick(choice));

    // animación de entrada
    container.setScale(0.6); container.alpha = 0;
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 220, delay: index * 70, ease: "Back.out" });
  }

  pick(choice) {
    Sfx.play("select");
    this.gameScene.applyUpgrade(choice);
    this.remaining -= 1;
    this.scene.stop();
    this.gameScene.resumeFromLevelUp(this.remaining);
  }
}
