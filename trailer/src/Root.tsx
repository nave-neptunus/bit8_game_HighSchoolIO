import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { FPS, timeline } from "./edit";

export const RemotionRoot: React.FC = () => (
  <Composition id="Trailer" component={Trailer} durationInFrames={timeline().total} fps={FPS} width={1920} height={1080} />
);
