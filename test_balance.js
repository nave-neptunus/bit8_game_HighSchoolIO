const G = require("./engine.js");
const AREA = {
  1: { party: ["Neutrophil", "Macrophage"], bag: () => ({ Rest: 2 }), boss: () => [G.ENEMIES.brewer(), G.ENEMIES.staph()], wild: () => [G.ENEMIES.staph()] },
  2: { party: ["Macrophage", "NK Cell", "Killer T Cell"], bag: () => ({ Rest: 2, "Fever Reducer": 1 }), boss: () => [G.ENEMIES.factory(), G.ENEMIES.virion()], wild: () => [G.ENEMIES.virion()] },
  3: { party: ["Neutrophil", "Macrophage", "B Cell"], bag: () => ({ Rest: 2, "Fever Reducer": 1, "Lab Culture": 1, "Targeted Antibiotic": 2, "Old Antibiotic": 2, Debridement: 2 }),
       boss: res => [G.ENEMIES.superbug(res), G.ENEMIES.rstaph()], wild: () => [G.ENEMIES.rstaph()] },
};
function fight(level, policy, seed, opt = {}) {
  const A = AREA[level], rand = G.rng(seed + 7);
  const cells = A.party.map(G.makeCell);
  if (opt.hpFrac) cells.forEach(c => c.hp = Math.round(c.maxhp * opt.hpFrac));
  const bag = A.bag(); if (opt.abx) bag.Antibiotic = opt.abx;
  const enemies = opt.wild ? A.wild() : A.boss(1 + (opt.wasted || 0));
  const b = new G.Battle({ enemies, cells, bag, level, wild: !!opt.wild, rand });
  while (!b.over) {
    const acts = b.actions().filter(a => a.k !== "run");
    if (!acts.length) { b.waitRound(); continue; }
    b.step(policy(b, acts));
  }
  return { win: b.over === "win", rounds: b.round, body: Math.max(0, b.body), cellsLeft: cells.reduce((s, c) => s + Math.max(0, c.hp), 0) / cells.reduce((s, c) => s + c.maxhp, 0) };
}
function run(level, policy, opt = {}, n = 2000) {
  const r = []; for (let i = 0; i < n; i++) r.push(fight(level, policy, i, opt));
  const w = r.filter(x => x.win), avg = (a, k) => a.length ? +(a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(1) : null;
  return { win: +(w.length / n * 100).toFixed(1) + "%", rounds: avg(w, "rounds"), body: avg(w, "body"), hpLeft: avg(w, "cellsLeft") };
}
const S = G.smartPolicy, R = G.randomPolicy;
for (const L of [1, 2, 3]) {
  console.log(`Area ${L} BOSS  decent`, run(L, S), " random", run(L, R));
  console.log(`Area ${L} WILD  decent`, run(L, S, { wild: true }), " random", run(L, R, { wild: true }));
  console.log(`Area ${L} BOSS at 60% cell HP (skipped heal) decent`, run(L, S, { hpFrac: 0.6 }), " random", run(L, R, { hpFrac: 0.6 }));
}
console.log("Area 2 boss, took antibiotics from pharmacist, random", run(2, R, { abx: 2 }));
for (const w of [0, 1, 2]) console.log(`Area 3 boss, ${w} antibiotics wasted in Area 2: decent`, run(3, S, { wasted: w }), " random", run(3, R, { wasted: w }));
