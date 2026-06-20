/* ============================================================
   GameOverScene.js — Resultados, puntaje y ranking
   ============================================================ */
class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOverScene"); }

  init(data) { this.result = data; }

  create() {
    const { width, height } = this.scale;
    const r = this.result;
    const victory = !!r.victory;

    this.add.tileSprite(0, 0, width, height, "bg_tile").setOrigin(0).setAlpha(0.5);
    this.add.rectangle(0, 0, width, height, victory ? 0x05200f : 0x200010, 0.6).setOrigin(0);

    const timeSec = Math.floor(r.time / 1000);

    // ----- Cálculo del puntaje -----
    const pts = {
      kills:    r.kills * 15,
      level:    r.level * 120,
      powerups: r.powerups * 60,
      time:     timeSec * 8,
      hits:     -r.hitsTaken * 25,
      victory:  victory ? 2500 : 0,
    };
    let score = pts.kills + pts.level + pts.powerups + pts.time + pts.hits + pts.victory;
    score = Math.max(0, Math.round(score));

    // ----- Guardar en el ranking (localStorage) -----
    let pname = "JUGADOR";
    try { pname = (localStorage.getItem("hs_name") || "JUGADOR"); } catch (e) {}
    const entry = {
      name: pname, score, kills: r.kills, timeSec, level: r.level,
      hits: r.hitsTaken, powerups: r.powerups, victory,
      weapons: r.weapons || [], passives: r.passives || [],
      id: this._stamp(), date: this._today(),
    };
    const ranking = this._saveAndLoadRanking(entry);
    const rank = ranking.findIndex(e => e.id === entry.id) + 1;

    // Envío al ranking global (si hay API; en Pages simplemente no hace nada)
    if (typeof Api !== "undefined") Api.submit(entry);

    // ----- Título -----
    this.add.text(width / 2, 56, victory ? "¡INFECCIÓN ERRADICADA!" : "INFECCIÓN TERMINAL", {
      fontFamily: "Trebuchet MS", fontSize: "54px", fontStyle: "bold",
      color: victory ? "#6fffb0" : "#ff4d6a", stroke: "#000", strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, victory
      ? "Sobreviviste los 15 minutos. El cuerpo está a salvo."
      : "El macrófago cayó ante la horda viral.", {
      fontFamily: "Trebuchet MS", fontSize: "20px", color: victory ? "#a0e0c0" : "#e0a0a8",
    }).setOrigin(0.5);

    // ----- Puntaje total grande -----
    this.add.text(width / 2, 158, "PUNTAJE", {
      fontFamily: "Trebuchet MS", fontSize: "18px", color: "#9fb0d8", fontStyle: "bold",
    }).setOrigin(0.5);
    const scoreText = this.add.text(width / 2, 196, "0", {
      fontFamily: "Trebuchet MS", fontSize: "68px", color: "#ffe08a", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);
    // animación de conteo
    this.tweens.addCounter({
      from: 0, to: score, duration: 900, ease: "Cubic.out",
      onUpdate: t => scoreText.setText("" + Math.round(t.getValue())),
    });
    this.add.text(width / 2, 238,
      rank > 0 && rank <= 10 ? "Puesto #" + rank + " en el ranking" : "", {
      fontFamily: "Trebuchet MS", fontSize: "20px", color: "#6fffb0", fontStyle: "bold",
    }).setOrigin(0.5);

    // ----- Desglose (izquierda) -----
    const px = width * 0.27;
    this._panel(px, 300, 480, 300, "DESGLOSE");
    const rows = [
      ["Virus neutralizados", r.kills, pts.kills],
      ["Nivel alcanzado", r.level, pts.level],
      ["Mejoras obtenidas", r.powerups, pts.powerups],
      ["Tiempo resistido", this._mmss(timeSec), pts.time],
      ["Golpes recibidos", r.hitsTaken, pts.hits],
    ];
    if (victory) rows.push(["Bonus de victoria", "★", pts.victory]);
    rows.forEach((row, i) => {
      const y = 348 + i * 40;
      // Etiqueta (izquierda)
      this.add.text(px - 205, y, row[0], {
        fontFamily: "Trebuchet MS", fontSize: "17px", color: "#cdd6ee",
      }).setOrigin(0, 0.5);
      // Valor (alineado a la derecha en su columna)
      this.add.text(px + 70, y, "" + row[1], {
        fontFamily: "Trebuchet MS", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(1, 0.5);
      // Puntos (alineado a la derecha, contra el borde del panel)
      const p = row[2];
      this.add.text(px + 220, y, (p >= 0 ? "+" : "") + p, {
        fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
        color: p >= 0 ? "#8affc0" : "#ff8a9a",
      }).setOrigin(1, 0.5);
    });

    // ----- Ranking (derecha) -----
    this._panel(width * 0.72, 300, 400, 300, "MEJORES PUNTAJES");
    if (ranking.length === 0) {
      this.add.text(width * 0.72, 440, "—", { fontFamily: "Trebuchet MS", fontSize: "24px", color: "#7c89b0" }).setOrigin(0.5);
    }
    ranking.slice(0, 6).forEach((e, i) => {
      const y = 344 + i * 40;
      const mine = e.id === entry.id;
      const col = mine ? "#ffe08a" : "#cdd6ee";
      this.add.text(width * 0.72 - 188, y, "#" + (i + 1), {
        fontFamily: "Trebuchet MS", fontSize: "17px", color: mine ? "#ffe08a" : "#7c89b0", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(width * 0.72 - 158, y, (e.victory ? "★" : "") + (e.name || "JUGADOR"), {
        fontFamily: "Trebuchet MS", fontSize: "18px", color: col, fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(width * 0.72 + 12, y, "" + e.score, {
        fontFamily: "Trebuchet MS", fontSize: "20px", color: col, fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(width * 0.72 + 100, y, "☠" + e.kills + " " + this._mmss(e.timeSec), {
        fontFamily: "Trebuchet MS", fontSize: "14px", color: mine ? "#e8d9a0" : "#9aa6c8",
      }).setOrigin(0, 0.5);
    });

    // ----- Loadout: armas + mejoras usadas -----
    const weps = r.weapons || [];
    const pass = r.passives || [];
    this.add.text(width / 2, 602, "TU ARSENAL", {
      fontFamily: "Trebuchet MS", fontSize: "15px", color: "#7c89b0", fontStyle: "bold",
    }).setOrigin(0.5);
    const ly = 626, gap = 40, sep = 28;
    const totalW = weps.length * gap + ((weps.length && pass.length) ? sep : 0) + pass.length * gap;
    let lx = width / 2 - totalW / 2 + gap / 2;
    weps.forEach(w => {
      const img = this.add.image(lx, ly, w.icon).setScale(0.6);
      if (w.evolved) img.setTint(0xffe89a);
      this.add.text(lx + 12, ly + 11, "" + w.level, {
        fontFamily: "Trebuchet MS", fontSize: "12px", color: "#ffe08a", fontStyle: "bold",
        stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5);
      lx += gap;
    });
    if (weps.length && pass.length) {
      this.add.text(lx - gap / 2 + sep / 2, ly, "·", {
        fontFamily: "Trebuchet MS", fontSize: "26px", color: "#3f6bd6", fontStyle: "bold",
      }).setOrigin(0.5);
      lx += sep;
    }
    pass.forEach(pp => {
      this.add.image(lx, ly, pp.icon).setScale(0.52);
      this.add.text(lx + 11, ly + 10, "" + pp.level, {
        fontFamily: "Trebuchet MS", fontSize: "11px", color: "#9fe0ff", fontStyle: "bold",
        stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5);
      lx += gap;
    });

    // ----- Botones -----
    const btn = this.add.text(width / 2 - 130, height - 50, "↻  JUGAR DE NUEVO", {
      fontFamily: "Trebuchet MS", fontSize: "30px", color: "#0b0d17",
      backgroundColor: "#6fffb0", padding: { x: 24, y: 12 }, fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => btn.setScale(1.05));
    btn.on("pointerout", () => btn.setScale(1));
    btn.on("pointerdown", () => this.restart());

    const menuBtn = this.add.text(width / 2 + 160, height - 50, "Menú", {
      fontFamily: "Trebuchet MS", fontSize: "26px", color: "#cdd6ee",
      backgroundColor: "#2a3050", padding: { x: 22, y: 12 }, fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on("pointerover", () => menuBtn.setScale(1.05));
    menuBtn.on("pointerout", () => menuBtn.setScale(1));
    menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));

    this.input.keyboard.once("keydown-ENTER", () => this.restart());
    this.input.keyboard.once("keydown-SPACE", () => this.restart());
  }

  // ----- helpers -----
  _panel(cx, top, w, h, title) {
    this.add.rectangle(cx, top + h / 2, w, h, 0x141a2e, 0.85).setStrokeStyle(2, 0x3f6bd6);
    this.add.text(cx, top + 18, title, {
      fontFamily: "Trebuchet MS", fontSize: "20px", color: "#9fb0d8", fontStyle: "bold",
    }).setOrigin(0.5);
  }

  _mmss(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  _today() {
    try { return new Date().toLocaleDateString(); } catch (e) { return ""; }
  }

  _stamp() {
    try { return Date.now() + "" + Math.floor(Math.random() * 1000); }
    catch (e) { return "" + Math.floor(Math.random() * 1e9); }
  }

  _saveAndLoadRanking(entry) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("hs_ranking") || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 10);
    try { localStorage.setItem("hs_ranking", JSON.stringify(list)); } catch (e) {}
    return list;
  }

  restart() {
    Sfx.play("click");
    this.scene.start("GameScene");
    this.scene.launch("HUDScene");
  }
}
