// Giro de la cabeza (MediaPipe Face Mesh, servido por la propia app desde /vendor/facemesh). Solo se carga en las vistas laterales.
// Devuelve cuánto se desvió la punta de la nariz del centro de la cara, en proporción del ancho de la cara, sobre la imagen tal como
// la entrega la cámara (sin espejo): positivo = la nariz se ve hacia la derecha de la imagen = el paciente giró hacia SU izquierda.
// De frente vale ~0; con la cabeza girada ~45° vale ~0,6 (medido con las ilustraciones de referencia, reiniciando la malla en cada cuadro).

type Landmark = { x: number; y: number; z: number };
type MeshResults = { multiFaceLandmarks?: Landmark[][] };
type Mesh = {
  setOptions(options: Record<string, unknown>): void;
  onResults(callback: (results: MeshResults) => void): void;
  initialize(): Promise<void>;
  send(input: { image: CanvasImageSource }): Promise<void>;
  reset?(): void;
};
type Ctor = new (config: { locateFile: (file: string) => string }) => Mesh;

export type FaceTurn = { run(source: CanvasImageSource): Promise<number | null> };

const base = () => `${import.meta.env.BASE_URL ?? "/"}vendor/facemesh/`;
const NOSE_TIP = 1;
const CHEEK_A = 234;
const CHEEK_B = 454;

/** Desvío de la nariz a partir de los puntos de la malla (null si la cara es demasiado angosta para medir). */
export function turnFromLandmarks(landmarks: Landmark[]): number | null {
  const nose = landmarks[NOSE_TIP];
  const a = landmarks[CHEEK_A];
  const b = landmarks[CHEEK_B];
  if (!nose || !a || !b) return null;
  const width = Math.abs(b.x - a.x);
  if (width < 0.02) return null;
  return (nose.x - (a.x + b.x) / 2) / width;
}

let scriptPromise: Promise<Ctor> | null = null;
let lastFailure = "";

function loadScript(): Promise<Ctor> {
  const existing = (window as unknown as { FaceMesh?: Ctor }).FaceMesh;
  if (existing) return Promise.resolve(existing);
  scriptPromise ??= new Promise<Ctor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base()}face_mesh.js`;
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error("tiempo agotado")), 30_000);
    script.onload = () => {
      window.clearTimeout(timer);
      const Mesh = (window as unknown as { FaceMesh?: Ctor }).FaceMesh;
      if (Mesh) resolve(Mesh); else reject(new Error("missing"));
    };
    script.onerror = () => { window.clearTimeout(timer); reject(new Error("no se pudo cargar el script")); };
    document.head.appendChild(script);
  }).catch((error) => { scriptPromise = null; throw error; });
  return scriptPromise;
}

let shared: Promise<FaceTurn | null> | null = null;

/** Devuelve null si el navegador no puede (sin WebGL, sin red para los archivos…). Nunca lanza. Se crea una sola vez. */
export function createFaceTurn(): Promise<FaceTurn | null> {
  shared ??= build().then((value) => { if (!value) shared = null; return value; });
  return shared;
}

async function build(): Promise<FaceTurn | null> {
  try {
    if (typeof document === "undefined") return null;
    const Mesh = await loadScript();
    const engine = new Mesh({ locateFile: (file) => `${base()}${file}` });
    engine.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.3, minTrackingConfidence: 0.3 });
    let latest: MeshResults | null = null;
    engine.onResults((results) => { latest = results; });
    await engine.initialize();
    return {
      async run(source) {
        try {
          latest = null;
          // Sin reiniciar, la malla sigue la cara del cuadro anterior y en giros pronunciados el resultado deriva (medido: 0,33 vs 0,66 para la misma foto).
          engine.reset?.();
          await engine.send({ image: source });
          const face = (latest as MeshResults | null)?.multiFaceLandmarks?.[0];
          return face ? turnFromLandmarks(face) : null;
        } catch {
          return null;
        }
      },
    };
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
    return null;
  }
}

const PROBES: Array<[string, string]> = [["js", "face_mesh.js"], ["pb", "face_mesh.binarypb"], ["wasm", "face_mesh_solution_simd_wasm_bin.wasm"], ["datos", "face_mesh_solution_packed_assets.data"]];

/** Cuando la malla no carga: estado HTTP de sus archivos (para ver si el sitio los publicó). Nunca lanza. */
export async function faceTurnProblem(): Promise<string> {
  const parts: string[] = [];
  for (const [label, file] of PROBES) {
    try {
      const response = await fetch(`${base()}${file}`, { method: "HEAD", cache: "no-store" });
      const type = response.headers.get("content-type") ?? "";
      parts.push(`${label} ${response.status}${response.ok && type.includes("text/html") ? " (página)" : ""}`);
    } catch {
      parts.push(`${label} sin red`);
    }
  }
  return `${lastFailure ? `${lastFailure.slice(0, 60)} · ` : ""}${parts.join(" · ")}`;
}
