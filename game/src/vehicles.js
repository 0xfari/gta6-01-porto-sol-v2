// Porto Sol 2 — drivable cars: the parked fleet the player can steal, and the
// driving physics (accelerate, brake, reverse, steer by speed). Traffic AI cars
// live separately in traffic.js.
import { ROADS_X, ROADS_Y, VEHICLE_KINDS, WORLD } from './config.js';
import { clamp, dist, pick, randRange, turnToward } from './utils.js';

let nextCarId = 1;

export function makeCar(kind, x, y, angle) {
  const spec = VEHICLE_KINDS[kind];
  return {
    id: nextCarId += 1,
    kind, label: spec.label, color: spec.color,
    w: spec.w, h: spec.h,
    x, y, angle, speed: 0,
    driver: null, // null = parked & stealable, 'player' = driven by the player
    missionTarget: false,
    skid: 0,
  };
}

/** Scatter the stealable fleet along roads and in the marina lot. */
export function spawnFleet(G) {
  const kinds = Object.keys(VEHICLE_KINDS);
  const spots = [];
  for (const rx of ROADS_X) {
    for (const ry of ROADS_Y) {
      if (G.rng() < 0.5) spots.push({ x: rx + 46, y: ry + 12, angle: 0 });
      if (G.rng() < 0.5) spots.push({ x: rx - 46, y: ry - 12, angle: Math.PI });
    }
  }
  // Shuffle the spots so the fleet is spread all over the city.
  for (let i = spots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(G.rng() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const count = Math.min(26, spots.length);
  for (let i = 0; i < count; i += 1) {
    const s = spots[i];
    const car = makeCar(pick(G.rng, kinds), s.x, s.y, s.angle);
    G.cars.push(car);
  }
  // A gold sport car waits by Neon Row — mission 2's target.
  const gold = makeCar('sport', 1780, 260, 0);
  gold.color = '#ffd700';
  gold.missionTarget = true;
  G.cars.push(gold);
  G.targetCar = gold;
}

function hitBuilding(G, x, y, r) {
  for (const b of G.city.buildings) {
    const nx = clamp(x, b.x, b.x + b.w);
    const ny = clamp(y, b.y, b.y + b.h);
    if (dist(x, y, nx, ny) < r) return true;
  }
  return false;
}

/** Drive the player's car one step. Returns true when it crashed into something. */
export function updateDriving(G, dt, input) {
  const p = G.player;
  const car = p.car;
  if (!car) return false;
  const spec = VEHICLE_KINDS[car.kind];
  const axes = input.axes();
  const forward = axes.y < 0; // W / Up = throttle
  const back = axes.y > 0;    // S / Down = brake, then reverse
  const steer = axes.x;

  if (forward) car.speed += spec.accel * dt;
  else if (back) {
    if (car.speed > 8) car.speed -= 620 * dt;
    else car.speed -= 200 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 180 * dt;
    if (Math.abs(car.speed) < 6) car.speed = 0;
  }
  car.speed = clamp(car.speed, -140, spec.top);

  const turn = steer * 2.4 * dt * clamp(Math.abs(car.speed) / 120, 0, 1);
  car.angle += car.speed >= 0 ? turn : -turn;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;

  let crashed = false;
  // A crash counts once per scrape, not once per frame while grinding a wall:
  // without the cooldown, one long slide would max out the wanted level.
  const canCrash = G.time - (car.lastCrashAt || -10) > 0.8;
  if (hitBuilding(G, nx, ny, 20) || G.city.onWater(nx, ny)) {
    car.speed *= -0.25;
    crashed = true;
    if (canCrash) {
      car.lastCrashAt = G.time;
      G.audio.crash();
      G.spawnSmoke(car.x, car.y, 5);
      G.addHeat(4, 'crashed into a building');
    }
  } else {
    car.x = clamp(nx, 24, WORLD.w - 24);
    car.y = clamp(ny, 24, WORLD.h - 24);
    // Bump into traffic cars and cop cars.
    for (const other of [...G.traffic, ...G.copCars]) {
      if (dist(car.x, car.y, other.x, other.y) < 34 && Math.abs(car.speed) > 60) {
        other.speed = Math.max(0, other.speed - 60);
        car.speed *= 0.55;
        crashed = true;
        if (canCrash) {
          car.lastCrashAt = G.time;
          G.audio.crash();
          G.addHeat(12, 'crashed into traffic');
          G.spawnSparks(car.x, car.y, 8);
        }
        break;
      }
    }
  }

  // Skid marks when turning hard at speed.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 240) {
    car.skid += dt;
    if (car.skid > 0.09) {
      car.skid = 0;
      G.skids.push({ x: car.x, y: car.y, angle: car.angle, t: 4 });
      if (G.skids.length > 220) G.skids.shift();
    }
  }

  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  G.audio.engine(Math.abs(car.speed) / spec.top, true);
  return crashed;
}
