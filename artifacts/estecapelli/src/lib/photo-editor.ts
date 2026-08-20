export type TechnicalPhotoParams = {
  version: 1;
  crop: { x: number; y: number; width: number; height: number; aspectRatio?: number };
  rotation: number;
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  saturation: number;
  clarity: number;
  sharpness: number;
  noiseReduction: number;
};

export const TECHNICAL_LIMITS = {
  rotation: [-5, 5],
  exposure: [-0.35, 0.35],
  brightness: [-12, 12],
  contrast: [-15, 15],
  highlights: [-15, 15],
  shadows: [-15, 15],
  temperature: [-10, 10],
  saturation: [-12, 12],
  clarity: [0, 15],
  sharpness: [0, 15],
  noiseReduction: [0, 15],
} as const;

const numericKeys = Object.keys(TECHNICAL_LIMITS) as Array<keyof Omit<TechnicalPhotoParams, "version" | "crop">>;

function clamp(value: unknown, min: number, max: number, fallback = 0): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}

export function createDefaultTechnicalParams(width: number, height: number): TechnicalPhotoParams {
  return {
    version: 1,
    crop: { x: 0, y: 0, width, height, aspectRatio: width / height },
    rotation: 0, exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0,
    temperature: 0, saturation: 0, clarity: 0, sharpness: 0, noiseReduction: 0,
  };
}

export function normalizeTechnicalParams(value: unknown, width: number, height: number): TechnicalPhotoParams {
  const fallback = createDefaultTechnicalParams(width, height);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  const rawCrop = raw.crop && typeof raw.crop === "object" && !Array.isArray(raw.crop)
    ? raw.crop as Record<string, unknown>
    : fallback.crop;
  const cropWidth = Math.round(clamp(rawCrop.width, 1, width, width));
  const cropHeight = Math.round(clamp(rawCrop.height, 1, height, height));
  const cropX = Math.round(clamp(rawCrop.x, 0, width - cropWidth, 0));
  const cropY = Math.round(clamp(rawCrop.y, 0, height - cropHeight, 0));
  const params: TechnicalPhotoParams = {
    ...fallback,
    crop: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      aspectRatio: clamp(rawCrop.aspectRatio, 0.5, 2, cropWidth / cropHeight),
    },
  };
  for (const key of numericKeys) {
    const [min, max] = TECHNICAL_LIMITS[key];
    params[key] = clamp(raw[key], min, max);
  }
  return params;
}

export function cropFromReframe(
  params: TechnicalPhotoParams,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  horizontal: number,
  vertical: number,
  aspectRatio = params.crop.aspectRatio ?? sourceWidth / sourceHeight,
): TechnicalPhotoParams {
  const boundedScale = clamp(scale, 1, 1.25, 1);
  let cropWidth = Math.round(sourceWidth / boundedScale);
  let cropHeight = Math.round(cropWidth / aspectRatio);
  if (cropHeight > sourceHeight / boundedScale) {
    cropHeight = Math.round(sourceHeight / boundedScale);
    cropWidth = Math.round(cropHeight * aspectRatio);
  }
  cropWidth = Math.min(sourceWidth, Math.max(1, cropWidth));
  cropHeight = Math.min(sourceHeight, Math.max(1, cropHeight));
  const maxX = sourceWidth - cropWidth;
  const maxY = sourceHeight - cropHeight;
  return {
    ...params,
    crop: {
      x: Math.round((clamp(horizontal, -100, 100) + 100) / 200 * maxX),
      y: Math.round((clamp(vertical, -100, 100) + 100) / 200 * maxY),
      width: cropWidth,
      height: cropHeight,
      aspectRatio,
    },
  };
}

function applyPixels(context: CanvasRenderingContext2D, width: number, height: number, params: TechnicalPhotoParams) {
  if (params.exposure === 0 && params.brightness === 0 && params.contrast === 0
    && params.highlights === 0 && params.shadows === 0 && params.temperature === 0
    && params.saturation === 0) return;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const exposure = 2 ** params.exposure;
  const brightness = params.brightness * 2.55;
  const contrast = 1 + params.contrast / 100;
  const temperature = params.temperature * 1.5;
  const saturation = 1 + params.saturation / 100;
  for (let index = 0; index < data.length; index += 4) {
    let r = data[index] * exposure + brightness;
    let g = data[index + 1] * exposure + brightness;
    let b = data[index + 2] * exposure + brightness;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const highlightWeight = Math.max(0, (luma - 128) / 127);
    const shadowWeight = Math.max(0, (128 - luma) / 128);
    const highlightAmount = params.highlights / 100 * highlightWeight;
    const shadowAmount = params.shadows / 100 * shadowWeight;
    r += (255 - r) * highlightAmount + r * shadowAmount + temperature;
    g += (255 - g) * highlightAmount + g * shadowAmount;
    b += (255 - b) * highlightAmount + b * shadowAmount - temperature;
    const neutral = 0.299 * r + 0.587 * g + 0.114 * b;
    data[index] = Math.max(0, Math.min(255, neutral + (r - neutral) * saturation));
    data[index + 1] = Math.max(0, Math.min(255, neutral + (g - neutral) * saturation));
    data[index + 2] = Math.max(0, Math.min(255, neutral + (b - neutral) * saturation));
  }
  context.putImageData(imageData, 0, 0);
}

function applyDetail(context: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0 || width * height > 6_000_000) return;
  const imageData = context.getImageData(0, 0, width, height);
  const source = new Uint8ClampedArray(imageData.data);
  const strength = amount / 100;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const average = (source[index + channel - width * 4] + source[index + channel + width * 4]
          + source[index + channel - 4] + source[index + channel + 4]) / 4;
        imageData.data[index + channel] = Math.max(0, Math.min(255, source[index + channel] + (source[index + channel] - average) * strength));
      }
    }
  }
  context.putImageData(imageData, 0, 0);
}

export function renderTechnicalPhoto(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  params: TechnicalPhotoParams,
  preview = false,
) {
  const crop = params.crop;
  const scale = preview ? Math.min(1, 900 / Math.max(crop.width, crop.height)) : 1;
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas no disponible.");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(params.rotation * Math.PI / 180);
  context.filter = params.noiseReduction ? `blur(${Math.min(1.2, params.noiseReduction / 12)}px)` : "none";
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, -width / 2, -height / 2, width, height);
  context.restore();
  applyPixels(context, width, height, params);
  applyDetail(context, width, height, params.clarity + params.sharpness);
}

export async function exportTechnicalPhoto(image: HTMLImageElement, params: TechnicalPhotoParams) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const canvas = document.createElement("canvas");
  renderTechnicalPhoto(image, canvas, params);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo crear la versión ajustada.")), "image/jpeg", 0.92);
  });
  return { blob, width: canvas.width, height: canvas.height };
}