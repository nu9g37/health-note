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
            className="rounded-lg border px-3 py-3 text-base"
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
            className="rounded-lg border px-3 py-3 text-base"
          />
        </label>

        {state?.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {pending ? "Updating password..." : "Update password"}
        </button>
      </form>

      <form action={cancelPasswordReset} className="text-center">
        <button type="submit" className="text-sm underline">
          Back to sign in
        </button>
      </form>
    </div>
  );
}
