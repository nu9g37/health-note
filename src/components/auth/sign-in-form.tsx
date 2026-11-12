"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/actions/auth";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

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
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border px-3 py-3 text-base"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
