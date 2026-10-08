// Textos fijos del PDF de resultados en los nueve idiomas de la aplicación.
export const PDF_LANGUAGES = ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"] as const;
export type PdfLanguage = (typeof PDF_LANGUAGES)[number];

export function toPdfLanguage(value: unknown): PdfLanguage {
  return (PDF_LANGUAGES as readonly string[]).includes(String(value)) ? (value as PdfLanguage) : "es";
}

export type PdfText = {
  documentTitle: string;
  title: string;
  patient: string;
  documentId: string;
  date: string;
  doctor: string;
  response: string;
  photos: string;
  annotated: string;
  notice: string;
  page: (current: number, total: number) => string;
  locale: string;
};

export const PDF_TEXT: Record<PdfLanguage, PdfText> = {
  es: {
    documentTitle: "Resultados",
    title: "Resultados de su evaluación",
    patient: "Paciente",
    documentId: "RUT",
    date: "Fecha",
    doctor: "Médico",
    response: "Respuesta del equipo médico",
    photos: "Sus fotografías",
    annotated: "con indicaciones del médico",
    notice:
      "Esta respuesta se basa en las fotografías y los datos que usted envió y no reemplaza una consulta presencial. " +
      "Para confirmar el diagnóstico y definir el tratamiento, el equipo médico podrá solicitarle una evaluación en la clínica.",
    page: (c, t) => `Página ${c} de ${t}`,
    locale: "es-CL",
  },
  en: {
    documentTitle: "Results",
    title: "Your evaluation results",
    patient: "Patient",
    documentId: "ID",
    date: "Date",
    doctor: "Doctor",
    response: "Response from the medical team",
    photos: "Your photographs",
    annotated: "with the doctor's markings",
    notice:
      "This response is based on the photographs and data you sent and does not replace an in-person consultation. " +
      "To confirm the diagnosis and define the treatment, the medical team may ask you for an evaluation at the clinic.",
    page: (c, t) => `Page ${c} of ${t}`,
    locale: "en",
  },
  pt: {
    documentTitle: "Resultados",
    title: "Resultados da sua avaliação",
    patient: "Paciente",
    documentId: "Documento",
    date: "Data",
    doctor: "Médico",
    response: "Resposta da equipe médica",
    photos: "Suas fotografias",
    annotated: "com indicações do médico",
    notice:
      "Esta resposta baseia-se nas fotografias e nos dados que você enviou e não substitui uma consulta presencial. " +
      "Para confirmar o diagnóstico e definir o tratamento, a equipe médica poderá solicitar uma avaliação na clínica.",
    page: (c, t) => `Página ${c} de ${t}`,
    locale: "pt-BR",
  },
  fr: {
    documentTitle: "Résultats",
    title: "Résultats de votre évaluation",
    patient: "Patient",
    documentId: "Pièce d'identité",
    date: "Date",
    doctor: "Médecin",
    response: "Réponse de l'équipe médicale",
    photos: "Vos photographies",
    annotated: "avec les indications du médecin",
    notice:
      "Cette réponse repose sur les photographies et les données que vous avez envoyées et ne remplace pas une consultation en personne. " +
      "Pour confirmer le diagnostic et définir le traitement, l'équipe médicale pourra vous demander une évaluation à la clinique.",
    page: (c, t) => `Page ${c} sur ${t}`,
    locale: "fr",
  },
  de: {
    documentTitle: "Ergebnisse",
    title: "Ergebnisse Ihrer Auswertung",
    patient: "Patient",
    documentId: "Ausweis",
    date: "Datum",
    doctor: "Arzt",
    response: "Antwort des medizinischen Teams",
    photos: "Ihre Fotos",
    annotated: "mit Markierungen des Arztes",
    notice:
      "Diese Antwort beruht auf den von Ihnen gesendeten Fotos und Daten und ersetzt keine Untersuchung vor Ort. " +
      "Um die Diagnose zu bestätigen und die Behandlung festzulegen, kann das medizinische Team Sie um eine Untersuchung in der Klinik bitten.",
    page: (c, t) => `Seite ${c} von ${t}`,
    locale: "de",
  },
  it: {
    documentTitle: "Risultati",
    title: "Risultati della sua valutazione",
    patient: "Paziente",
    documentId: "Documento",
    date: "Data",
    doctor: "Medico",
    response: "Risposta del team medico",
    photos: "Le sue fotografie",
    annotated: "con le indicazioni del medico",
    notice:
      "Questa risposta si basa sulle fotografie e sui dati che ha inviato e non sostituisce una visita di persona. " +
      "Per confermare la diagnosi e definire il trattamento, il team medico potrà chiederle una valutazione in clinica.",
    page: (c, t) => `Pagina ${c} di ${t}`,
    locale: "it",
  },
  tr: {
    documentTitle: "Sonuçlar",
    title: "Değerlendirme sonuçlarınız",
    patient: "Hasta",
    documentId: "Kimlik",
    date: "Tarih",
    doctor: "Doktor",
    response: "Tıbbi ekibin yanıtı",
    photos: "Fotoğraflarınız",
    annotated: "doktorun işaretlemeleriyle",
    notice:
      "Bu yanıt, gönderdiğiniz fotoğraflara ve verilere dayanır ve yüz yüze muayenenin yerini tutmaz. " +
      "Tanıyı doğrulamak ve tedaviyi belirlemek için tıbbi ekip sizden klinikte bir değerlendirme isteyebilir.",
    page: (c, t) => `Sayfa ${c} / ${t}`,
    locale: "tr",
  },
  ar: {
    documentTitle: "النتائج",
    title: "نتائج تقييمك",
    patient: "المريض",
    documentId: "الهوية",
    date: "التاريخ",
    doctor: "الطبيب",
    response: "رد الفريق الطبي",
    photos: "صورك",
    annotated: "مع ملاحظات الطبيب",
    notice:
      "يستند هذا الرد إلى الصور والبيانات التي أرسلتها ولا يحل محل الاستشارة الحضورية. " +
      "وللتأكد من التشخيص وتحديد العلاج، قد يطلب منك الفريق الطبي إجراء تقييم في العيادة.",
    page: (c, t) => `صفحة ${c} من ${t}`,
    locale: "ar-u-nu-latn",
  },
  zh: {
    documentTitle: "结果",
    title: "您的评估结果",
    patient: "患者",
    documentId: "证件号",
    date: "日期",
    doctor: "医生",
    response: "医疗团队的回复",
    photos: "您的照片",
    annotated: "含医生标注",
    notice:
      "此回复基于您发送的照片和资料，不能替代面对面的就诊。" +
      "为了确认诊断并确定治疗方案，医疗团队可能会请您到诊所进行评估。",
    page: (c, t) => `第 ${c} 页，共 ${t} 页`,
    locale: "zh-CN",
  },
};
