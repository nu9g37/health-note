"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/actions/auth";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border px-3 py-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password (at least 8 characters)
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
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-lg border px-3 py-3 text-base"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-green-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {pending ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
