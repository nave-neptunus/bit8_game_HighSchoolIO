"""Balance simulator for 'Immune Response' (working title).
Runs each level many times with a smart player and a random player."""
import random, copy, statistics, sys

EFF = {  # move type -> enemy type -> multiplier
    "Engulf":    {"Bacterium": 1.5, "Virus": 1.0, "Infected": 0.5},
    "Cytotoxic": {"Bacterium": 0.5, "Virus": 0.25, "Infected": 2.0},
    "Antibody":  {"Bacterium": 1.0, "Virus": 2.0, "Infected": 0.25},
}

POWER_SCALE = 1.6
def mv(name, typ, power=0, pp=99, **kw):
    d = dict(name=name, type=typ, power=round(power * POWER_SCALE), pp=pp); d.update(kw); return d

CELLS = {
 "Neutrophil": dict(hp=55, atk=12, df=8, spd=15, decay=3, moves=[
    mv("Engulf", "Engulf", 9),
    mv("NET Trap", "Engulf", 7, pp=2, aoe=True, self_dmg=10),
    mv("Call for Backup", "Signal", inflam=15, pp=3)]),
 "Macrophage": dict(hp=90, atk=9, df=12, spd=6, moves=[
    mv("Engulf", "Engulf", 9),
    mv("Cytokine Alarm", "Signal", inflam=20, pp=3),
    mv("Present Antigen", "Signal", pp=1, present=True),
    mv("Clean Up", "Signal", pp=3, body_heal=8)]),
 "NK Cell": dict(hp=60, atk=13, df=8, spd=13, moves=[
    mv("Kill Check", "Cytotoxic", 9),
    mv("Perforin Strike", "Cytotoxic", 15, pp=3),
    mv("Interferon Signal", "Signal", inflam=10, pp=2, slow_virus=2)]),
 "Killer T Cell": dict(hp=75, atk=16, df=10, spd=10, arrives=4, moves=[
    mv("Targeted Kill", "Cytotoxic", 13),
    mv("Perforin & Granzyme", "Cytotoxic", 20, pp=3),
    mv("Clonal Expansion", "Signal", pp=1, self_heal=30)]),
 "B Cell": dict(hp=65, atk=14, df=9, spd=9, arrives=3, moves=[
    mv("Antibody Volley", "Antibody", 10),
    mv("Opsonize", "Signal", pp=3, opsonize=3),
    mv("Neutralize Toxin", "Antibody", 14, pp=3, stop_toxin=True)]),
}

def enemy(name, typ, hp, atk, df, spd, **kw):
    d = dict(name=name, type=typ, hp=hp, maxhp=hp, atk=atk, df=df, spd=spd, age=0); d.update(kw); return d

def staph(): return enemy("Staph Scout", "Bacterium", 28, 8, 7, 8, divide=4, hit=7, tissue=6)
def toxin_brewer(): return enemy("Toxin Brewer", "Bacterium", 90, 9, 10, 7, hit=9, tissue=6, clump=4, toxin_every=3, toxin=10, boss=True)
def virion(): return enemy("Flu Virion", "Virus", 22, 6, 6, 14, infect_after=3, hit=6, tissue=2)
def infected(): return enemy("Hijacked Lung Cell", "Infected", 45, 5, 8, 4, factory=2, hit=4, tissue=4, hide=True)
def factory_boss(): return enemy("Virus Factory", "Infected", 110, 6, 10, 4, factory=3, factory_n=2, hit=7, tissue=5, hide=True, boss=True)
def rstaph(): return enemy("Resistant Staph", "Bacterium", 32, 8, 8, 8, divide=4, hit=7, tissue=3)
def superbug(res): return enemy("Superbug Colony", "Bacterium", 130, 10, 9, 7, hit=10, tissue=5, divide=4,
                                 biofilm_every=4, biofilm=20, shield=40, resist=res, toxin_every=3, toxin=8, toxin_inflam=20, regen=2, boss=True)

LEVELS = {
 1: dict(name="The Scrape", party=["Neutrophil", "Macrophage"],
         waves=[lambda: [staph(), staph()], lambda: [toxin_brewer()]],
         items={"Rest": 2}),
 2: dict(name="The Cough", party=["Macrophage", "NK Cell", "Killer T Cell"],
         waves=[lambda: [virion(), virion()], lambda: [factory_boss()]],
         items={"Rest": 2, "Fever Reducer": 1, "Antibiotic": 2}),
 3: dict(name="The Superbug", party=["Neutrophil", "Macrophage", "B Cell"],
         waves=[lambda: [superbug(1), rstaph()]],
         items={"Rest": 2, "Fever Reducer": 1, "Old Antibiotic": 2, "Lab Culture": 1, "Targeted Antibiotic": 2, "Debridement": 2}),
}

class Battle:
    def __init__(self, lvl, policy, l2_antibiotics=0, rng=None):
        self.L = LEVELS[lvl]; self.lvl = lvl; self.policy = policy; self.r = rng or random.Random()
        self.cells = []
        for n in self.L["party"]:
            c = copy.deepcopy(CELLS[n]); c["name"] = n; c["maxhp"] = c["hp"]
            for m in c["moves"]: m["left"] = m["pp"]
            self.cells.append(c)
        self.items = dict(self.L["items"]); self.body = 100; self.inflam = 0; self.turn = 0
        self.presented = False; self.cultured = False; self.storm_turns = 0; self.abx_used = 0
        self.wave_i = 0; self.enemies = self.L["waves"][0]()
        if lvl == 3:
            self.enemies_next_res = 1 + l2_antibiotics
            for e in self.enemies:
                if "resist" in e: e["resist"] = self.enemies_next_res
        self.active = 0; self.slow_virus = 0; self.log = []

    def available(self, c):
        arr = c.get("arrives", 0)
        if self.presented and arr: arr -= 1
        return c["hp"] > 0 and self.turn >= arr

    def bonus(self): return 1 + min(self.inflam, 100) / 100

    def dmg(self, cell, m, e):
        eff = EFF[m["type"]][e["type"]]
        if e.get("hidden", 0) > 0 and m["type"] == "Cytotoxic":
            eff *= 1.5 if cell["name"] == "NK Cell" else 0.5   # missing-self
        if e.get("opsonized", 0) > 0 and m["type"] == "Engulf": eff *= 2
        if self.presented and cell["name"] in ("Killer T Cell", "B Cell"): eff *= 1.25
        d = m["power"] * cell["atk"] / (e["df"] * (1.3 if e.get("clumped") else 1)) * eff * self.bonus() * self.r.uniform(.9, 1.1)
        return max(1, round(d))

    def hit_enemy(self, e, d):
        if e.get("shield", 0) > 0:
            a = min(e["shield"], d); e["shield"] -= a; d -= a
        e["hp"] -= d

    def actions(self):
        acts = []
        c = self.cells[self.active]
        if self.available(c):
            for m in c["moves"]:
                if m["left"] <= 0: continue
                if m["type"] == "Signal":
                    if m.get("opsonize"):
                        acts += [("move", m, e) for e in self.enemies]
                    else: acts.append(("move", m, None))
                elif m.get("aoe"): acts.append(("move", m, None))
                else: acts += [("move", m, e) for e in self.enemies]
        for i, o in enumerate(self.cells):
            if i != self.active and self.available(o): acts.append(("swap", i, None))
        for it, n in self.items.items():
            if n <= 0: continue
            if it == "Targeted Antibiotic" and not self.cultured: continue
            if it in ("Antibiotic", "Old Antibiotic", "Targeted Antibiotic"):
                acts += [("item", it, e) for e in self.enemies]
            else: acts.append(("item", it, None))
        return acts

    def do(self, a):
        kind, x, tgt = a; c = self.cells[self.active]
        if kind == "swap": self.active = x; return
        if kind == "item":
            self.items[x] -= 1
            if x == "Rest": self.body = min(100, self.body + 20); self.inflam = max(0, self.inflam - 10)
            elif x == "Fever Reducer": self.inflam = max(0, self.inflam - 30)
            elif x == "Lab Culture": self.cultured = True
            elif x == "Debridement": [e.__setitem__("shield", 0) for e in self.enemies]
            elif x == "Antibiotic":  # level 2: does nothing to a virus
                self.abx_used += 1
                if tgt["type"] == "Bacterium": self.hit_enemy(tgt, 25)
            elif x in ("Old Antibiotic", "Targeted Antibiotic"):
                self.abx_used += 1
                base = 50 if x == "Targeted Antibiotic" else 50 * 0.3
                if tgt["type"] == "Bacterium":
                    res = tgt.get("resist", 0) if x == "Targeted Antibiotic" else 0
                    amt = base * max(0.25, 1 - 0.25 * res) * (0.25 if tgt.get("shield", 0) > 0 else 1)
                    tgt["hp"] -= round(amt)   # biofilm blocks most of the drug
                    if "resist" in tgt: tgt["resist"] += 1
            return
        m = x; m["left"] -= 1
        if m["type"] == "Signal":
            self.inflam += m.get("inflam", 0)
            if m.get("present"): self.presented = True
            if m.get("body_heal"): self.body = min(100, self.body + m["body_heal"])
            if m.get("self_heal"): c["hp"] = min(c["maxhp"], c["hp"] + m["self_heal"])
            if m.get("slow_virus"): self.slow_virus = m["slow_virus"]
            if m.get("opsonize"): tgt["opsonized"] = m["opsonize"]
            return
        targets = self.enemies if m.get("aoe") else [tgt]
        for e in list(targets): self.hit_enemy(e, self.dmg(c, m, e))
        if m.get("stop_toxin") and tgt is not None: tgt["toxin_block"] = 2
        if m.get("self_dmg"): c["hp"] -= m["self_dmg"]

    def enemy_turn(self):
        spawn = []
        for e in self.enemies:
            if e["hp"] <= 0: continue
            e["age"] += 1
            if e.get("regen"): e["hp"] = min(e["maxhp"], e["hp"] + e["regen"])
            if e.get("biofilm_every") and e["age"] % e["biofilm_every"] == 0: e["shield"] = min(40, e.get("shield", 0) + e["biofilm"])
            if e.get("hide") and e["age"] % 3 == 0: e["hidden"] = 2
            if e.get("infect_after") and e["age"] > e["infect_after"] + (1 if self.slow_virus else 0):
                e["convert"] = True; continue
            if e.get("factory") and e["age"] % e["factory"] == 0 and not self.slow_virus:
                spawn += [virion() for _ in range(e.get("factory_n", 1))]; continue
            if e.get("divide") and e["age"] % e["divide"] == 0 and len(self.enemies) + len(spawn) < 3:
                kid = rstaph() if e["name"].startswith("Resistant") else staph()
                kid["hp"] = round(kid["maxhp"] * .6); spawn.append(kid); continue
            if e.get("clump") and e["age"] % e["clump"] == 0: e["clumped"] = 2; continue
            if e.get("toxin_every") and e["age"] % e["toxin_every"] == 0 and not e.get("toxin_block"):
                self.body -= e["toxin"]; self.inflam += e.get("toxin_inflam", 0); continue
            c = self.cells[self.active]
            if self.r.random() < .55 and c["hp"] > 0:
                c["hp"] -= max(1, round(e["hit"] * e["atk"] / c["df"] * self.r.uniform(.9, 1.1)))
            else: self.body -= e["tissue"]
        for i, e in enumerate(self.enemies):
            if e.get("convert"): self.enemies[i] = infected()
        live = [e for e in self.enemies if e["hp"] > 0]
        self.enemies = (live + spawn)[:4]
        for e in self.enemies:
            for k in ("hidden", "opsonized", "toxin_block", "clumped"):
                if e.get(k, 0) > 0: e[k] -= 1

    def end_of_round(self):
        self.inflam = max(0, self.inflam - 2)
        if self.inflam >= 80: self.body -= 5; self.storm_turns += 1
        if self.slow_virus: self.slow_virus -= 1
        for c in self.cells:
            if c.get("decay") and c["hp"] > 0 and self.cells[self.active] is c: c["hp"] -= c["decay"]
        self.enemies = [e for e in self.enemies if e["hp"] > 0]
        if not self.enemies and self.wave_i + 1 < len(self.L["waves"]):
            self.wave_i += 1; self.enemies = self.L["waves"][self.wave_i]()
            if self.lvl == 3:
                for e in self.enemies:
                    if "resist" in e: e["resist"] = self.enemies_next_res
        if self.cells[self.active]["hp"] <= 0 or not self.available(self.cells[self.active]):
            opts = [i for i, c in enumerate(self.cells) if self.available(c)]
            if opts: self.active = opts[0]

    def run(self, max_turns=40):
        while self.turn < max_turns:
            self.turn += 1
            if not any(self.available(c) for c in self.cells):
                if all(c["hp"] <= 0 for c in self.cells): return self.result(False, "all cells down")
                self.enemy_turn(); self.end_of_round(); continue
            if not self.available(self.cells[self.active]): self.end_of_round()
            acts = self.actions()
            if acts: self.do(self.policy(self, acts))
            self.enemies = [e for e in self.enemies if e["hp"] > 0]
            if self.enemies: self.enemy_turn()
            self.end_of_round()
            if self.body <= 0: return self.result(False, "body")
            if all(c["hp"] <= 0 for c in self.cells): return self.result(False, "all cells down")
            if not self.enemies: return self.result(True, "clear")
        return self.result(False, "timeout")

    def result(self, win, why):
        return dict(win=win, why=why, turns=self.turn, body=max(0, self.body), storm=self.storm_turns, abx=self.abx_used)

def expected(b, a):
    kind, x, e = a; c = b.cells[b.active]
    if kind != "move" or x["type"] == "Signal": return 0
    tg = b.enemies if x.get("aoe") else [e]
    tot = 0
    for t in tg:
        d = x["power"] * c["atk"] / (t["df"] * (1.3 if t.get("clumped") else 1)) * EFF[x["type"]][t["type"]] * b.bonus()
        if t.get("hidden", 0) > 0 and x["type"] == "Cytotoxic": d *= 1.5 if c["name"] == "NK Cell" else .5
        if t.get("opsonized", 0) > 0 and x["type"] == "Engulf": d *= 2
        if b.presented and c["name"] in ("Killer T Cell", "B Cell"): d *= 1.25
        if d >= t["hp"] + t.get("shield", 0): d += 8   # prefer finishing kills
        tot += min(d, t["hp"] + t.get("shield", 0) + 8) - (t.get("shield", 0) if not x.get("aoe") else 0) * .5
    return tot

def smart(b, acts):
    def pick(pred):
        for a in acts:
            if pred(a): return a
    if b.body < 40 and b.items.get("Rest", 0): return pick(lambda a: a[1] == "Rest")
    if b.body < 55:
        p = pick(lambda a: a[0] == "move" and a[1].get("body_heal"))
        if p: return p
    if b.inflam >= 70 and b.items.get("Fever Reducer", 0): return pick(lambda a: a[1] == "Fever Reducer")
    if not b.presented:
        p = pick(lambda a: a[0] == "move" and a[1].get("present"))
        if p: return p
    if b.lvl == 3 and not b.cultured and any(e.get("boss") for e in b.enemies):
        p = pick(lambda a: a[1] == "Lab Culture")
        if p: return p
    if b.lvl == 3 and b.cultured and b.items.get("Targeted Antibiotic", 0):
        if any(e.get("boss") and e.get("shield", 0) > 0 for e in b.enemies) and b.items.get("Debridement", 0):
            return pick(lambda a: a[1] == "Debridement")
        p = pick(lambda a: a[1] == "Targeted Antibiotic" and a[2].get("boss"))
        if p: return p
    if b.lvl == 3 and any(e.get("toxin_every") and e["age"] % 3 == 2 for e in b.enemies):
        p = pick(lambda a: a[0] == "move" and a[1].get("stop_toxin") and a[2].get("boss"))
        if p: return p
    if b.inflam < 30 and sum(e["hp"] for e in b.enemies) > 60:
        p = pick(lambda a: a[0] == "move" and a[1].get("inflam"))
        if p: return p
    if any(e.get("factory") for e in b.enemies) and not b.slow_virus:
        p = pick(lambda a: a[0] == "move" and a[1].get("slow_virus"))
        if p: return p
    boss = [e for e in b.enemies if e.get("boss")]
    if boss and not boss[0].get("opsonized"):
        p = pick(lambda a: a[0] == "move" and a[1].get("opsonize") and a[2].get("boss"))
        if p and any(c["name"] in ("Neutrophil", "Macrophage") and c["hp"] > 0 for c in b.cells): return p
    moves = [a for a in acts if a[0] == "move" and a[1]["type"] != "Signal"]
    best = max(moves, key=lambda a: expected(b, a) * (1 if a[1]["pp"] > 50 or a[2] is None or a[2]["hp"] > 15 else .6), default=None)
    c = b.cells[b.active]
    swaps = [a for a in acts if a[0] == "swap"]
    if swaps:
        def best_for(i):
            old = b.active; b.active = i
            v = max([expected(b, ("move", m, e)) for m in b.cells[i]["moves"] if m["left"] > 0 and m["type"] != "Signal"
                     for e in b.enemies] or [0]); b.active = old; return v
        bv = expected(b, best) if best else 0
        cand = max(swaps, key=lambda a: best_for(a[1]))
        if b.cells[cand[1]]["hp"] >= 20 and (best_for(cand[1]) > bv * 1.6 or (c["hp"] < 15 and b.cells[cand[1]]["hp"] > 30)): return cand
    if best: return best
    return b.r.choice(acts)

def rand_policy(b, acts):
    return b.r.choice(acts)

def run(lvl, policy, n=2000, **kw):
    rs = [Battle(lvl, policy, rng=random.Random(i), **kw).run() for i in range(n)]
    w = [r for r in rs if r["win"]]
    out = dict(win=round(len(w) / n, 3),
               turns=round(statistics.mean(r["turns"] for r in w), 1) if w else None,
               body=round(statistics.mean(r["body"] for r in w), 1) if w else None,
               storm=round(statistics.mean(r["storm"] for r in rs), 2))
    whys = {}
    for r in rs:
        if not r["win"]: whys[r["why"]] = whys.get(r["why"], 0) + 1
    out["losses"] = whys
    return out

if __name__ == "__main__":
    for lvl in (1, 2, 3):
        print(lvl, LEVELS[lvl]["name"], "smart", run(lvl, smart), "| random", run(lvl, rand_policy))
    print("L3 if player wasted 2 antibiotics in L2 (smart):", run(3, smart, l2_antibiotics=2))
