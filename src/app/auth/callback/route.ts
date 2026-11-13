import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { hasPasswordAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) {
      const isRecovery =
        "redirectType" in data && data.redirectType === "recovery";
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      const { data: claimsData } = await supabase.auth.getClaims(
        data.session?.access_token,
      );
      if (!hasPasswordAuth(claimsData?.claims)) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(`${origin}/sign-in?status=email-confirmed`);
      }

      return NextResponse.redirect(`${origin}${next ?? "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=invalid-link`);
}
