import { Composition, Still } from "remotion";
import { Trailer } from "./Trailer";
import { TitleSlide } from "./TitleSlide";
import { FPS, timeline } from "./edit";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={timeline().total} fps={FPS} width={1920} height={1080} />
    <Still id="TitleSlide" component={TitleSlide} width={1920} height={1080} />
  </>
);
