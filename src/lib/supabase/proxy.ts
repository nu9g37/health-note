import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionKind } from "@/lib/auth/session";

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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const sessionKind = getSessionKind(data?.claims);
  const { pathname } = request.nextUrl;

  const withSessionCookies = <T extends NextResponse>(target: T): T => {
    response.cookies.getAll().forEach((c) => target.cookies.set(c));
    return target;
  };

  if (matches(pathname, ["/api"])) {
    if (sessionKind === "none") {
      return withSessionCookies(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    if (sessionKind === "recovery") {
      return withSessionCookies(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }
    return response;
  }

  // Let Next.js Server Action POSTs reach their action handler so expired/unauthorized
  // state returns serialized action errors or framework redirects cleanly instead of 307.
  const isServerAction =
    request.method === "POST" && request.headers.has("next-action");
  if (isServerAction) {
    return response;
  }

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const status =
      request.method === "GET" || request.method === "HEAD" ? 307 : 303;
    return withSessionCookies(NextResponse.redirect(url, status));
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

  return response;
}
