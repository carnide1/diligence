import { getHabitIcon } from "@/lib/habitIcons";

type HabitIconProps = {
  iconKey: string;
  className?: string;
  size?: number;
};

export function HabitIcon({
  iconKey,
  className = "",
  size = 20,
}: HabitIconProps) {
  const { Icon, label } = getHabitIcon(iconKey);
  return <Icon size={size} className={className} aria-label={label} />;
}
