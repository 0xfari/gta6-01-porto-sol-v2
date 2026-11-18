// Porto Sol 2 — the law: wanted heat turns into stars, stars turn into patrol
// cars, foot cops, roadblocks and (at 3+ stars) a police helicopter. Stars fade
// when the player stays quiet and out of sight.
import { WANTED } from './config.js';
import { clamp, dist, randRange, turnToward } from './utils.js';

export function starsFromHeat(heat) {
  let stars = 0;
  for (let i = 1; i <= 5; i += 1) if (heat >= WANTED.starAt[i]) stars = i;
  return stars;
}

function spawnCopCar(G) {
  const p = G.player;
  // Appear on a road a little way off, so they drive in instead of popping up.
  const angle = G.rng() * Math.PI * 2;
  const x = clamp(p.x + Math.cos(angle) * 620, 120, 2680);
  const y = clamp(p.y + Math.sin(angle) * 620, 120, 2280);
  const car = {
    x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0,
    cruise: 330, color: '#1c2733', w: 46, h: 22,
    siren: G.rng() * Math.PI * 2,
  };
  G.copCars.push(car);
  return car;
}

function spawnFootCop(G) {
  const p = G.player;
  const angle = G.rng() * Math.PI * 2;
  const x = clamp(p.x + Math.cos(angle) * 320, 60, 2740);
  const y = clamp(p.y + Math.sin(angle) * 320, 60, 2340);
  const cop = { x, y, angle: 0, hp: 60, speed: 150, kind: 'cop', baton: 0 };
  G.cops.push(cop);
  return cop;
}

export function updatePolice(G, dt) {
  const p = G.player;

  // Quiet time lets the heat cool off — but never while a cop can see the player.
  const copNear = G.copCars.some((c) => dist(c.x, c.y, p.x, p.y) < 320) ||
    G.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 260);
  if (G.time - G.lastCrimeAt > WANTED.quietSeconds && !copNear && G.heat > 0) {
    G.heat = Math.max(0, G.heat - WANTED.decayPerSec * dt);
  }
  const stars = starsFromHeat(G.heat);
  if (stars !== G.wanted) {
    G.wanted = stars;
    if (stars > 0) G.say(stars >= 3 ? 'WANTED — the whole city is looking for you.' : 'The police are onto you. Lay low.');
    if (stars === 0) G.say('You lost them. The heat is off… for now.');
  }

  // Keep the right number of patrol cars on the road.
  const wantCars = Math.min(4, G.wanted);
  while (G.copCars.length < wantCars) spawnCopCar(G);
  while (G.copCars.length > wantCars) G.copCars.pop();

  // Foot cops join the hunt from 2 stars up.
  const wantCops = G.wanted >= 2 ? Math.min(4, G.wanted) : 0;
  while (G.cops.length < wantCops) spawnFootCop(G);
  while (G.cops.length > wantCops) G.cops.pop();

  // Patrol cars chase: steer at the player, faster than traffic, sirens on.
  for (const car of G.copCars) {
    const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
    car.angle = turnToward(car.angle, targetAngle, 2.2 * dt);
    const d = dist(car.x, car.y, p.x, p.y);
    const wantSpeed = d > 60 ? car.cruise + G.wanted * 22 : 0;
    car.speed += clamp(wantSpeed - car.speed, -420 * dt, 300 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = G.city.pushOutOfBuildings(nx, ny, 18);
    if (!G.city.onWater(fixed.x, fixed.y)) { car.x = fixed.x; car.y = fixed.y; }
    else { car.speed *= 0.4; car.angle += 1.2 * dt; }
    car.siren += dt * 6;
    // Ram the player: a hard hit hurts and shakes the screen.
    if (d < 40 && Math.abs(car.speed) > 60) {
      G.hurtPlayer(8, 'rammed by a patrol car');
      car.speed *= -0.3;
      G.shake = Math.max(G.shake, 0.35);
    }
  }

  // Foot cops run the player down and swing their batons up close.
  for (const cop of G.cops) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    if (d > 26) {
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
      const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
      const fixed = G.city.pushOutOfBuildings(nx, ny, 12);
      if (!G.city.onWater(fixed.x, fixed.y)) { cop.x = fixed.x; cop.y = fixed.y; }
    } else if (cop.baton <= 0) {
      cop.baton = 0.9;
      G.hurtPlayer(10, 'beaten by a cop');
    }
    if (cop.baton > 0) cop.baton -= dt;
  }

  // The helicopter joins at 3 stars: it circles overhead, spotlight on the player.
  if (G.wanted >= 3) {
    if (!G.heli) G.heli = { angle: 0, r: 170, x: p.x, y: p.y - 170, spot: 0 };
    G.heli.angle += dt * 0.55;
    G.heli.x = p.x + Math.cos(G.heli.angle) * G.heli.r;
    G.heli.y = p.y + Math.sin(G.heli.angle) * G.heli.r - 40;
    G.heli.spot = (G.heli.spot + dt) % 1;
  } else {
    G.heli = null;
  }

  // Roadblocks at 4+ stars: two patrol cars park across the road ahead of the player.
  G.roadblock = G.wanted >= 4;
}
