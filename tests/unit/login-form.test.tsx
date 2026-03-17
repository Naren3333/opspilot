import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LoginForm } from "@/components/login/login-form";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const mockedCreateSupabaseBrowserClient = vi.mocked(createSupabaseBrowserClient);

describe("LoginForm", () => {
  beforeEach(() => {
    mockedCreateSupabaseBrowserClient.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  it("shows OAuth actions and any incoming login message", () => {
    mockedCreateSupabaseBrowserClient.mockReturnValue(null);

    render(<LoginForm demoHref="/w/northstar-support/chat" initialMessage="OAuth failed." />);

    expect(screen.getByRole("button", { name: /continue with github/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeVisible();
    expect(screen.getByText("OAuth failed.")).toBeVisible();
  });

  it("starts GitHub OAuth with the auth callback redirect", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

    mockedCreateSupabaseBrowserClient.mockReturnValue({
      auth: {
        signInWithOAuth,
      },
    } as unknown as ReturnType<typeof createSupabaseBrowserClient>);

    render(<LoginForm demoHref="/w/northstar-support/chat" />);

    fireEvent.click(screen.getByRole("button", { name: /continue with github/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
        },
      });
    });
  });
});
