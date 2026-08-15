import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronRight, Activity, ShieldCheck, Globe,
  Camera, BarChart3, ScanLine, CheckCircle2, X
} from "lucide-react";

// ── Translations ────────────────────────────────────────────────────────────
type LangKey = "es" | "en" | "pt" | "fr" | "de" | "it" | "tr" | "ar" | "zh";

const LANGS: { code: LangKey; flag: string; name: string }[] = [
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
  { code: "zh", flag: "🇨🇳", name: "中文" },
];

type T = {
  tagline: string;
  heroTitle: string;
  heroAccent: string;
  heroSub: string;
  cta: string;
  teamAccess: string;
  howTitle: string;
  howSub: string;
  s1t: string; s1d: string;
  s2t: string; s2d: string;
  s3t: string; s3d: string;
  whyTitle: string;
  w1: string; w2: string; w3: string;
  footerLegal: string;
  footerPrivacy: string;
  footerTerms: string;
  footerRights: string;
};

const TRANSLATIONS: Record<LangKey, T> = {
  es: {
    tagline: "Evaluación Médica Estandarizada",
    heroTitle: "Estandariza la captura de",
    heroAccent: "imágenes clínicas",
    heroSub: "Registra, compara y da seguimiento fotográfico a tus pacientes con un protocolo estandarizado, seguro y reproducible.",
    cta: "Iniciar Preevaluación",
    teamAccess: "Acceso Equipo",
    howTitle: "¿Cómo funciona?",
    howSub: "Un protocolo clínico diseñado para precisión y privacidad",
    s1t: "Registro de Datos",
    s1d: "Antecedentes médicos y personales del paciente para contextualizar el análisis clínico.",
    s2t: "Captura Guiada",
    s2d: "5 fotografías estandarizadas con guías de posición paso a paso desde cualquier dispositivo.",
    s3t: "Comparación & Seguimiento",
    s3d: "El equipo médico revisa y compara imágenes en el tiempo para un seguimiento clínico objetivo.",
    whyTitle: "¿Por qué estandarizar la imagen?",
    w1: "Comparación reproducible entre sesiones clínicas",
    w2: "Seguimiento objetivo del progreso del tratamiento",
    w3: "Registros fotográficos confiables para diagnóstico",
    footerLegal: "Esta preevaluación es un filtro preliminar y no reemplaza una consulta médica presencial, ni entrega un diagnóstico automático.",
    footerPrivacy: "Privacidad",
    footerTerms: "Términos",
    footerRights: "Todos los derechos reservados.",
  },
  en: {
    tagline: "Standardized Medical Evaluation",
    heroTitle: "Standardize clinical",
    heroAccent: "image capture",
    heroSub: "Document, compare and track your patients photographically with a standardized, secure and reproducible protocol.",
    cta: "Start Pre-evaluation",
    teamAccess: "Team Access",
    howTitle: "How does it work?",
    howSub: "A clinical protocol designed for precision and privacy",
    s1t: "Data Registration",
    s1d: "Medical and personal history to contextualize the clinical analysis.",
    s2t: "Guided Capture",
    s2d: "5 standardized photographs with step-by-step positioning guides from any device.",
    s3t: "Comparison & Follow-up",
    s3d: "The medical team reviews and compares images over time for objective clinical tracking.",
    whyTitle: "Why standardize imaging?",
    w1: "Reproducible comparison between clinical sessions",
    w2: "Objective tracking of treatment progress",
    w3: "Reliable photographic records for diagnosis",
    footerLegal: "This pre-evaluation is a preliminary filter and does not replace an in-person medical consultation or deliver automatic diagnoses.",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerRights: "All rights reserved.",
  },
  pt: {
    tagline: "Avaliação Médica Padronizada",
    heroTitle: "Padronize a captura de",
    heroAccent: "imagens clínicas",
    heroSub: "Registre, compare e acompanhe seus pacientes fotograficamente com um protocolo padronizado, seguro e reproduzível.",
    cta: "Iniciar Pré-avaliação",
    teamAccess: "Acesso Equipe",
    howTitle: "Como funciona?",
    howSub: "Um protocolo clínico desenhado para precisão e privacidade",
    s1t: "Registro de Dados",
    s1d: "Histórico médico e pessoal do paciente para contextualizar a análise clínica.",
    s2t: "Captura Guiada",
    s2d: "5 fotografias padronizadas com guias de posicionamento passo a passo.",
    s3t: "Comparação & Acompanhamento",
    s3d: "A equipe médica analisa e compara imagens ao longo do tempo para acompanhamento objetivo.",
    whyTitle: "Por que padronizar imagens?",
    w1: "Comparação reproduzível entre sessões clínicas",
    w2: "Acompanhamento objetivo do progresso do tratamento",
    w3: "Registros fotográficos confiáveis para diagnóstico",
    footerLegal: "Esta pré-avaliação é um filtro preliminar e não substitui uma consulta médica presencial.",
    footerPrivacy: "Privacidade",
    footerTerms: "Termos",
    footerRights: "Todos os direitos reservados.",
  },
  fr: {
    tagline: "Évaluation Médicale Standardisée",
    heroTitle: "Standardisez la capture",
    heroAccent: "d'images cliniques",
    heroSub: "Documentez, comparez et suivez vos patients photographiquement avec un protocole standardisé, sécurisé et reproductible.",
    cta: "Commencer l'évaluation",
    teamAccess: "Accès Équipe",
    howTitle: "Comment ça marche ?",
    howSub: "Un protocole clinique conçu pour la précision et la confidentialité",
    s1t: "Enregistrement des données",
    s1d: "Antécédents médicaux et personnels du patient pour contextualiser l'analyse clinique.",
    s2t: "Capture guidée",
    s2d: "5 photographies standardisées avec guides de positionnement étape par étape.",
    s3t: "Comparaison & Suivi",
    s3d: "L'équipe médicale examine et compare les images dans le temps pour un suivi objectif.",
    whyTitle: "Pourquoi standardiser l'imagerie ?",
    w1: "Comparaison reproductible entre séances cliniques",
    w2: "Suivi objectif de la progression du traitement",
    w3: "Dossiers photographiques fiables pour le diagnostic",
    footerLegal: "Cette pré-évaluation est un filtre préliminaire et ne remplace pas une consultation médicale en personne.",
    footerPrivacy: "Confidentialité",
    footerTerms: "Conditions",
    footerRights: "Tous droits réservés.",
  },
  de: {
    tagName: "Deutsch",
    tagline: "Standardisierte Medizinische Bewertung",
    heroTitle: "Standardisieren Sie die klinische",
    heroAccent: "Bilderfassung",
    heroSub: "Dokumentieren, vergleichen und verfolgen Sie Ihre Patienten fotografisch mit einem standardisierten, sicheren Protokoll.",
    cta: "Vorbewertung starten",
    teamAccess: "Team-Zugang",
    howTitle: "Wie funktioniert es?",
    howSub: "Ein klinisches Protokoll für Präzision und Datenschutz",
    s1t: "Datenerfassung",
    s1d: "Medizinische und persönliche Vorgeschichte zur Einordnung der klinischen Analyse.",
    s2t: "Geführte Aufnahme",
    s2d: "5 standardisierte Fotos mit schrittweisen Positionierungshilfen von jedem Gerät.",
    s3t: "Vergleich & Nachsorge",
    s3d: "Das medizinische Team überprüft und vergleicht Bilder im Zeitverlauf für objektives Tracking.",
    whyTitle: "Warum Bilder standardisieren?",
    w1: "Reproduzierbarer Vergleich zwischen klinischen Sitzungen",
    w2: "Objektive Verfolgung des Behandlungsfortschritts",
    w3: "Zuverlässige Fotodokumentation für die Diagnose",
    footerLegal: "Diese Vorbewertung ist ein vorläufiger Filter und ersetzt keine persönliche Arztkonsultation.",
    footerPrivacy: "Datenschutz",
    footerTerms: "Nutzungsbedingungen",
    footerRights: "Alle Rechte vorbehalten.",
  } as T,
  it: {
    tagline: "Valutazione Medica Standardizzata",
    heroTitle: "Standardizza la cattura di",
    heroAccent: "immagini cliniche",
    heroSub: "Documenta, confronta e monitora i tuoi pazienti fotograficamente con un protocollo standardizzato e sicuro.",
    cta: "Inizia la Pre-valutazione",
    teamAccess: "Accesso Team",
    howTitle: "Come funziona?",
    howSub: "Un protocollo clinico progettato per precisione e privacy",
    s1t: "Registrazione Dati",
    s1d: "Anamnesi medica e personale per contestualizzare l'analisi clinica.",
    s2t: "Cattura Guidata",
    s2d: "5 fotografie standardizzate con guide al posizionamento passo dopo passo.",
    s3t: "Confronto & Follow-up",
    s3d: "Il team medico esamina e confronta le immagini nel tempo per un follow-up obiettivo.",
    whyTitle: "Perché standardizzare le immagini?",
    w1: "Confronto riproducibile tra sessioni cliniche",
    w2: "Monitoraggio obiettivo dei progressi del trattamento",
    w3: "Documenti fotografici affidabili per la diagnosi",
    footerLegal: "Questa pre-valutazione è un filtro preliminare e non sostituisce una consulenza medica.",
    footerPrivacy: "Privacy",
    footerTerms: "Termini",
    footerRights: "Tutti i diritti riservati.",
  },
  tr: {
    tagline: "Standart Tıbbi Değerlendirme",
    heroTitle: "Klinik görüntü",
    heroAccent: "yakalamayı standardize edin",
    heroSub: "Hastalarınızı standartlaştırılmış, güvenli ve tekrarlanabilir bir protokolle fotoğraflayın, karşılaştırın ve takip edin.",
    cta: "Ön Değerlendirmeyi Başlat",
    teamAccess: "Ekip Girişi",
    howTitle: "Nasıl çalışır?",
    howSub: "Hassasiyet ve gizlilik için tasarlanmış klinik bir protokol",
    s1t: "Veri Kaydı",
    s1d: "Klinik analizi bağlamlandırmak için hastanın tıbbi ve kişisel geçmişi.",
    s2t: "Rehberli Çekim",
    s2d: "Herhangi bir cihazdan adım adım konumlandırma rehberleriyle 5 standart fotoğraf.",
    s3t: "Karşılaştırma & Takip",
    s3d: "Tıp ekibi, objektif klinik takip için görüntüleri zaman içinde inceler ve karşılaştırır.",
    whyTitle: "Neden görüntüleri standartlaştırmalı?",
    w1: "Klinik seanslar arasında tekrarlanabilir karşılaştırma",
    w2: "Tedavi sürecinin objektif takibi",
    w3: "Tanı için güvenilir fotoğraf kayıtları",
    footerLegal: "Bu ön değerlendirme ön eleme filtresidir; yüz yüze tıbbi konsültasyonun yerini tutmaz.",
    footerPrivacy: "Gizlilik",
    footerTerms: "Koşullar",
    footerRights: "Tüm hakları saklıdır.",
  },
  ar: {
    tagline: "تقييم طبي موحّد",
    heroTitle: "توحيد التقاط",
    heroAccent: "الصور السريرية",
    heroSub: "وثّق وقارن وتابع مرضاك بصورة فوتوغرافية وفق بروتوكول موحّد وآمن وقابل للتكرار.",
    cta: "ابدأ التقييم المسبق",
    teamAccess: "دخول الفريق",
    howTitle: "كيف يعمل؟",
    howSub: "بروتوكول سريري مصمم للدقة والخصوصية",
    s1t: "تسجيل البيانات",
    s1d: "التاريخ الطبي والشخصي للمريض لتأطير التحليل السريري.",
    s2t: "التقاط موجّه",
    s2d: "5 صور موحدة مع إرشادات تحديد الموضع خطوة بخطوة من أي جهاز.",
    s3t: "المقارنة والمتابعة",
    s3d: "يراجع الفريق الطبي الصور ويقارنها عبر الزمن لمتابعة سريرية موضوعية.",
    whyTitle: "لماذا توحيد الصور؟",
    w1: "مقارنة قابلة للتكرار بين الجلسات السريرية",
    w2: "متابعة موضوعية لتطور العلاج",
    w3: "سجلات فوتوغرافية موثوقة للتشخيص",
    footerLegal: "هذا التقييم المسبق مرشح أولي ولا يحل محل الاستشارة الطبية الشخصية.",
    footerPrivacy: "الخصوصية",
    footerTerms: "الشروط",
    footerRights: "جميع الحقوق محفوظة.",
  },
  zh: {
    tagline: "标准化医疗评估",
    heroTitle: "标准化临床",
    heroAccent: "图像采集",
    heroSub: "使用标准化、安全且可重复的协议，对患者进行拍照记录、比较和跟踪。",
    cta: "开始预评估",
    teamAccess: "团队入口",
    howTitle: "如何运作？",
    howSub: "专为精准与隐私而设计的临床协议",
    s1t: "数据登记",
    s1d: "患者的医疗和个人病史，用于背景化临床分析。",
    s2t: "引导式拍摄",
    s2d: "通过任何设备，按步骤定位指南拍摄5张标准化照片。",
    s3t: "比较与随访",
    s3d: "医疗团队随时间审查和比较图像，实现客观的临床跟踪。",
    whyTitle: "为什么要标准化图像？",
    w1: "临床疗程间可重复的比较",
    w2: "客观跟踪治疗进展",
    w3: "用于诊断的可靠影像记录",
    footerLegal: "此预评估为初步筛查，不能替代面对面的医疗咨询，也不提供自动诊断。",
    footerPrivacy: "隐私",
    footerTerms: "条款",
    footerRights: "版权所有。",
  },
};

export default function Home() {
  const [lang, setLang] = useState<LangKey>("es");
  const [langOpen, setLangOpen] = useState(false);
  const t = TRANSLATIONS[lang];
  const currentLang = LANGS.find(l => l.code === lang)!;
  const isRtl = lang === "ar";

  return (
    <div className={`min-h-[100dvh] flex flex-col bg-[#0d1a2e] font-sans selection:bg-primary/20 ${isRtl ? "direction-rtl" : ""}`}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="relative min-h-[100dvh] flex flex-col">
        {/* Background: clinical photography / medical imaging */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80"
            alt="Medical imaging"
            className="w-full h-full object-cover object-center"
          />
          {/* Deep teal-navy overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a2e]/95 via-[#0d3040]/85 to-[#0d1a2e]/90"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a2e] via-transparent to-transparent"></div>
          {/* Vivid accent stripe */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00A9A5]/10 via-transparent to-[#3D8DFF]/10"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 lg:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">Clinivista</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                <Globe className="w-4 h-4" />
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.name}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d2035]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-1.5">
                      {LANGS.map(l => (
                        <button
                          key={l.code}
                          onClick={() => { setLang(l.code); setLangOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                            ${lang === l.code ? "bg-primary/20 text-primary" : "text-white/80 hover:bg-white/10"}`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span>{l.name}</span>
                          {lang === l.code && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/admin/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden sm:block">
              {t.teamAccess}
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full pb-20">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 flex flex-col items-center">
            <div className="inline-flex items-center justify-center px-5 py-2 mb-8 rounded-full bg-[#00A9A5]/15 backdrop-blur-md border border-[#00A9A5]/30 text-[#00A9A5] text-sm font-semibold shadow-2xl">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {t.tagline}
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              {t.heroTitle}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A9A5] to-[#3D8DFF]">
                {t.heroAccent}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              {t.heroSub}
            </p>

            <Link
              href="/patient"
              className="group inline-flex items-center justify-center h-14 px-10 rounded-full bg-primary text-white text-lg font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(91,76,245,0.45)] gap-3 w-full sm:w-auto"
            >
              {t.cta}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </main>
      </div>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════════ */}
      <div className="relative -mt-10 rounded-t-[2.5rem] z-20 overflow-hidden">
        {/* Vivid multi-tone background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2744] via-[#0d3a4a] to-[#112240]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,169,165,0.15)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(61,141,255,0.12)_0%,_transparent_60%)]" />

        <div className="relative py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-5 rounded-full bg-[#00A9A5]/15 border border-[#00A9A5]/30 text-[#00A9A5] text-xs font-bold uppercase tracking-widest">
                {t.howTitle}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">{t.howTitle}</h2>
              <p className="text-white/50 text-lg">{t.howSub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="group relative bg-gradient-to-br from-[#1a3a5c] to-[#0f2744] border border-white/10 rounded-3xl p-8 hover:border-[#00A9A5]/40 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00A9A5] to-[#3D8DFF] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00A9A5] to-[#00A9A5]/60 flex items-center justify-center mb-6 shadow-lg shadow-[#00A9A5]/20">
                  <ScanLine className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs font-bold text-[#00A9A5] uppercase tracking-widest mb-3">01</div>
                <h3 className="font-extrabold text-xl text-white mb-3">{t.s1t}</h3>
                <p className="text-white/55 leading-relaxed text-sm">{t.s1d}</p>
              </div>

              {/* Step 2 — highlighted */}
              <div className="group relative bg-gradient-to-br from-[#00A9A5]/20 to-[#3D8DFF]/15 border border-[#00A9A5]/30 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 shadow-xl ring-1 ring-[#00A9A5]/20">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00A9A5] to-[#3D8DFF] rounded-t-3xl" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3D8DFF] to-[#00A9A5] flex items-center justify-center mb-6 shadow-lg shadow-[#3D8DFF]/25">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs font-bold text-[#3D8DFF] uppercase tracking-widest mb-3">02</div>
                <h3 className="font-extrabold text-xl text-white mb-3">{t.s2t}</h3>
                <p className="text-white/60 leading-relaxed text-sm">{t.s2d}</p>
                <div className="mt-5 flex gap-2 flex-wrap">
                  {["Frontal", "Vértex", "Temporal ×2", "Nuca"].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-white/10 text-white/70 rounded-full text-xs font-semibold border border-white/10">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative bg-gradient-to-br from-[#1a3a5c] to-[#0f2744] border border-white/10 rounded-3xl p-8 hover:border-[#3D8DFF]/40 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3D8DFF] to-[#A78BFA] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3D8DFF] to-[#3D8DFF]/60 flex items-center justify-center mb-6 shadow-lg shadow-[#3D8DFF]/20">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs font-bold text-[#3D8DFF] uppercase tracking-widest mb-3">03</div>
                <h3 className="font-extrabold text-xl text-white mb-3">{t.s3t}</h3>
                <p className="text-white/55 leading-relaxed text-sm">{t.s3d}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ WHY STANDARDIZE ════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#112240] via-[#0d2a3a] to-[#0a1e35]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,169,165,0.08)_0%,_transparent_70%)]" />

        <div className="relative py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-4 py-1.5 mb-5 rounded-full bg-[#3D8DFF]/15 border border-[#3D8DFF]/30 text-[#3D8DFF] text-xs font-bold uppercase tracking-widest">
                  Protocolo Clínico
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                  {t.whyTitle}
                </h2>
                <div className="space-y-4">
                  {[t.w1, t.w2, t.w3].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00A9A5] to-[#3D8DFF] flex items-center justify-center shrink-0 mt-0.5 shadow-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-white/70 font-medium leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Posiciones", value: "5", color: "from-[#00A9A5] to-[#00A9A5]/40", shadow: "shadow-[#00A9A5]/20" },
                  { label: "Minutos", value: "4–6", color: "from-[#3D8DFF] to-[#3D8DFF]/40", shadow: "shadow-[#3D8DFF]/20" },
                  { label: "Cifrado", value: "100%", color: "from-[#A78BFA] to-[#A78BFA]/40", shadow: "shadow-[#A78BFA]/20" },
                  { label: "Respuesta", value: "24h", color: "from-[#F59E0B] to-[#F59E0B]/40", shadow: "shadow-[#F59E0B]/20" },
                ].map(stat => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} p-6 rounded-2xl border border-white/10 shadow-lg ${stat.shadow}`}>
                    <p className="text-4xl font-extrabold text-white mb-1">{stat.value}</p>
                    <p className="text-white/60 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ═════════════════════════════════════════════════════════════ */}
      <footer className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1625] to-[#060e18]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00A9A5]/40 to-transparent" />

        <div className="relative py-14 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Top row: brand + links */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[9px] bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">Clinivista</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-white/40 hover:text-white/80 transition-colors font-medium">{t.footerPrivacy}</a>
                <span className="text-white/15">|</span>
                <a href="#" className="text-white/40 hover:text-white/80 transition-colors font-medium">{t.footerTerms}</a>
                <span className="text-white/15">|</span>
                <Link href="/admin/login" className="text-white/40 hover:text-[#00A9A5] transition-colors font-medium">
                  {t.teamAccess}
                </Link>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

            {/* Legal */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-6 mb-8">
              <p className="text-sm text-white/40 leading-relaxed text-center max-w-3xl mx-auto">
                ⚠️ {t.footerLegal}
              </p>
            </div>

            {/* Bottom */}
            <p className="text-center text-xs text-white/25 font-medium">
              © {new Date().getFullYear()} Clinivista · {t.footerRights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
