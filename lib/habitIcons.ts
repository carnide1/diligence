import {
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  CheckCircle,
  CigaretteOff,
  Code,
  Coffee,
  Dumbbell,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Leaf,
  ListTodo,
  Moon,
  Music,
  NotebookPen,
  PenLine,
  Salad,
  Sparkles,
  StretchHorizontal,
  Sun,
  Target,
  Timer,
  Users,
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
  { key: "bike", label: "Bike", Icon: Bike },
  { key: "walk", label: "Walk", Icon: Footprints },
  { key: "timer", label: "Timer", Icon: Timer },
  { key: "target", label: "Target", Icon: Target },
  { key: "leaf", label: "Mindful", Icon: Leaf },
  { key: "notebook", label: "Journal", Icon: NotebookPen },
  { key: "list", label: "Tasks", Icon: ListTodo },
  { key: "check", label: "Done", Icon: CheckCircle },
  { key: "briefcase", label: "Work", Icon: Briefcase },
  { key: "code", label: "Code", Icon: Code },
  { key: "camera", label: "Create", Icon: Camera },
  { key: "users", label: "Social", Icon: Users },
  { key: "quit", label: "Quit habit", Icon: CigaretteOff },
  { key: "sparkles", label: "Custom", Icon: Sparkles },
];

export const DEFAULT_HABIT_ICON = "sparkles";

export function getHabitIcon(key: string | null | undefined): HabitIconDef {
  return (
    HABIT_ICONS.find((i) => i.key === key) ??
    HABIT_ICONS.find((i) => i.key === DEFAULT_HABIT_ICON)!
  );
}
