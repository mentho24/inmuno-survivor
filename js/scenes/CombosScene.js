/* ============================================================
   CombosScene.js — Lista de combinaciones de evolución
   Se abre desde el menú o con TAB durante la partida (overlay).
   ============================================================ */
class CombosScene extends Phaser.Scene {
  constructor() { super("CombosScene"); }

  init(data) {
    this.fromMenu = data && data.from === "MenuScene";
    this.overlay = data && data.overlay;
    this.gameScene = data && data.gameScene;
  }

  create() {
    const { width, height } = this.scale;

    if (this.overlay) {
      this.bgRect = this.add.rectangle(0, 0, width, height, 0x05060f, 0.86).setOrigin(0);
    } else {
      this.add.tileSprite(0, 0, width, height, "bg_tile").setOrigin(0).setAlpha(0.5);
      this.bgRect = this.add.rectangle(0, 0, width, height, 0x05060f, 0.7).setOrigin(0);
    }
    // Tocar fuera de las tarjetas cierra (se habilita tras un instante para no
    // capturar el mismo toque que abrió el menú).
    this.time.delayedCall(180, () => {
      this.bgRect.setInteractive();
      this.bgRect.on("pointerup", () => this.close());
    });

    this.add.text(width / 2, 46, "🧬 COMBINACIONES DE EVOLUCIÓN", {
      fontFamily: "Trebuchet MS", fontSize: "38px", color: "#ffe08a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(width / 2, 86, "Maximizá el arma (nivel 8) y tené la pasiva requerida → en el próximo nivel aparece la evolución", {
      fontFamily: "Trebuchet MS", fontSize: "17px", color: "#9fb0d8",
    }).setOrigin(0.5);

    // Construir la lista a partir de los datos
    const combos = [];
    for (const id in WEAPONS) {
      const def = WEAPONS[id];
      if (!def.evolves) continue;
      combos.push({
        base: def,
        passive: PASSIVES[def.evolves.requires],
        evo: WEAPONS[def.evolves.into],
      });
    }

    const cx = width / 2;
    const startY = 130;
    const rowH = (height - startY - 80) / combos.length;

    const boxW = width * 0.8;
    // Una "unidad" = icono con su nombre debajo
    const unit = (ux, y, icon, name, color, scale, tint) => {
      const img = this.add.image(ux, y - 7, icon).setScale(scale);
      if (tint) img.setTint(tint);
      this.add.text(ux, y + 16, name, {
        fontFamily: "Trebuchet MS", fontSize: "12px", color, fontStyle: "bold",
      }).setOrigin(0.5, 0.5);
    };
    const op = (ox, y, s, col) => this.add.text(ox, y - 6, s, {
      fontFamily: "Trebuchet MS", fontSize: "30px", color: col, fontStyle: "bold",
    }).setOrigin(0.5);

    combos.forEach((c, i) => {
      const y = startY + rowH * (i + 0.5);
      this.add.rectangle(cx, y, boxW, rowH - 8, 0x141a2e, 0.8).setStrokeStyle(2, 0xffd24a);

      // base + pasiva = evolución (cada uno: icono + nombre debajo)
      unit(cx - 330, y, c.base.icon, c.base.name, "#cdd6ee", 0.65);
      op(cx - 200, y, "+", "#ffffff");
      unit(cx - 70, y, c.passive.icon, c.passive.name, "#9fe0ff", 0.65);
      op(cx + 70, y, "=", "#ffd24a");
      unit(cx + 285, y, c.evo.icon, c.evo.name, "#ffe08a", 0.85, 0xffe89a);
    });

    // Botón de cerrar arriba a la derecha (siempre alcanzable en móvil)
    const cbw = 150, cbh = 52, cbx = width - 20 - cbw / 2, cby = 46;
    const closeBtn = this.add.rectangle(cbx, cby, cbw, cbh, 0x6fffb0, 1)
      .setStrokeStyle(3, 0x0b0d17).setDepth(20).setInteractive({ useHandCursor: true });
    this.add.text(cbx, cby, "✕  VOLVER", {
      fontFamily: "Trebuchet MS", fontSize: "24px", color: "#0b0d17", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(21);
    closeBtn.on("pointerdown", () => closeBtn.setFillStyle(0x4fd99a, 1));
    closeBtn.on("pointerup", () => this.close());

    // Pie de ayuda (no es botón; el cierre es el de arriba o tocar fuera)
    this.add.text(width / 2, height - 26,
      this.overlay ? "Tocá fuera, el botón ✕ o TAB/ESC para volver al juego"
                   : "Tocá fuera, el botón ✕ o ESC para volver al menú", {
      fontFamily: "Trebuchet MS", fontSize: "17px", color: "#9fb0d8",
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-ESC", () => this.close());
  }

  close() {
    if (this.overlay && this.gameScene) {
      // En partida: el GameScene controla el cierre y reanuda
      this.gameScene.closeCombos();
    } else {
      this.scene.start("MenuScene");
    }
  }
}
