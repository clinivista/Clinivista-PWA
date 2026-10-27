import { useState } from "react";
import { CheckCircle2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video-player";
import { VideoRecorder } from "@/components/video-recorder";
import { useLanguage } from "@/lib/language";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import { MAX_VIDEO_SECONDS, uploadVideo, type RecordedVideo } from "@/lib/video-capture";

export type SavedPatientVideo = { id: string; mimeType: string; durationMs: number | null };

/**
 * Vista de la pre-evaluación que la clínica pidió en video: el paciente graba
 * (o sube) un video corto, lo revisa y lo confirma; cuenta como una foto tomada.
 */
export function PatientVideoCard({ viewKey, title, photoOfLabel, token, saved, onSaved }: {
  viewKey: string;
  title: string;
  photoOfLabel: string;
  token: string | null;
  saved: SavedPatientVideo | null;
  onSaved: (key: string, video: SavedPatientVideo) => void;
}) {
  const { lang } = useLanguage();
  const v = VIDEO_TEXT[lang];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (video: RecordedVideo) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const base = `/api/patients/${encodeURIComponent(token)}`;
      const uploaded = await uploadVideo(`${base}/videos`, video, { "x-photo-key": viewKey });
      if (!uploaded.ok) throw new Error(uploaded.error ?? v.saveFailed);
      const draft = uploaded.body as { id: string };
      const confirmed = await fetch(`${base}/photos/${encodeURIComponent(draft.id)}/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!confirmed.ok) throw new Error(v.saveFailed);
      onSaved(viewKey, { id: draft.id, mimeType: video.type, durationMs: video.durationMs });
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : v.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-[#E8E4DE] overflow-hidden" data-testid={`patient-video-${viewKey}`}>
      <div className="p-6 flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{photoOfLabel}</p>
        <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2"><Video className="w-5 h-5 text-primary" aria-hidden="true" />{title}</h3>
        <p className="text-sm text-muted-foreground">{v.patientIntro(MAX_VIDEO_SECONDS)}</p>
        {saved && token && (
          <>
            <VideoPlayer src={`/api/patients/${encodeURIComponent(token)}/videos/${encodeURIComponent(saved.id)}`} label={title} durationMs={saved.durationMs} className="aspect-video rounded-2xl overflow-hidden" />
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="w-4 h-4" aria-hidden="true" />{v.patientSaved}</p>
          </>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="button" className="h-12 rounded-full font-bold gap-2" variant={saved ? "outline" : "default"} disabled={!token || busy} onClick={() => setOpen(true)} data-testid={`patient-video-record-${viewKey}`}>
          <Video className="w-4 h-4" />{saved ? v.recordAgain : v.record}
        </Button>
      </div>
      {open && <VideoRecorder title={v.recorderTitle(title)} busy={busy} onClose={() => setOpen(false)} onUse={(video) => void save(video)} />}
    </div>
  );
}
