"use client";

import { useActionState } from "react";
import { cancelPasswordReset, updatePassword } from "@/actions/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          New password (at least 8 characters)
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        {state?.error && (
          <p role="alert" className="text-sm text-accent-text">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Updating password..." : "Update password"}
        </button>
      </form>

      <form action={cancelPasswordReset} className="text-center">
        <button
          type="submit"
          className="cursor-pointer text-sm text-primary-text underline hover:opacity-80"
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
}
