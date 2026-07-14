"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthError(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
      default:
        break;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let failTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setLoading(false);
      });
    } catch (error) {
      console.error(error);
      failTimer = setTimeout(() => setLoading(false), 0);
    }

    return () => {
      unsub?.();
      if (failTimer) clearTimeout(failTimer);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: displayName.trim() });
        setUser(getFirebaseAuth().currentUser);
      } catch (error) {
        throw new Error(mapAuthError(error));
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        throw new Error("You must be signed in.");
      }
      try {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
        setUser({ ...auth.currentUser });
      } catch (error) {
        throw new Error(mapAuthError(error));
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      resetPassword,
      updateDisplayName,
    }),
    [
      user,
      loading,
      login,
      signup,
      logout,
      resetPassword,
      updateDisplayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
