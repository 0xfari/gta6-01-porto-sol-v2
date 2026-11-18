// Porto Sol 2 — the screenshot scenes behind ?shot=chase|drive|mission|start.
// Each one stages a real game state (real cars, real cops, a real mission) and
// lets the normal loop run it forward a fixed number of steps, so the frame is
// what a short game really looks like — and the same seed always gives the
// same frame. main.js freezes the scene after the staging steps.
import { startMission } from './missions.js';
import { makeCar } from './vehicles.js';
import { makeBoat } from './boats.js';

function giveCar(G, kind, x, y, angle, speed) {
  const car = makeCar(kind, x, y, angle);
  car.driver = 'player';
  car.speed = speed;
  G.cars.push(car);
  G.player.car = car;
  G.player.onFoot = false;
  G.player.x = x;
  G.player.y = y;
  G.player.angle = angle;
  return car;
}

export function stageShot(name, G) {
  G.reset(7); // same seed, same city, same traffic every time
  G.clock = 17.6; // golden-hour sunset for every shot

  if (name === 'start') {
    G.screen = 'title';
    G.cam.x = 1600;
    G.cam.y = 1200;
    G.cam.zoom = 0.55;
    return { steps: 0, holdW: false };
  }

  G.screen = 'play';
  G.audio.ensureSilent = true;

  if (name === 'drive') {
    startMission(G, 0);
    giveCar(G, 'sedan', 620, 1000, 0, 220);
    G.cam.zoom = 0.9;
    return { steps: 50, holdW: true };
  }

  if (name === 'mission') {
    startMission(G, 3);
    const p = G.player;
    p.x = 520;
    p.y = 1200;
    p.weapon = 'pistol';
    p.ammo = 24;
    p.angle = 0;
    G.heat = 30;
    G.cam.zoom = 1.0;
    return { steps: 45, holdW: false };
  }

  // chase (and any unknown name): a three-star police chase in a gold Vela,
  // starting mid-city so the car is still on the roads when the frame freezes.
  startMission(G, 2);
  giveCar(G, 'sport', 600, 1400, 0, 300);
  G.player.car.color = '#ffd700';
  G.heat = 95;
  G.lastCrimeAt = G.time;
  G.cam.zoom = 0.85;
  return { steps: 55, holdW: true };
}

/** The four shots the README and shots.json promise, in cover order. */
export const SHOT_NAMES = ['chase', 'drive', 'mission', 'start'];
