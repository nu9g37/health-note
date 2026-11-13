import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionKind } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

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
  if (session.kind === "none") redirect("/sign-in");
  if (session.kind === "recovery") redirect("/reset-password");
  return {
    supabase: session.supabase,
    claims: session.claims!,
    userId: session.claims!.sub as string,
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
