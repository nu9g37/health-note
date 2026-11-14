"use client";

import Link from "next/link";
import { useActionState, useId, type ReactNode } from "react";
import { signIn } from "@/actions/auth";

interface SignInFormProps {
  initialNotice?: ReactNode;
}

export function SignInForm({ initialNotice }: SignInFormProps) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const passwordId = useId();

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor={passwordId}>Password</label>
          <Link
            href="/forgot-password"
            className="text-primary-text underline hover:opacity-80"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {!state && initialNotice}
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
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-primary-text underline hover:opacity-80"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
