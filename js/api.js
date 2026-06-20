/* ============================================================
   api.js — Cliente del ranking global (opcional).
   Si la API no está disponible (p. ej. en GitHub Pages), todo
   sigue funcionando con el ranking local de localStorage.
   ============================================================ */
const Api = {
  base: "", // mismo origen; el reverse-proxy de nginx expone /api

  async fetchTop(limit) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 4500);
      const r = await fetch(this.base + "/api/scores/top?limit=" + (limit || 20), { signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d : (d && Array.isArray(d.scores) ? d.scores : null);
    } catch (e) { return null; }
  },

  async submit(entry) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 4500);
      const r = await fetch(this.base + "/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      return r.ok;
    } catch (e) { return false; }
  },
};
