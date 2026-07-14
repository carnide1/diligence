import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Continue on Today.">
      <LoginForm />
    </AuthCard>
  );
}
