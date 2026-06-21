/* ============================================================
   api.js — Cliente del ranking global (opcional).
   Si la API no está disponible (p. ej. en GitHub Pages), todo
   sigue funcionando con el ranking local de localStorage.
   ============================================================ */
const Api = {
  base: "", // mismo origen; el reverse-proxy de nginx expone /api
  sid: null,

  _timeout(ms) {
    const c = new AbortController();
    return { signal: c.signal, t: setTimeout(() => c.abort(), ms) };
  },

  // Abre una sesión de partida en el servidor (anti-cheat). Llamar al empezar.
  async startSession() {
    this.sid = null;
    try {
      const { signal, t } = this._timeout(4500);
      const r = await fetch(this.base + "/api/session", { method: "POST", signal });
      clearTimeout(t);
      if (!r.ok) return false;
      const d = await r.json();
      this.sid = (d && d.sid) ? d.sid : null;
      return !!this.sid;
    } catch (e) { this.sid = null; return false; }
  },

  async fetchTop(limit) {
    try {
      const { signal, t } = this._timeout(4500);
      const r = await fetch(this.base + "/api/scores/top?limit=" + (limit || 20), { signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d : (d && Array.isArray(d.scores) ? d.scores : null);
    } catch (e) { return null; }
  },

  async submit(entry) {
    if (!this.sid) return false; // sin sesión no se envía (la API la rechazaría)
    try {
      const { signal, t } = this._timeout(4500);
      const payload = Object.assign({}, entry, { sid: this.sid });
      const r = await fetch(this.base + "/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
      clearTimeout(t);
      this.sid = null; // sesión de un solo uso
      return r.ok;
    } catch (e) { return false; }
  },
};
