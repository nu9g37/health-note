import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Reset password</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Enter a new password for your account.
      </p>
      <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
        <ResetPasswordGuard />
      </Suspense>
    </>
  );
}

async function ResetPasswordGuard() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/sign-in");

  return <ResetPasswordForm />;
}
