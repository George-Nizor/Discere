import type { DiscereIconHue, DiscereIconName } from "./discere-icons.js";
import { Icon } from "./Icon.js";

/**
 * The brand icons under the names the interface used for its earlier line icons, with the same
 * props (`size`, `className`), so a screen switches by changing one import. Utility glyphs
 * (close, arrows, chevrons) stay as lines and are not in this set.
 */
interface CompatProps {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
  style?: React.CSSProperties;
}
function make(name: DiscereIconName, hue?: DiscereIconHue) {
  const Brand = ({ size = 24, className }: CompatProps) => (
    <Icon name={name} size={Number(size)} {...(hue ? { hue } : {})} {...(className ? { className } : {})} />
  );
  Brand.displayName = `Brand(${name})`;
  return Brand;
}

export const House = make("home");
export const BookOpen = make("courses");
export const UserRound = make("you");
export const Layers = make("review");
export const Settings = make("settings");
export const Flame = make("streak");
export const Sparkles = make("xp");
export const Star = make("xp", "gold");
export const Gem = make("league");
export const Gift = make("chest");
export const Award = make("trophy");
export const Trophy = make("trophy");
export const Target = make("target");
export const Crosshair = make("target");
export const Brain = make("brain");
export const Zap = make("boost");
export const Snowflake = make("freeze");
export const Shuffle = make("swap");
export const RefreshCw = make("swap");
export const Repeat = make("streak");
export const CalendarCheck = make("done");
export const Globe2 = make("polymath");
export const Lightbulb = make("hint");
export const Repeat2 = make("cards");
export const BookCheck = make("scholar");
export const AudioLines = make("readAloud");
export const Volume2 = make("sound");
export const VolumeX = make("sound");
export const NotebookPen = make("working");
export const Calculator = make("calculator");
export const MessageCircleQuestion = make("tutor");
export const QuestDone = make("done");
export const Combo = make("combo");
export const Bolt = make("bolt");
export const ShieldLevel = make("level");
export const Bridge = make("bridge");
