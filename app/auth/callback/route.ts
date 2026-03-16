import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!env.isSupabaseConfigured || !code) {
    return NextResponse.redirect(new URL(`/w/${env.demoWorkspaceSlug}/chat`, request.url));
  }

  const response = NextResponse.redirect(new URL("/onboarding", request.url));

  const supabase = createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return response.cookies.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.exchangeCodeForSession(code);

  return response;
}
