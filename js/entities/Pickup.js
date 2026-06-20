/* ============================================================
   Pickup.js — gemas de XP y objetos
   ============================================================ */
class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    super(scene, 0, 0, "gem");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(4);
    this.kind = "xp";
    this.value = 1;
    this._attracting = false;
    this.setActive(false).setVisible(false);
    this.body.enable = false;
  }

  spawnXp(x, y, value) {
    this.kind = "xp";
    this.value = value;
    this.refreshTier();
    this._activateAt(x, y);
  }

  // Ajusta la textura/escala según el valor acumulado
  refreshTier() {
    let tex = "gem", scale = 1;
    if (this.value >= 25) { tex = "gem_big"; scale = 1.7; }
    else if (this.value >= 10) { tex = "gem_big"; scale = 1.3; }
    else if (this.value >= 4) { tex = "gem_big"; }
    else if (this.value >= 2) { tex = "gem_mid"; }
    this.setTexture(tex);
    if (this.active) this.setScale(scale);
    this._tierScale = scale;
  }

  addValue(v) {
    this.value += v;
    this.refreshTier();
  }

  spawnHeal(x, y, value) {
    this.kind = "heal";
    this.value = value;
    this.setTexture("heart");
    this._tierScale = 1;
    this._activateAt(x, y);
  }

  _activateAt(x, y) {
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    this._attracting = false;
    this.bornAt = this.scene.time.now; // para la deriva por antigüedad
    this.setScale(this._tierScale || 1);
    this.setVelocity(0, 0);
  }

  despawn() {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this._attracting = false;
  }

  attractTo(target, dt) {
    this._attracting = true;
    const ang = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const sp = 520;
    this.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }
}
