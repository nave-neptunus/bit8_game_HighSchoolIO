"""Gameplay clips for the Immune Response trailer. python scenes.py <out_dir> [last_scene_index]
Clips are captured in play order; the Remotion edit arranges them and adds captions."""
import json, sys, time
from playwright.sync_api import sync_playwright
from rec import launch, Rec

class Game(Rec):
    def walk(self, key, tx, ty, maxf=200):
        """Hold a direction until the hero heads onto (tx, ty), then let go so it stops there."""
        self.js("() => { __G.steps = -999 }")
        self.down(key)
        for _ in range(maxf):
            if self.js("""([k, tx, ty]) => { const p = __G.p;
              if (p.x === tx && p.y === ty) { window.dispatchEvent(new KeyboardEvent('keyup', {key: k})); return !p.moving; } return false; }""", [key, tx, ty]): break
            self.shoot(1)
        self.up(key)
    def wait_for(self, cond, maxf=400):
        for _ in range(maxf):
            if self.js(cond): return
            self.shoot(1)
        raise RuntimeError("timeout waiting for " + cond)
    def pick(self, label, pause=0.3):
        """Move the menu cursor to the button containing label (on camera), then press A."""
        idx = self.js("l => [...document.querySelectorAll('#boxMenu button:not([disabled])')].findIndex(b => b.textContent.includes(l))", label)
        if idx < 0: raise RuntimeError("no menu item " + label + ": " + self.js("document.getElementById('boxMenu').textContent"))
        cols = 1 if self.js("document.getElementById('boxMenu').className === 'one'") else 2
        for _ in range(12):
            cur = self.js("__G.menuFocus")
            if cur == idx: break
            if cols == 2 and cur // 2 == idx // 2: self.key("ArrowRight" if idx > cur else "ArrowLeft")
            else: self.key("ArrowDown" if idx > cur else "ArrowUp")
            self.sec(0.15)
        self.sec(pause); self.key("z")
    def lines(self, hold=1.2, n=50, until=None, stop_after=None):
        """Let each dialog line type out, hold it, press A. Stops early when a line contains `until`
        (before pressing) or right after holding a line containing `stop_after`."""
        for _ in range(n):
            if not self.dlg(): return
            self.wait_for("!__G.type", 150)
            if until and until in self.text(): return
            self.sec(hold)
            if stop_after and stop_after in self.text(): return
            self.key("z"); self.shoot(1)
    def skip(self, until=None, last=False, n=300):
        """Skip dialog off camera. last=True stops on the final line of the current dialog."""
        for _ in range(n):
            if not self.dlg(): return
            if until and until in self.text() and not self.js("!!__G.type"): return
            if last and self.js("__G.dlg.i === __G.dlg.lines.length - 1"): return
            self.key("z"); self.skipticks(2)
    def to_menu(self, n=400):
        """Off camera: advance battle text until the battle's action menu (or the world) is back."""
        for _ in range(n):
            if self.js("!__G.dlg && !!__G.menu || (__G.mode !== 'battle' && !__G.dlg)"): return
            self.key("z"); self.skipticks(2)
    def battle_ready(self):
        self.wait_for("__G.mode === 'battle' && !!__G.debug.battle && !__G.trans")

def title(g):
    g.skipticks(20)
    g.start("title")
    g.sec(2.8)
    g.key("z")                                   # NEW GAME
    g.wait_for("__G.mode === 'world' && !__G.fade")
    g.lines(hold=1.5, n=2, stop_after="scraped")
    g.end(tail=0.2)

def grass(g):
    g.skip()
    g.js("() => { __G.debug.setPos(5, 2); __G.p.dir = 'right'; __G.toast = null; }")
    g.skipticks(4)
    g.start("grass")
    g.sec(0.3)
    g.walk("ArrowRight", 6, 2); g.walk("ArrowDown", 6, 3); g.walk("ArrowRight", 16, 3)
    g.sec(0.1)
    g.js("() => __G.debug.startWild()")
    g.battle_ready()
    g.wait_for("!__G.type")
    g.end(tail=0.8)

def battle(g):
    g.js("""() => { __G.roster.forEach(c => c.xp = xpToNext(c.lv) - 3); const e = __G.debug.battle.enemies[0]; e.maxhp = e.hp = 40; }""")
    g.start("battle")
    g.sec(0.2); g.key("z"); g.shoot(1)              # past "A wild ... appeared!"
    g.wait_for("!!__G.menu"); g.sec(0.35)
    g.pick("FIGHT"); g.sec(0.6)
    g.pick("STRONG", pause=0.55)
    g.lines(hold=0.75, stop_after="grew to Lv")
    g.end(tail=0.2)

def captain(g):
    g.skip(); g.wait_for("__G.mode === 'world' && !__G.fade")
    g.js("() => { __G.debug.setPos(18, 5); __G.p.dir = 'up'; }"); g.skipticks(2)
    g.start("captain")
    g.sec(0.3)
    g.walk("ArrowUp", 18, 3)
    g.wait_for("!!__G.dlg")
    g.lines(hold=1.1, n=2)
    g.skip(last=True); g.key("z")                  # last intro line -> battle
    g.battle_ready(); g.wait_for("!__G.type"); g.sec(0.9)
    g.end()

def area2(g):
    g.js("() => __G.debug.winBattle()"); g.skip(); g.skipticks(60)
    g.js("() => __G.debug.startArea(2)")
    g.start("area2")
    g.lines(hold=1.4, n=1)
    g.end()
    g.skip(); g.skipticks(10)

def pharmacist(g):
    g.start("pharmacist")
    g.sec(0.2)
    g.walk("ArrowRight", 24, 2); g.walk("ArrowDown", 24, 3)
    g.js("() => { __G.noBump = false; __G.bumpCool = 0; }")
    g.down("ArrowRight"); g.shoot(2); g.up("ArrowRight")    # bump into the pharmacist = talk
    g.wait_for("!!__G.dlg")
    g.lines(hold=1.4, n=1)
    g.wait_for("!!__G.menu"); g.sec(0.5)
    g.pick("YES", pause=0.4)
    g.lines(hold=1.0, n=1)
    g.end()

def abx(g):
    g.js("() => __G.debug.startWild()"); g.skipticks(80); g.to_menu()
    g.start("abx")
    g.sec(0.4)
    g.pick("BAG"); g.sec(0.4)
    g.pick("ANTIBIOTIC", pause=0.45)
    g.lines(hold=0.8, n=4, until="No effect")
    g.sec(1.6)
    g.end()

def journal(g):
    g.js("() => __G.debug.winBattle()"); g.skip(); g.skipticks(60)
    g.start("journal")
    g.sec(0.2)
    g.key("x"); g.wait_for("!!__G.menu"); g.sec(0.4)
    g.pick("JOURNAL"); g.sec(0.6)
    g.pick("STAPH SCOUT", pause=0.4)
    g.sec(2.6)
    g.end()
    g.key("x"); g.skipticks(4); g.key("x"); g.skipticks(4); g.key("x"); g.skipticks(4)

def boss_clip(g, area, name):
    g.js(f"() => __G.debug.startArea({area})"); g.skip(); g.skipticks(10)
    g.js("() => __G.debug.bossIntro()"); g.skip(last=True); g.skipticks(120)
    g.start(name)
    g.key("z")
    g.battle_ready(); g.wait_for("!__G.type"); g.sec(0.7)
    g.end()

def bosses(g):
    boss_clip(g, 1, "boss1")
    g.js("() => __G.debug.winBattle()"); g.skip()
    boss_clip(g, 2, "boss2")
    g.js("() => __G.debug.winBattle()"); g.skip()

def superbug(g):
    g.js("() => __G.debug.startArea(3)"); g.skip(); g.skipticks(10)
    g.js("() => __G.debug.setLevel(11)")
    g.js("() => __G.debug.bossIntro()")
    g.skipticks(90); g.key("z"); g.skipticks(2)      # line 1 off camera (typed out, then advanced)
    g.start("sb_intro")
    g.lines(hold=1.25, n=2)
    g.wait_for("!!__G.trans"); g.battle_ready(); g.wait_for("!__G.type"); g.sec(0.6)
    g.end()
    g.to_menu()
    for name, item, until in [("sb_culture", "LAB CULTURE", "Lab result"), ("sb_clean", "DEBRIDEMENT", "biofilm is gone"),
                              ("sb_target", "TARGETED", "damage")]:
        g.start(name)
        g.sec(0.25)
        g.pick("BAG"); g.sec(0.3)
        g.pick(item, pause=0.35)
        if g.js("!!__G.menu && document.getElementById('boxText').textContent.includes('Use it on')"):
            g.pick("SUPERBUG", pause=0.3)
        g.lines(hold=0.6, n=6, until=until)
        g.sec(1.3)
        g.end()
        g.to_menu()

def ending(g):
    g.js("() => __G.debug.winBattle()")
    g.skip(until="MAYA IS HEALTHY")
    g.start("end_a")
    g.lines(hold=1.4, n=1)
    g.end()
    g.skip(until="Antibiotics wasted")
    g.start("end_b")
    g.lines(hold=1.2, n=2)
    g.skip(until="THE END")
    g.end()
    g.skip()
    g.skipticks(240)
    g.start("credits")
    g.sec(4.5)
    g.end()

SCENES = [title, grass, battle, captain, area2, pharmacist, abx, journal, bosses, superbug, ending]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "clips"
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 0   # earlier scenes replay without screenshots
    with sync_playwright() as pw:
        br, pg, r = launch(pw, out)
        g = Game(pg, r.out); g.shell = r.shell
        t = time.time()
        try:
            for i, s in enumerate(SCENES):
                g.dry = i < first
                print(s.__name__, "(replay)" if g.dry else "", flush=True); s(g)
        finally:
            import os
            old = json.load(open(f"{out}/clips.json"))["clips"] if first and os.path.exists(f"{out}/clips.json") else []
            new = {c["name"] for c in g.clips}
            json.dump({"clips": [c for c in old if c["name"] not in new] + g.clips}, open(f"{out}/clips.json", "w"), indent=1)
            print("capture", round(time.time() - t), "s")
            br.close()
