import { describe, it, expect, vi, beforeEach } from "vitest";
import { within, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";

// The patient page pulls in generated react-query hooks; mock them so the
// component renders without a QueryClient or a running API server.
vi.mock("@workspace/api-client-react", () => ({
  useGetPatient: () => ({ data: undefined, isLoading: false, isError: false }),
  getGetPatientQueryKey: (token: string) => ["/api/patients", token],
  useGetPatientClinic: () => ({ data: undefined }),
  useGetPatientProtocol: () => ({ data: undefined }),
  useGetPortalOptions: () => ({ data: undefined }),
  getGetPatientProtocolQueryKey: (token: string) => ["/api/patients", token, "protocol"],
  getGetPatientClinicQueryKey: (token: string) => ["/api/patients", token, "clinic"],
  useGetClinic: () => ({ data: undefined }),
  getGetClinicQueryKey: (slug: string) => ["/api/clinics", slug],
  useCreateClinicPatient: () => ({ mutate: vi.fn(), isPending: false }),
  useCreatePatient: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePatient: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDiscardPatientPhotos: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import PatientFlow from "./patient";

// Spanish (default language) UI strings
const BEGIN_CTA = "Comenzar Evaluación";
const CONTINUE_CTA = /Continuar a Fotografías/;
const CITY_PLACEHOLDER = "Selecciona tu ciudad o comuna";

// jsdom does not compute CSS layout, so user-event's pointer-events check
// produces false positives on Radix's Select trigger — disable it.
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function renderPatientFlow() {
  return render(
    <LanguageProvider>
      <PatientFlow />
    </LanguageProvider>,
  );
}

async function goToConsentStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: new RegExp(BEGIN_CTA) }));
}

/** La autorización va primero: se lee, se marca y recién ahí aparece el formulario de datos. */
async function goToDataStep(user: ReturnType<typeof userEvent.setup>) {
  await goToConsentStep(user);
  await user.click(screen.getByTestId("consent-main"));
  await user.click(screen.getByTestId("consent-continue"));
}

/** Fills every required field except consent. Test fixture only — not real data. */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("María García"), "Paciente De Prueba");
  await user.type(screen.getByPlaceholderText("12.345.678-5"), "12.345.678-5");
  await user.type(screen.getByPlaceholderText("9 1234 5678"), "911111111");
  await user.type(screen.getByPlaceholderText("correo@ejemplo.com"), "prueba@example.com");
  // City via Radix Select
  await user.click(screen.getByText(CITY_PLACEHOLDER));
  await user.click(await screen.findByRole("option", { name: "Santiago" }));
  await user.click(screen.getByRole("radio", { name: "Por correo" }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Patient data step", () => {
  it("starts with the city field empty (placeholder visible)", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    expect(screen.getByText(CITY_PLACEHOLDER)).toBeInTheDocument();
  });

  it("disables 'Continuar' when the form is empty", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    expect(screen.getByRole("button", { name: CONTINUE_CTA })).toBeDisabled();
  });

  it("shows the authorization first, without asking for any personal data, and keeps «continue» off until it is ticked", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToConsentStep(user);
    expect(screen.getByTestId("consent-step")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("María García")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("12.345.678-5")).not.toBeInTheDocument();
    expect(screen.getByTestId("consent-continue")).toBeDisabled();
    expect(screen.getByTestId("consent-need-check")).toBeInTheDocument();
    await user.click(screen.getByTestId("consent-continue"));
    expect(screen.getByTestId("consent-step")).toBeInTheDocument();
    await user.click(screen.getByTestId("consent-main"));
    expect(screen.getByTestId("consent-continue")).toBeEnabled();
    expect(screen.queryByTestId("consent-need-check")).not.toBeInTheDocument();
  });

  it("the optional newsletter box is marked optional and does not block continuing", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToConsentStep(user);
    expect(screen.getByTestId("consent-marketing")).not.toBeChecked();
    await user.click(screen.getByTestId("consent-main"));
    expect(screen.getByTestId("consent-continue")).toBeEnabled();
  });

  it("the data step shows the accepted authorization and lets the patient go back and review it", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    expect(screen.getByTestId("consent-done-chip")).toBeInTheDocument();
    expect(screen.queryByTestId("consent-main")).not.toBeInTheDocument();
    await user.click(within(screen.getByTestId("consent-done-chip")).getByRole("button"));
    expect(screen.getByTestId("consent-step")).toBeInTheDocument();
    expect(screen.getByTestId("consent-main")).toBeChecked();
  });

  it("enables 'Continuar' once all required fields are valid (the authorization was already accepted)", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    await fillRequiredFields(user);
    expect(screen.getByRole("button", { name: CONTINUE_CTA })).toBeEnabled();
  });

  it("offers the results channels with none preselected, and 'Continuar' needs one", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    expect(screen.getByTestId("delivery-hint")).toHaveTextContent("Elige una opción para continuar.");
    await user.type(screen.getByPlaceholderText("María García"), "Paciente De Prueba");
    await user.type(screen.getByPlaceholderText("12.345.678-5"), "12.345.678-5");
    await user.type(screen.getByPlaceholderText("9 1234 5678"), "911111111");
    await user.type(screen.getByPlaceholderText("correo@ejemplo.com"), "prueba@example.com");
    await user.click(screen.getByText(CITY_PLACEHOLDER));
    await user.click(await screen.findByRole("option", { name: "Santiago" }));
    expect(screen.getByRole("button", { name: CONTINUE_CTA })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Por WhatsApp" }));
    expect(screen.getByTestId("delivery-hint")).toHaveTextContent(/WhatsApp/);
    expect(screen.getByRole("button", { name: CONTINUE_CTA })).toBeEnabled();
  });

  it("shows a RUT error on blur when the check digit is invalid", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    const rutInput = screen.getByPlaceholderText("12.345.678-5");
    await user.type(rutInput, "12.345.678-9");
    await user.tab(); // blur triggers validation
    expect(
      await screen.findByText(/El RUT ingresado no es válido/),
    ).toBeInTheDocument();
  });

  it("masks the RUT while typing (adds dots and dash)", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    const rutInput = screen.getByPlaceholderText("12.345.678-5");
    await user.type(rutInput, "123456785");
    expect(rutInput).toHaveValue("12.345.678-5");
  });
});
