import { Users, Camera, LineChart, ClipboardList, Layers, Search, X, ChevronLeft, ChevronRight, Home, Plus, MoreHorizontal } from "lucide-react";
import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import { IMAGES } from "../images";
import type { Copy, LangCode } from "../i18n";
import { Photo, IllustrativeTag } from "./Photo";

/**
 * Laptop + teléfono con la interfaz de Clinivista (construida en HTML, no es una
 * captura). Paciente y fechas son ficticios y van marcados como «Ejemplo».
 * Se diseña a 600×370 px y se escala con --s (ver el contenedor en App).
 */
export function DeviceStage({ t, lang }: { t: Copy; lang: LangCode }) {
  const date = (y: number, m: number, d: number) => new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m, d));
  const before = date(2024, 0, 10), after = date(2024, 2, 12);
  const sectionIcons = [Users, Camera, LineChart, ClipboardList, Layers];
  const faces = IMAGES.faces;

  return (
    <div className="relative h-[370px] w-[600px] text-[#0A1F4D]" dir="ltr">
      {/* Laptop */}
      <div className="absolute left-0 top-0 w-[470px]">
        <div className="rounded-t-[18px] bg-[#1b2433] p-[10px] pb-[12px] shadow-[0_30px_60px_-20px_rgba(10,31,77,0.45)]">
          <div className="h-[290px] overflow-hidden rounded-[8px] bg-white">
            <div className="flex h-[30px] items-center justify-between border-b border-slate-100 px-3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold"><img src={isotipo} alt="" className="h-4 w-4" />Clinivista</span>
              <span className="flex items-center gap-2 text-slate-500"><Search className="h-3 w-3" /><X className="h-3 w-3" /></span>
            </div>
            <div className="flex h-[260px]">
              <ul className="w-[118px] space-y-0.5 border-e border-slate-100 p-2 text-[9px]">
                {t.mock.sections.map((label, i) => {
                  const Icon = sectionIcons[i]!;
                  return (
                    <li key={label} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 ${i === 1 ? "bg-[#EAF2FC] font-semibold text-[#1D5FD8]" : "text-slate-600"}`}>
                      <Icon className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="min-w-0 flex-1 p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[8px] text-slate-500">{t.mock.patient}</p>
                    <p className="text-[11px] font-bold leading-tight">{t.mock.patientName}</p>
                  </div>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-800">{t.example}</span>
                </div>
                <div className="mt-1.5 flex gap-3 border-b border-slate-100 text-[8px]">
                  {t.mock.tabs.map((tab, i) => (
                    <span key={tab} className={`pb-1 ${i === 0 ? "border-b-2 border-[#1D5FD8] font-semibold text-[#0A1F4D]" : "text-slate-500"}`}>{tab}</span>
                  ))}
                </div>
                <div className="relative mt-2 overflow-hidden rounded-md">
                  <Photo img={faces} lang={lang} sizes="320px" className="block aspect-[3/2] w-full object-cover" decorative />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/90" />
                  <span className="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow">
                    <ChevronLeft className="h-2.5 w-2.5" /><ChevronRight className="-ms-1 h-2.5 w-2.5" />
                  </span>
                  <IllustrativeTag label={t.illustrative} className="bottom-1 left-1 !text-[7px]" />
                </div>
                <div className="mt-1 grid grid-cols-2 text-[8px]">
                  <p><span className="font-bold">{t.mock.before}</span><br /><span className="text-slate-500">{before}</span></p>
                  <p><span className="font-bold">{t.mock.after}</span><br /><span className="text-slate-500">{after}</span></p>
                </div>
                <p className="mx-auto mt-1 w-fit rounded-full border border-slate-200 px-2.5 py-0.5 text-[8px] font-semibold">{t.mock.fullscreen}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative -mx-[26px] h-[14px] rounded-b-[14px] bg-gradient-to-b from-[#d9dee6] to-[#9aa3b2] shadow-md">
          <span className="absolute left-1/2 top-0 h-[5px] w-[80px] -translate-x-1/2 rounded-b-md bg-[#b8c0cc]" />
        </div>
      </div>

      {/* Teléfono */}
      <div className="absolute left-[410px] top-[78px] h-[290px] w-[150px] rounded-[26px] border-[6px] border-[#111827] bg-white shadow-[0_24px_50px_-16px_rgba(10,31,77,0.55)]">
        <div className="flex h-full flex-col overflow-hidden rounded-[20px] px-2 pt-2 text-[7px]">
          <div className="flex items-center justify-between">
            <ChevronLeft className="h-2.5 w-2.5" />
            <span className="flex items-center gap-1 text-[8px] font-bold"><img src={isotipo} alt="" className="h-3 w-3" />Clinivista</span>
            <MoreHorizontal className="h-2.5 w-2.5" />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FC] text-[6px] font-bold text-[#1D5FD8]">MG</span>
            <div className="min-w-0">
              <p className="text-[6px] text-slate-500">{t.mock.patient}</p>
              <p className="truncate text-[8px] font-bold">{t.mock.patientName}</p>
            </div>
          </div>
          <p className="mt-2 text-[8px] font-bold">{t.mock.sections[1]}</p>
          <div className="relative mt-1 overflow-hidden rounded-md">
            <Photo img={faces} lang={lang} sizes="160px" className="block aspect-[3/2] w-full object-cover" decorative />
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/90" />
            <IllustrativeTag label={t.illustrative} className="bottom-0.5 left-0.5 !px-1 !py-0 !text-[5px]" />
          </div>
          <div className="mt-0.5 grid grid-cols-2 text-[6px] text-slate-500"><span>{t.mock.before}</span><span>{t.mock.after}</span></div>
          <span className="mt-2 flex items-center justify-center gap-1 rounded-md bg-[#1D5FD8] py-1.5 text-[7px] font-semibold text-white"><Plus className="h-2.5 w-2.5" />{t.mock.newRecord}</span>
          <div className="mt-auto grid grid-cols-4 border-t border-slate-100 py-1.5 text-center text-[5.5px] text-slate-500">
            {[Home, Users, Camera, MoreHorizontal].map((Icon, i) => (
              <span key={i} className={`flex flex-col items-center gap-0.5 ${i === 2 ? "text-[#1D5FD8]" : ""}`}><Icon className="h-2.5 w-2.5" />{t.mock.phoneNav[i]}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
