import { type NextRequest } from "next/server";
import { createAuthRedirectResponse } from "@/lib/auth/origin";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { signOutSafely } from "@/lib/auth/server";
import { getSafeClaims, hasPasswordAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
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
        return createAuthRedirectResponse(request, "/reset-password");
      }

      const { claims } = await getSafeClaims(
        supabase,
        data.session?.access_token,
      );
      if (!hasPasswordAuth(claims)) {
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
