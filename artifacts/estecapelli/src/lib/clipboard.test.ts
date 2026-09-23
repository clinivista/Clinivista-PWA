import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPatientLink, buildPublicPatientLink, copyToClipboard } from "./clipboard";

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value });
}

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
}

afterEach(() => {
  vi.restoreAllMocks();
  setClipboard(undefined);
  setSecureContext(false);
});

describe("buildPatientLink", () => {
  it("uses the admin panel's own origin and encodes the token", () => {
    expect(buildPatientLink("abc 123")).toBe(`${window.location.origin}/patient?token=abc%20123`);
  });
});

describe("copyToClipboard", () => {
  it("uses the async Clipboard API in a secure context", async () => {
    setSecureContext(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;

    await expect(copyToClipboard("https://example.test/patient?token=t")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.test/patient?token=t");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to execCommand when the Clipboard API is unavailable (plain HTTP)", async () => {
    setSecureContext(false);
    let copiedValue = "";
    document.execCommand = vi.fn(() => {
      copiedValue = document.querySelector("textarea")?.value ?? "";
      return true;
    });

    await expect(copyToClipboard("http://192.168.0.10/patient?token=t")).resolves.toBe(true);
    expect(copiedValue).toBe("http://192.168.0.10/patient?token=t");
    expect(document.querySelector("textarea")).toBeNull(); // helper cleans up after itself
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    setSecureContext(true);
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    document.execCommand = vi.fn(() => true);

    await expect(copyToClipboard("link")).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when neither method can copy", async () => {
    setSecureContext(false);
    document.execCommand = vi.fn(() => false);

    await expect(copyToClipboard("link")).resolves.toBe(false);
  });
});

describe("buildPublicPatientLink", () => {
  it("is the token-less self-registration URL on the admin panel's origin", () => {
    expect(buildPublicPatientLink()).toBe(`${window.location.origin}/patient`);
  });
});
