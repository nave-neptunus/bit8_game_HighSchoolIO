// Background + finishing layers for the classroom look (five-layer stack from the remotion-motion-graphics skill:
// wall -> content -> warm grade -> paper grain -> soft vignette).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

const C = theme.colors;

// Painted classroom wall with sunlight from a window on the left, a wood baseboard rail at the bottom.
export const Wall: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 120) * 18;   // light shafts drift very slowly (idle breathing)
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.wall} 0%, ${C.wallDark} 100%)` }}>
      {/* window light */}
      <AbsoluteFill style={{ transform: `translateX(${drift}px)`, filter: "blur(28px)", opacity: 0.75,
        background: "linear-gradient(112deg, rgba(255,250,228,0.95) 0%, rgba(255,250,228,0.55) 16%, transparent 17%, transparent 21%, rgba(255,250,228,0.45) 22%, rgba(255,250,228,0.2) 34%, transparent 35%)" }} />
      {/* plaster texture */}
      <AbsoluteFill style={{ opacity: 0.35, mixBlendMode: "multiply", backgroundSize: "260px",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='3' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23p)'/%3E%3C/svg%3E")` }} />
      {/* chair rail + baseboard */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 34, background: `linear-gradient(180deg, ${C.wood}, ${C.woodDark})`,
        boxShadow: "0 -3px 0 rgba(255,255,255,0.25) inset, 0 -6px 14px rgba(70,45,20,0.18)" }} />
    </AbsoluteFill>
  );
};

export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", backgroundColor: "#ffcf8a", mixBlendMode: "soft-light", opacity: 0.16 }} />
);

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: NOISE, backgroundSize: "220px",
    backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`, opacity: 0.04, mixBlendMode: "multiply" }} />;
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 40% 40%, transparent 60%, rgba(80,50,20,0.22) 100%)" }} />
);
