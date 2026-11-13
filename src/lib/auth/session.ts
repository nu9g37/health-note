import type { AuthError, JwtPayload } from "@supabase/supabase-js";

export type SessionKind = "none" | "recovery" | "authenticated";

type ClaimsResult =
  | {
      data: { claims: JwtPayload };
      error: null;
    }
  | {
      data: null;
      error: AuthError | null;
    };

export type ClaimsReader = {
  auth: {
    getClaims: (jwt?: string) => Promise<ClaimsResult>;
  };
};

export type SafeClaimsResult = {
  claims: JwtPayload | null;
  error: AuthError | Error | null;
};

/**
 * Reads and verifies JWT claims without letting unexpected JWKS/network
 * exceptions crash callers; always fails closed with `claims: null`.
 */
export async function getSafeClaims(
  supabase: ClaimsReader,
  jwt?: string,
): Promise<SafeClaimsResult> {
  try {
    const { data, error } = await supabase.auth.getClaims(jwt);
    if (error) {
      return { claims: null, error };
    }
    return { claims: data?.claims ?? null, error: null };
  } catch (error) {
    console.error(
      "[auth] getClaims threw unexpectedly:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      claims: null,
      error: error instanceof Error ? error : new Error("getClaims failed"),
    };
  }
}

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
