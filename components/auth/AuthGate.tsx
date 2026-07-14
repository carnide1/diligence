"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_ROUTES = new Set(["/", "/login", "/signup", "/forgot-password"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = AUTH_ROUTES.has(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) {
      router.replace("/login");
      return;
    }
    if (user && isAuthRoute) {
      router.replace("/today");
    }
  }, [user, loading, isAuthRoute, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!user && !isAuthRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted">
        Redirecting…
      </div>
    );
  }

  if (user && isAuthRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted">
        Redirecting…
      </div>
    );
  }

  return children;
}
