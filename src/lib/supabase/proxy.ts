import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// หน้าที่ไม่ต้อง login
const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/auth"];
// หน้าที่ login แล้วไม่ควรเข้า
const AUTH_PAGES = ["/sign-in", "/sign-up"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Refresh session cookie ทุก request และ redirect ตามสถานะ login
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

  // อย่าใส่โค้ดอื่นคั่นระหว่าง createServerClient กับ getClaims()
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = !!data?.claims;
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // คง cookie ที่ refresh แล้วไว้
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !matches(pathname, PUBLIC_PATHS)) {
    return redirectTo("/sign-in");
  }
  if (isLoggedIn && matches(pathname, AUTH_PAGES)) {
    return redirectTo("/dashboard");
  }

  return response;
}
