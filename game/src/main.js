// Porto Sol 2 — boot and the one loop. The game state object G is built here and
// handed to every system; the loop reads input, advances the world in fixed
// 1/60 s steps, and paints. Screens: title, play, pause, game over, win.
//
// ?shot=chase|drive|mission|start stages a deterministic scene instead of the
// title screen, runs it forward a fixed number of steps, freezes it, and sets
// window.__shotReady for a screenshot.
import { WORLD } from './config.js';
import { createRandom, clamp, dist, angleTo } from './utils.js';
import { ACT_CONFIRM, ACT_ENTER, ACT_PAUSE, ACT_PUNCH, ACT_RADIO, createInput } from './input.js';
import { buildCity } from './world.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { drawHUD } from './hud.js';
import { createPlayer, nearestBoat, nearestCar, updatePlayer } from './player.js';
import { spawnFleet, updateDriving } from './vehicles.js';
import { spawnBoats, updateBoating } from './boats.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { starsFromHeat, updatePolice } from './police.js';
import { playerShoot, spawnPickups, updateCombat } from './combat.js';
import { missionWaypoint, startMission, updateMissions } from './missions.js';
import { applySave, autosave, hasSave, loadGame, saveGame } from './save.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

const G = {
  time: 0, clock: 17.4, cash: 200, health: 100, armor: 0,
  heat: 0, wanted: 0, lastCrimeAt: -100,
  screen: 'title', win: false,
  mission: null, missionIndex: 0, missionDelay: 0, missionsDone: [],
  player: null, city: null, rng: null,
  cars: [], boats: [], traffic: [], peds: [], cops: [], copCars: [],
  heli: null, roadblock: false,
  enemies: [], bullets: [], pickups: [], particles: [], skids: [],
  cam: { x: 1600, y: 1200, zoom: 0.8 },
  msgs: [], banner: '', bannerT: 0,
  shake: 0, shotsFiredRecently: 0, punchSwing: null,
  waypoint: null, nearestStealable: null, targetCar: null,
  stats: { carsStolen: 0, missionsDone: 0, shotsFired: 0 },
  hasSave: hasSave(),
  audio, input,
};

G.say = (text) => {
  G.msgs.push({ text, t: G.time });
  if (G.msgs.length > 5) G.msgs.shift();
};

G.addHeat = (amount, reason) => {
  G.heat = Math.min(200, G.heat + amount);
  G.lastCrimeAt = G.time;
  G.wanted = starsFromHeat(G.heat);
  if (reason) G.stats.lastCrime = reason;
};

G.hurtPlayer = (dmg, cause) => {
  const p = G.player;
  if (p.invuln > 0 || G.screen !== 'play') return;
  let remaining = dmg;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, remaining * 0.6);
    p.armor -= absorbed;
    remaining -= absorbed;
  }
  p.health -= remaining;
  p.invuln = 0.5;
  G.shake = Math.max(G.shake, 0.3);
  G.spawnSparks(p.x, p.y, 6);
  if (p.health <= 0) {
    p.health = 0;
    G.health = 0;
    G.screen = 'over';
    audio.fail();
    audio.engine(0, false);
    audio.siren(false, 0);
    G.say('Busted — ' + cause + '.');
  }
};

G.killTarget = (t) => {
  const remove = (arr) => {
    const i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
  };
  if (t.kind === 'cop') remove(G.cops);
  else remove(G.enemies);
  G.spawnSparks(t.x, t.y, 12);
  G.cash += 25;
  if (G.mission) {
    const step = G.mission.def.steps[G.mission.stepIdx];
    if (step && step.kind === 'defeat' && t.kind !== 'cop') G.mission.kills += 1;
  }
  if (t.kind === 'cop') G.addHeat(30, 'took down a cop');
  else G.addHeat(10, 'took down a rival');
};

function burst(x, y, n, color, speed, size, life) {
  for (let i = 0; i < n; i += 1) {
    const a = G.rng() * Math.PI * 2;
    const s = speed * (0.4 + G.rng() * 0.6);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + G.rng() * 0.4), max: life,
      size: size * (0.7 + G.rng() * 0.6), color, kind: 'spark',
    });
  }
  if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
}
G.spawnSparks = (x, y, n) => burst(x, y, n, '#ffd76a', 160, 3, 0.5);
G.spawnSmoke = (x, y, n) => burst(x, y, n, '#8a8a8a', 40, 7, 1.1);
G.spawnSplash = (x, y, n) => burst(x, y, n, '#bfe8ff', 120, 4, 0.6);
G.spawnMuzzle = (x, y) => burst(x, y, 3, '#fff2b0', 90, 3, 0.18);

G.reset = (newSeed) => {
  G.rng = createRandom(newSeed);
  G.city = buildCity(G.rng);
  G.time = 0;
  G.clock = 17.4;
  G.cash = 200;
  G.health = 100;
  G.armor = 0;
  G.heat = 0;
  G.wanted = 0;
  G.lastCrimeAt = -100;
  G.win = false;
  G.mission = null;
  G.missionIndex = 0;
  G.missionDelay = 0;
  G.missionsDone = [];
  G.cars = [];
  G.boats = [];
  G.traffic = [];
  G.peds = [];
  G.cops = [];
  G.copCars = [];
  G.heli = null;
  G.enemies = [];
  G.bullets = [];
  G.pickups = [];
  G.particles = [];
  G.skids = [];
  G.msgs = [];
  G.banner = '';
  G.bannerT = 0;
  G.shake = 0;
  G.shotsFiredRecently = 0;
  G.punchSwing = null;
  G.waypoint = null;
  G.nearestStealable = null;
  G.targetCar = null;
  G.stats = { carsStolen: 0, missionsDone: 0, shotsFired: 0 };
  G.player = createPlayer(1000, 1000);
  G.cam.x = 1000;
  G.cam.y = 1000;
  G.cam.zoom = 1.0;
  spawnFleet(G);
  spawnBoats(G);
  spawnTraffic(G, 24);
  spawnPedestrians(G, 40);
  spawnPickups(G);
};

function startNewGame() {
  G.reset(seed);
  G.screen = 'play';
  startMission(G, 0);
  status.textContent = 'Playing Porto Sol 2. Mission 1: First Delivery.';
}

function continueGame() {
  const data = loadGame();
  G.reset(seed);
  if (data) applySave(G, data);
  G.screen = 'play';
  G.missionDelay = 0.5;
  status.textContent = 'Continued. Mission ' + (G.missionIndex + 1) + ' of 7.';
}

function retryMission() {
  const idx = Math.min(G.missionIndex, 6);
  G.reset(seed);
  G.cash = Math.max(200, G.cash);
  G.missionIndex = idx;
  G.screen = 'play';
  startMission(G, idx);
  status.textContent = 'Retrying mission ' + (idx + 1) + '.';
}

function step(dt) {
  G.time += dt;
  G.clock = (G.clock + dt * 0.02) % 24;
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.6);
  if (G.shotsFiredRecently > 0) G.shotsFiredRecently -= dt;
  if (G.punchSwing) {
    G.punchSwing.t -= dt;
    if (G.punchSwing.t <= 0) G.punchSwing = null;
  }
  G.msgs = G.msgs.filter((m) => G.time - m.t < 6);
  G.health = G.player.health;
  G.armor = G.player.armor;

  const actions = input.takeActions();
  if (actions & ACT_RADIO) {
    const name = audio.nextStation();
    G.say('Radio: ' + name);
  }

  if (G.screen === 'title') {
    if (actions & ACT_CONFIRM) startNewGame();
    else if (actions & ACT_ENTER) startNewGame();
    return;
  }
  if (G.screen === 'pause') {
    if (actions & ACT_PAUSE || actions & ACT_CONFIRM) {
      G.screen = 'play';
      status.textContent = 'Playing.';
    }
    return;
  }
  if (G.screen === 'over') {
    if (actions & ACT_CONFIRM || actions & ACT_ENTER) retryMission();
    return;
  }
  if (G.screen === 'win') {
    if (actions & ACT_CONFIRM || actions & ACT_ENTER) {
      G.screen = 'play';
      G.missionIndex = 7;
      G.mission = null;
      status.textContent = 'Free roam — Porto Sol is yours.';
    }
    return;
  }

  // Play screen.
  if (actions & ACT_PAUSE) {
    G.screen = 'pause';
    audio.engine(0, false);
    status.textContent = 'Paused.';
    return;
  }

  updatePlayer(G, dt, input, actions);
  if (G.player.car) updateDriving(G, dt, input);
  if (G.player.boat) updateBoating(G, dt, input);

  // Shooting: click to aim at the mouse; hold to spray with the SMG.
  const mouse = input.mouse();
  const clicked = input.takeClick();
  const p = G.player;
  if (p.onFoot && p.weapon !== 'fist' && (clicked || (mouse.down && p.weapon === 'smg'))) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (mouse.x * scaleX - canvas.width / 2) / G.cam.zoom + G.cam.x;
    const my = (mouse.y * scaleY - canvas.height / 2) / G.cam.zoom + G.cam.y;
    const aim = angleTo(p.x, p.y, mx, my);
    p.angle = aim;
    playerShoot(G, aim);
    G.stats.shotsFired += 1;
  }

  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updateMissions(G, dt);

  // Waypoint + nearest stealable, for the HUD and the minimap.
  G.waypoint = missionWaypoint(G);
  const car = nearestCar(G, 56);
  const boat = nearestBoat(G, 60);
  G.nearestStealable = car || boat || null;

  // Particles drift and fade; skid marks age out.
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const s of G.skids) s.t -= dt;
  G.skids = G.skids.filter((s) => s.t > 0);

  // Camera: smooth follow, zoomed out while driving.
  const targetZoom = p.car || p.boat ? 0.8 : 1.0;
  G.cam.zoom += (targetZoom - G.cam.zoom) * Math.min(1, dt * 2);
  G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 4);
  G.cam.y += (p.y - G.cam.y) * Math.min(1, dt * 4);

  // Sound: music, sirens, engine idle on foot is silent.
  audio.musicTick(dt);
  audio.siren(G.wanted > 0, G.time);
  if (!p.car && !p.boat) audio.engine(0, false);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  if (shotMode) {
    if (shotStepsLeft > 0) {
      input.setHeld('up', shotHoldW);
      let n = 0;
      while (n < 4 && shotStepsLeft > 0) {
        step(STEP);
        shotStepsLeft -= 1;
        n += 1;
      }
      input.setHeld('up', false);
    }
    renderer.draw(G);
    if (G.screen === 'play') drawHUD(renderer.ctx, G, canvas.width, canvas.height);
    if (!window.__shotReady && shotStepsLeft <= 0) {
      painted += 1;
      if (painted >= 2) window.__shotReady = true;
    }
    return;
  }
  let acc = dtMs;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  renderer.draw(G);
  if (G.screen === 'play') {
    drawHUD(renderer.ctx, G, canvas.width, canvas.height);
  }
}

let last = performance.now();
let shotMode = false;
let shotStepsLeft = 0;
let shotHoldW = false;
let painted = 0;

// Dev hooks for play-testing (warp, mission skip, state read). Not part of play.
window.__porto = {
  get G() { return G; },
  warp(x, y) {
    const p = G.player;
    if (p.car) { p.car.x = x; p.car.y = y; }
    else if (p.boat) { p.boat.x = x; p.boat.y = y; }
    p.x = x; p.y = y;
    G.cam.x = x; G.cam.y = y;
  },
  startMission(i) { startMission(G, i); },
  setWanted(n) { G.heat = [0, 25, 55, 90, 130, 175][n] || 0; G.lastCrimeAt = G.time; },
  newGame() { startNewGame(); },
  save() { return saveGame(G); },
};

G.reset(seed);

if (shotName) {
  shotMode = true;
  const staged = stageShot(shotName, G);
  shotStepsLeft = staged.steps * 4;
  shotHoldW = staged.holdW;
  status.textContent = 'Shot scene: ' + shotName;
} else {
  status.textContent = 'Porto Sol 2. Press Enter to start.';
  // Title screen shows the living city behind it.
  G.screen = 'title';
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyC' && G.screen === 'title' && G.hasSave) continueGame();
  if (event.code === 'KeyS' && G.screen === 'pause') {
    saveGame(G);
    G.say('Game saved.');
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') G.screen = 'pause';
});

requestAnimationFrame(frame);
