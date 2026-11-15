import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Wall, Grade, Grain, Vignette } from "./components/Layers";
import { Board, ChalkWrite, ChalkStroke, StickyNote, chalkTexture, writeEnd } from "./components/Chalk";
import { theme, clamp, SpringCfg } from "./theme";
import { SEGMENTS, Seg, INTRO, IMPACT, OUTRO, TRANS, HOLD, clipFrames, segFrames, timeline } from "./edit";

const C = theme.colors;
const CELLS = ["neutrophil", "macrophage", "nk", "killer_t", "b"];
const GERMS = ["staph", "strep", "virion", "rhino"];
const SHELL = { x: 72, y: 64, w: 1008, h: 952 };
const BOARD = { x: 1160, y: 92, w: 690, h: 640 };

// ---------- gameplay ----------
// One clip = a numbered PNG sequence captured frame by frame from the real game, plus its rendered game audio.
const Clip: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const n = clipFrames(name), f = Math.min(frame, n - (HOLD[name] ?? 0) - 1);   // held clips freeze on their last captured frame
  const vol = interpolate(frame, [0, 4, n - 8, n], [0, 1, 1, 0], clamp);
  return (
    <>
      <Img src={staticFile(`clips/${name}/${String(f).padStart(4, "0")}.png`)} style={{ width: SHELL.w, height: SHELL.h, display: "block" }} />
      <Audio src={staticFile(`audio/${name}.wav`)} volume={vol * 0.9} />
    </>
  );
};

const Handheld: React.FC<{ seg: Seg }> = ({ seg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let from = 0;
  const cuts = seg.clips.map((c) => { const s = from; from += clipFrames(c); return s; });
  // video-edit skill: every hard cut gets a small punch (scale 1.035 -> 1)
  const lastCut = cuts.filter((s) => s > 0 && s <= frame).pop();
  const punch = lastCut === undefined ? 0 : 1 - spring({ frame: frame - lastCut, fps, config: theme.spring.snappy });
  const float = Math.sin(frame / 34) * 3;
  return (
    <div style={{ position: "absolute", left: SHELL.x, top: SHELL.y + float, width: SHELL.w, height: SHELL.h,
      transform: `scale(${1 + punch * 0.035})`, transformOrigin: "50% 40%", filter: `drop-shadow(18px 26px 26px ${C.shadow})` }}>
      {seg.clips.map((c, i) => (
        <Sequence key={c} from={cuts[i]} durationInFrames={clipFrames(c)} layout="none">
          <div style={{ position: "absolute", inset: 0 }}><Clip name={c} /></div>
        </Sequence>
      ))}
    </div>
  );
};

// ---------- the lesson on the chalkboard ----------
const Lesson: React.FC<{ seg: Seg; dur: number; index: number }> = ({ seg, dur, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // unhurried: slow chalk, body eases in after the headline, the sticky note lands once the body has been read
  const SPEED = 1.7;
  const erase = interpolate(frame, [dur - 16, dur - 1], [0, 1], { ...clamp, easing: theme.ease.in });
  const headEnd = writeEnd(seg.head, 12, SPEED);
  const note = spring({ frame: frame - Math.min(headEnd + 50, dur * 0.45), fps, config: theme.spring.smooth });
  const fadeIn = (d: number) => interpolate(frame, [d, d + 18], [0, 1], { ...clamp, easing: theme.ease.out });
  const [num, ...name] = seg.kicker.split(/\s+/);
  return (
    <>
      <Board {...BOARD} seed={index}>
        <div style={{ position: "absolute", inset: "40px 52px", opacity: 1 - erase, filter: `blur(${erase * 6}px)`, transform: `translateX(${erase * -24}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: theme.fonts.hand, fontSize: 30, color: C.chalkDim, opacity: fadeIn(2), ...chalkTexture }}>
            <span>Lesson {Number(num)}: {name.join(" ").toLowerCase()}</span>
          </div>
          <ChalkWrite text={seg.head} delay={12} size={80} speed={SPEED} style={{ marginTop: 22, fontWeight: 700 }} />
          <div style={{ marginTop: 30, fontFamily: theme.fonts.hand, fontSize: 30, lineHeight: 1.38, color: C.chalkDim, opacity: fadeIn(headEnd + 6),
            transform: `translateY(${(1 - fadeIn(headEnd + 6)) * 10}px)`, ...chalkTexture }}>{seg.body}</div>
        </div>
      </Board>
      {/* the education beat, on a sticky note slapped onto the board */}
      <StickyNote p={note * (1 - erase)} rotate={index % 2 ? 2 : -2.5} style={{ left: 1220, top: 660, width: 590 }}>
        <div style={{ fontFamily: theme.fonts.pen, fontSize: 40, color: C.redPen, lineHeight: 1, marginBottom: 8 }}>You learn:</div>
        <div style={{ fontFamily: theme.fonts.hand, fontWeight: 700, fontSize: 31, lineHeight: 1.3, color: C.ink }}>{seg.learn}</div>
      </StickyNote>
    </>
  );
};

const Section: React.FC<{ seg: Seg; index: number }> = ({ seg, index }) => (
  <AbsoluteFill>
    <Handheld seg={seg} />
    <Lesson seg={seg} dur={segFrames(seg)} index={index} />
  </AbsoluteFill>
);

// ---------- full-board scenes: intro, impact, outro ----------
const Magnet: React.FC<{ src: string; size: number; delay: number; style?: React.CSSProperties }> = ({ src, size, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.bouncy });
  const bob = Math.sin((frame + delay * 7) / 16) * 2.5;
  return <Img src={staticFile(`sprites/${src}.png`)} style={{ width: size, height: size, imageRendering: "pixelated", opacity: Math.min(1, p * 2),
    filter: "drop-shadow(4px 7px 3px rgba(0,0,0,0.45))", transform: `translateY(${bob}px) scale(${interpolate(p, [0, 1], [1.5, 1])})`, ...style }} />;
};

const BIG = { x: 150, y: 80, w: 1620, h: 820 };

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [INTRO - 12, INTRO], [0, 1], { ...clamp, easing: theme.ease.in });
  return (
    <AbsoluteFill>
      <Board {...BIG} seed={1}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 1 - out }}>
          <div style={{ display: "flex", gap: 60, marginBottom: 30 }}>
            {CELLS.map((c, i) => <Magnet key={c} src={`cell_${c}`} size={130} delay={2 + i * 4} />)}
          </div>
          <ChalkWrite text="Immune *Response*" delay={20} size={150} speed={1.4} style={{ fontWeight: 700, justifyContent: "center" }} />
          <ChalkWrite text="learn how your immune system fights germs" delay={52} size={52} speed={0.55} font={theme.fonts.hand}
            color={C.chalkDim} style={{ marginTop: 40, justifyContent: "center" }} />
        </div>
      </Board>
    </AbsoluteFill>
  );
};

const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = interpolate(spring({ frame: frame - 12, fps, config: { damping: 30, stiffness: 40 } }), [0, 1], [0, 1.27]);
  const fadeIn = (d: number) => interpolate(frame, [d, d + 12], [0, 1], { ...clamp, easing: theme.ease.out });
  const note = spring({ frame: frame - 70, fps, config: theme.spring.bouncy });
  const out = interpolate(frame, [IMPACT - 12, IMPACT], [0, 1], { ...clamp, easing: theme.ease.in });
  return (
    <AbsoluteFill>
      <Board {...BIG} seed={2}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 70, opacity: 1 - out }}>
          <ChalkWrite text="why it matters" delay={2} size={44} font={theme.fonts.hand} color={C.chalkDim} speed={0.8} />
          {/* the circle sits outside the masked text box, or the mask would clip its overhang */}
          <div style={{ position: "relative", marginTop: 18 }}>
            <div style={{ fontFamily: theme.fonts.chalk, fontWeight: 700, fontSize: 210, lineHeight: 1, color: C.chalkYellow,
              fontVariantNumeric: "tabular-nums", opacity: fadeIn(8), ...chalkTexture }}>
              {count.toFixed(2)}<span style={{ fontSize: 120, color: C.chalk }}> million</span>
            </div>
            <ChalkStroke kind="circle" delay={36} dur={22} color={C.chalkPink} width={3.6}
              style={{ position: "absolute", left: "-10%", top: "-14%", width: "120%", height: "130%" }} />
          </div>
          <ChalkWrite text="deaths directly caused by drug-resistant infections in 2019" delay={46} size={50} font={theme.fonts.hand}
            speed={0.45} style={{ marginTop: 56, justifyContent: "center", maxWidth: 1400, textAlign: "center" }} />
          <div style={{ marginTop: 40, fontFamily: theme.fonts.hand, fontSize: 24, color: C.chalkDim, opacity: fadeIn(80), ...chalkTexture }}>
            Source: GRAM study (IHME and Oxford), The Lancet, 2022
          </div>
        </div>
      </Board>
      <StickyNote p={note * (1 - out)} rotate={3} style={{ left: 1240, top: 690, width: 520 }}>
        <div style={{ fontFamily: theme.fonts.hand, fontWeight: 700, fontSize: 32, lineHeight: 1.3, color: C.ink }}>
          Immune Response teaches kids how antibiotic resistance starts, and how to stop it.
        </div>
      </StickyNote>
    </AbsoluteFill>
  );
};

const LEARNS = ["immune cells and their jobs", "viruses vs. bacteria", "when antibiotics work", "antibiotic resistance"];

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = (d: number, cfg: SpringCfg = theme.spring.smooth) => spring({ frame: frame - d, fps, config: cfg });
  const note = p(96, theme.spring.bouncy);
  return (
    <AbsoluteFill>
      <Board {...BIG} seed={3}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 50 }}>
          <div style={{ display: "flex", gap: 30, alignItems: "flex-end" }}>
            {CELLS.map((c, i) => <Magnet key={c} src={`cell_${c}`} size={92} delay={i * 3} />)}
            <div style={{ width: 70 }} />
            {GERMS.map((g, i) => <Magnet key={g} src={`germ_${g}`} size={84} delay={6 + i * 3} />)}
          </div>
          <ChalkWrite text="Immune *Response*" delay={10} size={118} speed={1.1} style={{ fontWeight: 700, justifyContent: "center", marginTop: 22 }} />
          <ChalkWrite text="learn it by playing it" delay={34} size={50} font={theme.fonts.hand} color={C.chalkDim} speed={0.6} style={{ marginTop: 16, justifyContent: "center" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 90, rowGap: 16, marginTop: 34 }}>
            {LEARNS.map((t, i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <ChalkStroke kind="check" delay={50 + i * 9} dur={8} color={C.chalkYellow} width={6} style={{ width: 44, height: 40 }} />
                <ChalkWrite text={t} delay={54 + i * 9} size={40} font={theme.fonts.hand} speed={0.35} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34, fontFamily: theme.fonts.hand, fontSize: 24, letterSpacing: 1, color: C.chalkDim, opacity: p(110), ...chalkTexture }}>
            Project Vital Quest  ·  Healthcare game track
          </div>
        </div>
      </Board>
      <StickyNote p={note} rotate={-2} style={{ left: 480, top: 700, width: 960, padding: "26px 40px 24px" }}>
        <div style={{ fontFamily: theme.fonts.pen, fontSize: 38, color: C.redPen, lineHeight: 1 }}>Play it free:</div>
        <div style={{ fontFamily: theme.fonts.hand, fontWeight: 700, fontSize: 34, color: C.ink, marginTop: 6, whiteSpace: "nowrap" }}>nave-neptunus.github.io/bit8_game_HighSchoolIO</div>
      </StickyNote>
    </AbsoluteFill>
  );
};

// ---------- the whole trailer ----------
export const Trailer: React.FC = () => {
  const { joins, starts, total } = timeline();
  const tr = (key: string) => <TransitionSeries.Transition key={key} presentation={fade()} timing={linearTiming({ durationInFrames: TRANS, easing: theme.ease.inOut })} />;
  const items: React.ReactNode[] = [<TransitionSeries.Sequence key="intro" durationInFrames={INTRO}><Intro /></TransitionSeries.Sequence>, tr("t-intro")];
  SEGMENTS.forEach((s, i) => {
    items.push(<TransitionSeries.Sequence key={`s${i}`} durationInFrames={segFrames(s)}><Section seg={s} index={i} /></TransitionSeries.Sequence>);
    const j = i < SEGMENTS.length - 1 ? s.join : "fade";
    if (j !== "cut") items.push(tr(`t${i}`));
  });
  items.push(<TransitionSeries.Sequence key="impact" durationInFrames={IMPACT}><Impact /></TransitionSeries.Sequence>, tr("t-impact"));
  items.push(<TransitionSeries.Sequence key="outro" durationInFrames={OUTRO}><Outro /></TransitionSeries.Sequence>);
  const sfx = theme.sfxGain, impactAt = total - OUTRO - IMPACT + TRANS;
  return (
    <AbsoluteFill style={{ background: C.wall }}>
      <Wall />
      <TransitionSeries>{items}</TransitionSeries>
      <Grade />
      <Grain />
      <Vignette />
      {/* music: the game's own title theme under the intro, ending theme under the impact card and end card */}
      <Sequence from={0} durationInFrames={INTRO + 6}><Audio src={staticFile("audio/intro.wav")} volume={(f) => interpolate(f, [0, 6, INTRO - 8, INTRO + 6], [0, 0.8, 0.8, 0], clamp)} /></Sequence>
      <Sequence from={impactAt - 6}><Audio src={staticFile("audio/outro.wav")} volume={(f) => interpolate(f, [0, 12, IMPACT + OUTRO - 40, IMPACT + OUTRO], [0, 0.75, 0.75, 0], clamp)} /></Sequence>
      {/* SFX 2-3 frames before the visual lands (skill rule), kept subtle (video-edit skill) */}
      {CELLS.map((_, i) => <Sequence key={`m${i}`} from={i * 4}><Audio src={staticFile("sfx/pop.wav")} volume={0.22 * sfx} /></Sequence>)}
      <Sequence from={18}><Audio src={staticFile("sfx/chalk.wav")} volume={0.5 * sfx} /></Sequence>
      {starts.map((t, i) => <Sequence key={`c${i}`} from={t + 8}><Audio src={staticFile("sfx/chalk.wav")} volume={0.32 * sfx} /></Sequence>)}
      {joins.map((t, i) => <Sequence key={`w${i}`} from={Math.max(0, t - 3)}><Audio src={staticFile("sfx/whoosh.wav")} volume={0.22 * sfx} /></Sequence>)}
      <Sequence from={impactAt + 6}><Audio src={staticFile("sfx/chalk.wav")} volume={0.4 * sfx} /></Sequence>
      {Array.from({ length: 14 }).map((_, i) => <Sequence key={`tk${i}`} from={impactAt + 12 + i * 3}><Audio src={staticFile("sfx/tick.wav")} volume={0.16 * sfx} /></Sequence>)}
      <Sequence from={total - OUTRO + 8}><Audio src={staticFile("sfx/chalk.wav")} volume={0.4 * sfx} /></Sequence>
    </AbsoluteFill>
  );
};
