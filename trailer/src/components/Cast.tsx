// Full-board "cast" scenes: who you play as (cells + their attacks), who you fight (germs + bosses),
// and the right-side board for the world tour that highlights the area on screen.
import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Board, ChalkWrite, ChalkStroke, chalkTexture } from "./Chalk";
import { theme, clamp } from "../theme";

const C = theme.colors;
export const BIG = { x: 150, y: 80, w: 1620, h: 820 };

// A sprite stuck to the board like a magnet: pops on with a bounce, then bobs gently.
export const Magnet: React.FC<{ src: string; size: number; delay: number; style?: React.CSSProperties }> = ({ src, size, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.bouncy });
  const bob = Math.sin((frame + delay * 7) / 16) * 2.5;
  return <Img src={staticFile(`sprites/${src}.png`)} style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated", opacity: Math.min(1, p * 2),
    filter: "drop-shadow(4px 7px 3px rgba(0,0,0,0.45))", transform: `translateY(${bob}px) scale(${interpolate(p, [0, 1], [1.5, 1])})`, ...style }} />;
};

const useFade = () => {
  const frame = useCurrentFrame();
  return (d: number, len = 14) => interpolate(frame, [d, d + len], [0, 1], { ...clamp, easing: theme.ease.out });
};
const Hand: React.FC<{ size: number; color?: string; o?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size, color = C.chalkDim, o = 1, style, children }) => (
  <div style={{ fontFamily: theme.fonts.hand, fontSize: size, lineHeight: 1.25, color, opacity: o, transform: `translateY(${(1 - o) * 8}px)`, ...chalkTexture, ...style }}>{children}</div>
);
const Name: React.FC<{ size: number; o: number; color?: string; children: React.ReactNode }> = ({ size, o, color = C.chalkYellow, children }) => (
  <div style={{ fontFamily: theme.fonts.chalk, fontWeight: 700, fontSize: size, lineHeight: 1.05, color, opacity: o, ...chalkTexture }}>{children}</div>
);

// ---------- YOUR TEAM: the five immune cells and what their attacks do ----------
const TEAM = [
  { s: "neutrophil", n: "Neutrophil", r: "first responder", a: ["Engulf: swallow a germ", "NET Trap: hit every germ"] },
  { s: "macrophage", n: "Macrophage", r: "the big eater", a: ["Engulf", "Present Antigen: call in T and B cells", "Clean Up: heal Maya"] },
  { s: "nk", n: "NK Cell", r: "finds hiding viruses", a: ["Kill Check: destroy an infected cell", "Interferon: stop virus copying"] },
  { s: "killer_t", n: "Killer T Cell", r: "the specialist", a: ["Targeted Kill", "Perforin & Granzyme: huge hit"] },
  { s: "b", n: "B Cell", r: "antibody blaster", a: ["Antibody Volley", "Neutralize Toxin: block its poison"] },
];

export const TeamBoard: React.FC = () => {
  const f = useFade();
  return (
    <Board {...BIG} seed={4}>
      <div style={{ position: "absolute", inset: "48px 56px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Hand size={30} o={f(0)}>you play as</Hand>
        <ChalkWrite text="a team of *immune cells*" delay={4} size={78} speed={1.3} style={{ fontWeight: 700, justifyContent: "center", marginTop: 4 }} />
        <div style={{ display: "flex", gap: 22, marginTop: 56, width: "100%" }}>
          {TEAM.map((c, i) => {
            const d = 34 + i * 16;
            return (
              <div key={c.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <Magnet src={`cell_${c.s}`} size={128} delay={d} />
                <Name size={38} o={f(d + 6)}>{c.n}</Name>
                <Hand size={26} o={f(d + 10)} color={C.chalk} style={{ marginTop: 4 }}>{c.r}</Hand>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.a.map((a, j) => <Hand key={a} size={25} o={f(d + 22 + j * 6)}>{a}</Hand>)}
                </div>
              </div>
            );
          })}
        </div>
        <Hand size={26} o={f(150)} color={C.chalkBlue} style={{ position: "absolute", bottom: 0 }}>
          new cells join in each area, and every cell learns a new attack as it levels up
        </Hand>
      </div>
    </Board>
  );
};

// ---------- WHO YOU FIGHT: germs and bosses ----------
const GERMS = [
  { s: "staph", n: "Staph Scout", d: "bacteria that sneak in through cuts" },
  { s: "strep", n: "Strep Chain", d: "bacteria that grow in chains" },
  { s: "virion", n: "Flu Virion", d: "virus that hijacks lung cells" },
  { s: "rhino", n: "Cold Virus", d: "the most common cold germ" },
  { s: "infected", n: "Hijacked Cell", d: "a lung cell hiding a virus" },
  { s: "rstaph", n: "Resistant Staph", d: "antibiotics don't work on it" },
  { s: "pseudo", n: "Slime Rod", d: "builds a slimy biofilm shield" },
];
const BOSSES = [
  { s: "brewer", n: "Toxin Brewer", a: "Area 1 · the scrape", d: "pumps toxins into the cut" },
  { s: "factory", n: "Virus Factory", a: "Area 2 · the cough", d: "a hijacked cell copying viruses" },
  { s: "superbug", n: "Superbug Colony", a: "Area 3 · the stitches", d: "drug-resistant, gets stronger with every wasted antibiotic" },
];

export const CastBoard: React.FC = () => {
  const f = useFade();
  return (
    <Board {...BIG} seed={5}>
      <div style={{ position: "absolute", inset: "44px 56px", display: "flex", gap: 40 }}>
        {/* germs */}
        <div style={{ flex: 1.55, display: "flex", flexDirection: "column" }}>
          <Hand size={30} o={f(0)}>you fight</Hand>
          <ChalkWrite text="real *germs*" delay={4} size={74} speed={1.3} style={{ fontWeight: 700 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 18, rowGap: 30, marginTop: 30 }}>
            {GERMS.map((g, i) => {
              const d = 24 + i * 9;
              return (
                <div key={g.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <Magnet src={`germ_${g.s}`} size={92} delay={d} />
                  <Name size={29} o={f(d + 5)} color={C.chalk}>{g.n}</Name>
                  <Hand size={21} o={f(d + 10)} style={{ marginTop: 4 }}>{g.d}</Hand>
                </div>
              );
            })}
          </div>
        </div>
        {/* chalk divider */}
        <div style={{ width: 4, borderRadius: 2, background: C.chalkDim, opacity: 0.5 * f(20), ...chalkTexture }} />
        {/* bosses */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Hand size={30} o={f(90)}>one boss per area</Hand>
          <ChalkWrite text="the *bosses*" delay={94} size={74} speed={1.3} style={{ fontWeight: 700 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
            {BOSSES.map((b, i) => {
              const d = 112 + i * 18;
              return (
                <div key={b.n} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <Magnet src={`boss_${b.s}`} size={124} delay={d} style={{ flexShrink: 0 }} />
                  <div>
                    <Name size={36} o={f(d + 5)}>{b.n}</Name>
                    <Hand size={20} o={f(d + 8)} color={C.chalkBlue}>{b.a}</Hand>
                    <Hand size={23} o={f(d + 12)} style={{ marginTop: 4 }}>{b.d}</Hand>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Board>
  );
};

// ---------- WORLD TOUR: right-side board listing the three areas, the one on screen lit up ----------
const AREAS = [
  { n: "The Scrape", w: "Maya's knee", b: "Toxin Brewer" },
  { n: "The Cough", w: "Maya's lungs", b: "Virus Factory" },
  { n: "The Superbug", w: "Maya's stitches", b: "Superbug Colony" },
];

export const TourBoard: React.FC<{ box: { x: number; y: number; w: number; h: number }; active: number; since: number; dur: number; seed: number }> = ({ box, active, since, dur, seed }) => {
  const frame = useCurrentFrame();
  const f = useFade();
  const erase = interpolate(frame, [dur - 16, dur - 1], [0, 1], { ...clamp, easing: theme.ease.in });
  return (
    <Board {...box} seed={seed}>
      <div style={{ position: "absolute", inset: "40px 52px", opacity: 1 - erase }}>
        <Hand size={30} o={f(2)}>Lesson 3: the world</Hand>
        <ChalkWrite text="3 areas inside *Maya*" delay={12} size={70} speed={1.7} style={{ marginTop: 14, fontWeight: 700 }} />
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 22 }}>
          {AREAS.map((a, i) => {
            const on = i === active, o = f(60 + i * 8) * (on ? 1 : 0.38);
            return (
              <div key={a.n} style={{ position: "relative", paddingLeft: 64 }}>
                {on && <ChalkStroke kind="arrow" delay={Math.max(70, since)} dur={8} color={C.chalkYellow} width={7}
                  style={{ position: "absolute", left: -6, top: 12, width: 58, height: 26 }} />}
                <Name size={46} o={o} color={on ? C.chalkYellow : C.chalk}>{i + 1}. {a.n}</Name>
                <Hand size={25} o={o} color={C.chalk}>{a.w} · boss: {a.b}</Hand>
              </div>
            );
          })}
        </div>
      </div>
    </Board>
  );
};
