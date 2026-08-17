import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/language";

// The patient page pulls in generated react-query hooks; mock them so the
// component renders without a QueryClient or a running API server.
vi.mock("@workspace/api-client-react", () => ({
  useGetPatient: () => ({ data: undefined, isLoading: false, isError: false }),
  getGetPatientQueryKey: (token: string) => ["/api/patients", token],
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

async function goToDataStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: new RegExp(BEGIN_CTA) }));
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

  it("keeps 'Continuar' disabled when all fields are valid but consent is unchecked", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    await fillRequiredFields(user);
    expect(screen.getByRole("button", { name: CONTINUE_CTA })).toBeDisabled();
  });

  it("enables 'Continuar' once all required fields are valid and consent is ticked", async () => {
    const user = setupUser();
    renderPatientFlow();
    await goToDataStep(user);
    await fillRequiredFields(user);
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]); // first checkbox = mandatory consent
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
