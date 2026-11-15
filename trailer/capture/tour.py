"""Extra clips for the trailer's world tour: a walk through each area's route, then that area's boss on its battle screen.
python tour.py <out_dir>   (needs the game served at http://localhost:8765, like scenes.py)
Clips: tour1, boss_a1, tour2, boss_a2, tour3, boss_a3."""
import json, sys
from playwright.sync_api import sync_playwright
from rec import launch
from scenes import Game

# Routes avoid the captains' sight lines and run through scenery; wild encounters are switched off while walking.
ROUTES = {
    1: ((7, 3), [("ArrowRight", 12, 3), ("ArrowDown", 12, 6), ("ArrowRight", 20, 6), ("ArrowDown", 20, 10)]),
    2: ((22, 2), [("ArrowLeft", 17, 2), ("ArrowDown", 17, 8), ("ArrowLeft", 7, 8), ("ArrowDown", 7, 8)]),
    3: ((7, 3), [("ArrowRight", 12, 3), ("ArrowDown", 12, 8), ("ArrowRight", 20, 8), ("ArrowDown", 20, 10)]),
}

def area(g, n):
    g.js(f"() => __G.debug.startArea({n})"); g.skip(); g.skipticks(10)
    g.js("() => { __G.debug.beatCaptains(); __G.toast = null; }")
    (x, y), steps = ROUTES[n]
    g.js(f"() => {{ __G.debug.setPos({x}, {y}); __G.p.dir = 'right'; }}"); g.skipticks(4)
    g.start(f"tour{n}")
    g.sec(0.2)
    for key, tx, ty in steps:
        if g.js("([tx, ty]) => __G.p.x !== tx || __G.p.y !== ty", [tx, ty]): g.walk(key, tx, ty)
    g.end(tail=0.3)
    # the boss, on its battle screen
    g.js("() => __G.debug.bossIntro()"); g.skip(last=True); g.skipticks(120)
    g.key("z"); g.battle_ready()
    g.start(f"boss_a{n}")
    g.wait_for("!__G.type"); g.sec(1.4)
    g.end()
    g.js("() => __G.debug.winBattle()"); g.skip(); g.skipticks(30)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "tour"
    with sync_playwright() as pw:
        br, pg, r = launch(pw, out)
        g = Game(pg, r.out); g.shell = r.shell
        g.skipticks(20); g.key("z")                     # title -> NEW GAME
        g.wait_for("__G.mode === 'world' && !__G.fade"); g.skip()
        try:
            for n in (1, 2, 3): area(g, n)
        finally:
            json.dump({"clips": g.clips}, open(f"{out}/clips.json", "w"), indent=1)
            br.close()
