// ===== Immune Response: overworld + battle UI =====
(() => {
const TS = 16, VW = 15, VH = 10, LW = VW * TS, LH = VH * TS;
const cv = document.getElementById("screen"), ctx = cv.getContext("2d");
const box = document.getElementById("box"), boxText = document.getElementById("boxText"), boxMenu = document.getElementById("boxMenu"), boxHint = document.getElementById("boxHint");
let S = 3;
function resize() {
  const avail = Math.min(window.innerWidth - 12, 960);
  S = Math.max(2, Math.min(4, Math.floor(avail / LW)));
  if (avail / LW < 2) S = avail / LW;
  cv.width = Math.round(LW * S); cv.height = Math.round(LH * S);
  cv.style.width = cv.width + "px"; cv.style.height = cv.height + "px";
  document.getElementById("wrap").style.width = cv.width + "px";
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize); resize();

// ---------- assets ----------
const PEOPLE = {
  hero: SPR.person({ t: "#2fb6a8", w: "#f4f4f0", c: "#2fb6a8" }),
  nurse: SPR.person({ t: "#f28bb3", w: "#f7c7da", c: "#f28bb3", h: "#2b1a12", s: "#c98d64" }),
  pharm: SPR.person({ t: "#5fbf6a", w: "#e8f5e8", c: "#5fbf6a", h: "#c9c9c9" }),
  tech: SPR.person({ t: "#8a63c7", w: "#e9e1f7", c: "#8a63c7", h: "#d9a05b", s: "#8a5a3c" }),
};
const CRE = {}; for (const [k, f] of Object.entries(SPR.CREATURES)) CRE[k] = f();
const PAL = {
  1: { floor: "#f2c6a0", floorDot: "#e8b48c", floorDot2: "#fbd9ba", path: "#f8dcc0", pathDot: "#e9c6a2", grass: "#e0524f", grassDk: "#a83232", wall: "#e7a08a", wallDk: "#b8644f", wallHi: "#f7c9b8", wallNuc: "#8a3e30", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#f7dcc4", ground: "#e8b48c" },
  2: { floor: "#f5c6d3", floorDot: "#e9a9bb", floorDot2: "#fde0e8", path: "#fbe3ea", pathDot: "#eec2cf", grass: "#b8d45a", grassDk: "#7f9a2e", wall: "#d98aa3", wallDk: "#a8536f", wallHi: "#f5c2d2", wallNuc: "#7a2f4a", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#fbe0e8", ground: "#e9a9bb" },
  3: { floor: "#d6e6ee", floorDot: "#bcd2de", floorDot2: "#eef6fa", path: "#eef3f6", pathDot: "#cfdbe2", grass: "#9b6bd6", grassDk: "#6a3fa3", wall: "#9fb3c4", wallDk: "#6d8396", wallHi: "#d3e0ea", wallNuc: "#4a5d6e", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#e3eef4", ground: "#bcd2de" },
};
const TILES = { 1: SPR.makeTiles(PAL[1]), 2: SPR.makeTiles(PAL[2]), 3: SPR.makeTiles(PAL[3]) };

// ---------- world data ----------
const AREAS = {
  1: { name: "THE SCRAPE", sub: "Maya's knee", party: ["Neutrophil", "Macrophage"], bag: { Rest: 2 }, wild: "staph", boss: () => [ENEMIES.brewer(), ENEMIES.staph()],
    map: [
      "####################",
      "#@..N......,,,,,~~~#",
      "#.......S..,,,,,~~~#",
      "#==========,,,,,...#",
      "#,,,,,,,,,,,,,,,,,##",
      "#,,,,,,,,,,,,,,,,..#",
      "#,,,,,....=.,,,,,..#",
      "#~~~~~~...=........#",
      "#~~~~~~...=====....#",
      "#..,,,,,,.....=....#",
      "#..,,,,,,..L..=.,,.#",
      "#..,,,,,,.....=.,,.#",
      "#.............=..B##",
      "#.............=..G>#",
      "####################"] },
  2: { name: "THE COUGH", sub: "Maya's lungs", party: ["Macrophage", "NK Cell", "Killer T Cell"], bag: { Rest: 2, "Fever Reducer": 1 }, wild: "virion", boss: () => [ENEMIES.factory(), ENEMIES.virion()],
    map: [
      "####################",
      "#~~~.......P...N.@.#",
      "#~~~..........S....#",
      "#..=============...#",
      "##,,,,,,,,,,,,,,,,,#",
      "#.,,,,,,,,,,,,,,,,,#",
      "#.....=........~~~~#",
      "#.....=..,,,,..~~~~#",
      "#.L...=..,,,,......#",
      "#.....=======......#",
      "#~~~~~......=..,,,,#",
      "#~~~~~..,,,.=..,,,,#",
      "#>GB...,,,..=......#",
      "#..................#",
      "####################"] },
  3: { name: "THE SUPERBUG", sub: "Maya's stitches", party: ["Neutrophil", "Macrophage", "B Cell"],
    bag: { Rest: 2, "Fever Reducer": 1, "Lab Culture": 1, "Targeted Antibiotic": 2, "Old Antibiotic": 2, Debridement: 2 }, wild: "rstaph", boss: () => [ENEMIES.superbug(1 + G.abxWasted), ENEMIES.rstaph()],
    map: [
      "####################",
      "#@.T......#....,,,,#",
      "#.........#....,,,,#",
      "#...S.....#........#",
      "#====.....=====....#",
      "#,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,#",
      "#.......=..........#",
      "#..~~~..=...L......#",
      "#..~~~..=..........#",
      "#......=====..,,,,.#",
      "#..,,,,....=..,,,,.#",
      "#..,,,,....=......##",
      "#..........=....BG>#",
      "####################"] },
};
for (const a of Object.values(AREAS)) a.map.forEach((r, i) => { if (r.length !== 20) console.error("map row length", a.name, i, r.length); });
const SOLID = new Set(["#", "~", "S", "N", "P", "T", "B", "G"]);

const TEXT = {
  intro1: [
    "Hi! I'm Nurse Ada. You've been shrunk down to germ size to help protect Maya.",
    "Maya just scraped her knee at soccer practice. Germs are getting in!",
    "Germs hide in the RED, swollen grass. Walk through it and they'll jump out.",
    "Your team: NEUTROPHIL, the fast first responder, and MACROPHAGE, the big eater.",
    "In battle, look for STRONG! on a move. That attack works best on that germ.",
    "Tired team? Step on a green LYMPH NODE to rest. Beat the boss to clear the swelling. Go!",
    "You got 2 REST!"],
  intro2: [
    "WEEKS LATER... Maya caught the flu. Achoo!",
    "Nurse Ada: The flu is a VIRUS. Viruses sneak inside your own cells to make copies.",
    "Engulf can't do much once a virus is inside a cell. You need new teammates!",
    "NK CELL hunts cells that are hiding. KILLER T CELL is the specialist, but it takes a few rounds to arrive.",
    "Germs live in the yellow-green mucus patches. Good luck!",
    "You got 2 REST and 1 FEVER REDUCER!"],
  intro3: [
    "MONTHS LATER... Maya had surgery. Now her stitches are infected.",
    "Tech Lee: I'm from the hospital lab. This germ is a SUPERBUG. Old antibiotics barely hurt it.",
    "Step 1: use LAB CULTURE to find the right drug.",
    "Step 2: use DEBRIDEMENT to clean off its slimy BIOFILM shield.",
    "Step 3: hit it with the TARGETED ANTIBIOTIC!",
    "Your B CELL can OPSONIZE (tag) it, so Engulf does double damage.",
    "You got the hospital supply kit!"],
  nurse1: ["Nurse Ada: Red grass = germs. Green lymph node = rest. Find the Toxin Brewer at the bottom right!"],
  nurse2: ["Nurse Ada: Infected cells hide their ID tags. NK cells can still spot them!", "Interferon Signal stops the virus from copying for a bit."],
  tech3: ["Tech Lee: Culture, clean, then the targeted drug. Don't waste the strong stuff on the little ones!"],
  sign1: ["Warning: swollen, inflamed tissue ahead. Wild germs live in the red grass!"],
  sign2: ["Mucus patches ahead. Viruses love it here!"],
  sign3: ["Purple slime = BIOFILM. Bacteria build it to protect themselves."],
  gate: ["Swollen tissue blocks the way. Beat the boss first!"],
  boss1: ["TOXIN BREWER: Heh heh. I'm brewing toxins in this cut. Try and stop me!"],
  boss2: ["VIRUS FACTORY: I turn lung cells into virus factories! More copies, MORE COPIES!"],
  win1: ["You did it! Neutrophils and macrophages are your body's first responders.", "That yellow pus in a cut? It's mostly neutrophils that died fighting the germs.", "The swelling went down. The path is open!"],
  win2: ["Nice! Viruses hide inside your cells, so NK cells and Killer T cells have to find them.", "Antibiotics don't work on viruses at all.", "The path is open!"],
};

// ---------- game state ----------
const G = window.__G = {
  mode: "title", area: 1, map: null, p: { x: 1, y: 1, dir: "down", moving: false, fx: 0, fy: 0, t: 0, frame: 0 },
  party: [], bag: {}, memory: { 1: 0, 2: 0, 3: 0 }, abxWasted: 0, tookAbx: false, pharmTalked: false, beaten: {},
  steps: 0, lymph: null, stats: { wild: 0, bosses: 0 }, battle: null, tick: 0, toast: null, flash: 0,
};

function tileAt(x, y) { return G.map[y] && G.map[y][x] || "#"; }
function setTile(x, y, ch) { G.map[y] = G.map[y].slice(0, x) + ch + G.map[y].slice(x + 1); }
function find(ch) { for (let y = 0; y < G.map.length; y++) { const x = G.map[y].indexOf(ch); if (x >= 0) return { x, y }; } }

function enterArea(n) {
  G.area = n; G.map = AREAS[n].map.slice();
  const st = find("@"); setTile(st.x, st.y, "."); Object.assign(G.p, { x: st.x, y: st.y, dir: "down", moving: false });
  G.lymph = find("L"); G.party = AREAS[n].party.map(makeCell); G.steps = 0;
  G.mode = "world"; G.toast = { text: AREAS[n].name, sub: AREAS[n].sub, t: 0 };
  const intro = TEXT["intro" + n];
  dialog(intro, () => { refillBag(); }, n === 1 ? "nurse" : n === 2 ? "nurse" : "tech");
}
function refillBag() {
  const keepAbx = G.bag.Antibiotic || 0;
  G.bag = Object.assign({}, AREAS[G.area].bag);
  if (G.area === 2 && keepAbx) G.bag.Antibiotic = keepAbx;
}
function healAll() { G.party.forEach(c => c.hp = c.maxhp); refillBag(); }

// ---------- input ----------
const held = new Set();
const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
window.addEventListener("keydown", e => {
  if (KEYMAP[e.key]) { held.add(KEYMAP[e.key]); if (menuNav(KEYMAP[e.key])) e.preventDefault(); else if (G.mode === "world") e.preventDefault(); }
  if (["z", "Z", "Enter", " "].includes(e.key)) { e.preventDefault(); if (!e.repeat) press("A"); }
  if (["x", "X", "Escape", "Backspace"].includes(e.key)) { e.preventDefault(); if (!e.repeat) press("B"); }
});
window.addEventListener("keyup", e => { if (KEYMAP[e.key]) held.delete(KEYMAP[e.key]); });
document.querySelectorAll("[data-dir]").forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener("pointerdown", e => { e.preventDefault(); held.add(d); menuNav(d); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => held.delete(d)));
});
document.getElementById("btnA").addEventListener("pointerdown", e => { e.preventDefault(); press("A"); });
document.getElementById("btnB").addEventListener("pointerdown", e => { e.preventDefault(); press("B"); });
cv.addEventListener("pointerdown", () => { if (G.dlg || G.mode === "title") press("A"); });
boxText.addEventListener("pointerdown", () => { if (G.dlg) press("A"); });

function press(k) {
  if (G.mode === "title") { if (k === "A") startGame(); return; }
  if (G.dlg) { if (k === "A") advanceDialog(); return; }
  if (G.menu) { if (k === "A") { const b = boxMenu.querySelectorAll("button:not([disabled])")[G.menuFocus]; if (b) b.click(); } else if (k === "B" && G.menu.back) G.menu.back(); return; }
  if (G.mode === "world" && !G.p.moving) {
    if (k === "A") { const [dx, dy] = DIRV[G.p.dir]; interact(G.p.x + dx, G.p.y + dy); }
    if (k === "B") showTeam();
  }
}
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- dialog & menus (DOM text box) ----------
function dialog(lines, done, speaker) {
  G.dlg = { lines: lines.slice(), i: 0, done, speaker };
  G.menu = null; boxMenu.innerHTML = ""; boxHint.textContent = "";
  showLine();
}
function showLine() { boxText.textContent = G.dlg.lines[G.dlg.i]; boxText.classList.add("more"); }
function advanceDialog() {
  const d = G.dlg; d.i++;
  if (d.i < d.lines.length) return showLine();
  G.dlg = null; boxText.classList.remove("more");
  if (d.done) d.done(); else boxText.textContent = "";
}
function say(text) { boxText.textContent = text; boxText.classList.remove("more"); }
function menu(prompt, items, opts = {}) {
  G.dlg = null; boxText.classList.remove("more");
  boxText.textContent = prompt; boxMenu.innerHTML = ""; boxHint.textContent = opts.hint || "";
  G.menu = { back: opts.back };
  boxMenu.className = opts.cols === 1 ? "one" : "";
  items.forEach(it => {
    const b = document.createElement("button");
    b.innerHTML = it.html || it.label; if (it.disabled) b.disabled = true;
    if (it.cls) b.classList.add(it.cls);
    b.addEventListener("click", () => { if (!it.disabled) { G.menu = null; it.fn(); } });
    b.addEventListener("mouseenter", () => { boxHint.textContent = it.hint || opts.hint || ""; });
    boxMenu.appendChild(b);
  });
  if (opts.back) {
    const b = document.createElement("button"); b.textContent = "BACK"; b.className = "back";
    b.addEventListener("click", () => { G.menu = null; opts.back(); }); boxMenu.appendChild(b);
  }
  G.menuFocus = 0; focusMenu(); G.menuItems = items;
}
function focusMenu() {
  const bs = [...boxMenu.querySelectorAll("button:not([disabled])")];
  bs.forEach((b, i) => b.classList.toggle("focus", i === G.menuFocus));
  const items = G.menuItems || [], b = bs[G.menuFocus];
  if (b) { const idx = [...boxMenu.children].indexOf(b); const it = items[idx]; if (it && it.hint) boxHint.textContent = it.hint; }
}
function menuNav(d) {
  if (!G.menu) return false;
  const n = boxMenu.querySelectorAll("button:not([disabled])").length; if (!n) return true;
  const cols = boxMenu.className === "one" ? 1 : 2;
  const step = { left: -1, right: 1, up: -cols, down: cols }[d];
  G.menuFocus = (G.menuFocus + step + n) % n; focusMenu(); return true;
}
function clearBox() { G.menu = null; G.dlg = null; boxMenu.innerHTML = ""; boxText.textContent = ""; boxHint.textContent = ""; boxText.classList.remove("more"); }

// ---------- overworld ----------
function interact(x, y) {
  const t = tileAt(x, y), n = G.area;
  if (t === "N") return dialog(TEXT["nurse" + n] || TEXT.nurse1, clearBox);
  if (t === "T") return dialog(TEXT.tech3, clearBox);
  if (t === "S") return dialog(TEXT["sign" + n], clearBox);
  if (t === "G") return dialog(TEXT.gate, clearBox);
  if (t === "P") return pharmacist();
  if (t === "B") return bossIntro();
}
function pharmacist() {
  if (G.pharmTalked) return dialog([G.tookAbx ? "Pharmacist: Hope those antibiotics help... (Do they work on a virus?)" : "Pharmacist: Rest and fluids help most with the flu. Feel better!"], clearBox);
  dialog(["Pharmacist: Hey! Want some antibiotics for that cough? Lots of people ask for them."], () => {
    menu("Take the antibiotics?", [
      { label: "YES, PLEASE", fn: () => { G.tookAbx = true; G.pharmTalked = true; G.bag.Antibiotic = (G.bag.Antibiotic || 0) + 2; dialog(["You got 2 ANTIBIOTICS!"], clearBox); } },
      { label: "NO THANKS", fn: () => { G.pharmTalked = true; dialog(["Pharmacist: Smart. Antibiotics only kill bacteria, and the flu is a virus."], clearBox); } },
    ]);
  });
}
function tryMove(dir) {
  const p = G.p; p.dir = dir; const [dx, dy] = DIRV[dir], nx = p.x + dx, ny = p.y + dy, t = tileAt(nx, ny);
  if (SOLID.has(t)) { if ("NPTSBG".includes(t) && !G.bumpCool) { G.bumpCool = 12; interact(nx, ny); } return; }
  p.moving = true; p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0; p.frame = (p.frame + 1) % 4;
}
function arrive() {
  const p = G.p, t = tileAt(p.x, p.y); G.steps++;
  if (t === ",") {
    if (G.steps >= 3 && Math.random() < 0.18) { G.steps = 0; return startWild(); }
  } else if (t === "L") {
    G.lymph = { x: p.x, y: p.y };
    const hurt = G.party.some(c => c.hp < c.maxhp) || Object.entries(AREAS[G.area].bag).some(([k, v]) => (G.bag[k] || 0) < v);
    healAll();
    if (hurt) dialog(["LYMPH NODE: immune cells gather here to rest and get ready.", "Your team is fully healed and your bag is refilled!"], clearBox);
  } else if (t === ">") {
    if (G.area < 3) return transitionTo(G.area + 1);
    return ending();
  }
}
function transitionTo(n) { G.fade = { t: 0, mid: () => enterArea(n) }; }
function showTeam() {
  const rows = G.party.map(c => ({ html: `${c.name.toUpperCase()} <span class=r>${Math.max(0, c.hp)}/${c.maxhp} HP</span>`, fn: showTeam, hint: CELL_DEFS[c.name].blurb, cls: c.hp <= 0 ? "dead" : "" }));
  const bag = Object.entries(G.bag).filter(([, v]) => v > 0).map(([k, v]) => `${k} x${v}`).join(", ") || "empty";
  menu(`TEAM   Immune Memory ${G.memory[G.area]}/3   Bag: ${bag}`, rows, { cols: 1, back: clearBox, hint: "Immune Memory: each wild win gives +5% damage vs. this area's boss (max 3)." });
}

// ---------- battle flow ----------
let B = null;            // engine battle
const BV = { enemies: [], anim: [], hp: new Map(), body: 100, inflam: 0 };
function startWild() {
  const e = ENEMIES[AREAS[G.area].wild]();
  startBattle([e], true, [`A wild ${e.name.toUpperCase()} appeared!`]);
}
function bossIntro() {
  if (G.area === 3) {
    const lines = G.abxWasted > 0
      ? ["SUPERBUG COLONY: Remember those antibiotics used on the flu?", "They didn't hurt the virus one bit... but they gave us bacteria PRACTICE.", `I'm tougher now! (Boss gets +${TUNE.wastedBossHP * G.abxWasted} HP and more resistance.)`]
      : ["SUPERBUG COLONY: Nobody wasted antibiotics on the flu, huh?", "Doesn't matter. My biofilm makes me unstoppable!"];
    return dialog(lines, () => startBattle(AREAS[3].boss(), false, ["The SUPERBUG COLONY attacks!"]));
  }
  dialog(TEXT["boss" + G.area], () => startBattle(AREAS[G.area].boss(), false, [`The ${AREAS[G.area].boss()[0].name.toUpperCase()} attacks!`]));
}
function startBattle(enemies, wild, intro) {
  G.flash = 18; G.mode = "flash";
  setTimeout(() => {
    B = new Battle({ enemies, cells: G.party, bag: G.bag, wild, level: G.area, memory: wild ? 0 : G.memory[G.area], onAbxWasted: () => G.abxWasted++ });
    BV.enemies = B.enemies.slice(); BV.anim = []; BV.hp = new Map(); BV.body = 100; BV.inflam = 0; BV.wild = wild;
    G.mode = "battle";
    playLog(intro.map(t => ({ t })).concat(!wild && G.memory[G.area] ? [{ t: `Immune Memory ${G.memory[G.area]}/3: your cells hit ${G.memory[G.area] * 5}% harder vs. the boss!` }] : []), mainMenu);
  }, 600);
}
function playLog(log, done) {
  if (!log.length) return done();
  const [m, ...rest] = log;
  if (m.fx) BV.anim.push({ fx: m.fx, e: m.e, t: 0 });
  if (m.fx === "spawn" || m.fx === "faint") syncEnemies();
  dialog([m.t], () => playLog(rest, done));
}
function syncEnemies() { BV.enemies = B.enemies.concat(BV.enemies.filter(e => e.hp <= 0 && !B.enemies.includes(e))); }
function cellName() { return B.cur().name.toUpperCase(); }
function mainMenu() {
  syncEnemies();
  if (B.over) return endBattle();
  const acts = B.actions();
  const curOk = B.available(B.cur());
  if (!curOk && !acts.some(a => a.k === "swap")) {
    return menu("No cell is ready yet... backup is on the way!", [{ label: "WAIT A ROUND", fn: () => act(null) }]);
  }
  menu(curOk ? `What will ${cellName()} do?` : `${cellName()} can't fight. Switch cells!`, [
    { label: "FIGHT", fn: fightMenu, disabled: !curOk, hint: "Attack or use a support move." },
    { label: "BAG", fn: bagMenu, hint: "Use an item. Items use up your turn." },
    { label: "CELLS", fn: cellsMenu, hint: "Switch to another immune cell. Uses your turn." },
    { label: "RUN", fn: () => act({ k: "run" }), disabled: !B.wild, hint: B.wild ? "Get away from a wild germ." : "You can't run from a boss!" },
  ]);
}
function hintFor(m, e) {
  if (m.type === "Signal") return { tag: "SUPPORT", cls: "sup" };
  const eff = B.effOf(B.cur(), m, e);
  if (eff >= 1.5) return { tag: "STRONG!", cls: "strong" };
  if (eff <= 0.5) return { tag: "weak", cls: "weak" };
  return { tag: "ok", cls: "ok" };
}
function fightMenu() {
  const c = B.cur(), acts = B.actions();
  const items = c.moves.map(m => {
    const usable = acts.some(a => a.k === "move" && a.m === m);
    let tag = { tag: "", cls: "" };
    if (m.type === "Signal") tag = hintFor(m);
    else { const best = B.enemies.map(e => hintFor(m, e)).sort((a, b) => ["strong", "ok", "weak"].indexOf(a.cls) - ["strong", "ok", "weak"].indexOf(b.cls))[0]; if (best) tag = best; }
    const pp = m.pp > 50 ? "&infin;" : `${m.left}/${m.pp}`;
    return { html: `${m.name.toUpperCase()}<span class="tag ${tag.cls}">${tag.tag}</span><span class=r>${pp}</span>`, disabled: !usable,
      hint: `${m.type === "Signal" ? "Support" : m.type + " " + m.power}: ${m.desc}`, fn: () => pickTarget(m) };
  });
  menu(`${cellName()}'s moves:`, items, { back: mainMenu, cols: 1 });
}
function pickTarget(m) {
  const acts = B.actions().filter(a => a.k === "move" && a.m === m);
  if (acts.length === 1) return act(acts[0]);
  menu("Pick a target:", acts.map(a => { const h = hintFor(m, a.e); return { html: `${a.e.name.toUpperCase()} <span class="tag ${h.cls}">${h.tag}</span><span class=r>${Math.max(0, a.e.hp)} HP</span>`, fn: () => act(a), hint: TYPE_NAME[a.e.type] }; }), { back: fightMenu, cols: 1 });
}
function bagMenu() {
  const acts = B.actions();
  const items = Object.entries(B.bag).filter(([, n]) => n > 0).map(([it, n]) => {
    const usable = acts.some(a => a.k === "item" && a.it === it);
    const locked = it === "Targeted Antibiotic" && !B.cultured;
    return { html: `${it.toUpperCase()}<span class=r>x${n}</span>`, disabled: !usable, hint: locked ? "Locked: use LAB CULTURE first." : ITEM_INFO[it], fn: () => {
      const ia = acts.filter(a => a.k === "item" && a.it === it);
      if (ia.length === 1) return act(ia[0]);
      menu("Use it on:", ia.map(a => ({ html: `${a.e.name.toUpperCase()}<span class=r>${TYPE_NAME[a.e.type]}</span>`, fn: () => act(a), hint: TYPE_NAME[a.e.type] })), { back: bagMenu, cols: 1 });
    } };
  });
  if (!items.length) return menu("The bag is empty.", [], { back: mainMenu });
  menu("Bag:", items, { back: mainMenu, cols: 1 });
}
function cellsMenu() {
  const acts = B.actions();
  menu("Switch to:", B.cells.map((c, i) => {
    const a = acts.find(x => x.k === "swap" && x.i === i);
    let st = c.hp <= 0 ? "worn out" : i === B.active ? "in battle" : B.available(c) ? "ready" : `arrives round ${B.arrivalRound(c)}`;
    return { html: `${c.name.toUpperCase()} <span class=r>${Math.max(0, c.hp)}/${c.maxhp} &middot; ${st}</span>`, disabled: !a, hint: CELL_DEFS[c.name].blurb, fn: () => act(a) };
  }), { back: mainMenu, cols: 1 });
}
function act(a) { clearBox(); const log = a ? B.step(a) : B.waitRound(); playLog(log, mainMenu); }
function endBattle() {
  const res = B.over, wild = B.wild;
  if (res === "run") return backToWorld();
  if (res === "lose") {
    return dialog(["Your cells are too tired to keep going...", "They retreat to the lymph node to rest. Try again!"], () => { healAll(); Object.assign(G.p, { x: G.lymph.x, y: G.lymph.y, dir: "down" }); backToWorld(); });
  }
  if (wild) {
    G.stats.wild++;
    const lines = [];
    if (G.memory[G.area] < 3) { G.memory[G.area]++; lines.push(`Your cells remember this germ! Immune Memory ${G.memory[G.area]}/3 (+5% damage vs. the boss).`); }
    if (G.party.every(c => c.hp <= 0)) lines.push("Your team is worn out. Find a lymph node!");
    return lines.length ? dialog(lines, backToWorld) : backToWorld();
  }
  G.stats.bosses++; G.beaten[G.area] = true;
  const bpos = find("B"); if (bpos) setTile(bpos.x, bpos.y, ".");
  const gpos = find("G"); if (gpos) setTile(gpos.x, gpos.y, ".");
  if (G.area === 3) return ending();
  dialog(TEXT["win" + G.area], backToWorld);
}
function backToWorld() { B = null; clearBox(); G.mode = "world"; G.steps = 0; }

// ---------- title & ending ----------
function startGame() { clearBox(); G.memory = { 1: 0, 2: 0, 3: 0 }; G.abxWasted = 0; G.tookAbx = false; G.pharmTalked = false; G.beaten = {}; G.stats = { wild: 0, bosses: 0 }; G.bag = {}; enterArea(1); }
function ending() {
  B = null; G.mode = "end";
  const facts = [
    "MAYA IS HEALTHY AGAIN! You beat all 3 infections.",
    `Germs defeated in the wild: ${G.stats.wild}. Antibiotics wasted on the flu: ${G.abxWasted}.`,
    G.abxWasted ? "Those wasted antibiotics made the Superbug tougher. In real life, using antibiotics when they can't help gives bacteria more chances to become resistant." :
      "You never wasted antibiotics on a virus. That's exactly how real doctors fight resistance!",
    "Real world: drug-resistant infections directly caused about 1.27 million deaths in 2019.",
    "Remember: antibiotics kill bacteria, not viruses. Only use them when a doctor prescribes them.",
    "THE END. Thanks for playing IMMUNE RESPONSE!"];
  dialog(facts, () => menu("Play again?", [{ label: "PLAY AGAIN", fn: () => { G.mode = "title"; clearBox(); say("Press Z or tap A to start"); } }]));
}

// ---------- drawing ----------
function img(c, x, y, sc = 1, alpha = 1) { ctx.globalAlpha = alpha; ctx.drawImage(c, Math.round(x * S), Math.round(y * S), Math.round(c.width * sc * S), Math.round(c.height * sc * S)); ctx.globalAlpha = 1; }
function rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); }
function text(s, x, y, size = 6, col = "#1b1428", align = "left") {
  ctx.font = `${Math.round(size * S)}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = "top";
  ctx.fillText(s, Math.round(x * S), Math.round(y * S));
}
function drawWorld() {
  const p = G.p, T = TILES[G.area];
  const k = p.moving ? Math.min(1, p.t / 8) : 1;
  const px = (p.moving ? p.fx + (p.x - p.fx) * k : p.x) * TS, py = (p.moving ? p.fy + (p.y - p.fy) * k : p.y) * TS;
  const mw = G.map[0].length * TS, mh = G.map.length * TS;
  const camX = Math.max(0, Math.min(mw - LW, px - LW / 2 + 8)), camY = Math.max(0, Math.min(mh - LH, py - LH / 2 + 8));
  const wf = Math.floor(G.tick / 30) % 2;
  for (let y = 0; y < G.map.length; y++) for (let x = 0; x < G.map[0].length; x++) {
    const t = G.map[y][x], sx = x * TS - camX, sy = y * TS - camY;
    if (sx < -TS || sy < -TS || sx > LW || sy > LH) continue;
    const base = t === "#" ? T.wall : t === "," ? T.grass : t === "~" ? T.water[wf] : t === "=" ? T.path : t === "L" ? T.lymph : t === "S" ? T.sign : t === "G" ? T.gate : t === ">" ? T.exit : T.floor;
    img("NPTB".includes(t) ? T.floor : base, sx, sy);
  }
  // NPCs and boss
  for (let y = 0; y < G.map.length; y++) for (let x = 0; x < G.map[0].length; x++) {
    const t = G.map[y][x], sx = x * TS - camX, sy = y * TS - camY;
    const face = Math.abs(p.x - x) + Math.abs(p.y - y) === 1 ? (p.x < x ? "left" : p.x > x ? "right" : p.y < y ? "up" : "down") : "down";
    if (t === "N") img(PEOPLE.nurse[face][0], sx, sy - 2);
    if (t === "P") img(PEOPLE.pharm[face][0], sx, sy - 2);
    if (t === "T") img(PEOPLE.tech[face][0], sx, sy - 2);
    if (t === "B") { const c = CRE[AREAS[G.area].boss()[0].sprite]; const bob = Math.round(Math.sin(G.tick / 10)); img(c, sx - (c.width - 16) / 2, sy - (c.height - 16) + bob); }
  }
  const fr = p.moving ? [1, 3][Math.floor(p.t / 4) % 2 + 0] === undefined ? 0 : (p.frame % 2 ? 1 : 3) : 0;
  img(PEOPLE.hero[p.dir][p.moving && p.t < 6 ? fr : 0], px - camX, py - camY - 3);
  if (!p.moving && tileAt(p.x, p.y) === ",") { // grass covers your feet
    ctx.drawImage(T.grass, 0, 10, 16, 6, Math.round((px - camX) * S), Math.round((py - camY + 10) * S), Math.round(16 * S), Math.round(6 * S));
  }
  // area toast
  if (G.toast) {
    G.toast.t++; const a = G.toast.t < 150 ? 1 : Math.max(0, 1 - (G.toast.t - 150) / 30);
    if (a <= 0) G.toast = null; else {
      ctx.globalAlpha = a; rect(4, 4, 120, 26, "#1b1428"); rect(5, 5, 118, 24, "#fdf6e3");
      text(`AREA ${G.area}: ${G.toast.text}`, 10, 9, 5); text(G.toast.sub, 10, 19, 5, "#6a5a7a"); ctx.globalAlpha = 1;
    }
  }
}
function bar(x, y, w, h, frac, col, back = "#3a3045") {
  rect(x - 1, y - 1, w + 2, h + 2, "#1b1428"); rect(x, y, w, h, back); rect(x, y, Math.max(0, Math.min(1, frac)) * w, h, col);
}
function hpCol(f) { return f > 0.5 ? "#4cd06a" : f > 0.25 ? "#f2c94c" : "#e0524f"; }
function lerpTo(key, v) { const cur = BV.hp.has(key) ? BV.hp.get(key) : v; const n = cur + Math.sign(v - cur) * Math.min(Math.abs(v - cur), 1.2); BV.hp.set(key, n); return n; }
function drawBattle() {
  const P = PAL[G.area];
  rect(0, 0, LW, LH, P.bg);
  for (let i = 0; i < 6; i++) rect(0, 52 + i * 18, LW, 1, P.ground);
  ctx.fillStyle = P.ground; ctx.beginPath(); ctx.ellipse(170 * S, 74 * S, 62 * S, 10 * S, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(50 * S, 128 * S, 44 * S, 9 * S, 0, 0, 7); ctx.fill();
  BV.anim.forEach(a => a.t++); BV.anim = BV.anim.filter(a => a.t < 30);
  // enemies
  const list = BV.enemies.filter(e => e.hp > 0 || BV.anim.some(a => a.fx === "faint" && a.e === e));
  const n = list.length;
  list.forEach((e, i) => {
    const c = CRE[e.sprite], big = c.width > 24, sc = n <= 2 ? (big ? 1.6 : 1.5) : (big ? 1.1 : 1);
    const w = c.width * sc, slot = 128 / n, cx = 110 + slot * i + slot / 2, x = cx - w / 2, y = 74 - c.height * sc + Math.round(Math.sin((G.tick + i * 13) / 12));
    const hurt = BV.anim.find(a => a.e === e && a.fx === "hurt"), faint = BV.anim.find(a => a.e === e && a.fx === "faint");
    const vis = hurt && Math.floor(hurt.t / 4) % 2 === 0 ? 0.25 : 1;
    img(c, x, y, sc, faint ? Math.max(0, 1 - faint.t / 25) : vis);
    if ((e.shield || 0) > 0) { ctx.strokeStyle = "#5fd3e8"; ctx.lineWidth = S; ctx.beginPath(); ctx.ellipse((x + w / 2) * S, (y + c.height * sc / 2) * S, (w / 2 + 3) * S, (c.height * sc / 2 + 3) * S, 0, 0, 7); ctx.stroke(); }
    // label
    const lx = Math.max(2, Math.min(LW - 62, cx - 30)), ly = n <= 2 ? 6 : 4 + (i % 2) * 22;
    rect(lx - 1, ly - 1, 62, 18, "#1b1428"); rect(lx, ly, 60, 16, "#fdf6e3");
    text(e.name.length > 13 ? e.name.slice(0, 12) + "." : e.name, lx + 2, ly + 2, 4);
    const shown = lerpTo(e, Math.max(0, e.hp));
    bar(lx + 2, ly + 9, 56, 3, shown / e.maxhp, hpCol(shown / e.maxhp));
    const tags = [];
    if ((e.shield || 0) > 0) tags.push(["SHIELD " + e.shield, "#2a9bb3"]);
    if ((e.hidden || 0) > 0) tags.push(["HIDDEN", "#7a4fb5"]);
    if ((e.opsonized || 0) > 0) tags.push(["TAGGED", "#d84a8a"]);
    if ((e.clumped || 0) > 0) tags.push(["CLUMPED", "#c0642a"]);
    if (e.resist !== undefined) tags.push(["RESIST " + e.resist, "#b5303a"]);
    tags.forEach(([t, col], j) => text(t, lx + 2 + j * 0, ly + 18 + j * 6, 3.5, col));
  });
  // player cell
  const c = B.cur(), cc = CRE[c.name];
  const shake = BV.anim.find(a => a.fx === "cellhurt"), heal = BV.anim.find(a => a.fx === "heal");
  const sx = 26 + (shake ? Math.round(Math.sin(shake.t * 1.5) * 3) : 0);
  if (B.available(c) || c.hp <= 0) img(cc, sx, 128 - cc.height * 2.2, 2.2, c.hp <= 0 ? 0.3 : 1);
  if (heal && heal.t < 20) { ctx.globalAlpha = 0.35; rect(0, 0, LW, LH, "#7cf0a0"); ctx.globalAlpha = 1; }
  // player box
  rect(118, 96, 118, 30, "#1b1428"); rect(119, 97, 116, 28, "#fdf6e3");
  text(c.name, 123, 100, 5);
  const ch = lerpTo(c, Math.max(0, c.hp));
  text("HP", 123, 110, 4); bar(135, 110, 70, 4, ch / c.maxhp, hpCol(ch / c.maxhp)); text(`${Math.max(0, c.hp)}/${c.maxhp}`, 208, 109, 4);
  const ready = B.cells.filter(x => x !== c).map(x => x.hp <= 0 ? "x" : B.available(x) ? "o" : "...").join(" ");
  text("TEAM " + ready, 123, 118, 3.5, "#6a5a7a");
  // body + inflammation
  const bodyFlash = BV.anim.find(a => a.fx === "body");
  rect(2, 130, 236, 28, "#1b1428"); rect(3, 131, 234, 26, bodyFlash && bodyFlash.t % 6 < 3 ? "#ffd6d6" : "#fdf6e3");
  const bd = lerpTo("body", Math.max(0, B.body));
  text("MAYA'S BODY", 7, 134, 4); bar(70, 134, 120, 4, bd / 100, hpCol(bd / 100)); text(`${Math.max(0, B.body)}`, 196, 133, 4);
  const inf = lerpTo("inflam", Math.min(100, B.inflam));
  text("INFLAMMATION", 7, 145, 4); bar(70, 145, 120, 4, inf / 100, inf >= TUNE.stormAt ? "#e0524f" : "#f29a4c");
  rect(70 + 120 * TUNE.stormAt / 100, 143, 1, 8, "#1b1428");
  text(`+${Math.round(Math.min(100, B.inflam))}% DMG`, 196, 145, 3.5, "#c0642a");
  text(`ROUND ${B.round}`, 5, 4, 4, "#6a5a7a");
}
function drawTitle() {
  rect(0, 0, LW, LH, "#2a2238");
  for (let i = 0; i < 40; i++) rect((i * 53 + G.tick * 0.3 * (i % 3 + 1)) % LW, (i * 37) % LH, 1, 1, "#5a4a78");
  text("IMMUNE", LW / 2, 22, 14, "#2fb6a8", "center"); text("RESPONSE", LW / 2, 40, 14, "#f2c94c", "center");
  text("a tiny adventure inside Maya", LW / 2, 62, 5, "#d6cde6", "center");
  const row = ["Neutrophil", "Macrophage", "NK Cell", "Killer T Cell", "B Cell"];
  row.forEach((k, i) => img(CRE[k], 22 + i * 40, 78 + Math.round(Math.sin((G.tick + i * 9) / 10) * 2)));
  img(PEOPLE.hero.down[0], LW / 2 - 8, 108);
  if (Math.floor(G.tick / 30) % 2) text("PRESS Z OR TAP A", LW / 2, 134, 6, "#ffffff", "center");
}
function drawEnd() {
  rect(0, 0, LW, LH, "#2a2238");
  text("MAYA IS HEALTHY!", LW / 2, 20, 9, "#4cd06a", "center");
  ["Neutrophil", "Macrophage", "NK Cell", "Killer T Cell", "B Cell"].forEach((k, i) => img(CRE[k], 22 + i * 40, 50 + Math.round(Math.sin((G.tick + i * 9) / 6) * 3)));
  img(PEOPLE.hero.down[Math.floor(G.tick / 10) % 2 ? 1 : 3], LW / 2 - 8, 90);
  text(`Wild germs beaten: ${G.stats.wild}`, LW / 2, 118, 5, "#ffffff", "center");
  text(`Antibiotics wasted: ${G.abxWasted}`, LW / 2, 130, 5, G.abxWasted ? "#f29a4c" : "#4cd06a", "center");
}

// ---------- main loop ----------
function update() {
  G.tick++;
  if (G.bumpCool) G.bumpCool--;
  if (G.mode === "world" && !G.dlg && !G.menu && !G.fade) {
    const p = G.p;
    if (p.moving) { p.t++; if (p.t >= 8) { p.moving = false; arrive(); } }
    if (!p.moving && G.mode === "world" && !G.dlg && !G.menu) { const d = ["up", "down", "left", "right"].find(k => held.has(k)); if (d) tryMove(d); }
  }
  if (G.fade) { G.fade.t++; if (G.fade.t === 20) G.fade.mid(); if (G.fade.t >= 40) G.fade = null; }
}
function draw() {
  ctx.imageSmoothingEnabled = false;
  if (G.mode === "title") drawTitle();
  else if (G.mode === "world") drawWorld();
  else if (G.mode === "flash") { drawWorld(); if (Math.floor(G.flash-- / 3) % 2) rect(0, 0, LW, LH, "#ffffff"); }
  else if (G.mode === "battle" && B) drawBattle();
  else if (G.mode === "end") drawEnd();
  if (G.fade) { ctx.globalAlpha = G.fade.t < 20 ? G.fade.t / 20 : (40 - G.fade.t) / 20; rect(0, 0, LW, LH, "#000"); ctx.globalAlpha = 1; }
}
let last = 0, acc = 0;
function loop(ts) { acc += Math.min(100, ts - last); last = ts; while (acc >= 16.67) { update(); acc -= 16.67; } draw(); requestAnimationFrame(loop); }
say("Press Z or tap A to start");
requestAnimationFrame(t => { last = t; loop(t); });

// test hooks (used by the automated playtest; harmless in play)
G.debug = { enterArea, startWild, bossIntro, get battle() { return B; }, act, mainMenu, setPos: (x, y) => Object.assign(G.p, { x, y, moving: false }) };
})();
