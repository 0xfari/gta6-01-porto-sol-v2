// Porto Sol 2 — boats: the marina fleet, boarding, and open-sea driving. Boats
// only move on water (sea, canal, marina); the shore stops them like a wall.
import { BOAT_KINDS, CANAL, MARINA, SEA } from './config.js';
import { clamp, dist, pick } from './utils.js';

let nextBoatId = 1;

export function makeBoat(kind, x, y, angle) {
  const spec = BOAT_KINDS[kind];
  return {
    id: nextBoatId += 1,
    kind, label: spec.label, color: spec.color,
    w: spec.w, h: spec.h,
    x, y, angle, speed: 0,
    driver: null,
    wake: 0,
  };
}

/** Four boats: two at the marina, one on the canal, one out at sea. */
export function spawnBoats(G) {
  const spots = [
    { kind: 'skiff', x: MARINA.x + 50, y: MARINA.y + 60, angle: Math.PI / 2 },
    { kind: 'speed', x: MARINA.x + 130, y: MARINA.y + 60, angle: Math.PI / 2 },
    { kind: 'skiff', x: 2100, y: CANAL.y + 35, angle: 0 },
    { kind: 'speed', x: SEA.x + 160, y: 900, angle: Math.PI / 2 },
  ];
  for (const s of spots) G.boats.push(makeBoat(s.kind, s.x, s.y, s.angle));
  G.boats[1].missionBoat = true; // the Coral Runner carries mission 6's cargo
}

/** Drive the player's boat one step; the shore stops it dead. */
export function updateBoating(G, dt, input) {
  const p = G.player;
  const boat = p.boat;
  if (!boat) return;
  const spec = BOAT_KINDS[boat.kind];
  const axes = input.axes();
  if (axes.y < 0) boat.speed += spec.accel * dt;
  else if (axes.y > 0) boat.speed -= 260 * dt;
  else {
    boat.speed -= Math.sign(boat.speed) * 90 * dt;
    if (Math.abs(boat.speed) < 5) boat.speed = 0;
  }
  boat.speed = clamp(boat.speed, -90, spec.top);
  boat.angle += axes.x * 1.7 * dt * clamp(Math.abs(boat.speed) / 100, 0, 1);

  const nx = boat.x + Math.cos(boat.angle) * boat.speed * dt;
  const ny = boat.y + Math.sin(boat.angle) * boat.speed * dt;
  if (G.city.onWater(nx, ny)) {
    boat.x = nx;
    boat.y = ny;
  } else {
    boat.speed *= -0.2;
    G.spawnSplash(boat.x, boat.y, 6);
  }
  boat.x = clamp(boat.x, SEA.x - 1300, SEA.x + SEA.w - 20);
  boat.y = clamp(boat.y, 20, 2380);

  // A white wake trails a fast boat.
  boat.wake += dt;
  if (Math.abs(boat.speed) > 140 && boat.wake > 0.08) {
    boat.wake = 0;
    G.particles.push({
      x: boat.x - Math.cos(boat.angle) * 28, y: boat.y - Math.sin(boat.angle) * 28,
      vx: 0, vy: 0, life: 0.7, max: 0.7, size: 7, color: '#ffffff', kind: 'wake',
    });
  }
  p.x = boat.x;
  p.y = boat.y;
  p.angle = boat.angle;
}
