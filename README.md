# Porto Sol 2 — Open-World Crime Game

[![Rank](https://make.fun/badge/gta6-01/0xfari/gta6-01-porto-sol-v2/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/0xfari/gta6-01-porto-sol-v2/reward.svg)](https://make.fun/bounty/gta6-01)

An entry for the [gta6-01 "Make GTA 6" bounty](https://make.fun/bounty/gta6-01) on
[make.fun](https://make.fun/bounty/gta6-01?ref=p5tm223q) — a 2D top-down open-world
crime game set in Porto Sol, a sun-soaked tropical coastal city of neon streets,
palm beaches and a working marina.

## The game

Rico came back to Porto Sol with nothing but a name. Seven story missions take
him from street courier to king of the city: a timed delivery, a gold-car heist,
a police escape, a turf war, a sunset street race against rival Kiko, a boat
cargo run across the bay, and a final showdown on Neon Row.

- **Open world** — 3200×2400 city, 8 named districts, road grid, parks, beach,
  harbor and canal, all drawn procedurally on canvas. No external assets.
- **On foot + driving** — walk with WASD, steal any parked car with E, drive,
  brake and switch cars. Smooth follow camera that zooms out at speed.
- **Boats** — 4 boats at the marina and canal; take one out to the open sea.
- **Wanted 1–5 stars** — rises on stealing, crashing and shooting. Patrol cars,
  foot cops, roadblocks at high wanted, and a police helicopter at 3+ stars.
  Stars decay when you lay low.
- **Combat** — punch (F), pistol and SMG (mouse aim, click to shoot), health and
  armor pickups, rival gang members who chase and shoot back.
- **Life** — 24 traffic cars following the lanes, 40 pedestrians who flee chaos,
  a day/sunset/night cycle, 3 synth radio stations (R to switch), WebAudio
  engine hum, sirens and gunshots.
- **HUD** — health/armor, cash, wanted stars, clock, speed, objective, messages
  and a live minimap with waypoint, police, cars and boats.
- **Structure** — start screen, pause (Esc), save/load + autosave per mission
  (localStorage), game over with retry, and a win screen after mission 7.
- **Polish** — particles (dust, smoke, sparks, splashes), skid marks, screen
  shake, sunset lighting, glowing windows at night.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive, steer a boat |
| E | Steal a car / board a boat, exit |
| F | Punch |
| Mouse + click | Aim and shoot (hold to spray with the SMG) |
| R | Next radio station |
| Esc / P | Pause |
| Enter | Start / continue / retry |

## Play it

Serve the `game/` folder with any static server and open `index.html`:

```sh
node serve.ts
# then open http://localhost:8080
```

Screenshot scenes are staged deterministically with `?shot=chase|drive|mission|start`
(`&seed=7` fixes the city). No network requests, no build step, no dependencies.

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and the game loop
- `game/src/` — one job per file: `config`, `utils`, `input`, `world`, `player`,
  `vehicles`, `boats`, `traffic`, `pedestrians`, `police`, `combat`, `missions`,
  `hud`, `audio`, `save`, `render`, `shots`
- `screenshots/` — 4 real renders of the game: chase (cover), drive, mission, city
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/`,
  writes `dossier.json` via the vendored kit library)

## License

MIT — see `LICENSE`. All names, characters, vehicles, music and art are original.
