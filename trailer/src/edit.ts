// The edit decision list: which gameplay clips play under which caption, and how each section joins the next.
// *word* marks the punch word (gold). Clip frame counts come from clips.json (written by the capture script).
import clipData from "./clips.json";

export type Seg = { clips: string[]; kicker: string; head: string; body: string; learn: string; join: "slide" | "wipe" | "fade" | "cut" };

export const SEGMENTS: Seg[] = [
  { clips: ["title"], kicker: "01  THE MISSION", head: "learn how your body *fights back*", body: "A pixel RPG for middle schoolers. Your team is made of real immune cells.",
    learn: "Your immune system is a team of cells, and each one has a job.", join: "fade" },
  { clips: ["grass", "battle"], kicker: "02  BATTLE", head: "real cells, *real jobs*", body: "Germs jump out of the grass. Each cell fights the way it does in your body.",
    learn: "Neutrophils rush in first. Pus is mostly dead neutrophils!", join: "fade" },
  { clips: ["captain", "journal"], kicker: "03  THE GERMS", head: "meet the *germs*", body: "Germ Captains are real bacteria and viruses. The Germ Journal gives a real fact for each one.",
    learn: "About 1 in 3 people carry staph in their nose (CDC).", join: "fade" },
  { clips: ["area2", "pharmacist", "abx"], kicker: "04  THE TRAP", head: "free *antibiotics?*", body: "Maya has the flu. A pharmacist offers antibiotics. Every wasted dose makes the final boss stronger.",
    learn: "The flu is a virus. Antibiotics do not work on viruses (CDC).", join: "fade" },
  { clips: ["sb_intro", "sb_culture", "sb_clean", "sb_target"], kicker: "05  FINAL BOSS", head: "think like a *doctor*", body: "Test with a lab culture, clean off the biofilm, then use the one drug that works.",
    learn: "Biofilms shield bacteria, so doctors test before they treat.", join: "fade" },
  { clips: ["end_a", "end_b"], kicker: "06  THE ENDING", head: "choices have *consequences*", body: "The ending shows how many antibiotics you wasted and what that means in real life.",
    learn: "Wasting antibiotics helps bacteria become resistant.", join: "fade" },
];

export const FPS = 30;
export const INTRO = 110;
export const IMPACT = 180;
export const OUTRO = 195;
export const TRANS = 14;

const frames: Record<string, number> = Object.fromEntries(clipData.clips.map((c: { name: string; frames: number }) => [c.name, c.frames]));
// Extra frames that hold a clip's last frame (static text screens), so it can be read.
export const HOLD: Record<string, number> = { end_b: 12 };
export const clipFrames = (name: string) => (frames[name] ?? 1) + (HOLD[name] ?? 0);
export const segFrames = (s: Seg) => s.clips.reduce((t, c) => t + clipFrames(c), 0);

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
