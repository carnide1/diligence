import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="We’ll email you a Firebase reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
