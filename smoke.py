import pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"])  # Playwright's bundled Chromium: pip install playwright && playwright install chromium
    pg = b.new_page(viewport={"width": 760, "height": 900})
    errs=[]; pg.on("pageerror", lambda e: errs.append("pageerror: "+str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" and "fonts" not in m.text else None)
    pg.goto((HERE / "index.html").as_uri()); pg.wait_for_timeout(500)
    pg.keyboard.press("z"); pg.wait_for_timeout(300)
    for _ in range(8): pg.keyboard.press("z"); pg.wait_for_timeout(80)
    pg.keyboard.down("ArrowRight"); pg.wait_for_timeout(600); pg.keyboard.up("ArrowRight")
    pg.screenshot(path="shot_world.png")
    pg.evaluate("__G.debug.startWild()"); pg.wait_for_timeout(1200)
    for _ in range(2): pg.keyboard.press("z"); pg.wait_for_timeout(150)
    pg.screenshot(path="shot_battle.png")
    print("mode:", pg.evaluate("__G.mode"), "| box:", pg.evaluate("document.getElementById('boxText').textContent"))
    print("\n".join(errs) or "no errors"); b.close()
