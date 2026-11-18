// Porto Sol 2 — combat: pistol and SMG bullets, rival gang members who chase and
// shoot, punches from the player module, and the pickups scattered around town
// (health, armor, weapons, cash).
import { dist, pick, randRange } from './utils.js';

export const WEAPONS = {
  fist:   { label: 'Fists',   damage: 34, rate: 0.38, auto: false, spread: 0 },
  pistol: { label: 'Pistol',  damage: 34, rate: 0.32, auto: false, spread: 0.05, speed: 760 },
  smg:    { label: 'SMG',     damage: 20, rate: 0.11, auto: true,  spread: 0.12, speed: 820 },
};

export function spawnEnemy(G, x, y, opts) {
  const e = {
    x, y, angle: 0,
    hp: opts?.hp ?? 70,
    speed: randRange(G.rng, 110, 145),
    kind: opts?.boss ? 'boss' : 'rival',
    shootCd: randRange(G.rng, 0.4, 1.2),
    boss: !!opts?.boss,
    color: opts?.boss ? '#8a1f3d' : '#3d1f5a',
  };
  G.enemies.push(e);
  return e;
}

/** Twelve pickups: health, armor, a pistol, an SMG, and cash stashes. */
export function spawnPickups(G) {
  const spots = [
    [400, 400, 'health'], [1200, 300, 'armor'], [2000, 500, 'pistol'],
    [900, 1200, 'health'], [1700, 1100, 'cash'], [2400, 1300, 'armor'],
    [500, 2000, 'smg'], [1300, 1900, 'health'], [2100, 1600, 'cash'],
    [2600, 500, 'health'], [300, 900, 'cash'], [1900, 2100, 'armor'],
  ];
  for (const [x, y, kind] of spots) G.pickups.push({ x, y, kind, bob: G.rng() * Math.PI * 2 });
}

function fireBullet(G, x, y, angle, from, damage, speed) {
  G.bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.1, from, damage,
  });
}

export function playerShoot(G, angle) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  if (!w || !w.speed) return;
  if (p.shootCd > 0) return;
  if (p.ammo <= 0) {
    G.say('Out of ammo — find a pickup or use your fists.');
    p.shootCd = 0.4;
    return;
  }
  p.shootCd = w.rate;
  p.ammo -= 1;
  const a = angle + (G.rng() - 0.5) * w.spread * 2;
  fireBullet(G, p.x + Math.cos(angle) * 22, p.y + Math.sin(angle) * 22, a, 'player', w.damage, w.speed);
  G.audio.gunshot();
  G.addHeat(6, 'fired a gun');
  G.shotsFiredRecently = 1.2;
  G.spawnMuzzle(p.x + Math.cos(angle) * 24, p.y + Math.sin(angle) * 24);
}

export function updateCombat(G, dt) {
  const p = G.player;

  // Bullets fly, hit buildings, and hit whoever they were not fired by.
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    let dead = false;
    for (const wall of G.city.buildings) {
      if (b.x > wall.x && b.x < wall.x + wall.w && b.y > wall.y && b.y < wall.y + wall.h) { dead = true; break; }
    }
    if (dead) { b.life = 0; G.spawnSparks(b.x, b.y, 4); continue; }
    if (b.from === 'player') {
      for (const e of [...G.enemies, ...G.cops]) {
        if (dist(b.x, b.y, e.x, e.y) < 18) {
          e.hp -= b.damage;
          b.life = 0;
          G.spawnSparks(b.x, b.y, 5);
          if (e.hp <= 0) G.killTarget(e);
          break;
        }
      }
    } else if (dist(b.x, b.y, p.x, p.y) < 16 && p.invuln <= 0) {
      G.hurtPlayer(b.damage, 'shot');
      b.life = 0;
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);

  // Rivals chase the player and shoot when they have a line on them.
  for (const e of G.enemies) {
    const d = dist(e.x, e.y, p.x, p.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 200) {
      const nx = e.x + Math.cos(e.angle) * e.speed * dt;
      const ny = e.y + Math.sin(e.angle) * e.speed * dt;
      const fixed = G.city.pushOutOfBuildings(nx, ny, 12);
      if (!G.city.onWater(fixed.x, fixed.y)) { e.x = fixed.x; e.y = fixed.y; }
    } else if (d > 60) {
      const nx = e.x + Math.cos(e.angle) * e.speed * 0.5 * dt;
      const ny = e.y + Math.sin(e.angle) * e.speed * 0.5 * dt;
      const fixed = G.city.pushOutOfBuildings(nx, ny, 12);
      if (!G.city.onWater(fixed.x, fixed.y)) { e.x = fixed.x; e.y = fixed.y; }
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 420 && d > 40) {
      e.shootCd = e.boss ? 0.7 : 1.3;
      const a = e.angle + (G.rng() - 0.5) * 0.16;
      fireBullet(G, e.x + Math.cos(e.angle) * 20, e.y + Math.sin(e.angle) * 20, a, 'enemy', e.boss ? 14 : 9, 560);
      G.audio.gunshot();
    }
    // A rival right on top of the player swings instead.
    if (d < 30 && e.shootCd <= -0.6) {
      e.shootCd = 0.4;
      G.hurtPlayer(12, 'beaten by a rival');
    }
  }

  // Pickups: walk over one to take it.
  for (const pk of G.pickups) {
    pk.bob += dt * 2;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'health') { p.health = Math.min(100, p.health + 50); G.say('Health +50.'); }
      else if (pk.kind === 'armor') { p.armor = Math.min(100, p.armor + 50); G.say('Armor +50.'); }
      else if (pk.kind === 'pistol') { p.weapon = 'pistol'; p.ammo += 24; G.say('Pistol picked up — click to shoot.'); }
      else if (pk.kind === 'smg') { p.weapon = 'smg'; p.ammo += 60; G.say('SMG picked up — hold click to spray.'); }
      else if (pk.kind === 'cash') { G.cash += 75; G.say('Found a cash stash: +$75.'); }
      G.audio.pickup();
      G.spawnSparks(pk.x, pk.y, 8);
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
}
