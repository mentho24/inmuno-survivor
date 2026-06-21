/* ============================================================
   server.js — API de ranking global (Node puro, sin dependencias)
   Anti-cheat (capas, NO infalible):
     - El puntaje lo RECALCULA el servidor desde las stats (ignora el del cliente).
     - Sesiones de un solo uso emitidas por el servidor + verificacion de tiempo real.
     - Validacion de plausibilidad: rechaza combinaciones imposibles.
   Endpoints:
     GET  /healthz
     POST /api/session          -> { sid }   (abrir partida)
     GET  /api/scores/top?limit -> top puntajes
     POST /api/scores           -> agrega un puntaje (validado)
   ============================================================ */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const DATA_FILE = process.env.DATA_FILE || "/data/scores.json";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MAX_KEEP = 200;
const MAX_BODY = 4096;
const RL_WINDOW = 60 * 1000, RL_MAX = 40;

// Limites de plausibilidad
const TIME_MAX = 900;            // 15 min
const LEVEL_MAX = 150;
const KILLS_PER_SEC_MAX = 150;   // tope generoso (legit ~50/s en late game)
const VICTORY_MIN_TIME = 880;    // una victoria implica haber llegado casi a 900s
const SESSION_TTL = 45 * 60 * 1000;
const TIME_SLACK = 6000;         // tolerancia de reloj (ms)

// ---------- almacenamiento de puntajes ----------
let scores = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (Array.isArray(raw)) scores = raw;
  }
} catch (e) { console.error("No se pudo leer DATA_FILE:", e.message); }

let writing = false, dirty = false;
function persist() {
  if (writing) { dirty = true; return; }
  writing = true;
  const tmp = DATA_FILE + ".tmp";
  fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true })
    .then(() => fs.promises.writeFile(tmp, JSON.stringify(scores)))
    .then(() => fs.promises.rename(tmp, DATA_FILE))
    .catch(e => console.error("Error al persistir:", e.message))
    .finally(() => { writing = false; if (dirty) { dirty = false; persist(); } });
}

// ---------- sesiones (en memoria) ----------
const sessions = new Map(); // sid -> { startMs, used, ip }
function newSid() {
  let s = "";
  for (let i = 0; i < 24; i++) s += "0123456789abcdef"[(Math.random() * 16) | 0];
  return s;
}

// ---------- rate limiting por IP ----------
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let arr = hits.get(ip);
  if (!arr) { arr = []; hits.set(ip, arr); }
  while (arr.length && now - arr[0] > RL_WINDOW) arr.shift();
  if (arr.length >= RL_MAX) return true;
  arr.push(now);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    while (arr.length && now - arr[0] > RL_WINDOW) arr.shift();
    if (!arr.length) hits.delete(ip);
  }
  for (const [sid, s] of sessions) {
    if (now - s.startMs > SESSION_TTL) sessions.delete(sid);
  }
}, RL_WINDOW).unref();

// ---------- saneo / validacion ----------
const clampInt = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
};
const cleanStr = (v, max) => String(v == null ? "" : v)
  .replace(/[^A-Za-z0-9 _\-]/g, "").slice(0, max);

function sanitizeLoadout(arr, isWeapon) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 4).map(it => {
    const o = { icon: cleanStr(it && it.icon, 20), level: clampInt(it && it.level, 0, 8) };
    if (isWeapon) o.evolved = !!(it && it.evolved);
    return o;
  }).filter(o => o.icon);
}

function computeScore(e) {
  const s = e.kills * 15 + e.level * 120 + e.powerups * 60 + e.timeSec * 8
            - e.hits * 25 + (e.victory ? 2500 : 0);
  return Math.max(0, Math.round(s));
}

// Devuelve { ok, entry } o { ok:false, reason }
function buildEntry(b, elapsedMs) {
  const timeSec = clampInt(b.timeSec, 0, TIME_MAX);
  const level = clampInt(b.level, 0, LEVEL_MAX);
  const kills = clampInt(b.kills, 0, KILLS_PER_SEC_MAX * TIME_MAX + 500);
  const powerups = clampInt(b.powerups, 0, LEVEL_MAX + 5);
  const hits = clampInt(b.hits, 0, 100000);
  const victory = !!b.victory;

  // --- plausibilidad ---
  if (timeSec * 1000 > elapsedMs + TIME_SLACK) return { ok: false, reason: "time_mismatch" };
  if (victory && timeSec < VICTORY_MIN_TIME) return { ok: false, reason: "victory_time" };
  if (kills > timeSec * KILLS_PER_SEC_MAX + 300) return { ok: false, reason: "too_many_kills" };
  if (powerups > level + 3) return { ok: false, reason: "too_many_powerups" };

  const entry = {
    name: cleanStr(b.name, 12) || "JUGADOR",
    kills, timeSec, level, powerups, hits, victory,
    weapons: sanitizeLoadout(b.weapons, true),
    passives: sanitizeLoadout(b.passives, false),
    date: new Date().toISOString().slice(0, 10),
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
  entry.score = computeScore(entry); // <- AUTORIDAD: el server calcula el score
  return { ok: true, entry };
}

// ---------- helpers HTTP ----------
function send(res, code, body) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(data);
}
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
function readBody(req, cb) {
  let size = 0, chunks = "";
  req.on("data", c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks += c; });
  req.on("end", () => { try { cb(null, JSON.parse(chunks || "{}")); } catch (e) { cb(e); } });
}

// ---------- servidor ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const ip = clientIp(req);
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok");

  if (req.method === "POST" && url.pathname === "/api/session") {
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    if (sessions.size > 50000) return send(res, 503, { error: "busy" });
    const sid = newSid();
    sessions.set(sid, { startMs: Date.now(), used: false, ip });
    return send(res, 201, { sid });
  }

  if (req.method === "GET" && url.pathname === "/api/scores/top") {
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    const limit = clampInt(url.searchParams.get("limit") || 20, 1, 50);
    return send(res, 200, scores.slice(0, limit));
  }

  if (req.method === "POST" && url.pathname === "/api/scores") {
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    readBody(req, (err, body) => {
      if (err || !body || typeof body !== "object") return send(res, 400, { error: "bad_body" });
      // Sesion obligatoria, de un solo uso, con tiempo real verificado
      const sess = sessions.get(String(body.sid || ""));
      if (!sess) return send(res, 403, { error: "no_session" });
      if (sess.used) return send(res, 403, { error: "session_used" });
      sess.used = true; // consumir aunque falle (anti brute-force)
      const elapsedMs = Date.now() - sess.startMs;
      const r = buildEntry(body, elapsedMs);
      if (!r.ok) return send(res, 422, { error: "implausible", reason: r.reason });
      sessions.delete(String(body.sid));
      scores.push(r.entry);
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > MAX_KEEP) scores.length = MAX_KEEP;
      persist();
      const rank = scores.findIndex(e => e.id === r.entry.id) + 1;
      return send(res, 201, { ok: true, rank, score: r.entry.score });
    });
    return;
  }

  return send(res, 404, { error: "not_found" });
});
server.listen(PORT, () => console.log("Ranking API (anti-cheat) en :" + PORT + " (data: " + DATA_FILE + ")"));
