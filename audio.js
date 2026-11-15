// ===== Immune Response: chiptune music + sound effects (WebAudio, all original) =====
// Songs are written in eighth notes: a note name ("C5", "F#4"), "." holds the previous note, "-" is a rest.
// Drums: k = kick, s = snare, h = hi-hat. "|" is only a bar marker for reading.
const SND = (() => {
  const SONGS = {
    title: { bpm: 120, loop: true,
      lead: "C5 . E5 G5 C6 . G5 . | A5 . F5 . G5 . E5 . | F5 . D5 . E5 . C5 . | D5 . . . G4 . . . | C5 . E5 G5 C6 . D6 . | E6 . D6 . C6 . A5 . | B5 . G5 . A5 . B5 . | C6 . . . - - - -",
      bass: "C3 . G3 . C3 . G3 . | F2 . C3 . C3 . G3 . | F2 . A2 . C3 . E3 . | G2 . D3 . G2 . B2 . | C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 - - -",
      drum: "k - h - s - h -" },
    area1: { bpm: 128, loop: true,
      lead: "F4 . A4 C5 F5 . E5 D5 | C5 . A4 . C5 . . . | A#4 . D5 F5 A#5 . A5 G5 | F5 . . . E5 . C5 . | D5 . F5 A5 D6 . C6 A#5 | A5 . F5 . A5 . C6 . | A#5 . A5 . G5 . E5 . | F5 . . . F4 - - -",
      bass: "F2 . C3 . F2 . C3 . | F2 . C3 . A2 . C3 . | A#1 . F2 . A#2 . F2 . | C2 . G2 . C3 . G2 . | D2 . A2 . D3 . A2 . | F2 . C3 . F2 . A2 . | C2 . G2 . A#2 . G2 . | F2 . C3 . F2 - - -",
      drum: "k - h - s - h h" },
    area2: { bpm: 112, loop: true,
      lead: "A4 . . C5 E5 . . D5 | C5 . B4 . A4 . . . | G4 . . B4 D5 . . C5 | B4 . A4 . G4 . . . | F4 . A4 . C5 . F5 . | E5 . D5 . C5 . B4 . | A4 . C5 . B4 . G#4 . | A4 . . . - - - -",
      bass: "A2 . E3 . A2 . E3 . | A2 . E3 . A2 . C3 . | G2 . D3 . G2 . D3 . | G2 . D3 . E2 . B2 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . G2 . | E2 . B2 . E2 . G#2 . | A2 . E3 . A2 - - -",
      drum: "k - - - h - - -" },
    area3: { bpm: 124, loop: true,
      lead: "D5 . D5 F5 E5 . D5 . | C#5 . E5 . A4 . . . | D5 . F5 A5 G5 . F5 . | E5 . C#5 . A4 . . . | A#4 . D5 . F5 . A#5 . | A5 . G5 . F5 . E5 . | F5 . E5 . D5 . C#5 . | D5 . . . A4 - - -",
      bass: "D2 . A2 . D2 . A2 . | A1 . E2 . A1 . C#2 . | D2 . A2 . D2 . A2 . | A1 . E2 . A1 . E2 . | A#1 . F2 . A#1 . F2 . | F2 . C3 . F2 . C3 . | A1 . E2 . A1 . C#2 . | D2 . A2 . D2 - - -",
      drum: "k - h k s - h -" },
    battle: { bpm: 160, loop: true,
      lead: "E5 . G5 . B5 . A5 G5 | F#5 . D5 . B4 . . . | E5 . G5 . B5 . D6 . | C6 . B5 . A5 . F#5 . | G5 . E5 . C5 . E5 . | D5 . F#5 . A5 . F#5 . | E5 . D#5 . E5 . F#5 . | G5 . F#5 . D#5 . B4 .",
      bass: "E2 E3 E2 E3 E2 E3 E2 E3 | D2 D3 D2 D3 B1 B2 B1 B2 | E2 E3 E2 E3 E2 E3 E2 E3 | A1 A2 A1 A2 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 C2 C3 C2 C3 | B1 B2 B1 B2 B1 B2 D#2 D#3",
      drum: "k h s h k k s h" },
    boss: { bpm: 168, loop: true,
      lead: "C5 . D#5 . G5 . F#5 G5 | G#5 . G5 . D#5 . . . | C5 . D#5 . G5 . C6 . | B5 . G5 . D5 . . . | G#5 . G5 . F5 . D#5 . | F5 . D#5 . D5 . C5 . | D5 . D#5 . F5 . G5 . | B4 . D5 . F5 . G5 .",
      bass: "C2 C3 C2 C3 C2 C3 C2 C3 | G#1 G#2 G#1 G#2 G#1 G#2 G#1 G#2 | C2 C3 C2 C3 C2 C3 C2 C3 | G1 G2 G1 G2 G1 G2 G1 G2 | F1 F2 F1 F2 F1 F2 F1 F2 | G#1 G#2 G#1 G#2 G#1 G#2 G#1 G#2 | G1 G2 G1 G2 G1 G2 G1 G2 | G1 G2 G1 G2 B1 B2 B1 B2",
      drum: "k h s k k h s s" },
    victory: { bpm: 150, loop: false,
      lead: "C5 E5 G5 C6 . . G5 . | A5 . B5 . C6 . . . | - - - -",
      bass: "C3 . . . . . . . | F2 . G2 . C3 . . . | - - - -", drum: "k - - - s - - - | k - k - s - - - | - - - -" },
    levelup: { bpm: 220, loop: false, lead: "C5 E5 G5 C6 E6 . . . - -", bass: "C3 . . . C3 . . . - -", drum: "" },
    ending: { bpm: 96, loop: true,
      lead: "E5 . D5 . C5 . G4 . | A4 . C5 . E5 . . . | D5 . C5 . A4 . F4 . | G4 . . . . . . . | E5 . D5 . C5 . E5 . | A5 . G5 . E5 . C5 . | D5 . E5 . F5 . D5 . | C5 . . . . . - -",
      bass: "C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | F2 . C3 . G2 . D3 . | C3 . G2 . C3 . - -",
      drum: "k - h - s - h -" },
  };

  let ctx = null, master, musicBus, sfxBus, noiseBuf, on = true, want = null, cur = null, timer = null;
  try { on = localStorage.getItem("ir-sound") !== "off"; } catch (e) { /* storage blocked: default on */ }

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) { const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0; return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12 - 9) / 12); }
  function parse(str) {   // -> [{f, len}] per eighth step (len in steps; 0 = rest/hold)
    const toks = (str || "").split(/\s+/).filter(t => t && t !== "|"), out = toks.map(() => null);
    toks.forEach((t, i) => { if (t === "." || t === "-") return; let len = 1; while (toks[i + len] === ".") len++; out[i] = { f: freq(t), len }; });
    return out;
  }
  for (const s of Object.values(SONGS)) { s.L = parse(s.lead); s.Bs = parse(s.bass); s.D = (s.drum || "").split(/\s+/).filter(t => t && t !== "|"); s.n = s.L.length; }

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() { if (!init()) return; if (ctx.state === "suspended") ctx.resume(); if (want && (!cur || cur.name !== want)) start(want); }

  function tone(type, f, t0, dur, vol, dest, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.006, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxBus); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(t0, dur, vol, hp, dest) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
  }

  // ---- music sequencer (lookahead scheduler) ----
  function start(name) {
    stopMusic(); const s = SONGS[name]; if (!s || !ctx) return;
    cur = { name, s, step: 0, t: ctx.currentTime + 0.06 };
    timer = setInterval(tick, 25); tick();
  }
  function tick() {
    if (!cur) return;
    const s = cur.s, dt = 60 / s.bpm / 2;
    while (cur && cur.t < ctx.currentTime + 0.15) {
      const i = cur.step % s.n;
      if (!s.loop && cur.step >= s.n) { const done = cur.onEnd; stopMusic(); if (done) done(); return; }
      const L = s.L[i], Bn = s.Bs[i % s.Bs.length], D = s.D.length ? s.D[i % s.D.length] : "-";
      if (L && L.f) tone("square", L.f, cur.t, L.len * dt * 0.95, 0.07, musicBus);
      if (Bn && Bn.f) tone("triangle", Bn.f, cur.t, Bn.len * dt * 0.9, 0.16, musicBus);
      if (D === "k") tone("sine", 150, cur.t, 0.12, 0.25, musicBus, 40);
      if (D === "s") noise(cur.t, 0.09, 0.12, 1500, musicBus);
      if (D === "h") noise(cur.t, 0.03, 0.05, 6000, musicBus);
      cur.step++; cur.t += dt;
    }
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; cur = null; }
  function music(name) { want = name; if (!ctx || ctx.state !== "running") return; if (cur && cur.name === name) return; start(name); }
  // one-shot jingle, then go back to the given song
  function jingle(name, back) { if (!ctx || ctx.state !== "running") return; start(name); if (cur) cur.onEnd = () => { want = null; if (back) music(back); }; want = back || null; }

  // ---- sound effects ----
  const FX = {
    blip: t => tone("square", 880, t, 0.04, 0.06),
    select: t => { tone("square", 660, t, 0.04, 0.06); tone("square", 990, t + 0.04, 0.05, 0.06); },
    bump: t => tone("square", 110, t, 0.07, 0.08),
    text: t => tone("square", 1200, t, 0.015, 0.02),
    encounter: t => { for (let i = 0; i < 6; i++) tone("square", 300 + i * 120, t + i * 0.04, 0.05, 0.07); noise(t + 0.24, 0.2, 0.1, 800); },
    spot: t => { tone("square", 1200, t, 0.08, 0.08); tone("square", 1600, t + 0.09, 0.12, 0.08); },
    Engulf: t => { noise(t, 0.12, 0.15, 300); tone("square", 200, t, 0.12, 0.08, null, 70); },
    Cytotoxic: t => tone("sawtooth", 1400, t, 0.14, 0.07, null, 200),
    Antibody: t => { for (let i = 0; i < 3; i++) tone("square", 1100, t + i * 0.06, 0.05, 0.05, null, 600); },
    Signal: t => { tone("sine", 880, t, 0.15, 0.1); tone("sine", 1320, t + 0.08, 0.2, 0.08); },
    drug: t => { tone("triangle", 400, t, 0.1, 0.12, null, 900); noise(t + 0.08, 0.08, 0.08, 3000); },
    hit: t => { noise(t, 0.1, 0.2, 500); tone("square", 220, t, 0.08, 0.06, null, 90); },
    hurt: t => tone("square", 330, t, 0.16, 0.08, null, 110),
    faint: t => tone("square", 700, t, 0.45, 0.07, null, 60),
    heal: t => [1047, 1319, 1568, 2093].forEach((f, i) => tone("sine", f, t + i * 0.06, 0.12, 0.08)),
    body: t => tone("triangle", 90, t, 0.22, 0.2, null, 50),
    spawn: t => { tone("square", 300, t, 0.06, 0.06, null, 600); tone("square", 300, t + 0.08, 0.06, 0.06, null, 600); },
    shield: t => tone("triangle", 520, t, 0.18, 0.12, null, 780),
    arrive: t => [523, 659, 784].forEach((f, i) => tone("square", f, t + i * 0.05, 0.06, 0.05)),
    item: t => { tone("square", 784, t, 0.06, 0.06); tone("square", 1047, t + 0.07, 0.1, 0.06); },
    gate: t => { noise(t, 0.5, 0.12, 200); tone("triangle", 120, t, 0.5, 0.15, null, 300); },
    save: t => { tone("square", 523, t, 0.08, 0.06); tone("square", 784, t + 0.09, 0.14, 0.06); },
  };
  function sfx(name) { if (!ctx || ctx.state !== "running" || !on || !FX[name]) return; FX[name](ctx.currentTime + 0.01); }

  function toggle() {
    on = !on; try { localStorage.setItem("ir-sound", on ? "on" : "off"); } catch (e) { /* ignore */ }
    if (master) master.gain.value = on ? 0.6 : 0; return on;
  }
  ["keydown", "pointerdown", "touchstart"].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  return { music, jingle, sfx, toggle, isOn: () => on, stopMusic };
})();
