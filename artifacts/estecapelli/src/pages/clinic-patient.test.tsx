import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/language";

const state = vi.hoisted(() => ({
  clinic: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown },
}));

vi.mock("@workspace/api-client-react", () => ({
  useGetPatient: () => ({ data: undefined, isLoading: false, isError: false }),
  getGetPatientQueryKey: (token: string) => ["/api/patients", token],
  useGetPatientClinic: () => ({ data: undefined }),
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
});
