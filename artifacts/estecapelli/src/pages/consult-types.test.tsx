import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConsultTypesBar } from "./consult-types-bar";
import { ConsultationsStrip } from "@/components/consultations-strip";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

const types = (canEdit: boolean) => ({
  enabled: true, canEdit,
  types: [
    { id: "base", name: "Consulta general", isBase: true, active: true, templateKey: "", patientCount: 3 },
    { id: "acne", name: "Acné", isBase: false, active: true, templateKey: "acne", patientCount: 1 },
  ],
  templates: [{ key: "lesiones", name: "Lesión o lunares" }],
});

describe("ConsultTypesBar", () => {
  it("el personal ve los tipos, pero solo el representante legal los administra", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(types(false))));
    const onSelect = vi.fn();
    wrap(<ConsultTypesBar typeId="" onSelect={onSelect} />);
    await userEvent.click(await screen.findByTestId("consult-type-acne"));
    expect(onSelect).toHaveBeenCalledWith("acne");
    expect(screen.queryByTestId("enable-template-lesiones")).toBeNull();
    expect(screen.queryByLabelText("Nombre del nuevo tipo")).toBeNull();
  });

  it("el representante legal activa una plantilla y se pasa a ese tipo", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined });
      if (init?.method === "POST") return json({ ...types(true), id: "lesiones-id", templates: [] }, 201);
      return json(types(true));
    }));
    const onSelect = vi.fn();
    wrap(<ConsultTypesBar typeId="" onSelect={onSelect} />);
    await userEvent.click(await screen.findByTestId("enable-template-lesiones"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("lesiones-id"));
    expect(calls.find((c) => c.method === "POST")).toMatchObject({ url: "/api/clinic/consult-types", body: JSON.stringify({ templateKey: "lesiones" }) });
  });

  it("desactiva un tipo propio", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined });
      return json(types(true));
    }));
    wrap(<ConsultTypesBar typeId="acne" onSelect={vi.fn()} />);
    await userEvent.click(await screen.findByTestId("toggle-consult-type"));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({ url: "/api/clinic/consult-types/acne", body: JSON.stringify({ active: false }) });
  });

  it("no aparece en clínicas que no son de dermatología", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ enabled: false, canEdit: true, types: [], templates: [] })));
    wrap(<ConsultTypesBar typeId="" onSelect={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("consult-types-bar")).toBeNull();
  });
});

describe("ConsultationsStrip", () => {
  const stub = (post?: (body: unknown) => Response) => vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/clinic/consult-types") return json(types(false));
    if (init?.method === "POST") return post ? post(JSON.parse(String(init.body))) : json({ ok: true, lead: { id: "nueva" } }, 201);
    return json({ currentId: "main", consultations: [
      { id: "main", typeName: "Consulta general", status: "nuevo", createdAt: "2026-10-01", isMain: true },
      { id: "c2", typeName: "Acné", status: "incompleto", createdAt: "2026-10-02", isMain: false },
    ] });
  }));

  it("muestra las consultas de la ficha y permite cambiar de una a otra", async () => {
    stub();
    const onOpen = vi.fn();
    wrap(<ConsultationsStrip leadId="main" onOpen={onOpen} />);
    expect(await screen.findByTestId("consultation-main")).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByTestId("consultation-c2"));
    expect(onOpen).toHaveBeenCalledWith("c2");
  });

  it("agrega otra consulta del tipo elegido y abre la nueva", async () => {
    let sent: unknown;
    stub((body) => { sent = body; return json({ ok: true, lead: { id: "nueva" } }, 201); });
    const onOpen = vi.fn();
    wrap(<ConsultationsStrip leadId="main" onOpen={onOpen} />);
    await userEvent.click(await screen.findByTestId("add-consultation"));
    await userEvent.selectOptions(await screen.findByTestId("consultation-type"), "acne");
    await userEvent.click(screen.getByTestId("consultation-add-confirm"));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith("nueva"));
    expect(sent).toEqual({ consultTypeId: "acne" });
  });

  it("muestra el error del servidor si no se puede agregar", async () => {
    stub(() => json({ error: "Elige un tipo de consulta válido." }, 422));
    wrap(<ConsultationsStrip leadId="main" onOpen={vi.fn()} />);
    await userEvent.click(await screen.findByTestId("add-consultation"));
    await userEvent.click(screen.getByTestId("consultation-add-confirm"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Elige un tipo de consulta válido.");
  });

  it("no se muestra si el centro no es de dermatología", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ enabled: false, canEdit: false, types: [], templates: [] })));
    wrap(<ConsultationsStrip leadId="main" onOpen={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("consultations-strip")).toBeNull();
  });
});
