"use client";

import { HabitsProvider } from "@/contexts/HabitsContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import { GymProvider } from "@/contexts/GymContext";

/** Habits + goals + gym state — only for authenticated shell routes. */
export function AppDataProviders({ children }: { children: React.ReactNode }) {
  return (
    <HabitsProvider>
      <GoalsProvider>
        <GymProvider>{children}</GymProvider>
      </GoalsProvider>
    </HabitsProvider>
  );
}
