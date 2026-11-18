// Porto Sol 2 — the renderer: the camera, the city, every actor, particles,
// skid marks, and the day/sunset/night light. Plus the title, pause, game-over
// and win screens (the HUD itself lives in hud.js).
import { BEACH, CANAL, DISTRICTS, MARINA, ROADS_X, ROADS_Y, ROAD_HALF, SEA, WORLD } from './config.js';
import { clamp } from './utils.js';

function drawCarShape(ctx, x, y, angle, w, h, color, opts) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Soft shadow under the car.
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 6);
  ctx.fill();
  // Cabin + windshield.
  ctx.fillStyle = 'rgba(20,30,44,0.85)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.18, -h / 2 + 3, w * 0.36, h - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.fillRect(w * 0.18, -h / 2 + 4, 4, h - 8);
  // Headlights.
  ctx.fillStyle = '#fff6b0';
  ctx.fillRect(w / 2 - 2, -h / 2 + 2, 3, 5);
  ctx.fillRect(w / 2 - 2, h / 2 - 7, 3, 5);
  if (opts && opts.siren) {
    const phase = Math.floor(opts.siren) % 2 === 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#3b82ff';
    ctx.fillRect(-6, -h / 2 - 2, 12, 4);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, opts) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  // Body, head, and the direction they face.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.roundRect(-8, -7, 16, 14, 5);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(9, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2118';
  ctx.beginPath();
  ctx.arc(7, 0, 6, Math.PI * 0.6, Math.PI * 1.4);
  ctx.fill();
  if (opts && opts.weapon) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(20, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3, -12, 0, -22);
  ctx.stroke();
  ctx.strokeStyle = '#3f9e4d';
  ctx.lineWidth = 3;
  const sway = Math.sin(t * 0.8 + x * 0.01) * 0.12;
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(Math.cos(a) * 12, -22 + Math.sin(a) * 12, Math.cos(a) * 20, -22 + Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  /** 0 = noon, 1 = deep night; the clock drives the tint. */
  function darkness(clock) {
    if (clock >= 7 && clock < 16.5) return 0;
    if (clock >= 16.5 && clock < 19.5) return (clock - 16.5) / 3 * 0.45;
    if (clock >= 19.5 || clock < 5.5) return 0.55;
    return Math.max(0, 0.55 - (clock - 5.5) / 1.5 * 0.55);
  }

  function drawWorld(G) {
    const cam = G.cam;
    const cw = canvas.width;
    const ch = canvas.height;
    const zoom = cam.zoom;
    ctx.save();
    // Screen shake: a few pixels of jitter while it lasts.
    const shx = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 22 : 0;
    const shy = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 22 : 0;
    ctx.translate(cw / 2 + shx, ch / 2 + shy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    const vx0 = cam.x - cw / 2 / zoom - 60;
    const vy0 = cam.y - ch / 2 / zoom - 60;
    const vx1 = cam.x + cw / 2 / zoom + 60;
    const vy1 = cam.y + ch / 2 / zoom + 60;
    const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

    // Ground: grass, then sand, then sea.
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    ctx.fillStyle = '#d8c08a';
    ctx.fillRect(BEACH.x, 0, BEACH.w, WORLD.h);
    ctx.fillStyle = '#1d6f9e';
    ctx.fillRect(SEA.x, 0, SEA.w, WORLD.h);
    ctx.fillStyle = '#2a86b8';
    ctx.fillRect(CANAL.x, CANAL.y, CANAL.w, CANAL.h);
    ctx.fillStyle = '#2a86b8';
    ctx.fillRect(MARINA.x, MARINA.y, MARINA.w, MARINA.h);
    // Sea shimmer.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let y = 120; y < WORLD.h; y += 240) {
      const off = Math.sin(G.time * 0.7 + y) * 14;
      ctx.beginPath();
      ctx.moveTo(SEA.x + 40 + off, y);
      ctx.lineTo(SEA.x + 160 + off, y);
      ctx.stroke();
    }

    // Parks.
    for (const park of G.city.parks) {
      ctx.fillStyle = '#4a7a3a';
      ctx.fillRect(park.x, park.y, park.w, park.h);
      ctx.fillStyle = '#3a6a34';
      ctx.beginPath();
      ctx.arc(park.x + park.w / 2, park.y + park.h / 2, Math.min(park.w, park.h) * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Roads: asphalt, centre dashes, sidewalks.
    ctx.fillStyle = '#3a3f4a';
    for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.h);
    for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_HALF, WORLD.w, ROAD_HALF * 2);
    ctx.fillStyle = '#c8c0b0';
    for (const rx of ROADS_X) {
      ctx.fillRect(rx - ROAD_HALF - 10, 0, 10, WORLD.h);
      ctx.fillRect(rx + ROAD_HALF, 0, 10, WORLD.h);
    }
    for (const ry of ROADS_Y) {
      ctx.fillRect(0, ry - ROAD_HALF - 10, WORLD.w, 10);
      ctx.fillRect(0, ry + ROAD_HALF, WORLD.w, 10);
    }
    ctx.strokeStyle = '#e8d44d';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    for (const rx of ROADS_X) {
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD.h); ctx.stroke();
    }
    for (const ry of ROADS_Y) {
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD.w, ry); ctx.stroke();
    }
    ctx.setLineDash([]);

    // District name paint on the ground, big and faint.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      if (vis(d.x + d.w / 2, d.y + d.h / 2, 0)) ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    }

    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.55)';
    ctx.lineWidth = 5;
    for (const s of G.skids) {
      if (!vis(s.x, s.y, 40)) continue;
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
      ctx.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
      ctx.stroke();
    }

    // Buildings with a drop shadow and a lit roof.
    for (const b of G.city.buildings) {
      if (!vis(b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 6);
      }
      // Windows glow after dark.
      if (darkness(G.clock) > 0.25) {
        ctx.fillStyle = '#ffd76a';
        for (let i = 0; i < b.windows; i += 1) {
          const wx = b.x + 10 + (i % 4) * ((b.w - 20) / 4);
          const wy = b.y + 10 + Math.floor(i / 4) * 14;
          if (wx < b.x + b.w - 12 && wy < b.y + b.h - 10) ctx.fillRect(wx, wy, 7, 6);
        }
      }
    }

    // Street signs.
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const s of G.city.signs) {
      if (!vis(s.x, s.y, 60)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(s.x - 52, s.y - 14, 104, 22);
      ctx.fillStyle = '#ff9ecf';
      ctx.fillText(s.text, s.x, s.y + 2);
    }

    // Street lamps (they glow at night).
    const night = darkness(G.clock) > 0.25;
    for (const l of G.city.lamps) {
      if (!vis(l.x, l.y, 40)) continue;
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
      if (night) {
        ctx.fillStyle = 'rgba(255,220,120,0.25)';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a0';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Palms.
    for (const palm of G.city.palms) {
      if (vis(palm.x, palm.y, 40)) drawPalm(ctx, palm.x, palm.y, palm.s, G.time);
    }

    // Pickups: bobbing icons with a ring.
    for (const pk of G.pickups) {
      if (!vis(pk.x, pk.y, 40)) continue;
      const bob = Math.sin(pk.bob) * 3;
      const colors = { health: '#4fd17a', armor: '#5aa9e6', pistol: '#ffd700', smg: '#ff9ecf', cash: '#7ac74f' };
      const labels = { health: '+', armor: 'A', pistol: 'P', smg: 'S', cash: '$' };
      ctx.strokeStyle = colors[pk.kind];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = colors[pk.kind];
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[pk.kind], pk.x, pk.y + bob + 5);
    }

    // Waypoint marker on the ground.
    const wp = G.waypoint;
    if (wp) {
      const pulse = 1 + Math.sin(G.time * 5) * 0.15;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 34 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,215,0,0.18)';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 34 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y - 52);
      ctx.lineTo(wp.x - 9, wp.y - 34);
      ctx.lineTo(wp.x + 9, wp.y - 34);
      ctx.closePath();
      ctx.fill();
    }

    // Boats.
    for (const boat of G.boats) {
      if (!vis(boat.x, boat.y, 60)) continue;
      drawCarShape(ctx, boat.x, boat.y, boat.angle, boat.w, boat.h, boat.color);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(boat.label, boat.x, boat.y - 20);
    }

    // Parked stealable cars.
    for (const car of G.cars) {
      if (car.driver === 'player' || !vis(car.x, car.y, 60)) continue;
      drawCarShape(ctx, car.x, car.y, car.angle, car.w, car.h, car.color);
      if (car.missionTarget) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(car.x, car.y, 32 + Math.sin(G.time * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Traffic.
    for (const t of G.traffic) {
      if (vis(t.x, t.y, 60)) drawCarShape(ctx, t.x, t.y, t.angle, t.w, t.h, t.color);
    }

    // Rival race car.
    if (G.mission && G.mission.rival) {
      const r = G.mission.rival;
      drawCarShape(ctx, r.x, r.y, r.angle, r.w, r.h, r.color);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KIKO', r.x, r.y - 22);
    }

    // Cop cars with flashing light bars.
    for (const c of G.copCars) {
      if (vis(c.x, c.y, 60)) drawCarShape(ctx, c.x, c.y, c.angle, c.w, c.h, c.color, { siren: c.siren });
    }

    // Pedestrians, foot cops, rivals.
    for (const ped of G.peds) {
      if (vis(ped.x, ped.y, 40)) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt);
    }
    for (const cop of G.cops) {
      if (vis(cop.x, cop.y, 40)) drawPerson(ctx, cop.x, cop.y, cop.angle, '#1c2733', { weapon: true });
    }
    for (const e of G.enemies) {
      if (!vis(e.x, e.y, 40)) continue;
      drawPerson(ctx, e.x, e.y, e.angle, e.color, { weapon: true });
      // Health bar over rivals.
      const maxHp = e.boss ? 220 : 70;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 16, e.y - 24, 32, 5);
      ctx.fillStyle = e.boss ? '#ff3b30' : '#b06ae6';
      ctx.fillRect(e.x - 16, e.y - 24, 32 * clamp(e.hp / maxHp, 0, 1), 5);
      if (e.boss) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KIKO', e.x, e.y - 30);
      }
    }

    // The player: on foot, in a car, or in a boat.
    const p = G.player;
    if (p.car) drawCarShape(ctx, p.car.x, p.car.y, p.car.angle, p.car.w, p.car.h, p.car.color);
    else if (p.boat) drawCarShape(ctx, p.boat.x, p.boat.y, p.boat.angle, p.boat.w, p.boat.h, p.boat.color);
    else if (p.invuln <= 0 || Math.floor(G.time * 12) % 2 === 0) {
      drawPerson(ctx, p.x, p.y, p.angle, '#ff5d5d', { weapon: p.weapon !== 'fist' });
    }

    // Bullets as bright streaks.
    ctx.strokeStyle = '#ffe9a0';
    ctx.lineWidth = 3;
    for (const b of G.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Punch swing arc.
    if (G.punchSwing && G.punchSwing.t > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(G.punchSwing.x, G.punchSwing.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Particles: dust, smoke, sparks, splashes, wakes.
    for (const pt of G.particles) {
      const a = clamp(pt.life / pt.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * a + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Helicopter spotlight on the ground.
    if (G.heli) {
      ctx.fillStyle = 'rgba(255,255,200,0.10)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,200,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(G.heli.x, G.heli.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    ctx.restore();

    // Helicopter body (screen space, above the world, with rotor blur).
    if (G.heli) {
      const hx = cw / 2 + (G.heli.x - cam.x) * zoom;
      const hy = ch / 2 + (G.heli.y - cam.y) * zoom;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(3, 4, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22303f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(-4, -3, 8, 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 3;
      const rot = G.time * 22;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rot) * -34, Math.sin(rot) * -6);
      ctx.lineTo(Math.cos(rot) * 34, Math.sin(rot) * 6);
      ctx.stroke();
      ctx.restore();
    }

    // Day / sunset / night tint over everything.
    const dark = darkness(G.clock);
    if (dark > 0.02) {
      const sunset = G.clock >= 16.5 && G.clock < 19.5;
      ctx.fillStyle = sunset ? `rgba(255,110,60,${dark * 0.55})` : `rgba(10,16,48,${dark})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    // Warm sunset wash at the bottom of the screen.
    if (G.clock >= 16.5 && G.clock < 19.5) {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, 'rgba(255,150,80,0)');
      grad.addColorStop(1, 'rgba(255,120,60,0.14)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  function overlay(title, lines, hint, accent) {
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.fillStyle = 'rgba(8,10,20,0.72)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || '#ffd700';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(title, cw / 2, ch / 2 - 110);
    ctx.fillStyle = '#fff';
    ctx.font = '17px system-ui, sans-serif';
    let y = ch / 2 - 60;
    for (const line of lines) {
      ctx.fillText(line, cw / 2, y);
      y += 28;
    }
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(hint, cw / 2, y + 26);
  }

  return {
    resize,
    ctx,
    draw(G) {
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      if (G.screen === 'title') {
        // The city at sunset behind the title.
        drawWorld(G);
        overlay('PORTO SOL 2', [
          'A sun-soaked open-world crime story.',
          'Rico came back to Porto Sol with nothing but a name.',
          'Seven missions stand between him and the crown.',
          '',
          'WASD move / drive  •  E steal car or boat  •  F punch',
          'Mouse aim + click shoot  •  R radio  •  Esc pause',
        ], G.hasSave ? 'Press ENTER — New Game  •  Press C — Continue' : 'Press ENTER to start', '#ffd700');
        return;
      }
      drawWorld(G);
      if (G.screen === 'play') {
        // HUD is drawn by the caller (hud.js) after this.
        return;
      }
      if (G.screen === 'pause') {
        overlay('PAUSED', [
          'Rico is waiting in ' + G.city.districtAt(G.player.x, G.player.y) + '.',
          'Cash ' + G.cash + '  •  Missions done: ' + G.missionsDone.length + ' of 7',
          'Radio: ' + G.audio.stationName,
        ], 'Esc — resume   •   S — save game', '#fff');
      } else if (G.screen === 'over') {
        overlay('BUSTED', [
          'Rico got caught in ' + G.city.districtAt(G.player.x, G.player.y) + '.',
          'The city keeps the cash. The story doesn\'t have to end here.',
        ], 'Press ENTER to retry from the last mission', '#ff5d5d');
      } else if (G.screen === 'win') {
        overlay('KING OF PORTO SOL', [
          'Seven missions. One crown. Rico owns these streets now.',
          'Final cash: $' + Math.floor(G.cash) + '  •  Cars stolen: ' + G.stats.carsStolen,
          'Thanks for playing Porto Sol 2.',
        ], 'Press ENTER to keep exploring the city', '#ffd700');
      }
    },
  };
}
