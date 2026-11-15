// The edit decision list: which gameplay clips play under which caption, and how each section joins the next.
// *word* marks the punch word (gold). Clip frame counts come from clips.json (written by the capture script).
import clipData from "./clips.json";

// kind: "lesson" = gameplay + chalkboard on the right (default); "tour" = gameplay + area list board;
// "team" / "cast" = full chalkboard scenes with no gameplay (their length is `frames`).
export type Seg = { clips: string[]; kicker: string; head?: string; body?: string; learn?: string; join: "fade" | "cut";
  kind?: "lesson" | "tour" | "team" | "cast"; frames?: number };

export const SEGMENTS: Seg[] = [
  { clips: ["title"], kicker: "01  WHO YOU ARE", head: "you're shrunk down *inside Maya*",
    learn: "Maya scraped her knee. Help her immune system fight the germs!", join: "fade" },
  { kind: "team", clips: [], frames: 270, kicker: "02  YOUR TEAM", join: "fade" },
  { kind: "tour", clips: ["tour1", "boss_a1", "tour2", "boss_a2", "tour3", "boss_a3"], kicker: "03  THE WORLD", join: "fade" },
  { clips: ["battle"], kicker: "04  BATTLE", head: "pick the *right attack*",
    learn: "STRONG! marks the move that works best on that germ.", join: "fade" },
  { kind: "cast", clips: [], frames: 300, kicker: "05  THE GERMS", join: "fade" },
  { clips: ["pharmacist", "abx"], kicker: "06  THE TRAP", head: "free *antibiotics?*",
    learn: "Maya has the flu, a virus. Antibiotics don't work on viruses (CDC).", join: "fade" },
  { clips: ["sb_intro", "sb_target"], kicker: "07  FINAL BOSS", head: "think like a *doctor*",
    learn: "Wasted antibiotics made the superbug stronger. Test, then treat.", join: "fade" },
];

export const FPS = 30;
export const INTRO = 99;
export const IMPACT = 150;
export const OUTRO = 180;
export const TRANS = 14;

const frames: Record<string, number> = Object.fromEntries(clipData.clips.map((c: { name: string; frames: number }) => [c.name, c.frames]));
// Extra frames that hold a clip's last frame (static text screens), so it can be read.
export const HOLD: Record<string, number> = { end_b: 12 };
export const clipFrames = (name: string) => (frames[name] ?? 1) + (HOLD[name] ?? 0);
export const segFrames = (s: Seg) => s.frames ?? s.clips.reduce((t, c) => t + clipFrames(c), 0);

// Absolute timeline (TransitionSeries overlaps each transition with both neighbours).
export const timeline = () => {
  let t = INTRO - TRANS;   // intro -> first segment is a transition too
  const starts: number[] = [], joins: number[] = [INTRO - TRANS];
  SEGMENTS.forEach((s, i) => {
    starts.push(t);
    t += segFrames(s);
    const next = i < SEGMENTS.length - 1 ? s.join : "fade";
    if (next !== "cut") { t -= TRANS; joins.push(t); }
  });
  // impact card, then a transition into the end card
  t += IMPACT - TRANS; joins.push(t);
  return { starts, joins, total: t + OUTRO };
};
