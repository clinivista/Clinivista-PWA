import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import express, { Router } from "express";
import pino from "pino";
import request from "supertest";
import { createHttpLogger, redactRequestUrl } from "./http-logger";

// Fixture token only — shaped like a real one (uid(24)), not a real credential.
const TOKEN = "Zq3fK9pLm2Xv7RtY8wBn4Hs1";

describe("redactRequestUrl", () => {
  it("masks the patient token segment and keeps the rest of the path", () => {
    expect(redactRequestUrl(`/api/patients/${TOKEN}`)).toBe("/api/patients/[token]");
    expect(redactRequestUrl(`/api/patients/${TOKEN}/photos`)).toBe("/api/patients/[token]/photos");
    expect(redactRequestUrl(`/api/patients/${TOKEN}/photos/photo-1/confirm`))
      .toBe("/api/patients/[token]/photos/photo-1/confirm");
  });

  it("drops query strings, which legacy links used to carry the token", () => {
    expect(redactRequestUrl(`/patient?token=${TOKEN}`)).toBe("/patient");
    expect(redactRequestUrl(`/api/patients/${TOKEN}?x=1`)).toBe("/api/patients/[token]");
  });

  it("leaves URLs without a patient token untouched", () => {
    expect(redactRequestUrl("/api/patients")).toBe("/api/patients");
    expect(redactRequestUrl("/api/leads/lead-123")).toBe("/api/leads/lead-123");
    expect(redactRequestUrl("/api/director/centers/default-center/export"))
      .toBe("/api/director/centers/default-center/export");
    expect(redactRequestUrl(undefined)).toBeUndefined();
  });
});

describe("createHttpLogger", () => {
  function appWithCapturedLogs() {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, done) {
        lines.push(...String(chunk).split("\n").filter(Boolean));
        done();
      },
    });
    const app = express();
    app.use(createHttpLogger(pino({ level: "info" }, sink)));
    // Mounted under /api like the real app, so this also covers express
    // rewriting req.url inside the router.
    const api = Router();
    api.get("/patients/:token", (_req, res) => { res.json({ ok: true }); });
    api.post("/patients/:token/photos", (_req, res) => { res.status(400).json({ error: "bad photo" }); });
    app.use("/api", api);
    return { app, lines };
  }

  it("never writes a patient token to the request logs", async () => {
    const { app, lines } = appWithCapturedLogs();

    await request(app).get(`/api/patients/${TOKEN}`).expect(200);
    await request(app).post(`/api/patients/${TOKEN}/photos`).send("x").expect(400);

    const completed = lines.map((line) => JSON.parse(line)).filter((entry) => entry.req && entry.res);
    expect(completed).toHaveLength(2);
    expect(completed.map((entry) => entry.req.url)).toEqual([
      "/api/patients/[token]",
      "/api/patients/[token]/photos",
    ]);
    // Status codes stay visible, which is what makes these logs useful.
    expect(completed.map((entry) => entry.res.statusCode)).toEqual([200, 400]);
    expect(lines.join("\n")).not.toContain(TOKEN);
  });
});
