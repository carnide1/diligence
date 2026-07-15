"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useProfileStats } from "@/hooks/useProfileStats";
import { DayPeriodsEditor } from "@/components/profile/DayPeriodsEditor";
import { ProfileNameForm } from "@/components/profile/ProfileNameForm";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const { logout } = useAuth();
  const { profile, profileLoading, profileError, refreshProfile } =
    useUserProfile();
  const { stats, loading: statsLoading } = useProfileStats();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await logout();
      toast.success("Signed out");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logout failed");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted">
            Account details, day periods, and summary stats.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onLogout}
          className="mt-1 shrink-0"
        >
          Log out
        </Button>
      </div>

      {profileLoading ? (
        <p className="text-sm text-muted">Loading profile…</p>
      ) : null}

      {profileError ? (
        <div className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{profileError}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => void refreshProfile()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {profile ? (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Account</h2>
            <ProfileNameForm />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">Stats</h2>
            {statsLoading && !stats ? (
              <p className="text-sm text-muted">Loading stats…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Current goal streak"
                  value={`${stats?.goalCurrent ?? profile.currentStreak}`}
                />
                <StatCard
                  label="Longest goal streak"
                  value={`${stats?.goalLongest ?? profile.longestStreak}`}
                />
                <StatCard
                  label="Best habit streak"
                  value={`${stats?.bestHabitStreak ?? 0}`}
                  hint={
                    stats?.bestHabitTitle
                      ? stats.bestHabitTitle
                      : "No habits yet"
                  }
                />
                <StatCard
                  label="This month"
                  value={`${stats?.monthRate ?? 0}%`}
                  hint={
                    stats
                      ? `${stats.monthCompleted}/${stats.monthScheduled} habit checkoffs`
                      : "Habit completion rate"
                  }
                />
                <StatCard
                  label="Active habits"
                  value={`${stats?.activeHabits ?? 0}`}
                />
                <StatCard
                  label="Active goals"
                  value={`${stats?.activeGoals ?? 0}`}
                />
              </div>
            )}
          </section>

          <DayPeriodsEditor />
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 text-xl font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
