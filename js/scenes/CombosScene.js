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
    combos.forEach((c, i) => {
      const y = startY + rowH * (i + 0.5);
      this.add.rectangle(cx, y, boxW, rowH - 8, 0x141a2e, 0.8).setStrokeStyle(2, 0xffd24a);
      const left = cx - boxW / 2;

      // --- Evolución (izquierda) ---
      this.add.image(left + 38, y, c.evo.icon).setScale(1.0).setTint(0xffe89a);
      this.add.text(left + 72, y - 11, c.evo.name, {
        fontFamily: "Trebuchet MS", fontSize: "22px", color: "#ffe08a", fontStyle: "bold",
        wordWrap: { width: boxW * 0.40 },
      }).setOrigin(0, 0.5);
      this.add.text(left + 72, y + 14, c.evo.desc, {
        fontFamily: "Trebuchet MS", fontSize: "14px", color: "#aab6d8",
        wordWrap: { width: boxW * 0.42 },
      }).setOrigin(0, 0.5);

      // --- Receta (derecha): arma base (máx) + pasiva ---
      const rx = cx + boxW * 0.14;
      this.add.text(rx, y - 24, "Combina:", {
        fontFamily: "Trebuchet MS", fontSize: "13px", color: "#7c89b0",
      }).setOrigin(0, 0.5);
      this.add.image(rx + 14, y - 2, c.base.icon).setScale(0.5);
      this.add.text(rx + 36, y - 2, c.base.name + "  (máx)", {
        fontFamily: "Trebuchet MS", fontSize: "15px", color: "#cdd6ee",
      }).setOrigin(0, 0.5);
      this.add.image(rx + 14, y + 20, c.passive.icon).setScale(0.5);
      this.add.text(rx + 36, y + 20, "+ " + c.passive.name, {
        fontFamily: "Trebuchet MS", fontSize: "15px", color: "#9fe0ff",
      }).setOrigin(0, 0.5);
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
