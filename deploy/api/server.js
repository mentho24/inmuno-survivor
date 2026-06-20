/* ============================================================
   server.js — API de ranking global (Node puro, sin dependencias)
   Endpoints:
     GET  /healthz              -> "ok"
     GET  /api/scores/top?limit -> top puntajes (JSON)
     POST /api/scores           -> agrega un puntaje (validado)
   Persistencia: archivo JSON en DATA_FILE (volumen).
   ============================================================ */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const DATA_FILE = process.env.DATA_FILE || "/data/scores.json";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MAX_KEEP = 200;          // cuántos puntajes guardar
const MAX_BODY = 4096;         // bytes máximos de un POST
const RL_WINDOW = 60 * 1000;   // ventana de rate-limit
const RL_MAX = 40;             // requests por IP por ventana

// ---------- almacenamiento ----------
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
setInterval(() => { // limpieza periódica
  const now = Date.now();
  for (const [ip, arr] of hits) {
    while (arr.length && now - arr[0] > RL_WINDOW) arr.shift();
    if (!arr.length) hits.delete(ip);
  }
}, RL_WINDOW).unref();

// ---------- validación / saneo ----------
const clampInt = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
};
const cleanStr = (v, max) => String(v == null ? "" : v)
  .replace(/[^A-Za-z0-9 _\-]/g, "").slice(0, max);

function sanitizeLoadout(arr, isWeapon) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 8).map(it => {
    const o = { icon: cleanStr(it && it.icon, 20), level: clampInt(it && it.level, 0, 20) };
    if (isWeapon) o.evolved = !!(it && it.evolved);
    return o;
  }).filter(o => o.icon);
}

function buildEntry(b, ip) {
  return {
    name: cleanStr(b.name, 12) || "JUGADOR",
    score: clampInt(b.score, 0, 10000000),
    kills: clampInt(b.kills, 0, 1000000),
    timeSec: clampInt(b.timeSec, 0, 900),
    level: clampInt(b.level, 0, 500),
    victory: !!b.victory,
    weapons: sanitizeLoadout(b.weapons, true),
    passives: sanitizeLoadout(b.passives, false),
    date: new Date().toISOString().slice(0, 10),
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
}

// ---------- helpers HTTP ----------
function send(res, code, body, extra) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(code, Object.assign({
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  }, extra || {}));
  res.end(data);
}
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// ---------- servidor ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const ip = clientIp(req);

  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok");

  if (req.method === "GET" && url.pathname === "/api/scores/top") {
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    const limit = clampInt(url.searchParams.get("limit") || 20, 1, 50);
    return send(res, 200, scores.slice(0, limit));
  }

  if (req.method === "POST" && url.pathname === "/api/scores") {
    if (rateLimited(ip)) return send(res, 429, { error: "rate_limited" });
    let size = 0, chunks = "";
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { req.destroy(); }
      else chunks += c;
    });
    req.on("end", () => {
      let body;
      try { body = JSON.parse(chunks || "{}"); } catch (e) { return send(res, 400, { error: "bad_json" }); }
      if (!body || typeof body !== "object") return send(res, 400, { error: "bad_body" });
      const entry = buildEntry(body, ip);
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > MAX_KEEP) scores.length = MAX_KEEP;
      persist();
      const rank = scores.findIndex(e => e.id === entry.id) + 1;
      return send(res, 201, { ok: true, rank });
    });
    return;
  }

  return send(res, 404, { error: "not_found" });
});

server.listen(PORT, () => console.log("Ranking API escuchando en :" + PORT + " (data: " + DATA_FILE + ")"));
