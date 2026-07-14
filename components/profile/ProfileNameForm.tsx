"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

const schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(40, "Name is too long"),
});

type FormValues = z.infer<typeof schema>;

export function ProfileNameForm() {
  const { user } = useAuth();
  const { profile, saveDisplayName } = useUserProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "" },
  });

  useEffect(() => {
    reset({
      displayName: profile?.displayName || user?.displayName || "",
    });
  }, [profile?.displayName, user?.displayName, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveDisplayName(values.displayName);
      toast.success("Name updated");
      reset({ displayName: values.displayName.trim() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <TextInput
        label="Display name"
        autoComplete="name"
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextInput
        label="Email"
        value={user?.email || ""}
        readOnly
        disabled
      />
      <div>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}
