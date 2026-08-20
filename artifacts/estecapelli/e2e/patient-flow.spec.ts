/**
 * Browser-level E2E tests for the patient form flow.
 *
 * Runs in real Chromium via Playwright. A Vite dev server is started by
 * playwright.config.ts. The API layer is intercepted with page.route() so
 * tests are deterministic without needing a live database — but the full
 * browser image pipeline (FileReader, canvas, JPEG compression) runs for real.
 *
 * Covered scenarios:
 *   A. Happy path — fill Antecedentes (phone WITHOUT +56), upload a real photo
 *      file, submit → success screen with the "24 horas hábiles" message.
 *   B. Duplicate — same form + submit → API returns 409 → duplicate warning card.
 */
import { test, expect, Page, Route } from "@playwright/test";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Intercept POST /api/patients with a controlled response. */
async function mockPostPatients(
  page: Page,
  body: object,
  status: number,
): Promise<void> {
  await page.route("**/api/patients", (route: Route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } else {
      route.continue();
    }
  });
}

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

/**
 * Navigate from intro to the Antecedentes (data) step.
 */
async function goToDataStep(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Comenzar Evaluación/i }).click();
  await expect(page.getByPlaceholder("María García")).toBeVisible();
}

/**
 * Fill all required Antecedentes fields.
 * Phone is typed WITHOUT the +56 prefix — the UI prepends it automatically.
 */
async function fillForm(page: Page): Promise<void> {
  await page.getByPlaceholder("María García").fill("Juan Prueba");
  await page.getByPlaceholder("12.345.678-5").fill("12.345.678-5");
  // Tab away so RUT validation fires and formats the value
  await page.keyboard.press("Tab");

  // Phone: type digits only — the UI stores "+56 912345678"
  await page.getByPlaceholder("9 1234 5678").fill("912345678");
  await page.getByPlaceholder("correo@ejemplo.com").fill("juan@example.com");

  // City via Radix Select — dropdown renders in a portal, so the option may
  // be outside the normal viewport scroll area; force the click.
  await page.getByText("Selecciona tu ciudad o comuna").click();
  await page.getByRole("option", { name: "Santiago" }).click({ force: true });
}

/** Tick the mandatory consent checkbox. */
async function tickConsent(page: Page): Promise<void> {
  // First checkbox = mandatory consent; second = marketing (optional)
  const checkboxes = page.getByRole("checkbox");
  await checkboxes.first().click();
}

/**
 * Upload a real PNG file through the file input on the photos step,
 * wait for compression to complete, then accept the pending photo.
 *
 * A minimal 1×1 white PNG is synthesised inline so the test has no external
 * file dependency. The browser's real FileReader and canvas APIs process it.
 */
async function uploadAndAcceptRequiredPhotos(page: Page): Promise<void> {
  // Synthesise a minimal valid PNG (1×1 white pixel, 67 bytes).
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const tmpFile = path.join("/tmp", `pw-test-photo-${Date.now()}.png`);
  fs.writeFileSync(tmpFile, pngBytes);

  // The file input is hidden inside the upload label; setInputFiles bypasses
  // the visibility restriction and fires the change event normally.
  for (let index = 0; index < 5; index += 1) {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tmpFile);
    const acceptBtn = page.getByRole("button", { name: /Usar esta foto/i });
    await expect(acceptBtn).toBeVisible({ timeout: 15_000 });
    await acceptBtn.click();
  }

  // Clean up temp file
  fs.unlinkSync(tmpFile);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Patient form browser flow", () => {
  test("shows the success screen with 24-h message after a successful submission", async ({
    page,
  }) => {
    // Intercept POST /api/patients before navigating.
    await mockPostPatients(page, SUCCESS_BODY, 201);

    await page.goto("/patient");

    // 1. Intro → Antecedentes
    await goToDataStep(page);

    // 2. Fill required fields (phone WITHOUT +56 prefix)
    await fillForm(page);

    // 3. Mandatory consent
    await tickConsent(page);

    // 4. Continue to photos step
    const continueBtn = page.getByRole("button", {
      name: /Continuar a Fotografías/i,
    });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Confirm we reached the photos step
    await expect(
      page.getByRole("button", { name: /Enviar Evaluación/i }),
    ).toBeVisible();

    // 5. Upload + accept the five mandatory views (real browser image pipeline).
    await uploadAndAcceptRequiredPhotos(page);

    // 6. Submit — button is enabled once ≥1 photo accepted
    const submitBtn = page.getByRole("button", { name: /Enviar Evaluación/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 7. Success screen with the 24-h message
    await expect(
      page.getByText("¡Tu evaluación fue recibida!"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/24 horas hábiles/i)).toBeVisible();
  });

  test("shows the duplicate warning card when the API returns 409", async ({
    page,
  }) => {
    // Intercept POST /api/patients with a 409 conflict.
    await mockPostPatients(page, DUPLICATE_BODY, 409);

    await page.goto("/patient");

    // 1–3. Same form flow
    await goToDataStep(page);
    await fillForm(page);
    await tickConsent(page);

    // 4. Continue to photos step
    await page
      .getByRole("button", { name: /Continuar a Fotografías/i })
      .click();
    await expect(
      page.getByRole("button", { name: /Enviar Evaluación/i }),
    ).toBeVisible();

    // 5. Upload one photo
    await uploadAndAcceptRequiredPhotos(page);

    // 6. Submit
    const submitBtn = page.getByRole("button", { name: /Enviar Evaluación/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 7. Duplicate warning card appears
    await expect(
      page.getByText(/Ya existe una evaluación registrada con este teléfono o correo/i),
    ).toBeVisible({ timeout: 10_000 });

    // Success screen must NOT appear
    await expect(
      page.getByText("¡Tu evaluación fue recibida!"),
    ).not.toBeVisible();
  });
});
