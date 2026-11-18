// Porto Sol 2 — the player on foot: walking, stealing a car or a boat, getting
// out again, and throwing a punch. Driving itself lives in vehicles.js / boats.js.
import { ACT_ENTER, ACT_PUNCH } from './input.js';
import { PLAYER, WANTED } from './config.js';
import { dist } from './utils.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    onFoot: true, car: null, boat: null,
    health: PLAYER.maxHealth, armor: 0,
    weapon: 'fist', ammo: 0,
    punchCd: 0, shootCd: 0, invuln: 0,
    moving: false,
  };
}

/** Nearest drivable car within reach, or null. A car you just stepped out of
 *  stays locked for a moment, so one more E does not instantly re-steal it
 *  when a boat (or another car) is what you meant to take. */
export function nearestCar(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.driver) continue;
    if ((car.cooldownUntil || 0) > G.time) continue;
    const d = dist(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function nearestBoat(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const boat of G.boats) {
    if (boat.driver) continue;
    if ((boat.cooldownUntil || 0) > G.time) continue;
    const d = dist(G.player.x, G.player.y, boat.x, boat.y);
    if (d < bestD) { bestD = d; best = boat; }
  }
  return best;
}

function stealCar(G, car) {
  const p = G.player;
  p.car = car;
  p.onFoot = false;
  p.boat = null;
  car.driver = 'player';
  G.stats.carsStolen += 1;
  G.audio.engine(0, true);
  if (car.missionTarget) {
    G.say('This is the one — get it to the garage, fast.');
  } else {
    G.say('Borrowed. The owner will want it back.');
  }
  G.addHeat(WANTED.stealHeat, 'stole a car');
}

function boardBoat(G, boat) {
  const p = G.player;
  p.boat = boat;
  p.onFoot = false;
  p.car = null;
  boat.driver = 'player';
  G.say('Cast off — the sea is yours.');
}

function stepOut(G) {
  const p = G.player;
  if (p.car) {
    const car = p.car;
    car.driver = null;
    car.speed = 0;
    car.cooldownUntil = G.time + 1.5;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.car = null;
    p.onFoot = true;
    G.audio.engine(0, false);
  } else if (p.boat) {
    const boat = p.boat;
    boat.driver = null;
    boat.speed = 0;
    boat.cooldownUntil = G.time + 1.5;
    // Step onto the nearest dry land: the marina dock or the beach.
    p.x = Math.min(boat.x, 2740);
    p.y = boat.y;
    if (G.city.onWater(p.x, p.y)) { p.x = 2740; p.y = boat.y; }
    p.boat = null;
    p.onFoot = true;
  }
  const fixed = G.city.pushOutOfBuildings(p.x, p.y, PLAYER.radius);
  p.x = fixed.x;
  p.y = fixed.y;
}

export function updatePlayer(G, dt, input, actions) {
  const p = G.player;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  if (p.invuln > 0) p.invuln -= dt;

  if (!p.onFoot) {
    if (actions & ACT_ENTER) stepOut(G);
    return;
  }

  const axes = input.axes();
  p.moving = axes.x !== 0 || axes.y !== 0;
  if (p.moving) {
    const len = Math.hypot(axes.x, axes.y) || 1;
    const nx = p.x + (axes.x / len) * PLAYER.walkSpeed * dt;
    const ny = p.y + (axes.y / len) * PLAYER.walkSpeed * dt;
    p.angle = Math.atan2(axes.y, axes.x);
    // Slide along walls: try the full move, then each axis alone.
    let fixed = G.city.pushOutOfBuildings(nx, ny, PLAYER.radius);
    if (G.city.onWater(fixed.x, fixed.y)) {
      const tryX = G.city.pushOutOfBuildings(nx, p.y, PLAYER.radius);
      const tryY = G.city.pushOutOfBuildings(p.x, ny, PLAYER.radius);
      if (!G.city.onWater(tryX.x, tryX.y)) fixed = tryX;
      else if (!G.city.onWater(tryY.x, tryY.y)) fixed = tryY;
      else fixed = { x: p.x, y: p.y };
    }
    const clamped = G.city.clampToLand(fixed.x, fixed.y, PLAYER.radius);
    p.x = clamped.x;
    p.y = clamped.y;
  }

  if (actions & ACT_ENTER) {
    const car = nearestCar(G, 56);
    if (car) { stealCar(G, car); return; }
    const boat = nearestBoat(G, 60);
    if (boat) { boardBoat(G, boat); return; }
  }

  if ((actions & ACT_PUNCH) && p.punchCd <= 0) {
    p.punchCd = PLAYER.punchCooldown;
    G.audio.punch();
    G.punchSwing = { x: p.x + Math.cos(p.angle) * 30, y: p.y + Math.sin(p.angle) * 30, t: 0.18 };
    // A punch lands on the nearest enemy or cop in front of the player.
    const targets = [...G.enemies, ...G.cops];
    for (const t of targets) {
      if (dist(p.x, p.y, t.x, t.y) < PLAYER.punchRange + 14) {
        t.hp -= PLAYER.punchDamage;
        G.spawnSparks(t.x, t.y, 6);
        if (t.hp <= 0) G.killTarget(t);
        break;
      }
    }
  }
}
