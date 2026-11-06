import { useState } from "react";
import { CameraModal } from "@/components/camera-modal";
import { clinicAspectFor, clinicGuideFor, readGuidePref, writeGuidePref } from "@/lib/clinic-camera";

/** Cámara de Clinivista para el personal: la misma de los pacientes, con óvalo y voz que se pueden apagar. */
export function ClinicCamera({ viewKey, title, onCapture, onClose, onError }: {
  viewKey: string;
  title: string;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onError?: (message: string) => void;
}) {
  const guide = clinicGuideFor(viewKey);
  const [wanted, setWanted] = useState(readGuidePref);
  const guided = guide !== null && wanted;
  return (
    <CameraModal
      // Al activar o desactivar la guía la cámara se reinicia con la configuración que corresponde.
      key={guided ? "guided" : "free"}
      title={title}
      aspectRatio={guide?.aspectRatio ?? clinicAspectFor(viewKey)}
      guided={guided}
      guideKind={guide?.guideKind}
      guideImage={guide?.guideImage}
      guideAnimation={guide?.guideAnimation}
      facing="environment"
      guideToggle={guide ? { on: guided, onChange: () => { writeGuidePref(!wanted); setWanted(!wanted); } } : undefined}
      onCapture={onCapture}
      onClose={onClose}
      onError={onError}
    />
  );
}
