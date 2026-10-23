// Textos de los tipos de consulta de dermatología (elegir tipo, consultas de la ficha), en los nueve idiomas.
import type { LangCode } from "./language";

export type ConsultText = {
  typeLabel: string;
  consultsTitle: string;
  generalConsult: string;
  addConsult: string;
  addConsultIntro: string;
  chooseType: string;
  addConsultBtn: string;
  adding: string;
  consultAdded: string;
  cantAddConsult: string;
  consultCount: (n: number) => string;
  cancel: string;
};

export const CONSULT_TEXT: Record<LangCode, ConsultText> = {
  es: {
    typeLabel: "Tipo de consulta", consultsTitle: "Consultas de este paciente", generalConsult: "Consulta general",
    addConsult: "Agregar otra consulta", addConsultIntro: "Elige el tipo de consulta. Se crea con los datos personales de este paciente y con su propio proceso de fotos y etapas.",
    chooseType: "Elige el tipo", addConsultBtn: "Agregar consulta", adding: "Agregando…", consultAdded: "Consulta agregada",
    cantAddConsult: "No pudimos agregar la consulta.", consultCount: (n) => `${n} consultas`, cancel: "Cancelar",
  },
  en: {
    typeLabel: "Consultation type", consultsTitle: "This patient's consultations", generalConsult: "General consultation",
    addConsult: "Add another consultation", addConsultIntro: "Choose the consultation type. It is created with this patient's personal details and its own photo and stage process.",
    chooseType: "Choose the type", addConsultBtn: "Add consultation", adding: "Adding…", consultAdded: "Consultation added",
    cantAddConsult: "We couldn't add the consultation.", consultCount: (n) => `${n} consultations`, cancel: "Cancel",
  },
  pt: {
    typeLabel: "Tipo de consulta", consultsTitle: "Consultas deste paciente", generalConsult: "Consulta geral",
    addConsult: "Adicionar outra consulta", addConsultIntro: "Escolha o tipo de consulta. Ela é criada com os dados pessoais deste paciente e com o seu próprio processo de fotos e etapas.",
    chooseType: "Escolha o tipo", addConsultBtn: "Adicionar consulta", adding: "Adicionando…", consultAdded: "Consulta adicionada",
    cantAddConsult: "Não foi possível adicionar a consulta.", consultCount: (n) => `${n} consultas`, cancel: "Cancelar",
  },
  fr: {
    typeLabel: "Type de consultation", consultsTitle: "Consultations de ce patient", generalConsult: "Consultation générale",
    addConsult: "Ajouter une autre consultation", addConsultIntro: "Choisissez le type de consultation. Elle est créée avec les données personnelles de ce patient et son propre processus de photos et d'étapes.",
    chooseType: "Choisissez le type", addConsultBtn: "Ajouter la consultation", adding: "Ajout…", consultAdded: "Consultation ajoutée",
    cantAddConsult: "Impossible d'ajouter la consultation.", consultCount: (n) => `${n} consultations`, cancel: "Annuler",
  },
  de: {
    typeLabel: "Art der Konsultation", consultsTitle: "Konsultationen dieses Patienten", generalConsult: "Allgemeine Konsultation",
    addConsult: "Weitere Konsultation hinzufügen", addConsultIntro: "Wählen Sie die Art der Konsultation. Sie wird mit den persönlichen Daten dieses Patienten und einem eigenen Ablauf aus Fotos und Phasen angelegt.",
    chooseType: "Art wählen", addConsultBtn: "Konsultation hinzufügen", adding: "Wird hinzugefügt…", consultAdded: "Konsultation hinzugefügt",
    cantAddConsult: "Die Konsultation konnte nicht hinzugefügt werden.", consultCount: (n) => `${n} Konsultationen`, cancel: "Abbrechen",
  },
  it: {
    typeLabel: "Tipo di visita", consultsTitle: "Visite di questo paziente", generalConsult: "Visita generale",
    addConsult: "Aggiungi un'altra visita", addConsultIntro: "Scegli il tipo di visita. Viene creata con i dati personali di questo paziente e con un proprio percorso di foto e fasi.",
    chooseType: "Scegli il tipo", addConsultBtn: "Aggiungi visita", adding: "Aggiunta…", consultAdded: "Visita aggiunta",
    cantAddConsult: "Impossibile aggiungere la visita.", consultCount: (n) => `${n} visite`, cancel: "Annulla",
  },
  tr: {
    typeLabel: "Muayene türü", consultsTitle: "Bu hastanın muayeneleri", generalConsult: "Genel muayene",
    addConsult: "Başka bir muayene ekle", addConsultIntro: "Muayene türünü seçin. Bu hastanın kişisel bilgileriyle ve kendi fotoğraf ve aşama süreciyle oluşturulur.",
    chooseType: "Türü seçin", addConsultBtn: "Muayene ekle", adding: "Ekleniyor…", consultAdded: "Muayene eklendi",
    cantAddConsult: "Muayene eklenemedi.", consultCount: (n) => `${n} muayene`, cancel: "İptal",
  },
  ar: {
    typeLabel: "نوع الاستشارة", consultsTitle: "استشارات هذا المريض", generalConsult: "استشارة عامة",
    addConsult: "إضافة استشارة أخرى", addConsultIntro: "اختر نوع الاستشارة. تُنشأ بالبيانات الشخصية لهذا المريض ومعها مسار خاص بها من الصور والمراحل.",
    chooseType: "اختر النوع", addConsultBtn: "إضافة استشارة", adding: "جارٍ الإضافة…", consultAdded: "تمت إضافة الاستشارة",
    cantAddConsult: "تعذّرت إضافة الاستشارة.", consultCount: (n) => `${n} استشارات`, cancel: "إلغاء",
  },
  zh: {
    typeLabel: "就诊类型", consultsTitle: "该患者的就诊记录", generalConsult: "普通就诊",
    addConsult: "添加另一次就诊", addConsultIntro: "请选择就诊类型。系统会使用该患者的个人资料创建，并拥有各自独立的照片与阶段流程。",
    chooseType: "选择类型", addConsultBtn: "添加就诊", adding: "正在添加…", consultAdded: "已添加就诊",
    cantAddConsult: "无法添加就诊。", consultCount: (n) => `${n} 次就诊`, cancel: "取消",
  },
};
