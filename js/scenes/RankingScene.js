/* ============================================================
   RankingScene.js — Tabla de mejores puntajes
   ============================================================ */
class RankingScene extends Phaser.Scene {
  constructor() { super("RankingScene"); }

  create() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, "bg_tile").setOrigin(0).setAlpha(0.5);
    this.add.rectangle(0, 0, width, height, 0x05060f, 0.7).setOrigin(0);

    this.add.text(width / 2, 56, "🏆 MEJORES PUNTAJES", {
      fontFamily: "Trebuchet MS", fontSize: "44px", color: "#ffe08a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);

    let ranking = [];
    try { ranking = JSON.parse(localStorage.getItem("hs_ranking") || "[]"); } catch (e) {}
    if (!Array.isArray(ranking)) ranking = [];

    // Encabezados
    const cols = { rank: width * 0.18, name: width * 0.28, score: width * 0.55, stats: width * 0.66, date: width * 0.84 };
    const headY = 120;
    const head = (x, t, ox = 0) => this.add.text(x, headY, t, {
      fontFamily: "Trebuchet MS", fontSize: "16px", color: "#7c89b0", fontStyle: "bold",
    }).setOrigin(ox, 0.5);
    head(cols.rank, "#");
    head(cols.name, "NOMBRE");
    head(cols.score, "PUNTAJE", 1);
    head(cols.stats, "DETALLE");
    head(cols.date, "FECHA");
    this.add.rectangle(width / 2, headY + 18, width * 0.72, 2, 0x3f6bd6).setOrigin(0.5);

    if (ranking.length === 0) {
      this.add.text(width / 2, height * 0.45, "Todavía no hay puntajes.\n¡Jugá una partida!", {
        fontFamily: "Trebuchet MS", fontSize: "26px", color: "#9fb0d8", align: "center",
      }).setOrigin(0.5);
    }

    ranking.slice(0, 10).forEach((e, i) => {
      const y = 160 + i * 46;
      const medal = i === 0 ? "#fff0a0" : i === 1 ? "#dfe6f0" : i === 2 ? "#e0b080" : "#cdd6ee";
      this.add.text(cols.rank, y, "" + (i + 1), {
        fontFamily: "Trebuchet MS", fontSize: "22px", color: medal, fontStyle: "bold",
      }).setOrigin(0.5, 0.5);
      this.add.text(cols.name, y, (e.victory ? "★ " : "") + (e.name || "JUGADOR"), {
        fontFamily: "Trebuchet MS", fontSize: "22px", color: medal, fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(cols.score, y, "" + e.score, {
        fontFamily: "Trebuchet MS", fontSize: "24px", color: "#ffe08a", fontStyle: "bold",
      }).setOrigin(1, 0.5);
      this.add.text(cols.stats, y, "☠ " + e.kills + "   ⏱ " + this._mmss(e.timeSec) + "   Nv " + e.level, {
        fontFamily: "Trebuchet MS", fontSize: "16px", color: "#9aa6c8",
      }).setOrigin(0, 0.5);
      this.add.text(cols.date, y, e.date || "", {
        fontFamily: "Trebuchet MS", fontSize: "14px", color: "#6b7596",
      }).setOrigin(0, 0.5);
    });

    const back = this.add.text(width / 2, height - 44, "← Volver al menú", {
      fontFamily: "Trebuchet MS", fontSize: "26px", color: "#0b0d17",
      backgroundColor: "#6fffb0", padding: { x: 24, y: 12 }, fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on("pointerover", () => back.setScale(1.05));
    back.on("pointerout", () => back.setScale(1));
    back.on("pointerdown", () => this.scene.start("MenuScene"));
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("MenuScene"));
    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("MenuScene"));
  }

  _mmss(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }
}
