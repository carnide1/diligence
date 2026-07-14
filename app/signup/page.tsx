import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      subtitle="Open signup — email and password only for V1."
    >
      <SignupForm />
    </AuthCard>
  );
}
