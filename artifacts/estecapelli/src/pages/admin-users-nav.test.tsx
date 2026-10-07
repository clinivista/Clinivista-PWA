/**
 * The "Usuarios" option of a clinic's panel is only offered to people who can
 * manage users (administrativos and the legal representative). Only fetch is
 * mocked, so the real react-query pipeline runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import Admin from "./admin";

let fetchSpy: ReturnType<typeof vi.spyOn>;
let me: object;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  window.localStorage.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return jsonResponse(me);
    if (url.includes("/api/leads/stats")) return jsonResponse({ total: 0, counts: {} });
    if (url.includes("/api/leads")) return jsonResponse({ leads: [] });
    if (url.endsWith("/api/clinic/me")) return jsonResponse({ name: "Clínica", slug: "clinica", logoDataUrl: null });
    if (url.endsWith("/api/clinic/users")) {
      return jsonResponse({
        users: [{ id: "u1", email: "ana@x.cl", name: "Ana Pérez", role: "medico", active: true, legalRepresentative: false, isSelf: false, createdAt: "2026-01-01T00:00:00Z" }],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => vi.restoreAllMocks());

const signedIn = (role: string, canManageUsers: boolean) => ({
  authenticated: true,
  user: { id: "me", email: "me@x.cl", name: "Yo", role, centerId: "c1", canManageUsers },
});

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <Admin />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("Admin — Usuarios option", () => {
  it("is offered to a person who can manage users, and opens the users list", async () => {
    me = signedIn("administrativo", true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Usuarios" }));
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usuarios" })).toBeInTheDocument();
  });

  it("is offered to a médico who is the legal representative", async () => {
    me = signedIn("medico", true);
    renderAdmin();
    expect(await screen.findByRole("button", { name: "Usuarios" })).toBeInTheDocument();
  });

  it("is hidden from a médico who is not the legal representative", async () => {
    me = signedIn("medico", false);
    renderAdmin();
    await screen.findByRole("button", { name: /Copiar enlace/i });
    expect(screen.queryByRole("button", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/api/clinic/users"))).toBe(false);
  });
});
