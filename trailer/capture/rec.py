"""Frame-exact gameplay capture for the Immune Response trailer.
The game's rAF loop is frozen; each video frame advances the game 2 ticks (60 ticks/s -> 30 fps) and screenshots the
handheld (.shell) as a transparent PNG. audio.js is swapped for a stub that logs music/sfx cues per clip frame."""
import json, shutil
from pathlib import Path

URL = "http://localhost:8765/index.html"
STUB = """
const SND = (() => { let cur = null;
  const rec = o => { if (window.__rec) { o.f = window.__vf; window.__alog.push(o); } };
  return { music(n) { if (cur === n) return; cur = n; rec({ k: "music", n }); },
    jingle(n, back) { rec({ k: "jingle", n, back: back || null }); cur = back || null; },
    sfx(n) { rec({ k: "sfx", n }); }, toggle() { return true; }, isOn() { return true; },
    stopMusic() { cur = null; rec({ k: "stop" }); }, get cur() { return cur; } }; })();
"""
INIT = """
window.requestAnimationFrame = () => 0;
(() => { let s = 1234567; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
try { localStorage.clear(); } catch (e) {}
window.__vf = 0; window.__rec = false; window.__alog = [];
"""
CSS = """
html, body { background: transparent !important; overflow: hidden !important; }
#wrap { position: absolute; left: 0; top: 0; margin: 0 !important; }
.shell { box-shadow: none !important; }
#keys { display: none !important; }
#box { height: 238px; overflow: hidden; }
"""

class Rec:
    def __init__(self, page, out):
        self.p, self.out = page, Path(out)
        self.clip, self.f, self.clips = None, 0, []
    def js(self, code, arg=None):
        return self.p.evaluate(code, arg) if arg is not None else self.p.evaluate(code)
    def shoot(self, n=1):
        for _ in range(n):
            if self.clip is None:
                self.js("__G.debug.run(2)"); continue
            self.js(f"window.__vf = {self.f}; __G.debug.run(2)")
            self.shell.screenshot(path=str(self.clip / f"{self.f:04d}.png"), omit_background=True)
            self.f += 1
    def sec(self, s): self.shoot(round(s * 30))
    def skipticks(self, n): self.js(f"__G.debug.run({n})")
    def key(self, k):
        self.js("k => { window.dispatchEvent(new KeyboardEvent('keydown', {key: k})); window.dispatchEvent(new KeyboardEvent('keyup', {key: k})); }", k)
    def down(self, k): self.js("k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k}))", k)
    def up(self, k): self.js("k => window.dispatchEvent(new KeyboardEvent('keyup', {key: k}))", k)
    def dlg(self): return self.js("!!__G.dlg")
    def text(self): return self.js("document.getElementById('boxText').textContent")
    def start(self, name):
        """Start a clip: its own frame folder and audio log, beginning with whatever song is playing."""
        self.f = 0; self.name = name
        if getattr(self, "dry", False): self.clip = None; return
        self.clip = self.out / name
        if self.clip.exists(): shutil.rmtree(self.clip)
        self.clip.mkdir(parents=True)
        self.js("cur => { window.__alog = cur ? [{k: 'music', n: cur, f: 0}] : []; window.__rec = true; }", self.js("SND.cur") or "")
    def end(self, tail=0.0):
        if tail: self.sec(tail)
        if getattr(self, "dry", False): return
        audio = self.js("window.__alog"); self.js("window.__rec = false")
        self.clips.append({"name": self.name, "frames": self.f, "audio": audio})
        print(f"  clip {self.name}: {self.f} frames ({self.f / 30:.1f}s)", flush=True)
        self.clip = None

def launch(pw, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    br = pw.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    pg.route("**/audio.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.add_init_script(INIT)
    pg.goto(URL); pg.wait_for_function("!!window.__G")
    pg.add_style_tag(content=CSS)
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(1000)   # sprite PNGs
    r = Rec(pg, out); r.shell = pg.locator(".shell")
    return br, pg, r
