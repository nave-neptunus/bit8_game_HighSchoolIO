// ===== 8-bit sprites: hand-drawn people, procedural cells/germs, tiles =====
const SPR = (() => {
  const OUT = "#1b1428";
  function grid(w, h) { return Array.from({ length: h }, () => Array(w).fill(null)); }
  function toCanvas(g) {
    const h = g.length, w = g[0].length, c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j][i]) { x.fillStyle = g[j][i]; x.fillRect(i, j, 1, 1); }
    return c;
  }
  function fromRows(rows, pal) { return rows.map(r => [...r].map(ch => ch === "." ? null : pal[ch])); }
  function mirror(g) { return g.map(r => r.slice().reverse()); }

  // ---------- hand-drawn people (16x16) ----------
  const HEAD_DOWN = [
    "................",
    ".....kkkkkk.....",
    "....kttttttk....",
    "...kttttwtttk...",
    "...kkkkkkkkkk...",
    "...khsssssshk...",
    "...kskssssksk...",
    "...kssssssssk...",
    "....kssrrssk....",
  ];
  const BODY_DOWN = [
    "....kwwwwwwk....",
    "...kwwwccwwwk...",
    "...swwwccwwws...",
    "...kwwwwwwwwk...",
  ];
  const HEAD_UP = [
    "................",
    ".....kkkkkk.....",
    "....kttttttk....",
    "...kttttttttk...",
    "...kkkkkkkkkk...",
    "...khhhhhhhhk...",
    "...khhhhhhhhk...",
    "...khhhhhhhhk...",
    "....khhhhhhk....",
  ];
  const BODY_UP = [
    "....kwwwwwwk....",
    "...kwwwwwwwwk...",
    "...swwwwwwwws...",
    "...kwwwwwwwwk...",
  ];
  const LEGS = [
    ["....kppk.kppk...", "....kbbk.kbbk...", "....kkkk.kkkk..."],
    ["....kppk.kppk...", "....kbbk.kkkk...", "....kkkk........"],
    ["....kppk.kppk...", "....kkkk.kbbk...", ".........kkkk..."],
  ];
  const SIDE = [
    "................",
    "......kkkkk.....",
    ".....kttttttk...",
    "....kttttttttk..",
    "....kkkkkkkkkkk.",
    "....khhhssssk...",
    "....khhsssskk...",
    "....khsssssssk..",
    ".....kssssssk...",
    ".....kwwwwwwk...",
    "....kwwwccwwk...",
    "....kwwwcswwk...",
    "....kwwwwwwwk...",
  ];
  const SIDE_LEGS = [
    [".....kppppk.....", ".....kbbbbk.....", ".....kkkkkk....."],
    ["....kppkppk.....", "...kbbk.kbbk....", "...kkkk.kkkk...."],
  ];
  function person(pal) {
    const P = Object.assign({ k: OUT, s: "#f0b98a", h: "#4a2c1a", r: "#c0605a", p: "#34406b", b: "#5a3a22" }, pal);
    const out = {};
    const down = f => fromRows(HEAD_DOWN.concat(BODY_DOWN, LEGS[f]), P);
    const up = f => fromRows(HEAD_UP.concat(BODY_UP, LEGS[f]), P);
    const right = f => fromRows(SIDE.concat(SIDE_LEGS[f]), P);
    out.down = [down(0), down(1), down(0), down(2)].map(toCanvas);
    out.up = [up(0), up(1), up(0), up(2)].map(toCanvas);
    out.right = [right(0), right(1), right(0), right(1)].map(toCanvas);
    out.left = [right(0), right(1), right(0), right(1)].map(g => toCanvas(mirror(g)));
    return out;
  }

  // ---------- procedural blobs (cells & germs) ----------
  function makeBlob(size, parts, opts = {}) {
    const g = grid(size, size), shade = grid(size, size);
    const put = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < size && y < size) g[y][x] = col; };
    for (const p of parts) {
      if (p.t === "circle" || p.t === "ellipse") {
        const rx = p.rx || p.r, ry = p.ry || p.r;
        for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
          const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
          if (d <= 1.0) {
            let col = p.c;
            if (p.sh && (x / rx + y / ry) > 0.75 && d > 0.35) col = p.sh;       // lower-right shading
            if (p.hi && x / rx < -0.35 && y / ry < -0.35 && d < 0.55 && d > 0.15) col = p.hi;
            put(p.x + x, p.y + y, col);
          }
        }
      } else if (p.t === "line") {
        const n = Math.max(Math.abs(p.x2 - p.x), Math.abs(p.y2 - p.y));
        for (let i = 0; i <= n; i++) put(p.x + (p.x2 - p.x) * i / n, p.y + (p.y2 - p.y) * i / n, p.c);
      } else if (p.t === "px") put(p.x, p.y, p.c);
      else if (p.t === "rect") for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) put(p.x + x, p.y + y, p.c);
    }
    // outline pass
    const o = g.map(r => r.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (g[y][x]) continue;
      if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== "skip")) o[y][x] = opts.outline || OUT;
    }
    // face (drawn after outline so it sits on top)
    const f = opts.face;
    if (f) {
      const W = "#ffffff", K = OUT;
      for (const [ex] of [[f.x - f.gap], [f.x + f.gap]]) {
        if (f.style === "angry") { o[f.y][ex] = K; o[f.y][ex + 1] = W; o[f.y + 1][ex] = K; o[f.y + 1][ex + 1] = K; o[f.y - 1][ex + (ex < f.x ? 0 : 1)] = K; }
        else if (f.style === "visor") { o[f.y][ex] = K; o[f.y][ex + 1] = f.vc || "#ffe066"; }
        else { o[f.y][ex] = W; o[f.y][ex + 1] = K; o[f.y + 1][ex] = K; o[f.y + 1][ex + 1] = K; }
      }
      if (f.mouth === "smile") { o[f.y + 3][f.x] = K; o[f.y + 3][f.x + 1] = K; o[f.y + 2][f.x - 1] = K; o[f.y + 2][f.x + 2] = K; }
      else if (f.mouth === "grin") { for (let i = -1; i <= 2; i++) o[f.y + 3][f.x + i] = K; o[f.y + 2][f.x - 2] = K; o[f.y + 2][f.x + 3] = K; o[f.y + 3][f.x] = W; }
      else if (f.mouth === "frown") { o[f.y + 2][f.x] = K; o[f.y + 2][f.x + 1] = K; o[f.y + 3][f.x - 1] = K; o[f.y + 3][f.x + 2] = K; }
      else if (f.mouth === "fang") { for (let i = -1; i <= 2; i++) o[f.y + 3][f.x + i] = K; o[f.y + 4][f.x - 1] = W; o[f.y + 4][f.x + 2] = W; }
    }
    return toCanvas(o);
  }
  const C = (x, y, r, c, sh, hi) => ({ t: "circle", x, y, r, c, sh, hi });
  const EL = (x, y, rx, ry, c, sh, hi) => ({ t: "ellipse", x, y, rx, ry, c, sh, hi });
  const L = (x, y, x2, y2, c) => ({ t: "line", x, y, x2, y2, c });
  const PX = (x, y, c) => ({ t: "px", x, y, c });
  function spikes(cx, cy, r, n, len, c, tip, rot = 0) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i * 2 * Math.PI / n, x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r, x2 = cx + Math.cos(a) * (r + len), y2 = cy + Math.sin(a) * (r + len);
      out.push(L(x1, y1, x2, y2, c)); if (tip) out.push(C(Math.round(x2), Math.round(y2), 1, tip));
    }
    return out;
  }
  const GOLD = ["#f2c94c", "#c9932b", "#fff2b0"], STEEL = ["#b8c2cc", "#7d8894", "#eef3f7"], ORANGE = ["#f29a4c", "#c0642a", "#ffd2a6"];
  const CREATURES = {
    staph: () => makeBlob(24, [C(7, 9, 4, ...GOLD), C(16, 8, 4, ...GOLD), C(18, 15, 4, ...GOLD), C(11, 14, 6, ...GOLD)], { face: { x: 10, y: 13, gap: 3, mouth: "grin" } }),
    rstaph: () => makeBlob(24, [C(7, 10, 4, ...STEEL), C(17, 9, 4, ...STEEL), C(18, 16, 4, ...STEEL), C(11, 15, 6, ...STEEL),
      EL(11, 8, 6, 2, "#d84a4a", "#9e2f2f"), PX(11, 5, "#d84a4a"), PX(11, 4, "#ffe066")], { face: { x: 10, y: 14, gap: 3, style: "angry", mouth: "frown" } }),
    brewer: () => makeBlob(32, [C(8, 12, 5, ...ORANGE), C(23, 11, 5, ...ORANGE), C(6, 21, 5, ...ORANGE), C(25, 21, 5, ...ORANGE), C(15, 7, 5, ...ORANGE), C(16, 18, 9, ...ORANGE),
      C(9, 28, 2, "#7bd36a", "#3f9a3a"), C(21, 29, 2, "#7bd36a", "#3f9a3a"), PX(9, 31, "#7bd36a"), PX(14, 30, "#7bd36a")], { face: { x: 15, y: 16, gap: 4, style: "angry", mouth: "fang" } }),
    virion: () => makeBlob(24, [...spikes(12, 12, 6, 10, 3, "#e05a7a", "#ff9ab0", 0.3), C(12, 12, 7, "#8d96f2", "#5c63c4", "#d6dbff")], { face: { x: 11, y: 11, gap: 3, mouth: "grin" } }),
    infected: () => makeBlob(24, [EL(12, 13, 10, 8, "#f4a6b8", "#cf7c92", "#ffe0e8"), C(14, 9, 3, "#8a4fa0", "#5e2f73"), PX(13, 9, "#e05a7a"), PX(15, 10, "#e05a7a"),
      ...spikes(5, 7, 1, 5, 2, "#e05a7a", null, 0.5)], { face: { x: 10, y: 13, gap: 3, mouth: "frown" } }),
    factory: () => makeBlob(32, [EL(16, 20, 14, 10, "#f4a6b8", "#cf7c92", "#ffe0e8"), C(16, 22, 3, "#8a4fa0", "#5e2f73"),
      ...spikes(8, 7, 3, 7, 2, "#e05a7a", null, 0), C(8, 7, 3, "#8d96f2", "#5c63c4"), ...spikes(23, 5, 3, 7, 2, "#e05a7a", null, 0.4), C(23, 5, 3, "#8d96f2", "#5c63c4"),
      ...spikes(16, 10, 2, 6, 2, "#e05a7a", null, 0.2), C(16, 10, 2, "#8d96f2")], { face: { x: 15, y: 17, gap: 5, style: "angry", mouth: "grin" } }),
    superbug: () => makeBlob(32, [EL(16, 19, 15, 12, "#9b6bd6", "#6a3fa3", "#d9c2ff"), C(8, 20, 3, ...STEEL), C(24, 22, 3, ...STEEL), C(13, 26, 3, ...GOLD), C(21, 13, 2, ...STEEL), C(10, 13, 2, ...GOLD),
      PX(5, 31, "#9b6bd6"), PX(27, 31, "#9b6bd6"), PX(16, 31, "#9b6bd6")], { face: { x: 15, y: 17, gap: 5, style: "angry", mouth: "fang" }, outline: "#3b1d63" }),
    strep: () => makeBlob(24, [C(4, 6, 3, ...ORANGE), C(8, 9, 3, ...ORANGE), C(12, 12, 3.5, ...ORANGE), C(16, 15, 3, ...ORANGE), C(20, 18, 3, ...ORANGE)],
      { face: { x: 11, y: 11, gap: 2, mouth: "grin" } }),
    rhino: () => makeBlob(24, [...spikes(12, 13, 6, 8, 2, "#4fb0a0", "#a8f0e0", 0), C(12, 13, 6, "#7fd6c4", "#3f9a8a", "#d8fff6")],
      { face: { x: 11, y: 12, gap: 2, mouth: "smile" } }),
    pseudo: () => makeBlob(24, [EL(11, 12, 8, 4, "#6fc7d9", "#3a8fa3", "#d0f4fb"), L(19, 12, 21, 10, "#3a8fa3"), L(21, 10, 23, 12, "#3a8fa3"), L(23, 12, 23, 14, "#3a8fa3"),
      PX(4, 17, "#9b6bd6"), PX(8, 18, "#9b6bd6"), PX(14, 18, "#9b6bd6"), PX(6, 6, "#9b6bd6"), PX(15, 6, "#9b6bd6")], { face: { x: 10, y: 11, gap: 3, mouth: "grin" } }),
    // player cells (24x24)
    Neutrophil: () => makeBlob(24, [C(12, 12, 10, "#ece5f8", "#c3b6e0", "#ffffff"), C(8, 9, 3, "#8a63c7", "#5e3f99"), C(13, 7, 3, "#8a63c7", "#5e3f99"), C(17, 10, 3, "#8a63c7", "#5e3f99"),
      L(10, 9, 12, 8, "#5e3f99"), L(15, 8, 16, 9, "#5e3f99")], { face: { x: 11, y: 14, gap: 3, mouth: "smile" } }),
    Macrophage: () => makeBlob(24, [EL(12, 13, 10, 8, "#f0d9a8", "#c9a96e", "#fff4d6"), C(2, 10, 2, "#f0d9a8", "#c9a96e"), C(22, 9, 2, "#f0d9a8", "#c9a96e"), C(4, 20, 2, "#f0d9a8"), C(20, 21, 2, "#f0d9a8"),
      C(16, 9, 3, "#b07a3a", "#7d5222")], { face: { x: 10, y: 13, gap: 3, mouth: "smile" } }),
    "NK Cell": () => makeBlob(24, [...spikes(12, 12, 8, 12, 2, "#4f9a44", null, 0), C(12, 12, 9, "#9fdc8c", "#6bb05a", "#dcf7d2"), PX(7, 16, "#2f6a2a"), PX(16, 7, "#2f6a2a"), PX(17, 16, "#2f6a2a"), PX(8, 8, "#2f6a2a")],
      { face: { x: 11, y: 11, gap: 3, style: "angry", mouth: "smile" } }),
    "Killer T Cell": () => makeBlob(24, [C(12, 14, 9, "#6fb3f2", "#3f7fc0", "#d6ecff"), L(7, 6, 7, 3, "#2a5c96"), L(7, 3, 5, 1, "#2a5c96"), L(7, 3, 9, 1, "#2a5c96"),
      L(16, 6, 16, 3, "#2a5c96"), L(16, 3, 14, 1, "#2a5c96"), L(16, 3, 18, 1, "#2a5c96"), { t: "rect", x: 6, y: 12, w: 12, h: 3, c: "#22324a" }],
      { face: { x: 10, y: 13, gap: 3, style: "visor", vc: "#ffe066", mouth: "smile" } }),
    "B Cell": () => makeBlob(24, [C(12, 13, 9, "#f5b971", "#c98a3e", "#ffe6c4"), L(2, 4, 4, 6, "#d84a8a"), L(4, 2, 4, 6, "#d84a8a"), L(4, 6, 4, 8, "#d84a8a"),
      L(20, 3, 20, 7, "#d84a8a"), L(22, 2, 20, 4, "#d84a8a"), L(18, 2, 20, 4, "#d84a8a"), L(1, 18, 3, 18, "#d84a8a"), L(21, 20, 23, 20, "#d84a8a"), C(12, 10, 3, "#a3602a", "#7a4418")],
      { face: { x: 11, y: 14, gap: 3, mouth: "smile" } }),
  };

  // ---------- tiles (16x16) ----------
  function tile(fn) { const c = document.createElement("canvas"); c.width = c.height = 16; fn(c.getContext("2d")); return c; }
  function speck(x, base, dots, seed) {
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (const [col, n] of dots) { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1); }
  }
  function makeTiles(P) {
    const T = {};
    T.floor = tile(x => speck(x, P.floor, [[P.floorDot, 10], [P.floorDot2, 5]], 7));
    T.path = tile(x => { speck(x, P.path, [[P.pathDot, 8]], 3); });
    T.grass = tile(x => {
      speck(x, P.floor, [[P.floorDot, 4]], 11);
      for (const [gx, gy] of [[1, 2], [6, 1], [11, 3], [3, 8], [8, 7], [13, 9], [1, 13], [6, 12], [11, 14]]) {
        x.fillStyle = P.grassDk; x.fillRect(gx, gy + 1, 1, 3); x.fillRect(gx + 2, gy + 1, 1, 3);
        x.fillStyle = P.grass; x.fillRect(gx + 1, gy, 1, 4); x.fillRect(gx, gy + 2, 1, 1); x.fillRect(gx + 2, gy + 2, 1, 1);
      }
    });
    T.wall = tile(x => {
      x.fillStyle = P.wallDk; x.fillRect(0, 0, 16, 16);
      for (const [cx, cy] of [[4, 4], [12, 4], [8, 11], [0, 11], [16, 11]]) {
        x.fillStyle = P.wall; x.beginPath(); x.ellipse(cx, cy, 4, 3.5, 0, 0, 7); x.fill();
        x.fillStyle = P.wallHi; x.fillRect(cx - 2, cy - 2, 2, 1);
        x.fillStyle = P.wallNuc; x.fillRect(cx, cy, 2, 2);
      }
    });
    T.water = [0, 1].map(f => tile(x => {
      x.fillStyle = P.water; x.fillRect(0, 0, 16, 16);
      x.fillStyle = P.waterHi;
      for (let i = 0; i < 3; i++) { const y = 3 + i * 5, o = (f * 4 + i * 3) % 16; x.fillRect(o, y, 4, 1); x.fillRect((o + 9) % 16, y + 2, 3, 1); }
      x.fillStyle = P.waterCell; x.beginPath(); x.ellipse(4 + f * 6, 9, 2, 1.4, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(12 - f * 5, 4, 2, 1.4, 0, 0, 7); x.fill();
    }));
    T.lymph = tile(x => {
      speck(x, P.path, [[P.pathDot, 6]], 5);
      x.fillStyle = OUT; x.beginPath(); x.ellipse(8, 8, 7.5, 6.5, 0, 0, 7); x.fill();
      x.fillStyle = "#5fcf7a"; x.beginPath(); x.ellipse(8, 8, 6.5, 5.5, 0, 0, 7); x.fill();
      x.fillStyle = "#3d9a55"; x.fillRect(10, 4, 3, 2);
      x.fillStyle = "#ffffff"; x.fillRect(7, 5, 2, 6); x.fillRect(5, 7, 6, 2);
    });
    T.sign = tile(x => {
      speck(x, P.floor, [[P.floorDot, 6]], 2);
      x.fillStyle = OUT; x.fillRect(2, 2, 12, 9); x.fillRect(7, 11, 2, 4);
      x.fillStyle = "#d9a05b"; x.fillRect(3, 3, 10, 7); x.fillStyle = "#8a5a2b"; x.fillRect(5, 5, 6, 1); x.fillRect(5, 7, 4, 1);
    });
    T.gate = tile(x => {   // swollen tissue barrier: puffy red lumps with a sore outline
      speck(x, P.floor, [[P.floorDot, 6]], 9);
      for (const [cx, cy, r] of [[5, 6, 5], [11, 5, 4.5], [8, 11, 5.5], [13, 12, 3.5], [3, 12, 3.5]]) {
        x.fillStyle = OUT; x.beginPath(); x.arc(cx, cy, r + 1, 0, 7); x.fill();
      }
      for (const [cx, cy, r] of [[5, 6, 5], [11, 5, 4.5], [8, 11, 5.5], [13, 12, 3.5], [3, 12, 3.5]]) {
        x.fillStyle = "#e0524f"; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
        x.fillStyle = "#f58a7c"; x.fillRect(cx - 2, cy - 2, 2, 2);
      }
    });
    T.exit = tile(x => {
      speck(x, P.path, [[P.pathDot, 6]], 4);
      x.fillStyle = OUT; x.fillRect(4, 6, 7, 4); x.beginPath(); x.moveTo(10, 3); x.lineTo(15, 8); x.lineTo(10, 13); x.fill();
      x.fillStyle = "#ffe066"; x.fillRect(5, 7, 6, 2); x.beginPath(); x.moveTo(11, 5); x.lineTo(14, 8); x.lineTo(11, 11); x.fill();
    });
    T.hub = tile(x => {   // clinic floor: soft tiles
      x.fillStyle = P.path; x.fillRect(0, 0, 16, 16);
      x.fillStyle = P.pathDot; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(8, 0, 1, 16); x.fillRect(0, 8, 16, 1);
      x.fillStyle = "#ffffff"; x.globalAlpha = 0.5; x.fillRect(2, 2, 2, 1); x.fillRect(10, 10, 2, 1); x.globalAlpha = 1;
    });
    T.decor = tile(x => {
      speck(x, P.floor, [[P.floorDot, 6]], 13);
      if (P.decor === "fat") {            // fat cells: big yellow bubbles
        for (const [cx, cy, r] of [[5, 6, 4.5], [11, 9, 4.5], [5, 12, 3.5]]) {
          x.fillStyle = OUT; x.beginPath(); x.arc(cx, cy, r + 1, 0, 7); x.fill();
          x.fillStyle = "#f7dc7a"; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
          x.fillStyle = "#fff4c0"; x.fillRect(cx - 2, cy - 2, 2, 1); x.fillStyle = "#c9a23a"; x.fillRect(cx + 1, cy + 1, 1, 1);
        }
      } else if (P.decor === "cilia") {   // cilia: waving hair-like tufts
        x.fillStyle = OUT; x.fillRect(2, 13, 12, 2);
        for (let i = 0; i < 6; i++) { const bx = 3 + i * 2; x.fillStyle = P.wallDk; x.fillRect(bx, 4 + (i % 2), 1, 9); x.fillStyle = P.wallHi; x.fillRect(bx, 3 + (i % 2), 1, 2); }
      } else {                            // stitches: a healing cut held by dark-blue thread
        x.fillStyle = "#e7c9b9"; x.fillRect(0, 7, 16, 3); x.fillStyle = "#b8645a"; x.fillRect(0, 8, 16, 1);
        x.fillStyle = "#2a3d8f"; for (let i = 0; i < 3; i++) for (let k = 0; k < 7; k++) x.fillRect(2 + i * 5 + Math.floor(k / 2), 5 + k, 1, 1);
      }
    });
    return T;
  }
  // supply pack (overworld pickup): white case with a green plus
  const ITEM = (() => { const g = fromRows([
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    "...kkkkkkkkkk...",
    "...kwwwwwwwwk...",
    "...kwwwggwwwk...",
    "...kwwggggwwk...",
    "...kwwwggwwwk...",
    "...kwwwwwwwwk...",
    "...kddddddddk...",
    "...kkkkkkkkkk...",
    "................",
    "................",
    "................"], { k: OUT, w: "#ffffff", g: "#3fb35f", d: "#cfc7d9" }); return toCanvas(g); })();
  const BUBBLE = toCanvas(fromRows([
    ".kkkkkkk.",
    "kwwwrwwwk",
    "kwwwrwwwk",
    "kwwwrwwwk",
    "kwwwwwwwk",
    "kwwwrwwwk",
    ".kkkkkkk.",
    "...kwk...",
    "....k...."], { k: OUT, w: "#ffffff", r: "#e0524f" }));
  const BADGE = toCanvas(fromRows([
    "..k..",
    ".kyk.",
    "kyyyk",
    ".kyk.",
    "k.k.k"].map(r => r.replace(/k/g, "k")), { k: OUT, y: "#f2c94c" }));
  return { person, CREATURES, makeTiles, OUT, ITEM, BUBBLE, BADGE };
})();
if (typeof module !== "undefined") module.exports = SPR;
