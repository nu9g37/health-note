import type { JwtPayload } from "@supabase/supabase-js";

export type SessionKind = "none" | "recovery" | "authenticated";

/** Returns true when JWT AMR claims confirm password authentication. */
export function hasPasswordAuth(
  claims: JwtPayload | null | undefined,
): boolean {
  if (!claims || !Array.isArray(claims.amr)) return false;

  return claims.amr.some((entry) =>
    typeof entry === "string"
      ? entry === "password"
      : typeof entry === "object" &&
        entry !== null &&
        entry.method === "password",
  );
}

/** Classifies a Supabase JWT payload as unauthenticated, recovery-only, or password-authenticated. */
export function getSessionKind(
  claims: JwtPayload | null | undefined,
): SessionKind {
  if (!claims?.sub) return "none";
  return hasPasswordAuth(claims) ? "authenticated" : "recovery";
}
