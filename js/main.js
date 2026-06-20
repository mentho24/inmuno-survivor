/* ============================================================
   main.js — configuración y arranque de Phaser
   ============================================================ */
const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#0b0d17",
  pixelArt: false,
  input: { activePointers: 3 }, // soporte multitouch (joystick + botones)
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [BootScene, MenuScene, GameScene, HUDScene, LevelUpScene, CombosScene, RankingScene, GameOverScene],
};

const game = new Phaser.Game(config);
