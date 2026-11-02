import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, LANGS } from "@/lib/language";
import { PHOTO_CONSENT_UI } from "@/lib/photo-consent-i18n";
import { PhotoConsentCard, currentConsent } from "./photo-consent-card";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const wrap = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><PhotoConsentCard leadId="lead-1" patientName="Ana" /></LanguageProvider></QueryClientProvider>,
);
const overview = (over: Record<string, unknown> = {}) => ({ consents: [], hasEmail: true, email: "ana@correo.cl", language: "es", currentVersion: "v1", ...over });
const granted = { id: "c1", method: "tablet", status: "granted", verifiedBy: "in_clinic", textVersion: "v1", registeredByName: "Ana Admin", requestedByName: "Ana Admin", createdAt: new Date().toISOString(), grantedAt: new Date().toISOString(), revokedAt: null, revokeNote: "", hasFile: true, fileMime: "image/png" };

describe("Autorización para fotografías (clínica)", () => {
  it("sin autorización muestra el estado y las tres vías", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(overview()), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap();
    expect(await screen.findByText("Sin autorización registrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar enlace/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar documento firmado/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Firmar en tableta/ })).toBeInTheDocument();
  });

  it("crea el enlace por correo y muestra el resultado con el enlace para copiar", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); const method = init?.method ?? "GET"; calls.push({ url, method, body: init?.body as string | undefined });
      if (url.endsWith("/photo-consent/request")) return new Response(JSON.stringify({ ok: true, url: "https://app/consentimiento/abc", emailSent: true, emailError: "", whatsappText: "hola" }), { status: 201 });
      return new Response(JSON.stringify(overview()), { status: 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: /Enviar enlace/ }));
    expect(screen.getByLabelText(/Enviar por correo a ana@correo.cl/)).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Crear enlace" }));
    expect(await screen.findByDisplayValue("https://app/consentimiento/abc")).toBeInTheDocument();
    expect(screen.getByText("Correo enviado.")).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.url.endsWith("/request"))!.body!)).toMatchObject({ channel: "email", language: "es" });
  });

  it("sin correo el canal por defecto es WhatsApp y avisa que la evidencia es más débil", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify(overview({ hasEmail: false, email: "" })), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: /Enviar enlace/ }));
    expect(await screen.findByLabelText("Enviar por WhatsApp")).toBeChecked();
    expect(screen.getByLabelText(/no tiene correo/)).toBeDisabled();
    expect(screen.getByText(/evidencia es más débil/)).toBeInTheDocument();
  });

  it("sube el documento firmado con su nombre", async () => {
    const calls: Array<{ url: string; method: string; headers?: Record<string, string> }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input); calls.push({ url, method: init?.method ?? "GET", headers: init?.headers as Record<string, string> });
      return new Response(JSON.stringify(init?.method === "POST" ? { ok: true } : overview()), { status: init?.method === "POST" ? 201 : 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: /Registrar documento firmado/ }));
    await user.type(screen.getByLabelText(/Nombre o versión del documento/), "Formulario v3");
    await user.upload(screen.getByTestId("consent-doc-file"), new File(["%PDF-1.4"], "firmado.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/photo-consent/document"))).toBe(true));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.headers?.["X-Document-Label"]).toBe(encodeURIComponent("Formulario v3"));
    expect(post.headers?.["Content-Type"]).toBe("application/pdf");
  });

  it("tableta: pide la aceptación y la firma antes de registrar", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/photo-consent/text")) return new Response(JSON.stringify({ language: "es", clinicName: "Clínica Uno", clinicLogo: "data:image/png;base64,AAAA", patientName: "Paciente Uno", title: "Autorización para fotografías clínicas", intro: "Clínica Uno tomará fotografías", points: ["a", "b"], checkbox: "He leído esta autorización" }), { status: 200 });
      return new Response(JSON.stringify(overview()), { status: 200 });
    });
    localStorage.setItem("clinivista_lang", "es");
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: /Firmar en tableta/ }));
    expect(await screen.findByTestId("tablet-text")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Registrar firma" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El paciente debe marcar que acepta.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Registrar firma" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falta la firma del paciente.");
  });

  it("muestra una autorización vigente con quién la registró y permite ver el archivo y revocar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(overview({ consents: [granted] })), { status: 200 }));
    localStorage.setItem("clinivista_lang", "es");
    wrap();
    expect(await screen.findByText("Autorizada")).toBeInTheDocument();
    expect(screen.getByText(/Registrada por Ana Admin/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver archivo" })).toHaveAttribute("href", "/api/leads/lead-1/photo-consent/c1/file");
    expect(screen.getByRole("button", { name: "Revocar" })).toBeInTheDocument();
  });

  it("elige la autorización vigente por encima de las pendientes o revocadas", () => {
    const base = { ...granted };
    expect(currentConsent([{ ...base, id: "p", status: "pending" } as never, { ...base, id: "g" } as never])?.id).toBe("g");
    expect(currentConsent([{ ...base, id: "r", status: "revoked" } as never])?.id).toBe("r");
    expect(currentConsent([])).toBeNull();
  });

  it("los textos existen en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const ui = PHOTO_CONSENT_UI[code];
      for (const [key, value] of Object.entries(ui)) {
        if (typeof value === "object") { for (const [k2, v2] of Object.entries(value)) expect(v2, `${code}.${key}.${k2}`).toBeTruthy(); continue; }
        const text = typeof value === "function" ? (value as (a: string, b: string) => string)("x", "y") : value;
        expect(text, `${code}.${key}`).toBeTruthy();
      }
    }
  });
});
