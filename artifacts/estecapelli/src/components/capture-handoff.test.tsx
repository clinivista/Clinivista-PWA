import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,AAAA") } }));
import { CaptureHandoff } from "./capture-handoff";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

const phase = {
  id: "ph1", key: "control-1", name: "Control 1", position: 2, kind: "capture", patientCaptured: false, staffCanCapture: true, enabled: true,
  complete: false, skipped: false, skip: null, attentionRequired: false, attention: null,
  views: [
    { id: "v1", key: "control-1-frontal", label: "Vista frontal", required: true, document: false, transcription: null, photo: { id: "f1" } },
    { id: "v2", key: "control-1-donor", label: "Zona donante", required: true, document: false, transcription: null, photo: null },
  ],
};
const wrap = () => render(<QueryClientProvider client={new QueryClient()}><CaptureHandoff leadId="lead-1" phase={phase as never} /></QueryClientProvider>);

describe("CaptureHandoff", () => {
  it("abre la sesión de esa fase, muestra el QR y desactiva el enlace al cerrar", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (url.endsWith("/capture-session")) return json({ token: "tok123", path: "/captura/tok123", expiresAt: new Date(Date.now() + 20 * 60_000).toISOString() }, 201);
      return json({ ok: true });
    }));
    wrap();
    await userEvent.click(screen.getByTestId("handoff-ph1"));
    expect(await screen.findByTestId("handoff-qr")).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ url: "/api/leads/lead-1/phases/ph1/capture-session", method: "POST" });
    expect(screen.getByTestId("handoff-progress")).toHaveTextContent("1 de 2 fotos tomadas");

    await userEvent.click(screen.getByText("Cerrar y desactivar el enlace"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/capture/tok123/finish")).toBe(true));
  });

  it("muestra el motivo si la fase todavía no se puede fotografiar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Completa la fase anterior antes de registrar esta." }, 409)));
    wrap();
    await userEvent.click(screen.getByTestId("handoff-ph1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Completa la fase anterior");
  });
});
