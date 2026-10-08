// Textos de clinivista.cl en los nueve idiomas del producto (árabe se muestra de derecha a izquierda).
export const LANGS = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "tr", name: "Türkçe" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
] as const;
export type LangCode = (typeof LANGS)[number]["code"];

export type Copy = {
  title: string;
  description: string;
  nav: [string, string, string]; // producto, especialidades, seguridad
  login: string;
  demo: string;
  learn: string;
  menu: string;
  h1: string;
  sub: string;
  features: [[string, string], [string, string], [string, string]];
  steps: [[string, string], [string, string], [string, string], [string, string], [string, string]];
  specTitle: string;
  specSub: string;
  available: string;
  soon: string;
  spec: Record<string, [string, string]>;
  security: [string, string, string];
  demoTitle: string;
  demoText: string;
  demoCta: string;
  demoSubject: string;
  rights: string;
  secure: string;
  timeline: string;
  example: string;
  initial: string;
  control: string;
  next: string;
  schedule: string;
  history: string;
  guided: string;
  frontal: string;
  tip: string;
  by: string;
  language: string;
};

export const COPY: Record<LangCode, Copy> = {
  es: {
    title: "Clinivista — Registro fotográfico clínico para cada especialidad",
    description: "Clinivista digitaliza la preevaluación fotográfica de pacientes para clínicas de múltiples especialidades: enlace seguro, consentimiento, fotos guiadas y revisión médica antes de agendar.",
    nav: ["Producto", "Especialidades", "Seguridad"],
    login: "Iniciar sesión", demo: "Solicitar demo", learn: "Conocer el producto", menu: "Abrir menú",
    h1: "Registro fotográfico clínico para cada especialidad",
    sub: "Protocolos guiados, controles y revisión humana.",
    features: [["Seguro y conforme", "Datos protegidos con consentimiento explícito."], ["Multi-centro y multi-especialidad", "Cada clínica ve solo a sus pacientes."], ["Siempre disponible", "Accede de forma segura desde cualquier lugar."]],
    steps: [["Enlace seguro", "El paciente recibe un enlace único de su clínica."], ["Consentimiento", "El paciente otorga su consentimiento explícito."], ["Fotos guiadas", "El paciente toma las fotos siguiendo el protocolo."], ["Revisión humana", "Un profesional revisa, valida y añade notas."], ["Controles", "Seguimiento estructurado y trazable en el tiempo."]],
    specTitle: "Una plataforma, cada especialidad",
    specSub: "Cada especialidad tiene su propio protocolo de fotos y preguntas clínicas. Hoy Capilar está en operación con nuestra clínica piloto; el resto se va habilitando por fases.",
    available: "Disponible", soon: "Próximamente",
    spec: { capilar: ["Capilar", "Alopecia y control evolutivo"], dermatologico: ["Dermatología", "Lesiones y seguimiento"], estetico: ["Medicina estética", "Antes, después y controles"], plastico: ["Cirugía plástica", "Registro pre y posoperatorio"], dental: ["Odontología", "Sonrisa y evolución"], heridas: ["Heridas y pie diabético", "Seguimiento seriado"], vascular: ["Flebología", "Venas y resultados"], movimiento: ["Rehabilitación", "Postura y movilidad"], oculofacial: ["Oculoplastia", "Simetría y recuperación"] },
    security: ["Datos protegidos", "Consentimiento explícito", "Acceso por roles"],
    demoTitle: "Solicita una demo para tu clínica",
    demoText: "Cuéntanos tu especialidad y te mostramos cómo se vería el protocolo de preevaluación para tus pacientes.",
    demoCta: "Escribir a", demoSubject: "Quiero una demo de Clinivista",
    rights: "Todos los derechos reservados.", secure: "Conexión segura", timeline: "Línea de tiempo clínica", example: "Ejemplo",
    initial: "Consulta inicial", control: "Control", next: "Próximo control", schedule: "Programar", history: "Ver historial completo",
    guided: "Fotos guiadas", frontal: "Frontal", tip: "Mantén el rostro centrado y buena iluminación.", by: "Revisado por el equipo médico", language: "Idioma",
  },
  en: {
    title: "Clinivista — Clinical photo records for every specialty",
    description: "Clinivista digitizes photo-based patient pre-evaluation for multi-specialty clinics: secure link, consent, guided photos and medical review before scheduling.",
    nav: ["Product", "Specialties", "Security"],
    login: "Sign in", demo: "Request a demo", learn: "Learn about the product", menu: "Open menu",
    h1: "Clinical photo records for every specialty",
    sub: "Guided protocols, follow-ups and human review.",
    features: [["Secure and compliant", "Protected data with explicit consent."], ["Multi-center, multi-specialty", "Each clinic sees only its own patients."], ["Always available", "Access securely from anywhere."]],
    steps: [["Secure link", "The patient receives a unique link from their clinic."], ["Consent", "The patient gives explicit consent."], ["Guided photos", "The patient takes the photos following the protocol."], ["Human review", "A professional reviews, validates and adds notes."], ["Follow-ups", "Structured, traceable follow-up over time."]],
    specTitle: "One platform, every specialty",
    specSub: "Each specialty has its own photo protocol and clinical questions. Today Hair is live with our pilot clinic; the rest are being enabled in phases.",
    available: "Available", soon: "Coming soon",
    spec: { capilar: ["Hair", "Alopecia and progress tracking"], dermatologico: ["Dermatology", "Lesions and follow-up"], estetico: ["Aesthetic medicine", "Before, after and follow-ups"], plastico: ["Plastic surgery", "Pre- and post-operative records"], dental: ["Dentistry", "Smile and progress"], heridas: ["Wounds and diabetic foot", "Serial follow-up"], vascular: ["Phlebology", "Veins and outcomes"], movimiento: ["Rehabilitation", "Posture and mobility"], oculofacial: ["Oculoplastics", "Symmetry and recovery"] },
    security: ["Protected data", "Explicit consent", "Role-based access"],
    demoTitle: "Request a demo for your clinic",
    demoText: "Tell us your specialty and we will show you what the pre-evaluation protocol would look like for your patients.",
    demoCta: "Write to", demoSubject: "I would like a Clinivista demo",
    rights: "All rights reserved.", secure: "Secure connection", timeline: "Clinical timeline", example: "Example",
    initial: "Initial consultation", control: "Follow-up", next: "Next follow-up", schedule: "Schedule", history: "View full history",
    guided: "Guided photos", frontal: "Front", tip: "Keep your face centered with good lighting.", by: "Reviewed by the medical team", language: "Language",
  },
  pt: {
    title: "Clinivista — Registro fotográfico clínico para cada especialidade",
    description: "A Clinivista digitaliza a pré-avaliação fotográfica de pacientes para clínicas de várias especialidades: link seguro, consentimento, fotos guiadas e revisão médica antes de agendar.",
    nav: ["Produto", "Especialidades", "Segurança"],
    login: "Entrar", demo: "Solicitar demo", learn: "Conhecer o produto", menu: "Abrir menu",
    h1: "Registro fotográfico clínico para cada especialidade",
    sub: "Protocolos guiados, retornos e revisão humana.",
    features: [["Seguro e em conformidade", "Dados protegidos com consentimento explícito."], ["Multicentro e multiespecialidade", "Cada clínica vê apenas seus pacientes."], ["Sempre disponível", "Acesse com segurança de qualquer lugar."]],
    steps: [["Link seguro", "O paciente recebe um link único da sua clínica."], ["Consentimento", "O paciente dá seu consentimento explícito."], ["Fotos guiadas", "O paciente tira as fotos seguindo o protocolo."], ["Revisão humana", "Um profissional revisa, valida e adiciona notas."], ["Retornos", "Acompanhamento estruturado e rastreável ao longo do tempo."]],
    specTitle: "Uma plataforma, cada especialidade",
    specSub: "Cada especialidade tem seu próprio protocolo de fotos e perguntas clínicas. Hoje a área Capilar está em operação com nossa clínica piloto; as demais serão habilitadas por fases.",
    available: "Disponível", soon: "Em breve",
    spec: { capilar: ["Capilar", "Alopecia e acompanhamento"], dermatologico: ["Dermatologia", "Lesões e acompanhamento"], estetico: ["Medicina estética", "Antes, depois e retornos"], plastico: ["Cirurgia plástica", "Registro pré e pós-operatório"], dental: ["Odontologia", "Sorriso e evolução"], heridas: ["Feridas e pé diabético", "Acompanhamento seriado"], vascular: ["Flebologia", "Veias e resultados"], movimiento: ["Reabilitação", "Postura e mobilidade"], oculofacial: ["Oculoplastia", "Simetria e recuperação"] },
    security: ["Dados protegidos", "Consentimento explícito", "Acesso por perfis"],
    demoTitle: "Solicite uma demo para sua clínica",
    demoText: "Conte-nos sua especialidade e mostraremos como seria o protocolo de pré-avaliação para seus pacientes.",
    demoCta: "Escrever para", demoSubject: "Quero uma demo da Clinivista",
    rights: "Todos os direitos reservados.", secure: "Conexão segura", timeline: "Linha do tempo clínica", example: "Exemplo",
    initial: "Consulta inicial", control: "Retorno", next: "Próximo retorno", schedule: "Agendar", history: "Ver histórico completo",
    guided: "Fotos guiadas", frontal: "Frontal", tip: "Mantenha o rosto centralizado e com boa iluminação.", by: "Revisado pela equipe médica", language: "Idioma",
  },
  fr: {
    title: "Clinivista — Dossier photographique clinique pour chaque spécialité",
    description: "Clinivista numérise la préévaluation photographique des patients pour les cliniques multispécialités : lien sécurisé, consentement, photos guidées et revue médicale avant la prise de rendez-vous.",
    nav: ["Produit", "Spécialités", "Sécurité"],
    login: "Se connecter", demo: "Demander une démo", learn: "Découvrir le produit", menu: "Ouvrir le menu",
    h1: "Dossier photographique clinique pour chaque spécialité",
    sub: "Protocoles guidés, suivis et revue humaine.",
    features: [["Sûr et conforme", "Données protégées avec consentement explicite."], ["Multicentre et multispécialité", "Chaque clinique ne voit que ses patients."], ["Toujours disponible", "Accédez-y en toute sécurité de n'importe où."]],
    steps: [["Lien sécurisé", "Le patient reçoit un lien unique de sa clinique."], ["Consentement", "Le patient donne son consentement explicite."], ["Photos guidées", "Le patient prend les photos en suivant le protocole."], ["Revue humaine", "Un professionnel examine, valide et ajoute des notes."], ["Suivis", "Suivi structuré et traçable dans le temps."]],
    specTitle: "Une plateforme, chaque spécialité",
    specSub: "Chaque spécialité a son propre protocole de photos et ses questions cliniques. Aujourd'hui, la spécialité Capillaire est en service avec notre clinique pilote ; les autres seront activées par étapes.",
    available: "Disponible", soon: "Bientôt",
    spec: { capilar: ["Capillaire", "Alopécie et suivi d'évolution"], dermatologico: ["Dermatologie", "Lésions et suivi"], estetico: ["Médecine esthétique", "Avant, après et suivis"], plastico: ["Chirurgie plastique", "Dossier pré et postopératoire"], dental: ["Dentisterie", "Sourire et évolution"], heridas: ["Plaies et pied diabétique", "Suivi en série"], vascular: ["Phlébologie", "Veines et résultats"], movimiento: ["Rééducation", "Posture et mobilité"], oculofacial: ["Oculoplastie", "Symétrie et récupération"] },
    security: ["Données protégées", "Consentement explicite", "Accès par rôles"],
    demoTitle: "Demandez une démo pour votre clinique",
    demoText: "Dites-nous votre spécialité et nous vous montrerons à quoi ressemblerait le protocole de préévaluation pour vos patients.",
    demoCta: "Écrire à", demoSubject: "Je souhaite une démo de Clinivista",
    rights: "Tous droits réservés.", secure: "Connexion sécurisée", timeline: "Chronologie clinique", example: "Exemple",
    initial: "Consultation initiale", control: "Suivi", next: "Prochain suivi", schedule: "Planifier", history: "Voir l'historique complet",
    guided: "Photos guidées", frontal: "Face", tip: "Gardez le visage centré avec un bon éclairage.", by: "Revu par l'équipe médicale", language: "Langue",
  },
  de: {
    title: "Clinivista — Klinische Fotodokumentation für jede Fachrichtung",
    description: "Clinivista digitalisiert die fotobasierte Voruntersuchung von Patienten für Kliniken mit mehreren Fachrichtungen: sicherer Link, Einwilligung, geführte Fotos und ärztliche Prüfung vor der Terminvergabe.",
    nav: ["Produkt", "Fachrichtungen", "Sicherheit"],
    login: "Anmelden", demo: "Demo anfragen", learn: "Produkt kennenlernen", menu: "Menü öffnen",
    h1: "Klinische Fotodokumentation für jede Fachrichtung",
    sub: "Geführte Protokolle, Kontrollen und menschliche Prüfung.",
    features: [["Sicher und konform", "Geschützte Daten mit ausdrücklicher Einwilligung."], ["Mehrere Standorte und Fachrichtungen", "Jede Klinik sieht nur ihre eigenen Patienten."], ["Immer verfügbar", "Von überall sicher zugreifen."]],
    steps: [["Sicherer Link", "Der Patient erhält einen einmaligen Link seiner Klinik."], ["Einwilligung", "Der Patient erteilt seine ausdrückliche Einwilligung."], ["Geführte Fotos", "Der Patient macht die Fotos nach dem Protokoll."], ["Menschliche Prüfung", "Eine Fachperson prüft, bestätigt und ergänzt Notizen."], ["Kontrollen", "Strukturierte, nachvollziehbare Verlaufskontrolle."]],
    specTitle: "Eine Plattform, jede Fachrichtung",
    specSub: "Jede Fachrichtung hat ein eigenes Fotoprotokoll und eigene klinische Fragen. Heute ist Haar mit unserer Pilotklinik im Einsatz; die übrigen werden schrittweise freigeschaltet.",
    available: "Verfügbar", soon: "Demnächst",
    spec: { capilar: ["Haar", "Haarausfall und Verlauf"], dermatologico: ["Dermatologie", "Läsionen und Verlauf"], estetico: ["Ästhetische Medizin", "Vorher, nachher und Kontrollen"], plastico: ["Plastische Chirurgie", "Prä- und postoperative Dokumentation"], dental: ["Zahnmedizin", "Lächeln und Verlauf"], heridas: ["Wunden und diabetischer Fuß", "Serielle Verlaufskontrolle"], vascular: ["Phlebologie", "Venen und Ergebnisse"], movimiento: ["Rehabilitation", "Haltung und Beweglichkeit"], oculofacial: ["Oculoplastik", "Symmetrie und Erholung"] },
    security: ["Geschützte Daten", "Ausdrückliche Einwilligung", "Rollenbasierter Zugriff"],
    demoTitle: "Demo für Ihre Klinik anfragen",
    demoText: "Nennen Sie uns Ihre Fachrichtung, und wir zeigen Ihnen, wie das Voruntersuchungsprotokoll für Ihre Patienten aussehen würde.",
    demoCta: "Schreiben an", demoSubject: "Ich möchte eine Clinivista-Demo",
    rights: "Alle Rechte vorbehalten.", secure: "Sichere Verbindung", timeline: "Klinischer Verlauf", example: "Beispiel",
    initial: "Erstberatung", control: "Kontrolle", next: "Nächste Kontrolle", schedule: "Planen", history: "Gesamten Verlauf ansehen",
    guided: "Geführte Fotos", frontal: "Frontal", tip: "Halten Sie das Gesicht mittig und sorgen Sie für gutes Licht.", by: "Vom medizinischen Team geprüft", language: "Sprache",
  },
  it: {
    title: "Clinivista — Documentazione fotografica clinica per ogni specialità",
    description: "Clinivista digitalizza la pre-valutazione fotografica dei pazienti per cliniche multispecialistiche: link sicuro, consenso, foto guidate e revisione medica prima di fissare l'appuntamento.",
    nav: ["Prodotto", "Specialità", "Sicurezza"],
    login: "Accedi", demo: "Richiedi una demo", learn: "Scopri il prodotto", menu: "Apri il menu",
    h1: "Documentazione fotografica clinica per ogni specialità",
    sub: "Protocolli guidati, controlli e revisione umana.",
    features: [["Sicuro e conforme", "Dati protetti con consenso esplicito."], ["Multicentro e multispecialità", "Ogni clinica vede solo i propri pazienti."], ["Sempre disponibile", "Accedi in sicurezza da qualsiasi luogo."]],
    steps: [["Link sicuro", "Il paziente riceve un link unico dalla sua clinica."], ["Consenso", "Il paziente dà il proprio consenso esplicito."], ["Foto guidate", "Il paziente scatta le foto seguendo il protocollo."], ["Revisione umana", "Un professionista rivede, convalida e aggiunge note."], ["Controlli", "Monitoraggio strutturato e tracciabile nel tempo."]],
    specTitle: "Una piattaforma, ogni specialità",
    specSub: "Ogni specialità ha il proprio protocollo fotografico e le proprie domande cliniche. Oggi Capelli è operativa con la nostra clinica pilota; le altre vengono abilitate per fasi.",
    available: "Disponibile", soon: "Prossimamente",
    spec: { capilar: ["Capelli", "Alopecia e controllo dell'evoluzione"], dermatologico: ["Dermatologia", "Lesioni e follow-up"], estetico: ["Medicina estetica", "Prima, dopo e controlli"], plastico: ["Chirurgia plastica", "Documentazione pre e post-operatoria"], dental: ["Odontoiatria", "Sorriso ed evoluzione"], heridas: ["Ferite e piede diabetico", "Monitoraggio seriale"], vascular: ["Flebologia", "Vene e risultati"], movimiento: ["Riabilitazione", "Postura e mobilità"], oculofacial: ["Oculoplastica", "Simmetria e recupero"] },
    security: ["Dati protetti", "Consenso esplicito", "Accesso per ruoli"],
    demoTitle: "Richiedi una demo per la tua clinica",
    demoText: "Dicci la tua specialità e ti mostreremo come sarebbe il protocollo di pre-valutazione per i tuoi pazienti.",
    demoCta: "Scrivi a", demoSubject: "Vorrei una demo di Clinivista",
    rights: "Tutti i diritti riservati.", secure: "Connessione sicura", timeline: "Cronologia clinica", example: "Esempio",
    initial: "Prima visita", control: "Controllo", next: "Prossimo controllo", schedule: "Pianifica", history: "Vedi la cronologia completa",
    guided: "Foto guidate", frontal: "Frontale", tip: "Tieni il viso centrato e ben illuminato.", by: "Rivisto dal team medico", language: "Lingua",
  },
  tr: {
    title: "Clinivista — Her uzmanlık alanı için klinik fotoğraf kaydı",
    description: "Clinivista, çok uzmanlık alanlı klinikler için fotoğraf tabanlı hasta ön değerlendirmesini dijitalleştirir: güvenli bağlantı, onam, yönlendirmeli fotoğraflar ve randevudan önce tıbbi inceleme.",
    nav: ["Ürün", "Uzmanlık alanları", "Güvenlik"],
    login: "Giriş yap", demo: "Demo talep et", learn: "Ürünü keşfet", menu: "Menüyü aç",
    h1: "Her uzmanlık alanı için klinik fotoğraf kaydı",
    sub: "Yönlendirmeli protokoller, kontroller ve insan incelemesi.",
    features: [["Güvenli ve uyumlu", "Açık onamla korunan veriler."], ["Çok merkezli, çok uzmanlıklı", "Her klinik yalnızca kendi hastalarını görür."], ["Her zaman erişilebilir", "Her yerden güvenle erişin."]],
    steps: [["Güvenli bağlantı", "Hasta, kliniğinden benzersiz bir bağlantı alır."], ["Onam", "Hasta açık onamını verir."], ["Yönlendirmeli fotoğraflar", "Hasta fotoğrafları protokole göre çeker."], ["İnsan incelemesi", "Bir uzman inceler, doğrular ve not ekler."], ["Kontroller", "Zaman içinde yapılandırılmış, izlenebilir takip."]],
    specTitle: "Tek platform, her uzmanlık alanı",
    specSub: "Her uzmanlık alanının kendi fotoğraf protokolü ve klinik soruları vardır. Bugün Saç alanı pilot kliniğimizle çalışıyor; diğerleri aşamalı olarak açılıyor.",
    available: "Kullanılabilir", soon: "Yakında",
    spec: { capilar: ["Saç", "Alopesi ve gelişim takibi"], dermatologico: ["Dermatoloji", "Lezyonlar ve takip"], estetico: ["Estetik tıp", "Öncesi, sonrası ve kontroller"], plastico: ["Plastik cerrahi", "Ameliyat öncesi ve sonrası kayıt"], dental: ["Diş hekimliği", "Gülüş ve gelişim"], heridas: ["Yaralar ve diyabetik ayak", "Seri takip"], vascular: ["Fleboloji", "Damarlar ve sonuçlar"], movimiento: ["Rehabilitasyon", "Duruş ve hareketlilik"], oculofacial: ["Oküloplasti", "Simetri ve iyileşme"] },
    security: ["Korunan veriler", "Açık onam", "Role göre erişim"],
    demoTitle: "Kliniğiniz için demo talep edin",
    demoText: "Uzmanlık alanınızı söyleyin; hastalarınız için ön değerlendirme protokolünün nasıl görüneceğini gösterelim.",
    demoCta: "Yazın:", demoSubject: "Clinivista demosu istiyorum",
    rights: "Tüm hakları saklıdır.", secure: "Güvenli bağlantı", timeline: "Klinik zaman çizelgesi", example: "Örnek",
    initial: "İlk muayene", control: "Kontrol", next: "Sonraki kontrol", schedule: "Planla", history: "Tüm geçmişi gör",
    guided: "Yönlendirmeli fotoğraflar", frontal: "Önden", tip: "Yüzünüzü ortalayın ve iyi aydınlatın.", by: "Tıbbi ekip tarafından incelendi", language: "Dil",
  },
  ar: {
    title: "كلينفيستا — توثيق سريري بالصور لكل تخصص",
    description: "تقوم كلينفيستا برقمنة التقييم المسبق للمرضى بالصور للعيادات متعددة التخصصات: رابط آمن وموافقة وصور موجَّهة ومراجعة طبية قبل تحديد الموعد.",
    nav: ["المنتج", "التخصصات", "الأمان"],
    login: "تسجيل الدخول", demo: "اطلب عرضًا تجريبيًا", learn: "تعرّف على المنتج", menu: "فتح القائمة",
    h1: "توثيق سريري بالصور لكل تخصص",
    sub: "بروتوكولات موجَّهة ومتابعات ومراجعة بشرية.",
    features: [["آمن وملتزم", "بيانات محمية بموافقة صريحة."], ["متعدد المراكز والتخصصات", "كل عيادة ترى مرضاها فقط."], ["متاح دائمًا", "ادخل بأمان من أي مكان."]],
    steps: [["رابط آمن", "يتلقى المريض رابطًا فريدًا من عيادته."], ["الموافقة", "يمنح المريض موافقته الصريحة."], ["صور موجَّهة", "يلتقط المريض الصور وفق البروتوكول."], ["مراجعة بشرية", "يراجع مختص ويعتمد ويضيف ملاحظات."], ["المتابعات", "متابعة منظمة وقابلة للتتبع عبر الزمن."]],
    specTitle: "منصة واحدة، لكل تخصص",
    specSub: "لكل تخصص بروتوكول صور وأسئلة سريرية خاصة به. اليوم يعمل تخصص الشعر مع عيادتنا التجريبية، وتُفعَّل بقية التخصصات على مراحل.",
    available: "متاح", soon: "قريبًا",
    spec: { capilar: ["الشعر", "الصلع ومتابعة التطور"], dermatologico: ["الأمراض الجلدية", "الآفات والمتابعة"], estetico: ["الطب التجميلي", "قبل وبعد والمتابعات"], plastico: ["الجراحة التجميلية", "توثيق قبل الجراحة وبعدها"], dental: ["طب الأسنان", "الابتسامة والتطور"], heridas: ["الجروح والقدم السكرية", "متابعة متسلسلة"], vascular: ["أمراض الأوردة", "الأوردة والنتائج"], movimiento: ["إعادة التأهيل", "الوضعية والحركة"], oculofacial: ["جراحة العين التجميلية", "التناسق والتعافي"] },
    security: ["بيانات محمية", "موافقة صريحة", "وصول حسب الأدوار"],
    demoTitle: "اطلب عرضًا تجريبيًا لعيادتك",
    demoText: "أخبرنا بتخصصك وسنُريك كيف سيبدو بروتوكول التقييم المسبق لمرضاك.",
    demoCta: "راسلنا على", demoSubject: "أرغب في عرض تجريبي لكلينفيستا",
    rights: "جميع الحقوق محفوظة.", secure: "اتصال آمن", timeline: "الخط الزمني السريري", example: "مثال",
    initial: "الاستشارة الأولى", control: "متابعة", next: "المتابعة القادمة", schedule: "جدولة", history: "عرض السجل الكامل",
    guided: "صور موجَّهة", frontal: "أمامية", tip: "حافظ على وجهك في المنتصف مع إضاءة جيدة.", by: "راجعه الفريق الطبي", language: "اللغة",
  },
  zh: {
    title: "Clinivista — 适用于各专科的临床照片记录",
    description: "Clinivista 为多专科诊所实现基于照片的患者预评估数字化：安全链接、知情同意、引导式拍照，以及预约前的医生审核。",
    nav: ["产品", "专科", "安全"],
    login: "登录", demo: "申请演示", learn: "了解产品", menu: "打开菜单",
    h1: "适用于各专科的临床照片记录",
    sub: "引导式流程、复查与人工审核。",
    features: [["安全合规", "数据受保护，并取得明确同意。"], ["多中心、多专科", "每家诊所只能看到自己的患者。"], ["随时可用", "随时随地安全访问。"]],
    steps: [["安全链接", "患者收到来自其诊所的专属链接。"], ["知情同意", "患者给予明确的同意。"], ["引导式拍照", "患者按照流程拍摄照片。"], ["人工审核", "专业人员审核、确认并添加备注。"], ["复查", "结构化、可追溯的长期随访。"]],
    specTitle: "一个平台，涵盖每个专科",
    specSub: "每个专科都有自己的拍照流程和临床问题。目前毛发专科已在试点诊所运行，其余专科将分阶段开放。",
    available: "已上线", soon: "即将推出",
    spec: { capilar: ["毛发", "脱发与变化跟踪"], dermatologico: ["皮肤科", "皮损与随访"], estetico: ["医疗美容", "术前、术后与复查"], plastico: ["整形外科", "术前术后记录"], dental: ["口腔科", "笑容与变化"], heridas: ["伤口与糖尿病足", "连续随访"], vascular: ["静脉学", "静脉与结果"], movimiento: ["康复", "姿势与活动能力"], oculofacial: ["眼整形", "对称与恢复"] },
    security: ["数据受保护", "明确同意", "按角色授权访问"],
    demoTitle: "为您的诊所申请演示",
    demoText: "告诉我们您的专科，我们将向您展示面向患者的预评估流程是什么样子。",
    demoCta: "发邮件至", demoSubject: "我想了解 Clinivista 演示",
    rights: "版权所有。", secure: "安全连接", timeline: "临床时间线", example: "示例",
    initial: "初诊", control: "复查", next: "下次复查", schedule: "安排", history: "查看完整记录",
    guided: "引导式拍照", frontal: "正面", tip: "保持面部居中，光线良好。", by: "已由医疗团队审核", language: "语言",
  },
};

export function initialLang(): LangCode {
  try {
    const saved = localStorage.getItem("clinivista_lang");
    if (saved && saved in COPY) return saved as LangCode;
  } catch { /* storage unavailable */ }
  const guess = (typeof navigator !== "undefined" ? navigator.language : "es").slice(0, 2).toLowerCase();
  return guess in COPY ? (guess as LangCode) : "es";
}
