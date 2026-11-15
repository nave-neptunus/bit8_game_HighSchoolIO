// node test_balance.js : thousands of fights per case with a "decent" scripted player and a random-button player.
// Teams use the real area data in world.js and the cell levels a player should have at that point.
const G = require("./engine.js"), W = require("./world.js");
const ROSTER = { 1: ["Neutrophil", "Macrophage"], 2: ["Neutrophil", "Macrophage", "NK Cell", "Killer T Cell"],
  3: ["Neutrophil", "Macrophage", "NK Cell", "Killer T Cell", "B Cell"] };

function fight(area, policy, seed, opt) {
  const A = W.AREAS[area], rand = G.rng(seed + 7);
  const cells = ROSTER[area].map(n => G.makeCell(n, opt.lv));
  if (opt.hpFrac) cells.forEach(c => c.hp = Math.round(c.maxhp * opt.hpFrac));
  const bag = Object.assign({}, A.bag); if (opt.abx) bag.Antibiotic = opt.abx;
  let enemies;
  if (opt.wild) enemies = [G.spawnWild(A.wild[seed % A.wild.length][0], +area)];
  else if (opt.captain) enemies = A.ents[opt.captain].team.map(k => G.spawn(k, +area));
  else enemies = A.boss.team.map(k => G.spawn(k, +area, 1 + (opt.wasted || 0)));
  const b = new G.Battle({ enemies, cells, bag, level: +area, wild: !!opt.wild, rand }); b.snaps = false;
  while (!b.over) {
    const acts = b.actions().filter(a => a.k !== "run");
    if (!acts.length) { b.waitRound(); continue; }
    b.step(policy(b, acts));
  }
  return { win: b.over === "win", rounds: b.round, body: Math.max(0, b.body), xp: b.xpEarned() };
}
function run(area, policy, opt = {}, n = 2000) {
  const r = []; for (let i = 0; i < n; i++) r.push(fight(area, policy, i, opt));
  const w = r.filter(x => x.win), avg = k => w.length ? +(w.reduce((s, x) => s + x[k], 0) / w.length).toFixed(1) : null;
  return { win: +(w.length / n * 100).toFixed(1), rounds: avg("rounds"), body: avg("body"), xp: avg("xp") };
}
const S = G.smartPolicy, R = G.randomPolicy, fmt = r => `${String(r.win).padStart(5)}%  ${r.rounds} rds  body ${r.body}  xp ${r.xp}`;
const rows = [], targets = [];
function row(label, area, opt, minDecent) {
  const d = run(area, S, opt), rr = run(area, R, opt);
  rows.push(`${label.padEnd(44)} decent ${fmt(d).padEnd(40)} random ${fmt(rr)}`);
  if (minDecent !== undefined) targets.push([label, d.win, minDecent]);
}
const start = { 1: G.TUNE.startLv, 2: G.TUNE.joinLv[2], 3: G.TUNE.joinLv[3] };
for (const a of [1, 2, 3]) {
  const par = G.TUNE.areaPar[a], A = W.AREAS[a];
  row(`Area ${a} wild, Lv ${start[a]}`, a, { wild: true, lv: start[a] }, 98);
  for (const [k, e] of Object.entries(A.ents)) if (e.type === "captain") row(`Area ${a} ${e.name}, Lv ${start[a] + 1}`, a, { captain: k, lv: start[a] + 1 }, 90);
  row(`Area ${a} BOSS at par Lv ${par}`, a, { lv: par }, 97);
  row(`Area ${a} BOSS under-leveled Lv ${par - 2}`, a, { lv: par - 2 }, 75);
  row(`Area ${a} BOSS par, 60% cell HP`, a, { lv: par, hpFrac: 0.6 });
}
for (const w of [1, 2]) row(`Area 3 BOSS par, ${w} antibiotics wasted`, 3, { lv: G.TUNE.areaPar[3], wasted: w }, 90);
console.log(rows.join("\n"));
let bad = 0;
for (const [l, got, min] of targets) if (got < min) { bad++; console.log(`  BELOW TARGET: ${l} decent ${got}% < ${min}%`); }
console.log(bad ? `${bad} case(s) below target` : "all balance targets met");
