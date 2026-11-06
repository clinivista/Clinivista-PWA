import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("wouter", () => ({ useParams: () => ({ token: "tok-abc" }) }));
// La cámara de la app necesita el celular: aquí se simula una toma.
vi.mock("@/components/clinic-camera", () => ({
  ClinicCamera: ({ viewKey, onCapture }: { viewKey: string; onCapture: (url: string) => void }) => <button type="button" onClick={() => onCapture("data:image/jpeg;base64,AAAA")}>Disparar {viewKey}</button>,
}));
vi.mock("@/lib/clinic-camera", () => ({ dataUrlToFile: async (_url: string, name: string) => new File([new Uint8Array(10)], name, { type: "image/jpeg" }) }));
import Capture from "./capture";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

const info = (taken: boolean) => ({
  clinicName: "Clínica Norte", expiresAt: "2026-10-25T12:00:00Z", phase: { key: "control-1", name: "Control 1" },
  views: [
    { id: "v1", key: "control-1-frontal", label: "Vista frontal", required: true, taken },
    { id: "v2", key: "control-1-donor", label: "Zona donante", required: false, taken: false },
  ],
});

describe("Captura desde el celular", () => {
  it("muestra las vistas de la fase, sube la foto con el enlace y marca la vista como tomada", async () => {
    let taken = false;
    const calls: Array<{ url: string; method?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (init?.method === "POST" && url.includes("/photo")) { taken = true; return json({ ok: true }, 201); }
      if (init?.method === "POST") return json({ ok: true });
      return json(info(taken));
    }));
    render(<Capture />);
    expect(await screen.findByText(/Clínica Norte/)).toBeInTheDocument();
    expect(screen.getByText(/0 de 2 fotos/)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("capture-control-1-frontal"));
    await userEvent.click(await screen.findByRole("button", { name: "Disparar control-1-frontal" }));
    await waitFor(() => expect(screen.getByText(/1 de 2 fotos/)).toBeInTheDocument());
    expect(calls.some((c) => c.url === "/api/capture/tok-abc/views/v1/photo" && c.method === "POST")).toBe(true);

    await userEvent.click(screen.getByTestId("capture-finish"));
    expect(await screen.findByText("Listo")).toBeInTheDocument();
    expect(calls.some((c) => c.url === "/api/capture/tok-abc/finish")).toBe(true);
  });

  it("avisa cuando el enlace venció o fue cerrado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Este enlace ya no está activo." }, 410)));
    render(<Capture />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Enlace no disponible");
  });
});
