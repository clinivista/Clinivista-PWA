/**
 * Header "Copiar enlace" button: copies the permanent, token-less
 * self-registration link (<origin>/patient). The same link works for every
 * patient; each one gets their own token when they submit the form, so the
 * admin panel never creates invitations. Only fetch is mocked, so the real
 * react-query pipeline runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import Admin from "./admin";

const PUBLIC_LINK = `${window.location.origin}/patient`;

let fetchSpy: ReturnType<typeof vi.spyOn>;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value });
}

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
}

beforeEach(() => {
  window.localStorage.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/auth/me")) return jsonResponse({ authenticated: true, demoPassword: false });
    if (url.includes("/api/leads/stats")) return jsonResponse({ total: 0, counts: {} });
    if (url.includes("/api/leads")) return jsonResponse({ leads: [] });
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setClipboard(undefined);
  setSecureContext(false);
});

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <Admin />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

function invitationRequests() {
  return fetchSpy.mock.calls.filter(([input]) => String(input).includes("/api/invitations"));
}

describe("Admin — permanent self-registration link", () => {
  it("copies <origin>/patient without a token via the Clipboard API and confirms visually", async () => {
    setSecureContext(true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    // After setup(): user-event installs its own clipboard stub on navigator.
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: /Copiar enlace/i }));

    expect(writeText).toHaveBeenCalledWith(PUBLIC_LINK);
    expect(writeText.mock.calls[0][0]).not.toContain("token");
    expect(await screen.findByRole("button", { name: /Enlace copiado/i })).toBeInTheDocument();
    expect(invitationRequests()).toHaveLength(0);
  });

  it("falls back to execCommand when the Clipboard API is unavailable (plain HTTP)", async () => {
    setSecureContext(false);
    let copiedValue = "";
    document.execCommand = vi.fn(() => {
      copiedValue = document.querySelector("textarea")?.value ?? "";
      return true;
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: /Copiar enlace/i }));

    expect(copiedValue).toBe(PUBLIC_LINK);
    expect(await screen.findByRole("button", { name: /Enlace copiado/i })).toBeInTheDocument();
    expect(invitationRequests()).toHaveLength(0);
  });

  it("does not claim success when copying fails", async () => {
    setSecureContext(false);
    document.execCommand = vi.fn(() => false);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: /Copiar enlace/i }));

    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith("copy"));
    expect(screen.queryByRole("button", { name: /Enlace copiado/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeInTheDocument();
  });

  it("no longer opens the per-patient invitation modal", async () => {
    setSecureContext(false);
    document.execCommand = vi.fn(() => true);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: /Copiar enlace/i }));

    expect(screen.queryByPlaceholderText("+56 9 1234 5678")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nuevo enlace/i })).not.toBeInTheDocument();
    expect(invitationRequests()).toHaveLength(0);
  });
});
