// ===== Immune Response battle engine (shared by the game and node balance tests) =====
const TUNE = {            // middle-school tuning; change here, rerun test_balance.js
  inflamDecay: 2, stormAt: 80, stormDmg: 5,
  restHeal: 25, restCalm: 10, feverCalm: 30, cleanUpHeal: 10,
  tCellArrives: 3, bCellArrives: 2,
  virionInfectAfter: 4, factoryHP: 90,
  bossL3HP: 100, bossL3Toxin: 6, bossL3Shield: 30, bossL3Regen: 0,
  resistStep: 0.2, resistFloor: 0.4, targetedPower: 50,
  memoryBonus: 0.05, maxRounds: 60, wastedBossHP: 15,
};

const EFF = {
  Engulf:    { Bacterium: 1.5, Virus: 1.0,  Infected: 0.5 },
  Cytotoxic: { Bacterium: 0.5, Virus: 0.25, Infected: 2.0 },
  Antibody:  { Bacterium: 1.0, Virus: 2.0,  Infected: 0.25 },
};
const TYPE_NAME = { Bacterium: "Bacteria", Virus: "Virus", Infected: "Infected cell" };

function mv(name, type, power, pp, extra) { return Object.assign({ name, type, power, pp }, extra || {}); }
const INF = 99;
const CELL_DEFS = {
  Neutrophil: { hp: 55, atk: 12, df: 8, decay: 3, blurb: "First responder. Fast, but it wears out.", moves: [
    mv("Engulf", "Engulf", 14, INF, { desc: "Swallow a germ." }),
    mv("NET Trap", "Engulf", 11, 2, { aoe: true, selfDmg: 10, desc: "Hit ALL enemies. Costs 10 of its own HP." }),
    mv("Call for Backup", "Signal", 0, 3, { inflam: 15, desc: "Inflammation +15: all your attacks get stronger." })] },
  Macrophage: { hp: 90, atk: 9, df: 12, blurb: "Big eater. Tough, and it cleans up.", moves: [
    mv("Engulf", "Engulf", 14, INF, { desc: "Swallow a germ." }),
    mv("Cytokine Alarm", "Signal", 0, 3, { inflam: 20, desc: "Inflammation +20: all your attacks get stronger." }),
    mv("Present Antigen", "Signal", 0, 1, { present: true, desc: "Show the enemy to T and B cells. They arrive sooner and hit harder." }),
    mv("Clean Up", "Signal", 0, 3, { bodyHeal: TUNE.cleanUpHeal, desc: "Repair tissue: Body +" + TUNE.cleanUpHeal + "." })] },
  "NK Cell": { hp: 60, atk: 13, df: 8, blurb: "Hunts cells that are hiding something.", moves: [
    mv("Kill Check", "Cytotoxic", 14, INF, { desc: "Destroy an infected cell." }),
    mv("Perforin Strike", "Cytotoxic", 24, 3, { desc: "Big hit on an infected cell." }),
    mv("Interferon Signal", "Signal", 0, 2, { inflam: 10, slowVirus: 2, desc: "Warn nearby cells: virus copying stops for 2 rounds." })] },
  "Killer T Cell": { hp: 75, atk: 16, df: 10, arrives: TUNE.tCellArrives, blurb: "The specialist. Takes a few rounds to show up.", moves: [
    mv("Targeted Kill", "Cytotoxic", 21, INF, { desc: "Destroy an infected cell." }),
    mv("Perforin & Granzyme", "Cytotoxic", 32, 3, { desc: "Huge hit on an infected cell." }),
    mv("Clonal Expansion", "Signal", 0, 1, { selfHeal: 30, desc: "Make copies of itself: heal 30 HP." })] },
  "B Cell": { hp: 65, atk: 14, df: 9, arrives: TUNE.bCellArrives, blurb: "Fires antibodies that tag germs.", moves: [
    mv("Antibody Volley", "Antibody", 16, INF, { desc: "Antibodies hit the target." }),
    mv("Opsonize", "Signal", 0, 3, { opsonize: 3, desc: "Tag a germ: Engulf does double to it for 3 rounds." }),
    mv("Neutralize Toxin", "Antibody", 22, 3, { stopToxin: true, desc: "Hit and block its toxin for 2 rounds." })] },
};

function makeCell(name) {
  const d = CELL_DEFS[name];
  return { name, maxhp: d.hp, hp: d.hp, atk: d.atk, df: d.df, decay: d.decay || 0, arrives: d.arrives || 0,
    moves: d.moves.map(m => Object.assign({}, m, { left: m.pp })) };
}

function E(name, type, hp, atk, df, extra) {
  return Object.assign({ name, type, hp, maxhp: hp, atk, df, age: 0 }, extra || {});
}
const ENEMIES = {
  staph:   () => E("Staph Scout", "Bacterium", 28, 8, 7, { divide: 4, hit: 7, tissue: 6, sprite: "staph" }),
  brewer:  () => E("Toxin Brewer", "Bacterium", 90, 9, 10, { hit: 9, tissue: 6, clump: 4, toxinEvery: 3, toxin: 10, boss: true, sprite: "brewer" }),
  virion:  () => E("Flu Virion", "Virus", 22, 6, 6, { infectAfter: TUNE.virionInfectAfter, hit: 6, tissue: 2, sprite: "virion" }),
  infected:() => E("Hijacked Lung Cell", "Infected", 45, 5, 8, { factory: 3, hit: 4, tissue: 4, hide: true, sprite: "infected" }),
  factory: () => E("Virus Factory", "Infected", TUNE.factoryHP, 6, 10, { factory: 3, factoryN: 1, hit: 7, tissue: 5, hide: true, boss: true, sprite: "factory" }),
  rstaph:  () => E("Resistant Staph", "Bacterium", 32, 8, 8, { divide: 4, hit: 7, tissue: 3, sprite: "rstaph" }),
  superbug:(res) => E("Superbug Colony", "Bacterium", TUNE.bossL3HP + TUNE.wastedBossHP * Math.max(0, res - 1), 10, 9, { hit: 10, tissue: 5, divide: 4, biofilmEvery: 4, biofilm: 20,
      shield: TUNE.bossL3Shield, resist: res, toxinEvery: 3, toxin: TUNE.bossL3Toxin, toxinInflam: 20, regen: TUNE.bossL3Regen, boss: true, sprite: "superbug" }),
};

const ITEM_INFO = {
  "Rest": "Sleep helps you heal. Body +" + TUNE.restHeal + ", Inflammation -" + TUNE.restCalm + ".",
  "Fever Reducer": "Inflammation -" + TUNE.feverCalm + ".",
  "Antibiotic": "Kills bacteria. (Will it work on a virus?)",
  "Lab Culture": "Test the germ to find which drug works. Unlocks Targeted Antibiotic.",
  "Targeted Antibiotic": "The right drug for this germ. Big damage, weaker vs. resistance.",
  "Old Antibiotic": "An old drug this germ already resists. Weak.",
  "Debridement": "A doctor cleans the wound: strips the biofilm shield.",
};

function rng(seed) { // small seeded RNG so tests are repeatable
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

class Battle {
  // cfg: {enemies:[...], cells:[cell objs, shared], bag:{item:n, shared}, wild, level, memory, onAbxWasted, rand}
  constructor(cfg) {
    Object.assign(this, { enemies: cfg.enemies, cells: cfg.cells, bag: cfg.bag, wild: !!cfg.wild, level: cfg.level,
      memory: cfg.memory || 0, rand: cfg.rand || Math.random, onAbxWasted: cfg.onAbxWasted || (() => {}) });
    this.body = 100; this.inflam = 0; this.round = 0; this.presented = false; this.cultured = false;
    this.slowVirus = 0; this.stormRounds = 0; this.abxOnVirus = 0; this.over = null;
    for (const c of this.cells) for (const m of c.moves) m.left = m.pp;   // moves refresh each battle
    this.announced = new Set(this.cells.filter(c => this.available(c) || c.hp <= 0));
    this.active = this.cells.findIndex(c => this.available(c));
    if (this.active < 0) this.active = 0;
  }
  arrivalRound(c) { let a = c.arrives || 0; if (this.presented && a) a -= 1; return this.wild ? 0 : a; }
  available(c) { return c.hp > 0 && this.round >= this.arrivalRound(c); }
  bonus() { return 1 + Math.min(this.inflam, 100) / 100; }
  cur() { return this.cells[this.active]; }

  effOf(cell, m, e) {
    let eff = EFF[m.type][e.type];
    if ((e.hidden || 0) > 0 && m.type === "Cytotoxic") eff *= cell.name === "NK Cell" ? 1.5 : 0.5;
    if ((e.opsonized || 0) > 0 && m.type === "Engulf") eff *= 2;
    if (this.presented && (cell.name === "Killer T Cell" || cell.name === "B Cell")) eff *= 1.25;
    return eff;
  }
  dmgOf(cell, m, e, roll) {
    const df = e.df * (e.clumped ? 1.3 : 1);
    const mem = e.boss ? 1 + this.memory * TUNE.memoryBonus : 1;
    return Math.max(1, Math.round(m.power * cell.atk / df * this.effOf(cell, m, e) * this.bonus() * mem * roll));
  }
  hit(e, d, log) {
    if ((e.shield || 0) > 0) { const a = Math.min(e.shield, d); e.shield -= a; d -= a; if (a) log.push({ t: `The biofilm soaked up ${a}.`, fx: "shield", e }); }
    e.hp -= d; return d;
  }

  actions() {
    const acts = [], c = this.cur();
    if (this.available(c)) for (const m of c.moves) {
      if (m.left <= 0) continue;
      if (m.type === "Signal") { if (m.opsonize) this.enemies.forEach(e => acts.push({ k: "move", m, e })); else acts.push({ k: "move", m }); }
      else if (m.aoe) acts.push({ k: "move", m });
      else this.enemies.forEach(e => acts.push({ k: "move", m, e }));
    }
    this.cells.forEach((o, i) => { if (i !== this.active && this.available(o)) acts.push({ k: "swap", i }); });
    for (const [it, n] of Object.entries(this.bag)) {
      if (n <= 0) continue;
      if (it === "Targeted Antibiotic" && !this.cultured) continue;
      if (/Antibiotic/.test(it)) this.enemies.forEach(e => acts.push({ k: "item", it, e }));
      else acts.push({ k: "item", it });
    }
    if (this.wild) acts.push({ k: "run" });
    return acts;
  }

  // one full round; returns a list of messages for the UI
  step(a) {
    const log = [];
    this.round += 1;
    if (!this.available(this.cur())) this.autoSwap(log);
    if (a) this.doPlayer(a, log);
    if (this.over) return log;
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.enemies.length) this.enemyPhase(log);
    this.endRound(log);
    if (this.body <= 0) { this.over = "lose"; log.push({ t: "Maya's body can't take any more..." }); }
    else if (this.cells.every(c => c.hp <= 0)) { this.over = "lose"; log.push({ t: "All your cells are worn out..." }); }
    else if (!this.enemies.length) { this.over = "win"; log.push({ t: this.wild ? "The germ is gone!" : "Infection cleared!" }); }
    else if (this.round >= TUNE.maxRounds) { this.over = "lose"; log.push({ t: "The infection outlasted you..." }); }
    return log;
  }
  waitRound() { return this.step(null); }   // when no cell has arrived yet

  autoSwap(log) {
    const i = this.cells.findIndex(c => this.available(c));
    if (i >= 0 && i !== this.active) { this.active = i; log.push({ t: `Go, ${this.cur().name}!`, fx: "swap" }); }
  }

  doPlayer(a, log) {
    const c = this.cur();
    if (a.k === "run") { this.over = "run"; log.push({ t: "You got away safely!" }); return; }
    if (a.k === "swap") { this.active = a.i; log.push({ t: `Go, ${this.cur().name}!`, fx: "swap" }); return; }
    if (a.k === "item") return this.useItem(a, log);
    const m = a.m; m.left -= 1;
    log.push({ t: `${c.name} used ${m.name}!`, fx: "attack", by: c });
    if (m.type === "Signal") {
      if (m.inflam) { this.inflam += m.inflam; log.push({ t: `Inflammation +${m.inflam}. Your attacks hit harder!` }); }
      if (m.present) { this.presented = true; log.push({ t: "T and B cells now know this enemy!" }); }
      if (m.bodyHeal) { this.body = Math.min(100, this.body + m.bodyHeal); log.push({ t: `Maya's body healed ${m.bodyHeal}.`, fx: "heal" }); }
      if (m.selfHeal) { c.hp = Math.min(c.maxhp, c.hp + m.selfHeal); log.push({ t: `${c.name} healed ${m.selfHeal} HP.`, fx: "heal" }); }
      if (m.slowVirus) { this.slowVirus = m.slowVirus; log.push({ t: "Nearby cells resist! Virus copying stops for now." }); }
      if (m.opsonize) { a.e.opsonized = m.opsonize; log.push({ t: `${a.e.name} is tagged! Engulf does double.` }); }
      return;
    }
    const targets = m.aoe ? this.enemies.slice() : [a.e];
    for (const e of targets) {
      const eff = this.effOf(c, m, e);
      const d = this.hit(e, this.dmgOf(c, m, e, 0.9 + 0.2 * this.rand()), log);
      log.push({ t: `${e.name} took ${d} damage.` + (eff >= 1.5 ? " Super effective!" : eff <= 0.5 ? " Not very effective..." : ""), fx: "hurt", e });
      if (e.hp <= 0) log.push({ t: `${e.name} was destroyed!`, fx: "faint", e });
    }
    if (m.stopToxin && a.e) a.e.toxinBlock = 2;
    if (m.selfDmg) { c.hp -= m.selfDmg; log.push({ t: `${c.name} gave ${m.selfDmg} HP to cast the net.` }); }
  }

  useItem(a, log) {
    const it = a.it, e = a.e; this.bag[it] -= 1;
    log.push({ t: `You used ${it}.` });
    if (it === "Rest") { this.body = Math.min(100, this.body + TUNE.restHeal); this.inflam = Math.max(0, this.inflam - TUNE.restCalm); log.push({ t: `Maya rests. Body +${TUNE.restHeal}.`, fx: "heal" }); }
    else if (it === "Fever Reducer") { this.inflam = Math.max(0, this.inflam - TUNE.feverCalm); log.push({ t: "Inflammation went down." }); }
    else if (it === "Lab Culture") { this.cultured = true; log.push({ t: "Lab result: we know which drug works! Targeted Antibiotic unlocked." }); }
    else if (it === "Debridement") { this.enemies.forEach(x => x.shield = 0); log.push({ t: "The wound was cleaned. The biofilm is gone!", fx: "shield" }); }
    else if (/Antibiotic/.test(it)) {
      if (e.type !== "Bacterium") {
        this.abxOnVirus += 1; this.onAbxWasted();
        log.push({ t: "No effect! Antibiotics kill bacteria, not viruses." });
        log.push({ t: "(Somewhere, bacteria got a little practice resisting...)" });
        return;
      }
      const base = it === "Antibiotic" ? 25 : it === "Targeted Antibiotic" ? TUNE.targetedPower : TUNE.targetedPower * 0.3;
      const res = it === "Targeted Antibiotic" ? (e.resist || 0) : 0;
      let amt = base * Math.max(TUNE.resistFloor, 1 - TUNE.resistStep * res);
      if ((e.shield || 0) > 0) { amt *= 0.25; log.push({ t: "The biofilm blocked most of the drug!" }); }
      amt = Math.round(amt); e.hp -= amt;
      log.push({ t: `${e.name} took ${amt} damage.`, fx: "hurt", e });
      if (e.resist !== undefined) { e.resist += 1; log.push({ t: `${e.name} is learning to resist (level ${e.resist}).` }); }
      if (e.hp <= 0) log.push({ t: `${e.name} was destroyed!`, fx: "faint", e });
    }
  }

  enemyPhase(log) {
    const spawn = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.age += 1;
      if (e.regen) e.hp = Math.min(e.maxhp, e.hp + e.regen);
      if (e.biofilmEvery && e.age % e.biofilmEvery === 0) { e.shield = Math.min(40, (e.shield || 0) + e.biofilm); log.push({ t: `${e.name} grew its biofilm shield.`, fx: "shield", e }); }
      if (e.hide && e.age % 3 === 0) { e.hidden = 2; log.push({ t: `${e.name} hid its ID tag! (NK cells can still spot it.)` }); }
      if (e.infectAfter && e.age > e.infectAfter + (this.slowVirus ? 1 : 0)) { e.convert = true; continue; }
      if (e.infectAfter && e.age === e.infectAfter + (this.slowVirus ? 1 : 0)) log.push({ t: `${e.name} is about to break into a lung cell!` });
      if (e.factory && e.age % e.factory === 0 && !this.slowVirus) {
        const n = e.factoryN || 1; for (let i = 0; i < n; i++) spawn.push(ENEMIES.virion());
        log.push({ t: `${e.name} released ${n === 1 ? "a new virus" : n + " new viruses"}!`, fx: "spawn", e }); continue;
      }
      if (e.divide && e.age % e.divide === 0 && this.enemies.length + spawn.length < 3) {
        const kid = e.name.startsWith("Resistant") || e.boss ? ENEMIES.rstaph() : ENEMIES.staph();
        kid.hp = Math.round(kid.maxhp * 0.6); spawn.push(kid); log.push({ t: `${e.name} divided in two!`, fx: "spawn", e }); continue;
      }
      if (e.clump && e.age % e.clump === 0) { e.clumped = 2; log.push({ t: `${e.name} clumped together. Harder to hurt!` }); continue; }
      if (e.toxinEvery && e.age % e.toxinEvery === 0 && !e.toxinBlock) {
        this.body -= e.toxin; this.inflam += e.toxinInflam || 0;
        log.push({ t: `${e.name} released toxin! Body -${e.toxin}.`, fx: "body" }); continue;
      }
      const c = this.cur();
      if (this.rand() < 0.55 && c.hp > 0 && this.available(c)) {
        const d = Math.max(1, Math.round(e.hit * e.atk / c.df * (0.9 + 0.2 * this.rand())));
        c.hp -= d; log.push({ t: `${e.name} attacked ${c.name} for ${d}!`, fx: "cellhurt" });
      } else { this.body -= e.tissue; log.push({ t: `${e.name} damaged tissue. Body -${e.tissue}.`, fx: "body" }); }
    }
    this.enemies.forEach((e, i) => { if (e.convert) { this.enemies[i] = ENEMIES.infected(); log.push({ t: "The virus broke into a lung cell! It's a Hijacked Lung Cell now.", fx: "spawn" }); } });
    this.enemies = this.enemies.filter(e => e.hp > 0).concat(spawn).slice(0, 4);
    for (const e of this.enemies) for (const k of ["hidden", "opsonized", "toxinBlock", "clumped"]) if ((e[k] || 0) > 0) e[k] -= 1;
  }

  endRound(log) {
    this.inflam = Math.max(0, this.inflam - TUNE.inflamDecay);
    if (this.inflam >= TUNE.stormAt) { this.body -= TUNE.stormDmg; this.stormRounds += 1; log.push({ t: `Too much inflammation! Body -${TUNE.stormDmg}. (Try a Fever Reducer.)`, fx: "body" }); }
    if (this.slowVirus) this.slowVirus -= 1;
    const c = this.cur();
    if (c.decay && c.hp > 0) { c.hp -= c.decay; if (c.hp <= 0) log.push({ t: `${c.name} wore out.` }); }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.cells.forEach(x => { if (x.hp > 0 && this.available(x) && !this.announced.has(x)) { this.announced.add(x); log.push({ t: `${x.name} has arrived to help!`, fx: "arrive" }); } });
    if (!this.available(this.cur())) this.autoSwap(log);
  }
}

// ---- a scripted "decent player" used only for balance testing ----
function expected(b, a) {
  if (a.k !== "move" || a.m.type === "Signal") return 0;
  const c = b.cur(); const tg = a.m.aoe ? b.enemies : [a.e]; let tot = 0;
  for (const t of tg) {
    let d = a.m.power * c.atk / (t.df * (t.clumped ? 1.3 : 1)) * b.effOf(c, a.m, t) * b.bonus();
    const pool = t.hp + (t.shield || 0);
    if (d >= pool) d += 8;
    tot += Math.min(d, pool + 8) - (a.m.aoe ? 0 : (t.shield || 0) * 0.5);
  }
  return tot;
}
function smartPolicy(b, acts) {
  const pick = f => acts.find(f);
  let p;
  if (b.body < 55 && (p = pick(a => a.k === "move" && a.m.bodyHeal))) return p;
  if (b.body < 45 && (p = pick(a => a.it === "Rest"))) return p;
  if (b.inflam >= 70 && (p = pick(a => a.it === "Fever Reducer"))) return p;
  if (!b.presented && !b.wild && (p = pick(a => a.k === "move" && a.m.present))) return p;
  const boss = b.enemies.find(e => e.boss);
  if (b.level === 3 && boss && !b.cultured && (p = pick(a => a.it === "Lab Culture"))) return p;
  if (b.level === 3 && boss && b.cultured && b.bag["Targeted Antibiotic"] > 0) {
    if ((boss.shield || 0) > 0 && (p = pick(a => a.it === "Debridement"))) return p;
    if ((p = pick(a => a.it === "Targeted Antibiotic" && a.e.boss))) return p;
  }
  if (boss && boss.toxinEvery && boss.age % boss.toxinEvery === boss.toxinEvery - 1 && (p = pick(a => a.k === "move" && a.m.stopToxin && a.e.boss))) return p;
  if (b.inflam < 30 && b.enemies.reduce((s, e) => s + e.hp, 0) > 60 && (p = pick(a => a.k === "move" && a.m.inflam))) return p;
  if (b.enemies.some(e => e.factory) && !b.slowVirus && (p = pick(a => a.k === "move" && a.m.slowVirus))) return p;
  if (boss && !boss.opsonized && b.cells.some(c => (c.name === "Neutrophil" || c.name === "Macrophage") && c.hp > 0) &&
      (p = pick(a => a.k === "move" && a.m.opsonize && a.e.boss))) return p;
  const moves = acts.filter(a => a.k === "move" && a.m.type !== "Signal");
  const score = a => expected(b, a) * (a.m.pp > 50 || !a.e || a.e.hp > 15 ? 1 : 0.6);
  const best = moves.length ? moves.reduce((x, y) => score(y) > score(x) ? y : x) : null;
  const swaps = acts.filter(a => a.k === "swap");
  if (swaps.length) {
    const bestFor = i => { const old = b.active; b.active = i; let v = 0;
      for (const m of b.cells[i].moves) if (m.left > 0 && m.type !== "Signal") for (const e of b.enemies) v = Math.max(v, expected(b, { k: "move", m, e }));
      b.active = old; return v; };
    const bv = best ? expected(b, best) : 0;
    const cand = swaps.reduce((x, y) => bestFor(y.i) > bestFor(x.i) ? y : x);
    if (b.cells[cand.i].hp >= 20 && (bestFor(cand.i) > bv * 1.6 || (b.cur().hp < 15 && b.cells[cand.i].hp > 30))) return cand;
  }
  if (best) return best;
  return acts.filter(a => a.k !== "run")[Math.floor(b.rand() * acts.length)] || acts[0];
}
function randomPolicy(b, acts) { const a = acts.filter(x => x.k !== "run"); return a[Math.floor(b.rand() * a.length)]; }

if (typeof module !== "undefined") module.exports = { TUNE, EFF, CELL_DEFS, ENEMIES, ITEM_INFO, TYPE_NAME, Battle, makeCell, rng, smartPolicy, randomPolicy };
