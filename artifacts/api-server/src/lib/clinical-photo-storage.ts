import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export type StoredPhotoObject = {
  objectPath: string;
  contentType: string;
};

export interface PrivatePhotoStorage {
  readonly mode: "app-storage" | "local-development-only";
  put(input: { key: string; bytes: Buffer; contentType: string }): Promise<StoredPhotoObject>;
  read(objectPath: string): Promise<{ bytes: Buffer; contentType: string }>;
  remove(objectPath: string): Promise<void>;
}

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const LOCAL_ROOT = process.env.CLINICAL_PHOTO_LOCAL_DIR ?? "/tmp/estecapelli-private-photos";

function assertObjectPath(value: string): string {
  if (!value.startsWith("/objects/clinical/") || value.includes("..")) {
    throw new Error("Invalid private clinical photo path.");
  }
  return value;
}

class LocalDevelopmentPhotoStorage implements PrivatePhotoStorage {
  readonly mode = "local-development-only" as const;

  private toFile(objectPath: string): string {
    const normalized = assertObjectPath(objectPath).replace("/objects/", "");
    return path.join(LOCAL_ROOT, normalized);
  }

  async put(input: { key: string; bytes: Buffer; contentType: string }): Promise<StoredPhotoObject> {
    const objectPath = `/objects/clinical/${input.key}`;
    const file = this.toFile(objectPath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, input.bytes, { mode: 0o600 });
    await fs.writeFile(`${file}.json`, JSON.stringify({ contentType: input.contentType }), { mode: 0o600 });
    return { objectPath, contentType: input.contentType };
  }

  async read(objectPath: string): Promise<{ bytes: Buffer; contentType: string }> {
    const file = this.toFile(objectPath);
    const [bytes, rawMetadata] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.json`, "utf8")]);
    const metadata = JSON.parse(rawMetadata) as { contentType?: string };
    return { bytes, contentType: metadata.contentType ?? "application/octet-stream" };
  }

  async remove(objectPath: string): Promise<void> {
    const file = this.toFile(objectPath);
    await Promise.all([
      fs.rm(file, { force: true }),
      fs.rm(`${file}.json`, { force: true }),
    ]);
  }
}

function parsePrivateDirectory(): { bucketName: string; prefix: string } {
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  const parts = privateDir.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("PRIVATE_OBJECT_DIR is not configured.");
  }
  return { bucketName: parts[0], prefix: parts.slice(1).join("/") };
}

async function signedObjectUrl(
  objectName: string,
  method: "GET" | "PUT" | "DELETE",
): Promise<string> {
  const { bucketName } = parsePrivateDirectory();
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Unable to sign private object request (${response.status}).`);
  }
  const data = await response.json() as { signed_url?: string };
  if (!data.signed_url) throw new Error("Private object signing returned no URL.");
  return data.signed_url;
}

class AppStoragePhotoStorage implements PrivatePhotoStorage {
  readonly mode = "app-storage" as const;

  private objectName(objectPath: string): string {
    const pathPart = assertObjectPath(objectPath).replace("/objects/", "");
    const { prefix } = parsePrivateDirectory();
    return `${prefix}/${pathPart}`;
  }

  async put(input: { key: string; bytes: Buffer; contentType: string }): Promise<StoredPhotoObject> {
    const objectPath = `/objects/clinical/${input.key}`;
    const response = await fetch(await signedObjectUrl(this.objectName(objectPath), "PUT"), {
      method: "PUT",
      headers: { "Content-Type": input.contentType, "Cache-Control": "private, no-store" },
      body: input.bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Unable to store private photo (${response.status}).`);
    return { objectPath, contentType: input.contentType };
  }

  async read(objectPath: string): Promise<{ bytes: Buffer; contentType: string }> {
    const response = await fetch(await signedObjectUrl(this.objectName(objectPath), "GET"), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Private photo was unavailable (${response.status}).`);
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
    };
  }

  async remove(objectPath: string): Promise<void> {
    const response = await fetch(await signedObjectUrl(this.objectName(objectPath), "DELETE"), {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Unable to remove private photo (${response.status}).`);
    }
  }
}

function createPrivatePhotoStorage(): PrivatePhotoStorage {
  if (process.env.NODE_ENV !== "test" && process.env.PRIVATE_OBJECT_DIR) {
    return new AppStoragePhotoStorage();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Clinical photos require PRIVATE_OBJECT_DIR in production.");
  }
  return new LocalDevelopmentPhotoStorage();
}

export const privatePhotoStorage = createPrivatePhotoStorage();

export function createObjectKey(kind: "original" | "adjusted" | "legacy-quarantine"): string {
  return `${crypto.randomUUID()}/${kind}`;
}