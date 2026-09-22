import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { AwsClient } from "aws4fetch";

export type StoredPhotoObject = {
  objectPath: string;
  contentType: string;
};

export interface PrivatePhotoStorage {
  readonly mode: "s3-private-bucket" | "local-development-only";
  put(input: { key: string; bytes: Buffer; contentType: string }): Promise<StoredPhotoObject>;
  read(objectPath: string): Promise<{ bytes: Buffer; contentType: string }>;
  remove(objectPath: string): Promise<void>;
}

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

const SIGNED_URL_TTL_SECONDS = 5 * 60;

// S3-compatible private bucket (Cloudflare R2 in production). All four are required together.
const S3_ENV_VARS = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export type S3Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export function readS3Config(): S3Config | undefined {
  const configured = S3_ENV_VARS.filter((name) => process.env[name]);
  if (configured.length === 0) return undefined;
  if (configured.length < S3_ENV_VARS.length) {
    const missing = S3_ENV_VARS.filter((name) => !process.env[name]);
    throw new Error(`Clinical photo storage is partially configured; missing ${missing.join(", ")}.`);
  }
  const endpoint = new URL(process.env.S3_ENDPOINT!);
  if (endpoint.protocol !== "https:") {
    throw new Error("S3_ENDPOINT must be an https:// URL.");
  }
  return {
    endpoint: endpoint.origin,
    bucket: process.env.S3_BUCKET!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    // R2 uses "auto"; set S3_REGION for other S3-compatible providers.
    region: process.env.S3_REGION || "auto",
  };
}

export class S3PhotoStorage implements PrivatePhotoStorage {
  readonly mode = "s3-private-bucket" as const;
  private readonly client: AwsClient;

  constructor(private readonly config: S3Config) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: config.region,
    });
  }

  // Short-lived presigned URL, used only server-side: the browser never sees bucket URLs.
  private async signedUrl(objectPath: string, method: "GET" | "PUT" | "DELETE"): Promise<string> {
    const objectKey = assertObjectPath(objectPath).replace("/objects/", "");
    const url = new URL(`${this.config.endpoint}/${this.config.bucket}/${objectKey}`);
    url.searchParams.set("X-Amz-Expires", String(SIGNED_URL_TTL_SECONDS));
    const signed = await this.client.sign(url.toString(), { method, aws: { signQuery: true } });
    return signed.url;
  }

  async put(input: { key: string; bytes: Buffer; contentType: string }): Promise<StoredPhotoObject> {
    const objectPath = `/objects/clinical/${input.key}`;
    const response = await fetch(await this.signedUrl(objectPath, "PUT"), {
      method: "PUT",
      headers: { "Content-Type": input.contentType, "Cache-Control": "private, no-store" },
      body: input.bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Unable to store private photo (${response.status}).`);
    return { objectPath, contentType: input.contentType };
  }

  async read(objectPath: string): Promise<{ bytes: Buffer; contentType: string }> {
    const response = await fetch(await this.signedUrl(objectPath, "GET"), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Private photo was unavailable (${response.status}).`);
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
    };
  }

  async remove(objectPath: string): Promise<void> {
    const response = await fetch(await this.signedUrl(objectPath, "DELETE"), {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Unable to remove private photo (${response.status}).`);
    }
  }
}

function createPrivatePhotoStorage(): PrivatePhotoStorage {
  const s3Config = process.env.NODE_ENV === "test" ? undefined : readS3Config();
  if (s3Config) {
    return new S3PhotoStorage(s3Config);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Clinical photos require a private bucket in production: set ${S3_ENV_VARS.join(", ")}.`);
  }
  return new LocalDevelopmentPhotoStorage();
}

export const privatePhotoStorage = createPrivatePhotoStorage();

export function createObjectKey(kind: "original" | "adjusted" | "legacy-quarantine"): string {
  return `${crypto.randomUUID()}/${kind}`;
}