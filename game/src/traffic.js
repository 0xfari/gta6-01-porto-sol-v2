// Porto Sol 2 — traffic: 24 AI cars that follow the road grid, keep their lane,
// slow for the car ahead, and turn at intersections. They never leave the roads.
import { ROADS_X, ROADS_Y, ROAD_HALF } from './config.js';
import { clamp, dist, pick, randRange } from './utils.js';

const TRAFFIC_COLORS = ['#8a94a6', '#b0a89a', '#6a8a7a', '#a66a7a', '#7a6a9a', '#c8b060', '#5a6a7a'];

function nearestRoadAxis(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { axis: 'v', at: rx, dir: y }; }
  }
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { axis: 'h', at: ry, dir: x }; }
  }
  return best;
}

export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i += 1) {
    const rx = pick(G.rng, ROADS_X);
    const ry = pick(G.rng, ROADS_Y);
    const vertical = G.rng() < 0.5;
    const dir = G.rng() < 0.5 ? 1 : -1;
    G.traffic.push({
      x: vertical ? rx + (dir > 0 ? 14 : -14) : randRange(G.rng, 100, 2700),
      y: vertical ? randRange(G.rng, 100, 2300) : ry + (dir > 0 ? 14 : -14),
      angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: randRange(G.rng, 90, 150),
      cruise: randRange(G.rng, 90, 150),
      color: pick(G.rng, TRAFFIC_COLORS),
      vertical,
      dir,
      w: 44, h: 21,
      wait: 0,
    });
  }
}

function carAhead(G, car, look) {
  for (const other of G.traffic) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d > look || d < 1) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    if (ahead > 0 && Math.abs(dx * Math.sin(car.angle) - dy * Math.cos(car.angle)) < 26) return other;
  }
  return null;
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Slow down for the car ahead; never rear-end.
    const ahead = carAhead(G, car, 70);
    const target = ahead ? Math.max(0, ahead.speed - 20) : car.cruise;
    car.speed += clamp(target - car.speed, -260 * dt, 120 * dt);

    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;

    // At an intersection, sometimes turn onto the crossing road.
    const nearX = ROADS_X.find((rx) => Math.abs(nx - rx) < 12);
    const nearY = ROADS_Y.find((ry) => Math.abs(ny - ry) < 12);
    if ((nearX !== undefined || nearY !== undefined) && G.rng() < 0.012) {
      if (car.vertical && nearY !== undefined) {
        car.vertical = false;
        car.dir = G.rng() < 0.5 ? 1 : -1;
        car.angle = car.dir > 0 ? 0 : Math.PI;
        car.y = nearY + (car.dir > 0 ? 14 : -14);
      } else if (!car.vertical && nearX !== undefined) {
        car.vertical = true;
        car.dir = G.rng() < 0.5 ? 1 : -1;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.x = nearX + (car.dir > 0 ? 14 : -14);
      }
    }

    car.x = clamp(nx, 60, 2740);
    car.y = clamp(ny, 60, 2340);
    // Keep on the road: if a turn left the lane, snap back to the nearest road line.
    if (!G.city.onRoad(car.x, car.y)) {
      const axis = nearestRoadAxis(car.x, car.y);
      if (axis.axis === 'v') car.x = axis.at + (car.dir > 0 ? 14 : -14);
      else car.y = axis.at + (car.dir > 0 ? 14 : -14);
    }
  }
}
