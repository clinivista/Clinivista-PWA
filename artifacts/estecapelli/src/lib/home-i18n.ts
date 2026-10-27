// Textos de la pantalla de Inicio del dashboard de clínica, en los nueve idiomas.
import type { LangCode } from "./language";

export type HomeText = {
  nav: string;
  greeting: (name: string) => string;
  subtitle: string;
  quickTitle: string;
  newPatientDesc: string;
  patientsTitle: string;
  patientsDesc: string;
  reportDesc: string;
  phasesDesc: string;
  usersDesc: string;
  statsTitle: string;
  totalPatients: string;
  photos: string;
  thisMonth: string;
  professionals: string;
  recentTitle: string;
  seeAll: string;
  emptyTitle: string;
  emptyDesc: string;
  error: string;
  retry: string;
};

export const HOME_TEXT: Record<LangCode, HomeText> = {
  es: {
    nav: "Inicio", greeting: (n) => `Hola, ${n}`, subtitle: "Este es el resumen de tu clínica.",
    quickTitle: "Accesos rápidos", newPatientDesc: "Registra a un paciente que atiendes en la clínica.",
    patientsTitle: "Ver pacientes", patientsDesc: "Lista, filtros y fichas de pacientes.",
    reportDesc: "Pacientes con etapas pendientes.", phasesDesc: "Configura el protocolo fotográfico.", usersDesc: "Personas con acceso a la clínica.",
    statsTitle: "Indicadores", totalPatients: "Pacientes totales", photos: "Fotografías registradas", thisMonth: "Registros este mes", professionals: "Profesionales activos",
    recentTitle: "Pacientes recientes", seeAll: "Ver todos",
    emptyTitle: "Aún no hay pacientes", emptyDesc: "Agrega el primero o comparte el enlace de la clínica desde Pacientes.",
    error: "No pudimos cargar los datos de la clínica.", retry: "Reintentar",
  },
  en: {
    nav: "Home", greeting: (n) => `Hello, ${n}`, subtitle: "Here is your clinic at a glance.",
    quickTitle: "Quick actions", newPatientDesc: "Register a patient you see at the clinic.",
    patientsTitle: "View patients", patientsDesc: "Patient list, filters and records.",
    reportDesc: "Patients with pending stages.", phasesDesc: "Set up the photo protocol.", usersDesc: "People with access to the clinic.",
    statsTitle: "Key figures", totalPatients: "Total patients", photos: "Photos recorded", thisMonth: "Registered this month", professionals: "Active professionals",
    recentTitle: "Recent patients", seeAll: "See all",
    emptyTitle: "No patients yet", emptyDesc: "Add the first one, or share the clinic link from Patients.",
    error: "We could not load the clinic's data.", retry: "Try again",
  },
  pt: {
    nav: "Início", greeting: (n) => `Olá, ${n}`, subtitle: "Este é o resumo da sua clínica.",
    quickTitle: "Acessos rápidos", newPatientDesc: "Cadastre um paciente atendido na clínica.",
    patientsTitle: "Ver pacientes", patientsDesc: "Lista, filtros e fichas dos pacientes.",
    reportDesc: "Pacientes com etapas pendentes.", phasesDesc: "Configure o protocolo fotográfico.", usersDesc: "Pessoas com acesso à clínica.",
    statsTitle: "Indicadores", totalPatients: "Pacientes no total", photos: "Fotografias registradas", thisMonth: "Cadastros este mês", professionals: "Profissionais ativos",
    recentTitle: "Pacientes recentes", seeAll: "Ver todos",
    emptyTitle: "Ainda não há pacientes", emptyDesc: "Adicione o primeiro ou compartilhe o link da clínica em Pacientes.",
    error: "Não foi possível carregar os dados da clínica.", retry: "Tentar novamente",
  },
  fr: {
    nav: "Accueil", greeting: (n) => `Bonjour, ${n}`, subtitle: "Voici le résumé de votre clinique.",
    quickTitle: "Accès rapides", newPatientDesc: "Enregistrez un patient reçu à la clinique.",
    patientsTitle: "Voir les patients", patientsDesc: "Liste, filtres et dossiers des patients.",
    reportDesc: "Patients avec des étapes en attente.", phasesDesc: "Configurez le protocole photo.", usersDesc: "Personnes ayant accès à la clinique.",
    statsTitle: "Indicateurs", totalPatients: "Patients au total", photos: "Photos enregistrées", thisMonth: "Inscriptions ce mois-ci", professionals: "Professionnels actifs",
    recentTitle: "Patients récents", seeAll: "Tout voir",
    emptyTitle: "Aucun patient pour l'instant", emptyDesc: "Ajoutez le premier ou partagez le lien de la clinique depuis Patients.",
    error: "Impossible de charger les données de la clinique.", retry: "Réessayer",
  },
  de: {
    nav: "Start", greeting: (n) => `Hallo, ${n}`, subtitle: "Das ist die Übersicht Ihrer Klinik.",
    quickTitle: "Schnellzugriff", newPatientDesc: "Einen Patienten der Klinik erfassen.",
    patientsTitle: "Patienten ansehen", patientsDesc: "Liste, Filter und Patientenakten.",
    reportDesc: "Patienten mit offenen Schritten.", phasesDesc: "Das Fotoprotokoll einrichten.", usersDesc: "Personen mit Zugang zur Klinik.",
    statsTitle: "Kennzahlen", totalPatients: "Patienten gesamt", photos: "Erfasste Fotos", thisMonth: "Neu in diesem Monat", professionals: "Aktive Fachkräfte",
    recentTitle: "Neueste Patienten", seeAll: "Alle anzeigen",
    emptyTitle: "Noch keine Patienten", emptyDesc: "Erfassen Sie den ersten oder teilen Sie den Kliniklink unter Patienten.",
    error: "Die Daten der Klinik konnten nicht geladen werden.", retry: "Erneut versuchen",
  },
  it: {
    nav: "Home", greeting: (n) => `Ciao, ${n}`, subtitle: "Ecco il riepilogo della tua clinica.",
    quickTitle: "Accessi rapidi", newPatientDesc: "Registra un paziente visitato in clinica.",
    patientsTitle: "Vedi pazienti", patientsDesc: "Elenco, filtri e schede dei pazienti.",
    reportDesc: "Pazienti con fasi in sospeso.", phasesDesc: "Configura il protocollo fotografico.", usersDesc: "Persone con accesso alla clinica.",
    statsTitle: "Indicatori", totalPatients: "Pazienti totali", photos: "Fotografie registrate", thisMonth: "Registrati questo mese", professionals: "Professionisti attivi",
    recentTitle: "Pazienti recenti", seeAll: "Vedi tutti",
    emptyTitle: "Ancora nessun paziente", emptyDesc: "Aggiungi il primo o condividi il link della clinica da Pazienti.",
    error: "Non è stato possibile caricare i dati della clinica.", retry: "Riprova",
  },
  tr: {
    nav: "Ana sayfa", greeting: (n) => `Merhaba, ${n}`, subtitle: "Kliniğinizin özeti burada.",
    quickTitle: "Hızlı erişim", newPatientDesc: "Klinikte gördüğünüz bir hastayı kaydedin.",
    patientsTitle: "Hastaları gör", patientsDesc: "Hasta listesi, filtreler ve dosyalar.",
    reportDesc: "Bekleyen aşamaları olan hastalar.", phasesDesc: "Fotoğraf protokolünü yapılandırın.", usersDesc: "Kliniğe erişimi olan kişiler.",
    statsTitle: "Göstergeler", totalPatients: "Toplam hasta", photos: "Kayıtlı fotoğraflar", thisMonth: "Bu ayki kayıtlar", professionals: "Aktif uzmanlar",
    recentTitle: "Son hastalar", seeAll: "Tümünü gör",
    emptyTitle: "Henüz hasta yok", emptyDesc: "İlk hastayı ekleyin veya Hastalar bölümünden klinik bağlantısını paylaşın.",
    error: "Klinik verileri yüklenemedi.", retry: "Tekrar dene",
  },
  ar: {
    nav: "الرئيسية", greeting: (n) => `مرحبًا، ${n}`, subtitle: "هذا ملخص عيادتك.",
    quickTitle: "وصول سريع", newPatientDesc: "سجّل مريضًا تستقبله في العيادة.",
    patientsTitle: "عرض المرضى", patientsDesc: "قائمة المرضى والتصفية والملفات.",
    reportDesc: "المرضى الذين لديهم مراحل معلّقة.", phasesDesc: "إعداد بروتوكول التصوير.", usersDesc: "الأشخاص الذين يمكنهم الوصول إلى العيادة.",
    statsTitle: "المؤشرات", totalPatients: "إجمالي المرضى", photos: "الصور المسجّلة", thisMonth: "التسجيلات هذا الشهر", professionals: "المهنيون النشطون",
    recentTitle: "أحدث المرضى", seeAll: "عرض الكل",
    emptyTitle: "لا يوجد مرضى بعد", emptyDesc: "أضف أول مريض أو شارك رابط العيادة من قسم المرضى.",
    error: "تعذّر تحميل بيانات العيادة.", retry: "إعادة المحاولة",
  },
  zh: {
    nav: "首页", greeting: (n) => `您好，${n}`, subtitle: "这是您诊所的概览。",
    quickTitle: "快捷入口", newPatientDesc: "登记在诊所就诊的患者。",
    patientsTitle: "查看患者", patientsDesc: "患者列表、筛选和档案。",
    reportDesc: "有待处理阶段的患者。", phasesDesc: "设置拍照流程。", usersDesc: "可访问诊所的人员。",
    statsTitle: "指标", totalPatients: "患者总数", photos: "已登记照片", thisMonth: "本月登记", professionals: "在职专业人员",
    recentTitle: "最近的患者", seeAll: "查看全部",
    emptyTitle: "还没有患者", emptyDesc: "添加第一位患者，或在“患者”中分享诊所链接。",
    error: "无法加载诊所数据。", retry: "重试",
  },
};

/** «hace 3 días», «3 days ago»… en el idioma elegido. */
export function timeAgo(iso: string, lang: LangCode, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  return rtf.format(Math.min(0, Math.round(seconds / 60)), "minute");
}

/** Mes calendario (en la zona horaria del navegador) en que cae una fecha. */
export function isSameMonth(iso: string, now = new Date()): boolean {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
