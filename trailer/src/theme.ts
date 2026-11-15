// theme.ts: single source of truth (remotion-motion-graphics skill rule 9).
// Look: a sunny classroom. Warm wall, green chalkboard in a wood frame, chalk handwriting, sticky notes.
import { Easing } from "remotion";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadSketch } from "@remotion/google-fonts/CabinSketch";
import { loadFont as loadKalam } from "@remotion/google-fonts/Kalam";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const pixel = loadPixel("normal", { weights: ["400"], subsets: ["latin"] });
const sketch = loadSketch("normal", { weights: ["400", "700"], subsets: ["latin"] });
const kalam = loadKalam("normal", { weights: ["400", "700"], subsets: ["latin"] });
const caveat = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] });

export const theme = {
  colors: {
    wall: "#efe3cb",
    wallDark: "#e2d2b4",
    board: "#2d4636",
    boardDark: "#233829",
    chalk: "#f4f1e6",
    chalkDim: "rgba(244,241,230,0.72)",
    chalkYellow: "#f6dc78",
    chalkPink: "#f2a7b6",
    chalkBlue: "#a9d4ef",
    wood: "#a8743f",
    woodDark: "#7a4f27",
    note: "#ffec8f",
    ink: "#2b2a33",
    redPen: "#c2402f",
    shadow: "rgba(70, 45, 20, 0.28)",
  },
  fonts: {
    pixel: pixel.fontFamily,
    chalk: sketch.fontFamily,   // chalk headlines
    hand: kalam.fontFamily,     // chalk body text and sticky notes
    pen: caveat.fontFamily,     // red pen labels
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
  sfxGain: 0.75, // video-edit skill: SFX stay subtle, never louder than the game audio
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export type SpringCfg = { damping: number; stiffness: number; mass: number };
