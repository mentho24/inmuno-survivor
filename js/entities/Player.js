/* ============================================================
   Player.js
   ============================================================ */
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(14, 4, 4);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    // Estadísticas (copia de base)
    this.stats = Object.assign({}, BASE_STATS);
    this.hp = this.stats.maxHp;

    // Progresión
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);

    // Armas: { id, level, stats, timer }
    this.weapons = [];
    // Pasivas: { id, level }
    this.passives = [];

    // Dirección a la que mira (para látigo/dagas)
    this.facing = new Phaser.Math.Vector2(1, 0);

    this._invuln = 0;
    this._regenAcc = 0;
  }

  recalcStats() {
    // Recalcula desde base aplicando todas las pasivas
    const s = Object.assign({}, BASE_STATS);
    for (const p of this.passives) {
      const def = PASSIVES[p.id];
      for (let i = 0; i < p.level; i++) def.apply(s);
    }
    const oldMax = this.stats.maxHp;
    this.stats = s;
    // Si subió la vida máxima, cura la diferencia
    if (s.maxHp > oldMax) this.hp += (s.maxHp - oldMax);
    this.hp = Math.min(this.hp, s.maxHp);
  }

  get pickupRange() {
    return this.stats.pickupRadius + this.stats.magnet;
  }

  addWeapon(id) {
    const existing = this.weapons.find(w => w.id === id);
    if (existing) {
      existing.level++;
      this._buildWeaponStats(existing);
      return existing;
    }
    const def = WEAPONS[id];
    const w = { id, type: def.type || id, level: 1, stats: null, timer: 0, orbs: [], angle: 0 };
    this._buildWeaponStats(w);
    this.weapons.push(w);
    return w;
  }

  _buildWeaponStats(w) {
    const def = WEAPONS[w.id];
    const stats = Object.assign({}, def.base);
    def.apply(stats, w.level);
    w.stats = stats;
  }

  addPassive(id) {
    const existing = this.passives.find(p => p.id === id);
    if (existing) existing.level++;
    else this.passives.push({ id, level: 1 });
    this.recalcStats();
  }

  gainXp(amount) {
    this.xp += amount;
    let leveled = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      leveled++;
      this.xpNext = xpForLevel(this.level);
    }
    return leveled;
  }

  takeDamage(raw) {
    if (this._invuln > 0) return false;
    const dmg = Math.max(1, raw - this.stats.armor);
    this.hp -= dmg;
    this._invuln = 450; // i-frames en ms
    this.scene.cameras.main.shake(120, 0.006);
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => this.clearTint());
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  update(dt, input) {
    // Movimiento (teclado o joystick analógico)
    const speed = this.stats.moveSpeed;
    let vx = 0, vy = 0;
    if (input.ax !== undefined && (input.ax * input.ax + input.ay * input.ay) > 0.0001) {
      // Vector analógico del joystick táctil
      vx = input.ax; vy = input.ay;
    } else {
      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;
    }

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.length() > 1) v.normalize();           // tope de velocidad
    if (v.lengthSq() > 0.0001) this.facing.copy(v).normalize();
    this.setVelocity(v.x * speed, v.y * speed);

    // i-frames
    if (this._invuln > 0) {
      this._invuln -= dt;
      this.alpha = (Math.floor(this.scene.time.now / 60) % 2) ? 0.45 : 1;
    } else {
      this.alpha = 1;
    }

    // Regeneración
    if (this.stats.regen > 0 && this.hp < this.stats.maxHp) {
      this._regenAcc += this.stats.regen * (dt / 1000);
      if (this._regenAcc >= 1) {
        const whole = Math.floor(this._regenAcc);
        this.heal(whole);
        this._regenAcc -= whole;
      }
    }
  }
}
