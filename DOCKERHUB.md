# 🦠 Inmuno Survivor

A web-based **horde survivor** game (in the style of *Vampire Survivors*) with an
immune-system theme: you play as a **macrophage** defending the body against a viral
invasion. Built with [Phaser 3](https://phaser.io/) — 100% static, no backend.

## ▶️ Run it

```bash
docker run -d -p 8080:80 mentho24/inmuno-survivor
```

Then open **http://localhost:8080** in your browser.

> Want a different port? Change the left side, e.g. `-p 9000:80` → http://localhost:9000

## 🎮 How to play

- **Move:** WASD / Arrow keys (desktop) or the on-screen **joystick** (mobile/tablet)
- **Attack:** automatic — your immune defenses fire on their own
- **Level up:** collect viral DNA fragments and pick an upgrade (keys `1`–`4` or click/tap)
- **Goal:** survive **15 minutes** to win. The difficulty ramps hard in the final minutes.

## ✨ Features

- **7 immune-themed weapons** (antibodies, pseudopod, enzymes, lysosomes, free radicals,
  fever, interferon), each with an **evolution** when maxed out + its required passive.
- **11 passive upgrades** (damage, area, crit, cooldown, health, and more).
- **4 weapon + 4 passive slots** — build identity matters.
- **Random starting weapon** every run.
- **Magnet pickups** that vacuum all on-screen XP, plus health drops.
- **Background music** + synthesized sound effects (mute with the in-game button or `M`).
- **Local high-score ranking** with your name and the build (weapons + passives) you used.
- **Mobile & tablet ready** (touch joystick, on-screen buttons, orientation hint).
- All art is **generated procedurally in code** — no external assets.

## 🏷️ Tags

- `latest` — current build
- `1.0` — pinned release

## 🔗 Links

- **Play online:** https://mentho24.github.io/inmuno-survivor/
- **Source code:** https://github.com/mentho24/inmuno-survivor

## 📦 Image details

- Base image: `nginx:alpine`
- Serves the static game on port **80**
- ~28 MB compressed

---

*Built with Phaser 3.*
