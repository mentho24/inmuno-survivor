/* ============================================================
   MenuScene.js
   ============================================================ */
function loadPlayerName() {
  let n = "JUGADOR";
  try { n = (localStorage.getItem("hs_name") || "JUGADOR"); } catch (e) {}
  return n.slice(0, 12) || "JUGADOR";
}
function savePlayerName(n) {
  try { localStorage.setItem("hs_name", n); } catch (e) {}
}

class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, "bg_tile").setOrigin(0).setScrollFactor(0).setAlpha(0.6);

    // Botón de música (clic). El atajo M no se usa aquí para no chocar con el nombre.
    Music.addButton(this, width - 44, 40, 0.95);

    this.add.text(width / 2, height * 0.16, "INMUNO SURVIVOR", {
      fontFamily: "Trebuchet MS", fontSize: "66px", color: "#ffffff",
      fontStyle: "bold", stroke: "#c0392b", strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.16 + 58, "sos un MACRÓFAGO: defendé el cuerpo de la invasión viral", {
      fontFamily: "Trebuchet MS", fontSize: "21px", color: "#e0a0a8",
    }).setOrigin(0.5);

    // ----- Campo de nombre editable -----
    this.playerName = loadPlayerName();
    this.add.text(width / 2, height * 0.36, "Tu nombre (tocá o escribí para cambiarlo):", {
      fontFamily: "Trebuchet MS", fontSize: "17px", color: "#9fb0d8",
    }).setOrigin(0.5);

    this.nameBox = this.add.rectangle(width / 2, height * 0.42, 360, 50, 0x141a2e)
      .setStrokeStyle(2, 0x6fffb0)
      .setInteractive({ useHandCursor: true });
    // Toque/clic: abre el teclado del dispositivo (clave en móvil)
    this.nameBox.on("pointerdown", () => this.promptName());
    this.nameText = this.add.text(width / 2, height * 0.42, this.playerName, {
      fontFamily: "Trebuchet MS", fontSize: "30px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    this.caret = this.add.text(0, height * 0.42, "|", {
      fontFamily: "Trebuchet MS", fontSize: "30px", color: "#6fffb0",
    }).setOrigin(0, 0.5);
    this.refreshName();
    this.tweens.add({ targets: this.caret, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard.on("keydown", this.onKey, this);

    // ----- Botón JUGAR -----
    const btn = this.add.text(width / 2, height * 0.58, "▶  JUGAR", {
      fontFamily: "Trebuchet MS", fontSize: "40px", color: "#0b0d17",
      backgroundColor: "#6fffb0", padding: { x: 40, y: 16 }, fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => btn.setScale(1.06));
    btn.on("pointerout", () => btn.setScale(1));
    btn.on("pointerdown", () => this.startGame());
    this.tweens.add({ targets: btn, scale: 1.04, duration: 700, yoyo: true, repeat: -1 });

    // ----- Botones secundarios -----
    const mkBtn = (x, label, cb) => {
      const b = this.add.text(x, height * 0.70, label, {
        fontFamily: "Trebuchet MS", fontSize: "22px", color: "#cdd6ee",
        backgroundColor: "#2a3050", padding: { x: 20, y: 10 }, fontStyle: "bold",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on("pointerover", () => b.setScale(1.05));
      b.on("pointerout", () => b.setScale(1));
      b.on("pointerdown", cb);
      return b;
    };
    mkBtn(width / 2 - 130, "🏆 Ranking", () => { this.persist(); this.scene.start("RankingScene", { from: "MenuScene" }); });
    mkBtn(width / 2 + 130, "🧬 Combinaciones", () => { this.persist(); this.scene.start("CombosScene", { from: "MenuScene" }); });

    this.add.text(width / 2, height * 0.80,
      "Moverse: WASD / Flechas o joystick táctil   •   Las defensas atacan solas   •   TAB o botón 🧬: combinaciones",
      { fontFamily: "Trebuchet MS", fontSize: "17px", color: "#b08088" }
    ).setOrigin(0.5);

    const icons = ["wi_bolt", "wi_whip", "wi_aura", "wi_orbit", "wi_knife", "wi_nova", "wi_chain"];
    const startX = width / 2 - (icons.length - 1) * 35;
    icons.forEach((ic, i) => this.add.image(startX + i * 70, height * 0.90, ic).setScale(0.8));

    this.input.keyboard.on("keydown-ENTER", () => this.startGame());
  }

  onKey(e) {
    if (e.key === "Enter") return; // Enter inicia el juego
    if (e.key === "Backspace") {
      this.playerName = this.playerName.slice(0, -1);
      this.refreshName(); return;
    }
    // Solo letras, números y espacio, hasta 12 caracteres
    if (e.key.length === 1 && /[A-Za-z0-9 ]/.test(e.key) && this.playerName.length < 12) {
      this.playerName += e.key.toUpperCase();
      this.refreshName();
    }
  }

  promptName() {
    let v = null;
    try { v = window.prompt("Tu nombre (máx 12 caracteres):", this.playerName); } catch (e) { v = null; }
    if (v === null) return;
    v = v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 12).trim();
    this.playerName = v || "JUGADOR";
    savePlayerName(this.playerName);
    this.refreshName();
  }

  refreshName() {
    this.nameText.setText(this.playerName);
    // Posicionar el caret justo después del texto
    this.caret.x = this.nameText.x + this.nameText.width / 2 + 3;
  }

  persist() {
    const name = (this.playerName || "").trim() || "JUGADOR";
    this.playerName = name;
    savePlayerName(name);
  }

  startGame() {
    Sfx.play("click");
    this.persist();
    this.scene.start("GameScene");
    this.scene.launch("HUDScene");
  }
}
