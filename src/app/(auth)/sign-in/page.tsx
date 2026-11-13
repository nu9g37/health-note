import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

const STATUS_MESSAGES: Record<string, string> = {
  "password-updated":
    "Your password has been updated. Please sign in with your new password.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-link":
    "That link is invalid or has expired. Please request a new one.",
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <SignInForm
        initialNotice={
          <Suspense fallback={null}>
            <SignInNotice searchParams={searchParams} />
          </Suspense>
        }
      />
    </>
  );
}

async function SignInNotice({
  searchParams,
}: Pick<PageProps<"/sign-in">, "searchParams">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const error = typeof params.error === "string" ? params.error : "";

  const statusMessage = STATUS_MESSAGES[status];
  if (statusMessage) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {statusMessage}
      </p>
    );
  }

  const errorMessage = ERROR_MESSAGES[error];
  if (errorMessage) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {errorMessage}
      </p>
    );
  }

  return null;
}
