import { signOut } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm">Signed in as {data?.claims?.email}</p>
      <form action={signOut} className="mt-4">
        <button className="rounded-lg border px-4 py-2">Sign out</button>
      </form>
    </main>
  );
}
