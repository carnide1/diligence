import { AppShell } from "@/components/layout/AppShell";
import { AppDataProviders } from "@/components/AppDataProviders";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProviders>
      <AppShell>{children}</AppShell>
    </AppDataProviders>
  );
}
