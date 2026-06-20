/* ============================================================
   RankingScene.js — Tabla de mejores puntajes
   ============================================================ */
class RankingScene extends Phaser.Scene {
  constructor() { super("RankingScene"); }

  create() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, "bg_tile").setOrigin(0).setAlpha(0.5);
    this.add.rectangle(0, 0, width, height, 0x05060f, 0.7).setOrigin(0);

    this.add.text(width / 2, 48, "🏆 MEJORES PUNTAJES", {
      fontFamily: "Trebuchet MS", fontSize: "42px", color: "#ffe08a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 88, "Cargando ranking global…", {
      fontFamily: "Trebuchet MS", fontSize: "16px", color: "#9fb0d8", fontStyle: "bold",
    }).setOrigin(0.5);

    // Encabezados
    this.C = { rank: 56, name: 90, score: 430, stats: 462, arsenal: 720, date: width - 22 };
    const headY = 122;
    const head = (x, t, ox = 0) => this.add.text(x, headY, t, {
      fontFamily: "Trebuchet MS", fontSize: "15px", color: "#7c89b0", fontStyle: "bold",
    }).setOrigin(ox, 0.5);
    head(this.C.rank, "#", 0.5);
    head(this.C.name, "NOMBRE");
    head(this.C.score, "PUNTAJE", 1);
    head(this.C.stats, "DETALLE");
    head(this.C.arsenal, "ARSENAL (armas + mejoras)");
    head(this.C.date, "FECHA", 1);
    this.add.rectangle(width / 2, headY + 18, width * 0.94, 2, 0x3f6bd6).setOrigin(0.5);

    // Botón / teclado (siempre disponibles)
    const back = this.add.text(width / 2, height - 44, "← Volver al menú", {
      fontFamily: "Trebuchet MS", fontSize: "26px", color: "#0b0d17",
      backgroundColor: "#6fffb0", padding: { x: 24, y: 12 }, fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on("pointerover", () => back.setScale(1.05));
    back.on("pointerout", () => back.setScale(1));
    back.on("pointerdown", () => this.scene.start("MenuScene"));
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("MenuScene"));
    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("MenuScene"));

    // Intentar ranking global; si no hay API/conexión, usar el local
    const local = this._loadLocal();
    if (typeof Api !== "undefined") {
      Api.fetchTop(10).then(global => {
        if (!this.scene.isActive()) return;
        if (global && global.length) {
          this.statusText.setText("🌐 Ranking GLOBAL").setColor("#6fffb0");
          this._renderRows(global);
        } else {
          this.statusText.setText("💾 Ranking LOCAL  ·  servidor global no disponible").setColor("#ffb86f");
          this._renderRows(local);
        }
      });
    } else {
      this.statusText.setText("💾 Ranking LOCAL").setColor("#ffb86f");
      this._renderRows(local);
    }
  }

  _loadLocal() {
    let r = [];
    try { r = JSON.parse(localStorage.getItem("hs_ranking") || "[]"); } catch (e) {}
    return Array.isArray(r) ? r : [];
  }

  _renderRows(list) {
    const { width, height } = this.scale;
    const C = this.C;
    if (!list.length) {
      this.add.text(width / 2, height * 0.45, "Todavía no hay puntajes.\n¡Jugá una partida!", {
        fontFamily: "Trebuchet MS", fontSize: "26px", color: "#9fb0d8", align: "center",
      }).setOrigin(0.5);
      return;
    }
    list.slice(0, 10).forEach((e, i) => {
      const y = 160 + i * 47;
      const medal = i === 0 ? "#fff0a0" : i === 1 ? "#dfe6f0" : i === 2 ? "#e0b080" : "#cdd6ee";
      this.add.text(C.rank, y, "" + (i + 1), {
        fontFamily: "Trebuchet MS", fontSize: "21px", color: medal, fontStyle: "bold",
      }).setOrigin(0.5, 0.5);
      this.add.text(C.name, y, (e.victory ? "★ " : "") + (e.name || "JUGADOR"), {
        fontFamily: "Trebuchet MS", fontSize: "20px", color: medal, fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(C.score, y, "" + e.score, {
        fontFamily: "Trebuchet MS", fontSize: "22px", color: "#ffe08a", fontStyle: "bold",
      }).setOrigin(1, 0.5);
      this.add.text(C.stats, y, "☠ " + e.kills + "  ⏱ " + this._mmss(e.timeSec) + "  Nv" + e.level, {
        fontFamily: "Trebuchet MS", fontSize: "14px", color: "#9aa6c8",
      }).setOrigin(0, 0.5);
      this._drawLoadout(e, C.arsenal, y);
      this.add.text(C.date, y, e.date || "", {
        fontFamily: "Trebuchet MS", fontSize: "13px", color: "#6b7596",
      }).setOrigin(1, 0.5);
    });
  }

  // Dibuja los iconos de armas (con nivel/evolución) + pasivas (con nivel) de una entrada
  _drawLoadout(e, x, y) {
    let lx = x;
    (e.weapons || []).forEach(w => {
      const img = this.add.image(lx, y, w.icon).setScale(0.42);
      if (w.evolved) {
        img.setTint(0xffe89a);
        this.add.text(lx + 9, y - 9, "★", {
          fontFamily: "Trebuchet MS", fontSize: "12px", color: "#ffd24a",
        }).setOrigin(0.5);
      } else if (w.level) {
        this.add.text(lx + 9, y + 8, "" + w.level, {
          fontFamily: "Trebuchet MS", fontSize: "10px", color: "#ffe08a",
          fontStyle: "bold", stroke: "#000", strokeThickness: 2,
        }).setOrigin(0.5);
      }
      lx += 26;
    });
    if ((e.weapons || []).length && (e.passives || []).length) lx += 12;
    (e.passives || []).forEach(p => {
      this.add.image(lx, y, p.icon).setScale(0.4);
      if (p.level) {
        this.add.text(lx + 8, y + 8, "" + p.level, {
          fontFamily: "Trebuchet MS", fontSize: "9px", color: "#9fe0ff",
          fontStyle: "bold", stroke: "#000", strokeThickness: 2,
        }).setOrigin(0.5);
      }
      lx += 24;
    });
  }

  _mmss(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }
}
