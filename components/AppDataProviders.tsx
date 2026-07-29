"use client";

import { HabitsProvider } from "@/contexts/HabitsContext";
import { GoalsProvider } from "@/contexts/GoalsContext";

/** Habits + goals state — only for authenticated shell routes. */
export function AppDataProviders({ children }: { children: React.ReactNode }) {
  return (
    <HabitsProvider>
      <GoalsProvider>{children}</GoalsProvider>
    </HabitsProvider>
  );
}
