// ===== Immune Response: overworld, menus, battle UI, save, title & ending =====
(() => {
const TS = 16, VW = 15, VH = 10, LW = VW * TS, LH = VH * TS;
const cv = document.getElementById("screen"), ctx = cv.getContext("2d");
const boxText = document.getElementById("boxText"), boxMenu = document.getElementById("boxMenu"), boxHint = document.getElementById("boxHint");
let S = 3;
function resize() {
  const chrome = window.innerWidth <= 520 ? 28 : 48;   // shell + bezel padding (index.html)
  const avail = Math.min(window.innerWidth - 12 - chrome, 960);
  S = Math.max(2, Math.min(4, Math.floor(avail / LW)));
  if (avail / LW < 2) S = avail / LW;
  cv.width = Math.round(LW * S); cv.height = Math.round(LH * S);
  cv.style.width = cv.width + "px"; cv.style.height = cv.height + "px";
  document.getElementById("wrap").style.width = (cv.width + chrome) + "px";
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize); resize();

// ---------- assets ----------
const AREAS = WORLD.AREAS;
const PEOPLE = {}; for (const [k, p] of Object.entries(WORLD.PEOPLE)) PEOPLE[k] = SPR.person(p);
const CRE = {}; for (const [k, f] of Object.entries(SPR.CREATURES)) CRE[k] = f();
const PAL = {
  1: { floor: "#f2c6a0", floorDot: "#e8b48c", floorDot2: "#fbd9ba", path: "#f8dcc0", pathDot: "#e9c6a2", grass: "#e0524f", grassDk: "#a83232", wall: "#e7a08a", wallDk: "#b8644f", wallHi: "#f7c9b8", wallNuc: "#8a3e30", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#f7dcc4", ground: "#e8b48c", decor: "fat" },
  2: { floor: "#f5c6d3", floorDot: "#e9a9bb", floorDot2: "#fde0e8", path: "#fbe3ea", pathDot: "#eec2cf", grass: "#b8d45a", grassDk: "#7f9a2e", wall: "#d98aa3", wallDk: "#a8536f", wallHi: "#f5c2d2", wallNuc: "#7a2f4a", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#fbe0e8", ground: "#e9a9bb", decor: "cilia" },
  3: { floor: "#d6e6ee", floorDot: "#bcd2de", floorDot2: "#eef6fa", path: "#eef3f6", pathDot: "#cfdbe2", grass: "#9b6bd6", grassDk: "#6a3fa3", wall: "#9fb3c4", wallDk: "#6d8396", wallHi: "#d3e0ea", wallNuc: "#4a5d6e", water: "#b5303a", waterHi: "#d9555c", waterCell: "#e8737a", bg: "#e3eef4", ground: "#bcd2de", decor: "stitch" },
};
const TILES = { 1: SPR.makeTiles(PAL[1]), 2: SPR.makeTiles(PAL[2]), 3: SPR.makeTiles(PAL[3]) };
// sprites drawn from PNGs (assets/sprites/, see SPRITES.md) replace the code-drawn ones as they load.
// lw/lh = size on the game's 240x160 grid, so higher-resolution PNGs draw at the same size but sharper.
const sw = c => c.lw || c.width, sh = c => c.lh || c.height;
function loadSprites() {
  const CELLS = { neutrophil: "Neutrophil", macrophage: "Macrophage", nk: "NK Cell", killer_t: "Killer T Cell", b: "B Cell" };
  const UI = { item: ["ITEM", 16], bubble: ["BUBBLE", 9], badge: ["BADGE", 7], sparkle: ["SPARKLE", 7] };
  for (const f of window.SPRITE_FILES || []) {
    const name = f.replace(/\.png$/i, ""), im = new Image();
    im.onload = () => {
      let m;
      const size = (w, h) => { im.lw = w; im.lh = h || w; };
      if ((m = /^cell_(.+)$/.exec(name)) && CELLS[m[1]]) { size(24); CRE[CELLS[m[1]]] = im; }
      else if ((m = /^germ_(.+)$/.exec(name)) && CRE[m[1]]) { size(24); CRE[m[1]] = im; }
      else if ((m = /^boss_(.+)$/.exec(name)) && CRE[m[1]]) { size(32); CRE[m[1]] = im; }
      else if ((m = /^person_(.+)$/.exec(name)) && PEOPLE[m[1]]) {
        const fw = im.width / 4, fh = im.height / 4, sheet = {};
        ["down", "up", "left", "right"].forEach((d, r) => sheet[d] = [0, 1, 2, 3].map(c => {
          const cvs = document.createElement("canvas"); cvs.width = fw; cvs.height = fh;
          cvs.getContext("2d").drawImage(im, c * fw, r * fh, fw, fh, 0, 0, fw, fh); cvs.lw = 16; cvs.lh = 16; return cvs; }));
        PEOPLE[m[1]] = sheet;
      }
      else if ((m = /^tile_water_([123])_([ab])$/.exec(name))) { size(16); TILES[m[1]].water[m[2] === "a" ? 0 : 1] = im; }
      else if ((m = /^tile_([a-z]+)_([123])$/.exec(name)) && TILES[m[2]][m[1]]) { size(16); TILES[m[2]][m[1]] = im; }
      else if ((m = /^ui_(.+)$/.exec(name)) && UI[m[1]]) { size(UI[m[1]][1]); SPR[UI[m[1]][0]] = im; }
      else console.warn("Unknown sprite file (check the name in SPRITES.md):", f);
    };
    im.src = "assets/sprites/" + f;
  }
}
loadSprites();
const JOURNAL = WORLD.JOURNAL, JINFO = Object.fromEntries(JOURNAL.map(j => [j[0], j]));
const SOLID_T = new Set(["#", "~", "o", "G"]);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SAVE_KEY = "immune-response-save-v1";

// ---------- game state ----------
const G = window.__G = {
  mode: "title", area: 1, map: null, ents: [], p: { x: 1, y: 1, dir: "down", moving: false, fx: 0, fy: 0, t: 0, frame: 0 },
  roster: [], bag: {}, memory: { 1: 0, 2: 0, 3: 0 }, abxWasted: 0, tookAbx: false, pharmTalked: false,
  beaten: {}, flags: {}, journal: {}, stats: { wild: 0, captains: 0, bosses: 0, items: 0, playMs: 0 },
  steps: 0, lymph: null, tick: 0, toast: null, view: null, trans: null, fade: null, approach: null,
};
const sfx = n => SND.sfx(n);

function tileAt(x, y) { return (G.map[y] && G.map[y][x]) || "#"; }
function setTile(x, y, ch) { G.map[y] = G.map[y].slice(0, x) + ch + G.map[y].slice(x + 1); }
function find(ch) { for (let y = 0; y < G.map.length; y++) { const x = G.map[y].indexOf(ch); if (x >= 0) return { x, y }; } }
function entAt(x, y) { return G.ents.find(e => !e.gone && e.x === x && e.y === y); }
function blocked(x, y) {
  if (SOLID_T.has(tileAt(x, y))) return true;
  const e = entAt(x, y); return !!e && !(e.type === "item" && e.hidden);
}
function under(x, y) {     // ground to draw beneath a person/sign: copy a neighbour
  const nb = [tileAt(x - 1, y), tileAt(x + 1, y), tileAt(x, y - 1), tileAt(x, y + 1)];
  if (nb.includes("+")) return "+"; if (nb[0] === "," || nb[1] === ",") return ","; return ".";
}
const captains = () => G.ents.filter(e => e.type === "captain");
const captainsLeft = () => captains().filter(e => !G.flags["cap:" + e.id]).length;

// ---------- areas ----------
function enterArea(n, opts = {}) {
  G.area = n; const A = AREAS[n];
  G.map = A.map.slice(); G.ents = [];
  for (let y = 0; y < G.map.length; y++) for (let x = 0; x < G.map[y].length; x++) {
    const ch = G.map[y][x];
    if (ch === "@") { G.start = { x, y }; setTile(x, y, under(x, y)); }
    else if (ch === "B") { G.ents.push({ type: "boss", id: "boss" + n, x, y }); setTile(x, y, "."); }
    else if (A.ents[ch]) { G.ents.push(Object.assign({ ch, id: n + ch, x, y, ox: x, oy: y }, A.ents[ch])); setTile(x, y, under(x, y)); }
  }
  G.lymph = find("L"); applyFlags();
  if (!opts.load) Object.assign(G.p, { x: G.start.x, y: G.start.y, dir: "down", moving: false });
  G.mode = "world"; G.steps = 0; G.approach = null;
  G.toast = { text: A.name, sub: A.sub, t: 0 };
  SND.music(A.music);
}
function applyFlags() {
  for (const e of G.ents) {
    if (e.type === "item" && G.flags["item:" + e.id]) e.gone = true;
    if (e.type === "boss" && G.beaten[G.area]) e.gone = true;
  }
  if (!captainsLeft()) { const g = find("G"); if (g) setTile(g.x, g.y, "."); }
}
function joinCells(n) {
  const avg = G.roster.length ? G.roster.reduce((s, c) => s + c.lv, 0) / G.roster.length : TUNE.startLv;
  for (const name of AREAS[n].join) if (!G.roster.some(c => c.name === name))
    G.roster.push(makeCell(name, Math.max(TUNE.joinLv[n] || TUNE.startLv, Math.round(avg) - 1)));
}
function refillBag() { for (const [k, v] of Object.entries(AREAS[G.area].bag)) G.bag[k] = Math.max(G.bag[k] || 0, v); }
function healAll() { G.roster.forEach(c => c.hp = c.maxhp); refillBag(); }
function startArea(n) {
  enterArea(n); joinCells(n); healAll();
  const lines = AREAS[n].intro.slice();
  if (n === 3 && G.bag.Antibiotic) {   // the superbug already resists the plain stuff
    G.bag["Old Antibiotic"] = (G.bag["Old Antibiotic"] || 0) + G.bag.Antibiotic; delete G.bag.Antibiotic;
    lines.splice(2, 0, "Tech Lee: Those antibiotics from the pharmacy? This superbug resists them. They count as OLD ANTIBIOTICS now.");
  }
  dialog(lines, () => { clearBox(); writeSave(); });
}

// ---------- input ----------
const held = new Set();
const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
window.addEventListener("keydown", e => {
  if (KEYMAP[e.key]) { e.preventDefault(); held.add(KEYMAP[e.key]); if (!e.repeat) menuNav(KEYMAP[e.key]); }
  if (["z", "Z", "Enter", " "].includes(e.key)) { e.preventDefault(); if (!e.repeat) press("A"); }
  if (["x", "X", "Escape", "Backspace"].includes(e.key)) { e.preventDefault(); if (!e.repeat) press("B"); }
});
window.addEventListener("keyup", e => { if (KEYMAP[e.key]) { held.delete(KEYMAP[e.key]); G.noBump = false; } });
document.querySelectorAll("[data-dir]").forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener("pointerdown", e => { e.preventDefault(); held.add(d); menuNav(d); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { held.delete(d); G.noBump = false; }));
});
document.getElementById("btnA").addEventListener("pointerdown", e => { e.preventDefault(); press("A"); });
document.getElementById("btnB").addEventListener("pointerdown", e => { e.preventDefault(); press("B"); });
cv.addEventListener("pointerdown", () => { if (G.dlg) press("A"); });
boxText.addEventListener("pointerdown", () => { if (G.dlg) press("A"); });

function busy() { return G.trans || G.fade || G.approach; }
function press(k) {
  if (G.dlg) { if (k === "A") advanceDialog(); return; }
  if (G.menu) {
    if (k === "A") { const b = boxMenu.querySelectorAll("button:not([disabled])")[G.menuFocus]; if (b) b.click(); }
    else if (k === "B" && G.menu.back) { sfx("blip"); G.menu.back(); }
    return;
  }
  if (G.mode === "world" && !G.p.moving && !busy()) {
    if (k === "A") { const [dx, dy] = DIRV[G.p.dir]; interact(G.p.x + dx, G.p.y + dy); }
    if (k === "B") startMenu();
  }
}

// ---------- dialog & menus (DOM text box) ----------
// lines can be strings or {t, sfx, jingle} objects
function dialog(lines, done) {
  G.dlg = { lines: lines.slice(), i: 0, done };
  G.menu = null; boxMenu.innerHTML = ""; boxHint.textContent = "";
  showLine();
}
function showLine() {
  const L = G.dlg.lines[G.dlg.i], s = typeof L === "string" ? L : L.t;
  if (L.sfx) sfx(L.sfx);
  if (L.jingle) SND.jingle(L.jingle, G.mode === "battle" ? null : AREAS[G.area].music);
  G.type = { s, i: 0 }; boxText.textContent = ""; boxText.classList.remove("more");
}
function finishType() { boxText.textContent = G.type.s; G.type = null; boxText.classList.add("more"); }
function advanceDialog() {
  if (G.type) return finishType();
  const d = G.dlg; d.i++;
  if (d.i < d.lines.length) return showLine();
  G.dlg = null; boxText.classList.remove("more"); G.noBump = true;
  if (d.done) d.done(); else clearBox();
}
function say(text) { G.type = null; boxText.textContent = text; boxText.classList.remove("more"); }
function menu(prompt, items, opts = {}) {
  G.dlg = null; G.type = null; boxText.classList.remove("more");
  boxText.textContent = prompt; boxMenu.innerHTML = ""; boxHint.textContent = opts.hint || "";
  G.menu = { back: opts.back };
  boxMenu.className = opts.cols === 1 ? "one" : "";
  items.forEach(it => {
    const b = document.createElement("button");
    b.innerHTML = it.html || it.label; if (it.disabled) b.disabled = true;
    if (it.cls) b.classList.add(it.cls);
    b.addEventListener("click", () => { if (!it.disabled) { sfx("select"); G.menu = null; it.fn(); } });
    b.addEventListener("mouseenter", () => { boxHint.textContent = it.hint || opts.hint || ""; });
    boxMenu.appendChild(b);
  });
  if (opts.back) {
    const b = document.createElement("button"); b.textContent = "BACK"; b.className = "back";
    b.addEventListener("click", () => { sfx("blip"); G.menu = null; opts.back(); }); boxMenu.appendChild(b);
  }
  G.menuItems = items; G.menuFocus = Math.min(opts.focus || 0, Math.max(0, boxMenu.querySelectorAll("button:not([disabled])").length - 1)); focusMenu();
}
function focusMenu() {
  const bs = [...boxMenu.querySelectorAll("button:not([disabled])")];
  bs.forEach((b, i) => b.classList.toggle("focus", i === G.menuFocus));
  const items = G.menuItems || [], b = bs[G.menuFocus];
  if (b) { const it = items[[...boxMenu.children].indexOf(b)]; if (it && it.hint) boxHint.textContent = it.hint; if (b.scrollIntoView) b.scrollIntoView({ block: "nearest" }); }
}
function menuNav(d) {
  if (!G.menu) return false;
  const n = boxMenu.querySelectorAll("button:not([disabled])").length; if (!n) return true;
  const cols = boxMenu.className === "one" ? 1 : 2;
  const step = { left: -1, right: 1, up: -cols, down: cols }[d];
  G.menuFocus = (G.menuFocus + step + n) % n; focusMenu(); sfx("blip"); return true;
}
function clearBox() { G.menu = null; G.dlg = null; G.type = null; G.view = null; boxMenu.innerHTML = ""; boxText.textContent = ""; boxHint.textContent = ""; boxText.classList.remove("more"); }
const UP = s => s.toUpperCase();

// ---------- start menu ----------
function startMenu(focus) {
  G.view = null; sfx("select");
  const seen = Object.keys(G.journal).length;
  menu(`${AREAS[G.area].name}   Captains beaten ${captains().length - captainsLeft()}/${captains().length}   Memory ${G.memory[G.area]}/3`, [
    { label: "TEAM", fn: teamMenu, hint: "Your cells: levels, HP and moves. Pick who leads." },
    { label: "BAG", fn: bagView, hint: "Check and use your items." },
    { label: "JOURNAL", fn: () => journalMenu(), hint: `Germ Journal: ${seen}/${JOURNAL.length} germs seen.` },
    { label: "SAVE", fn: () => { const ok = writeSave(); sfx("save"); dialog([ok ? "Game saved! Choose CONTINUE on the title screen to keep playing." : "Couldn't save: this browser is blocking storage."], clearBox); }, hint: "Save your game in this browser." },
    { label: SND.isOn() ? "SOUND: ON" : "SOUND: OFF", fn: () => { SND.toggle(); startMenu(4); }, hint: "Turn music and sound effects on or off." },
    { label: "CLOSE", fn: clearBox, hint: "Back to the game." },
  ], { back: clearBox, focus });
}
function teamMenu() {
  G.view = null;
  menu("TEAM (the first cell leads in battle)", G.roster.map((c, i) => ({
    html: `${UP(c.name)} <span class=r>Lv ${c.lv} &middot; ${Math.max(0, c.hp)}/${c.maxhp} HP</span>`,
    fn: () => cellDetail(i), hint: CELL_DEFS[c.name].blurb, cls: c.hp <= 0 ? "dead" : "" })), { cols: 1, back: () => startMenu(0) });
}
function cellDetail(i) {
  const c = G.roster[i]; G.view = { kind: "cell", key: c.name, lv: c.lv };
  const next = (CELL_DEFS[c.name].learn || []).find(([l]) => l > c.lv);
  const items = c.moves.map(m => ({ html: `${UP(m.name)}<span class=r>${m.pp > 50 ? "&infin;" : m.pp + " uses"}</span>`, fn: () => cellDetail(i),
    hint: `${m.type === "Signal" ? "Support" : m.type + " " + m.power}: ${m.desc}` }));
  if (i > 0) items.push({ label: "MAKE LEADER", cls: "act", fn: () => { G.roster.unshift(G.roster.splice(i, 1)[0]); teamMenu(); }, hint: "This cell goes first in every battle." });
  menu(`${UP(c.name)}  Lv ${c.lv}   HP ${Math.max(0, c.hp)}/${c.maxhp}   ATK ${Math.round(c.atk)}  DEF ${Math.round(c.df)}\n` +
    (c.lv >= TUNE.maxLv ? "MAX LEVEL!" : `XP ${c.xp}/${xpToNext(c.lv)}`) + (next ? `   Learns ${UP(next[1].name)} at Lv ${next[0]}` : ""),
    items, { cols: 1, back: teamMenu });
}
function bagView() {
  const items = Object.entries(G.bag).filter(([, n]) => n > 0).map(([it, n]) => ({
    html: `${UP(it)}<span class=r>x${n}</span>`, hint: ITEM_INFO[it],
    fn: () => {
      if (it === "Healthy Snack") {
        G.bag[it]--; G.roster.forEach(c => { if (c.hp > 0) c.hp = Math.min(c.maxhp, c.hp + 25); });
        sfx("heal"); return dialog(["Your cells munched the snack. Every cell +25 HP!"], bagView);
      }
      dialog([`${it}: ${ITEM_INFO[it]}`, "Save it for battle!"], bagView);
    } }));
  if (!items.length) return menu("The bag is empty.", [], { back: () => startMenu(1) });
  menu("BAG (items refill at a lymph node)", items, { cols: 1, back: () => startMenu(1) });
}
function journalMenu(focus) {
  G.view = null;
  const items = JOURNAL.map(([k, name, type]) => {
    const j = G.journal[k];
    return j ? { html: `${UP(name)}<span class=r>${type} &middot; beaten ${j.beaten || 0}</span>`, fn: () => journalEntry(k), hint: "Read about this germ." }
      : { html: `?????????<span class=r>not seen yet</span>`, disabled: true };
  });
  menu(`GERM JOURNAL: ${Object.keys(G.journal).length}/${JOURNAL.length} seen`, items, { cols: 1, back: () => startMenu(2), focus });
}
function journalEntry(k) {
  const [, name, type, fact] = JINFO[k]; G.view = { kind: "germ", key: k };
  const seenKeys = JOURNAL.filter(j => G.journal[j[0]]).map(j => j[0]);
  menu(`${UP(name)} (${type})\n${fact}`, [], { back: () => journalMenu(seenKeys.indexOf(k)) });
}
function seeGerm(e) { const k = e.sprite; if (!G.journal[k]) G.journal[k] = { beaten: 0 }; }

// ---------- save / load ----------
function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, area: G.area, p: { x: G.p.x, y: G.p.y, dir: G.p.dir },
      roster: G.roster.map(c => ({ name: c.name, lv: c.lv, xp: c.xp, hp: c.hp })), bag: G.bag, memory: G.memory,
      abxWasted: G.abxWasted, tookAbx: G.tookAbx, pharmTalked: G.pharmTalked, beaten: G.beaten, flags: G.flags,
      journal: G.journal, stats: G.stats, cleared: !!G.cleared }));
    return true;
  } catch (e) { return false; }
}
function readSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function loadGame(d) {
  clearBox();
  Object.assign(G, { bag: d.bag || {}, memory: d.memory || { 1: 0, 2: 0, 3: 0 }, abxWasted: d.abxWasted || 0, tookAbx: !!d.tookAbx, pharmTalked: !!d.pharmTalked,
    beaten: d.beaten || {}, flags: d.flags || {}, journal: d.journal || {}, stats: Object.assign({ wild: 0, captains: 0, bosses: 0, items: 0, playMs: 0 }, d.stats), cleared: !!d.cleared });
  G.roster = d.roster.map(r => { const c = makeCell(r.name, r.lv); c.xp = r.xp || 0; c.hp = Math.max(0, Math.min(c.maxhp, r.hp)); return c; });
  enterArea(d.area, { load: true });
  const ok = d.p && !blocked(d.p.x, d.p.y);
  Object.assign(G.p, ok ? { x: d.p.x, y: d.p.y, dir: d.p.dir || "down" } : { x: G.start.x, y: G.start.y, dir: "down" }, { moving: false });
  G.fade = { t: 20, mid: () => {} };
  say("Welcome back! Press X for the menu.");
}
function newGame() {
  clearBox();
  Object.assign(G, { roster: [], bag: {}, memory: { 1: 0, 2: 0, 3: 0 }, abxWasted: 0, tookAbx: false, pharmTalked: false, beaten: {}, flags: {}, journal: {},
    stats: { wild: 0, captains: 0, bosses: 0, items: 0, playMs: 0 }, cleared: false });
  G.fade = { t: 0, mid: () => startArea(1) };
}

// ---------- overworld ----------
function interact(x, y) {
  const e = entAt(x, y), t = tileAt(x, y);
  if (e) {
    if (e.type === "npc") return e.special === "pharmacist" ? pharmacist() : dialog(e.lines);
    if (e.type === "sign") return dialog(e.lines);
    if (e.type === "item") return pickup(e);
    if (e.type === "captain") return talkCaptain(e);
    if (e.type === "boss") return bossIntro(e);
  }
  if (t === "G") { const n = captains().length; return dialog([`Swollen tissue blocks the way. Beat all the GERM CAPTAINS here to shrink it! (${n - captainsLeft()}/${n} beaten)`]); }
  const h = entAt(G.p.x, G.p.y); if (h && h.type === "item") return pickup(h);
}
function pickup(e) {
  e.gone = true; G.flags["item:" + e.id] = true; G.stats.items++;
  G.bag[e.item] = (G.bag[e.item] || 0) + e.n; sfx("item");
  dialog([`${e.hidden ? "Something was hidden here! " : ""}You found ${e.n} ${UP(e.item)}${e.n > 1 ? "S" : ""}!`, ITEM_INFO[e.item]]);
}
function pharmacist() {
  if (G.pharmTalked) return dialog([G.tookAbx ? "Pharmacist: Hope those antibiotics help... (Do they work on a virus?)" : "Pharmacist: Rest and fluids help most with the flu. Feel better!"]);
  dialog(["Pharmacist: Hey! Want some antibiotics for that cough? Lots of people ask for them."], () => {
    menu("Take the antibiotics?", [
      { label: "YES, PLEASE", fn: () => { G.tookAbx = true; G.pharmTalked = true; G.bag.Antibiotic = (G.bag.Antibiotic || 0) + 2; sfx("item"); dialog(["You got 2 ANTIBIOTICS!"]); } },
      { label: "NO THANKS", fn: () => { G.pharmTalked = true; dialog(["Pharmacist: Smart. Antibiotics only kill bacteria, and the flu is a virus."]); } },
    ]);
  });
}
function tryMove(dir) {
  const p = G.p; p.dir = dir; const [dx, dy] = DIRV[dir], nx = p.x + dx, ny = p.y + dy;
  if (blocked(nx, ny)) {
    if (!G.bumpCool) { G.bumpCool = 14; sfx("bump"); const e = entAt(nx, ny);
      if (!G.noBump && ((e && e.type !== "item") || tileAt(nx, ny) === "G")) interact(nx, ny); }
    return;
  }
  p.moving = true; p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0; p.frame++;
}
function lineOfSight(e) {
  const [dx, dy] = DIRV[e.dir];
  for (let i = 1; i <= e.range; i++) {
    const x = e.x + dx * i, y = e.y + dy * i;
    if (x === G.p.x && y === G.p.y) return true;
    if (blocked(x, y)) return false;
  }
  return false;
}
function arrive() {
  const p = G.p, t = tileAt(p.x, p.y); G.steps++;
  const spotter = captains().find(e => !G.flags["cap:" + e.id] && lineOfSight(e));
  if (spotter) { sfx("spot"); G.approach = { e: spotter, t: 0 }; return; }
  const h = entAt(p.x, p.y); if (h && h.type === "item" && h.hidden) return pickup(h);
  if (t === ",") { if (G.steps >= 4 && Math.random() < 0.13) { G.steps = 0; return startWild(); } }
  else if (t === "L") {
    G.lymph = { x: p.x, y: p.y };
    const hurt = G.roster.some(c => c.hp < c.maxhp) || Object.entries(AREAS[G.area].bag).some(([k, v]) => (G.bag[k] || 0) < v);
    healAll();
    if (hurt) { sfx("heal"); dialog(["LYMPH NODE: immune cells gather here to rest and get ready.", "Your team is fully healed and your bag is refilled!"]); }
  } else if (t === ">") {
    if (G.area < 3) { const n = G.area + 1; G.fade = { t: 0, mid: () => startArea(n) }; return; }
    return ending();
  }
}
function stepApproach() {   // a captain spotted you: "!" then walk over
  const A = G.approach, e = A.e; A.t++;
  if (A.t < 40) return;
  if (e.moving) { e.mt++; if (e.mt >= 8) e.moving = false; return; }
  const dist = Math.abs(e.x - G.p.x) + Math.abs(e.y - G.p.y);
  if (dist > 1) { const [dx, dy] = DIRV[e.dir]; Object.assign(e, { px: e.x, py: e.y, moving: true, mt: 0 }); e.x += dx; e.y += dy; return; }
  G.approach = null;
  G.p.dir = e.x < G.p.x ? "left" : e.x > G.p.x ? "right" : e.y < G.p.y ? "up" : "down";
  talkCaptain(e);
}
function talkCaptain(e) {
  if (G.flags["cap:" + e.id]) return dialog(e.after);
  SND.music("battle");
  dialog(e.intro, () => startBattle(e.team.map(k => spawn(k, G.area)), { captain: e }, [`${e.name} sent out ${e.team.length} germs!`]));
}

// ---------- battle flow ----------
let B = null;            // engine battle
const BV = { enemies: [], anim: [], hp: new Map(), born: new Map(), introT: 0, ctx: {} };
function startWild() {
  const tbl = AREAS[G.area].wild, tot = tbl.reduce((s, [, w]) => s + w, 0); let r = Math.random() * tot, key = tbl[0][0];
  for (const [k, w] of tbl) { if ((r -= w) < 0) { key = k; break; } }
  const e = spawnWild(key, G.area);
  startBattle([e], { wild: true }, [`A wild ${UP(e.name)} appeared!`]);
}
function bossIntro() {
  const A = AREAS[G.area];
  let lines = A.boss.intro;
  if (G.area === 3) lines = G.abxWasted > 0
    ? ["SUPERBUG COLONY: Remember those antibiotics used on the flu?", "They didn't hurt the virus one bit... but they gave us bacteria PRACTICE.", `I'm tougher now! (Boss gets +${TUNE.wastedBossHP * G.abxWasted} HP and more resistance.)`]
    : ["SUPERBUG COLONY: Nobody wasted antibiotics on the flu, huh?", "Doesn't matter. My biofilm makes me unstoppable!"];
  SND.music("boss");
  dialog(lines, () => startBattle(A.boss.team.map(k => spawn(k, G.area, 1 + G.abxWasted)), { boss: true }, [`The ${A.boss.name} attacks!`]));
}
function startBattle(enemies, bctx, intro) {
  clearBox(); sfx("encounter"); SND.music(bctx.boss ? "boss" : "battle");
  G.trans = { t: 0, go: () => {
    B = new Battle({ enemies, cells: G.roster, bag: G.bag, wild: !!bctx.wild, level: G.area, memory: bctx.boss ? G.memory[G.area] : 0, onAbxWasted: () => G.abxWasted++ });
    Object.assign(BV, { enemies: B.enemies.slice(), anim: [], hp: new Map(), born: new Map(), introT: 0, ctx: bctx, snap: null });
    B.enemies.forEach(seeGerm);
    G.mode = "battle";
    const mem = bctx.boss && G.memory[G.area] ? [{ t: `Immune Memory ${G.memory[G.area]}/3: your cells hit ${G.memory[G.area] * 5}% harder vs. the boss!` }] : [];
    playLog(intro.map(t => ({ t })).concat(mem), mainMenu);
  } };
}
const FX_SFX = { hurt: "hit", cellhurt: "hurt", faint: "faint", heal: "heal", body: "body", spawn: "spawn", shield: "shield", arrive: "arrive", drug: "drug", item: "item", swap: "select" };
function playLog(log, done) {
  if (!log.length) return done();
  const [m, ...rest] = log;
  if (m.snap) BV.snap = m.snap;
  if (m.fx) { BV.anim.push(Object.assign({ t: 0 }, m)); sfx(m.fx === "attack" ? m.mt : FX_SFX[m.fx]); }
  if (m.fx === "spawn" || m.fx === "faint") syncEnemies();
  dialog([m.t], () => playLog(rest, done));
}
function syncEnemies() {
  BV.enemies = B.enemies.concat(BV.enemies.filter(e => e.hp <= 0 && !B.enemies.includes(e)));
  for (const e of B.enemies) if (!BV.born.has(e)) { BV.born.set(e, G.tick); seeGerm(e); }
}
function cellName() { return UP(B.cur().name); }
function mainMenu() {
  BV.snap = null; syncEnemies();
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
    { label: "RUN", fn: () => act({ k: "run" }), disabled: !B.wild, hint: B.wild ? "Get away from a wild germ." : "You can't run from this fight!" },
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
    return { html: `${UP(m.name)}<span class="tag ${tag.cls}">${tag.tag}</span><span class=r>${pp}</span>`, disabled: !usable,
      hint: `${m.type === "Signal" ? "Support" : m.type + " " + m.power}${m.aoe ? " (all)" : ""}: ${m.desc}`, fn: () => pickTarget(m) };
  });
  menu(`${cellName()}'s moves:`, items, { back: mainMenu, cols: 1 });
}
function pickTarget(m) {
  const acts = B.actions().filter(a => a.k === "move" && a.m === m);
  if (acts.length === 1) return act(acts[0]);
  menu("Pick a target:", acts.map(a => { const h = hintFor(m, a.e), i = B.enemies.indexOf(a.e) + 1;
    return { html: `${i}. ${UP(a.e.name)} <span class="tag ${h.cls}">${h.tag}</span><span class=r>${Math.max(0, a.e.hp)} HP</span>`, fn: () => act(a), hint: TYPE_NAME[a.e.type] }; }), { back: fightMenu, cols: 1 });
}
function bagMenu() {
  const acts = B.actions();
  const items = Object.entries(B.bag).filter(([, n]) => n > 0).map(([it, n]) => {
    const usable = acts.some(a => a.k === "item" && a.it === it);
    const locked = it === "Targeted Antibiotic" && !B.cultured;
    return { html: `${UP(it)}<span class=r>x${n}</span>`, disabled: !usable, hint: locked ? "Locked: use LAB CULTURE first." : ITEM_INFO[it], fn: () => {
      const ia = acts.filter(a => a.k === "item" && a.it === it);
      if (ia.length === 1) return act(ia[0]);
      menu("Use it on:", ia.map(a => ({ html: `${B.enemies.indexOf(a.e) + 1}. ${UP(a.e.name)}<span class=r>${TYPE_NAME[a.e.type]}</span>`, fn: () => act(a), hint: TYPE_NAME[a.e.type] })), { back: bagMenu, cols: 1 });
    } };
  });
  if (!items.length) return menu("The bag is empty.", [], { back: mainMenu });
  menu("Bag:", items, { back: mainMenu, cols: 1 });
}
function cellsMenu() {
  const acts = B.actions();
  menu("Switch to:", B.cells.map((c, i) => {
    const a = acts.find(x => x.k === "swap" && x.i === i);
    const st = c.hp <= 0 ? "worn out" : i === B.active ? "in battle" : B.available(c) ? "ready" : `arrives round ${B.arrivalRound(c)}`;
    return { html: `${UP(c.name)} Lv${c.lv} <span class=r>${Math.max(0, c.hp)}/${c.maxhp} &middot; ${st}</span>`, disabled: !a, hint: CELL_DEFS[c.name].blurb, fn: () => act(a) };
  }), { back: mainMenu, cols: 1 });
}
function act(a) { clearBox(); BV.snap = B.snap(); const log = a ? B.step(a) : B.waitRound(); playLog(log, mainMenu); }
function endBattle() {
  const res = B.over, bc = BV.ctx, music = AREAS[G.area].music;
  for (const e of B.defeated) { seeGerm(e); G.journal[e.sprite].beaten++; }
  if (res === "run") { SND.music(music); return backToWorld(); }
  if (res === "lose") {
    if (bc.captain) Object.assign(bc.captain, { x: bc.captain.ox, y: bc.captain.oy, moving: false });
    return dialog(["Your cells are too tired to keep going...", "They retreat to the lymph node to rest. Try again!"], () => {
      healAll(); Object.assign(G.p, { x: G.lymph.x, y: G.lymph.y, dir: "down", moving: false }); SND.music(music); backToWorld();
    });
  }
  // ---- win: XP, level ups, rewards ----
  const lines = [{ t: bc.boss ? `You beat the ${AREAS[G.area].boss.name}!` : bc.captain ? `You beat ${bc.captain.name}!` : "You won!", jingle: "victory" }];
  const xp = Math.round(B.xpEarned() * (bc.captain ? 1.5 : 1));
  if (xp > 0) {
    lines.push(`Your cells gained ${xp} XP!`);
    for (const c of G.roster) for (const ev of gainXP(c, c.hp > 0 ? xp : xp * TUNE.faintedXP)) {
      if (ev.lv) lines.push({ t: `${UP(c.name)} grew to Lv ${ev.lv}!`, sfx: "arrive" });
      if (ev.learned) lines.push({ t: `${UP(c.name)} learned ${UP(ev.learned)}!`, sfx: "heal" });
    }
  }
  if (bc.wild) {
    G.stats.wild++;
    if (G.memory[G.area] < 3) { G.memory[G.area]++; lines.push(`Your cells remember this germ! Immune Memory ${G.memory[G.area]}/3 (+5% damage vs. the boss).`); }
    if (G.roster.every(c => c.hp <= 0)) lines.push("Your team is worn out. Find a lymph node!");
    return dialog(lines, () => { SND.music(music); backToWorld(); });
  }
  if (bc.captain) {
    G.stats.captains++; G.flags["cap:" + bc.captain.id] = true;
    lines.push(bc.captain.after[0]);
    if (!captainsLeft()) { const g = find("G"); if (g) { setTile(g.x, g.y, "."); lines.push({ t: "Far away, the swollen gate shrinks down. The boss's lair is open!", sfx: "gate" }); } }
    else lines.push(`Captains left in this area: ${captainsLeft()}.`);
    return dialog(lines, () => { SND.music(music); backToWorld(); writeSave(); });
  }
  if (!bc.boss) return dialog(lines, () => { SND.music(music); backToWorld(); });
  G.stats.bosses++; G.beaten[G.area] = true; applyFlags();
  if (G.area === 3) return dialog(lines, ending);
  dialog(lines.concat(AREAS[G.area].boss.win), () => { SND.music(music); backToWorld(); writeSave(); });
}
function backToWorld() { B = null; clearBox(); G.mode = "world"; G.steps = 0; G.fade = { t: 20, mid: () => {} }; }

// ---------- title & ending ----------
function titleMenu() {
  G.mode = "title"; G.view = null; SND.music("title");
  const save = readSave();
  const items = [];
  if (save) items.push({ label: "CONTINUE", fn: () => loadGame(save), hint: `Saved in Area ${save.area}: ${AREAS[save.area].name}. Team Lv ${Math.max(...save.roster.map(r => r.lv))}.` });
  items.push({ label: "NEW GAME", hint: "Start a brand new adventure inside Maya.", fn: () => {
    if (!save) return newGame();
    menu("Start over? Your old save is replaced the next time the game saves.", [{ label: "YES, START OVER", fn: newGame }, { label: "NO", fn: titleMenu }]);
  } });
  items.push({ label: "LEVEL SELECT", hint: "Jump straight to any area with a ready-made team.", fn: levelSelect });
  items.push({ label: SND.isOn() ? "SOUND: ON" : "SOUND: OFF", fn: () => { SND.toggle(); titleMenu(); }, hint: "Turn music and sound effects on or off." });
  menu("Arrows/WASD move. Z = A (talk, confirm). X = B (back, menu).", items, { cols: 1 });
}
const LEVEL_INFO = {
  1: "Maya scraped her knee. Team: Neutrophil + Macrophage. Learn type matchups and Immune Memory.",
  2: "Maya has the flu. Team adds NK Cell + Killer T Cell. Watch out for the pharmacist's offer!",
  3: "Maya's stitches are infected with a superbug. Full team of 5. Culture, clean, then the targeted drug.",
};
const levelStartLv = n => n === 1 ? TUNE.startLv : TUNE.joinLv[n];
function levelSelect(focus) {
  G.view = null;
  menu("LEVEL SELECT: pick an area to play", [1, 2, 3].map(n => ({
    html: `AREA ${n}: ${AREAS[n].name}<span class=r>${AREAS[n].sub} &middot; team Lv ${levelStartLv(n)}</span>`,
    hint: LEVEL_INFO[n], fn: () => {
      if (!readSave()) return startLevel(n);
      menu(`Play AREA ${n}? Your old save is replaced the next time the game saves.`, [{ label: "YES, PLAY IT", fn: () => startLevel(n) }, { label: "NO", fn: () => levelSelect(n - 1) }]);
    } })), { cols: 1, back: titleMenu, focus });
}
function startLevel(n) {
  newGame();
  const lv = levelStartLv(n);
  for (let i = 1; i <= n; i++) { if (i < n) G.beaten[i] = true; for (const name of AREAS[i].join) G.roster.push(makeCell(name, lv)); }
  G.fade = { t: 0, mid: () => startArea(n) };
}
function ending() {
  B = null; G.mode = "end"; G.cleared = true; G.credT = 0; SND.music("ending"); writeSave();
  const lv = Math.round(G.roster.reduce((s, c) => s + c.lv, 0) / G.roster.length);
  const mins = Math.max(1, Math.round(G.stats.playMs / 60000));
  dialog([
    "MAYA IS HEALTHY AGAIN! You beat all 3 infections.",
    `Wild germs beaten: ${G.stats.wild}. Germ captains beaten: ${G.stats.captains}. Average team level: ${lv}.`,
    `Germs in your journal: ${Object.keys(G.journal).length}/${JOURNAL.length}. Play time: about ${mins} min.`,
    `Antibiotics wasted on the flu: ${G.abxWasted}.`,
    G.abxWasted ? "Those wasted antibiotics made the Superbug tougher. In real life, using antibiotics when they can't help gives bacteria more chances to become resistant." :
      "You never wasted antibiotics on a virus. That's exactly how real doctors fight resistance!",
    "Real world: drug-resistant infections directly caused about 1.27 million deaths in 2019.",
    "Remember: antibiotics kill bacteria, not viruses. Only use them when a doctor prescribes them.",
    "THE END. Thanks for playing IMMUNE RESPONSE!"],
  () => menu("Play again?", [{ label: "BACK TO TITLE", fn: () => { clearBox(); G.fade = { t: 0, mid: titleMenu }; } }]));
}

// ---------- drawing helpers ----------
function img(c, x, y, sc = 1, alpha = 1) { ctx.globalAlpha = alpha; ctx.drawImage(c, Math.round(x * S), Math.round(y * S), Math.round(sw(c) * sc * S), Math.round(sh(c) * sc * S)); ctx.globalAlpha = 1; }
function rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); }
function text(s, x, y, size = 6, col = "#1b1428", align = "left") {
  ctx.font = `${Math.round(size * S)}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = "top";
  ctx.fillText(s, Math.round(x * S), Math.round(y * S));
}
function panel(x, y, w, h, fill = "#fdf6e3") { rect(x - 1, y - 1, w + 2, h + 2, "#1b1428"); rect(x, y, w, h, fill); }
function bar(x, y, w, h, frac, col, back = "#3a3045") { rect(x - 1, y - 1, w + 2, h + 2, "#1b1428"); rect(x, y, w, h, back); rect(x, y, Math.max(0, Math.min(1, frac)) * w, h, col); }
function hpCol(f) { return f > 0.5 ? "#4cd06a" : f > 0.25 ? "#f2c94c" : "#e0524f"; }
function lerpTo(key, v, max) { const cur = BV.hp.has(key) ? BV.hp.get(key) : v, sp = Math.max(1.2, (max || 100) / 60); const n = cur + Math.sign(v - cur) * Math.min(Math.abs(v - cur), sp); BV.hp.set(key, n); return n; }
const shownHP = x => { const s = BV.snap && BV.snap.hp.get(x); return Math.max(0, s ? s.hp : x.hp); };
const shownShield = x => { const s = BV.snap && BV.snap.hp.get(x); return s ? s.shield : (x.shield || 0); };
const shownBody = () => Math.max(0, BV.snap ? BV.snap.body : B.body), shownInflam = () => BV.snap ? BV.snap.inflam : B.inflam;
const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

// ---------- overworld drawing ----------
function drawWorld() {
  const p = G.p, T = TILES[G.area];
  const k = p.moving ? Math.min(1, p.t / 8) : 1;
  const px = (p.moving ? p.fx + (p.x - p.fx) * k : p.x) * TS, py = (p.moving ? p.fy + (p.y - p.fy) * k : p.y) * TS;
  const mw = G.map[0].length * TS, mh = G.map.length * TS;
  const camX = Math.round(Math.max(0, Math.min(mw - LW, px - LW / 2 + 8))), camY = Math.round(Math.max(0, Math.min(mh - LH, py - LH / 2 + 8)));
  const wf = Math.floor(G.tick / 30) % 2;
  const TILE = { "#": T.wall, ",": T.grass, "=": T.path, "+": T.hub, L: T.lymph, G: T.gate, ">": T.exit, o: T.decor };
  for (let y = 0; y < G.map.length; y++) for (let x = 0; x < G.map[0].length; x++) {
    const t = G.map[y][x], sx = x * TS - camX, sy = y * TS - camY;
    if (sx < -TS || sy < -TS || sx > LW || sy > LH) continue;
    if (t === "L") img([tileAt(x - 1, y), tileAt(x + 1, y), tileAt(x, y - 1), tileAt(x, y + 1)].includes("+") ? T.hub : T.path, sx, sy);   // node sits on the floor
    img(t === "~" ? T.water[wf] : TILE[t] || T.floor, sx, sy);
  }
  // sprites, back to front
  const list = G.ents.filter(e => !e.gone).map(e => ({ e, y: e.y })).concat([{ hero: true, y: p.moving ? p.fy + (p.y - p.fy) * k : p.y }]).sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.hero) {
      const fr = p.moving && p.t < 5 ? (p.frame % 2 ? 1 : 3) : 0;   // step pose for the first half of each step
      img(PEOPLE.hero[p.dir][fr], px - camX, py - camY - 3);
      const gk = T.grass.width / sw(T.grass);
      if (!p.moving && tileAt(p.x, p.y) === ",") ctx.drawImage(T.grass, 0, 10 * gk, 16 * gk, 6 * gk, Math.round((px - camX) * S), Math.round((py - camY + 10) * S), Math.round(16 * S), Math.round(6 * S));
      continue;
    }
    const e = it.e;
    const ek = e.moving ? Math.min(1, e.mt / 8) : 1;
    const ex = (e.moving ? e.px + (e.x - e.px) * ek : e.x) * TS - camX, ey = (e.moving ? e.py + (e.y - e.py) * ek : e.y) * TS - camY;
    if (ex < -32 || ey < -32 || ex > LW + 16 || ey > LH + 16) continue;
    const adj = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) === 1;
    const face = adj ? (p.x < e.x ? "left" : p.x > e.x ? "right" : p.y < e.y ? "up" : "down") : "down";
    if (e.type === "npc") img(PEOPLE[e.who][face][0], ex, ey - 3);
    else if (e.type === "sign") img(T.sign, ex, ey);
    else if (e.type === "item" && !e.hidden) img(SPR.ITEM, ex, ey + Math.round(Math.sin(G.tick / 15)));
    else if (e.type === "item" && e.hidden && G.tick % 100 < 12 && SPR.SPARKLE) img(SPR.SPARKLE, ex + 5, ey + 5);
    else if (e.type === "item" && e.hidden && G.tick % 100 < 12) { const s = G.tick % 100 < 6 ? 1 : 2; rect(ex + 8, ey + 8 - s, 1, s * 2 + 1, "#ffffff"); rect(ex + 8 - s, ey + 8, s * 2 + 1, 1, "#ffffff"); }
    else if (e.type === "captain") {
      const c = CRE[e.sprite], done = G.flags["cap:" + e.id];
      const bob = done ? 0 : Math.round(Math.sin((G.tick + e.x * 7) / 10));
      img(c, ex - 4, ey - 9 + bob, 1, done ? 0.5 : 1);
      if (!done) img(SPR.BADGE, ex + 8 - sw(SPR.BADGE) / 2, ey - 10 - sh(SPR.BADGE) + bob);
      if (G.approach && G.approach.e === e && G.approach.t < 40) img(SPR.BUBBLE, ex + 3, ey - 26);
    } else if (e.type === "boss") {
      const c = CRE[AREAS[G.area].boss.team[0]];
      const bob = Math.round(Math.sin(G.tick / 10));
      img(c, ex - (sw(c) - 16) / 2, ey - (sh(c) - 16) + bob);
    }
  }
  // area banner
  if (G.toast) {
    G.toast.t++; const a = G.toast.t < 150 ? 1 : Math.max(0, 1 - (G.toast.t - 150) / 30);
    const slide = Math.round((1 - ease(G.toast.t / 14)) * -34);
    if (a <= 0) G.toast = null; else {
      ctx.globalAlpha = a; panel(5, 5 + slide, 122, 25);
      text(`AREA ${G.area}: ${G.toast.text}`, 10, 9 + slide, 5); text(G.toast.sub, 10, 19 + slide, 5, "#6a5a7a"); ctx.globalAlpha = 1;
    }
  }
  if (G.view) drawView();
}
function drawView() {   // big picture for the team / journal screens
  const v = G.view, c = CRE[v.key]; if (!c) return;
  panel(LW - 92, 6, 86, 86, "#2a2238");
  const sc = Math.min(3, 64 / sw(c)); img(c, LW - 49 - sw(c) * sc / 2, 46 - sh(c) * sc / 2 + Math.round(Math.sin(G.tick / 12) * 2), sc);
  if (v.kind === "cell") text(`Lv ${v.lv}`, LW - 49, 82, 5, "#f2c94c", "center");
}

// ---------- battle drawing ----------
function enemyLayout(list) {
  const n = list.length;
  return list.map((e, i) => {
    const c = CRE[e.sprite], big = sw(c) > 24, sc = n <= 1 ? (big ? 1.8 : 1.9) : n === 2 ? (big ? 1.5 : 1.5) : (big ? 1.1 : 1.05);
    const slot = 124 / n, cx = 112 + slot * i + slot / 2, w = sw(c) * sc, h = sh(c) * sc;
    const cy = 78 - h / 2 - (n >= 3 && i % 2 ? 6 : 0);
    return { e, c, sc, w, h, cx, cy };
  });
}
function drawBattle() {
  const P = PAL[G.area], intro = ease(BV.introT / 26);
  rect(0, 0, LW, LH, P.bg);
  for (let i = 0; i < 6; i++) rect(0, 52 + i * 18, LW, 1, P.ground);
  ctx.fillStyle = P.ground;
  ctx.beginPath(); ctx.ellipse((174 + (1 - intro) * 120) * S, 82 * S, 64 * S, 10 * S, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse((52 - (1 - intro) * 100) * S, 128 * S, 44 * S, 9 * S, 0, 0, 7); ctx.fill();
  BV.anim.forEach(a => a.t++); BV.anim = BV.anim.filter(a => a.t < 34);
  const list = BV.enemies.filter(e => shownHP(e) > 0 || BV.anim.some(a => a.fx === "faint" && a.e === e));
  const alive = list.filter(e => shownHP(e) > 0), num = e => alive.indexOf(e) + 1;
  const lay = enemyLayout(list), pos = new Map(lay.map(l => [l.e, l]));
  // enemies
  lay.forEach((L, i) => {
    const e = L.e;
    const hurt = BV.anim.find(a => a.e === e && a.fx === "hurt"), faint = BV.anim.find(a => a.e === e && a.fx === "faint"), lunge = BV.anim.find(a => a.e === e && a.fx === "cellhurt");
    const born = BV.born.get(e), pop = born === undefined ? 1 : ease((G.tick - born) / 12);
    let x = L.cx - L.w / 2 + (1 - intro) * 130, y = L.cy - L.h / 2 + Math.round(Math.sin((G.tick + i * 13) / 12));
    if (lunge && lunge.t < 12) x -= Math.sin(lunge.t / 12 * Math.PI) * 10;
    if (faint) y += faint.t * 0.8;
    const alpha = faint ? Math.max(0, 1 - faint.t / 24) : hurt && hurt.t < 16 && Math.floor(hurt.t / 3) % 2 === 0 ? 0.2 : 1;
    img(L.c, x + L.w * (1 - pop) / 2, y + L.h * (1 - pop), L.sc * pop, alpha);
    if (shownShield(e) > 0) { ctx.strokeStyle = "#5fd3e8"; ctx.lineWidth = S; ctx.beginPath(); ctx.ellipse((x + L.w / 2) * S, (y + L.h / 2) * S, (L.w / 2 + 3) * S, (L.h / 2 + 3) * S, 0, 0, 7); ctx.stroke(); }
    if (alive.length > 1 && shownHP(e) > 0) { panel(x + L.w / 2 - 3, y - 8, 7, 7, "#1b1428"); text(String(num(e)), x + L.w / 2 + 0.5, y - 7, 4, "#ffffff", "center"); }
    if (hurt && hurt.d && hurt.t < 30) text(`-${hurt.d}`, x + L.w / 2, y - 4 - hurt.t * 0.6, 5, hurt.eff >= 1.5 ? "#1f8f3a" : "#b5303a", "center");
  });
  // enemy labels: a column on the left so 1-4 enemies never overlap
  alive.forEach((e, i) => {
    const ly = 4 + i * 17, lx = 3 - (1 - intro) * 110;
    panel(lx, ly, 104, 15);
    if (alive.length > 1) { rect(lx, ly, 8, 15, "#1b1428"); text(String(i + 1), lx + 4, ly + 5, 4, "#ffffff", "center"); }
    const nx = lx + (alive.length > 1 ? 11 : 3);
    text(e.name.length > 17 ? e.name.slice(0, 16) + "." : e.name, nx, ly + 2, 4);
    const shown = lerpTo(e, shownHP(e), e.maxhp);
    bar(nx, ly + 9, 44, 3, shown / e.maxhp, hpCol(shown / e.maxhp));
    const tags = [];
    if (shownShield(e) > 0) tags.push(["SHLD" + shownShield(e), "#2a9bb3"]);
    if ((e.hidden || 0) > 0) tags.push(["HIDE", "#7a4fb5"]);
    if ((e.opsonized || 0) > 0) tags.push(["TAG", "#d84a8a"]);
    if ((e.clumped || 0) > 0) tags.push(["CLMP", "#c0642a"]);
    if (e.resist !== undefined) tags.push(["RES" + e.resist, "#b5303a"]);
    let tx = nx + 47; for (const [t, col] of tags.slice(0, 3)) { if (tx + t.length * 3 > lx + 103) break; text(t, tx, ly + 9, 3, col); tx += t.length * 3 + 2; }
  });
  // player cell
  const c = B.cur(), cc = CRE[c.name];
  const shake = BV.anim.find(a => a.fx === "cellhurt"), heal = BV.anim.find(a => a.fx === "heal"), atk = BV.anim.find(a => a.fx === "attack");
  let sx = 26 - (1 - intro) * 100 + (shake && shake.t > 6 && shake.t < 22 ? Math.round(Math.sin(shake.t * 1.5) * 3) : 0);
  if (atk && atk.t < 10 && atk.mt !== "Signal") sx += Math.sin(atk.t / 10 * Math.PI) * 8;
  const swap = BV.anim.find(a => a.fx === "swap"), sAlpha = swap ? Math.min(1, swap.t / 12) : 1;
  if (B.available(c) || c.hp <= 0) img(cc, sx, 128 - sh(cc) * 2.2, 2.2, shownHP(c) <= 0 ? 0.3 : sAlpha);
  if (heal && heal.t < 20) { ctx.globalAlpha = 0.3 * (1 - heal.t / 20); rect(0, 0, LW, LH, "#7cf0a0"); ctx.globalAlpha = 1; }
  // move effects
  for (const a of BV.anim) {
    if (a.fx === "attack" && a.tg) for (const tgt of a.tg) { const L = pos.get(tgt); if (L) drawMoveFx(a, L); }
    if (a.fx === "attack" && a.mt === "Signal" && a.t < 24) for (let i = 0; i < 5; i++) rect(36 + i * 9, 120 - a.t * 2 - (i % 2) * 6, 2, 2, "#5f9ff2");
    if (a.fx === "drug" && a.e) { const L = pos.get(a.e); if (L) drawMoveFx({ mt: "drug", t: a.t }, L); }
  }
  // player box
  const px = 118 + (1 - intro) * 130;
  panel(px, 96, 118, 31);
  text(c.name, px + 4, 99, 5); text(`Lv${c.lv}`, px + 114, 99, 4, "#6a5a7a", "right");
  const ch = lerpTo(c, shownHP(c), c.maxhp);
  text("HP", px + 4, 109, 4); bar(px + 16, 109, 66, 4, ch / c.maxhp, hpCol(ch / c.maxhp)); text(`${Math.round(ch)}/${c.maxhp}`, px + 114, 108, 4, "#1b1428", "right");
  rect(px + 16, 115, 66, 1, "#d6cde6"); rect(px + 16, 115, 66 * (c.lv >= TUNE.maxLv ? 1 : c.xp / xpToNext(c.lv)), 1, "#4a7fd9");
  const ready = B.cells.filter(x => x !== c).map(x => x.hp <= 0 ? "x" : B.available(x) ? "o" : "...").join(" ");
  text("TEAM " + ready, px + 4, 119, 3.5, "#6a5a7a");
  // body + inflammation
  const bodyFlash = BV.anim.find(a => a.fx === "body");
  panel(3, 131, 234, 26, bodyFlash && bodyFlash.t % 6 < 3 ? "#ffd6d6" : "#fdf6e3");
  const bd = lerpTo("body", shownBody());
  text("MAYA'S BODY", 7, 134, 4); bar(70, 134, 120, 4, bd / 100, hpCol(bd / 100)); text(`${Math.round(bd)}`, 196, 133, 4);
  const inf = lerpTo("inflam", Math.min(100, shownInflam()));
  text("INFLAMMATION", 7, 145, 4); bar(70, 145, 120, 4, inf / 100, inf >= TUNE.stormAt ? "#e0524f" : "#f29a4c");
  rect(70 + 120 * TUNE.stormAt / 100, 143, 1, 8, "#1b1428");
  text(`+${Math.round(Math.min(100, shownInflam()))}% DMG`, 196, 145, 3.5, "#c0642a");
  text(`ROUND ${BV.snap ? BV.snap.round : B.round}`, LW - 4, 4, 4, "#6a5a7a", "right");
}
function drawMoveFx(a, L) {
  const tx = L.cx, ty = L.cy, k = a.t / 18;
  if (a.t > 26) return;
  if (a.mt === "Engulf") {            // closing jaws of cytoplasm around the germ
    const r = (1 - ease(k)) * 26 + 4; ctx.strokeStyle = "#f0d9a8"; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.arc(tx * S, ty * S, r * S, 0, 7); ctx.stroke();
  } else if (a.mt === "Cytotoxic") {  // burst of granules
    if (a.t < 6) return; const r = ease((a.t - 6) / 14) * 18;
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.3; rect(tx + Math.cos(an) * r - 1, ty + Math.sin(an) * r - 1, 3, 3, i % 2 ? "#ffe066" : "#e05a7a"); }
  } else if (a.mt === "Antibody") {   // Y-shaped antibodies fly at the target
    for (let i = 0; i < 3; i++) {
      const kk = ease((a.t - i * 3) / 14); if (kk <= 0 || kk >= 1) continue;
      const x = 56 + (tx - 56) * kk, y = 100 + (ty - 100) * kk + (i - 1) * 5;
      rect(x, y, 1, 4, "#d84a8a"); rect(x - 2, y - 2, 1, 2, "#d84a8a"); rect(x + 2, y - 2, 1, 2, "#d84a8a"); rect(x - 1, y - 1, 1, 1, "#d84a8a"); rect(x + 1, y - 1, 1, 1, "#d84a8a");
    }
  } else if (a.mt === "drug") {       // capsule
    const kk = ease(a.t / 16); if (kk >= 1) return;
    const x = 56 + (tx - 56) * kk, y = 100 + (ty - 100) * kk - Math.sin(kk * Math.PI) * 20;
    panel(x - 3, y - 1, 6, 3, "#ffffff"); rect(x, y - 1, 3, 3, "#3f7fc0");
  } else if (a.mt === "Signal" && a.t < 20) {  // tag sparkle on the target
    for (let i = 0; i < 4; i++) rect(tx - 10 + i * 7, ty - 14 - (a.t % 8), 2, 2, "#d84a8a");
  }
}

// ---------- title, ending, transitions ----------
function drawTitle() {
  rect(0, 0, LW, LH, "#2a2238");
  for (let i = 0; i < 46; i++) rect((i * 53 + G.tick * 0.3 * (i % 3 + 1)) % LW, (i * 37) % LH, 1, 1, i % 5 ? "#5a4a78" : "#8a7aa0");
  // drifting germs in the background
  ["staph", "virion", "rstaph", "strep", "rhino"].forEach((k, i) => img(CRE[k], (LW + 30 - ((G.tick * 0.4 + i * 60) % (LW + 60))), 8 + i * 28, 0.75, 0.25));
  text("IMMUNE", LW / 2 + 1, 19, 14, "#1b1428", "center"); text("IMMUNE", LW / 2, 18, 14, "#2fb6a8", "center");
  text("RESPONSE", LW / 2 + 1, 37, 14, "#1b1428", "center"); text("RESPONSE", LW / 2, 36, 14, "#f2c94c", "center");
  text("a tiny adventure inside Maya", LW / 2, 58, 5, "#d6cde6", "center");
  ["Neutrophil", "Macrophage", "NK Cell", "Killer T Cell", "B Cell"].forEach((k, i) => img(CRE[k], 22 + i * 40, 74 + Math.round(Math.sin((G.tick + i * 9) / 10) * 2)));
  img(PEOPLE.hero.down[Math.floor(G.tick / 16) % 2 ? 1 : 3], LW / 2 - 12, 103, 1.5);
  text("3 AREAS  -  8 GERM CAPTAINS  -  10 GERMS", LW / 2, 132, 4, "#8a7aa0", "center");
  if (Math.floor(G.tick / 30) % 2) text("CHOOSE BELOW", LW / 2, 144, 5, "#ffffff", "center");
}
const CREDITS = ["IMMUNE RESPONSE", "", "A game about your immune system", "and antibiotic resistance", "", "Made for the Project Vital Quest", "healthcare game track", "",
  "Code, pixel art and chiptune music", "all made from scratch", "(JavaScript, canvas, WebAudio)", "", "Science sources:", "CDC: antibiotics and viruses, staph, MRSA", "IHME / Lancet GRAM study (2019)", "NK cells and 'missing self'", "", "Thanks for playing!"];
function drawEnd() {
  rect(0, 0, LW, LH, "#2a2238");
  for (let i = 0; i < 40; i++) rect((i * 53) % LW, (i * 37 + G.tick * 0.2) % LH, 1, 1, "#5a4a78");
  G.credT = (G.credT || 0) + 1;
  const off = LH - G.credT * 0.35;
  CREDITS.forEach((l, i) => { const y = off + i * 11; if (y > -8 && y < LH) text(l, LW / 2, y, i ? 4.5 : 7, i ? "#d6cde6" : "#4cd06a", "center"); });
  if (off + CREDITS.length * 11 < 0) G.credT = 0;
  rect(0, 126, LW, LH - 126, "#2a2238"); rect(0, 126, LW, 1, "#5a4a78");
  G.roster.forEach((c, i) => img(CRE[c.name], 12 + i * 46, 136 + Math.round(Math.sin((G.tick + i * 9) / 6) * 2), 0.9));
}
function drawTrans() {   // flash, then stripes close in
  const t = G.trans.t; drawWorld();
  if (t < 24) { if (Math.floor(t / 4) % 2 === 0) { ctx.globalAlpha = 0.85; rect(0, 0, LW, LH, "#ffffff"); ctx.globalAlpha = 1; } return; }
  const k = ease((t - 24) / 30);
  for (let i = 0; i < 10; i++) { const h = 16 * k; if (i % 2) rect(LW - LW * k, i * 16, LW * k, 16, "#1b1428"); else rect(0, i * 16, LW * k, 16, "#1b1428"); }
}

// ---------- main loop ----------
function update() {
  G.tick++;
  if (G.bumpCool) G.bumpCool--;
  if (G.mode !== "title") G.stats.playMs += 1000 / 60;
  if (G.type) { G.type.i += 2; boxText.textContent = G.type.s.slice(0, G.type.i); if (G.type.i >= G.type.s.length) finishType(); }
  if (G.mode === "battle") BV.introT++;
  if (G.trans) { G.trans.t++; if (G.trans.t >= 58) { const go = G.trans.go; G.trans = null; go(); } }
  if (G.fade) { G.fade.t++; if (G.fade.t === 20) G.fade.mid(); if (G.fade && G.fade.t >= 40) G.fade = null; }
  if (G.mode === "world" && G.approach && !G.dlg) stepApproach();
  if (G.mode === "world" && !G.dlg && !G.menu && !busy()) {
    const p = G.p;
    if (p.moving) { p.t++; if (p.t >= 8) { p.moving = false; arrive(); } }
    if (!p.moving && G.mode === "world" && !G.dlg && !G.menu && !busy()) { const d = ["up", "down", "left", "right"].find(k => held.has(k)); if (d) tryMove(d); }
  }
}
function draw() {
  ctx.imageSmoothingEnabled = false;
  if (G.trans) drawTrans();
  else if (G.mode === "title") drawTitle();
  else if (G.mode === "world") drawWorld();
  else if (G.mode === "battle" && B) drawBattle();
  else if (G.mode === "end") drawEnd();
  if (G.fade) { ctx.globalAlpha = G.fade.t < 20 ? G.fade.t / 20 : (40 - G.fade.t) / 20; rect(0, 0, LW, LH, "#000"); ctx.globalAlpha = 1; }
}
let last = 0, acc = 0;
function loop(ts) { acc += Math.min(100, ts - last); last = ts; while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; } draw(); requestAnimationFrame(loop); }
titleMenu();
requestAnimationFrame(t => { last = t; loop(t); });

// test hooks for automated playtests (harmless in normal play)
G.debug = {
  newGame, startArea, enterArea, startWild, bossIntro, act, mainMenu, readSave, writeSave, loadGame, titleMenu, startMenu, teamMenu, journalMenu,
  get battle() { return B; },
  run: n => { for (let i = 0; i < n; i++) update(); draw(); },
  setPos: (x, y) => Object.assign(G.p, { x, y, moving: false }),
  setLevel: lv => G.roster.forEach(c => { while (c.lv < lv) gainXP(c, xpToNext(c.lv)); }),
  beatCaptains: () => { captains().forEach(e => G.flags["cap:" + e.id] = true); applyFlags(); },
  winBattle: () => { B.enemies.forEach(e => { e.hp = 0; B.defeated.push(e); }); B.enemies = []; B.over = "win"; clearBox(); endBattle(); },
  fight: id => talkCaptain(G.ents.find(e => e.id === id)),
  multiBattle: () => startBattle(["staph", "strep", "staph", "strep"].map(k => spawn(k, G.area)), { test: true }, ["Four germs at once!"]),
};
})();
