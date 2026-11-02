import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const invalidate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
  useQuery: () => ({ data: { consents: [], hasEmail: true, email: "p@correo.cl", language: "es", currentVersion: "v" }, isError: false }),
}));
const consult = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("@/lib/consult-types", async () => {
  const actual = await vi.importActual<typeof import("@/lib/consult-types")>("@/lib/consult-types");
  return { ...actual, useConsultTypes: () => ({ data: consult.data }) };
});
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { AddPatientDialog } from "./add-patient-dialog";

describe("AddPatientDialog", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  beforeEach(() => { vi.clearAllMocks(); fetchSpy.mockReset(); consult.data = undefined; });

  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Nombre completo/), "Paciente De Prueba");
    await user.type(screen.getByLabelText(/^RUT/), "123456785");
    await user.type(screen.getByLabelText(/Teléfono/), "+56911111111");
  }

  it("no deja guardar sin la constancia de consentimiento", async () => {
    const user = userEvent.setup();
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    const save = screen.getByRole("button", { name: "Guardar paciente" });
    expect(save).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /El paciente dio su consentimiento/ }));
    expect(save).toBeEnabled();
  });

  it("envía los datos con la constancia y abre la ficha creada", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, lead: { id: "nuevo-1" } }), { status: 201 }));
    const onCreated = vi.fn();
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /El paciente dio su consentimiento/ }));
    await user.click(screen.getByRole("button", { name: "Guardar paciente" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("nuevo-1"));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads");
    const sent = JSON.parse(String((init as RequestInit).body));
    expect(sent).toMatchObject({ name: "Paciente De Prueba", documentId: "12.345.678-5", consentConfirmed: true });
  });

  it("si el paciente ya existe, explica y ofrece abrir su ficha", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: "Ya existe un paciente con este RUT en tu clínica.", duplicate: true, leadId: "viejo-1" }), { status: 409 }));
    const onCreated = vi.fn();
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /El paciente dio su consentimiento/ }));
    await user.click(screen.getByRole("button", { name: "Guardar paciente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un paciente");
    await user.click(screen.getByRole("button", { name: "Abrir ficha existente" }));
    expect(onCreated).toHaveBeenCalledWith("viejo-1");
  });

  it("ofrece las vías de autorización de fotografías y deshabilita el correo si falta", async () => {
    const user = userEvent.setup();
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    const group = screen.getByTestId("add-photo-way");
    expect(group).toHaveTextContent("Autorización para fotografías");
    expect(screen.getByRole("radio", { name: /Pedirla más tarde/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /falta el correo/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Enviar por WhatsApp" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Firmar en pantalla ahora" })).toBeEnabled();
    await user.type(screen.getByLabelText(/Correo/), "p@correo.cl");
    expect(screen.getByRole("radio", { name: "Enviar por correo" })).toBeEnabled();
  });

  it("con «Firmar en pantalla» guarda al paciente y pasa al paso de la firma", async () => {
    const user = userEvent.setup();
    fetchSpy.mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/leads") return new Response(JSON.stringify({ ok: true, lead: { id: "nuevo-9" } }), { status: 201 });
      return new Response(JSON.stringify({ language: "es", clinicName: "Clínica Uno", clinicLogo: null, patientName: "Paciente De Prueba", title: "Autorización para fotografías clínicas", intro: "i", points: ["a"], checkbox: "He leído" }), { status: 200 });
    });
    const onCreated = vi.fn();
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /El paciente dio su consentimiento/ }));
    await user.click(screen.getByRole("radio", { name: "Firmar en pantalla ahora" }));
    await user.click(screen.getByRole("button", { name: "Guardar paciente" }));
    expect(await screen.findByTestId("add-patient-photo-step")).toBeInTheDocument();
    expect(await screen.findByTestId("consent-clinic-name")).toHaveTextContent("Clínica Uno");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("en dermatología deja elegir el tipo de consulta y lo envía", async () => {
    const user = userEvent.setup();
    consult.data = {
      enabled: true, canEdit: false, templates: [],
      types: [
        { id: "c-base", name: "Consulta general", isBase: true, active: true, templateKey: "", patientCount: 0 },
        { id: "c-acne", name: "Acné", isBase: false, active: true, templateKey: "acne", patientCount: 0 },
        { id: "c-off", name: "Desactivada", isBase: false, active: false, templateKey: "custom", patientCount: 0 },
      ],
    };
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, lead: { id: "nuevo-2" } }), { status: 201 }));
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    const select = screen.getByTestId("add-consult-type") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Consulta general", "Acné"]);
    await fill(user);
    await user.selectOptions(select, "c-acne");
    await user.click(screen.getByRole("checkbox", { name: /El paciente dio su consentimiento/ }));
    await user.click(screen.getByRole("button", { name: "Guardar paciente" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body))).toMatchObject({ consultTypeId: "c-acne" });
  });

  it("sin tipos adicionales no muestra el selector", () => {
    render(<AddPatientDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByTestId("add-consult-type")).toBeNull();
  });
});
