import {
  isAuthRetryableFetchError,
  type JwtPayload,
  type User,
} from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionKind } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ActionSessionKind = "authenticated" | "recovery";

export type VerifyActionSessionResult =
  | {
      ok: true;
      supabase: ServerSupabaseClient;
      claims: JwtPayload;
      user: User;
      userId: string;
    }
  | {
      ok: false;
      reason: "expired" | "forbidden" | "unavailable";
    };

/** Reads and classifies the current session once per React render pass. */
export const getAuthSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  const kind = getSessionKind(claims);
  return { supabase, claims, kind };
});

/** Requires a password-authenticated session in Server Components, redirecting otherwise. */
export async function requireAuthenticatedSession() {
  const session = await getAuthSession();
  if (session.kind === "none" || !session.claims) redirect("/sign-in");
  if (session.kind === "recovery") redirect("/reset-password");
  return {
    supabase: session.supabase,
    claims: session.claims,
    userId: session.claims.sub,
  };
}

/**
 * Verifies a Server Action session against both JWT claims (`amr` kind) and
 * the live Supabase Auth server (`getUser`) so revoked sessions fail immediately.
 */
export async function verifyActionSession(
  expectedKind: ActionSessionKind,
): Promise<VerifyActionSessionResult> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError && isAuthRetryableFetchError(claimsError)) {
    return { ok: false, reason: "unavailable" };
  }

  const claims = claimsData?.claims ?? null;
  const kind = getSessionKind(claims);
  if (kind === "none" || !claims) {
    return { ok: false, reason: "expired" };
  }
  if (kind !== expectedKind) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user || userData.user.id !== claims.sub) {
    if (userError && isAuthRetryableFetchError(userError)) {
      return { ok: false, reason: "unavailable" };
    }

    // Session was revoked or user is no longer valid on the Auth server; clear stale cookies.
    await signOutSafely(supabase, "local");
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    supabase,
    claims,
    user: userData.user,
    userId: userData.user.id,
  };
}

async function attemptSignOut(
  supabase: ServerSupabaseClient,
  scope: "global" | "local",
): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut({ scope });
    if (!error) return true;
    console.warn(`${scope} sign-out failed:`, error.message);
  } catch (error) {
    console.warn(
      `${scope} sign-out threw:`,
      error instanceof Error ? error.message : "unknown error",
    );
  }
  return false;
}

/** Signs out with the requested scope and falls back to local cookie cleanup on failure. */
export async function signOutSafely(
  supabase: ServerSupabaseClient,
  scope: "global" | "local" = "global",
) {
  if (scope === "global" && (await attemptSignOut(supabase, "global"))) {
    return;
  }
  await attemptSignOut(supabase, "local");
}
