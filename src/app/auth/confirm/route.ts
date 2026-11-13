import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { signOutSafely } from "@/lib/auth/server";
import { hasPasswordAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      const { data: claimsData } = await supabase.auth.getClaims(
        data.session?.access_token,
      );
      if (!hasPasswordAuth(claimsData?.claims)) {
        await signOutSafely(supabase, "local");
        return NextResponse.redirect(`${origin}/sign-in?status=email-confirmed`);
      }

      return NextResponse.redirect(`${origin}${next ?? "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=invalid-link`);
}
