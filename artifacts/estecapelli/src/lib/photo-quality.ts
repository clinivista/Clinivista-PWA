export type TechnicalPhotoReview = {
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  orientation: "portrait" | "landscape" | "square";
  aspectRatio: number;
  brightness: number | null;
  contrast: number | null;
  sharpness: number | null;
  warnings: string[];
  warningCodes: string[];
};

type QualityRequirements = {
  minimumWidth: number;
  minimumHeight: number;
  aspectRatio: string;
};

function aspectTarget(value: string): number {
  const [w, h] = value.split(":").map(Number);
  return w > 0 && h > 0 ? w / h : 1;
}

function orientationFor(width: number, height: number): TechnicalPhotoReview["orientation"] {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function imageFromFile(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, release: () => URL.revokeObjectURL(url) });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    image.src = url;
  });
}

/**
 * Deliberately conservative, non-clinical signals. The image is sampled in a
 * small local canvas and never sent anywhere as part of this analysis.
 */
export async function reviewPhotoTechnicalQuality(file: File, requirements: QualityRequirements): Promise<TechnicalPhotoReview> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Formato no compatible");
  }
  const decoded = await imageFromFile(file);
  const { width, height } = decoded;
  const warnings: string[] = [];
  const warningCodes: string[] = [];
  const warn = (code: string, message: string) => { warningCodes.push(code); warnings.push(message); };
  const target = aspectTarget(requirements.aspectRatio);
  const actual = width / height;
  if (width < requirements.minimumWidth || height < requirements.minimumHeight) warn("low_resolution", "La resolución está por debajo de la recomendada.");
  if (Math.abs(actual - target) / target > 0.2) warn("aspect_ratio", "La proporción no coincide con la guía de esta vista.");
  const expectedOrientation = target > 1 ? "landscape" : target < 1 ? "portrait" : "square";
  if (orientationFor(width, height) !== expectedOrientation) {
    warn("orientation", `Revisa la orientación: esta vista suele funcionar mejor en ${expectedOrientation === "landscape" ? "horizontal" : expectedOrientation === "portrait" ? "vertical" : "cuadrado"}.`);
  }

  let brightness: number | null = null;
  let contrast: number | null = null;
  let sharpness: number | null = null;
  try {
    const canvas = document.createElement("canvas");
    const sampleWidth = 96;
    canvas.width = sampleWidth;
    canvas.height = Math.max(1, Math.round(sampleWidth * height / width));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const values: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) values.push((pixels[i] * 0.299) + (pixels[i + 1] * 0.587) + (pixels[i + 2] * 0.114));
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      brightness = Math.round(mean);
      contrast = Math.round(Math.sqrt(variance));
      let edgeSum = 0;
      for (let y = 1; y < canvas.height; y += 1) {
        for (let x = 1; x < canvas.width; x += 1) {
          const at = y * canvas.width + x;
          edgeSum += Math.abs(values[at] - values[at - 1]) + Math.abs(values[at] - values[at - canvas.width]);
        }
      }
      sharpness = Math.round(edgeSum / Math.max(1, (canvas.width - 1) * (canvas.height - 1)));
      if (mean < 35 || mean > 225) warn("exposure", "La exposición parece muy oscura o muy clara.");
      if (Math.sqrt(variance) < 18) warn("low_contrast", "El contraste es bajo; busca una luz uniforme sin sombras fuertes.");
      if (sharpness < 5) warn("low_sharpness", "La nitidez parece baja; apoya el dispositivo y vuelve a enfocar.");
    }
  } catch {
    // Decoding dimensions is still useful on browsers that disallow canvas
    // reads (or in constrained webviews). The image can remain usable.
  } finally {
    decoded.release();
  }
  return {
    width, height, sizeBytes: file.size, mimeType: file.type,
    orientation: orientationFor(width, height), aspectRatio: Number(actual.toFixed(3)),
    brightness, contrast, sharpness, warnings, warningCodes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}