// Porto Sol 2 — save and load. One manual slot plus an autosave written after
// every finished mission, both in localStorage (this browser only).
import { AUTOSAVE_KEY, SAVE_KEY } from './config.js';

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function write(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** The small, safe slice of state a save carries. */
export function snapshot(G) {
  return {
    v: 1,
    savedAt: Date.now(),
    cash: Math.floor(G.cash),
    health: Math.floor(G.health),
    armor: Math.floor(G.armor),
    missionIndex: G.missionIndex,
    missionsDone: G.missionsDone.slice(),
    player: { x: G.player.x, y: G.player.y },
    weapon: G.player.weapon,
    ammo: G.player.ammo,
    clock: G.clock,
    stats: { ...G.stats },
  };
}

export function saveGame(G) {
  return write(SAVE_KEY, snapshot(G));
}

export function autosave(G) {
  return write(AUTOSAVE_KEY, snapshot(G));
}

export function loadGame() {
  return read(SAVE_KEY) || read(AUTOSAVE_KEY);
}

export function hasSave() {
  return read(SAVE_KEY) !== null || read(AUTOSAVE_KEY) !== null;
}

export function applySave(G, data) {
  if (!data) return false;
  G.cash = data.cash ?? 200;
  G.health = data.health ?? 100;
  G.armor = data.armor ?? 0;
  G.player.health = G.health;
  G.player.armor = G.armor;
  G.missionIndex = data.missionIndex ?? 0;
  G.missionsDone = Array.isArray(data.missionsDone) ? data.missionsDone.slice() : [];
  if (data.player) {
    G.player.x = data.player.x;
    G.player.y = data.player.y;
  }
  G.player.weapon = data.weapon || 'fist';
  G.player.ammo = data.ammo ?? 0;
  G.clock = data.clock ?? 17.4;
  if (data.stats) Object.assign(G.stats, data.stats);
  return true;
}

export function clearSaves() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch { /* storage may be off */ }
}
