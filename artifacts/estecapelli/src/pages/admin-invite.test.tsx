/**
 * "Nuevo enlace" modal: the admin gets a one-click "Copiar enlace" button that
 * copies the full patient pre-evaluation URL, built from the admin panel's own
 * origin (not the server's Host-derived `link`, which is wrong behind the dev
 * proxy). Only fetch is mocked, so the real react-query pipeline runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import Admin from "./admin";

const INVITE_TOKEN = "invite-token-xyz";
const EXPECTED_LINK = `${window.location.origin}/patient?token=${INVITE_TOKEN}`;
// What the server would return behind the Vite proxy (wrong protocol and port).
const SERVER_LINK = `https://localhost:3001/patient?token=${INVITE_TOKEN}`;

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
    if (url.endsWith("/api/invitations") && method === "POST") {
      return jsonResponse({
        ok: true,
        link: SERVER_LINK,
        lead: {
          id: "lead-invite-1", token: INVITE_TOKEN, name: "Paciente Invitado", phone: "+56911111111",
          status: "nuevo", consent: false, photoCount: 0,
          createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z",
        },
      }, 201);
    }
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

async function createInvite(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Nuevo enlace/i }));
  await user.type(screen.getByPlaceholderText("+56 9 1234 5678"), "+56911111111");
  await user.click(screen.getByRole("button", { name: /Generar/i }));
  return screen.findByRole("button", { name: /Copiar enlace/i });
}

describe("Admin — Nuevo enlace modal", () => {
  it("shows the full patient URL built from the admin origin, not the server-provided link", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await createInvite(user);

    expect(screen.getByTestId("invite-link")).toHaveTextContent(EXPECTED_LINK);
    expect(screen.queryByText(SERVER_LINK)).not.toBeInTheDocument();
  });

  it("copies the full URL with the Clipboard API and confirms visually", async () => {
    setSecureContext(true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    // After setup(): user-event installs its own clipboard stub on navigator.
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    renderAdmin();
    await user.click(await createInvite(user));

    expect(writeText).toHaveBeenCalledWith(EXPECTED_LINK);
    expect(await screen.findByRole("button", { name: /Enlace copiado/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Enlace copiado");
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
    await user.click(await createInvite(user));

    expect(copiedValue).toBe(EXPECTED_LINK);
    expect(await screen.findByRole("button", { name: /Enlace copiado/i })).toBeInTheDocument();
  });

  it("does not claim success when copying fails", async () => {
    setSecureContext(false);
    document.execCommand = vi.fn(() => false);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    const copyButton = await createInvite(user);
    await user.click(copyButton);

    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith("copy"));
    expect(screen.queryByRole("button", { name: /Enlace copiado/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar enlace/i })).toBeInTheDocument();
    // The link stays visible so it can be copied by hand.
    expect(screen.getByTestId("invite-link")).toHaveTextContent(EXPECTED_LINK);
  });

  it("uses the same client-built link in the WhatsApp message", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderAdmin();
    await createInvite(user);

    await user.click(screen.getByRole("button", { name: /WhatsApp/i }));
    const [waUrl] = open.mock.calls[0] as [string];
    expect(decodeURIComponent(waUrl)).toContain(EXPECTED_LINK);
    expect(decodeURIComponent(waUrl)).not.toContain(SERVER_LINK);
  });
});
