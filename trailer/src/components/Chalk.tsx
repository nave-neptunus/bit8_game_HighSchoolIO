// Classroom pieces: chalkboard in a wood frame, chalk handwriting that writes itself in, hand-drawn chalk strokes,
// and a taped-on sticky note. Everything is textured so it reads as real chalk and paper, not flat vector UI.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, clamp } from "../theme";

const C = theme.colors;

// Dusty chalk: an alpha noise mask punches tiny holes into the strokes.
const CHALK_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.5 1.55'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23c)'/%3E%3C/svg%3E")`;
export const chalkTexture: React.CSSProperties = {
  WebkitMaskImage: CHALK_MASK, maskImage: CHALK_MASK, WebkitMaskSize: "240px", maskSize: "240px",
  textShadow: "0 0 1px rgba(255,255,255,0.35), 0 0 6px rgba(255,255,255,0.12)",
};

// Old, half-erased lessons still visible on the board.
const GHOSTS = [
  { t: "3x + 4 = 19", x: 0.62, y: 0.08, r: -3, s: 34 },
  { t: "photosynthesis", x: 0.05, y: 0.86, r: 2, s: 30 },
  { t: "→ cells", x: 0.7, y: 0.9, r: -2, s: 28 },
  { t: "H2O", x: 0.82, y: 0.42, r: 4, s: 30 },
];

export const Board: React.FC<{ w: number; h: number; x: number; y: number; tray?: boolean; children?: React.ReactNode; seed?: number }> =
({ w, h, x, y, tray = true, children, seed = 0 }) => {
  const F = 22;   // frame thickness
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {/* wood frame with grain */}
      <div style={{ position: "absolute", inset: -F, borderRadius: 6,
        background: `repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 3px, transparent 3px 11px), linear-gradient(180deg, ${C.wood}, ${C.woodDark})`,
        boxShadow: `0 18px 30px ${C.shadow}, 0 2px 0 rgba(255,255,255,0.25) inset, 0 -3px 0 rgba(0,0,0,0.2) inset` }} />
      {/* slate */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 2,
        background: `radial-gradient(ellipse at 30% 25%, #375443 0%, ${C.board} 45%, ${C.boardDark} 100%)`,
        boxShadow: "0 0 0 3px rgba(0,0,0,0.25) inset, 0 6px 18px rgba(0,0,0,0.35) inset" }}>
        {/* eraser smudges */}
        {[[0.18, 0.3, 520, 90, -6], [0.55, 0.62, 640, 120, 4], [0.3, 0.85, 480, 70, -2], [0.75, 0.18, 380, 80, 8]].map(([sx, sy, sw, sh, r], i) => (
          <div key={i} style={{ position: "absolute", left: (sx as number) * w - (sw as number) / 2, top: (sy as number) * h - (sh as number) / 2,
            width: sw, height: sh, borderRadius: "50%", transform: `rotate(${r}deg)`, filter: "blur(18px)",
            background: `rgba(255,255,255,${0.035 + ((i + seed) % 3) * 0.012})` }} />
        ))}
        {GHOSTS.map((g, i) => (
          <div key={i} style={{ position: "absolute", left: g.x * w, top: g.y * h, transform: `rotate(${g.r}deg)`, fontFamily: theme.fonts.hand,
            fontSize: g.s, color: "rgba(255,255,255,0.07)", whiteSpace: "nowrap", filter: "blur(0.6px)" }}>{g.t}</div>
        ))}
        {children}
      </div>
      {tray && (
        <div style={{ position: "absolute", left: -F - 6, right: -F - 6, bottom: -F - 18, height: 26, borderRadius: 4,
          background: `linear-gradient(180deg, #b98451, ${C.woodDark})`, boxShadow: `0 10px 16px ${C.shadow}` }}>
          {/* chalk sticks + eraser */}
          <div style={{ position: "absolute", left: 90, top: -9, width: 58, height: 12, borderRadius: 6, background: "#f7f4ea", transform: "rotate(-4deg)", boxShadow: "0 2px 2px rgba(0,0,0,0.25)" }} />
          <div style={{ position: "absolute", left: 170, top: -8, width: 40, height: 11, borderRadius: 6, background: C.chalkYellow, transform: "rotate(3deg)", boxShadow: "0 2px 2px rgba(0,0,0,0.25)" }} />
          <div style={{ position: "absolute", left: 226, top: -8, width: 30, height: 11, borderRadius: 6, background: C.chalkPink, boxShadow: "0 2px 2px rgba(0,0,0,0.25)" }} />
          <div style={{ position: "absolute", right: 110, top: -22, width: 120, height: 26, borderRadius: 4,
            background: "linear-gradient(180deg, #5a4a3a 0 40%, #d9d2c4 40% 100%)", boxShadow: "0 3px 4px rgba(0,0,0,0.3)" }} />
        </div>
      )}
    </div>
  );
};

// Chalk text that gets written word by word (left-to-right reveal), with an optional highlighted *word*.
export const ChalkWrite: React.FC<{ text: string; delay: number; size: number; font?: string; color?: string; hot?: string;
  speed?: number; style?: React.CSSProperties; underlineHot?: boolean }> =
({ text, delay, size, font = theme.fonts.chalk, color = C.chalk, hot = C.chalkYellow, speed = 1.1, style, underlineHot = true }) => {
  const frame = useCurrentFrame();
  let inside = false, t = delay;
  const words = text.split(" ").map((w) => {
    if (w.startsWith("*")) inside = true;
    const isHot = inside; if (w.endsWith("*")) inside = false;
    const clean = w.replace(/\*/g, ""), start = t, dur = Math.max(5, clean.length * speed);
    t += dur + 2;
    return { w: clean, isHot, start, dur };
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.32, fontFamily: font, fontSize: size, lineHeight: 1.08, ...style }}>
      {words.map(({ w, isHot, start, dur }, i) => {
        const p = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: theme.ease.out });
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", color: isHot ? hot : color, clipPath: `inset(-20% ${(1 - p) * 100}% -50% -5%)` }}>
            <span style={chalkTexture}>{w}</span>
            {isHot && underlineHot && <ChalkStroke kind="underline" delay={start + dur} dur={10} color={hot} width={9}
              style={{ position: "absolute", left: "-4%", bottom: -size * 0.16, width: "108%", height: size * 0.22 }} />}
          </span>
        );
      })}
    </div>
  );
};

const PATHS = {
  underline: { d: "M4 14 C 50 6, 110 18, 170 10 S 260 7, 296 13", vb: "0 0 300 24" },
  circle: { d: "M250 10 C 410 6, 496 38, 490 72 C 484 110, 370 134, 245 132 C 115 130, 8 108, 10 70 C 12 32, 120 8, 290 14", vb: "0 0 500 140" },
  check: { d: "M4 24 L17 37 L44 5", vb: "0 0 48 42" },
  arrow: { d: "M4 30 C 60 26, 120 34, 180 28 M156 12 L184 28 L154 44", vb: "0 0 190 56" },
};
// Hand-drawn chalk stroke that draws itself on. width is in viewBox units (non-scaling strokes break the pathLength dash).
export const ChalkStroke: React.FC<{ kind: keyof typeof PATHS; delay: number; dur?: number; color?: string; width?: number; style?: React.CSSProperties }> =
({ kind, delay, dur = 14, color = C.chalk, width = 5, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + dur], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const P = PATHS[kind], id = `rough-${kind}`;
  return (
    <svg viewBox={P.vb} preserveAspectRatio="none" style={{ overflow: "visible", ...chalkTexture, textShadow: undefined, ...style }}>
      <defs>
        <filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" /><feDisplacementMap in="SourceGraphic" scale="3" /></filter>
      </defs>
      <path d={P.d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={1} strokeDashoffset={1 - p} filter={`url(#${id})`} opacity={0.92} />
    </svg>
  );
};

// Sticky note taped to the board, slapped on with a little bounce.
export const StickyNote: React.FC<{ p: number; rotate?: number; style?: React.CSSProperties; children: React.ReactNode }> =
({ p, rotate = -2.5, style, children }) => (
  <div style={{ position: "absolute", padding: "34px 34px 30px", background: `linear-gradient(170deg, #fff4b0 0%, ${C.note} 55%, #f5dc6c 100%)`,
    boxShadow: `0 14px 22px ${C.shadow}, 0 2px 0 rgba(255,255,255,0.6) inset`, borderRadius: "2px 2px 18px 2px",
    opacity: Math.min(1, p * 1.6), transform: `rotate(${rotate + (1 - p) * 8}deg) scale(${interpolate(p, [0, 1], [1.25, 1])}) translateY(${(1 - p) * -30}px)`,
    transformOrigin: "50% 0%", ...style }}>
    {/* tape */}
    <div style={{ position: "absolute", top: -16, left: "50%", width: 130, height: 34, marginLeft: -65, transform: "rotate(3deg)",
      background: "rgba(255,255,255,0.55)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", borderLeft: "2px dashed rgba(0,0,0,0.05)", borderRight: "2px dashed rgba(0,0,0,0.05)" }} />
    {children}
  </div>
);
