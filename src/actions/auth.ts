"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

export type AuthState = { error?: string; message?: string } | undefined;

async function getRequestOrigin(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
    } catch {
      return null;
    }
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin && origin !== "null") {
    try {
      return new URL(origin).origin;
    } catch {
      // Fall back to forwarded/host headers below.
    }
  }

  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host")?.split(",")[0]?.trim();
  if (!host) return null;

  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password" };

  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  if (data.session) redirect("/dashboard");

  return { message: "Confirmation email sent. Please check your inbox." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawEmail = formData.get("email");
  const parsed = forgotPasswordSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail.trim() : rawEmail,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    origin ? { redirectTo: `${origin}/auth/callback` } : undefined,
  );
  if (error) return { error: error.message };

  return {
    message:
      "If an account with that email exists, we sent a password reset link. Please check your inbox.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return {
      error: "Your reset session has expired. Please request a new reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/sign-in?status=password-updated");
}
