import { createBrowserClient } from "@supabase/ssr";

// ใช้ใน Client Component ("use client") เท่านั้น
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
