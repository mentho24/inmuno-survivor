/* ============================================================
   Enemy.js
   ============================================================ */
class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    super(scene, 0, 0, "e_zombie");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
    this.typeKey = null;
    this.hp = 1;
    this.maxHp = 1;
    this.damage = 1;
    this.speed = 1;
    this.xp = 1;
    this.knock = 1;
    this._hitFlash = 0;
    this.active = false;
    this.setActive(false).setVisible(false);
  }

  spawn(typeKey, x, y, hpScale, dmgScale) {
    const def = ENEMIES[typeKey];
    this.typeKey = typeKey;
    this.setTexture(def.key);
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.damage = Math.round(def.damage * dmgScale);
    this.speed = def.speed;
    this.xp = def.xp;
    this.knock = def.knock;
    this.setCircle(def.radius, this.width / 2 - def.radius, this.height / 2 - def.radius);
    this.clearTint();
    this.setVelocity(0, 0);
    this.setScale(1);
  }

  hit(dmg) {
    this.hp -= dmg;
    this._hitFlash = 90;
    this.setTint(0xffffff);
    return this.hp <= 0;
  }

  knockback(fromX, fromY, force) {
    const ang = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.x += Math.cos(ang) * force * this.knock;
    this.y += Math.sin(ang) * force * this.knock;
  }

  despawn() {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this._hitFlash > 0) {
      this._hitFlash -= delta;
      if (this._hitFlash <= 0) this.clearTint();
    }
  }

  chase(target) {
    const ang = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
  }
}
