import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import { ClinicDataPanel } from "./clinic-data-panel";

const base = { name: "Clínica Norte", documentKind: "rut", country: "CL", rut: "76.123.456-0", address: "Av. Uno 100", phone: "+56 2 2222 3333", whatsapp: "", email: "" };
let state = { ...base };
let status = 200;
const calls: Array<{ method?: string; body?: Record<string, string> }> = [];

beforeEach(() => {
  state = { ...base };
  status = 200;
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as Record<string, string>;
      calls.push({ method: "PUT", body });
      if (status !== 200) return new Response(JSON.stringify({ error: "Solo el representante legal puede cambiar los datos de la clínica." }), { status });
      state = { ...state, ...body };
      return new Response(JSON.stringify(state), { status: 200 });
    }
    if (status !== 200) return new Response(JSON.stringify({ error: "no" }), { status });
    return new Response(JSON.stringify(state), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

const show = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><ClinicDataPanel /></LanguageProvider>
  </QueryClientProvider>,
);

describe("Datos de la clínica (representante legal)", () => {
  it("muestra bloqueados el nombre, el país y el RUT, y deja editar dirección, teléfono, WhatsApp y correo", async () => {
    show();
    const fixed = await screen.findByTestId("clinic-data-fixed");
    expect(within(fixed).getByText("Clínica Norte")).toBeInTheDocument();
    expect(within(fixed).getByText("76.123.456-0")).toBeInTheDocument();
    expect(within(fixed).queryByRole("textbox")).toBeNull();
    expect(screen.getByLabelText(/Dirección/)).toHaveValue("Av. Uno 100");
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue("+56 2 2222 3333");
    expect(screen.getByLabelText("WhatsApp")).toHaveValue("");
    expect(screen.getByLabelText("Correo de la empresa")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled(); // sin cambios
  });

  it("guarda solo los cuatro datos editables (nunca el país ni el RUT)", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByTestId("clinic-data-fixed");
    await user.type(screen.getByLabelText("WhatsApp"), "+56 9 8888 7777");
    await user.type(screen.getByLabelText("Correo de la empresa"), "contacto@norte.cl");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(Object.keys(calls[0]!.body!).sort()).toEqual(["address", "email", "phone", "whatsapp"]);
    expect(calls[0]!.body).toMatchObject({ whatsapp: "+56 9 8888 7777", email: "contacto@norte.cl" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled()); // ya no hay cambios por guardar
  });

  it("no deja guardar con teléfono o dirección vacíos, ni con correo o WhatsApp inválidos", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByTestId("clinic-data-fixed");
    const save = screen.getByRole("button", { name: "Guardar cambios" });
    await user.type(screen.getByLabelText("Correo de la empresa"), "sin-arroba");
    expect(await screen.findByText("Escribe un correo válido.")).toBeInTheDocument();
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText("Correo de la empresa"));
    await user.type(screen.getByLabelText("WhatsApp"), "hola");
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText("WhatsApp"));
    await user.clear(screen.getByLabelText(/Teléfono/));
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText(/Teléfono/), "+56 2 1111 2222");
    expect(save).toBeEnabled();
  });

  it("si el servidor no deja (no es el representante legal) muestra el aviso y no el formulario", async () => {
    status = 403;
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar los datos de la clínica.");
    expect(screen.queryByTestId("clinic-data-panel")).toBeNull();
  });
});
