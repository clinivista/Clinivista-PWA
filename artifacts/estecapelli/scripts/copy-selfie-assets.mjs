// Copia los archivos del segmentador de personas (MediaPipe) a public/vendor/selfie para que la app los sirva ella misma:
// la guía de la cámara funciona sin descargar nada de terceros (modelo de 250 KB + WebAssembly).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = dirname(require.resolve("@mediapipe/selfie_segmentation/package.json"));
const target = join(here, "..", "public", "vendor", "selfie");
mkdirSync(target, { recursive: true });
const wanted = /^selfie_segmentation(?!.*landscape).*\.(js|binarypb|tflite|wasm|data)$/;
let copied = 0;
for (const file of readdirSync(source)) {
  if (!wanted.test(file)) continue;
  cpSync(join(source, file), join(target, file));
  copied += 1;
}
if (!existsSync(join(target, "selfie_segmentation.tflite")) || copied < 6) {
  console.error("No se pudieron copiar los archivos del segmentador (@mediapipe/selfie_segmentation).");
  process.exit(1);
}
console.log(`Segmentador listo: ${copied} archivos en public/vendor/selfie`);

// Malla facial (MediaPipe): solo se usa en las vistas laterales para comprobar hacia dónde gira la cabeza. Se descarga solo al abrir esas vistas.
const meshSource = dirname(require.resolve("@mediapipe/face_mesh/package.json"));
const meshTarget = join(here, "..", "public", "vendor", "facemesh");
mkdirSync(meshTarget, { recursive: true });
let meshCopied = 0;
for (const file of readdirSync(meshSource)) {
  if (!/^face_mesh.*\.(js|binarypb|wasm|data)$/.test(file)) continue;
  cpSync(join(meshSource, file), join(meshTarget, file));
  meshCopied += 1;
}
if (!existsSync(join(meshTarget, "face_mesh.binarypb")) || meshCopied < 8) {
  console.error("No se pudieron copiar los archivos de la malla facial (@mediapipe/face_mesh).");
  process.exit(1);
}
console.log(`Malla facial lista: ${meshCopied} archivos en public/vendor/facemesh`);
