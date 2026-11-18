// Porto Sol 2 — the story: seven missions that take Rico from street courier to
// king of Porto Sol. Each mission is data (steps) plus one small engine that
// watches the steps complete, pays the reward, and starts the next briefing.
import { MISSION_REWARDS } from './config.js';
import { dist } from './utils.js';
import { spawnEnemy } from './combat.js';
import { autosave } from './save.js';

export const MISSION_DEFS = [
  {
    title: '1 — First Delivery',
    brief: 'Lena needs a package across town. Pick it up at Palm Court, drop it at Sunset Hills. You have 100 seconds — the client pays for speed.',
    speaker: 'Lena',
    line: 'Rico! First job. Don\'t open the package, don\'t stop for anyone.',
    reward: MISSION_REWARDS[0],
    steps: [
      { kind: 'goto', x: 1000, y: 600, r: 60, label: 'Pick up the package — Palm Court' },
      { kind: 'goto', x: 2200, y: 1400, r: 60, label: 'Deliver the package — Sunset Hills', timed: 100 },
    ],
  },
  {
    title: '2 — Hot Wheels',
    brief: 'A gold Vela GT is parked by Neon Row. The buyer pays good money for it — steal it and bring it to the garage in Marina Bay.',
    speaker: 'Lena',
    line: 'Gold Vela, Neon Row. Keys are in it, because rich people are careless.',
    reward: MISSION_REWARDS[1],
    steps: [
      { kind: 'steal', label: 'Steal the gold Vela GT — Neon Row' },
      { kind: 'goto', x: 2400, y: 2050, r: 70, label: 'Deliver the Vela to the garage — Marina Bay', needCar: true },
    ],
  },
  {
    title: '3 — Heat Escape',
    brief: 'The cops made you. Survive the heat for 60 seconds, then slip away to the hideout in Old Harbor.',
    speaker: 'Marco',
    line: 'Three stars, Rico! Lose them or lose everything. Move!',
    reward: MISSION_REWARDS[2],
    steps: [
      { kind: 'survive', seconds: 60, label: 'Survive the police — 60 seconds' },
      { kind: 'goto', x: 600, y: 1800, r: 70, label: 'Reach the hideout — Old Harbor' },
    ],
  },
  {
    title: '4 — Turf War',
    brief: 'Kiko\'s crew is pushing into Market Square. Take down five of them and the square stays yours.',
    speaker: 'Marco',
    line: 'Five of Kiko\'s boys in the square. Show them whose streets these are.',
    reward: MISSION_REWARDS[3],
    steps: [
      { kind: 'defeat', count: 5, x: 400, y: 1200, label: 'Defeat Kiko\'s crew — Market Square (0/5)' },
    ],
  },
  {
    title: '5 — Sunset Race',
    brief: 'Kiko challenged you to a street race at sunset. Four checkpoints across the city — beat him to the line and the streets will talk about it.',
    speaker: 'Kiko',
    line: 'You drive like my grandmother, Rico. Prove me wrong — if you can.',
    reward: MISSION_REWARDS[4],
    steps: [
      { kind: 'race', points: [{ x: 600, y: 600 }, { x: 1800, y: 600 }, { x: 2200, y: 1400 }, { x: 1000, y: 1800 }], label: 'Race Kiko — checkpoint 1 of 4' },
    ],
  },
  {
    title: '6 — Harbor Run',
    brief: 'A cargo crate has to cross the bay — no roads, no cops, just water. Take the Coral Runner from the marina and deliver it to the sea buoy.',
    speaker: 'Lena',
    line: 'The crate is on the Coral Runner. Sea\'s calm tonight. Don\'t sink my boat.',
    reward: MISSION_REWARDS[5],
    steps: [
      { kind: 'goto', x: 2700, y: 1900, r: 70, label: 'Reach the marina — Marina Bay' },
      { kind: 'boat', label: 'Board the Coral Runner' },
      { kind: 'goto', x: 3060, y: 900, r: 80, label: 'Deliver the cargo to the sea buoy', needBoat: true },
    ],
  },
  {
    title: '7 — King of Porto Sol',
    brief: 'Kiko and his whole crew are waiting on Neon Row. End it tonight — all of them, then stand on the rooftop and take the city.',
    speaker: 'Kiko',
    line: 'You want my city, Rico? Come and take it. Bring your best.',
    reward: MISSION_REWARDS[6],
    steps: [
      { kind: 'defeat', count: 7, x: 2000, y: 400, label: 'Defeat Kiko\'s crew — Neon Row (0/7)', boss: true },
      { kind: 'goto', x: 2000, y: 200, r: 60, label: 'Take the rooftop — Neon Row' },
    ],
  },
];

export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  if (!def) return false;
  G.mission = {
    def, index,
    stepIdx: 0,
    timer: 0,
    kills: 0,
    cpIdx: 0,
    spawned: false,
    rival: null,
    failed: false,
  };
  G.missionIndex = index;
  G.say(def.title);
  G.say(def.speaker + ': "' + def.line + '"');
  G.banner = def.title;
  G.bannerT = 3;
  prepareStep(G);
  return true;
}

function prepareStep(G) {
  const m = G.mission;
  const step = m.def.steps[m.stepIdx];
  if (!step) return;
  m.timer = 0;
  m.kills = 0;
  m.cpIdx = 0;
  m.spawned = false;
  if (step.kind === 'survive') {
    G.heat = Math.max(G.heat, 95);
    G.lastCrimeAt = G.time;
    m.timer = step.seconds;
  }
  if (step.kind === 'race') {
    // Kiko's rival car starts beside the player and follows the checkpoints.
    const first = step.points[0];
    m.rival = {
      x: G.player.x + 60, y: G.player.y, angle: 0, speed: 0,
      cpIdx: 0, color: '#7a1f8a', w: 46, h: 21, cruise: 315,
    };
    G.say('Kiko is on your tail. First through all four checkpoints wins.');
  }
}

function completeStep(G) {
  const m = G.mission;
  m.stepIdx += 1;
  G.audio.pickup();
  if (m.stepIdx >= m.def.steps.length) completeMission(G);
  else {
    prepareStep(G);
    G.say('Next: ' + m.def.steps[m.stepIdx].label);
  }
}

function completeMission(G) {
  const m = G.mission;
  G.cash += m.def.reward;
  G.missionsDone.push(m.index);
  G.missionIndex = m.index + 1;
  G.stats.missionsDone += 1;
  G.audio.missionDone();
  G.audio.cash();
  G.say('Mission complete! +$' + m.def.reward);
  G.banner = 'MISSION COMPLETE  +$' + m.def.reward;
  G.bannerT = 3;
  G.mission = null;
  G.missionDelay = 2.5;
  if (m.index >= MISSION_DEFS.length - 1) {
    G.win = true;
    G.screen = 'win';
    G.say('Porto Sol is yours, Rico. King of the streets.');
  }
  autosave(G);
}

export function failMission(G, reason) {
  const m = G.mission;
  if (!m) return;
  G.audio.fail();
  G.say('Mission failed: ' + reason + ' — retrying.');
  G.banner = 'MISSION FAILED';
  G.bannerT = 2.5;
  G.enemies.length = 0;
  G.mission = null;
  G.missionDelay = 2.0;
  G.missionIndex = m.index; // retry the same mission
}

function stepLabel(G) {
  const m = G.mission;
  const step = m.def.steps[m.stepIdx];
  if (step.kind === 'defeat') return step.label.replace(/\(\d+\/\d+\)/, '(' + m.kills + '/' + step.count + ')');
  if (step.kind === 'race') return 'Race Kiko — checkpoint ' + (m.cpIdx + 1) + ' of ' + step.points.length;
  if (step.kind === 'survive') return 'Survive the police — ' + Math.ceil(m.timer) + 's left';
  return step.label;
}

export function missionObjective(G) {
  if (!G.mission) return G.missionIndex >= MISSION_DEFS.length ? 'All missions complete.' : 'Next mission incoming…';
  return stepLabel(G);
}

export function missionWaypoint(G) {
  const m = G.mission;
  if (!m) return null;
  const step = m.def.steps[m.stepIdx];
  if (!step) return null;
  if (step.kind === 'goto' || step.kind === 'boat') return { x: step.x, y: step.y };
  if (step.kind === 'steal') return { x: G.targetCar.x, y: G.targetCar.y };
  if (step.kind === 'defeat') return { x: step.x, y: step.y };
  if (step.kind === 'race') return step.points[m.cpIdx];
  if (step.kind === 'survive') return { x: 600, y: 1800 };
  return null;
}

export function updateMissions(G, dt) {
  // Between missions, a short breather, then the next briefing.
  if (!G.mission && !G.win && G.screen === 'play') {
    if (G.missionDelay > 0) {
      G.missionDelay -= dt;
      if (G.missionDelay <= 0 && G.missionIndex < MISSION_DEFS.length) startMission(G, G.missionIndex);
    }
    return;
  }
  const m = G.mission;
  if (!m) return;
  const step = m.def.steps[m.stepIdx];
  if (!step) return;
  const p = G.player;

  if (step.kind === 'goto') {
    if (step.needCar && !p.car) { /* must arrive driving */ }
    else if (step.needBoat && !p.boat) { /* must arrive by boat */ }
    else if (dist(p.x, p.y, step.x, step.y) < step.r) completeStep(G);
    if (step.timed) {
      m.timer += dt;
      if (m.timer > step.timed) failMission(G, 'too slow — the client walked away');
    }
  } else if (step.kind === 'steal') {
    if (p.car && p.car.missionTarget) completeStep(G);
  } else if (step.kind === 'boat') {
    if (p.boat && p.boat.missionBoat) completeStep(G);
  } else if (step.kind === 'survive') {
    m.timer -= dt;
    G.heat = Math.max(G.heat, 92); // the heat stays on until the clock runs out
    if (m.timer <= 0) completeStep(G);
  } else if (step.kind === 'defeat') {
    if (!m.spawned) {
      m.spawned = true;
      for (let i = 0; i < step.count; i += 1) {
        spawnEnemy(G, step.x + (G.rng() - 0.5) * 260, step.y + (G.rng() - 0.5) * 260, { boss: step.boss && i === step.count - 1, hp: step.boss && i === step.count - 1 ? 220 : 70 });
      }
      G.say(step.count + ' rivals incoming. Watch your health.');
    }
    if (m.kills >= step.count) completeStep(G);
  } else if (step.kind === 'race') {
    const target = step.points[m.cpIdx];
    if (target && dist(p.x, p.y, target.x, target.y) < 80) {
      m.cpIdx += 1;
      G.audio.pickup();
      G.say('Checkpoint ' + m.cpIdx + ' of ' + step.points.length + '!');
      if (m.cpIdx >= step.points.length) { completeStep(G); return; }
    }
    // Kiko drives the same checkpoints at his own pace.
    const r = m.rival;
    if (r) {
      const rt = step.points[r.cpIdx];
      if (rt) {
        const d = dist(r.x, r.y, rt.x, rt.y);
        const wantAngle = Math.atan2(rt.y - r.y, rt.x - r.x);
        let diff = wantAngle - r.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        r.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        r.speed += (r.cruise - r.speed) * dt * 0.8;
        r.x += Math.cos(r.angle) * r.speed * dt;
        r.y += Math.sin(r.angle) * r.speed * dt;
        if (d < 80) {
          r.cpIdx += 1;
          if (r.cpIdx >= step.points.length && m.cpIdx < step.points.length) {
            failMission(G, 'Kiko beat you to the line');
          }
        }
      }
    }
  }
}
