import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") ? next : "/onboarding";

  if (!env.isSupabaseConfigured) {
    return NextResponse.redirect(new URL(`/w/${env.demoWorkspaceSlug}/chat`, request.url));
  }

  if (authError) {
    const message = encodeURIComponent(authError);
    return NextResponse.redirect(new URL(`/login?message=${message}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?message=Authentication%20was%20cancelled.", request.url));
  }

  const response = NextResponse.redirect(new URL(safeNext, request.url));

  const supabase = createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(new URL(`/login?message=${message}`, request.url));
  }

  return response;
}
