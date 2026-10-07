import type { ReactNode } from "react";
import type { AppTranslations } from "./language";

export type PhotoOrientation = "portrait" | "landscape" | "top-down" | "posterior";

export type PhotoProtocolView = {
  key: string;
  title: string;
  description: string;
  tip: string;
  color: string;
  required: boolean;
  orientation: PhotoOrientation;
  aspectRatio: string;
  minimumWidth: number;
  minimumHeight: number;
  light: string;
  distance: string;
  background: string;
  referenceVisual: ReactNode;
};

const defaults = {
  light: "Luz frontal y uniforme.",
  distance: "A un brazo de distancia.",
  topDistance: "Pide ayuda y mantén el teléfono a 60–90 cm.",
  background: "Fondo liso y despejado.",
};

function Reference({ kind }: { kind: "front" | "top" | "right" | "left" | "back" }) {
  const arrow = kind === "right" ? "M9 32h12" : kind === "left" ? "M55 32H43" : "";
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <ellipse cx="32" cy="31" rx="16" ry="20" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5" />
      <ellipse cx="32" cy={kind === "top" ? "28" : "22"} rx="16" ry={kind === "top" ? "14" : "13"} fill="#4a3728" />
      {kind === "top" && <circle cx="32" cy="29" r="6" fill="#6b4f3a" opacity="0.55" />}
      {(kind === "right" || kind === "left" || kind === "back") && <path d="M16 41Q32 51 48 41" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" />}
      {arrow && <path d={arrow} stroke="#4a90d9" strokeWidth="3" strokeLinecap="round" />}
      <rect x="25" y="2" width="14" height="9" rx="2" fill="#4a90d9" />
      <path d="M32 11v8" stroke="#4a90d9" strokeWidth="2" strokeLinecap="round" />
      <polygon points="28,18 32,24 36,18" fill="#4a90d9" />
    </svg>
  );
}

/** The wizard consumes this typed protocol rather than hard-coded photo cards. */
export function getCapillaryPhotoProtocol(t: AppTranslations): PhotoProtocolView[] {
  const common = {
    required: true,
    light: t.photoLightEven ?? defaults.light,
    background: t.photoBackgroundPlain ?? defaults.background,
  };
  return [
    { ...common, key: "frontal", title: t.photoFrontalTitle, description: t.photoFrontalDesc, tip: t.photoFrontalTip, color: "#00A9A5", orientation: "portrait", aspectRatio: "3:4", minimumWidth: 1200, minimumHeight: 1600, distance: t.photoDistanceFace ?? defaults.distance, referenceVisual: <Reference kind="front" /> },
    { ...common, key: "vertex", title: t.photoVertexTitle, description: t.photoVertexDesc, tip: t.photoVertexTip, color: "#4F9CF9", orientation: "top-down", aspectRatio: "4:3", minimumWidth: 1600, minimumHeight: 1200, distance: t.photoDistanceTop ?? defaults.topDistance, referenceVisual: <Reference kind="top" /> },
    { ...common, key: "temporalRight", title: t.photoTRTitle, description: t.photoTRDesc, tip: t.photoTRTip, color: "#A78BFA", orientation: "portrait", aspectRatio: "4:3", minimumWidth: 1600, minimumHeight: 1200, distance: t.photoDistanceFace ?? defaults.distance, referenceVisual: <Reference kind="right" /> },
    { ...common, key: "temporalLeft", title: t.photoTLTitle, description: t.photoTLDesc, tip: t.photoTLTip, color: "#F59E0B", orientation: "portrait", aspectRatio: "4:3", minimumWidth: 1600, minimumHeight: 1200, distance: t.photoDistanceFace ?? defaults.distance, referenceVisual: <Reference kind="left" /> },
    { ...common, key: "donor", title: t.photoDonorTitle, description: t.photoDonorDesc, tip: t.photoDonorTip, color: "#10B981", orientation: "posterior", aspectRatio: "4:3", minimumWidth: 1600, minimumHeight: 1200, distance: t.photoDistanceBack ?? defaults.distance, referenceVisual: <Reference kind="back" /> },
  ];
}

const CUSTOM_COLORS = ["#00A9A5", "#4F9CF9", "#A78BFA", "#F59E0B", "#10B981", "#EC4899"];

/** Spanish labels of the starting views; a clinic that renamed one sees its own name. */
const STARTING_LABELS: Record<string, string> = {
  frontal: "Vista frontal",
  vertex: "Vista superior / vértex",
  temporalRight: "Temporal derecha",
  temporalLeft: "Temporal izquierda",
  donor: "Zona donante",
};

function GenericReference() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <rect x="10" y="18" width="44" height="32" rx="6" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="9" fill="#fff" stroke="#a87c5a" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="4" fill="#4a90d9" />
      <rect x="22" y="12" width="12" height="7" rx="2" fill="#4a90d9" />
    </svg>
  );
}

export type ConfiguredPhotoView = { key: string; label: string; required: boolean };

/**
 * The patient's photo list as the clinic configured it. Starting views keep
 * their translated guidance (unless the clinic renamed them); photos the
 * clinic added get neutral, clearly worded guidance.
 */
export function getConfiguredPhotoProtocol(t: AppTranslations, views: ConfiguredPhotoView[] | undefined): PhotoProtocolView[] {
  const base = getCapillaryPhotoProtocol(t);
  if (!views || views.length === 0) return base;
  return views.map((view, index) => {
    const known = base.find((item) => item.key === view.key);
    if (known) {
      const renamed = view.label !== STARTING_LABELS[view.key];
      return { ...known, title: renamed ? view.label : known.title, required: view.required };
    }
    return {
      key: view.key,
      title: view.label,
      description: t.photoCustomDesc ?? "Toma la fotografía con buena luz y la zona completa visible.",
      tip: t.photoCustomTip ?? "Evita sombras y mantén el teléfono firme para que la imagen salga enfocada.",
      color: CUSTOM_COLORS[index % CUSTOM_COLORS.length],
      required: view.required,
      orientation: "landscape",
      aspectRatio: "4:3",
      minimumWidth: 1200,
      minimumHeight: 900,
      light: t.photoLightEven ?? defaults.light,
      distance: defaults.distance,
      background: t.photoBackgroundPlain ?? defaults.background,
      referenceVisual: <GenericReference />,
    };
  });
}
