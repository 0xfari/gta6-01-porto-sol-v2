// Porto Sol 2 — tuning and world data. Every number the game balances on lives
// here so a single file answers "how fast, how big, how much".
export const WORLD = { w: 3200, h: 2400 };

export const VIEW = { w: 1280, h: 720 };

export const PLAYER = {
  walkSpeed: 235,
  radius: 14,
  punchRange: 46,
  punchDamage: 34,
  punchCooldown: 0.38,
  maxHealth: 100,
  maxArmor: 100,
};

export const CAR = {
  accel: 340,
  brake: 620,
  reverseAccel: 200,
  maxSpeed: 430,
  turnRate: 2.6,
  radius: 20,
};

// Five drivable kinds. Top speed and handling differ so stealing feels like a choice.
export const VEHICLE_KINDS = {
  sedan:  { label: 'Solano Sedan',   top: 380, accel: 320, color: '#c94f4f', w: 46, h: 22 },
  sport:  { label: 'Vela GT',       top: 520, accel: 430, color: '#f2b705', w: 48, h: 21 },
  taxi:   { label: 'Sol Cab',       top: 360, accel: 300, color: '#f2d13d', w: 46, h: 22 },
  truck:  { label: 'Cargo Mule',    top: 300, accel: 240, color: '#5b7fa6', w: 58, h: 26 },
  van:    { label: 'Marina Van',    top: 340, accel: 280, color: '#7fb069', w: 52, h: 24 },
};

export const BOAT_KINDS = {
  skiff:  { label: 'Bay Skiff',   top: 300, accel: 260, color: '#e8e3d3', w: 54, h: 22 },
  speed:  { label: 'Coral Runner', top: 460, accel: 380, color: '#ff5d8f', w: 56, h: 22 },
};

// Eight named districts, laid out as rectangles the minimap and HUD can name.
export const DISTRICTS = [
  { name: 'Old Harbor',    x: 0,    y: 0,    w: 800,  h: 800,  tint: '#8a6d4b' },
  { name: 'Downtown Sol',  x: 800,  y: 0,    w: 800,  h: 800,  tint: '#4b6a8a' },
  { name: 'Neon Row',      x: 1600, y: 0,    w: 800,  h: 800,  tint: '#a04b8a' },
  { name: 'Coral Beach',   x: 2400, y: 0,    w: 800,  h: 800,  tint: '#c9a86a' },
  { name: 'Market Square', x: 0,    y: 800,  w: 800,  h: 800,  tint: '#6a8a4b' },
  { name: 'Palm Court',    x: 800,  y: 800,  w: 800,  h: 800,  tint: '#4b8a6a' },
  { name: 'Sunset Hills',  x: 1600, y: 800,  w: 800,  h: 800,  tint: '#8a4b4b' },
  { name: 'Marina Bay',    x: 2400, y: 800,  w: 800,  h: 1600, tint: '#4b7a8a' },
];

// The sea hugs the east edge; a canal cuts west from it so boats reach the marina.
export const SEA = { x: 2880, y: 0, w: 320, h: 2400 };
export const BEACH = { x: 2760, y: 0, w: 120, h: 2400 };
export const CANAL = { x: 1500, y: 1870, w: 1380, h: 70 };
export const MARINA = { x: 2620, y: 1800, w: 260, h: 210 };

export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];
export const ROAD_HALF = 34;

export const WANTED = {
  stealHeat: 34,
  crashHeat: 12,
  shootHeat: 26,
  killHeat: 30,
  decayPerSec: 2.2,
  quietSeconds: 14,
  starAt: [0, 25, 55, 90, 130, 175],
};

export const RADIO = [
  { name: 'SOL FM — Sunset Chill', bpm: 92,  root: 220.0, mode: [0, 3, 5, 7, 10] },
  { name: 'NEON 88 — Synthwave',   bpm: 116, root: 164.81, mode: [0, 2, 3, 7, 8] },
  { name: 'MARINA — Latin Heat',   bpm: 104, root: 196.0, mode: [0, 2, 4, 7, 9] },
];

export const SAVE_KEY = 'porto-sol-2-save-v1';
export const AUTOSAVE_KEY = 'porto-sol-2-auto-v1';

export const MISSION_REWARDS = [150, 250, 300, 400, 500, 600, 1000];
