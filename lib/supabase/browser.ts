import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (!env.isSupabaseConfigured) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
  }

  return client;
}
