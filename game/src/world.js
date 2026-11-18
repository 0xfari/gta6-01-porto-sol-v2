// Porto Sol 2 — the city itself: districts, road grid, building blocks, palms,
// lamps, parks, beach and sea. Generation is seeded, so the same seed builds the
// same streets every run. Collision and "where am I" helpers live here too.
import { BEACH, CANAL, DISTRICTS, MARINA, ROADS_X, ROADS_Y, ROAD_HALF, SEA, WORLD } from './config.js';
import { clamp, pick, randRange } from './utils.js';

const ROOF_COLORS = ['#7a5a6e', '#5a6e7a', '#8a7a5a', '#6e7a5a', '#9a6a5a', '#5a7a8a', '#a08a6a'];
const WALL_COLORS = ['#e8dcc8', '#d8c8b8', '#c8d8e0', '#e0c8d8', '#d0d8c0', '#e8c8b0'];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when the point sits on a road (including the intersection squares). */
export function onRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) <= ROAD_HALF) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) <= ROAD_HALF) return true;
  return false;
}

export function onWater(x, y) {
  if (x >= SEA.x && x <= SEA.x + SEA.w) return true;
  if (x >= CANAL.x && x <= CANAL.x + CANAL.w && y >= CANAL.y && y <= CANAL.y + CANAL.h) return true;
  if (x >= MARINA.x && x <= MARINA.x + MARINA.w && y >= MARINA.y && y <= MARINA.y + MARINA.h) return true;
  return false;
}

export function onSand(x, y) {
  return x >= BEACH.x && x < SEA.x;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Porto Sol';
}

export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const parks = [];
  const signs = [];

  // Buildings fill every block between roads, leaving the road + sidewalk clear.
  for (let bx = 0; bx < ROADS_X.length - 1; bx += 1) {
    for (let by = 0; by < ROADS_Y.length - 1; by += 1) {
      const blockX = ROADS_X[bx] + ROAD_HALF + 14;
      const blockY = ROADS_Y[by] + ROAD_HALF + 14;
      const blockW = ROADS_X[bx + 1] - ROADS_X[bx] - 2 * (ROAD_HALF + 14);
      const blockH = (ROADS_Y[by + 1] - ROADS_Y[by]) - 2 * (ROAD_HALF + 14);
      if (blockX + blockW > SEA.x - 140) continue; // keep the beach strip open
      // One in six blocks is a park instead of buildings.
      if (rng() < 0.17) {
        parks.push({ x: blockX, y: blockY, w: blockW, h: blockH });
        for (let p = 0; p < 5; p += 1) {
          palms.push({ x: randRange(rng, blockX + 20, blockX + blockW - 20), y: randRange(rng, blockY + 20, blockY + blockH - 20), s: randRange(rng, 0.8, 1.3) });
        }
        continue;
      }
      const cols = 2;
      const rows = 2;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if (rng() < 0.12) continue; // an empty lot keeps blocks from looking stamped
          const w = blockW / cols - 18;
          const h = blockH / rows - 18;
          const x = blockX + cx * (blockW / cols) + 9;
          const y = blockY + cy * (blockH / rows) + 9;
          buildings.push({
            x, y, w, h,
            wall: pick(rng, WALL_COLORS),
            roof: pick(rng, ROOF_COLORS),
            tall: rng() < 0.3,
            windows: Math.floor(randRange(rng, 4, 10)),
          });
        }
      }
    }
  }

  // Palms line the beach and the canal; lamps line every road.
  for (let y = 60; y < WORLD.h; y += 130) {
    palms.push({ x: randRange(rng, BEACH.x + 14, BEACH.x + 100), y, s: randRange(rng, 0.9, 1.4) });
  }
  for (let x = 1560; x < CANAL.x + CANAL.w; x += 160) {
    palms.push({ x, y: CANAL.y - 26, s: randRange(rng, 0.8, 1.2) });
    palms.push({ x: x + 80, y: CANAL.y + CANAL.h + 26, s: randRange(rng, 0.8, 1.2) });
  }
  for (const rx of ROADS_X) {
    for (const ry of ROADS_Y) lamps.push({ x: rx + ROAD_HALF + 8, y: ry - ROAD_HALF - 8 });
  }
  signs.push(
    { x: 1000, y: 200, text: 'PORTO SOL' },
    { x: 1800, y: 1000, text: 'NEON ROW' },
    { x: 600, y: 1400, text: 'MARKET SQ' },
    { x: 2600, y: 1900, text: 'MARINA' },
    { x: 2820, y: 600, text: 'CORAL BEACH' },
  );

  const city = { buildings, palms, lamps, parks, signs };

  /** Push a circle out of every building it overlaps; returns corrected {x, y}. */
  function pushOutOfBuildings(x, y, r) {
    for (const b of buildings) {
      const nx = clamp(x, b.x, b.x + b.w);
      const ny = clamp(y, b.y, b.y + b.h);
      const dx = x - nx;
      const dy = y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 === 0) { // centre inside the block: shove out along the shortest side
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bot = b.y + b.h - y;
        const m = Math.min(left, right, top, bot);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      } else {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        y = ny + (dy / d) * r;
      }
    }
    return { x, y };
  }

  /** Clamp a point inside the walkable world (cars may not drive into the sea). */
  function clampToLand(x, y, r) {
    x = clamp(x, r, WORLD.w - r);
    y = clamp(y, r, WORLD.h - r);
    return { x, y };
  }

  return { ...city, onRoad, onWater, onSand, districtAt, pushOutOfBuildings, clampToLand, rectsOverlap };
}
