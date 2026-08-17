import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type LangCode = "es" | "en" | "pt" | "fr" | "de" | "it" | "tr" | "ar" | "zh";

export const LANGS: { code: LangCode; flag: string; name: string }[] = [
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

export type AppTranslations = {
  // ── Common ──
  teamAccess: string;
  logout: string;
  loading: string;
  saving: string;
  saved: string;
  cancel: string;
  close: string;
  copy: string;
  copied: string;
  optional: string;
  yes: string;
  no: string;
  deleteRecord: string;
  deleteTitle: string;
  deleteDesc: string;
  deletePermanent: string;
  deleteCTA: string;
  deleting: string;
  deletedTitle: string;
  deletedDesc: string;
  deleteError: string;
  errorGeneric: string;

  // ── Home ──
  tagline: string;
  heroTitle: string;
  heroAccent: string;
  heroSub: string;
  startCTA: string;
  processLabel: string;
  howTitle: string;
  howSub: string;
  step1Title: string; step1Desc: string;
  step2Title: string; step2Desc: string;
  step2Tags: string[];
  step3Title: string; step3Desc: string;
  whyTitle: string;
  why1: string; why2: string; why3: string;
  statPositions: string; statMinutes: string; statEncrypted: string; statResponse: string;
  footerProtocol: string;
  footerLegal: string;
  footerPrivacy: string;
  footerTerms: string;
  footerRights: string;

  // ── Patient – Intro ──
  pEstimate: string;
  pIntroTitle: string;
  pIntroDesc: string;
  pStep1Label: string; pStep1Detail: string;
  pStep2Label: string; pStep2Detail: string;
  pStep3Label: string; pStep3Detail: string;
  pDisclaimer: string;
  pBeginCTA: string;

  // ── Patient – Steps ──
  stepIntro: string; stepData: string; stepPhotos: string;

  // ── Patient – Data form ──
  pDataTitle: string;
  pDataSub: string;
  pFullName: string;
  pDocId: string;
  pPhone: string;
  pEmail: string;
  pAge: string;
  pAgePlaceholder: string;
  pCity: string;
  pCityPlaceholder: string;
  pHairHistory: string;
  pHairLossTime: string;
  pHairLossOpts: string[];
  pPattern: string;
  pPatternOpts: string[];
  pPrevTreatment: string;
  pPrevTreatOpts: string[];
  pSymptoms: string;
  pSymptomsPlaceholder: string;
  pSurgery: string;
  pSurgeryOpts: string[];
  pConsentTitle: string;
  pConsentLine1: string;
  pConsentLine2: string;
  pConsentCheckbox: string;
  pConsentMarketing: string;
  pContinueCTA: string;
  pSelectOpt: string;
  pSelectZone: string;

  // ── Patient – Photos ──
  pPhotosTitle: string;
  pPhotosSub: string;
  pPhotoGuide: string;
  pUseCamera: string;
  pUploadPhoto: string;
  pRetakePhoto: string;
  pChangeFile: string;
  pProcessing: string;
  pCompleted: string;
  pProgress: string;
  pSubmitCTA: string;
  pSending: string;
  pDuplicate: string;
  pBack: string;
  pExit: string;
  pTakePhoto: string;
  pUploadDevice: string;
  pUsePhoto: string;
  pRepeatPhoto: string;
  pUploadAnother: string;
  pPhotoOf: string;
  pSavedProgress: string;
  pSavedOnServer: string;
  pResumeTitle: string;
  pResumeDesc: string;
  pResumeCTA: string;
  pResumeRestart: string;
  pExitTitle: string;
  pExitDesc: string;
  pExitContinue: string;
  pExitSave: string;
  pExitDiscard: string;
  pExitDiscardConfirm: string;

  // ── Patient – Photo names ──
  photoFrontalTitle: string; photoFrontalDesc: string; photoFrontalTip: string;
  photoVertexTitle: string; photoVertexDesc: string; photoVertexTip: string;
  photoTRTitle: string; photoTRDesc: string; photoTRTip: string;
  photoTLTitle: string; photoTLDesc: string; photoTLTip: string;
  photoDonorTitle: string; photoDonorDesc: string; photoDonorTip: string;

  // ── Patient – Success ──
  pSuccessTitle: string;
  pSuccessDesc: string;
  pSuccessNext: string;
  pSuccessStep1: string;
  pSuccessStep2: string;
  pSuccessStep3: string;
  pGoHome: string;
  pDataError: string;
  pSaveError: string;
  pPhotoError: string;

  // ── Login ──
  loginTitle: string;
  loginSub: string;
  loginLabel: string;
  loginPlaceholder: string;
  loginCTA: string;
  loginVerifying: string;
  loginDenied: string;
  loginWrongPwd: string;
  loginBrandTitle: string;
  loginBrandSub: string;

  // ── Admin ──
  adminSection: string;
  adminPatients: string;
  adminDashTitle: string;
  adminDashSub: string;
  adminNewLink: string;
  adminTotal: string;
  adminNew: string;
  adminReady: string;
  adminPending: string;
  adminSearchPlaceholder: string;
  adminAllStatuses: string;
  adminColPatient: string;
  adminColStatus: string;
  adminColPhotos: string;
  adminColDate: string;
  adminColAction: string;
  adminLoading: string;
  adminEmpty: string;
  adminEmptySub: string;
  adminStatusPatient: string;
  adminAppDate: string;
  adminContactWA: string;
  adminPhotoReg: string;
  adminNoPhotos: string;
  adminPatientHistory: string;
  adminDocId: string;
  adminEmail: string;
  adminAge: string;
  adminCity: string;
  adminHairLossTime: string;
  adminZone: string;
  adminPrevTreatment: string;
  adminClinicalNotes: string;
  adminNorwood: string;
  adminNotesLabel: string;
  adminNotesPlaceholder: string;
  adminLoadingLead: string;
  adminSaved: string;
  adminSavedDesc: string;
  adminWAMessage: string;
  adminDemoWarning: string;
  adminInviteTitle: string;
  adminInviteNameLabel: string;
  adminInvitePhoneLabel: string;
  adminInviteGenerating: string;
  adminInviteGenCTA: string;
  adminInviteCreated: string;
  adminInviteCreatedSub: string;
  adminInviteSendWA: string;
  adminInviteError: string;
  adminLinkError: string;
  statusNuevo: string;
  statusIncompleto: string;
  statusListo: string;
  statusContactar: string;
  statusAgendado: string;
  statusCerrado: string;
};

const T: Record<LangCode, AppTranslations> = {
  es: {
    teamAccess: "Acceso Equipo", logout: "Cerrar sesión", loading: "Cargando...",
    saving: "Guardando...", saved: "Guardado", cancel: "Cancelar", close: "Cerrar",
    copy: "Copiar", copied: "Copiado", optional: "(opcional)",
    yes: "Sí", no: "No",
    deleteRecord: "Eliminar registro", deleteTitle: "Eliminar registro",
    deleteDesc: "Esta acción es permanente y no se puede deshacer. El registro del paciente y todas sus fotografías serán eliminadas.",
    deletePermanent: "permanente", deleteCTA: "Sí, eliminar", deleting: "Eliminando...",
    deletedTitle: "Registro eliminado", deletedDesc: "El caso fue eliminado permanentemente.",
    deleteError: "No se pudo eliminar el registro.", errorGeneric: "Ha ocurrido un error.",

    tagline: "Evaluación Médica Estandarizada",
    heroTitle: "Estandariza la captura de", heroAccent: "imágenes clínicas",
    heroSub: "Registra, compara y da seguimiento fotográfico a tus pacientes con un protocolo estandarizado, seguro y reproducible.",
    startCTA: "Iniciar Preevaluación",
    processLabel: "El Proceso",
    howTitle: "¿Cómo funciona?", howSub: "Un protocolo clínico diseñado para precisión y privacidad",
    step1Title: "Registro de Datos", step1Desc: "Antecedentes médicos y personales del paciente para contextualizar el análisis clínico.",
    step2Title: "Captura Guiada", step2Desc: "5 fotografías estandarizadas con guías de posición paso a paso desde cualquier dispositivo.",
    step2Tags: ["Frontal", "Vértex", "Temporal ×2", "Nuca"],
    step3Title: "Comparación & Seguimiento", step3Desc: "El equipo médico revisa y compara imágenes en el tiempo para un seguimiento clínico objetivo.",
    whyTitle: "¿Por qué estandarizar la imagen?",
    why1: "Comparación reproducible entre sesiones clínicas", why2: "Seguimiento objetivo del progreso del tratamiento", why3: "Registros fotográficos confiables para diagnóstico",
    statPositions: "Posiciones", statMinutes: "Minutos", statEncrypted: "Cifrado", statResponse: "Respuesta",
    footerProtocol: "Protocolo Clínico",
    footerLegal: "Esta preevaluación es un filtro preliminar y no reemplaza una consulta médica presencial, ni entrega un diagnóstico automático.",
    footerPrivacy: "Privacidad", footerTerms: "Términos", footerRights: "Todos los derechos reservados.",

    pEstimate: "Tiempo estimado: 4–6 minutos",
    pIntroTitle: "Preevaluación Clínica",
    pIntroDesc: "Este proceso nos permitirá conocer tu caso a detalle antes de la consulta presencial. Te pediremos tus datos y 5 fotografías precisas de tu cuero cabelludo.",
    pStep1Label: "Datos personales", pStep1Detail: "Antecedentes capilares básicos",
    pStep2Label: "Fotografías", pStep2Detail: "5 tomas guiadas paso a paso",
    pStep3Label: "Análisis médico", pStep3Detail: "Revisión clínica confidencial",
    pDisclaimer: "Esta preevaluación es estrictamente confidencial y no reemplaza una consulta médica presencial. No entrega diagnósticos automáticos.",
    pBeginCTA: "Comenzar Evaluación",

    stepIntro: "Inicio", stepData: "Datos", stepPhotos: "Fotografías",

    pDataTitle: "Tus Antecedentes", pDataSub: "Completa esta información básica para tu ficha clínica",
    pFullName: "Nombre completo *", pDocId: "Documento de identidad *",
    pPhone: "Teléfono móvil (WhatsApp) *", pEmail: "Correo electrónico *",
    pAge: "Edad", pAgePlaceholder: "Años", pCity: "Ciudad", pCityPlaceholder: "Selecciona tu ciudad o comuna",
    pHairHistory: "Historial Capilar",
    pHairLossTime: "¿Hace cuánto notas la pérdida de cabello?",
    pHairLossOpts: ["Menos de 6 meses", "6 meses a 1 año", "1 a 3 años", "Más de 3 años", "No estoy seguro"],
    pPattern: "¿Dónde se concentra la pérdida?",
    pPatternOpts: ["Frente / entradas", "Coronilla (parte superior)", "Frente y coronilla", "Todo el cuero cabelludo", "Zonas irregulares o dispersas"],
    pPrevTreatment: "¿Has usado algún tratamiento para la caída?",
    pPrevTreatOpts: ["Ninguno", "Minoxidil tópico", "Finasteride oral", "Minoxidil y Finasteride", "Plasma rico en plaquetas (PRP)", "Otro tratamiento"],
    pSymptoms: "¿Tienes algún síntoma asociado? (opcional)", pSymptomsPlaceholder: "Ej. picazón, caspa, irritación...",
    pSurgery: "¿Has tenido alguna cirugía de trasplante antes? (opcional)",
    pSurgeryOpts: ["No", "Sí, 1 cirugía previa", "Sí, 2 o más cirugías previas"],
    pConsentTitle: "Consentimiento y Privacidad",
    pConsentLine1: "Tus fotos y datos se transmiten de forma cifrada y son tratados con total confidencialidad.",
    pConsentLine2: "Esta evaluación preliminar no constituye un diagnóstico ni reemplaza una consulta médica presencial.",
    pConsentCheckbox: "He leído y acepto el tratamiento de mis datos personales y de las fotografías de mi cuero cabelludo con el fin exclusivo de realizar una pre-evaluación capilar y de que el centro me contacte con los resultados. Entiendo que esta evaluación preliminar no constituye un diagnóstico médico y que puedo revocar este consentimiento en cualquier momento.",
    pConsentMarketing: "Acepto recibir información comercial y promociones (opcional).",
    pContinueCTA: "Continuar a Fotografías",
    pSelectOpt: "Selecciona una opción", pSelectZone: "Selecciona una zona",

    pPhotosTitle: "Registro Fotográfico", pPhotosSub: "Necesitamos 5 tomas para tu evaluación clínica",
    pPhotoGuide: "Guía de posición", pUseCamera: "Usar Cámara", pUploadPhoto: "Subir Foto",
    pRetakePhoto: "Retomar foto", pChangeFile: "Cambiar archivo", pProcessing: "Procesando...",
    pCompleted: "Completada", pProgress: "Progreso", pSubmitCTA: "Enviar Evaluación", pSending: "Enviando...",
    pBack: "Volver",
    pExit: "Salir",
    pTakePhoto: "Tomar foto",
    pUploadDevice: "Subir desde el dispositivo",
    pUsePhoto: "Usar esta foto",
    pRepeatPhoto: "Repetir foto",
    pUploadAnother: "Subir otra foto",
    pPhotoOf: "Foto {n} de {total}",
    pSavedProgress: "Avance guardado",
    pSavedOnServer: "Guardada",
    pResumeTitle: "Tienes un avance guardado",
    pResumeDesc: "¿Quieres continuar desde donde quedaste?",
    pResumeCTA: "Continuar donde quedé",
    pResumeRestart: "Empezar desde el principio",
    pExitTitle: "¿Quieres salir de la preevaluación?",
    pExitDesc: "Tu avance guardado se conservará, pero los cambios sin guardar se perderán.",
    pExitContinue: "Continuar con la preevaluación",
    pExitSave: "Salir y conservar el avance",
    pExitDiscard: "Descartar preevaluación",
    pExitDiscardConfirm: "¿Seguro que quieres descartar todo el avance? Esta acción no se puede deshacer.",
    pDuplicate: "Ya existe una evaluación registrada con este teléfono o correo. Si necesitas ayuda, contáctanos directamente.",

    photoFrontalTitle: "Vista frontal", photoFrontalDesc: "De frente, centrado, buena iluminación. Muestra la línea de nacimiento del cabello.", photoFrontalTip: "Mira directamente a la cámara con buena luz natural. Mantén el cabello despejado de la frente.",
    photoVertexTitle: "Vértex / Coronilla", photoVertexDesc: "Inclina levemente la cabeza hacia adelante. La cámara apunta hacia abajo.", photoVertexTip: "Inclina la cabeza hacia abajo 45°. Pide a alguien que tome la foto desde arriba, apuntando a la coronilla.",
    photoTRTitle: "Temporal derecha", photoTRDesc: "Gira levemente hacia la izquierda para mostrar la entrada derecha.", photoTRTip: "Gira la cabeza ~30° hacia tu izquierda. La cámara debe mostrar claramente la entrada del lado derecho.",
    photoTLTitle: "Temporal izquierda", photoTLDesc: "Gira levemente hacia la derecha para mostrar la entrada izquierda.", photoTLTip: "Gira la cabeza ~30° hacia tu derecha. La cámara debe mostrar claramente la entrada del lado izquierdo.",
    photoDonorTitle: "Zona donante", photoDonorDesc: "Fotografía de la nuca / parte posterior de la cabeza.", photoDonorTip: "Inclina la cabeza ligeramente hacia adelante. La cámara apunta a la nuca, mostrando la zona posterior completa.",

    pSuccessTitle: "¡Tu evaluación fue recibida!", pSuccessDesc: "Nuestro equipo revisará tu información y fotografías. Recibirás una respuesta en un plazo máximo de 24 horas hábiles.",
    pSuccessNext: "¿Qué sigue ahora?", pSuccessStep1: "Revisión de tu caso (hasta 24 h hábiles)", pSuccessStep2: "Te contactaremos por WhatsApp o correo", pSuccessStep3: "Coordinamos tu consulta",
    pGoHome: "Volver al Inicio", pDataError: "Datos incompletos", pSaveError: "No pudimos guardar tu información. Intenta nuevamente.", pPhotoError: "Error al procesar imagen",

    loginTitle: "Bienvenido de vuelta", loginSub: "Ingresa tu contraseña para acceder al panel",
    loginLabel: "Contraseña de acceso", loginPlaceholder: "••••••••",
    loginCTA: "Ingresar al Panel", loginVerifying: "Verificando...",
    loginDenied: "Acceso denegado", loginWrongPwd: "La contraseña ingresada es incorrecta.",
    loginBrandTitle: "Plataforma de Gestión Clínica",
    loginBrandSub: "Acceso exclusivo para el equipo médico. Revisa preevaluaciones, asigna estados y contacta a tus pacientes con seguridad.",

    adminSection: "Gestión Clínica", adminPatients: "Pacientes",
    adminDashTitle: "Dashboard Pacientes", adminDashSub: "Gestión de preevaluaciones y seguimiento",
    adminNewLink: "Nuevo Enlace", adminTotal: "Total Pacientes", adminNew: "Nuevos", adminReady: "Listos / Agenda", adminPending: "Por completar",
    adminSearchPlaceholder: "Buscar por nombre o teléfono...", adminAllStatuses: "Todos los estados",
    adminColPatient: "Paciente", adminColStatus: "Estado", adminColPhotos: "Fotos", adminColDate: "Fecha de Ingreso", adminColAction: "Acción",
    adminLoading: "Cargando pacientes...", adminEmpty: "No se encontraron pacientes.", adminEmptySub: "Prueba ajustando los filtros de búsqueda.",
    adminStatusPatient: "Estado del Paciente", adminAppDate: "Fecha de Cita", adminContactWA: "Contactar por WhatsApp",
    adminPhotoReg: "Registro Fotográfico", adminNoPhotos: "El paciente aún no ha subido fotografías.",
    adminPatientHistory: "Antecedentes del Paciente", adminDocId: "Documento de Identidad", adminEmail: "Correo Electrónico",
    adminAge: "Edad", adminCity: "Ciudad", adminHairLossTime: "Tiempo de pérdida", adminZone: "Zona afectada", adminPrevTreatment: "Tratamientos previos",
    adminClinicalNotes: "Uso Interno Clínico", adminNorwood: "Escala Norwood (Evaluación)",
    adminNotesLabel: "Notas Clínicas", adminNotesPlaceholder: "Agrega anotaciones del caso, sugerencias de injertos o seguimiento aquí...",
    adminLoadingLead: "Cargando ficha del paciente...",
    adminSaved: "Guardado", adminSavedDesc: "Cambios registrados correctamente.",
    adminWAMessage: "Hola {name}, revisamos tu preevaluación clínica. Te contactamos de Clinivista para coordinar el siguiente paso.",
    adminDemoWarning: "Estás usando la contraseña de demostración. Configura ADMIN_PASSWORD en los secretos para asegurar el panel.",
    adminInviteTitle: "Nuevo Enlace", adminInviteNameLabel: "Nombre del paciente (opcional)", adminInvitePhoneLabel: "Teléfono móvil *",
    adminInviteGenerating: "Generando...", adminInviteGenCTA: "Generar Link de Evaluación",
    adminInviteCreated: "¡Enlace creado!", adminInviteCreatedSub: "Cópialo o envíalo directamente",
    adminInviteSendWA: "Enviar por WhatsApp", adminInviteError: "Error al crear enlace",
    adminLinkError: "Error al crear enlace",
    statusNuevo: "Nuevo", statusIncompleto: "Incompleto", statusListo: "Listo para revisión",
    statusContactar: "Contactar", statusAgendado: "Agendado", statusCerrado: "Cerrado",
  },

  en: {
    teamAccess: "Team Access", logout: "Sign out", loading: "Loading...",
    saving: "Saving...", saved: "Saved", cancel: "Cancel", close: "Close",
    copy: "Copy", copied: "Copied", optional: "(optional)",
    yes: "Yes", no: "No",
    deleteRecord: "Delete record", deleteTitle: "Delete record",
    deleteDesc: "This action is permanent and cannot be undone. The patient record and all photographs will be deleted.",
    deletePermanent: "permanent", deleteCTA: "Yes, delete", deleting: "Deleting...",
    deletedTitle: "Record deleted", deletedDesc: "The case was permanently deleted.",
    deleteError: "Could not delete the record.", errorGeneric: "An error occurred.",

    tagline: "Standardized Medical Evaluation",
    heroTitle: "Standardize clinical", heroAccent: "image capture",
    heroSub: "Document, compare and track your patients photographically with a standardized, secure and reproducible protocol.",
    startCTA: "Start Pre-evaluation",
    processLabel: "The Process",
    howTitle: "How does it work?", howSub: "A clinical protocol designed for precision and privacy",
    step1Title: "Data Registration", step1Desc: "Medical and personal history to contextualize the clinical analysis.",
    step2Title: "Guided Capture", step2Desc: "5 standardized photographs with step-by-step positioning guides from any device.",
    step2Tags: ["Frontal", "Vertex", "Temporal ×2", "Nape"],
    step3Title: "Comparison & Follow-up", step3Desc: "The medical team reviews and compares images over time for objective clinical tracking.",
    whyTitle: "Why standardize imaging?",
    why1: "Reproducible comparison between clinical sessions", why2: "Objective tracking of treatment progress", why3: "Reliable photographic records for diagnosis",
    statPositions: "Positions", statMinutes: "Minutes", statEncrypted: "Encrypted", statResponse: "Response",
    footerProtocol: "Clinical Protocol",
    footerLegal: "This pre-evaluation is a preliminary filter and does not replace an in-person medical consultation or deliver automatic diagnoses.",
    footerPrivacy: "Privacy", footerTerms: "Terms", footerRights: "All rights reserved.",

    pEstimate: "Estimated time: 4–6 minutes",
    pIntroTitle: "Clinical Pre-evaluation",
    pIntroDesc: "This process will allow us to understand your case in detail before your in-person consultation. We will ask for your information and 5 precise photographs of your scalp.",
    pStep1Label: "Personal data", pStep1Detail: "Basic hair history",
    pStep2Label: "Photographs", pStep2Detail: "5 guided shots step by step",
    pStep3Label: "Medical analysis", pStep3Detail: "Confidential clinical review",
    pDisclaimer: "This pre-evaluation is strictly confidential and does not replace an in-person medical consultation. It does not provide automatic diagnoses.",
    pBeginCTA: "Start Evaluation",

    stepIntro: "Intro", stepData: "Data", stepPhotos: "Photos",

    pDataTitle: "Your Medical History", pDataSub: "Complete this basic information for your clinical file",
    pFullName: "Full name *", pDocId: "Identity document *",
    pPhone: "Mobile phone (WhatsApp) *", pEmail: "Email address *",
    pAge: "Age", pAgePlaceholder: "Years", pCity: "City", pCityPlaceholder: "Select your city",
    pHairHistory: "Hair History",
    pHairLossTime: "How long have you noticed hair loss?",
    pHairLossOpts: ["Less than 6 months", "6 months to 1 year", "1 to 3 years", "More than 3 years", "Not sure"],
    pPattern: "Where is the loss concentrated?",
    pPatternOpts: ["Front / hairline", "Crown (top)", "Front and crown", "Entire scalp", "Irregular or scattered areas"],
    pPrevTreatment: "Have you used any hair loss treatment?",
    pPrevTreatOpts: ["None", "Topical Minoxidil", "Oral Finasteride", "Minoxidil and Finasteride", "Platelet-rich plasma (PRP)", "Other treatment"],
    pSymptoms: "Do you have any associated symptoms? (optional)", pSymptomsPlaceholder: "E.g. itching, dandruff, irritation...",
    pSurgery: "Have you had a hair transplant surgery before? (optional)",
    pSurgeryOpts: ["No", "Yes, 1 previous surgery", "Yes, 2 or more previous surgeries"],
    pConsentTitle: "Consent & Privacy",
    pConsentLine1: "Your photos and data are transmitted encrypted and treated with full confidentiality.",
    pConsentLine2: "This preliminary evaluation does not constitute a diagnosis or replace an in-person medical consultation.",
    pConsentCheckbox: "I have read and accept the processing of my personal data and scalp photographs for the sole purpose of a preliminary hair evaluation and for the centre to contact me with the results. I understand this preliminary evaluation is not a medical diagnosis and I may withdraw this consent at any time.",
    pConsentMarketing: "I agree to receive commercial information and promotions (optional).",
    pContinueCTA: "Continue to Photos",
    pSelectOpt: "Select an option", pSelectZone: "Select an area",

    pPhotosTitle: "Photo Registration", pPhotosSub: "We need 5 shots for your clinical evaluation",
    pPhotoGuide: "Position guide", pUseCamera: "Use Camera", pUploadPhoto: "Upload Photo",
    pRetakePhoto: "Retake photo", pChangeFile: "Change file", pProcessing: "Processing...",
    pCompleted: "Completed", pProgress: "Progress", pSubmitCTA: "Submit Evaluation", pSending: "Sending...",
    pBack: "Back",
    pExit: "Exit",
    pTakePhoto: "Take photo",
    pUploadDevice: "Upload from device",
    pUsePhoto: "Use this photo",
    pRepeatPhoto: "Retake photo",
    pUploadAnother: "Upload another photo",
    pPhotoOf: "Photo {n} of {total}",
    pSavedProgress: "Progress saved",
    pSavedOnServer: "Saved",
    pResumeTitle: "You have saved progress",
    pResumeDesc: "Do you want to continue where you left off?",
    pResumeCTA: "Continue where I left off",
    pResumeRestart: "Start from the beginning",
    pExitTitle: "Do you want to exit the pre-evaluation?",
    pExitDesc: "Your saved progress will be kept, but unsaved changes will be lost.",
    pExitContinue: "Continue the pre-evaluation",
    pExitSave: "Exit and keep progress",
    pExitDiscard: "Discard pre-evaluation",
    pExitDiscardConfirm: "Are you sure you want to discard all progress? This cannot be undone.",
    pDuplicate: "An evaluation with this phone or email already exists. Contact us directly if you need help.",

    photoFrontalTitle: "Frontal view", photoFrontalDesc: "Face forward, centered, good lighting. Show the hairline.", photoFrontalTip: "Look directly at the camera with good natural light. Keep hair away from the forehead.",
    photoVertexTitle: "Vertex / Crown", photoVertexDesc: "Tilt your head slightly forward. Camera points down.", photoVertexTip: "Tilt your head 45° down. Have someone take the photo from above, pointing at the crown.",
    photoTRTitle: "Right temple", photoTRDesc: "Turn slightly left to show the right hairline.", photoTRTip: "Turn your head ~30° to your left. The camera should clearly show the right side entry.",
    photoTLTitle: "Left temple", photoTLDesc: "Turn slightly right to show the left hairline.", photoTLTip: "Turn your head ~30° to your right. The camera should clearly show the left side entry.",
    photoDonorTitle: "Donor area", photoDonorDesc: "Photo of the nape / back of the head.", photoDonorTip: "Tilt your head slightly forward. Camera points at the nape, showing the full posterior area.",

    pSuccessTitle: "Your evaluation was received!", pSuccessDesc: "Our team will review your information and photos. You will receive a response within 24 business hours.",
    pSuccessNext: "What happens next?", pSuccessStep1: "Review of your case (up to 24 business hours)", pSuccessStep2: "We will contact you via WhatsApp or email", pSuccessStep3: "We schedule your consultation",
    pGoHome: "Go back home", pDataError: "Incomplete data", pSaveError: "We could not save your information. Please try again.", pPhotoError: "Error processing image",

    loginTitle: "Welcome back", loginSub: "Enter your password to access the panel",
    loginLabel: "Access password", loginPlaceholder: "••••••••",
    loginCTA: "Enter Panel", loginVerifying: "Verifying...",
    loginDenied: "Access denied", loginWrongPwd: "The password entered is incorrect.",
    loginBrandTitle: "Clinical Management Platform",
    loginBrandSub: "Exclusive access for the medical team. Review pre-evaluations, assign statuses and contact your patients securely.",

    adminSection: "Clinical Management", adminPatients: "Patients",
    adminDashTitle: "Patient Dashboard", adminDashSub: "Pre-evaluation management and follow-up",
    adminNewLink: "New Link", adminTotal: "Total Patients", adminNew: "New", adminReady: "Ready / Scheduled", adminPending: "To complete",
    adminSearchPlaceholder: "Search by name or phone...", adminAllStatuses: "All statuses",
    adminColPatient: "Patient", adminColStatus: "Status", adminColPhotos: "Photos", adminColDate: "Admission Date", adminColAction: "Action",
    adminLoading: "Loading patients...", adminEmpty: "No patients found.", adminEmptySub: "Try adjusting the search filters.",
    adminStatusPatient: "Patient Status", adminAppDate: "Appointment Date", adminContactWA: "Contact via WhatsApp",
    adminPhotoReg: "Photo Registry", adminNoPhotos: "The patient has not uploaded photos yet.",
    adminPatientHistory: "Patient History", adminDocId: "Identity Document", adminEmail: "Email",
    adminAge: "Age", adminCity: "City", adminHairLossTime: "Duration of loss", adminZone: "Affected area", adminPrevTreatment: "Previous treatments",
    adminClinicalNotes: "Internal Clinical Use", adminNorwood: "Norwood Scale (Evaluation)",
    adminNotesLabel: "Clinical Notes", adminNotesPlaceholder: "Add case notes, graft suggestions or follow-up here...",
    adminLoadingLead: "Loading patient file...",
    adminSaved: "Saved", adminSavedDesc: "Changes recorded successfully.",
    adminWAMessage: "Hello {name}, we reviewed your clinical pre-evaluation. Clinivista is contacting you to coordinate the next step.",
    adminDemoWarning: "You are using the demo password. Set ADMIN_PASSWORD in secrets to secure the panel.",
    adminInviteTitle: "New Link", adminInviteNameLabel: "Patient name (optional)", adminInvitePhoneLabel: "Mobile phone *",
    adminInviteGenerating: "Generating...", adminInviteGenCTA: "Generate Evaluation Link",
    adminInviteCreated: "Link created!", adminInviteCreatedSub: "Copy it or send it directly",
    adminInviteSendWA: "Send via WhatsApp", adminInviteError: "Error creating link",
    adminLinkError: "Error creating link",
    statusNuevo: "New", statusIncompleto: "Incomplete", statusListo: "Ready for review",
    statusContactar: "Contact", statusAgendado: "Scheduled", statusCerrado: "Closed",
  },

  pt: {
    teamAccess: "Acesso Equipe", logout: "Sair", loading: "Carregando...",
    saving: "Salvando...", saved: "Salvo", cancel: "Cancelar", close: "Fechar",
    copy: "Copiar", copied: "Copiado", optional: "(opcional)",
    yes: "Sim", no: "Não",
    deleteRecord: "Excluir registro", deleteTitle: "Excluir registro",
    deleteDesc: "Esta ação é permanente e não pode ser desfeita. O registro do paciente e todas as fotografias serão excluídos.",
    deletePermanent: "permanente", deleteCTA: "Sim, excluir", deleting: "Excluindo...",
    deletedTitle: "Registro excluído", deletedDesc: "O caso foi excluído permanentemente.",
    deleteError: "Não foi possível excluir o registro.", errorGeneric: "Ocorreu um erro.",

    tagline: "Avaliação Médica Padronizada",
    heroTitle: "Padronize a captura de", heroAccent: "imagens clínicas",
    heroSub: "Registre, compare e acompanhe seus pacientes fotograficamente com um protocolo padronizado, seguro e reproduzível.",
    startCTA: "Iniciar Pré-avaliação", processLabel: "O Processo",
    howTitle: "Como funciona?", howSub: "Um protocolo clínico projetado para precisão e privacidade",
    step1Title: "Registro de Dados", step1Desc: "Histórico médico e pessoal do paciente para contextualizar a análise clínica.",
    step2Title: "Captura Guiada", step2Desc: "5 fotografias padronizadas com guias de posicionamento passo a passo.",
    step2Tags: ["Frontal", "Vértex", "Temporal ×2", "Nuca"],
    step3Title: "Comparação & Acompanhamento", step3Desc: "A equipe médica analisa e compara imagens ao longo do tempo para acompanhamento objetivo.",
    whyTitle: "Por que padronizar imagens?",
    why1: "Comparação reproduzível entre sessões clínicas", why2: "Acompanhamento objetivo do progresso do tratamento", why3: "Registros fotográficos confiáveis para diagnóstico",
    statPositions: "Posições", statMinutes: "Minutos", statEncrypted: "Criptografado", statResponse: "Resposta",
    footerProtocol: "Protocolo Clínico",
    footerLegal: "Esta pré-avaliação é um filtro preliminar e não substitui uma consulta médica presencial.",
    footerPrivacy: "Privacidade", footerTerms: "Termos", footerRights: "Todos os direitos reservados.",

    pEstimate: "Tempo estimado: 4–6 minutos", pIntroTitle: "Pré-avaliação Clínica",
    pIntroDesc: "Este processo nos permitirá conhecer seu caso em detalhes antes da consulta presencial. Pediremos seus dados e 5 fotografias precisas do couro cabeludo.",
    pStep1Label: "Dados pessoais", pStep1Detail: "Histórico capilar básico",
    pStep2Label: "Fotografias", pStep2Detail: "5 tomadas guiadas passo a passo",
    pStep3Label: "Análise médica", pStep3Detail: "Revisão clínica confidencial",
    pDisclaimer: "Esta pré-avaliação é estritamente confidencial e não substitui uma consulta médica presencial.",
    pBeginCTA: "Iniciar Avaliação",
    stepIntro: "Início", stepData: "Dados", stepPhotos: "Fotografias",
    pDataTitle: "Seus Antecedentes", pDataSub: "Complete estas informações para seu prontuário",
    pFullName: "Nome completo *", pDocId: "Documento de identidade *",
    pPhone: "Celular (WhatsApp) *", pEmail: "E-mail *",
    pAge: "Idade", pAgePlaceholder: "Anos", pCity: "Cidade", pCityPlaceholder: "Selecione sua cidade",
    pHairHistory: "Histórico Capilar",
    pHairLossTime: "Há quanto tempo nota a perda de cabelo?",
    pHairLossOpts: ["Menos de 6 meses", "6 meses a 1 ano", "1 a 3 anos", "Mais de 3 anos", "Não tenho certeza"],
    pPattern: "Onde se concentra a perda?",
    pPatternOpts: ["Frente / entradas", "Coroa (parte superior)", "Frente e coroa", "Todo o couro cabeludo", "Áreas irregulares ou dispersas"],
    pPrevTreatment: "Já usou algum tratamento para queda?",
    pPrevTreatOpts: ["Nenhum", "Minoxidil tópico", "Finasterida oral", "Minoxidil e Finasterida", "Plasma rico em plaquetas (PRP)", "Outro tratamento"],
    pSymptoms: "Tem algum sintoma associado? (opcional)", pSymptomsPlaceholder: "Ex. coceira, caspa, irritação...",
    pSurgery: "Já fez cirurgia de transplante? (opcional)",
    pSurgeryOpts: ["Não", "Sim, 1 cirurgia anterior", "Sim, 2 ou mais cirurgias anteriores"],
    pConsentTitle: "Consentimento e Privacidade",
    pConsentLine1: "Suas fotos e dados são transmitidos criptografados e tratados com total confidencialidade.",
    pConsentLine2: "Esta avaliação preliminar não constitui diagnóstico nem substitui consulta médica presencial.",
    pConsentCheckbox: "Li e aceito o tratamento dos meus dados pessoais e das fotografias do meu couro cabeludo com o fim exclusivo de realizar uma pré-avaliação capilar e de que o centro entre em contato com os resultados. Entendo que esta avaliação preliminar não constitui diagnóstico médico e que posso revogar este consentimento a qualquer momento.",
    pConsentMarketing: "Aceito receber informações comerciais e promoções (opcional).",
    pContinueCTA: "Continuar para Fotografias",
    pSelectOpt: "Selecione uma opção", pSelectZone: "Selecione uma área",
    pPhotosTitle: "Registro Fotográfico", pPhotosSub: "Precisamos de 5 fotos para sua avaliação clínica",
    pPhotoGuide: "Guia de posição", pUseCamera: "Usar Câmera", pUploadPhoto: "Enviar Foto",
    pRetakePhoto: "Refazer foto", pChangeFile: "Trocar arquivo", pProcessing: "Processando...",
    pCompleted: "Concluída", pProgress: "Progresso", pSubmitCTA: "Enviar Avaliação", pSending: "Enviando...",
    pBack: "Voltar",
    pExit: "Sair",
    pTakePhoto: "Tirar foto",
    pUploadDevice: "Enviar do dispositivo",
    pUsePhoto: "Usar esta foto",
    pRepeatPhoto: "Repetir foto",
    pUploadAnother: "Enviar outra foto",
    pPhotoOf: "Foto {n} de {total}",
    pSavedProgress: "Progresso salvo",
    pSavedOnServer: "Salva",
    pResumeTitle: "Você tem progresso salvo",
    pResumeDesc: "Deseja continuar de onde parou?",
    pResumeCTA: "Continuar de onde parei",
    pResumeRestart: "Começar do início",
    pExitTitle: "Deseja sair da pré-avaliação?",
    pExitDesc: "Seu progresso salvo será mantido, mas as alterações não salvas serão perdidas.",
    pExitContinue: "Continuar a pré-avaliação",
    pExitSave: "Sair e manter o progresso",
    pExitDiscard: "Descartar pré-avaliação",
    pExitDiscardConfirm: "Tem certeza de que deseja descartar todo o progresso? Isso não pode ser desfeito.",
    pDuplicate: "Já existe uma avaliação com este telefone ou e-mail. Contate-nos diretamente se precisar de ajuda.",
    photoFrontalTitle: "Vista frontal", photoFrontalDesc: "De frente, centralizado, boa iluminação.", photoFrontalTip: "Olhe diretamente para a câmera com boa luz natural.",
    photoVertexTitle: "Vértex / Coroa", photoVertexDesc: "Incline levemente a cabeça para frente.", photoVertexTip: "Incline a cabeça 45°. Peça a alguém para tirar a foto de cima.",
    photoTRTitle: "Têmpora direita", photoTRDesc: "Vire levemente para a esquerda.", photoTRTip: "Gire a cabeça ~30° para a esquerda.",
    photoTLTitle: "Têmpora esquerda", photoTLDesc: "Vire levemente para a direita.", photoTLTip: "Gire a cabeça ~30° para a direita.",
    photoDonorTitle: "Área doadora", photoDonorDesc: "Foto da nuca / parte posterior.", photoDonorTip: "Incline levemente a cabeça para frente. Câmera aponta para a nuca.",
    pSuccessTitle: "Sua avaliação foi recebida!", pSuccessDesc: "Nossa equipe revisará suas informações e fotos. Você receberá uma resposta em até 24 horas úteis.",
    pSuccessNext: "O que vem a seguir?", pSuccessStep1: "Revisão do seu caso (até 24 h úteis)", pSuccessStep2: "Entraremos em contato por WhatsApp ou e-mail", pSuccessStep3: "Agendaremos sua consulta",
    pGoHome: "Voltar ao Início", pDataError: "Dados incompletos", pSaveError: "Não foi possível salvar suas informações.", pPhotoError: "Erro ao processar imagem",
    loginTitle: "Bem-vindo de volta", loginSub: "Digite sua senha para acessar o painel",
    loginLabel: "Senha de acesso", loginPlaceholder: "••••••••", loginCTA: "Entrar no Painel", loginVerifying: "Verificando...",
    loginDenied: "Acesso negado", loginWrongPwd: "A senha inserida está incorreta.",
    loginBrandTitle: "Plataforma de Gestão Clínica", loginBrandSub: "Acesso exclusivo para a equipe médica.",
    adminSection: "Gestão Clínica", adminPatients: "Pacientes", adminDashTitle: "Painel de Pacientes", adminDashSub: "Gestão de pré-avaliações e acompanhamento",
    adminNewLink: "Novo Link", adminTotal: "Total Pacientes", adminNew: "Novos", adminReady: "Prontos / Agenda", adminPending: "A completar",
    adminSearchPlaceholder: "Buscar por nome ou telefone...", adminAllStatuses: "Todos os status",
    adminColPatient: "Paciente", adminColStatus: "Status", adminColPhotos: "Fotos", adminColDate: "Data de Admissão", adminColAction: "Ação",
    adminLoading: "Carregando pacientes...", adminEmpty: "Nenhum paciente encontrado.", adminEmptySub: "Tente ajustar os filtros.",
    adminStatusPatient: "Status do Paciente", adminAppDate: "Data da Consulta", adminContactWA: "Contactar via WhatsApp",
    adminPhotoReg: "Registro Fotográfico", adminNoPhotos: "O paciente ainda não enviou fotos.",
    adminPatientHistory: "Histórico do Paciente", adminDocId: "Documento de Identidade", adminEmail: "E-mail",
    adminAge: "Idade", adminCity: "Cidade", adminHairLossTime: "Duração da perda", adminZone: "Área afetada", adminPrevTreatment: "Tratamentos anteriores",
    adminClinicalNotes: "Uso Interno Clínico", adminNorwood: "Escala Norwood (Avaliação)",
    adminNotesLabel: "Notas Clínicas", adminNotesPlaceholder: "Adicione notas do caso, sugestões de enxertos ou acompanhamento aqui...",
    adminLoadingLead: "Carregando ficha do paciente...", adminSaved: "Salvo", adminSavedDesc: "Alterações registradas com sucesso.",
    adminWAMessage: "Olá {name}, revisamos sua pré-avaliação clínica. A Clinivista está entrando em contato para coordenar o próximo passo.",
    adminDemoWarning: "Você está usando a senha de demonstração. Configure ADMIN_PASSWORD nos segredos para proteger o painel.",
    adminInviteTitle: "Novo Link", adminInviteNameLabel: "Nome do paciente (opcional)", adminInvitePhoneLabel: "Celular *",
    adminInviteGenerating: "Gerando...", adminInviteGenCTA: "Gerar Link de Avaliação",
    adminInviteCreated: "Link criado!", adminInviteCreatedSub: "Copie ou envie diretamente",
    adminInviteSendWA: "Enviar via WhatsApp", adminInviteError: "Erro ao criar link", adminLinkError: "Erro ao criar link",
    statusNuevo: "Novo", statusIncompleto: "Incompleto", statusListo: "Pronto para revisão",
    statusContactar: "Contatar", statusAgendado: "Agendado", statusCerrado: "Encerrado",
  },

  fr: {
    teamAccess: "Accès Équipe", logout: "Déconnexion", loading: "Chargement...",
    saving: "Enregistrement...", saved: "Enregistré", cancel: "Annuler", close: "Fermer",
    copy: "Copier", copied: "Copié", optional: "(optionnel)",
    yes: "Oui", no: "Non",
    deleteRecord: "Supprimer le dossier", deleteTitle: "Supprimer le dossier",
    deleteDesc: "Cette action est permanente et irréversible. Le dossier patient et toutes ses photos seront supprimés.",
    deletePermanent: "permanente", deleteCTA: "Oui, supprimer", deleting: "Suppression...",
    deletedTitle: "Dossier supprimé", deletedDesc: "Le cas a été définitivement supprimé.",
    deleteError: "Impossible de supprimer le dossier.", errorGeneric: "Une erreur s'est produite.",
    tagline: "Évaluation Médicale Standardisée",
    heroTitle: "Standardisez la capture d'", heroAccent: "images cliniques",
    heroSub: "Documentez, comparez et suivez vos patients photographiquement avec un protocole standardisé, sécurisé et reproductible.",
    startCTA: "Commencer l'évaluation", processLabel: "Le Processus",
    howTitle: "Comment ça marche ?", howSub: "Un protocole clinique conçu pour la précision et la confidentialité",
    step1Title: "Enregistrement des données", step1Desc: "Antécédents médicaux et personnels pour contextualiser l'analyse clinique.",
    step2Title: "Capture guidée", step2Desc: "5 photos standardisées avec guides de positionnement étape par étape.",
    step2Tags: ["Frontal", "Vertex", "Temporal ×2", "Nuque"],
    step3Title: "Comparaison & Suivi", step3Desc: "L'équipe médicale examine et compare les images dans le temps pour un suivi objectif.",
    whyTitle: "Pourquoi standardiser l'imagerie ?",
    why1: "Comparaison reproductible entre séances cliniques", why2: "Suivi objectif de la progression du traitement", why3: "Dossiers photographiques fiables pour le diagnostic",
    statPositions: "Positions", statMinutes: "Minutes", statEncrypted: "Chiffré", statResponse: "Réponse",
    footerProtocol: "Protocole Clinique",
    footerLegal: "Cette pré-évaluation est un filtre préliminaire et ne remplace pas une consultation médicale en personne.",
    footerPrivacy: "Confidentialité", footerTerms: "Conditions", footerRights: "Tous droits réservés.",
    pEstimate: "Temps estimé : 4–6 minutes", pIntroTitle: "Pré-évaluation Clinique",
    pIntroDesc: "Ce processus nous permettra de comprendre votre cas en détail avant votre consultation. Nous vous demanderons vos données et 5 photos précises de votre cuir chevelu.",
    pStep1Label: "Données personnelles", pStep1Detail: "Historique capillaire de base",
    pStep2Label: "Photographies", pStep2Detail: "5 prises guidées étape par étape",
    pStep3Label: "Analyse médicale", pStep3Detail: "Révision clinique confidentielle",
    pDisclaimer: "Cette pré-évaluation est strictement confidentielle et ne remplace pas une consultation médicale.",
    pBeginCTA: "Commencer l'évaluation",
    stepIntro: "Accueil", stepData: "Données", stepPhotos: "Photos",
    pDataTitle: "Vos Antécédents", pDataSub: "Complétez ces informations pour votre dossier clinique",
    pFullName: "Nom complet *", pDocId: "Document d'identité *",
    pPhone: "Téléphone mobile (WhatsApp) *", pEmail: "Adresse e-mail *",
    pAge: "Âge", pAgePlaceholder: "Ans", pCity: "Ville", pCityPlaceholder: "Sélectionnez votre ville",
    pHairHistory: "Historique Capillaire",
    pHairLossTime: "Depuis combien de temps notez-vous la perte de cheveux ?",
    pHairLossOpts: ["Moins de 6 mois", "6 mois à 1 an", "1 à 3 ans", "Plus de 3 ans", "Je ne suis pas sûr"],
    pPattern: "Où se concentre la perte ?",
    pPatternOpts: ["Front / ligne capillaire", "Vertex (sommet)", "Front et vertex", "Tout le cuir chevelu", "Zones irrégulières ou dispersées"],
    pPrevTreatment: "Avez-vous utilisé un traitement contre la chute ?",
    pPrevTreatOpts: ["Aucun", "Minoxidil topique", "Finastéride oral", "Minoxidil et Finastéride", "Plasma riche en plaquettes (PRP)", "Autre traitement"],
    pSymptoms: "Avez-vous des symptômes associés ? (optionnel)", pSymptomsPlaceholder: "Ex. démangeaisons, pellicules...",
    pSurgery: "Avez-vous eu une greffe capillaire ? (optionnel)",
    pSurgeryOpts: ["Non", "Oui, 1 chirurgie antérieure", "Oui, 2 chirurgies ou plus"],
    pConsentTitle: "Consentement et Confidentialité",
    pConsentLine1: "Vos photos et données sont transmises chiffrées et traitées avec confidentialité totale.",
    pConsentLine2: "Cette évaluation ne constitue pas un diagnostic et ne remplace pas une consultation médicale.",
    pConsentCheckbox: "J'ai lu et j'accepte le traitement de mes données personnelles et des photos de mon cuir chevelu dans le seul but d'une pré-évaluation capillaire et afin que le centre me contacte avec les résultats. Je comprends que cette évaluation préliminaire ne constitue pas un diagnostic médical et que je peux révoquer ce consentement à tout moment.",
    pConsentMarketing: "J'accepte de recevoir des informations commerciales et des promotions (facultatif).",
    pContinueCTA: "Continuer vers les Photos",
    pSelectOpt: "Sélectionnez une option", pSelectZone: "Sélectionnez une zone",
    pPhotosTitle: "Registre Photographique", pPhotosSub: "Nous avons besoin de 5 photos pour votre évaluation clinique",
    pPhotoGuide: "Guide de position", pUseCamera: "Utiliser la caméra", pUploadPhoto: "Télécharger une photo",
    pRetakePhoto: "Reprendre la photo", pChangeFile: "Changer le fichier", pProcessing: "Traitement...",
    pCompleted: "Complétée", pProgress: "Progression", pSubmitCTA: "Envoyer l'évaluation", pSending: "Envoi...",
    pBack: "Retour",
    pExit: "Quitter",
    pTakePhoto: "Prendre une photo",
    pUploadDevice: "Importer depuis l'appareil",
    pUsePhoto: "Utiliser cette photo",
    pRepeatPhoto: "Reprendre la photo",
    pUploadAnother: "Importer une autre photo",
    pPhotoOf: "Photo {n} sur {total}",
    pSavedProgress: "Progression enregistrée",
    pSavedOnServer: "Enregistrée",
    pResumeTitle: "Vous avez une progression enregistrée",
    pResumeDesc: "Voulez-vous continuer là où vous vous êtes arrêté ?",
    pResumeCTA: "Reprendre où j'en étais",
    pResumeRestart: "Recommencer depuis le début",
    pExitTitle: "Voulez-vous quitter la préévaluation ?",
    pExitDesc: "Votre progression enregistrée sera conservée, mais les modifications non enregistrées seront perdues.",
    pExitContinue: "Continuer la préévaluation",
    pExitSave: "Quitter et conserver la progression",
    pExitDiscard: "Abandonner la préévaluation",
    pExitDiscardConfirm: "Voulez-vous vraiment abandonner toute la progression ? Cette action est irréversible.",
    pDuplicate: "Une évaluation avec ce téléphone ou e-mail existe déjà. Contactez-nous directement si vous avez besoin d'aide.",
    photoFrontalTitle: "Vue frontale", photoFrontalDesc: "Face à l'appareil, centré, bonne luminosité.", photoFrontalTip: "Regardez directement la caméra avec une bonne lumière naturelle.",
    photoVertexTitle: "Vertex / Sommet", photoVertexDesc: "Inclinez légèrement la tête vers l'avant.", photoVertexTip: "Inclinez la tête à 45°. Faites prendre la photo de dessus.",
    photoTRTitle: "Tempe droite", photoTRDesc: "Tournez légèrement vers la gauche.", photoTRTip: "Tournez la tête ~30° vers votre gauche.",
    photoTLTitle: "Tempe gauche", photoTLDesc: "Tournez légèrement vers la droite.", photoTLTip: "Tournez la tête ~30° vers votre droite.",
    photoDonorTitle: "Zone donneuse", photoDonorDesc: "Photo de la nuque / partie postérieure.", photoDonorTip: "Inclinez légèrement la tête. La caméra pointe vers la nuque.",
    pSuccessTitle: "Votre évaluation a été reçue !", pSuccessDesc: "Notre équipe examinera vos informations et photos dans un délai de 24 heures ouvrables.",
    pSuccessNext: "Quelle est la suite ?", pSuccessStep1: "Révision de votre cas (jusqu'à 24 h ouvrables)", pSuccessStep2: "Nous vous contacterons par WhatsApp ou e-mail", pSuccessStep3: "Nous planifions votre consultation",
    pGoHome: "Retour à l'accueil", pDataError: "Données incomplètes", pSaveError: "Impossible de sauvegarder vos informations.", pPhotoError: "Erreur lors du traitement de l'image",
    loginTitle: "Bon retour", loginSub: "Entrez votre mot de passe pour accéder au panneau",
    loginLabel: "Mot de passe d'accès", loginPlaceholder: "••••••••", loginCTA: "Accéder au panneau", loginVerifying: "Vérification...",
    loginDenied: "Accès refusé", loginWrongPwd: "Le mot de passe saisi est incorrect.",
    loginBrandTitle: "Plateforme de Gestion Clinique", loginBrandSub: "Accès exclusif pour l'équipe médicale.",
    adminSection: "Gestion Clinique", adminPatients: "Patients", adminDashTitle: "Tableau de bord Patients", adminDashSub: "Gestion des pré-évaluations et suivi",
    adminNewLink: "Nouveau lien", adminTotal: "Total patients", adminNew: "Nouveaux", adminReady: "Prêts / Agenda", adminPending: "À compléter",
    adminSearchPlaceholder: "Rechercher par nom ou téléphone...", adminAllStatuses: "Tous les statuts",
    adminColPatient: "Patient", adminColStatus: "Statut", adminColPhotos: "Photos", adminColDate: "Date d'admission", adminColAction: "Action",
    adminLoading: "Chargement des patients...", adminEmpty: "Aucun patient trouvé.", adminEmptySub: "Essayez d'ajuster les filtres.",
    adminStatusPatient: "Statut du patient", adminAppDate: "Date de rendez-vous", adminContactWA: "Contacter via WhatsApp",
    adminPhotoReg: "Registre photographique", adminNoPhotos: "Le patient n'a pas encore téléchargé de photos.",
    adminPatientHistory: "Antécédents du patient", adminDocId: "Document d'identité", adminEmail: "E-mail",
    adminAge: "Âge", adminCity: "Ville", adminHairLossTime: "Durée de la perte", adminZone: "Zone affectée", adminPrevTreatment: "Traitements antérieurs",
    adminClinicalNotes: "Usage interne clinique", adminNorwood: "Échelle Norwood (Évaluation)",
    adminNotesLabel: "Notes cliniques", adminNotesPlaceholder: "Ajoutez des notes de cas, suggestions de greffes ou suivi ici...",
    adminLoadingLead: "Chargement du dossier patient...", adminSaved: "Enregistré", adminSavedDesc: "Modifications enregistrées avec succès.",
    adminWAMessage: "Bonjour {name}, nous avons examiné votre pré-évaluation. Clinivista vous contacte pour coordonner la prochaine étape.",
    adminDemoWarning: "Vous utilisez le mot de passe de démonstration. Configurez ADMIN_PASSWORD dans les secrets.",
    adminInviteTitle: "Nouveau lien", adminInviteNameLabel: "Nom du patient (optionnel)", adminInvitePhoneLabel: "Téléphone *",
    adminInviteGenerating: "Génération...", adminInviteGenCTA: "Générer le lien d'évaluation",
    adminInviteCreated: "Lien créé !", adminInviteCreatedSub: "Copiez-le ou envoyez-le directement",
    adminInviteSendWA: "Envoyer via WhatsApp", adminInviteError: "Erreur lors de la création du lien", adminLinkError: "Erreur lors de la création du lien",
    statusNuevo: "Nouveau", statusIncompleto: "Incomplet", statusListo: "Prêt pour révision",
    statusContactar: "Contacter", statusAgendado: "Planifié", statusCerrado: "Fermé",
  },

  de: {
    teamAccess: "Team-Zugang", logout: "Abmelden", loading: "Laden...",
    saving: "Speichern...", saved: "Gespeichert", cancel: "Abbrechen", close: "Schließen",
    copy: "Kopieren", copied: "Kopiert", optional: "(optional)",
    yes: "Ja", no: "Nein",
    deleteRecord: "Datensatz löschen", deleteTitle: "Datensatz löschen",
    deleteDesc: "Diese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden. Der Patientendatensatz und alle Fotos werden gelöscht.",
    deletePermanent: "dauerhaft", deleteCTA: "Ja, löschen", deleting: "Löschen...",
    deletedTitle: "Datensatz gelöscht", deletedDesc: "Der Fall wurde dauerhaft gelöscht.",
    deleteError: "Datensatz konnte nicht gelöscht werden.", errorGeneric: "Ein Fehler ist aufgetreten.",
    tagline: "Standardisierte Medizinische Bewertung",
    heroTitle: "Standardisieren Sie die", heroAccent: "klinische Bilderfassung",
    heroSub: "Dokumentieren, vergleichen und verfolgen Sie Ihre Patienten fotografisch mit einem standardisierten, sicheren Protokoll.",
    startCTA: "Vorbewertung starten", processLabel: "Der Prozess",
    howTitle: "Wie funktioniert es?", howSub: "Ein klinisches Protokoll für Präzision und Datenschutz",
    step1Title: "Datenerfassung", step1Desc: "Medizinische Vorgeschichte zur Einordnung der klinischen Analyse.",
    step2Title: "Geführte Aufnahme", step2Desc: "5 standardisierte Fotos mit schrittweisen Positionierungshilfen.",
    step2Tags: ["Frontal", "Vertex", "Schläfe ×2", "Nacken"],
    step3Title: "Vergleich & Nachsorge", step3Desc: "Das Medizinteam überprüft und vergleicht Bilder im Zeitverlauf.",
    whyTitle: "Warum Bilder standardisieren?",
    why1: "Reproduzierbarer Vergleich zwischen Sitzungen", why2: "Objektive Verfolgung des Behandlungsfortschritts", why3: "Zuverlässige Fotodokumentation für die Diagnose",
    statPositions: "Positionen", statMinutes: "Minuten", statEncrypted: "Verschlüsselt", statResponse: "Antwort",
    footerProtocol: "Klinisches Protokoll",
    footerLegal: "Diese Vorbewertung ist ein vorläufiger Filter und ersetzt keine persönliche Arztkonsultation.",
    footerPrivacy: "Datenschutz", footerTerms: "Nutzungsbedingungen", footerRights: "Alle Rechte vorbehalten.",
    pEstimate: "Geschätzte Zeit: 4–6 Minuten", pIntroTitle: "Klinische Vorbewertung",
    pIntroDesc: "Dieser Prozess ermöglicht uns, Ihren Fall vor der persönlichen Konsultation zu verstehen. Wir benötigen Ihre Daten und 5 präzise Fotos Ihrer Kopfhaut.",
    pStep1Label: "Persönliche Daten", pStep1Detail: "Grundlegende Haargeschichte",
    pStep2Label: "Fotografien", pStep2Detail: "5 geführte Aufnahmen Schritt für Schritt",
    pStep3Label: "Medizinische Analyse", pStep3Detail: "Vertrauliche klinische Überprüfung",
    pDisclaimer: "Diese Vorbewertung ist streng vertraulich und ersetzt keine persönliche Arztkonsultation.",
    pBeginCTA: "Bewertung starten",
    stepIntro: "Einführung", stepData: "Daten", stepPhotos: "Fotos",
    pDataTitle: "Ihre Vorgeschichte", pDataSub: "Füllen Sie diese Informationen für Ihre Akte aus",
    pFullName: "Vollständiger Name *", pDocId: "Ausweisnummer *",
    pPhone: "Mobiltelefon (WhatsApp) *", pEmail: "E-Mail-Adresse *",
    pAge: "Alter", pAgePlaceholder: "Jahre", pCity: "Stadt", pCityPlaceholder: "Wählen Sie Ihre Stadt",
    pHairHistory: "Haargeschichte",
    pHairLossTime: "Wie lange bemerken Sie den Haarausfall?",
    pHairLossOpts: ["Weniger als 6 Monate", "6 Monate bis 1 Jahr", "1 bis 3 Jahre", "Mehr als 3 Jahre", "Ich bin nicht sicher"],
    pPattern: "Wo konzentriert sich der Verlust?",
    pPatternOpts: ["Stirn / Haaransatz", "Scheitel (oben)", "Stirn und Scheitel", "Gesamte Kopfhaut", "Unregelmäßige Bereiche"],
    pPrevTreatment: "Haben Sie ein Haarausfallmittel verwendet?",
    pPrevTreatOpts: ["Keines", "Topisches Minoxidil", "Orales Finasterid", "Minoxidil und Finasterid", "Plättchenreiches Plasma (PRP)", "Andere Behandlung"],
    pSymptoms: "Haben Sie damit verbundene Symptome? (optional)", pSymptomsPlaceholder: "z.B. Juckreiz, Schuppen...",
    pSurgery: "Hatten Sie schon eine Transplantation? (optional)",
    pSurgeryOpts: ["Nein", "Ja, 1 vorherige Operation", "Ja, 2 oder mehr Operationen"],
    pConsentTitle: "Einwilligung und Datenschutz",
    pConsentLine1: "Ihre Fotos und Daten werden verschlüsselt übertragen und vertraulich behandelt.",
    pConsentLine2: "Diese Vorabauswertung stellt keine Diagnose dar.",
    pConsentCheckbox: "Ich habe gelesen und akzeptiere die Verarbeitung meiner personenbezogenen Daten und der Fotos meiner Kopfhaut ausschließlich zum Zweck einer Haar-Vorabbewertung sowie die Kontaktaufnahme durch das Zentrum mit den Ergebnissen. Ich verstehe, dass diese Vorabbewertung keine medizinische Diagnose darstellt und ich diese Einwilligung jederzeit widerrufen kann.",
    pConsentMarketing: "Ich möchte kommerzielle Informationen und Angebote erhalten (optional).",
    pContinueCTA: "Weiter zu den Fotos",
    pSelectOpt: "Option auswählen", pSelectZone: "Bereich auswählen",
    pPhotosTitle: "Fotodokumentation", pPhotosSub: "Wir benötigen 5 Aufnahmen für Ihre klinische Bewertung",
    pPhotoGuide: "Positionsanleitung", pUseCamera: "Kamera verwenden", pUploadPhoto: "Foto hochladen",
    pRetakePhoto: "Foto wiederholen", pChangeFile: "Datei ändern", pProcessing: "Verarbeitung...",
    pCompleted: "Abgeschlossen", pProgress: "Fortschritt", pSubmitCTA: "Bewertung senden", pSending: "Senden...",
    pBack: "Zurück",
    pExit: "Verlassen",
    pTakePhoto: "Foto aufnehmen",
    pUploadDevice: "Vom Gerät hochladen",
    pUsePhoto: "Dieses Foto verwenden",
    pRepeatPhoto: "Foto wiederholen",
    pUploadAnother: "Anderes Foto hochladen",
    pPhotoOf: "Foto {n} von {total}",
    pSavedProgress: "Fortschritt gespeichert",
    pSavedOnServer: "Gespeichert",
    pResumeTitle: "Du hast gespeicherten Fortschritt",
    pResumeDesc: "Möchtest du dort weitermachen, wo du aufgehört hast?",
    pResumeCTA: "Dort weitermachen",
    pResumeRestart: "Von vorne beginnen",
    pExitTitle: "Möchtest du die Vorab-Bewertung verlassen?",
    pExitDesc: "Dein gespeicherter Fortschritt bleibt erhalten, nicht gespeicherte Änderungen gehen jedoch verloren.",
    pExitContinue: "Vorab-Bewertung fortsetzen",
    pExitSave: "Verlassen und Fortschritt behalten",
    pExitDiscard: "Vorab-Bewertung verwerfen",
    pExitDiscardConfirm: "Möchtest du wirklich den gesamten Fortschritt verwerfen? Das kann nicht rückgängig gemacht werden.",
    pDuplicate: "Mit dieser Telefonnummer oder E-Mail existiert bereits eine Bewertung.",
    photoFrontalTitle: "Frontansicht", photoFrontalDesc: "Von vorne, zentriert, gute Beleuchtung.", photoFrontalTip: "Schauen Sie direkt in die Kamera bei gutem natürlichem Licht.",
    photoVertexTitle: "Vertex / Scheitel", photoVertexDesc: "Kopf leicht nach vorne neigen.", photoVertexTip: "Kopf 45° nach unten neigen. Jemanden bitten, von oben zu fotografieren.",
    photoTRTitle: "Rechte Schläfe", photoTRDesc: "Leicht nach links drehen.", photoTRTip: "Kopf ~30° nach links drehen.",
    photoTLTitle: "Linke Schläfe", photoTLDesc: "Leicht nach rechts drehen.", photoTLTip: "Kopf ~30° nach rechts drehen.",
    photoDonorTitle: "Spenderbereich", photoDonorDesc: "Foto des Nackens / Hinterkopfs.", photoDonorTip: "Kopf leicht nach vorne neigen. Kamera auf den Nacken richten.",
    pSuccessTitle: "Ihre Bewertung wurde empfangen!", pSuccessDesc: "Unser Team wird Ihre Informationen und Fotos innerhalb von 24 Werktagen prüfen.",
    pSuccessNext: "Was passiert als nächstes?", pSuccessStep1: "Überprüfung Ihres Falls (bis 24 Werktage)", pSuccessStep2: "Wir kontaktieren Sie per WhatsApp oder E-Mail", pSuccessStep3: "Wir vereinbaren Ihre Konsultation",
    pGoHome: "Zurück zur Startseite", pDataError: "Unvollständige Daten", pSaveError: "Ihre Informationen konnten nicht gespeichert werden.", pPhotoError: "Fehler beim Verarbeiten des Bildes",
    loginTitle: "Willkommen zurück", loginSub: "Geben Sie Ihr Passwort ein, um auf das Panel zuzugreifen",
    loginLabel: "Zugangspasswort", loginPlaceholder: "••••••••", loginCTA: "Panel betreten", loginVerifying: "Überprüfung...",
    loginDenied: "Zugang verweigert", loginWrongPwd: "Das eingegebene Passwort ist falsch.",
    loginBrandTitle: "Klinische Verwaltungsplattform", loginBrandSub: "Exklusiver Zugang für das medizinische Team.",
    adminSection: "Klinisches Management", adminPatients: "Patienten", adminDashTitle: "Patienten-Dashboard", adminDashSub: "Vorbewertungsmanagement und Nachsorge",
    adminNewLink: "Neuer Link", adminTotal: "Patienten gesamt", adminNew: "Neu", adminReady: "Bereit / Geplant", adminPending: "Zu ergänzen",
    adminSearchPlaceholder: "Nach Name oder Telefon suchen...", adminAllStatuses: "Alle Status",
    adminColPatient: "Patient", adminColStatus: "Status", adminColPhotos: "Fotos", adminColDate: "Aufnahmedatum", adminColAction: "Aktion",
    adminLoading: "Patienten laden...", adminEmpty: "Keine Patienten gefunden.", adminEmptySub: "Versuchen Sie, die Filter anzupassen.",
    adminStatusPatient: "Patientenstatus", adminAppDate: "Termindatum", adminContactWA: "Via WhatsApp kontaktieren",
    adminPhotoReg: "Fotodokumentation", adminNoPhotos: "Der Patient hat noch keine Fotos hochgeladen.",
    adminPatientHistory: "Patientenvorgeschichte", adminDocId: "Ausweisnummer", adminEmail: "E-Mail",
    adminAge: "Alter", adminCity: "Stadt", adminHairLossTime: "Dauer des Verlustes", adminZone: "Betroffener Bereich", adminPrevTreatment: "Frühere Behandlungen",
    adminClinicalNotes: "Interne klinische Verwendung", adminNorwood: "Norwood-Skala (Bewertung)",
    adminNotesLabel: "Klinische Notizen", adminNotesPlaceholder: "Fallnotizen, Transplantatvorschläge oder Nachsorge hinzufügen...",
    adminLoadingLead: "Patientenakte laden...", adminSaved: "Gespeichert", adminSavedDesc: "Änderungen erfolgreich gespeichert.",
    adminWAMessage: "Hallo {name}, wir haben Ihre klinische Vorbewertung überprüft. Clinivista kontaktiert Sie, um den nächsten Schritt zu koordinieren.",
    adminDemoWarning: "Sie verwenden das Demo-Passwort. Konfigurieren Sie ADMIN_PASSWORD in den Geheimnissen.",
    adminInviteTitle: "Neuer Link", adminInviteNameLabel: "Patientenname (optional)", adminInvitePhoneLabel: "Telefon *",
    adminInviteGenerating: "Generierung...", adminInviteGenCTA: "Bewertungslink generieren",
    adminInviteCreated: "Link erstellt!", adminInviteCreatedSub: "Kopieren oder direkt senden",
    adminInviteSendWA: "Via WhatsApp senden", adminInviteError: "Fehler beim Erstellen des Links", adminLinkError: "Fehler beim Erstellen des Links",
    statusNuevo: "Neu", statusIncompleto: "Unvollständig", statusListo: "Bereit zur Überprüfung",
    statusContactar: "Kontaktieren", statusAgendado: "Geplant", statusCerrado: "Geschlossen",
  },

  it: {
    teamAccess: "Accesso Team", logout: "Disconnetti", loading: "Caricamento...",
    saving: "Salvataggio...", saved: "Salvato", cancel: "Annulla", close: "Chiudi",
    copy: "Copia", copied: "Copiato", optional: "(opzionale)",
    yes: "Sì", no: "No",
    deleteRecord: "Elimina record", deleteTitle: "Elimina record",
    deleteDesc: "Questa azione è permanente. Il record del paziente e tutte le foto verranno eliminati.",
    deletePermanent: "permanente", deleteCTA: "Sì, elimina", deleting: "Eliminazione...",
    deletedTitle: "Record eliminato", deletedDesc: "Il caso è stato eliminato definitivamente.",
    deleteError: "Impossibile eliminare il record.", errorGeneric: "Si è verificato un errore.",
    tagline: "Valutazione Medica Standardizzata",
    heroTitle: "Standardizza la cattura di", heroAccent: "immagini cliniche",
    heroSub: "Documenta, confronta e monitora i tuoi pazienti con un protocollo standardizzato, sicuro e riproducibile.",
    startCTA: "Inizia la Pre-valutazione", processLabel: "Il Processo",
    howTitle: "Come funziona?", howSub: "Un protocollo clinico progettato per precisione e privacy",
    step1Title: "Registrazione Dati", step1Desc: "Anamnesi medica e personale per contestualizzare l'analisi clinica.",
    step2Title: "Cattura Guidata", step2Desc: "5 foto standardizzate con guide al posizionamento passo dopo passo.",
    step2Tags: ["Frontale", "Vertex", "Tempia ×2", "Nuca"],
    step3Title: "Confronto & Follow-up", step3Desc: "Il team medico esamina e confronta le immagini nel tempo per un follow-up obiettivo.",
    whyTitle: "Perché standardizzare le immagini?",
    why1: "Confronto riproducibile tra sessioni cliniche", why2: "Monitoraggio obiettivo del progresso del trattamento", why3: "Documenti fotografici affidabili per la diagnosi",
    statPositions: "Posizioni", statMinutes: "Minuti", statEncrypted: "Crittografato", statResponse: "Risposta",
    footerProtocol: "Protocollo Clinico",
    footerLegal: "Questa pre-valutazione è un filtro preliminare e non sostituisce una consulenza medica di persona.",
    footerPrivacy: "Privacy", footerTerms: "Termini", footerRights: "Tutti i diritti riservati.",
    pEstimate: "Tempo stimato: 4–6 minuti", pIntroTitle: "Pre-valutazione Clinica",
    pIntroDesc: "Questo processo ci permetterà di comprendere il tuo caso prima della visita. Richiediamo i tuoi dati e 5 foto precise del cuoio capelluto.",
    pStep1Label: "Dati personali", pStep1Detail: "Storia capillare di base",
    pStep2Label: "Fotografie", pStep2Detail: "5 scatti guidati passo dopo passo",
    pStep3Label: "Analisi medica", pStep3Detail: "Revisione clinica riservata",
    pDisclaimer: "Questa pre-valutazione è strettamente riservata e non sostituisce una consulenza medica.",
    pBeginCTA: "Inizia la Valutazione",
    stepIntro: "Intro", stepData: "Dati", stepPhotos: "Foto",
    pDataTitle: "I Tuoi Precedenti", pDataSub: "Completa queste informazioni per il tuo fascicolo clinico",
    pFullName: "Nome completo *", pDocId: "Documento d'identità *",
    pPhone: "Cellulare (WhatsApp) *", pEmail: "Indirizzo e-mail *",
    pAge: "Età", pAgePlaceholder: "Anni", pCity: "Città", pCityPlaceholder: "Seleziona la tua città",
    pHairHistory: "Storia Capillare",
    pHairLossTime: "Da quanto tempo noti la perdita di capelli?",
    pHairLossOpts: ["Meno di 6 mesi", "6 mesi a 1 anno", "1 a 3 anni", "Più di 3 anni", "Non sono sicuro"],
    pPattern: "Dove si concentra la perdita?",
    pPatternOpts: ["Fronte / attaccatura", "Vertex (sommità)", "Fronte e vertex", "Tutto il cuoio capelluto", "Zone irregolari o sparse"],
    pPrevTreatment: "Hai usato qualche trattamento per la caduta?",
    pPrevTreatOpts: ["Nessuno", "Minoxidil topico", "Finasteride orale", "Minoxidil e Finasteride", "Plasma ricco di piastrine (PRP)", "Altro trattamento"],
    pSymptoms: "Hai sintomi associati? (opzionale)", pSymptomsPlaceholder: "Es. prurito, forfora, irritazione...",
    pSurgery: "Hai avuto un trapianto di capelli? (opzionale)",
    pSurgeryOpts: ["No", "Sì, 1 intervento precedente", "Sì, 2 o più interventi"],
    pConsentTitle: "Consenso e Privacy",
    pConsentLine1: "Le tue foto e dati vengono trasmessi cifrati e trattati con totale riservatezza.",
    pConsentLine2: "Questa valutazione non costituisce una diagnosi.",
    pConsentCheckbox: "Ho letto e accetto il trattamento dei miei dati personali e delle foto del mio cuoio capelluto al solo scopo di una pre-valutazione capillare e affinché il centro mi contatti con i risultati. Comprendo che questa valutazione preliminare non costituisce una diagnosi medica e che posso revocare questo consenso in qualsiasi momento.",
    pConsentMarketing: "Accetto di ricevere informazioni commerciali e promozioni (facoltativo).",
    pContinueCTA: "Continua alle Foto",
    pSelectOpt: "Seleziona un'opzione", pSelectZone: "Seleziona un'area",
    pPhotosTitle: "Registro Fotografico", pPhotosSub: "Abbiamo bisogno di 5 foto per la tua valutazione clinica",
    pPhotoGuide: "Guida alla posizione", pUseCamera: "Usa fotocamera", pUploadPhoto: "Carica foto",
    pRetakePhoto: "Rifare la foto", pChangeFile: "Cambia file", pProcessing: "Elaborazione...",
    pCompleted: "Completata", pProgress: "Progresso", pSubmitCTA: "Invia Valutazione", pSending: "Invio...",
    pBack: "Indietro",
    pExit: "Esci",
    pTakePhoto: "Scatta foto",
    pUploadDevice: "Carica dal dispositivo",
    pUsePhoto: "Usa questa foto",
    pRepeatPhoto: "Ripeti foto",
    pUploadAnother: "Carica un'altra foto",
    pPhotoOf: "Foto {n} di {total}",
    pSavedProgress: "Avanzamento salvato",
    pSavedOnServer: "Salvata",
    pResumeTitle: "Hai un avanzamento salvato",
    pResumeDesc: "Vuoi continuare da dove eri rimasto?",
    pResumeCTA: "Continua da dove ero",
    pResumeRestart: "Ricomincia dall'inizio",
    pExitTitle: "Vuoi uscire dalla prevalutazione?",
    pExitDesc: "Il tuo avanzamento salvato sarà conservato, ma le modifiche non salvate andranno perse.",
    pExitContinue: "Continua la prevalutazione",
    pExitSave: "Esci e conserva l'avanzamento",
    pExitDiscard: "Elimina la prevalutazione",
    pExitDiscardConfirm: "Sei sicuro di voler eliminare tutto l'avanzamento? Non può essere annullato.",
    pDuplicate: "Esiste già una valutazione con questo telefono o e-mail.",
    photoFrontalTitle: "Vista frontale", photoFrontalDesc: "Di fronte, centrato, buona illuminazione.", photoFrontalTip: "Guarda direttamente la fotocamera con buona luce naturale.",
    photoVertexTitle: "Vertex / Corona", photoVertexDesc: "Inclina leggermente la testa in avanti.", photoVertexTip: "Inclina la testa 45°. Chiedi a qualcuno di fotografare dall'alto.",
    photoTRTitle: "Tempia destra", photoTRDesc: "Gira leggermente a sinistra.", photoTRTip: "Gira la testa ~30° a sinistra.",
    photoTLTitle: "Tempia sinistra", photoTLDesc: "Gira leggermente a destra.", photoTLTip: "Gira la testa ~30° a destra.",
    photoDonorTitle: "Area donatrice", photoDonorDesc: "Foto della nuca / parte posteriore.", photoDonorTip: "Inclina leggermente la testa. La fotocamera punta alla nuca.",
    pSuccessTitle: "La tua valutazione è stata ricevuta!", pSuccessDesc: "Il nostro team esaminerà le tue informazioni e foto entro 24 ore lavorative.",
    pSuccessNext: "Cosa succede ora?", pSuccessStep1: "Revisione del tuo caso (fino a 24 h lavorative)", pSuccessStep2: "Ti contatteremo via WhatsApp o e-mail", pSuccessStep3: "Pianifichiamo la tua consulenza",
    pGoHome: "Torna alla home", pDataError: "Dati incompleti", pSaveError: "Non è stato possibile salvare le informazioni.", pPhotoError: "Errore nell'elaborazione dell'immagine",
    loginTitle: "Bentornato", loginSub: "Inserisci la password per accedere al pannello",
    loginLabel: "Password di accesso", loginPlaceholder: "••••••••", loginCTA: "Accedi al Pannello", loginVerifying: "Verifica...",
    loginDenied: "Accesso negato", loginWrongPwd: "La password inserita non è corretta.",
    loginBrandTitle: "Piattaforma di Gestione Clinica", loginBrandSub: "Accesso esclusivo per il team medico.",
    adminSection: "Gestione Clinica", adminPatients: "Pazienti", adminDashTitle: "Dashboard Pazienti", adminDashSub: "Gestione pre-valutazioni e follow-up",
    adminNewLink: "Nuovo Link", adminTotal: "Pazienti totali", adminNew: "Nuovi", adminReady: "Pronti / Agenda", adminPending: "Da completare",
    adminSearchPlaceholder: "Cerca per nome o telefono...", adminAllStatuses: "Tutti gli stati",
    adminColPatient: "Paziente", adminColStatus: "Stato", adminColPhotos: "Foto", adminColDate: "Data di ammissione", adminColAction: "Azione",
    adminLoading: "Caricamento pazienti...", adminEmpty: "Nessun paziente trovato.", adminEmptySub: "Prova ad aggiustare i filtri.",
    adminStatusPatient: "Stato del Paziente", adminAppDate: "Data Appuntamento", adminContactWA: "Contatta via WhatsApp",
    adminPhotoReg: "Registro Fotografico", adminNoPhotos: "Il paziente non ha ancora caricato foto.",
    adminPatientHistory: "Precedenti del Paziente", adminDocId: "Documento d'identità", adminEmail: "E-mail",
    adminAge: "Età", adminCity: "Città", adminHairLossTime: "Durata della perdita", adminZone: "Zona interessata", adminPrevTreatment: "Trattamenti precedenti",
    adminClinicalNotes: "Uso Interno Clinico", adminNorwood: "Scala Norwood (Valutazione)",
    adminNotesLabel: "Note Cliniche", adminNotesPlaceholder: "Aggiungi note del caso, suggerimenti sui trapianti o follow-up qui...",
    adminLoadingLead: "Caricamento scheda paziente...", adminSaved: "Salvato", adminSavedDesc: "Modifiche registrate con successo.",
    adminWAMessage: "Ciao {name}, abbiamo esaminato la tua pre-valutazione. Clinivista ti contatta per coordinare il passo successivo.",
    adminDemoWarning: "Stai usando la password demo. Configura ADMIN_PASSWORD nei segreti.",
    adminInviteTitle: "Nuovo Link", adminInviteNameLabel: "Nome del paziente (opzionale)", adminInvitePhoneLabel: "Cellulare *",
    adminInviteGenerating: "Generazione...", adminInviteGenCTA: "Genera Link di Valutazione",
    adminInviteCreated: "Link creato!", adminInviteCreatedSub: "Copialo o invialo direttamente",
    adminInviteSendWA: "Invia via WhatsApp", adminInviteError: "Errore nella creazione del link", adminLinkError: "Errore nella creazione del link",
    statusNuevo: "Nuovo", statusIncompleto: "Incompleto", statusListo: "Pronto per revisione",
    statusContactar: "Contattare", statusAgendado: "Pianificato", statusCerrado: "Chiuso",
  },

  tr: {
    teamAccess: "Ekip Girişi", logout: "Çıkış yap", loading: "Yükleniyor...",
    saving: "Kaydediliyor...", saved: "Kaydedildi", cancel: "İptal", close: "Kapat",
    copy: "Kopyala", copied: "Kopyalandı", optional: "(isteğe bağlı)",
    yes: "Evet", no: "Hayır",
    deleteRecord: "Kaydı sil", deleteTitle: "Kaydı sil",
    deleteDesc: "Bu işlem kalıcıdır ve geri alınamaz. Hasta kaydı ve tüm fotoğraflar silinecektir.",
    deletePermanent: "kalıcı", deleteCTA: "Evet, sil", deleting: "Siliniyor...",
    deletedTitle: "Kayıt silindi", deletedDesc: "Vaka kalıcı olarak silindi.",
    deleteError: "Kayıt silinemedi.", errorGeneric: "Bir hata oluştu.",
    tagline: "Standart Tıbbi Değerlendirme",
    heroTitle: "Klinik görüntü", heroAccent: "yakalamayı standardize edin",
    heroSub: "Hastalarınızı standartlaştırılmış, güvenli ve tekrarlanabilir bir protokolle fotoğraflayın, karşılaştırın ve takip edin.",
    startCTA: "Ön Değerlendirmeyi Başlat", processLabel: "Süreç",
    howTitle: "Nasıl çalışır?", howSub: "Hassasiyet ve gizlilik için tasarlanmış klinik protokol",
    step1Title: "Veri Kaydı", step1Desc: "Klinik analizi bağlamlandırmak için tıbbi ve kişisel geçmiş.",
    step2Title: "Rehberli Çekim", step2Desc: "Herhangi bir cihazdan adım adım konumlandırma rehberleriyle 5 standart fotoğraf.",
    step2Tags: ["Ön", "Vertex", "Şakak ×2", "Ense"],
    step3Title: "Karşılaştırma & Takip", step3Desc: "Tıp ekibi, objektif klinik takip için görüntüleri zaman içinde inceler.",
    whyTitle: "Neden görüntüleri standartlaştırmalı?",
    why1: "Klinik seanslar arasında tekrarlanabilir karşılaştırma", why2: "Tedavi sürecinin objektif takibi", why3: "Tanı için güvenilir fotoğraf kayıtları",
    statPositions: "Pozisyon", statMinutes: "Dakika", statEncrypted: "Şifreli", statResponse: "Yanıt",
    footerProtocol: "Klinik Protokol",
    footerLegal: "Bu ön değerlendirme ön eleme filtresidir; yüz yüze tıbbi konsültasyonun yerini tutmaz.",
    footerPrivacy: "Gizlilik", footerTerms: "Koşullar", footerRights: "Tüm hakları saklıdır.",
    pEstimate: "Tahmini süre: 4–6 dakika", pIntroTitle: "Klinik Ön Değerlendirme",
    pIntroDesc: "Bu süreç, yüz yüze konsültasyondan önce vakayı ayrıntılı anlamamıza yardımcı olacak. Verilerinizi ve saç derisinin 5 fotoğrafını isteyeceğiz.",
    pStep1Label: "Kişisel bilgiler", pStep1Detail: "Temel saç geçmişi",
    pStep2Label: "Fotoğraflar", pStep2Detail: "Adım adım rehberli 5 çekim",
    pStep3Label: "Tıbbi analiz", pStep3Detail: "Gizli klinik inceleme",
    pDisclaimer: "Bu ön değerlendirme kesinlikle gizlidir ve yüz yüze tıbbi konsültasyonun yerini tutmaz.",
    pBeginCTA: "Değerlendirmeyi Başlat",
    stepIntro: "Başlangıç", stepData: "Veriler", stepPhotos: "Fotoğraflar",
    pDataTitle: "Geçmişiniz", pDataSub: "Klinik dosyanız için bu bilgileri doldurun",
    pFullName: "Tam adı *", pDocId: "Kimlik belgesi *",
    pPhone: "Cep telefonu (WhatsApp) *", pEmail: "E-posta adresi *",
    pAge: "Yaş", pAgePlaceholder: "Yıl", pCity: "Şehir", pCityPlaceholder: "Şehrinizi seçin",
    pHairHistory: "Saç Geçmişi",
    pHairLossTime: "Saç dökülmesini ne zamandan beri fark ediyorsunuz?",
    pHairLossOpts: ["6 aydan az", "6 ay - 1 yıl", "1-3 yıl", "3 yıldan fazla", "Emin değilim"],
    pPattern: "Kayıp nerede yoğunlaşıyor?",
    pPatternOpts: ["Alın / saç çizgisi", "Tepe (üst)", "Alın ve tepe", "Tüm saç derisi", "Düzensiz veya dağınık bölgeler"],
    pPrevTreatment: "Saç dökülmesi için herhangi bir tedavi kullandınız mı?",
    pPrevTreatOpts: ["Hiçbiri", "Topikal Minoksidil", "Oral Finasterid", "Minoksidil ve Finasterid", "Trombosit zengini plazma (PRP)", "Diğer tedavi"],
    pSymptoms: "İlişkili belirtileriniz var mı? (isteğe bağlı)", pSymptomsPlaceholder: "Örn. kaşıntı, kepek, tahriş...",
    pSurgery: "Daha önce saç ekimi ameliyatı geçirdiniz mi? (isteğe bağlı)",
    pSurgeryOpts: ["Hayır", "Evet, 1 önceki ameliyat", "Evet, 2 veya daha fazla ameliyat"],
    pConsentTitle: "Onay ve Gizlilik",
    pConsentLine1: "Fotoğraflarınız ve verileriniz şifreli olarak iletilir ve tam gizlilikle işlenir.",
    pConsentLine2: "Bu ön değerlendirme teşhis teşkil etmez.",
    pConsentCheckbox: "Kişisel verilerimin ve saç derisi fotoğraflarımın yalnızca ön saç değerlendirmesi amacıyla işlenmesini ve merkezin sonuçlarla benimle iletişime geçmesini okudum ve kabul ediyorum. Bu ön değerlendirmenin tıbbi bir teşhis olmadığını ve bu onayı istediğim zaman geri çekebileceğimi anlıyorum.",
    pConsentMarketing: "Ticari bilgi ve promosyonlar almayı kabul ediyorum (isteğe bağlı).",
    pContinueCTA: "Fotoğraflara Devam Et",
    pSelectOpt: "Bir seçenek seçin", pSelectZone: "Bir bölge seçin",
    pPhotosTitle: "Fotoğraf Kaydı", pPhotosSub: "Klinik değerlendirmeniz için 5 çekim gerekiyor",
    pPhotoGuide: "Pozisyon kılavuzu", pUseCamera: "Kamera Kullan", pUploadPhoto: "Fotoğraf Yükle",
    pRetakePhoto: "Fotoğrafı yeniden çek", pChangeFile: "Dosyayı değiştir", pProcessing: "İşleniyor...",
    pCompleted: "Tamamlandı", pProgress: "İlerleme", pSubmitCTA: "Değerlendirmeyi Gönder", pSending: "Gönderiliyor...",
    pBack: "Geri",
    pExit: "Çık",
    pTakePhoto: "Fotoğraf çek",
    pUploadDevice: "Cihazdan yükle",
    pUsePhoto: "Bu fotoğrafı kullan",
    pRepeatPhoto: "Fotoğrafı tekrarla",
    pUploadAnother: "Başka fotoğraf yükle",
    pPhotoOf: "Fotoğraf {n} / {total}",
    pSavedProgress: "İlerleme kaydedildi",
    pSavedOnServer: "Kaydedildi",
    pResumeTitle: "Kayıtlı ilerlemen var",
    pResumeDesc: "Kaldığın yerden devam etmek ister misin?",
    pResumeCTA: "Kaldığım yerden devam et",
    pResumeRestart: "Baştan başla",
    pExitTitle: "Ön değerlendirmeden çıkmak istiyor musun?",
    pExitDesc: "Kaydedilen ilerlemen korunur, ancak kaydedilmemiş değişiklikler kaybolur.",
    pExitContinue: "Ön değerlendirmeye devam et",
    pExitSave: "Çık ve ilerlemeyi koru",
    pExitDiscard: "Ön değerlendirmeyi sil",
    pExitDiscardConfirm: "Tüm ilerlemeyi silmek istediğine emin misin? Bu geri alınamaz.",
    pDuplicate: "Bu telefon veya e-posta ile zaten bir değerlendirme var.",
    photoFrontalTitle: "Ön görünüm", photoFrontalDesc: "Öne bakın, ortalanmış, iyi aydınlatılmış.", photoFrontalTip: "İyi doğal ışıkta doğrudan kameraya bakın.",
    photoVertexTitle: "Vertex / Tepe", photoVertexDesc: "Başı hafifçe öne eğin.", photoVertexTip: "Başı 45° aşağı eğin. Birinin yukarıdan fotoğraf çekmesini isteyin.",
    photoTRTitle: "Sağ şakak", photoTRDesc: "Sağ saç çizgisini göstermek için sola döndürün.", photoTRTip: "Başı ~30° sola döndürün.",
    photoTLTitle: "Sol şakak", photoTLDesc: "Sol saç çizgisini göstermek için sağa döndürün.", photoTLTip: "Başı ~30° sağa döndürün.",
    photoDonorTitle: "Donör bölge", photoDonorDesc: "Ense / başın arka fotoğrafı.", photoDonorTip: "Başı hafifçe öne eğin. Kamera enseyi gösterecek şekilde tutun.",
    pSuccessTitle: "Değerlendirmeniz alındı!", pSuccessDesc: "Ekibimiz bilgilerinizi ve fotoğraflarınızı 24 iş saati içinde inceleyecektir.",
    pSuccessNext: "Bundan sonra ne olur?", pSuccessStep1: "Vakanızın incelenmesi (24 iş saatine kadar)", pSuccessStep2: "WhatsApp veya e-posta ile iletişime geçeceğiz", pSuccessStep3: "Konsültasyonunuzu planlayacağız",
    pGoHome: "Ana sayfaya dön", pDataError: "Eksik veriler", pSaveError: "Bilgileriniz kaydedilemedi.", pPhotoError: "Görüntü işleme hatası",
    loginTitle: "Tekrar hoş geldiniz", loginSub: "Panele erişmek için şifrenizi girin",
    loginLabel: "Erişim şifresi", loginPlaceholder: "••••••••", loginCTA: "Panele Gir", loginVerifying: "Doğrulanıyor...",
    loginDenied: "Erişim reddedildi", loginWrongPwd: "Girilen şifre yanlış.",
    loginBrandTitle: "Klinik Yönetim Platformu", loginBrandSub: "Tıp ekibi için özel erişim.",
    adminSection: "Klinik Yönetim", adminPatients: "Hastalar", adminDashTitle: "Hasta Panosu", adminDashSub: "Ön değerlendirme yönetimi ve takip",
    adminNewLink: "Yeni Bağlantı", adminTotal: "Toplam Hasta", adminNew: "Yeni", adminReady: "Hazır / Planlandı", adminPending: "Tamamlanacak",
    adminSearchPlaceholder: "Ad veya telefona göre ara...", adminAllStatuses: "Tüm durumlar",
    adminColPatient: "Hasta", adminColStatus: "Durum", adminColPhotos: "Fotoğraflar", adminColDate: "Giriş Tarihi", adminColAction: "İşlem",
    adminLoading: "Hastalar yükleniyor...", adminEmpty: "Hasta bulunamadı.", adminEmptySub: "Filtreleri ayarlamayı deneyin.",
    adminStatusPatient: "Hasta Durumu", adminAppDate: "Randevu Tarihi", adminContactWA: "WhatsApp ile İletişim",
    adminPhotoReg: "Fotoğraf Kaydı", adminNoPhotos: "Hasta henüz fotoğraf yüklemedi.",
    adminPatientHistory: "Hasta Geçmişi", adminDocId: "Kimlik Belgesi", adminEmail: "E-posta",
    adminAge: "Yaş", adminCity: "Şehir", adminHairLossTime: "Kayıp süresi", adminZone: "Etkilenen bölge", adminPrevTreatment: "Önceki tedaviler",
    adminClinicalNotes: "Dahili Klinik Kullanım", adminNorwood: "Norwood Skalası (Değerlendirme)",
    adminNotesLabel: "Klinik Notlar", adminNotesPlaceholder: "Vaka notları, greft önerileri veya takip bilgilerini buraya ekleyin...",
    adminLoadingLead: "Hasta dosyası yükleniyor...", adminSaved: "Kaydedildi", adminSavedDesc: "Değişiklikler başarıyla kaydedildi.",
    adminWAMessage: "Merhaba {name}, klinik ön değerlendirmenizi inceledik. Clinivista sonraki adımı koordine etmek için sizinle iletişime geçiyor.",
    adminDemoWarning: "Demo şifreyi kullanıyorsunuz. Paneli güvence altına almak için gizli ayarlarda ADMIN_PASSWORD yapılandırın.",
    adminInviteTitle: "Yeni Bağlantı", adminInviteNameLabel: "Hasta adı (isteğe bağlı)", adminInvitePhoneLabel: "Cep telefonu *",
    adminInviteGenerating: "Oluşturuluyor...", adminInviteGenCTA: "Değerlendirme Bağlantısı Oluştur",
    adminInviteCreated: "Bağlantı oluşturuldu!", adminInviteCreatedSub: "Kopyalayın veya doğrudan gönderin",
    adminInviteSendWA: "WhatsApp ile Gönder", adminInviteError: "Bağlantı oluşturma hatası", adminLinkError: "Bağlantı oluşturma hatası",
    statusNuevo: "Yeni", statusIncompleto: "Eksik", statusListo: "İncelemeye hazır",
    statusContactar: "İletişim", statusAgendado: "Planlandı", statusCerrado: "Kapalı",
  },

  ar: {
    teamAccess: "دخول الفريق", logout: "تسجيل الخروج", loading: "جارٍ التحميل...",
    saving: "جارٍ الحفظ...", saved: "تم الحفظ", cancel: "إلغاء", close: "إغلاق",
    copy: "نسخ", copied: "تم النسخ", optional: "(اختياري)",
    yes: "نعم", no: "لا",
    deleteRecord: "حذف السجل", deleteTitle: "حذف السجل",
    deleteDesc: "هذا الإجراء دائم ولا يمكن التراجع عنه. سيتم حذف سجل المريض وجميع الصور.",
    deletePermanent: "دائم", deleteCTA: "نعم، احذف", deleting: "جارٍ الحذف...",
    deletedTitle: "تم حذف السجل", deletedDesc: "تم حذف الحالة نهائياً.",
    deleteError: "تعذر حذف السجل.", errorGeneric: "حدث خطأ.",
    tagline: "تقييم طبي موحّد",
    heroTitle: "توحيد التقاط", heroAccent: "الصور السريرية",
    heroSub: "وثّق وقارن وتابع مرضاك بصورة فوتوغرافية وفق بروتوكول موحّد وآمن وقابل للتكرار.",
    startCTA: "ابدأ التقييم المسبق", processLabel: "العملية",
    howTitle: "كيف يعمل؟", howSub: "بروتوكول سريري مصمم للدقة والخصوصية",
    step1Title: "تسجيل البيانات", step1Desc: "التاريخ الطبي والشخصي لتأطير التحليل السريري.",
    step2Title: "التقاط موجّه", step2Desc: "5 صور موحدة مع إرشادات تحديد الموضع خطوة بخطوة.",
    step2Tags: ["أمامي", "قمة الرأس", "الصدغ ×2", "القفا"],
    step3Title: "المقارنة والمتابعة", step3Desc: "يراجع الفريق الطبي الصور ويقارنها عبر الزمن.",
    whyTitle: "لماذا توحيد الصور؟",
    why1: "مقارنة قابلة للتكرار بين الجلسات", why2: "متابعة موضوعية لتطور العلاج", why3: "سجلات فوتوغرافية موثوقة للتشخيص",
    statPositions: "مواضع", statMinutes: "دقائق", statEncrypted: "مشفّر", statResponse: "استجابة",
    footerProtocol: "البروتوكول السريري",
    footerLegal: "هذا التقييم المسبق مرشح أولي ولا يحل محل الاستشارة الطبية الشخصية.",
    footerPrivacy: "الخصوصية", footerTerms: "الشروط", footerRights: "جميع الحقوق محفوظة.",
    pEstimate: "الوقت المقدر: 4–6 دقائق", pIntroTitle: "التقييم السريري المسبق",
    pIntroDesc: "ستتيح لنا هذه العملية فهم حالتك بالتفصيل قبل الاستشارة الشخصية. سنطلب بياناتك و5 صور دقيقة لفروة رأسك.",
    pStep1Label: "البيانات الشخصية", pStep1Detail: "تاريخ الشعر الأساسي",
    pStep2Label: "الصور", pStep2Detail: "5 لقطات موجّهة خطوة بخطوة",
    pStep3Label: "التحليل الطبي", pStep3Detail: "مراجعة سريرية سرية",
    pDisclaimer: "هذا التقييم سري للغاية ولا يحل محل الاستشارة الطبية الشخصية.",
    pBeginCTA: "بدء التقييم",
    stepIntro: "مقدمة", stepData: "البيانات", stepPhotos: "الصور",
    pDataTitle: "سجلاتك الطبية", pDataSub: "أكمل هذه المعلومات لملفك السريري",
    pFullName: "الاسم الكامل *", pDocId: "وثيقة الهوية *",
    pPhone: "الهاتف المحمول (واتساب) *", pEmail: "البريد الإلكتروني *",
    pAge: "العمر", pAgePlaceholder: "سنة", pCity: "المدينة", pCityPlaceholder: "اختر مدينتك",
    pHairHistory: "تاريخ الشعر",
    pHairLossTime: "منذ متى تلاحظ تساقط الشعر؟",
    pHairLossOpts: ["أقل من 6 أشهر", "6 أشهر إلى سنة", "من 1 إلى 3 سنوات", "أكثر من 3 سنوات", "لست متأكداً"],
    pPattern: "أين يتركز التساقط؟",
    pPatternOpts: ["الجبهة / خط الشعر", "قمة الرأس", "الجبهة وقمة الرأس", "فروة الرأس بالكامل", "مناطق غير منتظمة"],
    pPrevTreatment: "هل استخدمت أي علاج لتساقط الشعر؟",
    pPrevTreatOpts: ["لا شيء", "مينوكسيديل موضعي", "فيناستيريد فموي", "مينوكسيديل وفيناستيريد", "بلازما غنية بالصفائح (PRP)", "علاج آخر"],
    pSymptoms: "هل لديك أعراض مرتبطة؟ (اختياري)", pSymptomsPlaceholder: "مثال: حكة، قشرة، تهيج...",
    pSurgery: "هل خضعت لعملية زرع شعر من قبل؟ (اختياري)",
    pSurgeryOpts: ["لا", "نعم، عملية سابقة واحدة", "نعم، عمليتان أو أكثر"],
    pConsentTitle: "الموافقة والخصوصية",
    pConsentLine1: "يتم نقل صورك وبياناتك بشكل مشفر وتُعامَل بسرية تامة.",
    pConsentLine2: "هذا التقييم لا يشكّل تشخيصاً.",
    pConsentCheckbox: "قرأت وأوافق على معالجة بياناتي الشخصية وصور فروة رأسي لغرض التقييم الأولي للشعر فقط وعلى تواصل المركز معي بالنتائج. أفهم أن هذا التقييم الأولي لا يشكّل تشخيصاً طبياً وأنه يمكنني سحب هذه الموافقة في أي وقت.",
    pConsentMarketing: "أوافق على تلقي معلومات تجارية وعروض ترويجية (اختياري).",
    pContinueCTA: "المتابعة إلى الصور",
    pSelectOpt: "اختر خياراً", pSelectZone: "اختر منطقة",
    pPhotosTitle: "سجل الصور", pPhotosSub: "نحتاج 5 لقطات لتقييمك السريري",
    pPhotoGuide: "دليل الوضعية", pUseCamera: "استخدام الكاميرا", pUploadPhoto: "رفع صورة",
    pRetakePhoto: "إعادة الصورة", pChangeFile: "تغيير الملف", pProcessing: "جارٍ المعالجة...",
    pCompleted: "مكتملة", pProgress: "التقدم", pSubmitCTA: "إرسال التقييم", pSending: "جارٍ الإرسال...",
    pBack: "رجوع",
    pExit: "خروج",
    pTakePhoto: "التقاط صورة",
    pUploadDevice: "رفع من الجهاز",
    pUsePhoto: "استخدام هذه الصورة",
    pRepeatPhoto: "إعادة الصورة",
    pUploadAnother: "رفع صورة أخرى",
    pPhotoOf: "الصورة {n} من {total}",
    pSavedProgress: "تم حفظ التقدم",
    pSavedOnServer: "محفوظة",
    pResumeTitle: "لديك تقدم محفوظ",
    pResumeDesc: "هل تريد المتابعة من حيث توقفت؟",
    pResumeCTA: "متابعة من حيث توقفت",
    pResumeRestart: "البدء من جديد",
    pExitTitle: "هل تريد الخروج من التقييم المسبق؟",
    pExitDesc: "سيتم الاحتفاظ بتقدمك المحفوظ، لكن التغييرات غير المحفوظة ستفقد.",
    pExitContinue: "متابعة التقييم المسبق",
    pExitSave: "الخروج مع الاحتفاظ بالتقدم",
    pExitDiscard: "تجاهل التقييم المسبق",
    pExitDiscardConfirm: "هل أنت متأكد من تجاهل كل التقدم؟ لا يمكن التراجع عن هذا.",
    pDuplicate: "يوجد تقييم مسجل بهذا الهاتف أو البريد الإلكتروني بالفعل.",
    photoFrontalTitle: "منظر أمامي", photoFrontalDesc: "مواجهاً الكاميرا، في الوسط، إضاءة جيدة.", photoFrontalTip: "انظر مباشرة إلى الكاميرا في ضوء طبيعي جيد.",
    photoVertexTitle: "قمة الرأس", photoVertexDesc: "أمل الرأس قليلاً للأمام.", photoVertexTip: "أمل الرأس 45° للأسفل. اطلب من شخص التقاط صورة من الأعلى.",
    photoTRTitle: "الصدغ الأيمن", photoTRDesc: "استدر قليلاً لليسار.", photoTRTip: "أدر الرأس ~30° لليسار.",
    photoTLTitle: "الصدغ الأيسر", photoTLDesc: "استدر قليلاً لليمين.", photoTLTip: "أدر الرأس ~30° لليمين.",
    photoDonorTitle: "منطقة المانح", photoDonorDesc: "صورة للقفا / مؤخرة الرأس.", photoDonorTip: "أمل الرأس قليلاً للأمام. الكاميرا تتجه نحو القفا.",
    pSuccessTitle: "تم استلام تقييمك!", pSuccessDesc: "سيراجع فريقنا معلوماتك وصورك خلال 24 ساعة عمل.",
    pSuccessNext: "ماذا يحدث بعد ذلك؟", pSuccessStep1: "مراجعة حالتك (حتى 24 ساعة عمل)", pSuccessStep2: "سنتواصل معك عبر واتساب أو البريد الإلكتروني", pSuccessStep3: "نحدد موعد استشارتك",
    pGoHome: "العودة إلى الرئيسية", pDataError: "بيانات غير مكتملة", pSaveError: "تعذر حفظ معلوماتك.", pPhotoError: "خطأ في معالجة الصورة",
    loginTitle: "مرحباً بعودتك", loginSub: "أدخل كلمة المرور للوصول إلى اللوحة",
    loginLabel: "كلمة مرور الوصول", loginPlaceholder: "••••••••", loginCTA: "الدخول إلى اللوحة", loginVerifying: "جارٍ التحقق...",
    loginDenied: "رفض الوصول", loginWrongPwd: "كلمة المرور المدخلة غير صحيحة.",
    loginBrandTitle: "منصة الإدارة السريرية", loginBrandSub: "وصول حصري للفريق الطبي.",
    adminSection: "الإدارة السريرية", adminPatients: "المرضى", adminDashTitle: "لوحة المرضى", adminDashSub: "إدارة التقييمات المسبقة والمتابعة",
    adminNewLink: "رابط جديد", adminTotal: "إجمالي المرضى", adminNew: "جدد", adminReady: "جاهزون / مجدولون", adminPending: "للإكمال",
    adminSearchPlaceholder: "ابحث بالاسم أو الهاتف...", adminAllStatuses: "جميع الحالات",
    adminColPatient: "المريض", adminColStatus: "الحالة", adminColPhotos: "الصور", adminColDate: "تاريخ القبول", adminColAction: "إجراء",
    adminLoading: "جارٍ تحميل المرضى...", adminEmpty: "لم يُعثر على مرضى.", adminEmptySub: "حاول ضبط المرشحات.",
    adminStatusPatient: "حالة المريض", adminAppDate: "تاريخ الموعد", adminContactWA: "التواصل عبر واتساب",
    adminPhotoReg: "سجل الصور", adminNoPhotos: "لم يرفع المريض صوراً بعد.",
    adminPatientHistory: "تاريخ المريض", adminDocId: "وثيقة الهوية", adminEmail: "البريد الإلكتروني",
    adminAge: "العمر", adminCity: "المدينة", adminHairLossTime: "مدة التساقط", adminZone: "المنطقة المتأثرة", adminPrevTreatment: "العلاجات السابقة",
    adminClinicalNotes: "الاستخدام الداخلي السريري", adminNorwood: "مقياس نوروود (التقييم)",
    adminNotesLabel: "ملاحظات سريرية", adminNotesPlaceholder: "أضف ملاحظات الحالة واقتراحات الطعم والمتابعة هنا...",
    adminLoadingLead: "جارٍ تحميل ملف المريض...", adminSaved: "تم الحفظ", adminSavedDesc: "تم تسجيل التغييرات بنجاح.",
    adminWAMessage: "مرحباً {name}، راجعنا تقييمك السريري المسبق. تتواصل معك Clinivista لتنسيق الخطوة التالية.",
    adminDemoWarning: "تستخدم كلمة مرور العرض التوضيحي. كوّن ADMIN_PASSWORD في الأسرار لتأمين اللوحة.",
    adminInviteTitle: "رابط جديد", adminInviteNameLabel: "اسم المريض (اختياري)", adminInvitePhoneLabel: "الهاتف المحمول *",
    adminInviteGenerating: "جارٍ الإنشاء...", adminInviteGenCTA: "إنشاء رابط التقييم",
    adminInviteCreated: "تم إنشاء الرابط!", adminInviteCreatedSub: "انسخه أو أرسله مباشرة",
    adminInviteSendWA: "الإرسال عبر واتساب", adminInviteError: "خطأ في إنشاء الرابط", adminLinkError: "خطأ في إنشاء الرابط",
    statusNuevo: "جديد", statusIncompleto: "غير مكتمل", statusListo: "جاهز للمراجعة",
    statusContactar: "اتصال", statusAgendado: "مجدول", statusCerrado: "مغلق",
  },

  zh: {
    teamAccess: "团队入口", logout: "退出登录", loading: "加载中...",
    saving: "保存中...", saved: "已保存", cancel: "取消", close: "关闭",
    copy: "复制", copied: "已复制", optional: "（可选）",
    yes: "是", no: "否",
    deleteRecord: "删除记录", deleteTitle: "删除记录",
    deleteDesc: "此操作是永久性的，无法撤销。患者记录和所有照片将被删除。",
    deletePermanent: "永久", deleteCTA: "是的，删除", deleting: "删除中...",
    deletedTitle: "记录已删除", deletedDesc: "案例已被永久删除。",
    deleteError: "无法删除记录。", errorGeneric: "发生了错误。",
    tagline: "标准化医疗评估",
    heroTitle: "标准化临床", heroAccent: "图像采集",
    heroSub: "使用标准化、安全且可重复的协议，对患者进行拍照记录、比较和跟踪。",
    startCTA: "开始预评估", processLabel: "流程",
    howTitle: "如何运作？", howSub: "专为精准与隐私而设计的临床协议",
    step1Title: "数据登记", step1Desc: "患者的医疗和个人病史，用于背景化临床分析。",
    step2Title: "引导式拍摄", step2Desc: "通过任何设备，按步骤定位指南拍摄5张标准化照片。",
    step2Tags: ["正面", "头顶", "颞部 ×2", "枕部"],
    step3Title: "比较与随访", step3Desc: "医疗团队随时间审查和比较图像，实现客观的临床跟踪。",
    whyTitle: "为什么要标准化图像？",
    why1: "临床疗程间可重复的比较", why2: "客观跟踪治疗进展", why3: "用于诊断的可靠影像记录",
    statPositions: "拍摄位置", statMinutes: "分钟", statEncrypted: "加密", statResponse: "响应",
    footerProtocol: "临床协议",
    footerLegal: "此预评估为初步筛查，不能替代面对面的医疗咨询，也不提供自动诊断。",
    footerPrivacy: "隐私", footerTerms: "条款", footerRights: "版权所有。",
    pEstimate: "预计时间：4–6分钟", pIntroTitle: "临床预评估",
    pIntroDesc: "此流程将使我们在面对面咨询前详细了解您的情况。我们将收集您的资料和5张精确的头皮照片。",
    pStep1Label: "个人数据", pStep1Detail: "基本脱发史",
    pStep2Label: "照片", pStep2Detail: "5张逐步引导拍摄",
    pStep3Label: "医疗分析", pStep3Detail: "保密临床审查",
    pDisclaimer: "此预评估严格保密，不能替代面对面的医疗咨询，不提供自动诊断。",
    pBeginCTA: "开始评估",
    stepIntro: "介绍", stepData: "数据", stepPhotos: "照片",
    pDataTitle: "您的病史", pDataSub: "填写此基本信息以建立您的临床档案",
    pFullName: "全名 *", pDocId: "身份证件 *",
    pPhone: "手机（WhatsApp）*", pEmail: "电子邮件 *",
    pAge: "年龄", pAgePlaceholder: "岁", pCity: "城市", pCityPlaceholder: "选择您的城市",
    pHairHistory: "脱发史",
    pHairLossTime: "您多久开始注意到脱发？",
    pHairLossOpts: ["不足6个月", "6个月至1年", "1至3年", "超过3年", "不确定"],
    pPattern: "脱发主要集中在哪里？",
    pPatternOpts: ["前额/发际线", "头顶", "前额和头顶", "整个头皮", "不规则区域"],
    pPrevTreatment: "您是否曾使用过脱发治疗？",
    pPrevTreatOpts: ["无", "外用米诺地尔", "口服非那雄胺", "米诺地尔和非那雄胺", "富血小板血浆（PRP）", "其他治疗"],
    pSymptoms: "您有相关症状吗？（可选）", pSymptomsPlaceholder: "例如：瘙痒、头屑、刺激...",
    pSurgery: "您曾进行过毛发移植手术吗？（可选）",
    pSurgeryOpts: ["否", "是，1次既往手术", "是，2次或更多手术"],
    pConsentTitle: "同意与隐私",
    pConsentLine1: "您的照片和数据经加密传输，完全保密处理。",
    pConsentLine2: "此初步评估不构成诊断，不能替代面对面的医疗咨询。",
    pConsentCheckbox: "本人已阅读并同意，为头发初步评估之唯一目的处理我的个人数据和头皮照片，并同意中心就结果与我联系。本人理解此初步评估不构成医学诊断，且可随时撤回此同意。",
    pConsentMarketing: "我同意接收商业信息和促销内容（可选）。",
    pContinueCTA: "继续拍照",
    pSelectOpt: "选择一项", pSelectZone: "选择区域",
    pPhotosTitle: "照片记录", pPhotosSub: "我们需要5张照片进行临床评估",
    pPhotoGuide: "位置指南", pUseCamera: "使用相机", pUploadPhoto: "上传照片",
    pRetakePhoto: "重拍照片", pChangeFile: "更换文件", pProcessing: "处理中...",
    pCompleted: "已完成", pProgress: "进度", pSubmitCTA: "提交评估", pSending: "提交中...",
    pBack: "返回",
    pExit: "退出",
    pTakePhoto: "拍照",
    pUploadDevice: "从设备上传",
    pUsePhoto: "使用这张照片",
    pRepeatPhoto: "重拍照片",
    pUploadAnother: "上传另一张照片",
    pPhotoOf: "第 {n} 张，共 {total} 张",
    pSavedProgress: "进度已保存",
    pSavedOnServer: "已保存",
    pResumeTitle: "你有已保存的进度",
    pResumeDesc: "要从上次的位置继续吗？",
    pResumeCTA: "继续上次进度",
    pResumeRestart: "从头开始",
    pExitTitle: "要退出预评估吗？",
    pExitDesc: "已保存的进度会保留，但未保存的更改将丢失。",
    pExitContinue: "继续预评估",
    pExitSave: "退出并保留进度",
    pExitDiscard: "放弃预评估",
    pExitDiscardConfirm: "确定要放弃所有进度吗？此操作无法撤销。",
    pDuplicate: "此手机或电子邮件已存在评估记录。",
    photoFrontalTitle: "正面视图", photoFrontalDesc: "面对镜头，居中，光线良好。", photoFrontalTip: "在自然光下直视相机，保持额前整洁。",
    photoVertexTitle: "头顶/顶部", photoVertexDesc: "头部略微向前倾斜，相机朝下。", photoVertexTip: "头部向下倾45°。请人从上方拍摄头顶。",
    photoTRTitle: "右颞部", photoTRDesc: "略向左转，展示右侧发际。", photoTRTip: "头部向左转约30°。",
    photoTLTitle: "左颞部", photoTLDesc: "略向右转，展示左侧发际。", photoTLTip: "头部向右转约30°。",
    photoDonorTitle: "供区", photoDonorDesc: "枕部/头后部照片。", photoDonorTip: "头部略向前倾，相机对准枕部，展示完整的后部区域。",
    pSuccessTitle: "您的评估已收到！", pSuccessDesc: "我们的团队将在24个工作小时内审查您的信息和照片。",
    pSuccessNext: "接下来会发生什么？", pSuccessStep1: "审查您的案例（最多24个工作小时）", pSuccessStep2: "我们将通过WhatsApp或电子邮件联系您", pSuccessStep3: "我们安排您的咨询",
    pGoHome: "返回首页", pDataError: "数据不完整", pSaveError: "无法保存您的信息。请重试。", pPhotoError: "处理图像时出错",
    loginTitle: "欢迎回来", loginSub: "请输入密码访问控制面板",
    loginLabel: "访问密码", loginPlaceholder: "••••••••", loginCTA: "进入面板", loginVerifying: "验证中...",
    loginDenied: "访问被拒绝", loginWrongPwd: "输入的密码不正确。",
    loginBrandTitle: "临床管理平台", loginBrandSub: "医疗团队专属访问权限。",
    adminSection: "临床管理", adminPatients: "患者", adminDashTitle: "患者仪表板", adminDashSub: "预评估管理与随访",
    adminNewLink: "新建链接", adminTotal: "患者总数", adminNew: "新患者", adminReady: "就绪/已安排", adminPending: "待完成",
    adminSearchPlaceholder: "按姓名或电话搜索...", adminAllStatuses: "所有状态",
    adminColPatient: "患者", adminColStatus: "状态", adminColPhotos: "照片", adminColDate: "入院日期", adminColAction: "操作",
    adminLoading: "正在加载患者...", adminEmpty: "未找到患者。", adminEmptySub: "尝试调整搜索过滤器。",
    adminStatusPatient: "患者状态", adminAppDate: "预约日期", adminContactWA: "通过WhatsApp联系",
    adminPhotoReg: "照片记录", adminNoPhotos: "患者尚未上传照片。",
    adminPatientHistory: "患者病史", adminDocId: "身份证件", adminEmail: "电子邮件",
    adminAge: "年龄", adminCity: "城市", adminHairLossTime: "脱发持续时间", adminZone: "受影响区域", adminPrevTreatment: "既往治疗",
    adminClinicalNotes: "内部临床使用", adminNorwood: "Norwood量表（评估）",
    adminNotesLabel: "临床笔记", adminNotesPlaceholder: "在此添加案例笔记、移植建议或随访信息...",
    adminLoadingLead: "正在加载患者档案...", adminSaved: "已保存", adminSavedDesc: "更改已成功记录。",
    adminWAMessage: "您好 {name}，我们已审查您的临床预评估。Clinivista与您联系以协调后续步骤。",
    adminDemoWarning: "您正在使用演示密码。请在密钥中配置ADMIN_PASSWORD以保护面板安全。",
    adminInviteTitle: "新建链接", adminInviteNameLabel: "患者姓名（可选）", adminInvitePhoneLabel: "手机号 *",
    adminInviteGenerating: "生成中...", adminInviteGenCTA: "生成评估链接",
    adminInviteCreated: "链接已创建！", adminInviteCreatedSub: "复制或直接发送",
    adminInviteSendWA: "通过WhatsApp发送", adminInviteError: "创建链接时出错", adminLinkError: "创建链接时出错",
    statusNuevo: "新建", statusIncompleto: "不完整", statusListo: "待审查",
    statusContactar: "联系", statusAgendado: "已安排", statusCerrado: "已关闭",
  },
};

// ── Context ──────────────────────────────────────────────────────────────────
type LanguageContextType = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: AppTranslations;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "es",
  setLang: () => {},
  t: T.es,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    try {
      const stored = localStorage.getItem("clinivista_lang") as LangCode;
      if (stored && T[stored]) return stored;
    } catch {}
    return "es";
  });

  const setLang = (l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem("clinivista_lang", l); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
