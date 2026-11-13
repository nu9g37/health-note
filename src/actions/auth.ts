"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTrustedAuthOrigin } from "@/lib/auth/origin";
import { signOutSafely, verifyActionSession } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

export type AuthState = { error?: string; message?: string } | undefined;

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

type AuthErrorLike = {
  code?: string;
  status?: number;
  message: string;
};

const SIGN_UP_CONFIRMATION_MESSAGE =
  "Check your inbox for a confirmation email, or try signing in if you already have an account.";

const PASSWORD_RESET_RESPONSE_MESSAGE =
  "If an account with that email exists, we sent a password reset link. Please check your inbox.";

function logAuthProviderError(action: string, error: AuthErrorLike): void {
  console.error(`[auth] ${action} failed`, {
    code: error.code,
    status: error.status,
    message: error.message,
  });
}

function mapSignUpError(error: AuthErrorLike): AuthState {
  // Mask account-existence and per-email cooldown errors so signUp does not
  // confirm whether an address is already registered or confirmed.
  if (
    error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    error.code === "over_email_send_rate_limit"
  ) {
    if (error.code === "over_email_send_rate_limit") {
      logAuthProviderError("signUp", error);
    }
    return { message: SIGN_UP_CONFIRMATION_MESSAGE };
  }

  logAuthProviderError("signUp", error);

  if (error.code === "weak_password") {
    return {
      error:
        "Password does not meet security requirements. Please choose a stronger password.",
    };
  }
  if (error.code === "email_address_invalid") {
    return { error: "Please enter a valid email address." };
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return { error: "Too many requests. Please try again later." };
  }
  if (error.code === "captcha_failed") {
    return { error: "Verification failed. Please try again." };
  }

  return { error: "Unable to create account right now. Please try again." };
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
  if (error) return mapSignUpError(error);

  if (data.session) redirect("/dashboard");

  return { message: SIGN_UP_CONFIRMATION_MESSAGE };
}

export async function signOut() {
  const supabase = await createClient();
  await signOutSafely(supabase, "global");
  redirect("/sign-in");
}

export async function cancelPasswordReset() {
  const supabase = await createClient();
  await signOutSafely(supabase, "local");
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

  const origin = getTrustedAuthOrigin(await headers());
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    origin ? { redirectTo: `${origin}/auth/callback` } : undefined,
  );
  if (error) {
    logAuthProviderError("requestPasswordReset", error);
    // Only surface IP-level rate limits; per-email cooldowns and SMTP/user errors
    // would distinguish existing accounts from unknown emails.
    if (error.code === "over_request_rate_limit") {
      return { error: "Too many requests. Please try again later." };
    }
  }

  return { message: PASSWORD_RESET_RESPONSE_MESSAGE };
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

  const session = await verifyActionSession("recovery");
  if (!session.ok) {
    if (session.reason === "forbidden") {
      return {
        error: "Password reset requires a valid recovery link.",
      };
    }
    if (session.reason === "unavailable") {
      return {
        error: "Unable to verify your reset session. Please try again.",
      };
    }
    return {
      error: "Your reset session has expired. Please request a new reset link.",
    };
  }

  const { error } = await session.supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  await signOutSafely(session.supabase, "global");
  redirect("/sign-in?status=password-updated");
}
