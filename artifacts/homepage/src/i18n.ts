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

type Pair = [string, string];

export type Copy = {
  title: string;
  description: string;
  skip: string;
  nav: { home: string; features: string; specialties: string; security: string; contact: string; plans: string; resources: string };
  login: string;
  demo: string;
  learn: string;
  menu: string;
  menuClose: string;
  language: string;
  eyebrow: string;
  h1: string;
  sub: string;
  /** Puntos de confianza del hero: solo afirmaciones que el producto cumple. */
  trust: [string, string, string];
  demoNote: string;
  illustrative: string;
  simulation: string;
  example: string;
  mock: {
    patient: string; patientName: string; sections: [string, string, string, string, string];
    tabs: [string, string, string, string]; before: string; after: string; fullscreen: string;
    newRecord: string; phoneNav: [string, string, string, string];
  };
  specAvailable: string;
  specUpcoming: string;
  specUpcomingText: string;
  /** Descripción de las especialidades disponibles (tarjetas con foto). */
  specDesc: { dermatologico: string; capilar: string; plastico: string };
  /** Nombre en la tarjeta (p. ej. «Tricología / Capilar»). */
  specCardName: { dermatologico: string; capilar: string; plastico: string };
  available: string;
  soon: string;
  spec: Record<string, Pair>;
  resultsEyebrow: string;
  resultsTitle: string;
  resultsText: string;
  resultsList: [string, string, string, string];
  compareLabel: string;
  benefits: [Pair, Pair, Pair, Pair];
  stepsEyebrow: string;
  stepsTitle: string;
  steps: [Pair, Pair, Pair, Pair, Pair];
  securityEyebrow: string;
  securityTitle: string;
  security: [Pair, Pair, Pair, Pair];
  languagesNote: string;
  plansTitle: string;
  resourcesTitle: string;
  demoTitle: string;
  demoText: string;
  demoCta: string;
  demoSubject: string;
  privacy: string;
  terms: string;
  rights: string;
};

export const COPY: Record<LangCode, Copy> = {
  es: {
    title: "Clinivista — Registro fotográfico clínico para cada especialidad",
    description: "Clinivista es la plataforma web de registro fotográfico clínico para centros médicos: enlace único por clínica, consentimiento explícito, fotos guiadas, comparativas y seguimiento de cada paciente.",
    skip: "Saltar al contenido",
    nav: { home: "Inicio", features: "Funciones", specialties: "Especialidades", security: "Seguridad", contact: "Contacto", plans: "Planes", resources: "Recursos" },
    login: "Iniciar sesión", demo: "Solicitar demostración", learn: "Conocer funciones", menu: "Abrir menú", menuClose: "Cerrar menú", language: "Idioma",
    eyebrow: "Registro fotográfico clínico",
    h1: "Gestiona, documenta y visualiza la evolución de tus pacientes",
    sub: "Clinivista es la plataforma web especializada en registro fotográfico clínico, diseñada para centros médicos que buscan estandarizar sus registros, optimizar su flujo de trabajo y mostrar a cada paciente su propia evolución.",
    trust: ["Consentimiento explícito del paciente", "Cada clínica ve solo a sus pacientes", "Soporte en línea desde el panel"],
    demoNote: "Imágenes de demostración · Simulación ilustrativa",
    illustrative: "Imagen ilustrativa",
    simulation: "Simulación ilustrativa. No corresponde a resultados clínicos reales.",
    example: "Ejemplo",
    mock: { patient: "Paciente", patientName: "María González", sections: ["Pacientes", "Registro fotográfico", "Evolución", "Informe", "Fases"], tabs: ["Fotografías", "Comparativas", "Historial", "Notas"], before: "Antes", after: "Después", fullscreen: "Ver en pantalla completa", newRecord: "Nuevo registro", phoneNav: ["Inicio", "Pacientes", "Registro", "Más"] },
    specAvailable: "Especialidades disponibles", specUpcoming: "Próximas especialidades",
    specUpcomingText: "Próximamente ampliaremos a nuevas especialidades médicas.",
    specDesc: { dermatologico: "Registro y seguimiento de tratamientos dermatológicos.", capilar: "Documentación de tratamientos capilares y de su evolución.", plastico: "Registro pre y postoperatorio de procedimientos estéticos y reconstructivos." },
    specCardName: { dermatologico: "Dermatología", capilar: "Tricología / Capilar", plastico: "Cirugía Plástica" },
    available: "Disponible", soon: "Próximamente",
    spec: { capilar: ["Capilar", "Alopecia y control evolutivo"], dermatologico: ["Dermatología", "Lesiones y seguimiento"], estetico: ["Medicina estética", "Antes, después y controles"], plastico: ["Cirugía plástica", "Registro pre y posoperatorio"], dental: ["Odontología", "Sonrisa y evolución"], heridas: ["Heridas y pie diabético", "Seguimiento seriado"], vascular: ["Flebología", "Venas y resultados"], movimiento: ["Rehabilitación", "Postura y movilidad"], oculofacial: ["Oculoplastia", "Simetría y recuperación"] },
    resultsEyebrow: "Resultados visibles, decisiones más seguras",
    resultsTitle: "Una herramienta creada para tu práctica médica",
    resultsText: "Mejora la comunicación con tus pacientes, estandariza tus registros y lleva un control profesional de cada tratamiento con Clinivista.",
    resultsList: ["Interfaz clara y fácil de usar", "Compatible con computador, tablet y celular", "Fotografías guardadas de forma privada en la nube", "Informes y comparativas de evolución"],
    compareLabel: "Deslizar para comparar antes y después",
    benefits: [["Registro organizado", "Centraliza las fotografías, datos y notas de tus pacientes."], ["Acceso multidispositivo", "Disponible desde cualquier dispositivo con navegador."], ["Comparativas visuales", "Visualiza la evolución y comunícala con claridad."], ["Seguimiento clínico", "Documenta el progreso de tus pacientes a lo largo del tiempo."]],
    stepsEyebrow: "Cómo funciona", stepsTitle: "Del enlace al control, en cinco pasos",
    steps: [["Enlace seguro", "El paciente recibe un enlace único de su clínica."], ["Consentimiento", "El paciente otorga su consentimiento explícito."], ["Fotos guiadas", "El paciente toma las fotos siguiendo el protocolo."], ["Revisión humana", "Un profesional revisa, valida y añade notas."], ["Controles", "Seguimiento estructurado y trazable en el tiempo."]],
    securityEyebrow: "Seguridad", securityTitle: "Privacidad desde el primer registro",
    security: [["Cada clínica ve solo a sus pacientes", "Los datos de cada centro están separados; el personal entra solo a su clínica."], ["Consentimiento explícito del paciente", "El paciente acepta antes de enviar sus datos y fotografías."], ["Enlace único por clínica", "Cada centro tiene su propio enlace para sus pacientes."], ["Acceso por roles", "Médicos, administrativos y representante legal ven lo que les corresponde."]],
    languagesNote: "Disponible en 9 idiomas",
    plansTitle: "Planes", resourcesTitle: "Recursos",
    demoTitle: "Solicita una demostración para tu clínica",
    demoText: "Cuéntanos tu especialidad y te mostramos cómo se vería el protocolo de preevaluación para tus pacientes.",
    demoCta: "Escribir a", demoSubject: "Quiero una demo de Clinivista",
    privacy: "Privacidad", terms: "Términos", rights: "Todos los derechos reservados.",
  },
  en: {
    title: "Clinivista — Clinical photo records for every specialty",
    description: "Clinivista is the web platform for clinical photo records in medical centers: a unique link per clinic, explicit consent, guided photos, comparisons and follow-up for every patient.",
    skip: "Skip to content",
    nav: { home: "Home", features: "Features", specialties: "Specialties", security: "Security", contact: "Contact", plans: "Plans", resources: "Resources" },
    login: "Sign in", demo: "Request a demo", learn: "Explore features", menu: "Open menu", menuClose: "Close menu", language: "Language",
    eyebrow: "Clinical photo records",
    h1: "Manage, document and see your patients' progress",
    sub: "Clinivista is a web platform specialized in clinical photo records, designed for medical centers that want to standardize their records, streamline their workflow and show each patient their own progress.",
    trust: ["Explicit patient consent", "Each clinic sees only its own patients", "Online support from the panel"],
    demoNote: "Demo images · Illustrative simulation",
    illustrative: "Illustrative image",
    simulation: "Illustrative simulation. Not actual clinical results.",
    example: "Example",
    mock: { patient: "Patient", patientName: "María González", sections: ["Patients", "Photo records", "Progress", "Report", "Phases"], tabs: ["Photos", "Comparisons", "History", "Notes"], before: "Before", after: "After", fullscreen: "View full screen", newRecord: "New record", phoneNav: ["Home", "Patients", "Record", "More"] },
    specAvailable: "Available specialties", specUpcoming: "Upcoming specialties",
    specUpcomingText: "We will soon expand to new medical specialties.",
    specDesc: { dermatologico: "Records and follow-up of dermatological treatments.", capilar: "Documentation of hair treatments and their progress.", plastico: "Pre- and post-operative records of aesthetic and reconstructive procedures." },
    specCardName: { dermatologico: "Dermatology", capilar: "Trichology / Hair", plastico: "Plastic Surgery" },
    available: "Available", soon: "Coming soon",
    spec: { capilar: ["Hair", "Alopecia and progress tracking"], dermatologico: ["Dermatology", "Lesions and follow-up"], estetico: ["Aesthetic medicine", "Before, after and follow-ups"], plastico: ["Plastic surgery", "Pre- and post-operative records"], dental: ["Dentistry", "Smile and progress"], heridas: ["Wounds and diabetic foot", "Serial follow-up"], vascular: ["Phlebology", "Veins and outcomes"], movimiento: ["Rehabilitation", "Posture and mobility"], oculofacial: ["Oculoplastics", "Symmetry and recovery"] },
    resultsEyebrow: "Visible progress, safer decisions",
    resultsTitle: "A tool built for your medical practice",
    resultsText: "Improve communication with your patients, standardize your records and keep professional track of every treatment with Clinivista.",
    resultsList: ["Clear, easy-to-use interface", "Works on computer, tablet and phone", "Photos stored privately in the cloud", "Progress reports and comparisons"],
    compareLabel: "Slide to compare before and after",
    benefits: [["Organized records", "Keep your patients' photos, data and notes in one place."], ["Any device", "Available from any device with a browser."], ["Visual comparisons", "See progress and explain it clearly."], ["Clinical follow-up", "Document your patients' progress over time."]],
    stepsEyebrow: "How it works", stepsTitle: "From link to follow-up, in five steps",
    steps: [["Secure link", "The patient receives a unique link from their clinic."], ["Consent", "The patient gives explicit consent."], ["Guided photos", "The patient takes the photos following the protocol."], ["Human review", "A professional reviews, validates and adds notes."], ["Follow-ups", "Structured, traceable follow-up over time."]],
    securityEyebrow: "Security", securityTitle: "Privacy from the very first record",
    security: [["Each clinic sees only its own patients", "Each center's data is kept apart; staff only enter their own clinic."], ["Explicit patient consent", "The patient agrees before sending their data and photos."], ["A unique link per clinic", "Each center has its own link for its patients."], ["Role-based access", "Doctors, administrative staff and the legal representative see what applies to them."]],
    languagesNote: "Available in 9 languages",
    plansTitle: "Plans", resourcesTitle: "Resources",
    demoTitle: "Request a demo for your clinic",
    demoText: "Tell us your specialty and we will show you what the pre-evaluation protocol would look like for your patients.",
    demoCta: "Write to", demoSubject: "I would like a Clinivista demo",
    privacy: "Privacy", terms: "Terms", rights: "All rights reserved.",
  },
  pt: {
    title: "Clinivista — Registro fotográfico clínico para cada especialidade",
    description: "A Clinivista é a plataforma web de registro fotográfico clínico para centros médicos: link único por clínica, consentimento explícito, fotos guiadas, comparativos e acompanhamento de cada paciente.",
    skip: "Pular para o conteúdo",
    nav: { home: "Início", features: "Funcionalidades", specialties: "Especialidades", security: "Segurança", contact: "Contato", plans: "Planos", resources: "Recursos" },
    login: "Entrar", demo: "Solicitar demonstração", learn: "Conhecer funcionalidades", menu: "Abrir menu", menuClose: "Fechar menu", language: "Idioma",
    eyebrow: "Registro fotográfico clínico",
    h1: "Gerencie, documente e visualize a evolução dos seus pacientes",
    sub: "A Clinivista é a plataforma web especializada em registro fotográfico clínico, criada para centros médicos que buscam padronizar seus registros, otimizar seu fluxo de trabalho e mostrar a cada paciente a sua própria evolução.",
    trust: ["Consentimento explícito do paciente", "Cada clínica vê apenas seus pacientes", "Suporte online pelo painel"],
    demoNote: "Imagens de demonstração · Simulação ilustrativa",
    illustrative: "Imagem ilustrativa",
    simulation: "Simulação ilustrativa. Não corresponde a resultados clínicos reais.",
    example: "Exemplo",
    mock: { patient: "Paciente", patientName: "María González", sections: ["Pacientes", "Registro fotográfico", "Evolução", "Relatório", "Fases"], tabs: ["Fotografias", "Comparativos", "Histórico", "Notas"], before: "Antes", after: "Depois", fullscreen: "Ver em tela cheia", newRecord: "Novo registro", phoneNav: ["Início", "Pacientes", "Registro", "Mais"] },
    specAvailable: "Especialidades disponíveis", specUpcoming: "Próximas especialidades",
    specUpcomingText: "Em breve vamos ampliar para novas especialidades médicas.",
    specDesc: { dermatologico: "Registro e acompanhamento de tratamentos dermatológicos.", capilar: "Documentação de tratamentos capilares e da sua evolução.", plastico: "Registro pré e pós-operatório de procedimentos estéticos e reconstrutivos." },
    specCardName: { dermatologico: "Dermatologia", capilar: "Tricologia / Capilar", plastico: "Cirurgia Plástica" },
    available: "Disponível", soon: "Em breve",
    spec: { capilar: ["Capilar", "Alopecia e acompanhamento"], dermatologico: ["Dermatologia", "Lesões e acompanhamento"], estetico: ["Medicina estética", "Antes, depois e retornos"], plastico: ["Cirurgia plástica", "Registro pré e pós-operatório"], dental: ["Odontologia", "Sorriso e evolução"], heridas: ["Feridas e pé diabético", "Acompanhamento seriado"], vascular: ["Flebologia", "Veias e resultados"], movimiento: ["Reabilitação", "Postura e mobilidade"], oculofacial: ["Oculoplastia", "Simetria e recuperação"] },
    resultsEyebrow: "Evolução visível, decisões mais seguras",
    resultsTitle: "Uma ferramenta criada para a sua prática médica",
    resultsText: "Melhore a comunicação com seus pacientes, padronize seus registros e mantenha um controle profissional de cada tratamento com a Clinivista.",
    resultsList: ["Interface clara e fácil de usar", "Funciona em computador, tablet e celular", "Fotografias guardadas de forma privada na nuvem", "Relatórios e comparativos de evolução"],
    compareLabel: "Deslize para comparar antes e depois",
    benefits: [["Registro organizado", "Centralize as fotografias, dados e notas dos seus pacientes."], ["Acesso em qualquer dispositivo", "Disponível em qualquer dispositivo com navegador."], ["Comparativos visuais", "Visualize a evolução e comunique-a com clareza."], ["Acompanhamento clínico", "Documente o progresso dos seus pacientes ao longo do tempo."]],
    stepsEyebrow: "Como funciona", stepsTitle: "Do link ao retorno, em cinco passos",
    steps: [["Link seguro", "O paciente recebe um link único da sua clínica."], ["Consentimento", "O paciente dá seu consentimento explícito."], ["Fotos guiadas", "O paciente tira as fotos seguindo o protocolo."], ["Revisão humana", "Um profissional revisa, valida e adiciona notas."], ["Retornos", "Acompanhamento estruturado e rastreável ao longo do tempo."]],
    securityEyebrow: "Segurança", securityTitle: "Privacidade desde o primeiro registro",
    security: [["Cada clínica vê apenas seus pacientes", "Os dados de cada centro ficam separados; a equipe entra apenas na sua clínica."], ["Consentimento explícito do paciente", "O paciente aceita antes de enviar seus dados e fotografias."], ["Link único por clínica", "Cada centro tem seu próprio link para os seus pacientes."], ["Acesso por perfis", "Médicos, administrativos e representante legal veem o que lhes corresponde."]],
    languagesNote: "Disponível em 9 idiomas",
    plansTitle: "Planos", resourcesTitle: "Recursos",
    demoTitle: "Solicite uma demonstração para sua clínica",
    demoText: "Conte-nos sua especialidade e mostraremos como seria o protocolo de pré-avaliação para seus pacientes.",
    demoCta: "Escrever para", demoSubject: "Quero uma demo da Clinivista",
    privacy: "Privacidade", terms: "Termos", rights: "Todos os direitos reservados.",
  },
  fr: {
    title: "Clinivista — Dossier photographique clinique pour chaque spécialité",
    description: "Clinivista est la plateforme web de dossier photographique clinique pour les centres médicaux : lien unique par clinique, consentement explicite, photos guidées, comparaisons et suivi de chaque patient.",
    skip: "Aller au contenu",
    nav: { home: "Accueil", features: "Fonctionnalités", specialties: "Spécialités", security: "Sécurité", contact: "Contact", plans: "Offres", resources: "Ressources" },
    login: "Se connecter", demo: "Demander une démo", learn: "Voir les fonctionnalités", menu: "Ouvrir le menu", menuClose: "Fermer le menu", language: "Langue",
    eyebrow: "Dossier photographique clinique",
    h1: "Gérez, documentez et visualisez l'évolution de vos patients",
    sub: "Clinivista est une plateforme web spécialisée dans le dossier photographique clinique, conçue pour les centres médicaux qui veulent standardiser leurs dossiers, optimiser leur flux de travail et montrer à chaque patient sa propre évolution.",
    trust: ["Consentement explicite du patient", "Chaque clinique ne voit que ses patients", "Support en ligne depuis le panneau"],
    demoNote: "Images de démonstration · Simulation illustrative",
    illustrative: "Image illustrative",
    simulation: "Simulation illustrative. Ne correspond pas à des résultats cliniques réels.",
    example: "Exemple",
    mock: { patient: "Patient", patientName: "María González", sections: ["Patients", "Dossier photo", "Évolution", "Rapport", "Phases"], tabs: ["Photos", "Comparaisons", "Historique", "Notes"], before: "Avant", after: "Après", fullscreen: "Voir en plein écran", newRecord: "Nouveau dossier", phoneNav: ["Accueil", "Patients", "Dossier", "Plus"] },
    specAvailable: "Spécialités disponibles", specUpcoming: "Prochaines spécialités",
    specUpcomingText: "Nous ajouterons bientôt de nouvelles spécialités médicales.",
    specDesc: { dermatologico: "Dossier et suivi des traitements dermatologiques.", capilar: "Documentation des traitements capillaires et de leur évolution.", plastico: "Dossier pré et postopératoire des actes esthétiques et reconstructeurs." },
    specCardName: { dermatologico: "Dermatologie", capilar: "Trichologie / Capillaire", plastico: "Chirurgie plastique" },
    available: "Disponible", soon: "Bientôt",
    spec: { capilar: ["Capillaire", "Alopécie et suivi d'évolution"], dermatologico: ["Dermatologie", "Lésions et suivi"], estetico: ["Médecine esthétique", "Avant, après et suivis"], plastico: ["Chirurgie plastique", "Dossier pré et postopératoire"], dental: ["Dentisterie", "Sourire et évolution"], heridas: ["Plaies et pied diabétique", "Suivi en série"], vascular: ["Phlébologie", "Veines et résultats"], movimiento: ["Rééducation", "Posture et mobilité"], oculofacial: ["Oculoplastie", "Symétrie et récupération"] },
    resultsEyebrow: "Évolution visible, décisions plus sûres",
    resultsTitle: "Un outil conçu pour votre pratique médicale",
    resultsText: "Améliorez la communication avec vos patients, standardisez vos dossiers et assurez un suivi professionnel de chaque traitement avec Clinivista.",
    resultsList: ["Interface claire et simple", "Fonctionne sur ordinateur, tablette et téléphone", "Photos conservées de façon privée dans le cloud", "Rapports et comparaisons d'évolution"],
    compareLabel: "Faites glisser pour comparer avant et après",
    benefits: [["Dossiers organisés", "Centralisez les photos, données et notes de vos patients."], ["Sur tous les appareils", "Disponible sur tout appareil doté d'un navigateur."], ["Comparaisons visuelles", "Visualisez l'évolution et expliquez-la clairement."], ["Suivi clinique", "Documentez les progrès de vos patients dans le temps."]],
    stepsEyebrow: "Fonctionnement", stepsTitle: "Du lien au suivi, en cinq étapes",
    steps: [["Lien sécurisé", "Le patient reçoit un lien unique de sa clinique."], ["Consentement", "Le patient donne son consentement explicite."], ["Photos guidées", "Le patient prend les photos en suivant le protocole."], ["Revue humaine", "Un professionnel examine, valide et ajoute des notes."], ["Suivis", "Suivi structuré et traçable dans le temps."]],
    securityEyebrow: "Sécurité", securityTitle: "La confidentialité dès le premier dossier",
    security: [["Chaque clinique ne voit que ses patients", "Les données de chaque centre sont séparées ; le personnel n'accède qu'à sa clinique."], ["Consentement explicite du patient", "Le patient accepte avant d'envoyer ses données et ses photos."], ["Un lien unique par clinique", "Chaque centre a son propre lien pour ses patients."], ["Accès par rôles", "Médecins, personnel administratif et représentant légal voient ce qui les concerne."]],
    languagesNote: "Disponible en 9 langues",
    plansTitle: "Offres", resourcesTitle: "Ressources",
    demoTitle: "Demandez une démo pour votre clinique",
    demoText: "Dites-nous votre spécialité et nous vous montrerons à quoi ressemblerait le protocole de préévaluation pour vos patients.",
    demoCta: "Écrire à", demoSubject: "Je souhaite une démo de Clinivista",
    privacy: "Confidentialité", terms: "Conditions", rights: "Tous droits réservés.",
  },
  de: {
    title: "Clinivista — Klinische Fotodokumentation für jede Fachrichtung",
    description: "Clinivista ist die Webplattform für klinische Fotodokumentation in medizinischen Zentren: eigener Link pro Klinik, ausdrückliche Einwilligung, geführte Fotos, Vergleiche und Verlaufskontrolle für jeden Patienten.",
    skip: "Zum Inhalt springen",
    nav: { home: "Start", features: "Funktionen", specialties: "Fachrichtungen", security: "Sicherheit", contact: "Kontakt", plans: "Tarife", resources: "Ressourcen" },
    login: "Anmelden", demo: "Demo anfragen", learn: "Funktionen ansehen", menu: "Menü öffnen", menuClose: "Menü schließen", language: "Sprache",
    eyebrow: "Klinische Fotodokumentation",
    h1: "Verwalten, dokumentieren und den Verlauf Ihrer Patienten sehen",
    sub: "Clinivista ist eine Webplattform für klinische Fotodokumentation – für medizinische Zentren, die ihre Dokumentation vereinheitlichen, ihre Abläufe verbessern und jedem Patienten seinen eigenen Verlauf zeigen möchten.",
    trust: ["Ausdrückliche Einwilligung des Patienten", "Jede Klinik sieht nur ihre Patienten", "Online-Support direkt im Panel"],
    demoNote: "Demobilder · Illustrative Simulation",
    illustrative: "Illustratives Bild",
    simulation: "Illustrative Simulation. Keine echten klinischen Ergebnisse.",
    example: "Beispiel",
    mock: { patient: "Patient", patientName: "María González", sections: ["Patienten", "Fotodokumentation", "Verlauf", "Bericht", "Phasen"], tabs: ["Fotos", "Vergleiche", "Verlauf", "Notizen"], before: "Vorher", after: "Nachher", fullscreen: "Im Vollbild ansehen", newRecord: "Neue Aufnahme", phoneNav: ["Start", "Patienten", "Aufnahme", "Mehr"] },
    specAvailable: "Verfügbare Fachrichtungen", specUpcoming: "Kommende Fachrichtungen",
    specUpcomingText: "Wir erweitern bald um weitere medizinische Fachrichtungen.",
    specDesc: { dermatologico: "Dokumentation und Verlauf dermatologischer Behandlungen.", capilar: "Dokumentation von Haarbehandlungen und ihrem Verlauf.", plastico: "Prä- und postoperative Dokumentation ästhetischer und rekonstruktiver Eingriffe." },
    specCardName: { dermatologico: "Dermatologie", capilar: "Trichologie / Haar", plastico: "Plastische Chirurgie" },
    available: "Verfügbar", soon: "Demnächst",
    spec: { capilar: ["Haar", "Haarausfall und Verlauf"], dermatologico: ["Dermatologie", "Läsionen und Verlauf"], estetico: ["Ästhetische Medizin", "Vorher, nachher und Kontrollen"], plastico: ["Plastische Chirurgie", "Prä- und postoperative Dokumentation"], dental: ["Zahnmedizin", "Lächeln und Verlauf"], heridas: ["Wunden und diabetischer Fuß", "Serielle Verlaufskontrolle"], vascular: ["Phlebologie", "Venen und Ergebnisse"], movimiento: ["Rehabilitation", "Haltung und Beweglichkeit"], oculofacial: ["Oculoplastik", "Symmetrie und Erholung"] },
    resultsEyebrow: "Sichtbarer Verlauf, sicherere Entscheidungen",
    resultsTitle: "Ein Werkzeug für Ihre medizinische Praxis",
    resultsText: "Verbessern Sie die Kommunikation mit Ihren Patienten, vereinheitlichen Sie Ihre Dokumentation und behalten Sie jede Behandlung professionell im Blick – mit Clinivista.",
    resultsList: ["Klare, einfache Oberfläche", "Auf Computer, Tablet und Smartphone", "Fotos privat in der Cloud gespeichert", "Verlaufsberichte und Vergleiche"],
    compareLabel: "Schieben, um vorher und nachher zu vergleichen",
    benefits: [["Geordnete Dokumentation", "Fotos, Daten und Notizen Ihrer Patienten an einem Ort."], ["Auf jedem Gerät", "Auf jedem Gerät mit Browser verfügbar."], ["Visuelle Vergleiche", "Den Verlauf sehen und klar erklären."], ["Klinische Verlaufskontrolle", "Den Fortschritt Ihrer Patienten über die Zeit dokumentieren."]],
    stepsEyebrow: "So funktioniert es", stepsTitle: "Vom Link zur Kontrolle in fünf Schritten",
    steps: [["Sicherer Link", "Der Patient erhält einen einmaligen Link seiner Klinik."], ["Einwilligung", "Der Patient erteilt seine ausdrückliche Einwilligung."], ["Geführte Fotos", "Der Patient macht die Fotos nach dem Protokoll."], ["Menschliche Prüfung", "Eine Fachperson prüft, bestätigt und ergänzt Notizen."], ["Kontrollen", "Strukturierte, nachvollziehbare Verlaufskontrolle."]],
    securityEyebrow: "Sicherheit", securityTitle: "Datenschutz ab der ersten Aufnahme",
    security: [["Jede Klinik sieht nur ihre Patienten", "Die Daten jedes Zentrums sind getrennt; das Personal sieht nur die eigene Klinik."], ["Ausdrückliche Einwilligung des Patienten", "Der Patient stimmt zu, bevor er Daten und Fotos sendet."], ["Eigener Link pro Klinik", "Jedes Zentrum hat einen eigenen Link für seine Patienten."], ["Rollenbasierter Zugriff", "Ärzte, Verwaltung und gesetzlicher Vertreter sehen, was für sie bestimmt ist."]],
    languagesNote: "In 9 Sprachen verfügbar",
    plansTitle: "Tarife", resourcesTitle: "Ressourcen",
    demoTitle: "Demo für Ihre Klinik anfragen",
    demoText: "Nennen Sie uns Ihre Fachrichtung, und wir zeigen Ihnen, wie das Voruntersuchungsprotokoll für Ihre Patienten aussehen würde.",
    demoCta: "Schreiben an", demoSubject: "Ich möchte eine Clinivista-Demo",
    privacy: "Datenschutz", terms: "Bedingungen", rights: "Alle Rechte vorbehalten.",
  },
  it: {
    title: "Clinivista — Documentazione fotografica clinica per ogni specialità",
    description: "Clinivista è la piattaforma web di documentazione fotografica clinica per centri medici: link unico per clinica, consenso esplicito, foto guidate, confronti e follow-up di ogni paziente.",
    skip: "Vai al contenuto",
    nav: { home: "Home", features: "Funzionalità", specialties: "Specialità", security: "Sicurezza", contact: "Contatti", plans: "Piani", resources: "Risorse" },
    login: "Accedi", demo: "Richiedi una demo", learn: "Scopri le funzionalità", menu: "Apri il menu", menuClose: "Chiudi il menu", language: "Lingua",
    eyebrow: "Documentazione fotografica clinica",
    h1: "Gestisci, documenta e visualizza l'evoluzione dei tuoi pazienti",
    sub: "Clinivista è la piattaforma web specializzata nella documentazione fotografica clinica, pensata per i centri medici che vogliono standardizzare la documentazione, ottimizzare il flusso di lavoro e mostrare a ogni paziente la propria evoluzione.",
    trust: ["Consenso esplicito del paziente", "Ogni clinica vede solo i propri pazienti", "Supporto online dal pannello"],
    demoNote: "Immagini dimostrative · Simulazione illustrativa",
    illustrative: "Immagine illustrativa",
    simulation: "Simulazione illustrativa. Non corrisponde a risultati clinici reali.",
    example: "Esempio",
    mock: { patient: "Paziente", patientName: "María González", sections: ["Pazienti", "Documentazione foto", "Evoluzione", "Report", "Fasi"], tabs: ["Fotografie", "Confronti", "Cronologia", "Note"], before: "Prima", after: "Dopo", fullscreen: "Vedi a schermo intero", newRecord: "Nuova registrazione", phoneNav: ["Home", "Pazienti", "Registra", "Altro"] },
    specAvailable: "Specialità disponibili", specUpcoming: "Prossime specialità",
    specUpcomingText: "Presto ci estenderemo a nuove specialità mediche.",
    specDesc: { dermatologico: "Documentazione e follow-up dei trattamenti dermatologici.", capilar: "Documentazione dei trattamenti tricologici e della loro evoluzione.", plastico: "Documentazione pre e post-operatoria di interventi estetici e ricostruttivi." },
    specCardName: { dermatologico: "Dermatologia", capilar: "Tricologia / Capelli", plastico: "Chirurgia plastica" },
    available: "Disponibile", soon: "Prossimamente",
    spec: { capilar: ["Capelli", "Alopecia e controllo dell'evoluzione"], dermatologico: ["Dermatologia", "Lesioni e follow-up"], estetico: ["Medicina estetica", "Prima, dopo e controlli"], plastico: ["Chirurgia plastica", "Documentazione pre e post-operatoria"], dental: ["Odontoiatria", "Sorriso ed evoluzione"], heridas: ["Ferite e piede diabetico", "Monitoraggio seriale"], vascular: ["Flebologia", "Vene e risultati"], movimiento: ["Riabilitazione", "Postura e mobilità"], oculofacial: ["Oculoplastica", "Simmetria e recupero"] },
    resultsEyebrow: "Evoluzione visibile, decisioni più sicure",
    resultsTitle: "Uno strumento creato per la tua pratica medica",
    resultsText: "Migliora la comunicazione con i tuoi pazienti, standardizza la documentazione e tieni un controllo professionale di ogni trattamento con Clinivista.",
    resultsList: ["Interfaccia chiara e facile da usare", "Funziona su computer, tablet e smartphone", "Foto conservate in modo privato nel cloud", "Report e confronti dell'evoluzione"],
    compareLabel: "Scorri per confrontare prima e dopo",
    benefits: [["Documentazione ordinata", "Centralizza foto, dati e note dei tuoi pazienti."], ["Su ogni dispositivo", "Disponibile da qualsiasi dispositivo con browser."], ["Confronti visivi", "Visualizza l'evoluzione e spiegala con chiarezza."], ["Follow-up clinico", "Documenta i progressi dei tuoi pazienti nel tempo."]],
    stepsEyebrow: "Come funziona", stepsTitle: "Dal link al controllo, in cinque passaggi",
    steps: [["Link sicuro", "Il paziente riceve un link unico dalla sua clinica."], ["Consenso", "Il paziente dà il proprio consenso esplicito."], ["Foto guidate", "Il paziente scatta le foto seguendo il protocollo."], ["Revisione umana", "Un professionista rivede, convalida e aggiunge note."], ["Controlli", "Monitoraggio strutturato e tracciabile nel tempo."]],
    securityEyebrow: "Sicurezza", securityTitle: "Privacy fin dalla prima registrazione",
    security: [["Ogni clinica vede solo i propri pazienti", "I dati di ogni centro sono separati; il personale accede solo alla propria clinica."], ["Consenso esplicito del paziente", "Il paziente accetta prima di inviare dati e foto."], ["Un link unico per clinica", "Ogni centro ha il proprio link per i suoi pazienti."], ["Accesso per ruoli", "Medici, personale amministrativo e rappresentante legale vedono ciò che compete loro."]],
    languagesNote: "Disponibile in 9 lingue",
    plansTitle: "Piani", resourcesTitle: "Risorse",
    demoTitle: "Richiedi una demo per la tua clinica",
    demoText: "Dicci la tua specialità e ti mostreremo come sarebbe il protocollo di pre-valutazione per i tuoi pazienti.",
    demoCta: "Scrivi a", demoSubject: "Vorrei una demo di Clinivista",
    privacy: "Privacy", terms: "Termini", rights: "Tutti i diritti riservati.",
  },
  tr: {
    title: "Clinivista — Her uzmanlık alanı için klinik fotoğraf kaydı",
    description: "Clinivista, sağlık merkezleri için klinik fotoğraf kaydı web platformudur: her kliniğe özel bağlantı, açık onam, yönlendirmeli fotoğraflar, karşılaştırmalar ve her hasta için takip.",
    skip: "İçeriğe geç",
    nav: { home: "Ana sayfa", features: "Özellikler", specialties: "Uzmanlık alanları", security: "Güvenlik", contact: "İletişim", plans: "Planlar", resources: "Kaynaklar" },
    login: "Giriş yap", demo: "Demo talep et", learn: "Özellikleri keşfet", menu: "Menüyü aç", menuClose: "Menüyü kapat", language: "Dil",
    eyebrow: "Klinik fotoğraf kaydı",
    h1: "Hastalarınızın gelişimini yönetin, belgeleyin ve görün",
    sub: "Clinivista, kayıtlarını standartlaştırmak, iş akışını iyileştirmek ve her hastaya kendi gelişimini göstermek isteyen sağlık merkezleri için tasarlanmış, klinik fotoğraf kaydına özel bir web platformudur.",
    trust: ["Hastanın açık onamı", "Her klinik yalnızca kendi hastalarını görür", "Panelden çevrimiçi destek"],
    demoNote: "Demo görselleri · Örnek simülasyon",
    illustrative: "Örnek görsel",
    simulation: "Örnek simülasyon. Gerçek klinik sonuçları göstermez.",
    example: "Örnek",
    mock: { patient: "Hasta", patientName: "María González", sections: ["Hastalar", "Fotoğraf kaydı", "Gelişim", "Rapor", "Aşamalar"], tabs: ["Fotoğraflar", "Karşılaştırmalar", "Geçmiş", "Notlar"], before: "Öncesi", after: "Sonrası", fullscreen: "Tam ekran gör", newRecord: "Yeni kayıt", phoneNav: ["Ana sayfa", "Hastalar", "Kayıt", "Diğer"] },
    specAvailable: "Mevcut uzmanlık alanları", specUpcoming: "Yakında gelecek uzmanlık alanları",
    specUpcomingText: "Yakında yeni tıbbi uzmanlık alanlarına genişleyeceğiz.",
    specDesc: { dermatologico: "Dermatolojik tedavilerin kaydı ve takibi.", capilar: "Saç tedavilerinin ve gelişiminin belgelenmesi.", plastico: "Estetik ve rekonstrüktif işlemlerin ameliyat öncesi ve sonrası kaydı." },
    specCardName: { dermatologico: "Dermatoloji", capilar: "Trikoloji / Saç", plastico: "Plastik Cerrahi" },
    available: "Kullanılabilir", soon: "Yakında",
    spec: { capilar: ["Saç", "Alopesi ve gelişim takibi"], dermatologico: ["Dermatoloji", "Lezyonlar ve takip"], estetico: ["Estetik tıp", "Öncesi, sonrası ve kontroller"], plastico: ["Plastik cerrahi", "Ameliyat öncesi ve sonrası kayıt"], dental: ["Diş hekimliği", "Gülüş ve gelişim"], heridas: ["Yaralar ve diyabetik ayak", "Seri takip"], vascular: ["Fleboloji", "Damarlar ve sonuçlar"], movimiento: ["Rehabilitasyon", "Duruş ve hareketlilik"], oculofacial: ["Oküloplasti", "Simetri ve iyileşme"] },
    resultsEyebrow: "Görünür gelişim, daha güvenli kararlar",
    resultsTitle: "Tıbbi pratiğiniz için tasarlanmış bir araç",
    resultsText: "Clinivista ile hastalarınızla iletişimi iyileştirin, kayıtlarınızı standartlaştırın ve her tedaviyi profesyonelce takip edin.",
    resultsList: ["Sade ve kolay kullanılan arayüz", "Bilgisayar, tablet ve telefonda çalışır", "Fotoğraflar bulutta gizli olarak saklanır", "Gelişim raporları ve karşılaştırmalar"],
    compareLabel: "Öncesi ve sonrasını karşılaştırmak için kaydırın",
    benefits: [["Düzenli kayıt", "Hastalarınızın fotoğraflarını, verilerini ve notlarını tek yerde toplayın."], ["Her cihazdan erişim", "Tarayıcısı olan her cihazdan kullanılabilir."], ["Görsel karşılaştırmalar", "Gelişimi görün ve açıkça anlatın."], ["Klinik takip", "Hastalarınızın zaman içindeki ilerlemesini belgeleyin."]],
    stepsEyebrow: "Nasıl çalışır", stepsTitle: "Bağlantıdan kontrole beş adımda",
    steps: [["Güvenli bağlantı", "Hasta, kliniğinden benzersiz bir bağlantı alır."], ["Onam", "Hasta açık onamını verir."], ["Yönlendirmeli fotoğraflar", "Hasta fotoğrafları protokole göre çeker."], ["İnsan incelemesi", "Bir uzman inceler, doğrular ve not ekler."], ["Kontroller", "Zaman içinde yapılandırılmış, izlenebilir takip."]],
    securityEyebrow: "Güvenlik", securityTitle: "İlk kayıttan itibaren gizlilik",
    security: [["Her klinik yalnızca kendi hastalarını görür", "Her merkezin verileri ayrıdır; personel yalnızca kendi kliniğine girer."], ["Hastanın açık onamı", "Hasta, verilerini ve fotoğraflarını göndermeden önce onay verir."], ["Her kliniğe özel bağlantı", "Her merkezin hastaları için kendi bağlantısı vardır."], ["Role göre erişim", "Hekimler, idari personel ve yasal temsilci yalnızca kendilerine ait olanı görür."]],
    languagesNote: "9 dilde kullanılabilir",
    plansTitle: "Planlar", resourcesTitle: "Kaynaklar",
    demoTitle: "Kliniğiniz için demo talep edin",
    demoText: "Uzmanlık alanınızı söyleyin; hastalarınız için ön değerlendirme protokolünün nasıl görüneceğini gösterelim.",
    demoCta: "Yazın:", demoSubject: "Clinivista demosu istiyorum",
    privacy: "Gizlilik", terms: "Koşullar", rights: "Tüm hakları saklıdır.",
  },
  ar: {
    title: "كلينفيستا — توثيق سريري بالصور لكل تخصص",
    description: "كلينفيستا منصة ويب للتوثيق السريري بالصور في المراكز الطبية: رابط خاص بكل عيادة، وموافقة صريحة، وصور موجَّهة، ومقارنات ومتابعة لكل مريض.",
    skip: "انتقل إلى المحتوى",
    nav: { home: "الرئيسية", features: "المزايا", specialties: "التخصصات", security: "الأمان", contact: "تواصل معنا", plans: "الخطط", resources: "الموارد" },
    login: "تسجيل الدخول", demo: "اطلب عرضًا تجريبيًا", learn: "تعرّف على المزايا", menu: "فتح القائمة", menuClose: "إغلاق القائمة", language: "اللغة",
    eyebrow: "التوثيق السريري بالصور",
    h1: "أدِر ووثّق وتابع تطور مرضاك",
    sub: "كلينفيستا منصة ويب متخصصة في التوثيق السريري بالصور، صُمّمت للمراكز الطبية التي تريد توحيد سجلاتها وتحسين سير عملها وأن تُري كل مريض تطوره الخاص.",
    trust: ["موافقة صريحة من المريض", "كل عيادة ترى مرضاها فقط", "دعم عبر الإنترنت من اللوحة"],
    demoNote: "صور توضيحية للعرض · محاكاة",
    illustrative: "صورة توضيحية",
    simulation: "محاكاة توضيحية. لا تمثل نتائج سريرية حقيقية.",
    example: "مثال",
    mock: { patient: "المريض", patientName: "María González", sections: ["المرضى", "السجل المصوّر", "التطور", "التقرير", "المراحل"], tabs: ["الصور", "المقارنات", "السجل", "الملاحظات"], before: "قبل", after: "بعد", fullscreen: "عرض بملء الشاشة", newRecord: "سجل جديد", phoneNav: ["الرئيسية", "المرضى", "تسجيل", "المزيد"] },
    specAvailable: "التخصصات المتاحة", specUpcoming: "تخصصات قادمة",
    specUpcomingText: "سنتوسع قريبًا إلى تخصصات طبية جديدة.",
    specDesc: { dermatologico: "توثيق علاجات الأمراض الجلدية ومتابعتها.", capilar: "توثيق علاجات الشعر وتطورها.", plastico: "توثيق قبل الجراحة وبعدها للإجراءات التجميلية والترميمية." },
    specCardName: { dermatologico: "الأمراض الجلدية", capilar: "علم الشعر / الشعر", plastico: "الجراحة التجميلية" },
    available: "متاح", soon: "قريبًا",
    spec: { capilar: ["الشعر", "الصلع ومتابعة التطور"], dermatologico: ["الأمراض الجلدية", "الآفات والمتابعة"], estetico: ["الطب التجميلي", "قبل وبعد والمتابعات"], plastico: ["الجراحة التجميلية", "توثيق قبل الجراحة وبعدها"], dental: ["طب الأسنان", "الابتسامة والتطور"], heridas: ["الجروح والقدم السكرية", "متابعة متسلسلة"], vascular: ["أمراض الأوردة", "الأوردة والنتائج"], movimiento: ["إعادة التأهيل", "الوضعية والحركة"], oculofacial: ["جراحة العين التجميلية", "التناسق والتعافي"] },
    resultsEyebrow: "تطور واضح وقرارات أكثر أمانًا",
    resultsTitle: "أداة صُمّمت لممارستك الطبية",
    resultsText: "حسّن تواصلك مع مرضاك ووحّد سجلاتك وتابع كل علاج باحترافية مع كلينفيستا.",
    resultsList: ["واجهة واضحة وسهلة الاستخدام", "تعمل على الحاسوب والجهاز اللوحي والهاتف", "صور محفوظة بشكل خاص في السحابة", "تقارير ومقارنات للتطور"],
    compareLabel: "اسحب للمقارنة بين قبل وبعد",
    benefits: [["سجل منظم", "اجمع صور مرضاك وبياناتهم وملاحظاتهم في مكان واحد."], ["من أي جهاز", "متاح من أي جهاز به متصفح."], ["مقارنات مرئية", "تابع التطور واشرحه بوضوح."], ["متابعة سريرية", "وثّق تقدم مرضاك مع مرور الوقت."]],
    stepsEyebrow: "كيف يعمل", stepsTitle: "من الرابط إلى المتابعة في خمس خطوات",
    steps: [["رابط آمن", "يتلقى المريض رابطًا فريدًا من عيادته."], ["الموافقة", "يمنح المريض موافقته الصريحة."], ["صور موجَّهة", "يلتقط المريض الصور وفق البروتوكول."], ["مراجعة بشرية", "يراجع مختص ويعتمد ويضيف ملاحظات."], ["المتابعات", "متابعة منظمة وقابلة للتتبع عبر الزمن."]],
    securityEyebrow: "الأمان", securityTitle: "الخصوصية منذ السجل الأول",
    security: [["كل عيادة ترى مرضاها فقط", "بيانات كل مركز منفصلة، والموظفون يدخلون عيادتهم فقط."], ["موافقة صريحة من المريض", "يوافق المريض قبل إرسال بياناته وصوره."], ["رابط خاص بكل عيادة", "لكل مركز رابطه الخاص لمرضاه."], ["وصول حسب الأدوار", "يرى الأطباء والإداريون والممثل القانوني ما يخصهم فقط."]],
    languagesNote: "متاح بـ 9 لغات",
    plansTitle: "الخطط", resourcesTitle: "الموارد",
    demoTitle: "اطلب عرضًا تجريبيًا لعيادتك",
    demoText: "أخبرنا بتخصصك وسنُريك كيف سيبدو بروتوكول التقييم المسبق لمرضاك.",
    demoCta: "راسلنا على", demoSubject: "أرغب في عرض تجريبي لكلينفيستا",
    privacy: "الخصوصية", terms: "الشروط", rights: "جميع الحقوق محفوظة.",
  },
  zh: {
    title: "Clinivista — 适用于各专科的临床照片记录",
    description: "Clinivista 是面向医疗机构的临床照片记录网络平台：每家诊所专属链接、明确知情同意、引导式拍照、对比与每位患者的随访。",
    skip: "跳到主要内容",
    nav: { home: "首页", features: "功能", specialties: "专科", security: "安全", contact: "联系", plans: "方案", resources: "资源" },
    login: "登录", demo: "申请演示", learn: "了解功能", menu: "打开菜单", menuClose: "关闭菜单", language: "语言",
    eyebrow: "临床照片记录",
    h1: "管理、记录并查看患者的变化",
    sub: "Clinivista 是专注于临床照片记录的网络平台，面向希望统一记录、优化工作流程，并向每位患者展示其自身变化的医疗机构。",
    trust: ["患者明确知情同意", "每家诊所只能看到自己的患者", "面板内在线支持"],
    demoNote: "演示图片 · 示意模拟",
    illustrative: "示意图",
    simulation: "示意模拟，并非真实临床结果。",
    example: "示例",
    mock: { patient: "患者", patientName: "María González", sections: ["患者", "照片记录", "变化", "报告", "阶段"], tabs: ["照片", "对比", "历史", "备注"], before: "之前", after: "之后", fullscreen: "全屏查看", newRecord: "新建记录", phoneNav: ["首页", "患者", "记录", "更多"] },
    specAvailable: "已上线专科", specUpcoming: "即将推出的专科",
    specUpcomingText: "我们即将扩展到更多医学专科。",
    specDesc: { dermatologico: "皮肤科治疗的记录与随访。", capilar: "毛发治疗及其变化的记录。", plastico: "美容与修复手术的术前术后记录。" },
    specCardName: { dermatologico: "皮肤科", capilar: "毛发学 / 毛发", plastico: "整形外科" },
    available: "已上线", soon: "即将推出",
    spec: { capilar: ["毛发", "脱发与变化跟踪"], dermatologico: ["皮肤科", "皮损与随访"], estetico: ["医疗美容", "术前、术后与复查"], plastico: ["整形外科", "术前术后记录"], dental: ["口腔科", "笑容与变化"], heridas: ["伤口与糖尿病足", "连续随访"], vascular: ["静脉学", "静脉与结果"], movimiento: ["康复", "姿势与活动能力"], oculofacial: ["眼整形", "对称与恢复"] },
    resultsEyebrow: "变化看得见，决策更安心",
    resultsTitle: "为您的医疗实践打造的工具",
    resultsText: "借助 Clinivista，改善与患者的沟通，统一记录，并专业地跟进每一次治疗。",
    resultsList: ["清晰易用的界面", "支持电脑、平板和手机", "照片私密存储于云端", "变化报告与对比"],
    compareLabel: "拖动以对比之前与之后",
    benefits: [["有序记录", "集中管理患者的照片、资料和备注。"], ["多设备访问", "任何带浏览器的设备均可使用。"], ["直观对比", "查看变化并清楚地说明。"], ["临床随访", "记录患者随时间的进展。"]],
    stepsEyebrow: "使用流程", stepsTitle: "从链接到复查，五个步骤",
    steps: [["安全链接", "患者收到来自其诊所的专属链接。"], ["知情同意", "患者给予明确的同意。"], ["引导式拍照", "患者按照流程拍摄照片。"], ["人工审核", "专业人员审核、确认并添加备注。"], ["复查", "结构化、可追溯的长期随访。"]],
    securityEyebrow: "安全", securityTitle: "从第一条记录起保护隐私",
    security: [["每家诊所只能看到自己的患者", "各机构数据相互隔离，员工只能进入自己的诊所。"], ["患者明确知情同意", "患者在提交资料和照片前须表示同意。"], ["每家诊所专属链接", "每个机构都有供其患者使用的专属链接。"], ["按角色授权访问", "医生、行政人员和法定代表人只能看到各自权限内的内容。"]],
    languagesNote: "支持 9 种语言",
    plansTitle: "方案", resourcesTitle: "资源",
    demoTitle: "为您的诊所申请演示",
    demoText: "告诉我们您的专科，我们将向您展示面向患者的预评估流程是什么样子。",
    demoCta: "发邮件至", demoSubject: "我想了解 Clinivista 演示",
    privacy: "隐私", terms: "条款", rights: "版权所有。",
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
