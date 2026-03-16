import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_USER_EMAIL = "ops.lead@northstar.example";

export async function getCurrentUserEmail() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return DEMO_USER_EMAIL;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? DEMO_USER_EMAIL;
}
