// Porto Sol 2 — pedestrians: 40 walkers who stroll the sidewalks, cross at
// intersections, and run away from gunfire, crashes and speeding cars.
import { ROADS_X, ROADS_Y } from './config.js';
import { clamp, dist, pick, randRange } from './utils.js';

const SHIRTS = ['#e8e8e8', '#f2a541', '#5aa9e6', '#e65a7a', '#7ac74f', '#b06ae6', '#e6d35a', '#4fd1c5'];

export function spawnPedestrians(G, count) {
  for (let i = 0; i < count; i += 1) {
    const rx = pick(G.rng, ROADS_X);
    const ry = pick(G.rng, ROADS_Y);
    G.peds.push({
      x: clamp(rx + randRange(G.rng, -260, 260), 60, 2740),
      y: clamp(ry + randRange(G.rng, -260, 260), 60, 2340),
      angle: randRange(G.rng, 0, Math.PI * 2),
      speed: randRange(G.rng, 34, 62),
      shirt: pick(G.rng, SHIRTS),
      flee: 0,
      panic: 0,
      wander: randRange(G.rng, 2, 6),
    });
  }
}

/** Something scary happened at (x, y): everyone nearby starts running. */
export function scarePeds(G, x, y, radius) {
  for (const p of G.peds) {
    if (dist(p.x, p.y, x, y) < radius) {
      p.flee = 2.5;
      p.panic = 1;
    }
  }
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    ped.wander -= dt;
    if (ped.flee > 0) ped.flee -= dt;

    // Flee the player when they are speeding in a car or shooting.
    const nearPlayer = dist(ped.x, ped.y, p.x, p.y);
    const playerDanger = (!p.onFoot && p.car && Math.abs(p.car.speed) > 180) || G.shotsFiredRecently > 0;
    if (nearPlayer < 130 && playerDanger) ped.flee = 1.5;

    let speed = ped.speed;
    let angle = ped.angle;
    if (ped.flee > 0) {
      speed = 150;
      angle = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle = angle;
    } else if (ped.wander <= 0) {
      ped.wander = randRange(G.rng, 2, 6);
      // Walk along a sidewalk: pick a nearby road and walk parallel to it.
      const rx = ROADS_X.reduce((a, b) => Math.abs(b - ped.x) < Math.abs(a - ped.x) ? b : a);
      const ry = ROADS_Y.reduce((a, b) => Math.abs(b - ped.y) < Math.abs(a - ped.y) ? b : a);
      if (Math.abs(ped.x - rx) < Math.abs(ped.y - ry)) angle = G.rng() < 0.5 ? 0 : Math.PI;
      else angle = G.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      ped.angle = angle;
    }

    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    const fixed = G.city.pushOutOfBuildings(nx, ny, 10);
    if (G.city.onWater(fixed.x, fixed.y)) {
      ped.angle += Math.PI / 2;
      continue;
    }
    ped.x = clamp(fixed.x, 40, 2740);
    ped.y = clamp(fixed.y, 40, 2360);
  }
}
