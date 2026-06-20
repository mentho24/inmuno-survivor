# 🦠 Inmuno Survivor

Un juego web *horde survivor* (estilo Vampire Survivors) con temática del sistema inmune:
sos un **macrófago** que defiende el cuerpo de una invasión de **virus**. Hecho con
[Phaser 3](https://phaser.io/) — 100% estático, sin build ni dependencias.

## 🎮 Jugar

**[▶ Jugar online](https://USUARIO.github.io/inmuno-survivor/)** *(reemplazá la URL tras el deploy)*

### Controles
- **Mover:** WASD o flechas
- **Atacar:** automático (tus defensas atacan solas)
- **Subir de nivel:** recogé fragmentos de ADN viral y elegí mejoras (teclas `1`–`4` o clic)
- **TAB:** ver las combinaciones de evolución durante la partida

### Mecánicas
- **7 armas** inmunológicas (Anticuerpos, Pseudópodo, Estallido Enzimático, Lisosomas,
  Radicales Libres, Fiebre, Interferón), cada una con una **evolución** al llegar a nivel 8
  + la pasiva requerida.
- **11 mejoras pasivas** (daño, área, crítico, cadencia, vida, etc.).
- Dificultad progresiva durante **15 minutos**; sobrevivir hasta el final es la victoria.
- **Ranking local** con puntaje (bajas, nivel, mejoras, tiempo, golpes recibidos) y nombre
  de jugador, guardado en `localStorage`.

## 💻 Correr localmente

Cualquier servidor estático sirve. Dos opciones:

```bash
# Opción A: Python
python3 -m http.server 8000
# luego abrí http://localhost:8000

# Opción B: Docker Compose (nginx)
docker compose up -d
# luego abrí http://localhost:8080
```

> No se puede abrir con `file://` directamente porque el navegador bloquea la carga de
> algunos scripts; usá un servidor local.

## 🗂️ Estructura

```
index.html            # carga Phaser (CDN) + todos los scripts
js/
  data.js             # balance, armas, pasivas, enemigos, evoluciones
  entities/           # Player, Enemy, Pickup
  scenes/             # Boot, Menu, Game, HUD, LevelUp, Combos, Ranking, GameOver
docker-compose.yml    # nginx para desarrollo local
```

## 📊 Sobre los puntajes

El ranking se guarda con `localStorage`, así que es **por navegador/dispositivo**.
GitHub Pages es hosting estático (sin backend), por lo que no hay ranking global compartido.
Para uno global se puede integrar un backend gratuito (p. ej. Supabase o Firebase).

---
Hecho con Phaser 3. Texturas generadas por código (sin assets externos).
