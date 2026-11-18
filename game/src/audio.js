// Porto Sol 2 — every sound is synthesized with WebAudio: engine hum, sirens,
// gunshots, pickups, and three looping radio stations. No audio files anywhere.
import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicGain = null;
  let station = 0;
  let beat = 0;
  let nextNoteTime = 0;
  let enabled = false;

  /** Must be called from a user gesture at least once; browsers block sound before that. */
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || !enabled) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch { /* sound is decoration; never break the game */ }
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ctx || !enabled) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
    } catch { /* sound is decoration */ }
  }

  function playNote(freq, dur, type) {
    if (!ctx || !enabled) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(musicGain);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration */ }
  }

  return {
    ensure,
    get ready() { return enabled; },
    get stationName() { return RADIO[station].name; },
    get stationIndex() { return station; },
    nextStation() {
      station = (station + 1) % RADIO.length;
      beat = 0;
      return RADIO[station].name;
    },
    setStation(i) { station = i % RADIO.length; beat = 0; },

    /** Continuous engine note: pitch and loudness follow speed (0..1). */
    engine(speed01, on) {
      if (!ctx || !enabled) return;
      try {
        engineOsc.frequency.setTargetAtTime(50 + speed01 * 140, ctx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, ctx.currentTime, 0.1);
      } catch { /* ignore */ }
    },

    /** Two-tone siren that wails while any wanted stars are up. */
    siren(on, t) {
      if (!ctx || !enabled) return;
      try {
        sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.15);
        if (on) sirenOsc.frequency.value = Math.sin(t * 3.2) > 0 ? 820 : 620;
      } catch { /* ignore */ }
    },

    /** One music step per beat: bass on the root, a pentatonic pluck above it. */
    musicTick(dt) {
      if (!ctx || !enabled) return;
      const st = RADIO[station];
      const beatLen = 60 / st.bpm;
      nextNoteTime -= dt;
      if (nextNoteTime > 0) return;
      nextNoteTime += beatLen;
      beat += 1;
      const scale = st.mode;
      const octave = beat % 8 === 0 ? 2 : 1;
      const degree = scale[beat % scale.length];
      const freq = st.root * Math.pow(2, degree / 12) * octave;
      playNote(freq, beatLen * 0.9, beat % 4 === 0 ? 'square' : 'triangle');
      if (beat % 2 === 0) playNote(st.root / 2, beatLen, 'sine');
      if (beat % 4 === 2) noiseBurst(0.05, 0.08, 6000); // hat tick
    },

    gunshot() { noiseBurst(0.14, 0.5, 2600); blip(160, 0.1, 'square', 0.25, 60); },
    punch() { noiseBurst(0.08, 0.3, 900); },
    pickup() { blip(660, 0.12, 'sine', 0.3); blip(990, 0.18, 'sine', 0.25); },
    cash() { blip(880, 0.1, 'triangle', 0.3); blip(1174, 0.22, 'triangle', 0.3); },
    crash() { noiseBurst(0.25, 0.45, 700); },
    missionDone() {
      blip(523, 0.14, 'triangle', 0.35);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.35), 130);
      setTimeout(() => blip(784, 0.28, 'triangle', 0.35), 260);
    },
    fail() { blip(220, 0.4, 'sawtooth', 0.25, 110); },
    click() { blip(1200, 0.05, 'square', 0.15); },
  };
}
