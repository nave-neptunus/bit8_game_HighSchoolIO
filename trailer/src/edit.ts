// The edit decision list: which gameplay clips play under which caption, and how each section joins the next.
// *word* marks the punch word (gold). Clip frame counts come from clips.json (written by the capture script).
import clipData from "./clips.json";

export type Seg = { clips: string[]; kicker: string; head: string; body: string; learn: string; join: "slide" | "wipe" | "fade" | "cut" };

export const SEGMENTS: Seg[] = [
  { clips: ["title"], kicker: "01  THE MISSION", head: "learn how your body *fights back*", body: "A pixel RPG for middle schoolers. Your team is made of real immune cells.",
    learn: "Your immune system is a team of cells, and each one has a job.", join: "fade" },
  { clips: ["grass"], kicker: "02  EXPLORE", head: "germs hide in the *grass*", body: "Explore three areas inside a patient: a scraped knee, flu-filled lungs and an infected stitch.",
    learn: "Germs get in through breaks in the skin, like a scraped knee.", join: "cut" },
  { clips: ["battle"], kicker: "03  BATTLE", head: "real cells, *real jobs*", body: "Each cell fights the way it does in your body. Pick the move that is STRONG against that germ.",
    learn: "Neutrophils rush in first. Pus is mostly dead neutrophils!", join: "fade" },
  { clips: ["captain"], kicker: "04  CAPTAINS", head: "meet the *germs*", body: "Germ Captains are real bacteria and viruses. Beat them all to reach the boss.",
    learn: "Staph and strep are bacteria that can infect an open cut.", join: "fade" },
  { clips: ["area2", "pharmacist"], kicker: "05  THE TRAP", head: "free *antibiotics?*", body: "Maya has the flu. A pharmacist offers antibiotics. Do you take them?",
    learn: "The flu is caused by a virus, not bacteria.", join: "fade" },
  { clips: ["abx"], kicker: "06  THE LESSON", head: "they *can't* kill viruses", body: "Every wasted dose gives bacteria practice, so the final boss gets stronger.",
    learn: "Antibiotics do not work on viruses (CDC).", join: "fade" },
  { clips: ["journal"], kicker: "07  GERM JOURNAL", head: "real science in *every germ*", body: "The Germ Journal fills up as you play, with a sourced fact for each germ.",
    learn: "About 1 in 3 people carry staph in their nose (CDC).", join: "fade" },
  { clips: ["boss1", "boss2"], kicker: "08  BOSSES", head: "a boss in *every* area", body: "Each boss teaches one idea: toxins, viruses that copy themselves, and superbugs.",
    learn: "NK cells find infected cells that try to hide.", join: "fade" },
  { clips: ["sb_intro", "sb_culture", "sb_clean", "sb_target"], kicker: "09  FINAL BOSS", head: "think like a *doctor*", body: "A lab culture finds the right drug, debridement cleans off the biofilm, then the targeted antibiotic.",
    learn: "Biofilms shield bacteria, so doctors test before they treat.", join: "fade" },
  { clips: ["end_a", "end_b"], kicker: "10  THE ENDING", head: "choices have *consequences*", body: "The ending shows how many antibiotics you wasted and what that means in real life.",
    learn: "Wasting antibiotics helps bacteria become resistant.", join: "fade" },
];

export const FPS = 30;
export const INTRO = 105;
export const IMPACT = 165;
export const OUTRO = 195;
export const TRANS = 14;

const frames: Record<string, number> = Object.fromEntries(clipData.clips.map((c: { name: string; frames: number }) => [c.name, c.frames]));
export const clipFrames = (name: string) => frames[name] ?? 1;
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
