// Presentation title slide in the trailer's classroom look. Render: npx remotion still src/index.ts TitleSlide title-slide.png
import React from "react";
import { AbsoluteFill } from "remotion";
import { Wall, Grade, Grain, Vignette } from "./components/Layers";
import { Board, ChalkWrite, ChalkStroke, StickyNote, chalkTexture } from "./components/Chalk";
import { BIG, Magnet } from "./components/Cast";
import { theme } from "./theme";

const C = theme.colors;
const CELLS = ["neutrophil", "macrophage", "nk", "killer_t", "b"];
const GERMS = ["staph", "virion", "rstaph"];

export const TitleSlide: React.FC = () => (
  <AbsoluteFill style={{ background: C.wall }}>
    <Wall />
    <Board {...BIG} seed={7}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
        <div style={{ display: "flex", gap: 44, alignItems: "flex-end" }}>
          {CELLS.map((c) => <Magnet key={c} src={`cell_${c}`} size={112} delay={-30} />)}
          <div style={{ fontFamily: theme.fonts.chalk, fontWeight: 700, fontSize: 64, color: C.chalkPink, margin: "0 6px 22px", ...chalkTexture }}>vs</div>
          {GERMS.map((g) => <Magnet key={g} src={`germ_${g}`} size={100} delay={-30} />)}
        </div>
        <ChalkWrite text="Immune *Response*" delay={-200} size={168} style={{ fontWeight: 700, justifyContent: "center", marginTop: 34 }} />
        <ChalkWrite text="an 8-bit RPG where you are the immune system" delay={-200} size={50} font={theme.fonts.hand}
          color={C.chalk} style={{ justifyContent: "center", marginTop: 30 }} />
        <div style={{ position: "relative", marginTop: 20, fontFamily: theme.fonts.hand, fontSize: 36, color: C.chalkBlue, ...chalkTexture }}>
          learn how your body fights germs, and why wasting antibiotics matters
        </div>
        <ChalkStroke kind="underline" delay={-60} color={C.chalkYellow} width={7} style={{ width: 520, height: 26, marginTop: 6 }} />
        <div style={{ marginTop: 44, fontFamily: theme.fonts.chalk, fontWeight: 700, fontSize: 46, color: C.chalk, ...chalkTexture }}>
          Evan Arumbaka <span style={{ color: C.chalkPink }}>&amp;</span> Ayush Pande
        </div>
      </div>
    </Board>
    <StickyNote p={1} rotate={-2.5} style={{ left: 1290, top: 770, width: 470, padding: "26px 32px 22px" }}>
      <div style={{ fontFamily: theme.fonts.pen, fontSize: 40, color: C.redPen, lineHeight: 1 }}>Project Vital Quest</div>
      <div style={{ fontFamily: theme.fonts.hand, fontWeight: 700, fontSize: 28, color: C.ink, marginTop: 6 }}>Healthcare game track</div>
    </StickyNote>
    <Grade />
    <Grain />
    <Vignette />
  </AbsoluteFill>
);
