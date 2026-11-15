"""Render each clip's music + sound effects with the game's own synth (audio.js) in an OfflineAudioContext.
python render_audio.py <clips_dir> <out_dir>"""
import base64, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "audio.js"   # the game's own audio.js at the repo root
src = GAME.read_text()
hook = "  return { music, jingle, sfx, toggle, isOn: () => on, stopMusic };"
assert hook in src
src = src.replace(hook, """  window.__AUD = { SONGS, FX, tone, noise, musicBus: () => musicBus, setCtx(c) {
    ctx = c; master = c.createGain(); master.gain.value = 0.6; master.connect(c.destination);
    musicBus = c.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = c.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } };
""" + hook)

def main(clips_dir, out_dir):
    clips = json.load(open(Path(clips_dir) / "clips.json"))["clips"]
    clips = clips + [{"name": "intro", "frames": 135, "audio": [{"k": "music", "n": "title", "f": 0}]},
                     {"name": "outro", "frames": 390, "audio": [{"k": "music", "n": "ending", "f": 0}]}]
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="chrome", headless=True)
        pg = br.new_page()
        pg.set_content("<html><body></body></html>")
        pg.add_script_tag(content="window.addEventListener = () => {};\n" + src)
        pg.add_script_tag(content=JS)
        for c in clips:
            dur = c["frames"] / 30 + 0.05
            b64 = pg.evaluate("([e, d]) => window.renderClip(e, d)", [c["audio"], dur])
            (out / f"{c['name']}.wav").write_bytes(base64.b64decode(b64))
            print(c["name"], f"{dur:.1f}s", len(c["audio"]), "cues", flush=True)
        br.close()

JS = r"""
window.renderClip = async (events, dur) => {
  const SR = 44100, c = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), A = window.__AUD; A.setCtx(c);
  const bus = c.destination; // tone/noise route through the closure's buses (musicBus for music, sfxBus default)
  const ev = events.slice().sort((a, b) => a.f - b.f), T = f => f / 30 + 0.01;
  // Rebuild the sequencer: a song plays from its start until the next music/jingle/stop cue.
  const music = [];   // [{name, t0, back}]
  for (const e of ev) if (e.k === "music" || e.k === "jingle" || e.k === "stop") music.push(e);
  for (let i = 0; i < music.length; i++) {
    const e = music[i]; if (e.k === "stop") continue;
    const tEnd = i + 1 < music.length ? T(music[i + 1].f) : dur;
    let t = playSong(A, e.n, T(e.f), tEnd);
    if (e.k === "jingle" && e.back && t < tEnd) playSong(A, e.back, t, tEnd);
  }
  for (const e of ev) if (e.k === "sfx" && A.FX[e.n]) A.FX[e.n](T(e.f));
  const buf = await c.startRendering();
  // 16-bit stereo WAV
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); ws(8, "WAVE"); ws(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  ws(36, "data"); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  let s = ""; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
};
function playSong(A, name, t0, tEnd) {
  const s = A.SONGS[name]; if (!s) return t0;
  const dt = 60 / s.bpm / 2; let t = t0, step = 0;
  while (t < tEnd) {
    if (!s.loop && step >= s.n) return t;
    const i = step % s.n, L = s.L[i], Bn = s.Bs[i % s.Bs.length], D = s.D.length ? s.D[i % s.D.length] : "-";
    const cut = x => Math.min(x, Math.max(0.01, tEnd - t));
    if (L && L.f) A.tone("square", L.f, t, cut(L.len * dt * 0.95), 0.07, A.musicBus());
    if (Bn && Bn.f) A.tone("triangle", Bn.f, t, cut(Bn.len * dt * 0.9), 0.16, A.musicBus());
    if (D === "k") A.tone("sine", 150, t, 0.12, 0.25, A.musicBus(), 40);
    if (D === "s") A.noise(t, 0.09, 0.12, 1500, A.musicBus());
    if (D === "h") A.noise(t, 0.03, 0.05, 6000, A.musicBus());
    step++; t += dt;
  }
  return t;
}
"""

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
