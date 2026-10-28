import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/language";

const state = vi.hoisted(() => ({
  clinic: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown },
  options: undefined as unknown,
}));

vi.mock("@workspace/api-client-react", () => ({
  useGetPatient: () => ({ data: undefined, isLoading: false, isError: false }),
  getGetPatientQueryKey: (token: string) => ["/api/patients", token],
  useGetPatientClinic: () => ({ data: undefined }),
  useGetPatientProtocol: () => ({ data: undefined }),
  useGetPortalOptions: () => ({ data: state.options }),
  getGetPatientProtocolQueryKey: (token: string) => ["/api/patients", token, "protocol"],
  getGetPatientClinicQueryKey: (token: string) => ["/api/patients", token, "clinic"],
  useGetClinic: () => state.clinic,
  getGetClinicQueryKey: (slug: string) => ["/api/clinics", slug],
  useCreateClinicPatient: () => ({ mutate: vi.fn(), isPending: false }),
  useCreatePatient: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePatient: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDiscardPatientPhotos: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import ClinicPatient from "./clinic-patient";

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  useParams: () => ({ slug: "EsteCapelli" }),
}));

const renderPage = () => render(<LanguageProvider><ClinicPatient /></LanguageProvider>);

describe("/c/:slug", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/c/estecapelli");
    state.options = undefined;
    state.clinic = { data: { name: "Estecapelli", logoDataUrl: null }, isLoading: false, isError: false, error: null };
  });

  it("shows the clinic's own name instead of the platform brand", () => {
    renderPage();
    expect(screen.getAllByText("Estecapelli").length).toBeGreaterThan(0);
  });

  it("tells the patient when the clinic does not exist, with a link home and no other clinic's data", () => {
    state.clinic = { data: undefined, isLoading: false, isError: true, error: { status: 404 } };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("No encontramos esta clínica");
    expect(screen.getByTestId("clinic-not-found-home")).toHaveAttribute("href", "/");
    expect(screen.queryByTestId("clinic-name")).toBeNull();
    expect(screen.queryByTestId("clinic-start")).toBeNull();
  });

  it("welcome: the clinic's real logo and name lead, Clinivista is the secondary platform brand", () => {
    state.clinic = { data: { name: "Clínica Uno", logoDataUrl: "data:image/png;base64,AAAA", specialty: "capilar" }, isLoading: false, isError: false, error: null };
    renderPage();
    expect(screen.getByTestId("clinic-logo")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByTestId("clinic-logo")).toHaveAttribute("alt", "Clínica Uno");
    expect(screen.getByTestId("clinic-name")).toHaveTextContent("Clínica Uno");
    expect(screen.getByText("Plataforma Clinivista")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bienvenido a tupreevaluación");
    expect(screen.getByText(/No reemplaza una consulta médica/)).toBeInTheDocument();
    expect(screen.queryByText(/Democapilar|DC/)).toBeNull();
  });

  it("welcome without a logo shows the clinic's initials", () => {
    state.clinic = { data: { name: "Capilar Demo", logoDataUrl: null, specialty: "capilar" }, isLoading: false, isError: false, error: null };
    renderPage();
    expect(screen.getByTestId("clinic-initials")).toHaveTextContent("CD");
    expect(screen.queryByTestId("clinic-logo")).toBeNull();
  });

  it("if the clinic cannot be loaded (not a 404), shows an error with retry and no clinic data or form", () => {
    state.clinic = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar esta clínica");
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeInTheDocument();
    expect(screen.queryByTestId("clinic-start")).toBeNull();
  });

  it("a saved pre-evaluation for this clinic skips the welcome (resume works as before)", () => {
    localStorage.setItem("estecapelli.patient-token.estecapelli", "tok-mine");
    renderPage();
    expect(screen.queryByTestId("clinic-welcome")).toBeNull();
  });

  it("«Iniciar preevaluación» opens this clinic's form (clinic context kept) and «back» returns to its welcome", async () => {
    state.options = { googleEnabled: true, profile: null };
    renderPage();
    screen.getByTestId("clinic-start").click();
    // The data step keeps the clinic: Google returns to /c/estecapelli and the header shows its name.
    expect(await screen.findByTestId("google-start")).toHaveAttribute("href", "/api/portal/google/start?next=%2Fc%2Festecapelli");
    expect(screen.getAllByText("Estecapelli").length).toBeGreaterThan(0);
    // «Volver» del paso de datos (primer botón del contenido) regresa a la bienvenida de la clínica.
    (document.querySelector("main button") as HTMLButtonElement).click();
    expect(await screen.findByTestId("clinic-welcome")).toBeInTheDocument();
    expect(screen.getByTestId("clinic-name")).toHaveTextContent("Estecapelli");
  });

  it("keeps a separate resume token per clinic", () => {
    localStorage.setItem("estecapelli.patient-token.otra-clinica", "tok-other");
    localStorage.setItem("estecapelli.patient-token", "tok-legacy");
    renderPage();
    // Neither foreign token is read for this slug: the form starts clean.
    expect(localStorage.getItem("estecapelli.patient-token.estecapelli")).toBeNull();
  });

  it("after coming back from Google, goes to the data step with the verified name and email, and the email cannot be changed", async () => {
    window.history.pushState({}, "", "/c/estecapelli?google=ok");
    state.options = { googleEnabled: true, profile: { email: "paciente@gmail.com", name: "Paciente Google" } };
    renderPage();
    expect(await screen.findByTestId("google-connected")).toHaveTextContent("paciente@gmail.com");
    await waitFor(() => expect(screen.getByDisplayValue("Paciente Google")).toBeInTheDocument());
    const email = screen.getByDisplayValue("paciente@gmail.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.queryByTestId("google-start")).not.toBeInTheDocument();
  });

  it("offers 'Continuar con Google' on the data step, returning to this clinic's page", async () => {
    state.options = { googleEnabled: true, profile: null };
    renderPage();
    // not signed in yet: the intro is shown; the data step offers the button
    const start = screen.getAllByRole("button").find((b) => /comenzar|empezar|iniciar/i.test(b.textContent ?? ""));
    if (start) start.click();
    const link = await screen.findByTestId("google-start");
    expect(link).toHaveAttribute("href", "/api/portal/google/start?next=%2Fc%2Festecapelli");
  });

  it("cirugía plástica: its own questions and wording replace the hair history, in the patient's language", async () => {
    state.clinic = { data: { name: "Clínica Plástica", logoDataUrl: null, specialty: "plastica" }, isLoading: false, isError: false, error: null };
    localStorage.setItem("clinivista_lang", "en");
    renderPage();
    expect(screen.getByTestId("clinic-name")).toHaveTextContent("Clínica Plástica");
    expect(screen.queryByText(/scalp/i)).not.toBeInTheDocument();
    screen.getByRole("button", { name: /Start pre-evaluation/ }).click();
    const intake = await screen.findByTestId("plastic-intake");
    expect(intake).toHaveTextContent("Your interest in plastic surgery");
    expect(intake).toHaveTextContent("Which procedure are you interested in?");
    expect(intake).toHaveTextContent("Do you smoke?");
    expect(screen.queryByText("Hair History")).not.toBeInTheDocument();
  });

  it("dermatología: sus preguntas y textos reemplazan el historial capilar, en el idioma del paciente", async () => {
    state.clinic = { data: { name: "Clínica Derma", logoDataUrl: null, specialty: "dermatologia" }, isLoading: false, isError: false, error: null };
    localStorage.setItem("clinivista_lang", "en");
    renderPage();
    expect(screen.getByTestId("clinic-name")).toHaveTextContent("Clínica Derma");
    expect(screen.queryByText(/scalp/i)).not.toBeInTheDocument();
    screen.getByRole("button", { name: /Start pre-evaluation/ }).click();
    const intake = await screen.findByTestId("derm-intake");
    expect(intake).toHaveTextContent("Your dermatology consultation");
    expect(intake).toHaveTextContent("What is your concern?");
    expect(intake).toHaveTextContent("Skin type");
    expect(screen.queryByText("Hair History")).not.toBeInTheDocument();
    expect(screen.queryByTestId("plastic-intake")).not.toBeInTheDocument();
  });

  it("a hair clinic keeps the hair history form", async () => {
    state.clinic = { data: { name: "Estecapelli", logoDataUrl: null, specialty: "capilar" }, isLoading: false, isError: false, error: null };
    renderPage();
    const start = screen.getAllByRole("button").find((b) => /comenzar|empezar|iniciar/i.test(b.textContent ?? ""));
    start?.click();
    expect(await screen.findByText("Historial Capilar")).toBeInTheDocument();
    expect(screen.queryByTestId("plastic-intake")).not.toBeInTheDocument();
  });
});
