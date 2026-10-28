import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { MAX_CONCURRENT_VIDEO_UPLOADS, MAX_RANGE_CHUNK, parseRange, parseVideoBytes, sniffVideoContainer, videoUploadSlot } from "./video-upload";

const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom", "latin1"), Buffer.alloc(64)]);
const mov = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from("ftypqt  ", "latin1"), Buffer.alloc(64)]);
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f]), Buffer.from("B\x82\x84webm", "latin1"), Buffer.alloc(64)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

describe("detección del tipo real del video", () => {
  it("reconoce MP4/MOV (ISO-BMFF) y WebM por sus primeros bytes", () => {
    expect(sniffVideoContainer(mp4)).toBe("iso-bmff");
    expect(sniffVideoContainer(mov)).toBe("iso-bmff");
    expect(sniffVideoContainer(webm)).toBe("webm");
    expect(sniffVideoContainer(jpeg)).toBeNull();
  });

  it("exige que el Content-Type coincida con los bytes y valida la duración", () => {
    expect(parseVideoBytes("video/mp4", mp4)?.contentType).toBe("video/mp4");
    expect(parseVideoBytes("video/quicktime", mov)?.contentType).toBe("video/quicktime");
    expect(parseVideoBytes("video/webm;codecs=vp9", webm)?.contentType).toBe("video/webm");
    expect(parseVideoBytes("video/mp4", webm)).toBeNull();
    expect(parseVideoBytes("video/webm", mp4)).toBeNull();
    expect(parseVideoBytes("video/mp4", jpeg)).toBeNull();
    expect(parseVideoBytes("image/jpeg", jpeg)).toBeNull();
    expect(parseVideoBytes("video/mp4", mp4, "20000")?.durationMs).toBe(20000);
    expect(parseVideoBytes("video/mp4", mp4, "25000")).toBeNull();
    expect(parseVideoBytes("video/mp4", mp4, "abc")).toBeNull();
  });
});

describe("Range", () => {
  it("interpreta los tramos de Safari y Chrome sin cargar más de un bloque", () => {
    expect(parseRange(undefined, 1000)).toBeNull();
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=100-", 1000)).toEqual({ start: 100, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    const big = 20 * 1024 * 1024;
    expect(parseRange("bytes=0-", big)).toEqual({ start: 0, end: MAX_RANGE_CHUNK - 1 });
    expect(parseRange("bytes=1000-999", 1000)).toBe("invalid");
    expect(parseRange("bytes=5-1", 1000)).toBe("invalid");
    expect(parseRange("items=0-1", 1000)).toBe("invalid");
  });
});

describe("límite de subidas simultáneas", () => {
  it("rechaza con 503 la siguiente mientras hay el máximo en curso, y libera el cupo al terminar", () => {
    const fakeRes = () => {
      const res = Object.assign(new EventEmitter(), {
        statusCode: 200,
        headers: {} as Record<string, string>,
        setHeader(name: string, value: string) { res.headers[name] = value; },
        status(code: number) { res.statusCode = code; return res; },
        json: vi.fn(),
      });
      return res;
    };
    const open = Array.from({ length: MAX_CONCURRENT_VIDEO_UPLOADS }, () => {
      const res = fakeRes();
      const next = vi.fn();
      videoUploadSlot({} as never, res as never, next);
      expect(next).toHaveBeenCalled();
      return res;
    });
    const extra = fakeRes();
    const next = vi.fn();
    videoUploadSlot({} as never, extra as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(extra.statusCode).toBe(503);
    expect(extra.headers["Retry-After"]).toBe("15");

    open[0].emit("finish");
    open[0].emit("close"); // liberar dos veces no cuenta doble
    const again = vi.fn();
    videoUploadSlot({} as never, fakeRes() as never, again);
    expect(again).toHaveBeenCalled();
  });
});
