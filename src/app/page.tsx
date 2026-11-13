import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSessionKind } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={null}>
      <HomeRedirect searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeRedirect({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  if (code) {
    const query = new URLSearchParams({ code });
    if (typeof params.sb_flow_id === "string") {
      query.set("sb_flow_id", params.sb_flow_id);
    }
    if (typeof params.next === "string") {
      query.set("next", params.next);
    }
    return redirect(`/auth/callback?${query.toString()}`);
  }
  if (typeof params.error_code === "string" && params.error_code) {
    return redirect("/sign-in?error=invalid-link");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sessionKind = getSessionKind(data?.claims);

  if (sessionKind === "authenticated") return redirect("/dashboard");
  if (sessionKind === "recovery") return redirect("/reset-password");
  return redirect("/sign-in");
}
