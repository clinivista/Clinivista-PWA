// Segmentador de personas (MediaPipe, ~250 KB de modelo + WebAssembly). Los archivos los sirve la propia app desde
// /vendor/selfie (se copian al construir), así que no se descarga nada de terceros. Se carga solo cuando se abre la cámara.

type LegacyResults = { segmentationMask: CanvasImageSource & { width: number; height: number } };
type LegacySegmenter = {
  setOptions(options: { modelSelection: number; selfieMode?: boolean }): void;
  onResults(callback: (results: LegacyResults) => void): void;
  initialize(): Promise<void>;
  send(input: { image: CanvasImageSource }): Promise<void>;
  close(): Promise<void>;
};
type Ctor = new (config: { locateFile: (file: string) => string }) => LegacySegmenter;

export type Mask = { data: Uint8Array; width: number; height: number };
export type Segmenter = { run(source: CanvasImageSource, width: number, height: number): Promise<Mask | null>; close(): void };

const base = () => `${import.meta.env.BASE_URL ?? "/"}vendor/selfie/`;
let scriptPromise: Promise<Ctor> | null = null;

function loadScript(): Promise<Ctor> {
  const existing = (window as unknown as { SelfieSegmentation?: Ctor }).SelfieSegmentation;
  if (existing) return Promise.resolve(existing);
  scriptPromise ??= new Promise<Ctor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base()}selfie_segmentation.js`;
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error("timeout")), 20_000);
    script.onload = () => {
      window.clearTimeout(timer);
      const Segmentation = (window as unknown as { SelfieSegmentation?: Ctor }).SelfieSegmentation;
      if (Segmentation) resolve(Segmentation); else reject(new Error("missing"));
    };
    script.onerror = () => { window.clearTimeout(timer); reject(new Error("load")); };
    document.head.appendChild(script);
  }).catch((error) => { scriptPromise = null; throw error; });
  return scriptPromise;
}

/** Devuelve null si el navegador no puede (sin WebGL, sin red para los archivos, etc.). Nunca lanza. */
export async function createSegmenter(): Promise<Segmenter | null> {
  try {
    if (typeof document === "undefined") return null;
    const Segmentation = await loadScript();
    const engine = new Segmentation({ locateFile: (file) => `${base()}${file}` });
    engine.setOptions({ modelSelection: 0, selfieMode: false });
    let latest: LegacyResults | null = null;
    engine.onResults((results) => { latest = results; });
    await engine.initialize();
    const reader = document.createElement("canvas");
    const readerContext = reader.getContext("2d", { willReadFrequently: true });
    if (!readerContext) return null;
    return {
      async run(source, width, height) {
        try {
          latest = null;
          await engine.send({ image: source });
          const results = latest as LegacyResults | null;
          if (!results) return null;
          reader.width = width;
          reader.height = height;
          readerContext.clearRect(0, 0, width, height);
          readerContext.drawImage(results.segmentationMask, 0, 0, width, height);
          const pixels = readerContext.getImageData(0, 0, width, height).data;
          const data = new Uint8Array(width * height);
          // La máscara viene en el canal rojo: 0 = fondo, 255 = persona.
          for (let i = 0; i < data.length; i += 1) data[i] = pixels[i * 4];
          return { data, width, height };
        } catch {
          return null;
        }
      },
      close() { void engine.close().catch(() => undefined); },
    };
  } catch {
    return null;
  }
}
