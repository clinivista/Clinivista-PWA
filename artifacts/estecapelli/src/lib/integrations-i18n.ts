// Textos de «Integraciones disponibles» en el panel de la clínica, en los nueve idiomas.
// Los nombres de las marcas (Facebook, Medilink…) no se traducen.
import type { LangCode } from "./language";

export const INTEGRATION_CATEGORIES = ["redes", "agenda", "mensajeria"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  medilink: "Medilink",
  agendapro: "AgendaPro",
  reservo: "Reservo",
  google_calendar: "Google Calendar",
  whatsapp: "WhatsApp",
};

export type IntegrationsText = {
  nav: string;
  title: string;
  intro: string;
  loading: string;
  loadError: string;
  categories: Record<IntegrationCategory, string>;
  categoryHints: Record<IntegrationCategory, string>;
  comingSoon: string;
  request: string;
  requested: string;
  cancelRequest: string;
  requestedNote: string;
  toastRequested: (name: string) => string;
  toastCancelled: (name: string) => string;
  cantSave: string;
  tryAgain: string;
};

export const INTEGRATIONS_TEXT: Record<LangCode, IntegrationsText> = {
  es: {
    nav: "Integraciones disponibles",
    title: "Integraciones disponibles",
    intro: "Conecta Clinivista con las herramientas que ya usa tu clínica. Aún no están activas: pide las que te interesan y te avisaremos cuando estén listas.",
    loading: "Cargando integraciones…",
    loadError: "No pudimos cargar las integraciones.",
    categories: { redes: "Redes sociales", agenda: "Sistemas de agenda", mensajeria: "Mensajería" },
    categoryHints: {
      redes: "Comparte contenido y resultados autorizados por tus pacientes.",
      agenda: "Sincroniza pacientes y citas para no digitar dos veces.",
      mensajeria: "Envía recordatorios y enlaces de control por mensaje.",
    },
    comingSoon: "Próximamente",
    request: "Solicitar integración",
    requested: "Solicitada",
    cancelRequest: "Quitar solicitud",
    requestedNote: "Registramos tu interés.",
    toastRequested: (name) => `Solicitaste la integración con ${name}`,
    toastCancelled: (name) => `Quitaste la solicitud de ${name}`,
    cantSave: "No pudimos guardar tu solicitud",
    tryAgain: "Inténtalo de nuevo.",
  },
  en: {
    nav: "Available integrations",
    title: "Available integrations",
    intro: "Connect Clinivista with the tools your clinic already uses. They are not active yet: request the ones you want and we will let you know when they are ready.",
    loading: "Loading integrations…",
    loadError: "We could not load the integrations.",
    categories: { redes: "Social networks", agenda: "Scheduling systems", mensajeria: "Messaging" },
    categoryHints: {
      redes: "Share content and results your patients have authorised.",
      agenda: "Sync patients and appointments so you never type them twice.",
      mensajeria: "Send reminders and follow-up links by message.",
    },
    comingSoon: "Coming soon",
    request: "Request integration",
    requested: "Requested",
    cancelRequest: "Remove request",
    requestedNote: "We have noted your interest.",
    toastRequested: (name) => `You requested the ${name} integration`,
    toastCancelled: (name) => `You removed the ${name} request`,
    cantSave: "We could not save your request",
    tryAgain: "Please try again.",
  },
  pt: {
    nav: "Integrações disponíveis",
    title: "Integrações disponíveis",
    intro: "Conecte o Clinivista às ferramentas que a sua clínica já usa. Ainda não estão ativas: peça as que lhe interessam e avisaremos quando estiverem prontas.",
    loading: "Carregando integrações…",
    loadError: "Não foi possível carregar as integrações.",
    categories: { redes: "Redes sociais", agenda: "Sistemas de agenda", mensajeria: "Mensagens" },
    categoryHints: {
      redes: "Compartilhe conteúdo e resultados autorizados pelos seus pacientes.",
      agenda: "Sincronize pacientes e consultas para não digitar duas vezes.",
      mensajeria: "Envie lembretes e links de acompanhamento por mensagem.",
    },
    comingSoon: "Em breve",
    request: "Solicitar integração",
    requested: "Solicitada",
    cancelRequest: "Remover solicitação",
    requestedNote: "Registramos o seu interesse.",
    toastRequested: (name) => `Você solicitou a integração com ${name}`,
    toastCancelled: (name) => `Você removeu a solicitação de ${name}`,
    cantSave: "Não foi possível salvar a sua solicitação",
    tryAgain: "Tente novamente.",
  },
  fr: {
    nav: "Intégrations disponibles",
    title: "Intégrations disponibles",
    intro: "Connectez Clinivista aux outils que votre clinique utilise déjà. Elles ne sont pas encore actives : demandez celles qui vous intéressent et nous vous préviendrons dès qu'elles seront prêtes.",
    loading: "Chargement des intégrations…",
    loadError: "Impossible de charger les intégrations.",
    categories: { redes: "Réseaux sociaux", agenda: "Systèmes de rendez-vous", mensajeria: "Messagerie" },
    categoryHints: {
      redes: "Partagez les contenus et résultats autorisés par vos patients.",
      agenda: "Synchronisez patients et rendez-vous pour ne pas saisir deux fois.",
      mensajeria: "Envoyez des rappels et des liens de suivi par message.",
    },
    comingSoon: "Bientôt disponible",
    request: "Demander l'intégration",
    requested: "Demandée",
    cancelRequest: "Retirer la demande",
    requestedNote: "Nous avons enregistré votre intérêt.",
    toastRequested: (name) => `Vous avez demandé l'intégration avec ${name}`,
    toastCancelled: (name) => `Vous avez retiré la demande pour ${name}`,
    cantSave: "Impossible d'enregistrer votre demande",
    tryAgain: "Veuillez réessayer.",
  },
  de: {
    nav: "Verfügbare Integrationen",
    title: "Verfügbare Integrationen",
    intro: "Verbinden Sie Clinivista mit den Werkzeugen, die Ihre Klinik bereits nutzt. Sie sind noch nicht aktiv: Fordern Sie die gewünschten an, und wir melden uns, sobald sie bereit sind.",
    loading: "Integrationen werden geladen…",
    loadError: "Die Integrationen konnten nicht geladen werden.",
    categories: { redes: "Soziale Netzwerke", agenda: "Terminsysteme", mensajeria: "Nachrichten" },
    categoryHints: {
      redes: "Teilen Sie Inhalte und Ergebnisse, die Ihre Patienten freigegeben haben.",
      agenda: "Gleichen Sie Patienten und Termine ab, damit nichts doppelt erfasst wird.",
      mensajeria: "Senden Sie Erinnerungen und Kontrolllinks per Nachricht.",
    },
    comingSoon: "Demnächst",
    request: "Integration anfordern",
    requested: "Angefordert",
    cancelRequest: "Anfrage zurückziehen",
    requestedNote: "Wir haben Ihr Interesse vermerkt.",
    toastRequested: (name) => `Sie haben die Integration mit ${name} angefordert`,
    toastCancelled: (name) => `Sie haben die Anfrage für ${name} zurückgezogen`,
    cantSave: "Ihre Anfrage konnte nicht gespeichert werden",
    tryAgain: "Bitte versuchen Sie es erneut.",
  },
  it: {
    nav: "Integrazioni disponibili",
    title: "Integrazioni disponibili",
    intro: "Collega Clinivista agli strumenti che la tua clinica usa già. Non sono ancora attive: richiedi quelle che ti interessano e ti avviseremo quando saranno pronte.",
    loading: "Caricamento delle integrazioni…",
    loadError: "Impossibile caricare le integrazioni.",
    categories: { redes: "Social network", agenda: "Sistemi di agenda", mensajeria: "Messaggistica" },
    categoryHints: {
      redes: "Condividi contenuti e risultati autorizzati dai tuoi pazienti.",
      agenda: "Sincronizza pazienti e appuntamenti per non inserirli due volte.",
      mensajeria: "Invia promemoria e link di controllo tramite messaggio.",
    },
    comingSoon: "Prossimamente",
    request: "Richiedi integrazione",
    requested: "Richiesta",
    cancelRequest: "Rimuovi richiesta",
    requestedNote: "Abbiamo registrato il tuo interesse.",
    toastRequested: (name) => `Hai richiesto l'integrazione con ${name}`,
    toastCancelled: (name) => `Hai rimosso la richiesta per ${name}`,
    cantSave: "Impossibile salvare la tua richiesta",
    tryAgain: "Riprova.",
  },
  tr: {
    nav: "Kullanılabilir entegrasyonlar",
    title: "Kullanılabilir entegrasyonlar",
    intro: "Clinivista'yı kliniğinizin zaten kullandığı araçlara bağlayın. Henüz etkin değiller: ilginizi çekenleri talep edin, hazır olduklarında sizi bilgilendirelim.",
    loading: "Entegrasyonlar yükleniyor…",
    loadError: "Entegrasyonlar yüklenemedi.",
    categories: { redes: "Sosyal ağlar", agenda: "Randevu sistemleri", mensajeria: "Mesajlaşma" },
    categoryHints: {
      redes: "Hastalarınızın izin verdiği içerik ve sonuçları paylaşın.",
      agenda: "Hasta ve randevuları eşitleyin, iki kez girmeyin.",
      mensajeria: "Hatırlatmaları ve kontrol bağlantılarını mesajla gönderin.",
    },
    comingSoon: "Yakında",
    request: "Entegrasyon talep et",
    requested: "Talep edildi",
    cancelRequest: "Talebi kaldır",
    requestedNote: "İlginizi kaydettik.",
    toastRequested: (name) => `${name} entegrasyonunu talep ettiniz`,
    toastCancelled: (name) => `${name} talebini kaldırdınız`,
    cantSave: "Talebiniz kaydedilemedi",
    tryAgain: "Lütfen tekrar deneyin.",
  },
  ar: {
    nav: "التكاملات المتاحة",
    title: "التكاملات المتاحة",
    intro: "اربط Clinivista بالأدوات التي تستخدمها عيادتك بالفعل. لم يتم تفعيلها بعد: اطلب ما يهمك وسنُعلمك عندما تصبح جاهزة.",
    loading: "جارٍ تحميل التكاملات…",
    loadError: "تعذّر تحميل التكاملات.",
    categories: { redes: "الشبكات الاجتماعية", agenda: "أنظمة المواعيد", mensajeria: "المراسلة" },
    categoryHints: {
      redes: "شارك المحتوى والنتائج التي أذن بها مرضاك.",
      agenda: "زامن المرضى والمواعيد لتجنب الإدخال مرتين.",
      mensajeria: "أرسل التذكيرات وروابط المتابعة عبر الرسائل.",
    },
    comingSoon: "قريبًا",
    request: "طلب التكامل",
    requested: "تم الطلب",
    cancelRequest: "إلغاء الطلب",
    requestedNote: "سجّلنا اهتمامك.",
    toastRequested: (name) => `لقد طلبت التكامل مع ${name}`,
    toastCancelled: (name) => `لقد ألغيت طلب ${name}`,
    cantSave: "تعذّر حفظ طلبك",
    tryAgain: "حاول مرة أخرى.",
  },
  zh: {
    nav: "可用集成",
    title: "可用集成",
    intro: "将 Clinivista 与您诊所已在使用的工具连接起来。这些集成尚未启用：请申请您感兴趣的项目，准备就绪后我们会通知您。",
    loading: "正在加载集成…",
    loadError: "无法加载集成。",
    categories: { redes: "社交网络", agenda: "预约系统", mensajeria: "消息" },
    categoryHints: {
      redes: "分享患者已授权的内容和结果。",
      agenda: "同步患者和预约，避免重复录入。",
      mensajeria: "通过消息发送提醒和复查链接。",
    },
    comingSoon: "即将推出",
    request: "申请集成",
    requested: "已申请",
    cancelRequest: "撤销申请",
    requestedNote: "我们已记录您的意向。",
    toastRequested: (name) => `您已申请与 ${name} 的集成`,
    toastCancelled: (name) => `您已撤销对 ${name} 的申请`,
    cantSave: "无法保存您的申请",
    tryAgain: "请重试。",
  },
};
