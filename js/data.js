/* ============================================================
   data.js — Configuración, balance y temática (Sistema Inmune)
   El jugador es un MACRÓFAGO. Los enemigos son VIRUS.
   ============================================================ */
const GAME = {
  width: 1280,
  height: 720,
  worldRadius: 2400,
};

// ---- Estadísticas base del jugador ----
const BASE_STATS = {
  maxHp: 110,
  moveSpeed: 235,
  pickupRadius: 120,
  might: 1.0,        // multiplicador de daño global
  haste: 1.0,        // multiplicador de cadencia (más alto = ataca más seguido)
  armor: 0,          // resta daño plano por golpe
  regen: 0,          // hp por segundo
  magnet: 0,         // bonus plano al radio de recogida
  area: 1.0,         // multiplica el tamaño de áreas y proyectiles
  amount: 0,         // proyectiles extra para todas las armas de disparo
  crit: 0.05,        // probabilidad de golpe crítico
  critMult: 2.0,     // multiplicador de daño crítico
  growth: 1.0,       // multiplicador de XP ganada
};

// ---- Definición de armas (temática inmunológica) ----
const WEAPONS = {
  bolt: {
    id: "bolt",
    name: "Anticuerpos",
    icon: "wi_bolt",
    desc: "Dispara anticuerpos al virus más cercano.",
    maxLevel: 8,
    evolves: { into: "bolt_evo", requires: "crit" },
    base: { cooldown: 720, damage: 20, speed: 500, count: 1, pierce: 1 },
    perLevel: [
      "+1 anticuerpo",
      "Daño +12",
      "Cadencia +20%",
      "+1 anticuerpo, Penetración +1",
      "Daño +16",
      "+2 anticuerpos",
      "Daño +24, Cadencia +20%",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.count += 1;
      if (lvl >= 3) stats.damage += 12;
      if (lvl >= 4) stats.cooldown *= 0.8;
      if (lvl >= 5) { stats.count += 1; stats.pierce += 1; }
      if (lvl >= 6) stats.damage += 16;
      if (lvl >= 7) stats.count += 2;
      if (lvl >= 8) { stats.damage += 24; stats.cooldown *= 0.8; }
    },
  },
  whip: {
    id: "whip",
    name: "Pseudópodo",
    icon: "wi_whip",
    desc: "Extiende un brazo citoplasmático que arrasa en arco.",
    maxLevel: 8,
    evolves: { into: "whip_evo", requires: "might" },
    base: { cooldown: 950, damage: 28, count: 1, width: 175, height: 92 },
    perLevel: [
      "Golpea ambos lados",
      "Daño +14",
      "Área +30%",
      "Daño +18",
      "Cadencia +25%",
      "Área +30%",
      "Daño +28",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.count = 2;
      if (lvl >= 3) stats.damage += 14;
      if (lvl >= 4) { stats.width *= 1.3; stats.height *= 1.3; }
      if (lvl >= 5) stats.damage += 18;
      if (lvl >= 6) stats.cooldown *= 0.75;
      if (lvl >= 7) { stats.width *= 1.3; stats.height *= 1.3; }
      if (lvl >= 8) stats.damage += 28;
    },
  },
  aura: {
    id: "aura",
    name: "Estallido Enzimático",
    icon: "wi_aura",
    desc: "Libera enzimas que disuelven a todo virus cercano.",
    maxLevel: 8,
    evolves: { into: "aura_evo", requires: "area" },
    base: { tick: 420, damage: 13, radius: 90 },
    perLevel: [
      "Radio +25%",
      "Daño +7",
      "Cadencia +25%",
      "Radio +25%",
      "Daño +10",
      "Cadencia +25%",
      "Daño +18",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.radius *= 1.25;
      if (lvl >= 3) stats.damage += 7;
      if (lvl >= 4) stats.tick *= 0.75;
      if (lvl >= 5) stats.radius *= 1.25;
      if (lvl >= 6) stats.damage += 10;
      if (lvl >= 7) stats.tick *= 0.75;
      if (lvl >= 8) stats.damage += 18;
    },
  },
  orbit: {
    id: "orbit",
    name: "Lisosomas",
    icon: "wi_orbit",
    desc: "Vesículas que orbitan y revientan virus al contacto.",
    maxLevel: 8,
    evolves: { into: "orbit_evo", requires: "haste" },
    base: { count: 2, damage: 18, radius: 80, speed: 2.8, hitCooldown: 280 },
    perLevel: [
      "+1 lisosoma",
      "Daño +9",
      "Radio +25%",
      "+1 lisosoma",
      "Velocidad +30%",
      "Daño +12",
      "+2 lisosomas",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.count += 1;
      if (lvl >= 3) stats.damage += 9;
      if (lvl >= 4) stats.radius *= 1.25;
      if (lvl >= 5) stats.count += 1;
      if (lvl >= 6) stats.speed *= 1.3;
      if (lvl >= 7) stats.damage += 12;
      if (lvl >= 8) stats.count += 2;
    },
  },
  knife: {
    id: "knife",
    name: "Radicales Libres",
    icon: "wi_knife",
    desc: "Ráfaga de radicales en la dirección del movimiento.",
    maxLevel: 8,
    evolves: { into: "knife_evo", requires: "amount" },
    base: { cooldown: 520, damage: 13, speed: 660, count: 2, pierce: 1, spread: 0.16 },
    perLevel: [
      "+1 radical",
      "Daño +6",
      "Cadencia +20%",
      "+2 radicales",
      "Penetración +1",
      "Daño +9",
      "+2 radicales",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.count += 1;
      if (lvl >= 3) stats.damage += 6;
      if (lvl >= 4) stats.cooldown *= 0.8;
      if (lvl >= 5) stats.count += 2;
      if (lvl >= 6) stats.pierce += 1;
      if (lvl >= 7) stats.damage += 9;
      if (lvl >= 8) stats.count += 2;
    },
  },
  // ---- NUEVA: pulso masivo de limpieza de pantalla ----
  nova: {
    id: "nova",
    name: "Fiebre",
    icon: "wi_nova",
    desc: "Onda de calor que daña a TODO virus en un gran radio.",
    maxLevel: 8,
    evolves: { into: "nova_evo", requires: "regen" },
    base: { cooldown: 2700, damage: 15, radius: 195 },
    perLevel: [
      "Radio +20%",
      "Daño +7",
      "Cadencia +15%",
      "Radio +20%",
      "Daño +9",
      "Cadencia +15%",
      "Daño +14",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.radius *= 1.2;
      if (lvl >= 3) stats.damage += 7;
      if (lvl >= 4) stats.cooldown *= 0.85;
      if (lvl >= 5) stats.radius *= 1.2;
      if (lvl >= 6) stats.damage += 9;
      if (lvl >= 7) stats.cooldown *= 0.85;
      if (lvl >= 8) stats.damage += 14;
    },
  },
  // ---- NUEVA: rayo en cadena ----
  chain: {
    id: "chain",
    name: "Interferón",
    icon: "wi_chain",
    desc: "Señal que salta entre virus cercanos en cadena.",
    maxLevel: 8,
    evolves: { into: "chain_evo", requires: "growth" },
    base: { cooldown: 1300, damage: 26, jumps: 3, range: 280 },
    perLevel: [
      "+1 salto",
      "Daño +12",
      "Cadencia +20%",
      "+2 saltos",
      "Daño +16",
      "Alcance +30%",
      "+3 saltos, Daño +20",
    ],
    apply(stats, lvl) {
      if (lvl >= 2) stats.jumps += 1;
      if (lvl >= 3) stats.damage += 12;
      if (lvl >= 4) stats.cooldown *= 0.8;
      if (lvl >= 5) stats.jumps += 2;
      if (lvl >= 6) stats.damage += 16;
      if (lvl >= 7) stats.range *= 1.3;
      if (lvl >= 8) { stats.jumps += 3; stats.damage += 20; }
    },
  },

  // ============ ARMAS EVOLUCIONADAS ============
  // Se desbloquean al maximizar el arma base y tener la pasiva requerida.
  bolt_evo: {
    id: "bolt_evo", type: "bolt", evolved: true, name: "Anticuerpos Monoclonales", icon: "wi_bolt",
    desc: "Lluvia perforante de anticuerpos de alto daño.",
    maxLevel: 1, base: { cooldown: 360, damage: 72, speed: 640, count: 6, pierce: 4 },
    perLevel: [], apply() {},
  },
  whip_evo: {
    id: "whip_evo", type: "whip", evolved: true, name: "Fagocitosis", icon: "wi_whip",
    desc: "Engulle y disuelve todo a tu alrededor.",
    maxLevel: 1, base: { cooldown: 650, damage: 95, count: 1, width: 200, height: 200, engulf: true },
    perLevel: [], apply() {},
  },
  aura_evo: {
    id: "aura_evo", type: "aura", evolved: true, name: "Tormenta de Citoquinas", icon: "wi_aura",
    desc: "Aura enorme que pulveriza virus sin parar.",
    maxLevel: 1, base: { tick: 230, damage: 42, radius: 175 },
    perLevel: [], apply() {},
  },
  orbit_evo: {
    id: "orbit_evo", type: "orbit", evolved: true, name: "Apoptosis Orbital", icon: "wi_orbit",
    desc: "Anillo de lisosomas letales girando a gran velocidad.",
    maxLevel: 1, base: { count: 7, damage: 58, radius: 108, speed: 4.4, hitCooldown: 160 },
    perLevel: [], apply() {},
  },
  knife_evo: {
    id: "knife_evo", type: "knife", evolved: true, name: "Estrés Oxidativo", icon: "wi_knife",
    desc: "Estallido de radicales en TODAS las direcciones.",
    maxLevel: 1, base: { cooldown: 340, damage: 38, speed: 700, count: 14, pierce: 3, spread: 0, ring: true },
    perLevel: [], apply() {},
  },
  nova_evo: {
    id: "nova_evo", type: "nova", evolved: true, name: "Pirexia", icon: "wi_nova",
    desc: "Onda febril devastadora que además te cura.",
    maxLevel: 1, base: { cooldown: 1700, damage: 55, radius: 285, healOnCast: 6 },
    perLevel: [], apply() {},
  },
  chain_evo: {
    id: "chain_evo", type: "chain", evolved: true, name: "Respuesta Adaptativa", icon: "wi_chain",
    desc: "Interferón que se propaga sin control entre virus.",
    maxLevel: 1, base: { cooldown: 650, damage: 72, jumps: 14, range: 380 },
    perLevel: [], apply() {},
  },
};

// ---- Mejoras pasivas (temática inmunológica) ----
const PASSIVES = {
  hp:      { id: "hp",      name: "Membrana Reforzada", icon: "pi_hp",     desc: "+30 vida máxima",        maxLevel: 6, apply: s => { s.maxHp += 30; } },
  speed:   { id: "speed",   name: "Citoplasma Fluido",  icon: "pi_speed",  desc: "+14% velocidad",         maxLevel: 6, apply: s => { s.moveSpeed *= 1.14; } },
  might:   { id: "might",   name: "Enzimas Líticas",    icon: "pi_might",  desc: "+16% daño global",       maxLevel: 8, apply: s => { s.might *= 1.16; } },
  haste:   { id: "haste",   name: "Mitosis Acelerada",  icon: "pi_haste",  desc: "+14% cadencia",          maxLevel: 6, apply: s => { s.haste *= 1.14; } },
  area:    { id: "area",    name: "Inflamación",        icon: "pi_area",   desc: "+12% área de efecto",    maxLevel: 5, apply: s => { s.area *= 1.12; } },
  amount:  { id: "amount",  name: "Proliferación",      icon: "pi_amount", desc: "+1 proyectil a TODAS las armas", maxLevel: 3, apply: s => { s.amount += 1; } },
  crit:    { id: "crit",    name: "Punto Débil",        icon: "pi_crit",   desc: "+8% crítico, +25% daño crítico", maxLevel: 6, apply: s => { s.crit += 0.08; s.critMult += 0.25; } },
  armor:   { id: "armor",   name: "Pared Celular",      icon: "pi_armor",  desc: "+2 armadura",            maxLevel: 6, apply: s => { s.armor += 2; } },
  magnet:  { id: "magnet",  name: "Quimiotaxis",        icon: "pi_magnet", desc: "+60 radio de recogida",  maxLevel: 4, apply: s => { s.magnet += 60; } },
  regen:   { id: "regen",   name: "Regeneración Celular",icon: "pi_regen", desc: "+2 vida/seg",            maxLevel: 6, apply: s => { s.regen += 2; } },
  growth:  { id: "growth",  name: "Citoquinas",         icon: "pi_growth", desc: "+20% XP obtenida",       maxLevel: 5, apply: s => { s.growth *= 1.20; } },
};

// ---- Tipos de enemigos (virus) ----
const ENEMIES = {
  rhino:  { key: "e_rhino",  hp: 15, speed: 64,  damage: 9,  xp: 1, radius: 15, color: 0x7fd14f, knock: 1.0, name: "Rinovirus" },
  influ:  { key: "e_influ",  hp: 10, speed: 128, damage: 7,  xp: 1, radius: 12, color: 0xc06fe0, knock: 1.4, name: "Influenza" },
  adeno:  { key: "e_adeno",  hp: 34, speed: 98,  damage: 12, xp: 2, radius: 16, color: 0x5fd6c7, knock: 0.85, name: "Adenovirus" },
  corona: { key: "e_corona", hp: 100, speed: 48, damage: 18, xp: 5, radius: 24, color: 0xe05050, knock: 0.35, name: "Coronavirus" },
};

// Curva de XP: más empinada para que las mejoras se repartan en los 15 minutos
// (antes se maximizaba todo antes del minuto 6).
function xpForLevel(level) {
  return Math.floor(6 + level * 6 + Math.pow(level, 1.8));
}
