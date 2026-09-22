import { describe, it, expect, afterEach, vi } from "vitest";
import { readS3Config, S3PhotoStorage, type S3Config } from "./clinical-photo-storage";

const config: S3Config = {
  endpoint: "https://account123.r2.cloudflarestorage.com",
  bucket: "clinical-photos",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  region: "auto",
};

const S3_VARS = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION"];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("S3PhotoStorage", () => {
  it("uploads through a short-lived presigned path-style URL without leaking the secret", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    const storage = new S3PhotoStorage(config);

    const stored = await storage.put({ key: "abc/original", bytes: Buffer.from("jpeg"), contentType: "image/jpeg" });

    expect(stored).toEqual({ objectPath: "/objects/clinical/abc/original", contentType: "image/jpeg" });
    const [rawUrl, init] = fetchMock.mock.calls[0];
    const url = new URL(rawUrl);
    expect(url.origin + url.pathname).toBe("https://account123.r2.cloudflarestorage.com/clinical-photos/clinical/abc/original");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Credential")).toMatch(/^test-access-key\/\d{8}\/auto\/s3\/aws4_request$/);
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(rawUrl).not.toContain("test-secret-key");
    expect(init?.method).toBe("PUT");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("image/jpeg");
  });

  it("reads bytes and content type back from the bucket", async () => {
    mockFetch(new Response(Buffer.from("png-bytes"), { status: 200, headers: { "Content-Type": "image/png; charset=binary" } }));
    const storage = new S3PhotoStorage(config);

    const file = await storage.read("/objects/clinical/abc/original");

    expect(file.bytes.toString()).toBe("png-bytes");
    expect(file.contentType).toBe("image/png");
  });

  it("treats a missing object as already removed but surfaces other failures", async () => {
    const storage = new S3PhotoStorage(config);
    mockFetch(new Response(null, { status: 404 }));
    await expect(storage.remove("/objects/clinical/abc/original")).resolves.toBeUndefined();

    mockFetch(new Response(null, { status: 403 }));
    await expect(storage.read("/objects/clinical/abc/original")).rejects.toThrow("(403)");
  });

  it("refuses object paths outside the clinical prefix before signing anything", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    const storage = new S3PhotoStorage(config);

    await expect(storage.read("/objects/clinical/../secrets")).rejects.toThrow("Invalid private clinical photo path.");
    await expect(storage.read("/other/abc")).rejects.toThrow("Invalid private clinical photo path.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("readS3Config", () => {
  function setEnv(values: Record<string, string>) {
    for (const name of S3_VARS) vi.stubEnv(name, values[name] ?? "");
  }

  it("is disabled when no S3 variables are set", () => {
    setEnv({});
    expect(readS3Config()).toBeUndefined();
  });

  it("names the missing variables when only some are set", () => {
    setEnv({ S3_ENDPOINT: "https://account123.r2.cloudflarestorage.com", S3_BUCKET: "clinical-photos" });
    expect(() => readS3Config()).toThrow("missing S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
  });

  it("requires an https endpoint and defaults the region to auto", () => {
    const complete = {
      S3_ENDPOINT: "https://account123.r2.cloudflarestorage.com/",
      S3_BUCKET: "clinical-photos",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    };
    setEnv(complete);
    expect(readS3Config()).toEqual({ ...config, accessKeyId: "id", secretAccessKey: "secret" });

    setEnv({ ...complete, S3_ENDPOINT: "http://account123.r2.cloudflarestorage.com" });
    expect(() => readS3Config()).toThrow("S3_ENDPOINT must be an https:// URL.");
  });
});
