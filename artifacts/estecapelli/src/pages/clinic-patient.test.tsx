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

  it("tells the patient when the clinic does not exist", () => {
    state.clinic = { data: undefined, isLoading: false, isError: true, error: { status: 404 } };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Esta clínica no existe");
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
});
