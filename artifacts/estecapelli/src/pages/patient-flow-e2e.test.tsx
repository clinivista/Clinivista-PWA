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

async function uploadAndAcceptPhoto(user: ReturnType<typeof setupUser>) {
  const fakeFile = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
  await waitFor(() => {
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
  });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

  await user.upload(fileInput, fakeFile);

  // After FileReader + canvas pipeline resolves, the preview and accept button appear.
  const acceptBtn = await screen.findByRole("button", {
    name: /Usar esta foto/i,
  });
  await user.click(acceptBtn);
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

    // 5. Upload + accept one photo  →  submit button becomes enabled
    await uploadAndAcceptPhoto(user);

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
});
