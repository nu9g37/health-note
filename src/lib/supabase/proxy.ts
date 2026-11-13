import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeClaims, getSessionKind } from "@/lib/auth/session";
import {
  applyNoStoreHeaders,
  getSupabaseCookieOptions,
} from "@/lib/supabase/cookies";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/forgot-password", "/auth"];
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];
const RECOVERY_ALLOWED_PATHS = ["/reset-password", "/auth"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let cookieCacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(
        request.headers,
        request.nextUrl.protocol,
      ),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          if (Object.keys(headersToSet).length > 0) {
            cookieCacheHeaders = { ...cookieCacheHeaders, ...headersToSet };
          }
        },
      },
    },
  );

  const { claims, error: claimsError } = await getSafeClaims(supabase);
  if (claimsError) {
    console.warn("[auth] proxy getClaims failed:", claimsError.message);
  }
  const sessionKind = getSessionKind(claims);
  const { pathname } = request.nextUrl;

  const finalizeResponse = <T extends NextResponse>(
    target: T,
    options?: { copySessionCookies?: boolean },
  ): T => {
    if (options?.copySessionCookies) {
      response.cookies.getAll().forEach((c) => target.cookies.set(c));
    }
    Object.entries(cookieCacheHeaders).forEach(([key, value]) =>
      target.headers.set(key, value),
    );
    return applyNoStoreHeaders(target);
  };

  if (matches(pathname, ["/api"])) {
    if (sessionKind === "none") {
      return finalizeResponse(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        { copySessionCookies: true },
      );
    }
    if (sessionKind === "recovery") {
      return finalizeResponse(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        { copySessionCookies: true },
      );
    }
    return finalizeResponse(response);
  }

  // Let Next.js Server Action POSTs reach their action handler so expired/unauthorized
  // state returns serialized action errors or framework redirects cleanly instead of 307.
  const isServerAction =
    request.method === "POST" && request.headers.has("next-action");
  if (isServerAction) {
    return finalizeResponse(response);
  }

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const status =
      request.method === "GET" || request.method === "HEAD" ? 307 : 303;
    return finalizeResponse(NextResponse.redirect(url, status), {
      copySessionCookies: true,
    });
  };

  if (sessionKind === "none" && !matches(pathname, PUBLIC_PATHS)) {
    return redirectTo("/sign-in");
  }
  if (
    sessionKind === "recovery" &&
    pathname !== "/" &&
    !matches(pathname, RECOVERY_ALLOWED_PATHS)
  ) {
    return redirectTo("/reset-password");
  }
  if (
    sessionKind === "authenticated" &&
    matches(pathname, [...AUTH_PAGES, "/reset-password"])
  ) {
    return redirectTo("/dashboard");
  }

  return finalizeResponse(response);
}
