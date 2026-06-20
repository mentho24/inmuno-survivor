# 🚀 Despliegue de Inmuno Survivor (con ranking global)

Stack autohospedado y endurecido:

- **web** — nginx que sirve el juego y hace reverse-proxy de `/api` (headers de
  seguridad, CSP, rate-limit, read-only, sin capabilities).
- **api** — API de ranking en Node (sin dependencias), datos en un volumen.
- **cloudflared** — túnel de Cloudflare (perfil opcional `tunnel`) para exponer el
  sitio **sin abrir puertos** en el host.

> El ranking es un leaderboard público; los puntajes los envía el cliente, así que
> **no es anti-cheat**. Hay validación y rate-limit, suficiente para un juego hobby.

---

## 1) Requisitos en el host

- Docker + Docker Compose v2 (`docker compose version`).

## 2) Traer los archivos al host

En `usuario@TU_SERVIDOR`:

```bash
sudo mkdir -p /data/docker
sudo chown "$USER" /data/docker
git clone https://github.com/mentho24/inmuno-survivor.git /data/docker/inmuno-survivor
cd /data/docker/inmuno-survivor/deploy
cp .env.example .env
```

(O copiá solo la carpeta `deploy/` con `scp -r deploy usuario@TU_SERVIDOR:/data/docker/inmuno-survivor/`.)

## 3) Prueba local (sin túnel todavía)

```bash
docker compose up -d --build
curl -s localhost:8080/api/scores/top      # -> []
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/   # -> 200
```

El puerto `8080` está atado a `127.0.0.1` (solo el host lo ve). El público entrará por
el túnel, no por este puerto.

## 4) Cloudflare Tunnel (exposición segura, sin abrir puertos)

1. En **Cloudflare Zero Trust** (https://one.dash.cloudflare.com) → **Networks → Tunnels → Create a tunnel** → tipo **Cloudflared**.
2. Ponele un nombre (p. ej. `inmuno-survivor`). Cloudflare te muestra un **token**
   (un string largo) en la opción **Docker**. Copialo.
3. Pegá el token en el `.env`:
   ```bash
   nano .env
   # TUNNEL_TOKEN=eyJ... (el token largo)
   ```
4. En **Public Hostnames** del túnel, agregá:
   - **Subdomain/Domain:** el dominio que ya tenés (p. ej. `juego.tudominio.com`)
   - **Service:** `HTTP` → `web:80`   ← importante: apunta al contenedor `web`
5. Levantá todo con el túnel:
   ```bash
   docker compose --profile tunnel up -d
   ```
6. Esperá ~30 s y entrá a `https://juego.tudominio.com`. Cloudflare te da **HTTPS
   automático** y el origen queda oculto detrás del túnel.

> Como el público entra por el túnel, podés además **cerrar todos los puertos
> entrantes** en el firewall del host (el túnel es saliente). Si querés, sacá la
> sección `ports:` del servicio `web` en `docker-compose.yml` para no exponer ni
> siquiera el `127.0.0.1:8080`.

## 5) Configurar el dominio en el juego

El juego llama a `/api` en el **mismo origen**, así que sirviéndolo por tu dominio
(vía el túnel) el ranking global funciona solo. No hay que tocar nada en el frontend.

En `RankingScene` vas a ver **“🌐 Ranking GLOBAL”** si la API responde, o
**“💾 Ranking LOCAL”** como fallback.

---

## Operación

```bash
# Ver estado / logs
docker compose ps
docker compose logs -f web
docker compose logs -f api

# Actualizar a la última versión del juego
docker compose pull web
docker compose --profile tunnel up -d

# Reiniciar / apagar
docker compose --profile tunnel restart
docker compose --profile tunnel down
```

## Backup del ranking

Los puntajes viven en el volumen `inmuno-survivor_scores` (`/data/scores.json`):

```bash
# Backup
docker run --rm -v inmuno-survivor_scores:/d -v "$PWD":/b alpine \
  sh -c 'cp /d/scores.json /b/scores-backup.json'

# Restore
docker run --rm -v inmuno-survivor_scores:/d -v "$PWD":/b alpine \
  sh -c 'cp /b/scores-backup.json /d/scores.json'
docker compose restart api
```

## Endurecimiento aplicado

- nginx: `server_tokens off`, CSP estricta, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, rate-limit y límite de conexiones por IP,
  cuerpos de request acotados, bloqueo de archivos ocultos.
- Contenedores: `read_only` rootfs + `tmpfs`, `no-new-privileges`, `cap_drop: ALL`
  (web solo recupera lo justo para escuchar en :80), red interna, **API no expuesta**
  al host, logs rotados.
- API: validación y saneo de toda entrada (incluido el nombre → anti-XSS), rate-limit
  por IP, escritura atómica del archivo de datos, corre como usuario `node` (no-root).
- Cloudflare Tunnel: sin puertos entrantes, HTTPS gestionado, origen oculto. Podés
  sumar **Cloudflare Access/WAF/rate-limiting** por encima si querés más capas.
