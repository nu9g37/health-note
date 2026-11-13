import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return redirect(data?.claims ? "/dashboard" : "/sign-in");
}
