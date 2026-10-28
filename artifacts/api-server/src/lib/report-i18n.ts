// Textos fijos de los informes del paciente (diagnóstico, evolución y alta médica) en los nueve idiomas.
// Los datos (nombres, fechas, textos del profesional) nunca salen de aquí: solo las etiquetas.
import type { PdfLanguage } from "./result-pdf-i18n";

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

export type ReportText = {
  issued: string;
  professional: string;
  specialty: Record<"capilar" | "plastica" | "dermatologia", string>;
  // Diagnóstico
  diagnosisTitle: string;
  diagnosisSubtitle: string;
  evaluationDate: string;
  validatedBadge: string;
  assessmentTitle: string;
  assessmentValidated: (doctor: string, date: string) => string;
  assessmentValidatedNoName: (date: string) => string;
  reasonTitle: string;
  reasonSource: string;
  photoTitle: string;
  stage: string;
  patientNote: string;
  nextTitle: string;
  appointment: (date: string) => string;
  // Evolución
  evolutionTitle: string;
  evolutionSubtitle: string;
  period: string;
  comparisonTitle: string;
  position: string;
  noComparable: string;
  chronologyTitle: string;
  photoCount: (count: number) => string;
  // Alta médica
  dischargeTitle: string;
  dischargeSubtitle: string;
  dischargeDate: string;
  dischargeBadge: string;
  closureTitle: string;
  closureBy: (name: string, date: string) => string;
  closureNoName: (date: string) => string;
  allPhasesDone: string;
  noteTitle: string;
  processTitle: string;
  phaseDone: string;
  phaseSkipped: string;
  phaseOpen: string;
  diagnosisIssued: (name: string, date: string) => string;
  finalPhotosTitle: string;
  dischargedBy: string;
  dischargeNotice: string;
};

export const REPORT_TEXT: Record<PdfLanguage, ReportText> = {
  es: {
    issued: "Fecha de emisión", professional: "Profesional responsable",
    specialty: { capilar: "Medicina capilar", plastica: "Cirugía plástica", dermatologia: "Dermatología" },
    diagnosisTitle: "Informe de diagnóstico", diagnosisSubtitle: "Evaluación fotográfica clínica", evaluationDate: "Fecha de evaluación",
    validatedBadge: "Validado · emitido", assessmentTitle: "Valoración del profesional",
    assessmentValidated: (d, t) => fill("Contenido validado por {d} el {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Contenido validado por el equipo médico el {t}.", { t }),
    reasonTitle: "Motivo y antecedentes", reasonSource: "Datos informados por el paciente en su preevaluación.",
    photoTitle: "Registro fotográfico clínico", stage: "Etapa", patientNote: "Nota del paciente",
    nextTitle: "Próximos pasos", appointment: (t) => fill("Cita registrada: {t}", { t }),
    evolutionTitle: "Informe de evolución", evolutionSubtitle: "Seguimiento fotográfico clínico", period: "Período de seguimiento",
    comparisonTitle: "Comparativa fotográfica", position: "Posición", noComparable: "Sin toma comparable",
    chronologyTitle: "Cronología", photoCount: (n) => (n === 1 ? "1 fotografía" : `${n} fotografías`),
    dischargeTitle: "Alta médica", dischargeSubtitle: "Cierre del protocolo de seguimiento", dischargeDate: "Fecha de alta", dischargeBadge: "Alta registrada",
    closureTitle: "Cierre del protocolo", closureBy: (n, t) => fill("Alta médica registrada por {n} el {t}.", { n, t }), closureNoName: (t) => fill("Alta médica registrada el {t}.", { t }),
    allPhasesDone: "El paciente completó todas las etapas del protocolo.", noteTitle: "Nota del profesional al alta",
    processTitle: "Resumen del proceso", phaseDone: "Completada", phaseSkipped: "Omitida por el equipo", phaseOpen: "Sin registro",
    diagnosisIssued: (n, t) => fill("Diagnóstico emitido por {n} el {t}", { n, t }),
    finalPhotosTitle: "Registro fotográfico final", dischargedBy: "Alta registrada por",
    dischargeNotice: "Este documento resume lo registrado en el proceso del paciente y no reemplaza las indicaciones entregadas por el equipo médico.",
  },
  en: {
    issued: "Date of issue", professional: "Responsible professional",
    specialty: { capilar: "Hair medicine", plastica: "Plastic surgery", dermatologia: "Dermatology" },
    diagnosisTitle: "Diagnosis report", diagnosisSubtitle: "Clinical photographic evaluation", evaluationDate: "Evaluation date",
    validatedBadge: "Validated · issued", assessmentTitle: "Professional's assessment",
    assessmentValidated: (d, t) => fill("Content validated by {d} on {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Content validated by the medical team on {t}.", { t }),
    reasonTitle: "Reason and history", reasonSource: "Information provided by the patient in the pre-evaluation.",
    photoTitle: "Clinical photographic record", stage: "Stage", patientNote: "Patient's note",
    nextTitle: "Next steps", appointment: (t) => fill("Appointment on record: {t}", { t }),
    evolutionTitle: "Progress report", evolutionSubtitle: "Clinical photographic follow-up", period: "Follow-up period",
    comparisonTitle: "Photographic comparison", position: "Position", noComparable: "No comparable photo",
    chronologyTitle: "Timeline", photoCount: (n) => (n === 1 ? "1 photo" : `${n} photos`),
    dischargeTitle: "Medical discharge", dischargeSubtitle: "Closing of the follow-up protocol", dischargeDate: "Discharge date", dischargeBadge: "Discharge recorded",
    closureTitle: "Protocol closure", closureBy: (n, t) => fill("Medical discharge recorded by {n} on {t}.", { n, t }), closureNoName: (t) => fill("Medical discharge recorded on {t}.", { t }),
    allPhasesDone: "The patient completed every stage of the protocol.", noteTitle: "Professional's discharge note",
    processTitle: "Process summary", phaseDone: "Completed", phaseSkipped: "Skipped by the team", phaseOpen: "Not recorded",
    diagnosisIssued: (n, t) => fill("Diagnosis issued by {n} on {t}", { n, t }),
    finalPhotosTitle: "Final photographic record", dischargedBy: "Discharge recorded by",
    dischargeNotice: "This document summarises what was recorded during the patient's process and does not replace the instructions given by the medical team.",
  },
  pt: {
    issued: "Data de emissão", professional: "Profissional responsável",
    specialty: { capilar: "Medicina capilar", plastica: "Cirurgia plástica", dermatologia: "Dermatologia" },
    diagnosisTitle: "Relatório de diagnóstico", diagnosisSubtitle: "Avaliação fotográfica clínica", evaluationDate: "Data da avaliação",
    validatedBadge: "Validado · emitido", assessmentTitle: "Avaliação do profissional",
    assessmentValidated: (d, t) => fill("Conteúdo validado por {d} em {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Conteúdo validado pela equipe médica em {t}.", { t }),
    reasonTitle: "Motivo e antecedentes", reasonSource: "Dados informados pelo paciente na pré-avaliação.",
    photoTitle: "Registro fotográfico clínico", stage: "Etapa", patientNote: "Observação do paciente",
    nextTitle: "Próximos passos", appointment: (t) => fill("Consulta registrada: {t}", { t }),
    evolutionTitle: "Relatório de evolução", evolutionSubtitle: "Acompanhamento fotográfico clínico", period: "Período de acompanhamento",
    comparisonTitle: "Comparação fotográfica", position: "Posição", noComparable: "Sem foto comparável",
    chronologyTitle: "Cronologia", photoCount: (n) => (n === 1 ? "1 fotografia" : `${n} fotografias`),
    dischargeTitle: "Alta médica", dischargeSubtitle: "Encerramento do protocolo de acompanhamento", dischargeDate: "Data da alta", dischargeBadge: "Alta registrada",
    closureTitle: "Encerramento do protocolo", closureBy: (n, t) => fill("Alta médica registrada por {n} em {t}.", { n, t }), closureNoName: (t) => fill("Alta médica registrada em {t}.", { t }),
    allPhasesDone: "O paciente concluiu todas as etapas do protocolo.", noteTitle: "Observação do profissional na alta",
    processTitle: "Resumo do processo", phaseDone: "Concluída", phaseSkipped: "Pulada pela equipe", phaseOpen: "Sem registro",
    diagnosisIssued: (n, t) => fill("Diagnóstico emitido por {n} em {t}", { n, t }),
    finalPhotosTitle: "Registro fotográfico final", dischargedBy: "Alta registrada por",
    dischargeNotice: "Este documento resume o que foi registrado no processo do paciente e não substitui as orientações da equipe médica.",
  },
  fr: {
    issued: "Date d'émission", professional: "Professionnel responsable",
    specialty: { capilar: "Médecine capillaire", plastica: "Chirurgie plastique", dermatologia: "Dermatologie" },
    diagnosisTitle: "Rapport de diagnostic", diagnosisSubtitle: "Évaluation photographique clinique", evaluationDate: "Date de l'évaluation",
    validatedBadge: "Validé · émis", assessmentTitle: "Évaluation du professionnel",
    assessmentValidated: (d, t) => fill("Contenu validé par {d} le {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Contenu validé par l'équipe médicale le {t}.", { t }),
    reasonTitle: "Motif et antécédents", reasonSource: "Informations fournies par le patient lors de la préévaluation.",
    photoTitle: "Dossier photographique clinique", stage: "Étape", patientNote: "Note du patient",
    nextTitle: "Prochaines étapes", appointment: (t) => fill("Rendez-vous enregistré : {t}", { t }),
    evolutionTitle: "Rapport d'évolution", evolutionSubtitle: "Suivi photographique clinique", period: "Période de suivi",
    comparisonTitle: "Comparaison photographique", position: "Position", noComparable: "Pas de photo comparable",
    chronologyTitle: "Chronologie", photoCount: (n) => (n === 1 ? "1 photo" : `${n} photos`),
    dischargeTitle: "Sortie médicale", dischargeSubtitle: "Clôture du protocole de suivi", dischargeDate: "Date de sortie", dischargeBadge: "Sortie enregistrée",
    closureTitle: "Clôture du protocole", closureBy: (n, t) => fill("Sortie médicale enregistrée par {n} le {t}.", { n, t }), closureNoName: (t) => fill("Sortie médicale enregistrée le {t}.", { t }),
    allPhasesDone: "Le patient a terminé toutes les étapes du protocole.", noteTitle: "Note du professionnel à la sortie",
    processTitle: "Résumé du parcours", phaseDone: "Terminée", phaseSkipped: "Passée par l'équipe", phaseOpen: "Non enregistrée",
    diagnosisIssued: (n, t) => fill("Diagnostic émis par {n} le {t}", { n, t }),
    finalPhotosTitle: "Dossier photographique final", dischargedBy: "Sortie enregistrée par",
    dischargeNotice: "Ce document résume ce qui a été enregistré pendant le parcours du patient et ne remplace pas les indications de l'équipe médicale.",
  },
  de: {
    issued: "Ausstellungsdatum", professional: "Verantwortliche Fachkraft",
    specialty: { capilar: "Haarmedizin", plastica: "Plastische Chirurgie", dermatologia: "Dermatologie" },
    diagnosisTitle: "Diagnosebericht", diagnosisSubtitle: "Klinische Fotobeurteilung", evaluationDate: "Datum der Beurteilung",
    validatedBadge: "Validiert · ausgestellt", assessmentTitle: "Beurteilung der Fachkraft",
    assessmentValidated: (d, t) => fill("Inhalt validiert von {d} am {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Inhalt vom medizinischen Team validiert am {t}.", { t }),
    reasonTitle: "Anlass und Vorgeschichte", reasonSource: "Angaben des Patienten in der Voruntersuchung.",
    photoTitle: "Klinische Fotodokumentation", stage: "Phase", patientNote: "Notiz des Patienten",
    nextTitle: "Nächste Schritte", appointment: (t) => fill("Eingetragener Termin: {t}", { t }),
    evolutionTitle: "Verlaufsbericht", evolutionSubtitle: "Klinische Fotoverlaufskontrolle", period: "Beobachtungszeitraum",
    comparisonTitle: "Fotovergleich", position: "Position", noComparable: "Keine vergleichbare Aufnahme",
    chronologyTitle: "Zeitverlauf", photoCount: (n) => (n === 1 ? "1 Foto" : `${n} Fotos`),
    dischargeTitle: "Ärztliche Entlassung", dischargeSubtitle: "Abschluss des Nachsorgeprotokolls", dischargeDate: "Entlassungsdatum", dischargeBadge: "Entlassung eingetragen",
    closureTitle: "Abschluss des Protokolls", closureBy: (n, t) => fill("Ärztliche Entlassung eingetragen von {n} am {t}.", { n, t }), closureNoName: (t) => fill("Ärztliche Entlassung eingetragen am {t}.", { t }),
    allPhasesDone: "Der Patient hat alle Phasen des Protokolls abgeschlossen.", noteTitle: "Notiz der Fachkraft zur Entlassung",
    processTitle: "Zusammenfassung des Verlaufs", phaseDone: "Abgeschlossen", phaseSkipped: "Vom Team übersprungen", phaseOpen: "Nicht erfasst",
    diagnosisIssued: (n, t) => fill("Diagnose ausgestellt von {n} am {t}", { n, t }),
    finalPhotosTitle: "Abschließende Fotodokumentation", dischargedBy: "Entlassung eingetragen von",
    dischargeNotice: "Dieses Dokument fasst zusammen, was im Verlauf des Patienten erfasst wurde, und ersetzt nicht die Anweisungen des medizinischen Teams.",
  },
  it: {
    issued: "Data di emissione", professional: "Professionista responsabile",
    specialty: { capilar: "Medicina tricologica", plastica: "Chirurgia plastica", dermatologia: "Dermatologia" },
    diagnosisTitle: "Referto di diagnosi", diagnosisSubtitle: "Valutazione fotografica clinica", evaluationDate: "Data della valutazione",
    validatedBadge: "Convalidato · emesso", assessmentTitle: "Valutazione del professionista",
    assessmentValidated: (d, t) => fill("Contenuto convalidato da {d} il {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("Contenuto convalidato dal team medico il {t}.", { t }),
    reasonTitle: "Motivo e anamnesi", reasonSource: "Dati forniti dal paziente nella pre-valutazione.",
    photoTitle: "Documentazione fotografica clinica", stage: "Fase", patientNote: "Nota del paziente",
    nextTitle: "Prossimi passi", appointment: (t) => fill("Appuntamento registrato: {t}", { t }),
    evolutionTitle: "Referto di evoluzione", evolutionSubtitle: "Monitoraggio fotografico clinico", period: "Periodo di monitoraggio",
    comparisonTitle: "Confronto fotografico", position: "Posizione", noComparable: "Nessuna foto confrontabile",
    chronologyTitle: "Cronologia", photoCount: (n) => (n === 1 ? "1 fotografia" : `${n} fotografie`),
    dischargeTitle: "Dimissione medica", dischargeSubtitle: "Chiusura del protocollo di monitoraggio", dischargeDate: "Data di dimissione", dischargeBadge: "Dimissione registrata",
    closureTitle: "Chiusura del protocollo", closureBy: (n, t) => fill("Dimissione medica registrata da {n} il {t}.", { n, t }), closureNoName: (t) => fill("Dimissione medica registrata il {t}.", { t }),
    allPhasesDone: "Il paziente ha completato tutte le fasi del protocollo.", noteTitle: "Nota del professionista alla dimissione",
    processTitle: "Riepilogo del percorso", phaseDone: "Completata", phaseSkipped: "Saltata dal team", phaseOpen: "Non registrata",
    diagnosisIssued: (n, t) => fill("Diagnosi emessa da {n} il {t}", { n, t }),
    finalPhotosTitle: "Documentazione fotografica finale", dischargedBy: "Dimissione registrata da",
    dischargeNotice: "Questo documento riassume quanto registrato nel percorso del paziente e non sostituisce le indicazioni del team medico.",
  },
  tr: {
    issued: "Düzenlenme tarihi", professional: "Sorumlu uzman",
    specialty: { capilar: "Saç tıbbı", plastica: "Plastik cerrahi", dermatologia: "Dermatoloji" },
    diagnosisTitle: "Teşhis raporu", diagnosisSubtitle: "Klinik fotoğraf değerlendirmesi", evaluationDate: "Değerlendirme tarihi",
    validatedBadge: "Onaylandı · düzenlendi", assessmentTitle: "Uzmanın değerlendirmesi",
    assessmentValidated: (d, t) => fill("İçerik {d} tarafından {t} tarihinde onaylandı.", { d, t }), assessmentValidatedNoName: (t) => fill("İçerik tıbbi ekip tarafından {t} tarihinde onaylandı.", { t }),
    reasonTitle: "Başvuru nedeni ve geçmiş", reasonSource: "Hastanın ön değerlendirmede verdiği bilgiler.",
    photoTitle: "Klinik fotoğraf kaydı", stage: "Aşama", patientNote: "Hastanın notu",
    nextTitle: "Sonraki adımlar", appointment: (t) => fill("Kayıtlı randevu: {t}", { t }),
    evolutionTitle: "Gelişim raporu", evolutionSubtitle: "Klinik fotoğraf takibi", period: "Takip dönemi",
    comparisonTitle: "Fotoğraf karşılaştırması", position: "Pozisyon", noComparable: "Karşılaştırılabilir fotoğraf yok",
    chronologyTitle: "Zaman çizelgesi", photoCount: (n) => `${n} fotoğraf`,
    dischargeTitle: "Tıbbi taburcu", dischargeSubtitle: "Takip protokolünün kapanışı", dischargeDate: "Taburcu tarihi", dischargeBadge: "Taburcu kaydedildi",
    closureTitle: "Protokolün kapanışı", closureBy: (n, t) => fill("Tıbbi taburcu {n} tarafından {t} tarihinde kaydedildi.", { n, t }), closureNoName: (t) => fill("Tıbbi taburcu {t} tarihinde kaydedildi.", { t }),
    allPhasesDone: "Hasta protokolün tüm aşamalarını tamamladı.", noteTitle: "Uzmanın taburcu notu",
    processTitle: "Sürecin özeti", phaseDone: "Tamamlandı", phaseSkipped: "Ekip tarafından atlandı", phaseOpen: "Kayıt yok",
    diagnosisIssued: (n, t) => fill("Teşhis {n} tarafından {t} tarihinde düzenlendi", { n, t }),
    finalPhotosTitle: "Son fotoğraf kaydı", dischargedBy: "Taburcuyu kaydeden",
    dischargeNotice: "Bu belge hastanın sürecinde kaydedilenleri özetler ve tıbbi ekibin verdiği talimatların yerini tutmaz.",
  },
  ar: {
    issued: "تاريخ الإصدار", professional: "المختص المسؤول",
    specialty: { capilar: "طب الشعر", plastica: "الجراحة التجميلية", dermatologia: "الأمراض الجلدية" },
    diagnosisTitle: "تقرير التشخيص", diagnosisSubtitle: "تقييم سريري بالصور", evaluationDate: "تاريخ التقييم",
    validatedBadge: "معتمد · صادر", assessmentTitle: "تقييم المختص",
    assessmentValidated: (d, t) => fill("اعتمد {d} هذا المحتوى بتاريخ {t}.", { d, t }), assessmentValidatedNoName: (t) => fill("اعتمد الفريق الطبي هذا المحتوى بتاريخ {t}.", { t }),
    reasonTitle: "سبب الاستشارة والسوابق", reasonSource: "بيانات قدّمها المريض في التقييم المبدئي.",
    photoTitle: "السجل السريري بالصور", stage: "المرحلة", patientNote: "ملاحظة المريض",
    nextTitle: "الخطوات التالية", appointment: (t) => fill("موعد مسجّل: {t}", { t }),
    evolutionTitle: "تقرير التطور", evolutionSubtitle: "متابعة سريرية بالصور", period: "فترة المتابعة",
    comparisonTitle: "مقارنة الصور", position: "الوضعية", noComparable: "لا توجد صورة قابلة للمقارنة",
    chronologyTitle: "التسلسل الزمني", photoCount: (n) => (n === 1 ? "صورة واحدة" : `${n} صور`),
    dischargeTitle: "الخروج الطبي", dischargeSubtitle: "إغلاق بروتوكول المتابعة", dischargeDate: "تاريخ الخروج", dischargeBadge: "خروج مسجّل",
    closureTitle: "إغلاق البروتوكول", closureBy: (n, t) => fill("سجّل {n} الخروج الطبي بتاريخ {t}.", { n, t }), closureNoName: (t) => fill("سُجّل الخروج الطبي بتاريخ {t}.", { t }),
    allPhasesDone: "أكمل المريض جميع مراحل البروتوكول.", noteTitle: "ملاحظة المختص عند الخروج",
    processTitle: "ملخص المسار", phaseDone: "مكتملة", phaseSkipped: "تخطّاها الفريق", phaseOpen: "غير مسجّلة",
    diagnosisIssued: (n, t) => fill("أصدر {n} التشخيص بتاريخ {t}", { n, t }),
    finalPhotosTitle: "السجل النهائي بالصور", dischargedBy: "سجّل الخروج",
    dischargeNotice: "تلخّص هذه الوثيقة ما سُجّل خلال مسار المريض ولا تغني عن تعليمات الفريق الطبي.",
  },
  zh: {
    issued: "出具日期", professional: "负责医师",
    specialty: { capilar: "毛发医学", plastica: "整形外科", dermatologia: "皮肤科" },
    diagnosisTitle: "诊断报告", diagnosisSubtitle: "临床照片评估", evaluationDate: "评估日期",
    validatedBadge: "已审核 · 已出具", assessmentTitle: "医师评估",
    assessmentValidated: (d, t) => fill("内容已由 {d} 于 {t} 审核。", { d, t }), assessmentValidatedNoName: (t) => fill("内容已由医疗团队于 {t} 审核。", { t }),
    reasonTitle: "就诊原因与病史", reasonSource: "患者在预评估中提供的信息。",
    photoTitle: "临床照片记录", stage: "阶段", patientNote: "患者备注",
    nextTitle: "后续步骤", appointment: (t) => fill("已登记的预约：{t}", { t }),
    evolutionTitle: "治疗进展报告", evolutionSubtitle: "临床照片随访", period: "随访期间",
    comparisonTitle: "照片对比", position: "部位", noComparable: "无可对比照片",
    chronologyTitle: "时间线", photoCount: (n) => `${n} 张照片`,
    dischargeTitle: "医疗出院", dischargeSubtitle: "随访方案结束", dischargeDate: "出院日期", dischargeBadge: "已登记出院",
    closureTitle: "方案结束", closureBy: (n, t) => fill("医疗出院由 {n} 于 {t} 登记。", { n, t }), closureNoName: (t) => fill("医疗出院于 {t} 登记。", { t }),
    allPhasesDone: "患者已完成方案的全部阶段。", noteTitle: "医师出院备注",
    processTitle: "过程摘要", phaseDone: "已完成", phaseSkipped: "团队已跳过", phaseOpen: "未登记",
    diagnosisIssued: (n, t) => fill("诊断由 {n} 于 {t} 出具", { n, t }),
    finalPhotosTitle: "最终照片记录", dischargedBy: "出院登记人",
    dischargeNotice: "本文件汇总了患者过程中的登记内容，不能替代医疗团队给出的医嘱。",
  },
};
