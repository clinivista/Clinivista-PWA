// Textos de la transcripción de documentos (bajo la foto marcada como documento), en los nueve idiomas.
import type { LangCode } from "./language";

export type TranscriptionText = {
  title: string; transcribe: string; working: string; writeManual: string; placeholder: string; save: string; saving: string;
  saved: string; cantSave: string; cantTranscribe: string; review: string; quota: (left: number, total: number) => string;
  quotaOut: string; unavailable: string; retryAdvanced: string; retryConfirm: string; advancedOff: string;
  byBasic: (name: string) => string; byAdvanced: (name: string) => string; byManual: (name: string) => string; editedBy: (name: string) => string;
};

export const TRANSCRIPTION_TEXT: Record<LangCode, TranscriptionText> = {
  es: {
    title: "Transcripción", transcribe: "Transcribir", working: "Transcribiendo…", writeManual: "Escribir a mano", placeholder: "Escribe aquí el texto del documento",
    save: "Guardar texto", saving: "Guardando…", saved: "Texto guardado", cantSave: "No pudimos guardar el texto", cantTranscribe: "No pudimos transcribir el documento",
    review: "Revisa el texto: una transcripción automática puede tener errores, sobre todo con letra manuscrita.",
    quota: (l, t) => `Te quedan ${l} de ${t} transcripciones este mes`, quotaOut: "La clínica usó todas sus transcripciones de este mes. Puedes escribir el texto a mano.",
    unavailable: "La transcripción automática no está disponible por ahora. Puedes escribir el texto a mano.",
    retryAdvanced: "Reintentar con modelo avanzado", retryConfirm: "Se reemplazará el texto actual con una nueva lectura y contará como 2 transcripciones de tu cuota. ¿Continuar?",
    advancedOff: "El modelo avanzado no está incluido en el plan de tu clínica.",
    byBasic: (n) => `Transcrito por ${n}`, byAdvanced: (n) => `Transcrito por ${n} (modelo avanzado)`, byManual: (n) => `Escrito por ${n}`, editedBy: (n) => `Editado por ${n}`,
  },
  en: {
    title: "Transcription", transcribe: "Transcribe", working: "Transcribing…", writeManual: "Type it manually", placeholder: "Type the document text here",
    save: "Save text", saving: "Saving…", saved: "Text saved", cantSave: "We could not save the text", cantTranscribe: "We could not transcribe the document",
    review: "Review the text: an automatic transcription can contain mistakes, especially with handwriting.",
    quota: (l, t) => `${l} of ${t} transcriptions left this month`, quotaOut: "The clinic has used all of this month's transcriptions. You can type the text manually.",
    unavailable: "Automatic transcription is not available right now. You can type the text manually.",
    retryAdvanced: "Retry with advanced model", retryConfirm: "The current text will be replaced by a new reading and it will count as 2 transcriptions of your quota. Continue?",
    advancedOff: "The advanced model is not included in your clinic's plan.",
    byBasic: (n) => `Transcribed by ${n}`, byAdvanced: (n) => `Transcribed by ${n} (advanced model)`, byManual: (n) => `Written by ${n}`, editedBy: (n) => `Edited by ${n}`,
  },
  pt: {
    title: "Transcrição", transcribe: "Transcrever", working: "Transcrevendo…", writeManual: "Digitar manualmente", placeholder: "Digite aqui o texto do documento",
    save: "Salvar texto", saving: "Salvando…", saved: "Texto salvo", cantSave: "Não foi possível salvar o texto", cantTranscribe: "Não foi possível transcrever o documento",
    review: "Revise o texto: uma transcrição automática pode ter erros, principalmente com letra manuscrita.",
    quota: (l, t) => `Restam ${l} de ${t} transcrições neste mês`, quotaOut: "A clínica usou todas as transcrições deste mês. Você pode digitar o texto manualmente.",
    unavailable: "A transcrição automática não está disponível no momento. Você pode digitar o texto manualmente.",
    retryAdvanced: "Tentar de novo com modelo avançado", retryConfirm: "O texto atual será substituído por uma nova leitura e contará como 2 transcrições da sua cota. Continuar?",
    advancedOff: "O modelo avançado não está incluído no plano da sua clínica.",
    byBasic: (n) => `Transcrito por ${n}`, byAdvanced: (n) => `Transcrito por ${n} (modelo avançado)`, byManual: (n) => `Escrito por ${n}`, editedBy: (n) => `Editado por ${n}`,
  },
  fr: {
    title: "Transcription", transcribe: "Transcrire", working: "Transcription…", writeManual: "Saisir à la main", placeholder: "Saisissez ici le texte du document",
    save: "Enregistrer le texte", saving: "Enregistrement…", saved: "Texte enregistré", cantSave: "Impossible d'enregistrer le texte", cantTranscribe: "Impossible de transcrire le document",
    review: "Relisez le texte : une transcription automatique peut contenir des erreurs, surtout avec une écriture manuscrite.",
    quota: (l, t) => `Il reste ${l} transcriptions sur ${t} ce mois-ci`, quotaOut: "La clinique a utilisé toutes ses transcriptions de ce mois. Vous pouvez saisir le texte à la main.",
    unavailable: "La transcription automatique n'est pas disponible pour le moment. Vous pouvez saisir le texte à la main.",
    retryAdvanced: "Réessayer avec le modèle avancé", retryConfirm: "Le texte actuel sera remplacé par une nouvelle lecture et comptera pour 2 transcriptions de votre quota. Continuer ?",
    advancedOff: "Le modèle avancé n'est pas inclus dans le forfait de votre clinique.",
    byBasic: (n) => `Transcrit par ${n}`, byAdvanced: (n) => `Transcrit par ${n} (modèle avancé)`, byManual: (n) => `Saisi par ${n}`, editedBy: (n) => `Modifié par ${n}`,
  },
  de: {
    title: "Transkription", transcribe: "Transkribieren", working: "Wird transkribiert…", writeManual: "Von Hand eingeben", placeholder: "Text des Dokuments hier eingeben",
    save: "Text speichern", saving: "Wird gespeichert…", saved: "Text gespeichert", cantSave: "Der Text konnte nicht gespeichert werden", cantTranscribe: "Das Dokument konnte nicht transkribiert werden",
    review: "Text prüfen: Eine automatische Transkription kann Fehler enthalten, vor allem bei Handschrift.",
    quota: (l, t) => `Noch ${l} von ${t} Transkriptionen in diesem Monat`, quotaOut: "Die Klinik hat alle Transkriptionen dieses Monats verbraucht. Sie können den Text von Hand eingeben.",
    unavailable: "Die automatische Transkription ist derzeit nicht verfügbar. Sie können den Text von Hand eingeben.",
    retryAdvanced: "Mit erweitertem Modell wiederholen", retryConfirm: "Der aktuelle Text wird durch eine neue Erkennung ersetzt und zählt als 2 Transkriptionen Ihres Kontingents. Fortfahren?",
    advancedOff: "Das erweiterte Modell ist im Tarif Ihrer Klinik nicht enthalten.",
    byBasic: (n) => `Transkribiert von ${n}`, byAdvanced: (n) => `Transkribiert von ${n} (erweitertes Modell)`, byManual: (n) => `Verfasst von ${n}`, editedBy: (n) => `Bearbeitet von ${n}`,
  },
  it: {
    title: "Trascrizione", transcribe: "Trascrivi", working: "Trascrizione in corso…", writeManual: "Scrivi a mano", placeholder: "Scrivi qui il testo del documento",
    save: "Salva testo", saving: "Salvataggio…", saved: "Testo salvato", cantSave: "Impossibile salvare il testo", cantTranscribe: "Impossibile trascrivere il documento",
    review: "Controlla il testo: una trascrizione automatica può contenere errori, soprattutto con la scrittura a mano.",
    quota: (l, t) => `Restano ${l} trascrizioni su ${t} questo mese`, quotaOut: "La clinica ha usato tutte le trascrizioni di questo mese. Puoi scrivere il testo a mano.",
    unavailable: "La trascrizione automatica non è disponibile al momento. Puoi scrivere il testo a mano.",
    retryAdvanced: "Riprova con il modello avanzato", retryConfirm: "Il testo attuale sarà sostituito da una nuova lettura e conterà come 2 trascrizioni della tua quota. Continuare?",
    advancedOff: "Il modello avanzato non è incluso nel piano della tua clinica.",
    byBasic: (n) => `Trascritto da ${n}`, byAdvanced: (n) => `Trascritto da ${n} (modello avanzato)`, byManual: (n) => `Scritto da ${n}`, editedBy: (n) => `Modificato da ${n}`,
  },
  tr: {
    title: "Transkripsiyon", transcribe: "Yazıya dök", working: "Yazıya dökülüyor…", writeManual: "Elle yaz", placeholder: "Belgenin metnini buraya yazın",
    save: "Metni kaydet", saving: "Kaydediliyor…", saved: "Metin kaydedildi", cantSave: "Metin kaydedilemedi", cantTranscribe: "Belge yazıya dökülemedi",
    review: "Metni kontrol edin: otomatik transkripsiyonda, özellikle el yazısında hatalar olabilir.",
    quota: (l, t) => `Bu ay ${t} transkripsiyondan ${l} hakkınız kaldı`, quotaOut: "Klinik bu ayki tüm transkripsiyon hakkını kullandı. Metni elle yazabilirsiniz.",
    unavailable: "Otomatik transkripsiyon şu anda kullanılamıyor. Metni elle yazabilirsiniz.",
    retryAdvanced: "Gelişmiş modelle yeniden dene", retryConfirm: "Mevcut metin yeni bir okumayla değiştirilecek ve kotanızdan 2 transkripsiyon sayılacak. Devam edilsin mi?",
    advancedOff: "Gelişmiş model kliniğinizin planına dahil değil.",
    byBasic: (n) => `Yazıya döken: ${n}`, byAdvanced: (n) => `Yazıya döken: ${n} (gelişmiş model)`, byManual: (n) => `Yazan: ${n}`, editedBy: (n) => `Düzenleyen: ${n}`,
  },
  ar: {
    title: "النسخ النصي", transcribe: "تفريغ النص", working: "جارٍ التفريغ…", writeManual: "كتابة يدوية", placeholder: "اكتب هنا نص المستند",
    save: "حفظ النص", saving: "جارٍ الحفظ…", saved: "تم حفظ النص", cantSave: "تعذّر حفظ النص", cantTranscribe: "تعذّر تفريغ المستند",
    review: "راجع النص: قد يحتوي التفريغ التلقائي على أخطاء، خاصةً مع الخط اليدوي.",
    quota: (l, t) => `تبقّى ${l} من ${t} عمليات تفريغ هذا الشهر`, quotaOut: "استخدمت العيادة جميع عمليات التفريغ لهذا الشهر. يمكنك كتابة النص يدويًا.",
    unavailable: "التفريغ التلقائي غير متاح حاليًا. يمكنك كتابة النص يدويًا.",
    retryAdvanced: "إعادة المحاولة بالنموذج المتقدم", retryConfirm: "سيُستبدل النص الحالي بقراءة جديدة وسيُحتسب كعمليتي تفريغ من حصتك. هل تتابع؟",
    advancedOff: "النموذج المتقدم غير مشمول في باقة عيادتك.",
    byBasic: (n) => `فرّغه ${n}`, byAdvanced: (n) => `فرّغه ${n} (النموذج المتقدم)`, byManual: (n) => `كتبه ${n}`, editedBy: (n) => `عدّله ${n}`,
  },
  zh: {
    title: "文字转录", transcribe: "转录", working: "转录中…", writeManual: "手动输入", placeholder: "在此输入文件内容",
    save: "保存文字", saving: "保存中…", saved: "文字已保存", cantSave: "无法保存文字", cantTranscribe: "无法转录该文件",
    review: "请核对文字：自动转录可能有错误，手写内容尤其如此。",
    quota: (l, t) => `本月还剩 ${l} / ${t} 次转录`, quotaOut: "诊所本月的转录次数已用完。您可以手动输入文字。",
    unavailable: "自动转录暂不可用。您可以手动输入文字。",
    retryAdvanced: "使用高级模型重试", retryConfirm: "当前文字将被新的识别结果替换，并占用您额度中的 2 次转录。是否继续？",
    advancedOff: "您诊所的套餐不包含高级模型。",
    byBasic: (n) => `转录人：${n}`, byAdvanced: (n) => `转录人：${n}（高级模型）`, byManual: (n) => `录入人：${n}`, editedBy: (n) => `编辑人：${n}`,
  },
};

/** Etiqueta de la tarjeta "documentos transcritos" del dashboard de la clínica. */
export const DOCS_TRANSCRIBED: Record<LangCode, string> = {
  es: "Documentos transcritos", en: "Documents transcribed", pt: "Documentos transcritos", fr: "Documents transcrits", de: "Transkribierte Dokumente",
  it: "Documenti trascritti", tr: "Yazıya dökülen belgeler", ar: "المستندات المفرّغة", zh: "已转录文件",
};
