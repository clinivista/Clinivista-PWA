// Textos de la comparación "Evolución" (PDF y correo) y nombres de fases y zonas, en los nueve idiomas.
// Los nombres de fases y zonas son los de la aplicación; si la clínica los renombró, se muestran tal como los escribió.
import { toPdfLanguage, type PdfLanguage } from "./result-pdf-i18n";

export type EvolutionText = {
  documentTitle: string; title: string; intro: string; noPhoto: string; edited: string; notice: string;
  subject: (clinic: string) => string;
  mailIntro: (clinic: string) => string;
  mailIntroOther: (clinic: string, patient: string) => string;
  note: string;
};

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w)\}/g, (_, key: string) => values[key] ?? "");

export const EVOLUTION_TEXT: Record<PdfLanguage, EvolutionText> = {
  es: { documentTitle: "Evolución", title: "Evolución de su tratamiento", intro: "Comparación de sus fotografías de la misma zona en las distintas fases del tratamiento.", noPhoto: "Sin foto", edited: "editada por el equipo médico", notice: "Esta comparación es informativa y no reemplaza la evaluación del equipo médico.", subject: (c) => fill("Evolución de su tratamiento – {c}", { c }), mailIntro: (c) => fill("{c} le envía la comparación de sus fotografías a lo largo del tratamiento. La encontrará adjunta en formato PDF.", { c }), mailIntroOther: (c, p) => fill("{c} envía la comparación de las fotografías de {p} a lo largo de su tratamiento, adjunta en formato PDF.", { c, p }), note: "Es un documento confidencial: no lo reenvíe a personas ajenas." },
  en: { documentTitle: "Progress", title: "Your treatment progress", intro: "Comparison of your photos of the same area across the phases of your treatment.", noPhoto: "No photo", edited: "edited by the medical team", notice: "This comparison is for information only and does not replace the medical team's assessment.", subject: (c) => fill("Your treatment progress – {c}", { c }), mailIntro: (c) => fill("{c} is sending you the comparison of your photos throughout your treatment. You will find it attached as a PDF.", { c }), mailIntroOther: (c, p) => fill("{c} is sending the comparison of {p}'s photos throughout their treatment, attached as a PDF.", { c, p }), note: "This is a confidential document: please do not forward it to anyone else." },
  pt: { documentTitle: "Evolução", title: "Evolução do seu tratamento", intro: "Comparação das suas fotografias da mesma área nas diferentes fases do tratamento.", noPhoto: "Sem foto", edited: "editada pela equipe médica", notice: "Esta comparação é informativa e não substitui a avaliação da equipe médica.", subject: (c) => fill("Evolução do seu tratamento – {c}", { c }), mailIntro: (c) => fill("{c} envia a comparação das suas fotografias ao longo do tratamento. Ela está anexada em PDF.", { c }), mailIntroOther: (c, p) => fill("{c} envia a comparação das fotografias de {p} ao longo do tratamento, anexada em PDF.", { c, p }), note: "É um documento confidencial: não o encaminhe a pessoas alheias." },
  fr: { documentTitle: "Évolution", title: "Évolution de votre traitement", intro: "Comparaison de vos photos de la même zone aux différentes phases du traitement.", noPhoto: "Pas de photo", edited: "modifiée par l'équipe médicale", notice: "Cette comparaison est donnée à titre informatif et ne remplace pas l'évaluation de l'équipe médicale.", subject: (c) => fill("Évolution de votre traitement – {c}", { c }), mailIntro: (c) => fill("{c} vous envoie la comparaison de vos photos tout au long du traitement. Vous la trouverez en pièce jointe au format PDF.", { c }), mailIntroOther: (c, p) => fill("{c} envoie la comparaison des photos de {p} tout au long de son traitement, en pièce jointe au format PDF.", { c, p }), note: "Ce document est confidentiel : ne le transmettez pas à des tiers." },
  de: { documentTitle: "Verlauf", title: "Verlauf Ihrer Behandlung", intro: "Vergleich Ihrer Fotos desselben Bereichs in den verschiedenen Phasen der Behandlung.", noPhoto: "Kein Foto", edited: "vom medizinischen Team bearbeitet", notice: "Dieser Vergleich dient nur zur Information und ersetzt nicht die Beurteilung des medizinischen Teams.", subject: (c) => fill("Verlauf Ihrer Behandlung – {c}", { c }), mailIntro: (c) => fill("{c} sendet Ihnen den Vergleich Ihrer Fotos im Verlauf der Behandlung. Sie finden ihn als PDF im Anhang.", { c }), mailIntroOther: (c, p) => fill("{c} sendet den Vergleich der Fotos von {p} im Verlauf der Behandlung als PDF im Anhang.", { c, p }), note: "Dies ist ein vertrauliches Dokument: Bitte leiten Sie es nicht an Dritte weiter." },
  it: { documentTitle: "Evoluzione", title: "Evoluzione del suo trattamento", intro: "Confronto delle sue fotografie della stessa zona nelle diverse fasi del trattamento.", noPhoto: "Nessuna foto", edited: "modificata dal team medico", notice: "Questo confronto è solo informativo e non sostituisce la valutazione del team medico.", subject: (c) => fill("Evoluzione del suo trattamento – {c}", { c }), mailIntro: (c) => fill("{c} le invia il confronto delle sue fotografie durante il trattamento. Lo trova in allegato in formato PDF.", { c }), mailIntroOther: (c, p) => fill("{c} invia il confronto delle fotografie di {p} durante il trattamento, in allegato in formato PDF.", { c, p }), note: "Documento riservato: non inoltrarlo a persone estranee." },
  tr: { documentTitle: "Gelişim", title: "Tedavinizin gelişimi", intro: "Aynı bölgeye ait fotoğraflarınızın tedavinin farklı aşamalarındaki karşılaştırması.", noPhoto: "Fotoğraf yok", edited: "tıbbi ekip tarafından düzenlendi", notice: "Bu karşılaştırma yalnızca bilgilendirme amaçlıdır ve tıbbi ekibin değerlendirmesinin yerini tutmaz.", subject: (c) => fill("Tedavinizin gelişimi – {c}", { c }), mailIntro: (c) => fill("{c}, tedaviniz boyunca çekilen fotoğraflarınızın karşılaştırmasını size gönderiyor. PDF olarak ekte bulabilirsiniz.", { c }), mailIntroOther: (c, p) => fill("{c}, {p} adlı hastanın tedavisi boyunca çekilen fotoğraflarının karşılaştırmasını PDF olarak ekte gönderiyor.", { c, p }), note: "Bu belge gizlidir: lütfen başkalarına iletmeyin." },
  ar: { documentTitle: "التطور", title: "تطور علاجك", intro: "مقارنة بين صورك للمنطقة نفسها في مراحل العلاج المختلفة.", noPhoto: "لا توجد صورة", edited: "عدّلها الفريق الطبي", notice: "هذه المقارنة للاطلاع فقط ولا تغني عن تقييم الفريق الطبي.", subject: (c) => fill("تطور علاجك – {c}", { c }), mailIntro: (c) => fill("يرسل لك {c} مقارنة صورك على امتداد العلاج. ستجدها مرفقة بصيغة PDF.", { c }), mailIntroOther: (c, p) => fill("يرسل {c} مقارنة صور {p} على امتداد العلاج، مرفقة بصيغة PDF.", { c, p }), note: "هذه وثيقة سرية: يرجى عدم إرسالها إلى أشخاص آخرين." },
  zh: { documentTitle: "治疗进展", title: "您的治疗进展", intro: "同一部位的照片在治疗各阶段的对比。", noPhoto: "无照片", edited: "由医疗团队编辑", notice: "本对比仅供参考，不能替代医疗团队的评估。", subject: (c) => fill("您的治疗进展 – {c}", { c }), mailIntro: (c) => fill("{c} 向您发送治疗期间照片的对比，请查看附件中的 PDF。", { c }), mailIntroOther: (c, p) => fill("{c} 发送 {p} 治疗期间照片的对比，见附件 PDF。", { c, p }), note: "这是机密文件，请勿转发给他人。" },
};

const PHASE_NAMES: Record<string, Record<PdfLanguage, string>> = {
  "preevaluacion": {"es": "Pre-evaluación", "en": "Pre-evaluation", "pt": "Pré-avaliação", "fr": "Pré-évaluation", "de": "Voruntersuchung", "it": "Pre-valutazione", "tr": "Ön değerlendirme", "ar": "التقييم المبدئي", "zh": "预评估"},
  "diagnostico": {"es": "Diagnóstico", "en": "Diagnosis", "pt": "Diagnóstico", "fr": "Diagnostic", "de": "Diagnose", "it": "Diagnosi", "tr": "Teşhis", "ar": "التشخيص", "zh": "诊断"},
  "preoperatorio": {"es": "Pre-operatorio", "en": "Pre-operative", "pt": "Pré-operatório", "fr": "Préopératoire", "de": "Präoperativ", "it": "Pre-operatorio", "tr": "Ameliyat öncesi", "ar": "ما قبل الجراحة", "zh": "术前"},
  "postoperatorio": {"es": "Post-operatorio", "en": "Post-operative", "pt": "Pós-operatório", "fr": "Postopératoire", "de": "Postoperativ", "it": "Post-operatorio", "tr": "Ameliyat sonrası", "ar": "ما بعد الجراحة", "zh": "术后"},
  "control-1": {"es": "Control médico 1", "en": "Medical check-up 1", "pt": "Controle médico 1", "fr": "Contrôle médical 1", "de": "Ärztliche Kontrolle 1", "it": "Controllo medico 1", "tr": "Tıbbi kontrol 1", "ar": "المراجعة الطبية 1", "zh": "医学复查 1"},
  "control-2": {"es": "Control médico 2", "en": "Medical check-up 2", "pt": "Controle médico 2", "fr": "Contrôle médical 2", "de": "Ärztliche Kontrolle 2", "it": "Controllo medico 2", "tr": "Tıbbi kontrol 2", "ar": "المراجعة الطبية 2", "zh": "医学复查 2"},
};

/** The phase name in the patient's language; a name the clinic changed is kept as typed. */
export function evolutionPhaseName(phase: { key: string; name: string }, language: unknown): string {
  const known = PHASE_NAMES[phase.key];
  return known && phase.name === known.es ? known[toPdfLanguage(language)] : phase.name;
}

const ZONE_NAMES: Record<string, Record<PdfLanguage, string> & { default: string }> = {
  "frontal": {"default": "Vista frontal", "es": "Vista frontal", "en": "Frontal view", "pt": "Vista frontal", "fr": "Vue frontale", "de": "Frontansicht", "it": "Vista frontale", "tr": "Ön görünüm", "ar": "منظر أمامي", "zh": "正面视图"},
  "vertex": {"default": "Vista superior / vértex", "es": "Vértex / Coronilla", "en": "Vertex / Crown", "pt": "Vértex / Coroa", "fr": "Vertex / Sommet", "de": "Vertex / Scheitel", "it": "Vertex / Corona", "tr": "Vertex / Tepe", "ar": "قمة الرأس", "zh": "头顶/顶部"},
  "temporalRight": {"default": "Temporal derecha", "es": "Temporal derecha", "en": "Right temple", "pt": "Têmpora direita", "fr": "Tempe droite", "de": "Rechte Schläfe", "it": "Tempia destra", "tr": "Sağ şakak", "ar": "الصدغ الأيمن", "zh": "右颞部"},
  "temporalLeft": {"default": "Temporal izquierda", "es": "Temporal izquierda", "en": "Left temple", "pt": "Têmpora esquerda", "fr": "Tempe gauche", "de": "Linke Schläfe", "it": "Tempia sinistra", "tr": "Sol şakak", "ar": "الصدغ الأيسر", "zh": "左颞部"},
  "donor": {"default": "Zona donante", "es": "Zona donante", "en": "Donor area", "pt": "Área doadora", "fr": "Zone donneuse", "de": "Spenderbereich", "it": "Area donatrice", "tr": "Donör bölge", "ar": "منطقة المانح", "zh": "供区"},
  "plasticFront": {"default": "Vista frontal", "es": "Vista frontal", "en": "Front view", "pt": "Vista frontal", "fr": "Vue de face", "de": "Vorderansicht", "it": "Vista frontale", "tr": "Önden görünüm", "ar": "من الأمام", "zh": "正面"},
  "plasticProfileRight": {"default": "Perfil derecho", "es": "Perfil derecho", "en": "Right profile", "pt": "Perfil direito", "fr": "Profil droit", "de": "Rechtes Profil", "it": "Profilo destro", "tr": "Sağ profil", "ar": "الجانب الأيمن", "zh": "右侧面"},
  "plasticProfileLeft": {"default": "Perfil izquierdo", "es": "Perfil izquierdo", "en": "Left profile", "pt": "Perfil esquerdo", "fr": "Profil gauche", "de": "Linkes Profil", "it": "Profilo sinistro", "tr": "Sol profil", "ar": "الجانب الأيسر", "zh": "左侧面"},
  "plasticObliqueRight": {"default": "Oblicua derecha", "es": "Oblicua derecha", "en": "Right oblique", "pt": "Oblíqua direita", "fr": "Oblique droite", "de": "Schräg rechts", "it": "Obliqua destra", "tr": "Sağ çapraz", "ar": "مائلة لليمين", "zh": "右斜侧"},
  "plasticObliqueLeft": {"default": "Oblicua izquierda", "es": "Oblicua izquierda", "en": "Left oblique", "pt": "Oblíqua esquerda", "fr": "Oblique gauche", "de": "Schräg links", "it": "Obliqua sinistra", "tr": "Sol çapraz", "ar": "مائلة لليسار", "zh": "左斜侧"},
};

/** The base key of a zone: later phases repeat the starting views as "<phase>-<view>". */
export function zoneKeyOf(viewKey: string, phaseKey: string): string {
  return viewKey.startsWith(`${phaseKey}-`) ? viewKey.slice(phaseKey.length + 1) : viewKey;
}

/** The zone's name in the patient's language; a label the clinic changed is kept as typed. */
export function evolutionZoneName(zoneKey: string, label: string, language: unknown): string {
  const known = ZONE_NAMES[zoneKey];
  return known && label === known.default ? known[toPdfLanguage(language)] : label;
}
