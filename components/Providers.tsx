"use client";

import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { HabitsProvider } from "@/contexts/HabitsContext";
import { GoalsProvider } from "@/contexts/GoalsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <HabitsProvider>
          <GoalsProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                className:
                  "!bg-bg-elevated !text-foreground !border !border-border !text-sm",
                success: {
                  iconTheme: {
                    primary: "var(--success)",
                    secondary: "var(--bg)",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "var(--danger)",
                    secondary: "var(--bg)",
                  },
                },
              }}
            />
          </GoalsProvider>
        </HabitsProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
