// node test_world.js : checks every map is the right shape, every character is defined,
// captains can see, and the area can be finished in order (captains -> gate -> boss -> exit).
const W = require("./world.js");
const { ENEMIES } = require("./engine.js");
let fails = 0;
const fail = (a, m) => { fails++; console.log(`  FAIL area ${a}: ${m}`); };
const TERRAIN = new Set("#.,~=+oLGB>@");
const WALK = new Set(".,=+L>@");
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

for (const [n, A] of Object.entries(W.AREAS)) {
  const M = A.map, H = M.length, Wd = M[0].length;
  M.forEach((r, y) => { if (r.length !== Wd) fail(n, `row ${y} is ${r.length} wide, expected ${Wd}`); });
  const at = (x, y) => (M[y] && M[y][x]) || "#";
  const count = ch => M.join("").split(ch).length - 1;
  for (const ch of "@LGB>") if (count(ch) !== 1) fail(n, `expected exactly one '${ch}', found ${count(ch)}`);
  const ents = {};
  M.forEach((r, y) => [...r].forEach((ch, x) => {
    if (TERRAIN.has(ch)) return;
    if (!A.ents[ch]) return fail(n, `unknown map character '${ch}' at ${x},${y}`);
    if (ents[ch]) fail(n, `entity '${ch}' placed twice`);
    ents[ch] = { x, y, ...A.ents[ch] };
  }));
  for (const k of Object.keys(A.ents)) if (!ents[k]) fail(n, `entity '${k}' is defined but not on the map`);
  for (const [, e] of Object.entries(ents)) if (e.type === "captain") for (const g of e.team) if (!ENEMIES[g]) fail(n, `captain ${e.name} has unknown germ ${g}`);
  for (const [g] of A.wild) if (!ENEMIES[g]) fail(n, `unknown wild germ ${g}`);
  for (const g of A.boss.team) if (!ENEMIES[g]) fail(n, `unknown boss germ ${g}`);

  const entAt = (x, y) => Object.values(ents).find(e => e.x === x && e.y === y);
  const walkable = (x, y, open) => {
    const t = at(x, y), e = entAt(x, y);
    if (e) return e.type === "item" && e.hidden;
    if (t === "G") return open.gate; if (t === "B") return open.boss;
    return WALK.has(t);
  };
  const find = ch => { for (let y = 0; y < H; y++) { const x = M[y].indexOf(ch); if (x >= 0) return { x, y }; } };
  const flood = open => {
    const s = find("@"), seen = new Set([s.x + "," + s.y]), q = [s];
    while (q.length) { const { x, y } = q.shift(); for (const [dx, dy] of Object.values(DIRV)) { const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (!seen.has(k) && walkable(nx, ny, open)) { seen.add(k); q.push({ x: nx, y: ny }); } } }
    return seen;
  };
  const near = (seen, p) => Object.values(DIRV).some(([dx, dy]) => seen.has((p.x + dx) + "," + (p.y + dy)));
  const closed = flood({}), gated = flood({ gate: true }), done = flood({ gate: true, boss: true });
  for (const [k, e] of Object.entries(ents)) if (!(e.hidden ? closed.has(e.x + "," + e.y) : near(closed, e))) fail(n, `can't reach '${k}' (${e.type}) before the gate`);
  if (!near(closed, find("L"))) fail(n, "lymph node unreachable");
  if (!near(closed, find("G"))) fail(n, "gate unreachable");
  if (near(closed, find("B"))) fail(n, "boss reachable without opening the gate");
  if (!near(gated, find("B"))) fail(n, "boss unreachable after the gate opens");
  if (gated.has(find(">").x + "," + find(">").y)) fail(n, "exit reachable without beating the boss");
  if (!done.has(find(">").x + "," + find(">").y)) fail(n, "exit unreachable after the boss");
  // captains need an open line of sight that the player can stand in
  for (const e of Object.values(ents).filter(e => e.type === "captain")) {
    const [dx, dy] = DIRV[e.dir]; let seenTiles = 0;
    for (let i = 1; i <= e.range; i++) { const x = e.x + dx * i, y = e.y + dy * i; if (!walkable(x, y, {})) break; if (closed.has(x + "," + y)) seenTiles++; }
    if (!seenTiles) fail(n, `${e.name} can't see any tile the player can reach`);
  }
  const grass = count(",");
  console.log(`Area ${n} ${A.name}: ${Wd}x${H}, ${Object.keys(ents).length} entities, ${grass} grass tiles, ${closed.size} reachable tiles`);
}
console.log(fails ? `${fails} problem(s)` : "world OK");
process.exit(fails ? 1 : 0);
