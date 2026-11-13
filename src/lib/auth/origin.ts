import { NextResponse, type NextRequest } from "next/server";
import {
  getSafeRedirectPath,
  parseLoopbackOrigin,
} from "@/lib/auth/redirect";
import { applyNoStoreHeaders } from "@/lib/supabase/cookies";

type HeaderGetter = Pick<Headers, "get">;

function parseHttpOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function getConfiguredOrigin():
  | { state: "valid"; origin: string }
  | { state: "invalid" }
  | { state: "unset" } {
  const rawExplicit =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (rawExplicit) {
    const origin = parseHttpOrigin(rawExplicit);
    if (!origin) {
      console.error(
        "[auth] Invalid SITE_URL or NEXT_PUBLIC_SITE_URL; ignoring untrusted request headers.",
      );
      return { state: "invalid" };
    }
    return { state: "valid", origin };
  }

  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
      : process.env.VERCEL_URL?.trim();

  if (vercelHost) {
    const candidate = vercelHost.includes("://")
      ? vercelHost
      : `https://${vercelHost}`;
    const origin = parseHttpOrigin(candidate);
    if (origin) {
      return { state: "valid", origin };
    }
  }

  return { state: "unset" };
}

/**
 * Resolves a trusted origin from server environment configuration, or falls
 * back strictly to loopback `Host` values for local development.
 * Never trusts client-controlled `Origin` or `X-Forwarded-Host` headers.
 */
export function getTrustedAuthOrigin(
  requestHeaders: HeaderGetter,
  protocolFallback?: string,
): string | null {
  const configured = getConfiguredOrigin();
  if (configured.state === "valid") return configured.origin;
  if (configured.state === "invalid") return null;

  const loopbackOrigin = parseLoopbackOrigin(
    requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto") ?? protocolFallback,
  );
  if (loopbackOrigin) return loopbackOrigin;

  console.error(
    "[auth] Missing SITE_URL or NEXT_PUBLIC_SITE_URL outside loopback; ignoring untrusted request headers.",
  );
  return null;
}

/**
 * Builds a redirect response pinned to a validated internal path and trusted
 * origin, falling back to a relative `Location` header if no trusted origin
 * is configured so spoofed `Host` / `X-Forwarded-Host` headers cannot hijack redirects.
 */
export function createAuthRedirectResponse(
  request: NextRequest,
  path: string,
): NextResponse {
  const safePath = getSafeRedirectPath(path) ?? "/sign-in";
  const trustedOrigin = getTrustedAuthOrigin(
    request.headers,
    request.nextUrl.protocol,
  );

  const redirectResponse = trustedOrigin
    ? NextResponse.redirect(new URL(safePath, trustedOrigin))
    : new NextResponse(null, {
        status: 307,
        headers: { Location: safePath },
      });

  return applyNoStoreHeaders(redirectResponse);
}
