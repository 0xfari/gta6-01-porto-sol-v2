// Porto Sol 2 — the HUD: health and armor bars, cash, wanted stars, the clock,
// the radio station, the active objective, messages, and the minimap (city,
// waypoint, police, cars, player).
import { DISTRICTS, ROADS_X, ROADS_Y, WORLD } from './config.js';
import { cashText, clockText, dist } from './utils.js';
import { missionObjective, missionWaypoint } from './missions.js';

const MAP_W = 208;
const MAP_H = 156;

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawMinimap(ctx, G, x, y) {
  const sx = MAP_W / WORLD.w;
  const sy = MAP_H / WORLD.h;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,24,0.78)';
  ctx.fillRect(x, y, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, MAP_W, MAP_H);
  ctx.beginPath();
  ctx.rect(x, y, MAP_W, MAP_H);
  ctx.clip();

  // Sea and beach on the east edge.
  ctx.fillStyle = '#1d5f8a';
  ctx.fillRect(x + 2880 * sx, y, 320 * sx, MAP_H);
  ctx.fillStyle = '#d8c08a';
  ctx.fillRect(x + 2760 * sx, y, 120 * sx, MAP_H);

  // Roads.
  ctx.strokeStyle = 'rgba(220,220,220,0.75)';
  ctx.lineWidth = 2;
  for (const rx of ROADS_X) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + MAP_H);
    ctx.stroke();
  }
  for (const ry of ROADS_Y) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + MAP_W, y + ry * sy);
    ctx.stroke();
  }

  // District tint blocks, faint.
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (const d of DISTRICTS) ctx.fillRect(x + d.x * sx, y + d.y * sy, d.w * sx, d.h * sy);

  const dot = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * sx, y + wy * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Waypoint: a pulsing gold ring.
  const wp = missionWaypoint(G);
  if (wp) {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + wp.x * sx, y + wp.y * sy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    dot(wp.x, wp.y, '#ffd700', 3);
  }

  // Cop cars red, foot cops pink, rivals purple, traffic grey, boats cyan.
  for (const c of G.copCars) dot(c.x, c.y, '#ff3b30', 3);
  for (const c of G.cops) dot(c.x, c.y, '#ff7ab8', 2.5);
  for (const e of G.enemies) dot(e.x, e.y, '#b06ae6', 3);
  for (const t of G.traffic) dot(t.x, t.y, '#9aa5b1', 2);
  for (const b of G.boats) dot(b.x, b.y, '#4fd1c5', 2.5);
  if (G.heli) dot(G.heli.x, G.heli.y, '#ff3b30', 4);

  // The player: a white arrow that turns with them.
  const px = x + G.player.x * sx;
  const py = y + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // North + district label under the map.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', x + 4, y + 13);
  ctx.restore();
}

export function drawHUD(ctx, G, W, H) {
  const p = G.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: health, armor, cash, wanted.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, 12, 250, 96);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('RICO', 22, 30);
  bar(ctx, 22, 38, 180, 10, p.health / 100, p.health > 30 ? '#4fd17a' : '#ff3b30');
  bar(ctx, 22, 52, 180, 8, p.armor / 100, '#5aa9e6');
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(cashText(G.cash), 22, 82);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(p.weapon === 'fist' ? 'Fists' : p.weapon.toUpperCase() + '  •  ' + p.ammo + ' ammo', 120, 82);

  // Wanted stars, top centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px system-ui, sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < G.wanted ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W / 2 - 52 + i * 26, 40);
  }
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const district = G.city.districtAt(p.x, p.y);
  ctx.fillText(district + '  •  ' + clockText(G.clock), W / 2, 58);

  // Minimap, top-right, with the district name under it.
  drawMinimap(ctx, G, W - MAP_W - 12, 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(district, W - 12, 12 + MAP_H + 15);

  // Objective bar, bottom-left.
  const objective = missionObjective(G);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const ow = Math.min(560, 40 + objective.length * 7.2);
  ctx.fillRect(12, H - 64, ow, 52);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(G.mission ? G.mission.def.title.toUpperCase() : 'PORTO SOL', 22, H - 44);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('▸ ' + objective, 22, H - 24);

  // Speed + radio, bottom-right (speed only while driving).
  ctx.textAlign = 'right';
  if (p.car) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.36) + ' km/h', W - 22, H - 44);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(p.car.label, W - 22, H - 24);
  } else if (p.boat) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(Math.round(Math.abs(p.boat.speed) * 0.36) + ' kn', W - 22, H - 44);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(p.boat.label, W - 22, H - 24);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('On foot — press E near a car to steal it', W - 22, H - 24);
  }
  ctx.fillStyle = '#ff9ecf';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('♪ ' + G.audio.stationName + '  [R]', W - 22, H - 66);

  // Message feed, centre-top under the stars.
  ctx.textAlign = 'center';
  ctx.font = '13px system-ui, sans-serif';
  let my = 78;
  for (const msg of G.msgs.slice(-3)) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const mw = ctx.measureText(msg.text).width + 20;
    ctx.fillRect(W / 2 - mw / 2, my - 14, mw, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(msg.text, W / 2, my);
    my += 24;
  }

  // Big centre banner (mission title / complete / failed).
  if (G.bannerT > 0 && G.banner) {
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const bw = ctx.measureText(G.banner).width + 40;
    ctx.fillRect(W / 2 - bw / 2, H / 2 - 110, bw, 52);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(G.banner, W / 2, H / 2 - 73);
  }

  // "Press E" prompt when a stealable car or boat is close.
  if (p.onFoot) {
    const near = G.nearestStealable;
    if (near) {
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('[E] Steal ' + near.label, W / 2, H - 84);
    }
  }
}
