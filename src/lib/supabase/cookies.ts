import type { CookieOptionsWithName } from "@supabase/ssr";
import { parseLoopbackOrigin } from "@/lib/auth/redirect";

const NO_STORE_CACHE_CONTROL =
  "private, no-cache, no-store, must-revalidate, max-age=0";

/** Prevents browsers, CDNs, and shared proxies from caching auth/session responses. */
export function applyNoStoreHeaders<T extends Response>(target: T): T {
  target.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  target.headers.set("Pragma", "no-cache");
  return target;
}

function shouldUseSecureCookies(
  requestHeaders?: Pick<Headers, "get">,
  urlProtocol?: string,
): boolean {
  if (urlProtocol === "https:") return true;

  const forwardedProto = requestHeaders
    ?.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto === "https") return true;

  if (process.env.VERCEL === "1") return true;

  const configuredUrl =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl?.startsWith("https://")) return true;

  if (process.env.NODE_ENV === "production") {
    return parseLoopbackOrigin(requestHeaders?.get("host") ?? null) === null;
  }

  return false;
}

/**
 * Returns hardened cookie attributes (`SameSite=Lax`, plus `Secure` outside local HTTP)
 * so auth session and PKCE verifier cookies are consistent across set and clear operations.
 */
export function getSupabaseCookieOptions(
  requestHeaders?: Pick<Headers, "get">,
  urlProtocol?: string,
): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies(requestHeaders, urlProtocol),
  };
}
