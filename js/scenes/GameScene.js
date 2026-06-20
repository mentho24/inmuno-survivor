/* ============================================================
   GameScene.js — núcleo del juego
   ============================================================ */
class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  create() {
    this.gameOver = false;
    this.elapsed = 0;        // ms transcurridos
    this.kills = 0;
    this.hitsTaken = 0;      // golpes recibidos
    this.powerups = 0;       // mejoras elegidas al subir de nivel
    this.paused = false;
    this.timeLimit = 900000; // 15 minutos = victoria

    const R = GAME.worldRadius;
    this.physics.world.setBounds(-R, -R, R * 2, R * 2);

    // Fondo en mosaico
    this.bg = this.add.tileSprite(0, 0, GAME.width, GAME.height, "bg_tile")
      .setOrigin(0).setScrollFactor(0).setDepth(-10);

    // Jugador
    this.player = new Player(this, 0, 0);

    // Arma inicial aleatoria (entre las armas base, no las evolucionadas)
    const baseWeapons = Object.keys(WEAPONS).filter(id => !WEAPONS[id].evolved);
    const startId = baseWeapons[Math.floor(Math.random() * baseWeapons.length)];
    this.player.addWeapon(startId);

    // Cámara
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(-R, -R, R * 2, R * 2);

    // Grupos
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 600, runChildUpdate: true });
    this.projectiles = this.physics.add.group({ maxSize: 300 });
    this.pickups = this.physics.add.group({ classType: Pickup, maxSize: 800 });

    // FX: contenedor de auras / látigos
    this.fxGroup = this.add.group();

    // Colisiones
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);
    // Empuje entre enemigos para que no se apilen perfectamente
    this.physics.add.collider(this.enemies, this.enemies);

    // Input
    this.keys = this.input.keyboard.addKeys({
      up: "W", down: "S", left: "A", right: "D",
      up2: "UP", down2: "DOWN", left2: "LEFT", right2: "RIGHT",
    });

    // Joystick táctil flotante (tocar y arrastrar) — solo móvil/tablet
    this.setupTouchJoystick();

    // Spawning
    this.spawnTimer = 0;
    this.spawnInterval = 900;

    // Auras pool (textos de daño)
    this.damageTexts = [];

    // Partículas de muerte
    this.deathEmitter = this.add.particles(0, 0, "spark", {
      lifespan: 350, speed: { min: 40, max: 140 }, scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 }, emitting: false, tint: 0xff8866,
    }).setDepth(6);

    // Eventos desde HUD/LevelUp
    this.events.on("resume", () => { this.paused = false; });

    // TAB: ver combinaciones de evolución (overlay que pausa el juego)
    this.combosOpen = false;
    this.input.keyboard.addCapture("TAB");
    this.input.keyboard.on("keydown-TAB", () => this.toggleCombos());

    // HUD inicial
    this.emitHud();

    // Primer jefe a los 3 min, luego cada 2 min
    this.nextBossAt = 180000;
  }

  // ---------------- Update principal ----------------
  update(time, delta) {
    if (this.gameOver || this.paused) return;
    const dt = delta;
    this.elapsed += dt;

    // Input combinado
    const k = this.keys;
    const input = {
      left: k.left.isDown || k.left2.isDown,
      right: k.right.isDown || k.right2.isDown,
      up: k.up.isDown || k.up2.isDown,
      down: k.down.isDown || k.down2.isDown,
    };
    if (this.joyId !== null) { input.ax = this.touchVector.x; input.ay = this.touchVector.y; }
    this.player.update(dt, input);

    // Fondo parallax con la cámara
    this.bg.tilePositionX = this.cameras.main.scrollX;
    this.bg.tilePositionY = this.cameras.main.scrollY;

    // IA enemigos: perseguir
    const ex = this.enemies.getChildren();
    for (let i = 0; i < ex.length; i++) {
      const e = ex[i];
      if (!e.active) continue;
      e.chase(this.player);
      // despawn si quedan demasiado lejos (fuera de pantalla amplia)
      if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) > 1600) {
        // reposicionar al otro lado en vez de eliminar (mantiene presión)
        this.repositionEnemy(e);
      }
    }

    // Imán: atraer gemas cercanas
    this.updatePickups(dt);

    // Armas
    this.updateWeapons(dt);

    // Proyectiles fuera de rango
    this.cleanupProjectiles();

    // Spawning
    this.updateSpawning(dt);

    // Victoria al alcanzar el límite de tiempo
    if (this.elapsed >= this.timeLimit) { this.finish(true); return; }

    // Muerte del jugador
    if (this.player.hp <= 0) this.finish(false);

    this.emitHud();
  }

  // ---------------- HUD ----------------
  emitHud() {
    const p = this.player;
    this.game.events.emit("hud", {
      hp: Math.max(0, Math.ceil(p.hp)),
      maxHp: p.stats.maxHp,
      level: p.level,
      xp: p.xp,
      xpNext: p.xpNext,
      time: this.elapsed,
      kills: this.kills,
      weapons: p.weapons.map(w => ({ id: w.id, level: w.level, icon: WEAPONS[w.id].icon })),
      passives: p.passives.map(pp => ({ id: pp.id, level: pp.level, icon: PASSIVES[pp.id].icon })),
    });
  }

  // ---------------- Spawning ----------------
  updateSpawning(dt) {
    this.spawnTimer += dt;
    const minutes = this.elapsed / 60000;

    // Rampa de dificultad: arranca suave (~primeros 2.5 min) y se endurece después.
    // 'ramp' crece despacio al principio y se acelera con el tiempo.
    // Rampa estirada sobre 15 min: arranca suave y trepa de forma pareja.
    const ramp = (minutes * minutes) / (minutes + 4);
    this.spawnInterval = Math.max(135, 860 - ramp * 130);
    const hpScale = 1 + ramp * 0.78;
    const dmgScale = 1 + ramp * 0.26;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const batch = 2 + Math.floor(ramp * 2.4);
      for (let i = 0; i < batch; i++) {
        this.spawnEnemy(this.pickEnemyType(minutes), hpScale, dmgScale);
      }
    }

    // Jefe cada 2 minutos
    if (this.elapsed >= this.nextBossAt) {
      this.nextBossAt += 120000;
      this.spawnBoss(hpScale, dmgScale);
    }
  }

  pickEnemyType(minutes) {
    const roll = Math.random();
    if (minutes < 1) return roll < 0.85 ? "rhino" : "influ";
    if (minutes < 3) {
      if (roll < 0.5) return "rhino";
      if (roll < 0.8) return "influ";
      return "adeno";
    }
    if (roll < 0.35) return "rhino";
    if (roll < 0.6) return "influ";
    if (roll < 0.85) return "adeno";
    return "corona";
  }

  spawnPosition() {
    // punto en el borde de la pantalla alrededor del jugador
    const ang = Math.random() * Math.PI * 2;
    const dist = 720 + Math.random() * 160;
    return { x: this.player.x + Math.cos(ang) * dist, y: this.player.y + Math.sin(ang) * dist };
  }

  spawnEnemy(typeKey, hpScale, dmgScale) {
    const pos = this.spawnPosition();
    let e = this.enemies.getFirstDead(false);
    if (!e) {
      if (this.enemies.countActive() >= 550) return;
      e = new Enemy(this);
      this.enemies.add(e);
    }
    e.spawn(typeKey, pos.x, pos.y, hpScale, dmgScale);
  }

  spawnBoss(hpScale, dmgScale) {
    const pos = this.spawnPosition();
    let e = this.enemies.getFirstDead(false);
    if (!e) { e = new Enemy(this); this.enemies.add(e); }
    e.spawn("corona", pos.x, pos.y, hpScale * 8, dmgScale * 1.5);
    e.setScale(2.2);
    e.maxHp = e.hp = Math.round(e.maxHp);
    e.xp = 40;
    e.isBoss = true;
    e.setTint(0xff3030);
    Sfx.play("boss");
    this.flashMessage("¡CEPA VIRULENTA!", 0xff4040);
  }

  repositionEnemy(e) {
    const pos = this.spawnPosition();
    e.setPosition(pos.x, pos.y);
  }

  // ---------------- Armas ----------------
  updateWeapons(dt) {
    for (const w of this.player.weapons) {
      switch (w.type) {
        case "bolt":  this.weaponBolt(w, dt); break;
        case "knife": this.weaponKnife(w, dt); break;
        case "whip":  this.weaponWhip(w, dt); break;
        case "aura":  this.weaponAura(w, dt); break;
        case "orbit": this.weaponOrbit(w, dt); break;
        case "nova":  this.weaponNova(w, dt); break;
        case "chain": this.weaponChain(w, dt); break;
      }
    }
  }

  cooldownReady(w, dt, baseCd) {
    w.timer -= dt;
    const cd = baseCd / this.player.stats.haste;
    if (w.timer <= 0) { w.timer = cd; return true; }
    return false;
  }

  dmg(base) { return base * this.player.stats.might; }

  // multiplicador de tamaño de áreas/proyectiles
  get areaMul() { return this.player.stats.area; }
  // proyectiles extra de la pasiva Proliferación
  get extraShots() { return this.player.stats.amount; }

  findNearestEnemy(maxDist = 900) {
    let best = null, bestD = maxDist * maxDist;
    const ex = this.enemies.getChildren();
    for (let i = 0; i < ex.length; i++) {
      const e = ex[i];
      if (!e.active) continue;
      const d = (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  spawnProjectile(tex, x, y, angle, speed, damage, pierce, scale) {
    let p = this.projectiles.getFirstDead(false);
    if (!p) {
      p = this.physics.add.image(x, y, tex);
      this.projectiles.add(p);
    }
    p.setTexture(tex);
    p.setActive(true).setVisible(true);
    p.body.enable = true;
    p.setPosition(x, y);
    p.setScale(scale || 1);
    p.setRotation(angle);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    p.damage = damage;
    p.pierce = pierce || 1;
    p._hitSet = p._hitSet || new Set();
    p._hitSet.clear();
    p.bornAt = this.time.now;
    p.setDepth(7);
    return p;
  }

  weaponBolt(w, dt) {
    if (!this.cooldownReady(w, dt, w.stats.cooldown)) return;
    const target = this.findNearestEnemy();
    if (!target) { w.timer = 120; return; }
    const baseAng = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = w.stats.count + this.extraShots;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.16;
      this.spawnProjectile("proj_bolt", this.player.x, this.player.y,
        baseAng + spread, w.stats.speed, this.dmg(w.stats.damage), w.stats.pierce, this.areaMul);
    }
  }

  weaponKnife(w, dt) {
    if (!this.cooldownReady(w, dt, w.stats.cooldown)) return;
    const f = this.player.facing;
    const baseAng = Math.atan2(f.y, f.x);
    const count = w.stats.count + this.extraShots;
    for (let i = 0; i < count; i++) {
      let ang;
      if (w.stats.ring) {
        // Estrés Oxidativo: dispara en círculo completo
        ang = baseAng + (i / count) * Math.PI * 2;
      } else {
        ang = baseAng + (i - (count - 1) / 2) * w.stats.spread;
      }
      this.spawnProjectile("proj_knife", this.player.x, this.player.y,
        ang, w.stats.speed, this.dmg(w.stats.damage), w.stats.pierce, this.areaMul);
    }
  }

  weaponWhip(w, dt) {
    if (!this.cooldownReady(w, dt, w.stats.cooldown)) return;
    // Fagocitosis: engulle en un círculo alrededor del jugador
    if (w.stats.engulf) {
      const radius = w.stats.width * 0.5 * this.areaMul;
      const fx = this.add.image(this.player.x, this.player.y, "fx_aura")
        .setDepth(8).setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfe9ff)
        .setDisplaySize(radius * 2, radius * 2).setAlpha(0.8);
      this.tweens.add({ targets: fx, alpha: 0, scale: fx.scale * 1.15, duration: 220, onComplete: () => fx.destroy() });
      this.damageInCircle(this.player.x, this.player.y, radius, this.dmg(w.stats.damage), 70);
      return;
    }
    const sides = w.stats.count >= 2 ? [1, -1] : [this.player.facing.x >= 0 ? 1 : -1];
    const ww = w.stats.width * this.areaMul;
    const wh = w.stats.height * this.areaMul;
    for (const dir of sides) {
      const cx = this.player.x + dir * ww * 0.4;
      const cy = this.player.y;
      // FX visual
      const fx = this.add.image(cx, cy, "fx_whip")
        .setDisplaySize(ww, wh)
        .setTint(0xbfe9ff).setAlpha(0.85).setDepth(8).setFlipX(dir < 0);
      this.tweens.add({ targets: fx, alpha: 0, scaleX: fx.scaleX * 1.1, duration: 180,
        onComplete: () => fx.destroy() });
      // Daño en rectángulo
      const rect = new Phaser.Geom.Rectangle(cx - ww / 2, cy - wh / 2, ww, wh);
      this.damageInRect(rect, this.dmg(w.stats.damage), 60);
    }
  }

  weaponAura(w, dt) {
    // FX persistente
    if (!w.fx) {
      w.fx = this.add.image(this.player.x, this.player.y, "fx_aura").setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0x66ffb0);
    }
    w.fx.setPosition(this.player.x, this.player.y);
    const radius = w.stats.radius * this.areaMul;
    w.fx.setDisplaySize(radius * 2, radius * 2);
    w.fx.setAlpha(0.35 + Math.sin(this.time.now / 300) * 0.08);

    w.timer -= dt;
    const tick = w.stats.tick / this.player.stats.haste;
    if (w.timer <= 0) {
      w.timer = tick;
      this.damageInCircle(this.player.x, this.player.y, radius, this.dmg(w.stats.damage), 30);
    }
  }

  weaponOrbit(w, dt) {
    w.angle += w.stats.speed * (dt / 1000);
    const n = w.stats.count;
    // crear/ajustar orbes visuales
    while (w.orbs.length < n) {
      w.orbs.push(this.add.image(0, 0, "proj_orbit").setDepth(7).setBlendMode(Phaser.BlendModes.ADD));
    }
    while (w.orbs.length > n) { w.orbs.pop().destroy(); }

    const orbitR = w.stats.radius * this.areaMul;
    for (let i = 0; i < n; i++) {
      const a = w.angle + (i / n) * Math.PI * 2;
      const ox = this.player.x + Math.cos(a) * orbitR;
      const oy = this.player.y + Math.sin(a) * orbitR;
      w.orbs[i].setPosition(ox, oy);
      // daño por contacto con su propio cooldown
      this.damageInCircle(ox, oy, 16, this.dmg(w.stats.damage), 0, w, i);
    }
  }

  weaponNova(w, dt) {
    if (!this.cooldownReady(w, dt, w.stats.cooldown)) return;
    const radius = w.stats.radius * this.areaMul;
    // Onda visual expansiva
    const ring = this.add.image(this.player.x, this.player.y, "fx_aura")
      .setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a3a)
      .setDisplaySize(40, 40).setAlpha(0.9);
    this.tweens.add({
      targets: ring, displayWidth: radius * 2, displayHeight: radius * 2, alpha: 0,
      duration: 420, ease: "Cubic.out", onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(120, 0.004);
    this.damageInCircle(this.player.x, this.player.y, radius, this.dmg(w.stats.damage), 80);
    if (w.stats.healOnCast) {
      this.player.heal(w.stats.healOnCast);
      this.showDamage(this.player.x, this.player.y - 20, "+" + w.stats.healOnCast, "#6fffb0");
    }
  }

  weaponChain(w, dt) {
    if (!this.cooldownReady(w, dt, w.stats.cooldown)) return;
    let current = this.findNearestEnemy(w.stats.range);
    if (!current) { w.timer = 150; return; }
    const hit = new Set();
    let fromX = this.player.x, fromY = this.player.y;
    const jumps = w.stats.jumps;
    const range2 = (w.stats.range) ** 2;
    for (let j = 0; j < jumps && current; j++) {
      hit.add(current);
      this.drawChainBolt(fromX, fromY, current.x, current.y);
      this.applyDamage(current, this.dmg(w.stats.damage), 20, fromX, fromY);
      fromX = current.x; fromY = current.y;
      // buscar el siguiente virus no golpeado más cercano dentro de rango
      let next = null, bestD = range2;
      const ex = this.enemies.getChildren();
      for (let i = 0; i < ex.length; i++) {
        const e = ex[i];
        if (!e.active || hit.has(e)) continue;
        const d = (e.x - fromX) ** 2 + (e.y - fromY) ** 2;
        if (d < bestD) { bestD = d; next = e; }
      }
      current = next;
    }
  }

  drawChainBolt(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(3, 0x9affd6, 0.9);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  // ---------------- Aplicar daño en área ----------------
  damageInRect(rect, damage, knock) {
    const ex = this.enemies.getChildren();
    for (let i = 0; i < ex.length; i++) {
      const e = ex[i];
      if (!e.active) continue;
      if (rect.contains(e.x, e.y)) {
        this.applyDamage(e, damage, knock, rect.centerX, rect.centerY);
      }
    }
  }

  damageInCircle(x, y, radius, damage, knock, weapon, orbIndex) {
    const r2 = radius * radius;
    const ex = this.enemies.getChildren();
    for (let i = 0; i < ex.length; i++) {
      const e = ex[i];
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= r2) {
        // cooldown por orbe (para satélites)
        if (weapon && orbIndex !== undefined) {
          const key = e.id || (e.id = ++this._eidCounter || (this._eidCounter = 1));
          e._orbHit = e._orbHit || {};
          const now = this.time.now;
          if (e._orbHit[orbIndex] && now - e._orbHit[orbIndex] < weapon.stats.hitCooldown) continue;
          e._orbHit[orbIndex] = now;
        }
        this.applyDamage(e, damage, knock, x, y);
      }
    }
  }

  // ---------------- Colisiones ----------------
  onProjectileHit(proj, enemy) {
    if (!proj.active || !enemy.active) return;
    if (proj._hitSet.has(enemy)) return;
    proj._hitSet.add(enemy);
    this.applyDamage(enemy, proj.damage, 50, proj.x, proj.y);
    proj.pierce--;
    if (proj.pierce <= 0) this.killProjectile(proj);
  }

  applyDamage(enemy, damage, knock, fromX, fromY) {
    // Golpe crítico
    let isCrit = false;
    if (Math.random() < this.player.stats.crit) {
      damage *= this.player.stats.critMult;
      isCrit = true;
    }
    const dead = enemy.hit(damage);
    if (knock > 0) enemy.knockback(fromX, fromY, knock);
    this.showDamage(enemy.x, enemy.y, Math.round(damage),
      isCrit ? "#ffd24a" : "#ffffff", isCrit);
    if (dead) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    this.kills++;
    Sfx.play("death");
    this.deathEmitter.setParticleTint(ENEMIES[enemy.typeKey].color);
    this.deathEmitter.emitParticleAt(enemy.x, enemy.y, 8);

    // soltar XP
    this.dropPickup(enemy);
    enemy.isBoss = false;
    enemy.setScale(1);
    enemy.clearTint();
    enemy._orbHit = null;
    enemy.despawn();
  }

  dropPickup(enemy) {
    // Fusionar con una gema de XP cercana para evitar acumulación
    const mergeDist2 = 36 * 36;
    const list = this.pickups.getChildren();
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (!g.active || g.kind !== "xp" || g._attracting) continue;
      const d = (g.x - enemy.x) ** 2 + (g.y - enemy.y) ** 2;
      if (d < mergeDist2) { g.addValue(enemy.xp); this._maybeDropExtras(enemy); return; }
    }
    let p = this.pickups.getFirstDead(false);
    if (!p) { p = new Pickup(this); this.pickups.add(p); }
    p.spawnXp(enemy.x, enemy.y, enemy.xp);
    this._maybeDropExtras(enemy);
  }

  _maybeDropExtras(enemy) {
    // probabilidad de corazón
    if (Math.random() < 0.02 || enemy.isBoss) {
      let h = this.pickups.getFirstDead(false);
      if (!h) { h = new Pickup(this); this.pickups.add(h); }
      h.spawnHeal(enemy.x + 20, enemy.y, 20);
    }
    // probabilidad de imán (recoge toda la XP de la pantalla al juntarlo)
    if (Math.random() < 0.004 || enemy.isBoss) {
      let m = this.pickups.getFirstDead(false);
      if (!m) { m = new Pickup(this); this.pickups.add(m); }
      m.spawnMagnet(enemy.x - 20, enemy.y);
    }
  }

  onPlayerHit(player, enemy) {
    if (!enemy.active) return;
    const hurt = player.takeDamage(enemy.damage);
    if (hurt) {
      this.hitsTaken++;
      Sfx.play("hurt");
      // pequeño empuje al enemigo
      enemy.knockback(player.x, player.y, 12);
    }
  }

  onPickup(player, pickup) {
    if (!pickup.active) return;
    if (pickup.kind === "xp") {
      const gained = Math.max(1, Math.round(pickup.value * player.stats.growth));
      const levels = player.gainXp(gained);
      if (levels > 0) this.triggerLevelUp(levels);
    } else if (pickup.kind === "heal") {
      player.heal(pickup.value);
      Sfx.play("heal");
      this.showDamage(player.x, player.y - 20, "+" + pickup.value, "#6fffb0");
    } else if (pickup.kind === "magnet") {
      this.collectAllGems();
    }
    pickup.despawn();
  }

  // Imán: marca toda la XP de la pantalla para que vuele hacia el jugador
  collectAllGems() {
    const list = this.pickups.getChildren();
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (g.active && g.kind === "xp") g._attracting = true;
    }
    this.cameras.main.flash(220, 120, 200, 255);
    Sfx.play("magnet");
    this.flashMessage("¡IMÁN!", 0x9fe0ff);
  }

  // ---------------- Pickups (imán) ----------------
  updatePickups(dt) {
    const range = this.player.pickupRange;
    const range2 = range * range;
    const px = this.player.x, py = this.player.y;
    const list = this.pickups.getChildren();
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (!g.active) continue;
      const d = (g.x - px) ** 2 + (g.y - py) ** 2;
      if (g._attracting || d < range2) {
        g.attractTo(this.player, dt);
      }
    }
  }

  // ---------------- Joystick táctil flotante (solo móvil/tablet) ----------------
  isTouchDevice() {
    const dev = this.sys.game.device.input;
    return !!(dev && dev.touch) ||
      (typeof window !== "undefined" &&
        ("ontouchstart" in window || (navigator && navigator.maxTouchPoints > 0)));
  }

  setupTouchJoystick() {
    this.joyId = null;
    this.joyOrigin = { x: 0, y: 0 };
    this.touchVector = { x: 0, y: 0 };
    const RADIUS = 80;

    // Visuales (fijos a la cámara, ocultos hasta tocar)
    this.joyBase = this.add.circle(0, 0, RADIUS, 0xffffff, 0.10)
      .setScrollFactor(0).setDepth(50).setVisible(false).setStrokeStyle(3, 0x6fffb0, 0.5);
    this.joyThumb = this.add.circle(0, 0, 34, 0x6fffb0, 0.55)
      .setScrollFactor(0).setDepth(51).setVisible(false);

    if (!this.isTouchDevice()) return; // en PC se mueve con teclado

    const W = this.scale.width;

    this.input.on("pointerdown", (p) => {
      if (this.paused || this.gameOver) return;
      if (this.joyId !== null) return;                 // ya hay un dedo controlando
      if (p.x > W - 130 && p.y < 150) return;          // zona del botón EVO (arriba-derecha)
      this.joyId = p.id;
      this.joyOrigin.x = p.x; this.joyOrigin.y = p.y;
      this.joyBase.setPosition(p.x, p.y).setVisible(true);
      this.joyThumb.setPosition(p.x, p.y).setVisible(true);
    });

    this.input.on("pointermove", (p) => {
      if (p.id !== this.joyId) return;
      const dx = p.x - this.joyOrigin.x, dy = p.y - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, RADIUS);
      const ang = Math.atan2(dy, dx);
      this.joyThumb.setPosition(this.joyOrigin.x + Math.cos(ang) * clamped,
                                this.joyOrigin.y + Math.sin(ang) * clamped);
      const mag = clamped / RADIUS;
      if (mag < 0.15) { this.touchVector.x = 0; this.touchVector.y = 0; }
      else { this.touchVector.x = Math.cos(ang) * mag; this.touchVector.y = Math.sin(ang) * mag; }
    });

    const release = (p) => {
      if (p.id !== this.joyId) return;
      this.joyId = null;
      this.touchVector.x = 0; this.touchVector.y = 0;
      this.joyBase.setVisible(false);
      this.joyThumb.setVisible(false);
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
  }

  resetJoystick() {
    this.joyId = null;
    if (this.touchVector) { this.touchVector.x = 0; this.touchVector.y = 0; }
    if (this.joyBase) this.joyBase.setVisible(false);
    if (this.joyThumb) this.joyThumb.setVisible(false);
  }

  // ---------------- Combinaciones (TAB) ----------------
  toggleCombos() {
    if (this.gameOver) return;
    if (this.scene.isActive("LevelUpScene")) return; // no interrumpir la elección
    if (this.combosOpen) this.closeCombos();
    else this.openCombos();
  }

  openCombos() {
    this.combosOpen = true;
    this.paused = true;
    this.resetJoystick();
    this.physics.pause();
    this.scene.launch("CombosScene", { overlay: true, gameScene: this });
    this.scene.bringToTop("CombosScene");
  }

  closeCombos() {
    this.combosOpen = false;
    this.scene.stop("CombosScene");
    if (!this.scene.isActive("LevelUpScene")) {
      this.physics.resume();
      this.paused = false;
    }
  }

  // ---------------- Subir de nivel ----------------
  triggerLevelUp(levels) {
    this.paused = true;
    Sfx.play("levelup");
    this.resetJoystick();
    this.physics.pause();
    const choices = this.buildUpgradeChoices();
    this.scene.launch("LevelUpScene", { choices, levels, gameScene: this });
    this.scene.bringToTop("LevelUpScene");
  }

  applyUpgrade(choice) {
    if (choice.kind === "weapon") this.player.addWeapon(choice.id);
    else if (choice.kind === "passive") this.player.addPassive(choice.id);
    else if (choice.kind === "heal") this.player.heal(40);
    else if (choice.kind === "evolve") this.evolveWeapon(choice.id, choice.into);
    if (choice.kind !== "heal") this.powerups++;
    this.emitHud();
  }

  evolveWeapon(baseId, intoId) {
    const idx = this.player.weapons.findIndex(w => w.id === baseId);
    if (idx === -1) return;
    const old = this.player.weapons[idx];
    // Limpiar FX persistentes del arma base
    if (old.fx) old.fx.destroy();
    if (old.orbs) old.orbs.forEach(o => o.destroy());
    this.player.weapons.splice(idx, 1);
    this.player.addWeapon(intoId);
    Sfx.play("evolve");
    this.flashMessage("¡EVOLUCIÓN!", 0xffd24a);
  }

  resumeFromLevelUp(remainingLevels) {
    if (remainingLevels > 0) {
      const choices = this.buildUpgradeChoices();
      this.scene.launch("LevelUpScene", { choices, levels: remainingLevels, gameScene: this });
      this.scene.bringToTop("LevelUpScene");
    } else {
      this.physics.resume();
      this.paused = false;
    }
  }

  hasPassive(id) { return this.player.passives.some(pp => pp.id === id && pp.level >= 1); }

  buildUpgradeChoices() {
    const pool = [];
    const evolutions = [];
    const p = this.player;
    const MAX_WEAPONS = 6;
    const MAX_PASSIVES = 6;

    // Armas existentes que pueden subir + evoluciones disponibles
    for (const w of p.weapons) {
      const def = WEAPONS[w.id];
      if (w.level < def.maxLevel) {
        pool.push({
          kind: "weapon", id: w.id, icon: def.icon, name: def.name,
          desc: def.perLevel[w.level - 1] || "Mejora",
          level: w.level + 1, isNew: false,
        });
      } else if (def.evolves && this.hasPassive(def.evolves.requires)
                 && !p.weapons.find(x => x.id === def.evolves.into)) {
        // Arma al máximo + pasiva requerida → ofrecer evolución
        const evo = WEAPONS[def.evolves.into];
        evolutions.push({
          kind: "evolve", id: w.id, into: def.evolves.into, icon: evo.icon,
          name: evo.name, desc: evo.desc, level: 0, isNew: false,
        });
      }
    }
    // Armas nuevas (si hay espacio, nunca las evolucionadas)
    if (p.weapons.length < MAX_WEAPONS) {
      for (const id in WEAPONS) {
        const def = WEAPONS[id];
        if (def.evolved) continue;
        // No re-ofrecer un arma base cuya evolución ya tenés
        if (def.evolves && p.weapons.find(w => w.id === def.evolves.into)) continue;
        if (!p.weapons.find(w => w.id === id)) {
          pool.push({ kind: "weapon", id, icon: def.icon, name: def.name, desc: def.desc, level: 1, isNew: true });
        }
      }
    }
    // Pasivas (con tope de ranuras: no se ofrecen nuevas si ya hay 6)
    for (const id in PASSIVES) {
      const def = PASSIVES[id];
      const owned = p.passives.find(pp => pp.id === id);
      const lvl = owned ? owned.level : 0;
      if (lvl >= def.maxLevel) continue;
      if (!owned && p.passives.length >= MAX_PASSIVES) continue; // sin ranuras libres
      pool.push({ kind: "passive", id, icon: def.icon, name: def.name, desc: def.desc, level: lvl + 1, isNew: !owned });
    }

    // Las evoluciones tienen prioridad: siempre se muestran primero
    Phaser.Utils.Array.Shuffle(pool);
    const choices = evolutions.slice(0, 4);
    for (const c of pool) {
      if (choices.length >= 4) break;
      choices.push(c);
    }
    // Respaldo si no hay nada que ofrecer
    if (choices.length < 1) {
      choices.push({ kind: "heal", id: "heal", icon: "pi_hp", name: "Curación", desc: "Recupera 40 de vida", level: 0, isNew: false });
    }
    return choices;
  }

  // ---------------- Helpers visuales ----------------
  showDamage(x, y, value, color = "#ffffff", big = false) {
    const t = this.add.text(x + Phaser.Math.Between(-6, 6), y - 10, "" + value, {
      fontFamily: "Trebuchet MS", fontSize: big ? "24px" : "16px", color, fontStyle: "bold",
      stroke: "#000000", strokeThickness: big ? 4 : 3,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - (big ? 52 : 40), alpha: 0, duration: big ? 700 : 600, onComplete: () => t.destroy() });
  }

  flashMessage(text, color = 0xffffff) {
    const t = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 120, text, {
      fontFamily: "Trebuchet MS", fontSize: "64px", fontStyle: "bold",
      color: "#" + color.toString(16).padStart(6, "0"), stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30).setScrollFactor(0);
    this.tweens.add({ targets: t, alpha: 0, scale: 1.4, duration: 1200, onComplete: () => t.destroy() });
  }

  killProjectile(p) {
    p.setActive(false).setVisible(false);
    p.body.enable = false;
    p.setVelocity(0, 0);
  }

  cleanupProjectiles() {
    const list = this.projectiles.getChildren();
    const now = this.time.now;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      if (now - p.bornAt > 2500) this.killProjectile(p);
    }
  }

  // ---------------- Fin del juego (victoria o derrota) ----------------
  finish(victory) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    Sfx.play(victory ? "victory" : "gameover");
    if (victory) {
      this.flashMessage("¡INFECCIÓN ERRADICADA!", 0x6fffb0);
      this.cameras.main.flash(400, 120, 255, 180);
    }

    const stats = {
      victory,
      time: Math.min(this.elapsed, this.timeLimit),
      kills: this.kills,
      hitsTaken: this.hitsTaken,
      powerups: this.powerups,
      level: this.player.level,
      // Loadout final del jugador (para mostrar en resultados)
      weapons: this.player.weapons.map(w => ({ icon: WEAPONS[w.id].icon, level: w.level, evolved: !!WEAPONS[w.id].evolved })),
      passives: this.player.passives.map(p => ({ icon: PASSIVES[p.id].icon, level: p.level })),
    };
    this.time.delayedCall(victory ? 1400 : 700, () => {
      this.scene.stop("HUDScene");
      this.scene.start("GameOverScene", stats);
    });
  }
}
