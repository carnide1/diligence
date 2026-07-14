import {
  BookOpen,
  Brain,
  Coffee,
  Dumbbell,
  Droplets,
  Flame,
  Heart,
  Moon,
  Music,
  PenLine,
  Salad,
  Sparkles,
  StretchHorizontal,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type HabitIconDef = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

export const HABIT_ICONS: HabitIconDef[] = [
  { key: "droplets", label: "Water", Icon: Droplets },
  { key: "dumbbell", label: "Strength", Icon: Dumbbell },
  { key: "book", label: "Reading", Icon: BookOpen },
  { key: "brain", label: "Focus", Icon: Brain },
  { key: "coffee", label: "Coffee", Icon: Coffee },
  { key: "salad", label: "Nutrition", Icon: Salad },
  { key: "heart", label: "Health", Icon: Heart },
  { key: "moon", label: "Sleep", Icon: Moon },
  { key: "sun", label: "Morning", Icon: Sun },
  { key: "music", label: "Music", Icon: Music },
  { key: "pen", label: "Writing", Icon: PenLine },
  { key: "stretch", label: "Stretch", Icon: StretchHorizontal },
  { key: "flame", label: "Energy", Icon: Flame },
  { key: "sparkles", label: "Custom", Icon: Sparkles },
];

export const DEFAULT_HABIT_ICON = "sparkles";

export function getHabitIcon(key: string | null | undefined): HabitIconDef {
  return (
    HABIT_ICONS.find((i) => i.key === key) ??
    HABIT_ICONS.find((i) => i.key === DEFAULT_HABIT_ICON)!
  );
}
