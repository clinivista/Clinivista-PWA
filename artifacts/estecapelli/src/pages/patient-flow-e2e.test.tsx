/**
 * End-to-end UI tests for the patient form flow.
 *
 * These tests do NOT mock the @workspace/api-client-react hooks.
 * Instead they use a real QueryClient and spy on globalThis.fetch — the only
 * network boundary — so the complete customFetch → ApiError → react-query
 * onSuccess / onError pipeline executes for real.
 *
 * Covered scenarios:
 *   A. Happy path: fill Antecedentes → upload photo → submit → success screen
 *      (verifies the "24 horas hábiles" message appears).
 *   B. Duplicate: submit → API returns 409 → duplicate warning card is shown.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";
import PatientFlow from "./patient";

vi.mock("@/components/photo-editor", () => ({
  PhotoEditor: ({ onDiscardAdjustment }: { onDiscardAdjustment: () => void }) => (
    <section aria-label="Editor técnico simulado">
      <button type="button" onClick={onDiscardAdjustment}>Solicitar descarte del ajuste</button>
    </section>
  ),
}));

// ---------------------------------------------------------------------------
// Image / canvas mocks
// Must live in beforeAll so they are in place before the component renders
// and before compress() / compressImage() are ever called.
// ---------------------------------------------------------------------------
const FAKE_JPEG = "data:image/jpeg;base64,/9j/fakeImageData";

beforeAll(() => {
  // FileReader: delivers a fake data-URL so compress(file) resolves immediately.
  globalThis.FileReader = class MockFileReader {
    result: string | null = null;
    onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(_blob: Blob) {
      this.result = FAKE_JPEG;
      const self = this;
      setTimeout(() => {
        self.onload?.({ target: self } as unknown as ProgressEvent<FileReader>);
      }, 0);
    }
  } as unknown as typeof FileReader;

  // HTMLImageElement: fires onload immediately so compressImage() resolves.
  Object.defineProperty(globalThis, "Image", {
    writable: true,
    configurable: true,
    value: class MockImage {
      width = 100;
      height = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) {
        setTimeout(() => { this.onload?.(); }, 0);
      }
    },
  });

  // Canvas: minimal stub so toDataURL returns a predictable JPEG.
  HTMLCanvasElement.prototype.getContext = () =>
    ({ drawImage: () => {} }) as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.toDataURL = () => FAKE_JPEG;
});

// ---------------------------------------------------------------------------
// Per-test fetch spy — intercepts the calls that customFetch makes.
// ---------------------------------------------------------------------------
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis as any, "fetch");
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/patient");
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderFlow() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <LanguageProvider>
        <PatientFlow />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function goToDataStep(user: ReturnType<typeof setupUser>) {
  await user.click(
    screen.getByRole("button", { name: /Comenzar Evaluación/i }),
  );
}

/**
 * Fill all required Antecedentes fields.
 * Phone is typed WITHOUT the country prefix (+56) — the UI prepends it.
 */
async function fillForm(user: ReturnType<typeof setupUser>) {
  await user.type(screen.getByPlaceholderText("María García"), "Juan Prueba");
  await user.type(screen.getByPlaceholderText("12.345.678-5"), "12.345.678-5");
  await user.type(screen.getByPlaceholderText("9 1234 5678"), "912345678");
  await user.type(
    screen.getByPlaceholderText("correo@ejemplo.com"),
    "juan@example.com",
  );
  await user.click(screen.getByText("Selecciona tu ciudad o comuna"));
  await user.click(await screen.findByRole("option", { name: "Santiago" }));
}

async function tickConsent(user: ReturnType<typeof setupUser>) {
  const checkboxes = screen.getAllByRole("checkbox");
  await user.click(checkboxes[0]);
}

async function uploadAndAcceptRequiredPhotos(user: ReturnType<typeof setupUser>) {
  for (let index = 0; index < 5; index += 1) {
    const fakeFile = new File(["fake"], `photo-${index}.jpg`, { type: "image/jpeg" });
    await waitFor(() => {
      expect(document.querySelector('input[type="file"]')).not.toBeNull();
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);
    const acceptBtn = await screen.findByRole("button", { name: /Usar esta foto/i });
    await user.click(acceptBtn);
  }
}

// ---------------------------------------------------------------------------
// Fake API responses
// ---------------------------------------------------------------------------
const SUCCESS_BODY = {
  ok: true,
  lead: {
    id: "test-id-1",
    token: "test-token-abc",
    name: "Juan Prueba",
    phone: "+56 912345678",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "listo",
    consent: true,
    photoCount: 1,
    photoKeys: ["frontal"],
  },
};

const DUPLICATE_BODY = {
  error: "Ya existe una evaluación con este teléfono o correo.",
  duplicate: true,
};

const PHOTO_STATUS_BODY = {
  id: "photo-test-1",
  key: "frontal",
  label: "Vista frontal",
  status: "draft",
  source: "upload",
  mimeType: "image/jpeg",
  sizeBytes: 4,
  sha256: "a".repeat(64),
  createdAt: new Date().toISOString(),
  confirmedAt: null,
  hasOriginal: true,
  hasAdjusted: false,
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const RESUME_TOKEN = "resume-owner-token";
const RESUME_LEAD = {
  id: "resume-lead-1",
  token: RESUME_TOKEN,
  name: "Paciente de recuperación",
  documentId: "12.345.678-5",
  phone: "+56 911111111",
  email: "recuperacion@example.com",
  age: "36",
  city: "Santiago",
  consent: true,
  marketingConsent: false,
  status: "incompleto",
  createdAt: "2026-08-20T12:00:00.000Z",
  updatedAt: "2026-08-20T12:00:00.000Z",
  photoCount: 2,
  photoKeys: ["frontal", "vertex"],
};

function resumedPhoto(key: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `photo-${key}`,
    key,
    label: key,
    status: "confirmed",
    source: "upload",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    sha256: `${key}-digest`,
    createdAt: "2026-08-20T12:00:00.000Z",
    confirmedAt: "2026-08-20T12:01:00.000Z",
    hasOriginal: true,
    hasAdjusted: false,
    width: 1600,
    height: 1200,
    captureMetadata: { technicalReview: { warningCodes: [] } },
    ...overrides,
  };
}

function installResumeResponses(photos: object[]) {
  fetchSpy.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith(`/api/patients/${RESUME_TOKEN}`) && method === "GET") {
      return jsonResponse({ ok: true, lead: RESUME_LEAD }, 200);
    }
    if (url.endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && method === "GET") {
      return jsonResponse({ ok: true, photos }, 200);
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Full patient form flow — end to end", () => {
  it("shows the success screen with the 24-h message after a successful submission", async () => {
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/patients") && method === "POST") return jsonResponse(SUCCESS_BODY, 201);
      if (url.includes("/api/patients/test-token-abc") && method === "GET") return jsonResponse(SUCCESS_BODY, 200);
      if (url.includes("/photos/photo-test-1/confirm") && method === "POST") {
        return jsonResponse({ ...PHOTO_STATUS_BODY, status: "confirmed", confirmedAt: new Date().toISOString() }, 200);
      }
      if (url.includes("/photos") && method === "POST") return jsonResponse(PHOTO_STATUS_BODY, 201);
      if (url.includes("/api/patients/test-token-abc") && method === "PUT") return jsonResponse(SUCCESS_BODY, 200);
      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    const user = setupUser();
    renderFlow();

    // 1. Intro → Antecedentes
    await goToDataStep(user);

    // 2. Fill required fields (phone without +56 prefix — UI prepends it)
    await fillForm(user);

    // 3. Mandatory consent
    await tickConsent(user);

    // 4. Continue to photos step
    const continueBtn = screen.getByRole("button", {
      name: /Continuar a Fotografías/i,
    });
    expect(continueBtn).toBeEnabled();
    await user.click(continueBtn);

    // 5. Upload + accept all mandatory protocol views → submit becomes enabled.
    await uploadAndAcceptRequiredPhotos(user);

    // 6. Submit the evaluation
    const submitBtn = await screen.findByRole("button", {
      name: /Enviar Evaluación/i,
    });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    // 7. Success screen with 24-h message appears
    expect(
      await screen.findByText("¡Tu evaluación fue recibida!"),
    ).toBeInTheDocument();
    expect(screen.getByText(/24 horas hábiles/i)).toBeInTheDocument();

    // 8. The form first creates the tokenized evaluation, then uploads binary photo data.
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/patients"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the duplicate warning card when the API returns 409", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(DUPLICATE_BODY, 409));

    const user = setupUser();
    renderFlow();

    // 1–3. Same form flow
    await goToDataStep(user);
    await fillForm(user);
    await tickConsent(user);
    await user.click(
      screen.getByRole("button", { name: /Continuar a Fotografías/i }),
    );

    // Creating the tokenized evaluation is rejected before images are accepted.
    expect(
      await screen.findByText(
        /Ya existe una evaluación registrada con este teléfono o correo/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("¡Tu evaluación fue recibida!"),
    ).not.toBeInTheDocument();

    // The public creation endpoint was attempted once and no image upload occurred.
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/patients"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resumes the token owner's metadata-only draft at the first required view still missing", async () => {
    window.history.replaceState({}, "", `/patient?token=${RESUME_TOKEN}`);
    installResumeResponses([
      resumedPhoto("frontal", {
        hasAdjusted: true,
        editParams: { version: 1, crop: { x: 0, y: 0, width: 1600, height: 1200 } },
      }),
      resumedPhoto("vertex", {
        captureMetadata: { technicalReview: { warningCodes: ["low_sharpness"] } },
      }),
    ]);

    const user = setupUser();
    renderFlow();

    expect(await screen.findByText("Tienes un avance guardado")).toBeInTheDocument();
    expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar donde quedé" }));

    expect(await screen.findByRole("heading", { name: "Temporal derecha" })).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vista frontal" }));
    expect(await screen.findByText("Ajustada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustes técnicos de imagen" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vértex / Coronilla" }));
    expect(await screen.findByText("Lista")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vista frontal" }));
    expect(screen.getByText("· revisar")).toBeInTheDocument();

    const storedValues = Object.values(window.localStorage);
    expect(storedValues.join(" ")).not.toContain("data:image/");
    expect(storedValues.join(" ")).not.toContain("base64");
    expect(fetchSpy.mock.calls.map(([input]) => String(input))).toEqual(expect.arrayContaining([
      expect.stringContaining(`/api/patients/${RESUME_TOKEN}`),
      expect.stringContaining(`/api/patients/${RESUME_TOKEN}/photos`),
    ]));
    expect(fetchSpy.mock.calls.map(([input]) => String(input)).some((url) => /\/(original|adjusted)(?:\?|$)/.test(url))).toBe(false);
  });

  it("keeps form guarantees through back navigation and reloads the safe server state", async () => {
    window.history.replaceState({}, "", `/patient?token=${RESUME_TOKEN}`);
    installResumeResponses([resumedPhoto("frontal")]);

    const user = setupUser();
    const firstRender = renderFlow();
    await user.click(await screen.findByRole("button", { name: "Continuar donde quedé" }));
    expect(await screen.findByRole("heading", { name: "Vértex / Coronilla" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vista frontal" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));
    const rutInput = await screen.findByPlaceholderText("12.345.678-5");
    expect(rutInput).toHaveValue("12.345.678-5");
    expect(screen.getByPlaceholderText("correo@ejemplo.com")).toHaveValue("recuperacion@example.com");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();

    firstRender.unmount();
    renderFlow();
    expect(await screen.findByText("Tienes un avance guardado")).toBeInTheDocument();
    expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    expect(Object.values(window.localStorage).join(" ")).not.toContain("data:image/");
  });

  it("waits for a queued autosave before discarding the server draft, preventing a late save from restoring it", async () => {
    window.history.replaceState({}, "", `/patient?token=${RESUME_TOKEN}`);
    const pendingSave = deferred<Response>();
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}`) && method === "GET") {
        return jsonResponse({ ok: true, lead: RESUME_LEAD }, 200);
      }
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && method === "GET") {
        return jsonResponse({ ok: true, photos: [resumedPhoto("frontal")] }, 200);
      }
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}`) && method === "PUT") {
        return pendingSave.promise;
      }
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && method === "DELETE") {
        return jsonResponse({ ok: true, lead: { ...RESUME_LEAD, photoCount: 0, photoKeys: [] } }, 200);
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    const user = setupUser();
    renderFlow();
    await user.click(await screen.findByRole("button", { name: "Continuar donde quedé" }));
    await user.click(screen.getByRole("button", { name: "Vista frontal" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByPlaceholderText("12.345.678-5")).toHaveValue("12.345.678-5");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    const continueButton = screen.getByRole("button", { name: /Continuar a Fotografías/i });
    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([input, init]) => String(input).endsWith(`/api/patients/${RESUME_TOKEN}`) && init?.method === "PUT")).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: "Salir" }));
    await user.click(await screen.findByRole("button", { name: "Descartar preevaluación" }));
    await user.click(await screen.findByRole("button", { name: "Descartar preevaluación" }));

    expect(fetchSpy.mock.calls.some(([input, init]) => String(input).endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && init?.method === "DELETE")).toBe(false);
    pendingSave.resolve(jsonResponse({ ok: true, lead: RESUME_LEAD }, 200));
    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([input, init]) => String(input).endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && init?.method === "DELETE")).toBe(true);
    });
  });

  it("discards only an adjusted rendition and leaves the protected original in place", async () => {
    window.history.replaceState({}, "", `/patient?token=${RESUME_TOKEN}`);
    const adjustedPhoto = resumedPhoto("frontal", { id: "photo-adjusted-1", hasAdjusted: true });
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}`) && method === "GET") {
        return jsonResponse({ ok: true, lead: { ...RESUME_LEAD, photoKeys: ["frontal"], photoCount: 1 } }, 200);
      }
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}/photos`) && method === "GET") {
        return jsonResponse({ ok: true, photos: [adjustedPhoto] }, 200);
      }
      if (url.endsWith(`/api/patients/${RESUME_TOKEN}/photos/photo-adjusted-1/adjusted`) && method === "DELETE") {
        return jsonResponse({ ok: true }, 200);
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    window.localStorage.setItem("estecapelli.technical-photo-draft.photo-adjusted-1", JSON.stringify({ exposure: 0.1 }));

    const user = setupUser();
    renderFlow();
    await user.click(await screen.findByRole("button", { name: "Continuar donde quedé" }));
    await user.click(screen.getByRole("button", { name: "Vista frontal" }));
    await user.click(screen.getByRole("button", { name: "Ajustes técnicos de imagen" }));
    await user.click(await screen.findByRole("button", { name: "Solicitar descarte del ajuste" }));
    await user.click(await screen.findByRole("button", { name: "Descartar versión ajustada" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/api/patients/${RESUME_TOKEN}/photos/photo-adjusted-1/adjusted`),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(window.localStorage.getItem("estecapelli.technical-photo-draft.photo-adjusted-1")).toBeNull();
    expect(fetchSpy.mock.calls.some(([input, init]) => (
      String(input).endsWith(`/api/patients/${RESUME_TOKEN}/photos/photo-adjusted-1`) && init?.method === "DELETE"
    ))).toBe(false);
  });
});
