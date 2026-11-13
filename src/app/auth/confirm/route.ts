import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createAuthRedirectResponse } from "@/lib/auth/origin";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { signOutSafely } from "@/lib/auth/server";
import { hasPasswordAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
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
        return createAuthRedirectResponse(request, "/reset-password");
      }

      const { data: claimsData } = await supabase.auth.getClaims(
        data.session?.access_token,
      );
      if (!hasPasswordAuth(claimsData?.claims)) {
        await signOutSafely(supabase, "local");
        return createAuthRedirectResponse(
          request,
          "/sign-in?status=email-confirmed",
        );
      }

      return createAuthRedirectResponse(request, next ?? "/dashboard");
    }
  }

  return createAuthRedirectResponse(request, "/sign-in?error=invalid-link");
}
