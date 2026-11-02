import type { LangCode } from "./language";

// Modificar la evaluación: lo que ve el paciente cuando ya está en revisión, el portal y el panel de la clínica.
export type EvaluationEditText = {
  lockedTitle: string; lockedDesc: string; noteLabel: string; notePlaceholder: string; addPhotos: string; photosChosen: (n: number) => string;
  send: string; sending: string; sentTitle: string; sentDesc: string; error: string; tooMany: string; needSomething: string;
  yourSends: string; pending: string; incorporated: string; dismissed: string; photos: (n: number) => string;
  rectifyHint: string; successNote: string; goAccount: string; reviewing: string;
};

export const EVALUATION_EDIT_TEXT: Record<LangCode, EvaluationEditText> = {
  es: {
    lockedTitle: "Tu evaluación ya está en revisión",
    lockedDesc: "El equipo médico ya empezó a revisarla, por eso ya no se pueden cambiar las fotos ni los datos que enviaste. Si tienes algo nuevo, envíalo aquí: no reemplaza lo anterior y la clínica lo revisará.",
    noteLabel: "¿Qué quieres agregar o corregir?", notePlaceholder: "Por ejemplo: me salió una mancha nueva, o aquí está la foto que me faltó.",
    addPhotos: "Agregar fotos (hasta 4)", photosChosen: (n) => `${n} foto(s) elegida(s)`,
    send: "Enviar a la clínica", sending: "Enviando…", sentTitle: "Enviado", sentDesc: "La clínica lo revisará. Lo que enviaste antes no cambia.",
    error: "No pudimos enviarlo. Intenta de nuevo.", tooMany: "Ya tienes varios envíos pendientes de revisión.", needSomething: "Escribe un mensaje o elige al menos una foto.",
    yourSends: "Tus envíos", pending: "Pendiente de revisión", incorporated: "Revisado e incorporado por la clínica", dismissed: "Revisado por la clínica",
    photos: (n) => `${n} foto(s)`,
    rectifyHint: "Para corregir un dato de tu ficha (por ejemplo, tu nombre o teléfono), usa «Mis datos y derechos» y elige Rectificación.",
    successNote: "Mientras la clínica no haya empezado a revisar tu evaluación, puedes modificarla entrando a tu cuenta.", goAccount: "Ir a mi cuenta", reviewing: "En revisión",
  },
  en: {
    lockedTitle: "Your evaluation is already under review",
    lockedDesc: "The medical team has started reviewing it, so the photos and data you sent can no longer be changed. If you have something new, send it here: it does not replace what you sent before and the clinic will review it.",
    noteLabel: "What would you like to add or correct?", notePlaceholder: "For example: a new spot appeared, or here is the photo I was missing.",
    addPhotos: "Add photos (up to 4)", photosChosen: (n) => `${n} photo(s) chosen`,
    send: "Send to the clinic", sending: "Sending…", sentTitle: "Sent", sentDesc: "The clinic will review it. What you sent before does not change.",
    error: "We could not send it. Please try again.", tooMany: "You already have several submissions waiting for review.", needSomething: "Write a message or choose at least one photo.",
    yourSends: "Your submissions", pending: "Waiting for review", incorporated: "Reviewed and included by the clinic", dismissed: "Reviewed by the clinic",
    photos: (n) => `${n} photo(s)`,
    rectifyHint: "To correct a detail in your record (for example, your name or phone), use “My data and rights” and choose Rectification.",
    successNote: "Until the clinic starts reviewing your evaluation, you can change it by signing in to your account.", goAccount: "Go to my account", reviewing: "Under review",
  },
  pt: {
    lockedTitle: "Sua avaliação já está em análise",
    lockedDesc: "A equipe médica já começou a analisá-la, por isso as fotos e os dados enviados não podem mais ser alterados. Se tiver algo novo, envie aqui: não substitui o que enviou antes e a clínica irá analisar.",
    noteLabel: "O que você quer acrescentar ou corrigir?", notePlaceholder: "Por exemplo: apareceu uma mancha nova, ou aqui está a foto que faltava.",
    addPhotos: "Adicionar fotos (até 4)", photosChosen: (n) => `${n} foto(s) escolhida(s)`,
    send: "Enviar à clínica", sending: "Enviando…", sentTitle: "Enviado", sentDesc: "A clínica irá analisar. O que você enviou antes não muda.",
    error: "Não foi possível enviar. Tente novamente.", tooMany: "Você já tem vários envios aguardando análise.", needSomething: "Escreva uma mensagem ou escolha pelo menos uma foto.",
    yourSends: "Seus envios", pending: "Aguardando análise", incorporated: "Analisado e incorporado pela clínica", dismissed: "Analisado pela clínica",
    photos: (n) => `${n} foto(s)`,
    rectifyHint: "Para corrigir um dado da sua ficha (por exemplo, nome ou telefone), use «Meus dados e direitos» e escolha Retificação.",
    successNote: "Enquanto a clínica não começar a analisar sua avaliação, você pode alterá-la entrando na sua conta.", goAccount: "Ir para minha conta", reviewing: "Em análise",
  },
  fr: {
    lockedTitle: "Votre évaluation est déjà en cours d'examen",
    lockedDesc: "L'équipe médicale a commencé à l'examiner : les photos et les données envoyées ne peuvent donc plus être modifiées. Si vous avez du nouveau, envoyez-le ici : cela ne remplace pas ce que vous avez envoyé et la clinique l'examinera.",
    noteLabel: "Que souhaitez-vous ajouter ou corriger ?", notePlaceholder: "Par exemple : une nouvelle tache est apparue, ou voici la photo qui manquait.",
    addPhotos: "Ajouter des photos (jusqu'à 4)", photosChosen: (n) => `${n} photo(s) choisie(s)`,
    send: "Envoyer à la clinique", sending: "Envoi…", sentTitle: "Envoyé", sentDesc: "La clinique l'examinera. Ce que vous avez envoyé avant ne change pas.",
    error: "Envoi impossible. Veuillez réessayer.", tooMany: "Vous avez déjà plusieurs envois en attente d'examen.", needSomething: "Écrivez un message ou choisissez au moins une photo.",
    yourSends: "Vos envois", pending: "En attente d'examen", incorporated: "Examiné et intégré par la clinique", dismissed: "Examiné par la clinique",
    photos: (n) => `${n} photo(s)`,
    rectifyHint: "Pour corriger une donnée de votre dossier (par exemple votre nom ou téléphone), utilisez « Mes données et droits » et choisissez Rectification.",
    successNote: "Tant que la clinique n'a pas commencé à examiner votre évaluation, vous pouvez la modifier en vous connectant à votre compte.", goAccount: "Accéder à mon compte", reviewing: "En cours d'examen",
  },
  de: {
    lockedTitle: "Ihre Auswertung wird bereits geprüft",
    lockedDesc: "Das medizinische Team hat mit der Prüfung begonnen, daher können die gesendeten Fotos und Daten nicht mehr geändert werden. Haben Sie etwas Neues, senden Sie es hier: Es ersetzt nichts von früher und die Klinik prüft es.",
    noteLabel: "Was möchten Sie ergänzen oder korrigieren?", notePlaceholder: "Zum Beispiel: Es ist ein neuer Fleck aufgetreten, oder hier ist das fehlende Foto.",
    addPhotos: "Fotos hinzufügen (bis zu 4)", photosChosen: (n) => `${n} Foto(s) ausgewählt`,
    send: "An die Klinik senden", sending: "Wird gesendet…", sentTitle: "Gesendet", sentDesc: "Die Klinik wird es prüfen. Was Sie zuvor gesendet haben, bleibt unverändert.",
    error: "Senden nicht möglich. Bitte erneut versuchen.", tooMany: "Sie haben bereits mehrere Sendungen, die geprüft werden müssen.", needSomething: "Schreiben Sie eine Nachricht oder wählen Sie mindestens ein Foto.",
    yourSends: "Ihre Sendungen", pending: "Wartet auf Prüfung", incorporated: "Von der Klinik geprüft und übernommen", dismissed: "Von der Klinik geprüft",
    photos: (n) => `${n} Foto(s)`,
    rectifyHint: "Um eine Angabe in Ihrer Akte zu korrigieren (z. B. Name oder Telefon), nutzen Sie „Meine Daten und Rechte“ und wählen Sie Berichtigung.",
    successNote: "Solange die Klinik Ihre Auswertung nicht prüft, können Sie sie ändern, indem Sie sich in Ihrem Konto anmelden.", goAccount: "Zu meinem Konto", reviewing: "In Prüfung",
  },
  it: {
    lockedTitle: "La tua valutazione è già in revisione",
    lockedDesc: "L'équipe medica ha iniziato a esaminarla, quindi le foto e i dati inviati non si possono più modificare. Se hai qualcosa di nuovo, invialo qui: non sostituisce quanto inviato prima e la clinica lo esaminerà.",
    noteLabel: "Cosa vuoi aggiungere o correggere?", notePlaceholder: "Ad esempio: è comparsa una nuova macchia, oppure ecco la foto che mancava.",
    addPhotos: "Aggiungi foto (fino a 4)", photosChosen: (n) => `${n} foto scelte`,
    send: "Invia alla clinica", sending: "Invio…", sentTitle: "Inviato", sentDesc: "La clinica lo esaminerà. Quanto inviato prima non cambia.",
    error: "Impossibile inviare. Riprova.", tooMany: "Hai già diversi invii in attesa di revisione.", needSomething: "Scrivi un messaggio o scegli almeno una foto.",
    yourSends: "I tuoi invii", pending: "In attesa di revisione", incorporated: "Esaminato e incorporato dalla clinica", dismissed: "Esaminato dalla clinica",
    photos: (n) => `${n} foto`,
    rectifyHint: "Per correggere un dato della tua scheda (ad esempio nome o telefono), usa «I miei dati e diritti» e scegli Rettifica.",
    successNote: "Finché la clinica non inizia a esaminare la tua valutazione, puoi modificarla accedendo al tuo account.", goAccount: "Vai al mio account", reviewing: "In revisione",
  },
  tr: {
    lockedTitle: "Değerlendirmeniz zaten inceleniyor",
    lockedDesc: "Tıbbi ekip incelemeye başladı; bu nedenle gönderdiğiniz fotoğraf ve veriler artık değiştirilemez. Yeni bir şeyiniz varsa buradan gönderin: öncekinin yerine geçmez ve klinik inceler.",
    noteLabel: "Neyi eklemek veya düzeltmek istiyorsunuz?", notePlaceholder: "Örneğin: yeni bir leke çıktı ya da eksik olan fotoğraf burada.",
    addPhotos: "Fotoğraf ekle (en fazla 4)", photosChosen: (n) => `${n} fotoğraf seçildi`,
    send: "Kliniğe gönder", sending: "Gönderiliyor…", sentTitle: "Gönderildi", sentDesc: "Klinik inceleyecek. Daha önce gönderdikleriniz değişmez.",
    error: "Gönderilemedi. Lütfen tekrar deneyin.", tooMany: "İnceleme bekleyen birkaç gönderiminiz zaten var.", needSomething: "Bir mesaj yazın veya en az bir fotoğraf seçin.",
    yourSends: "Gönderimleriniz", pending: "İnceleme bekliyor", incorporated: "Klinik tarafından incelendi ve eklendi", dismissed: "Klinik tarafından incelendi",
    photos: (n) => `${n} fotoğraf`,
    rectifyHint: "Dosyanızdaki bir bilgiyi (örneğin adınız veya telefonunuz) düzeltmek için «Verilerim ve haklarım» bölümünden Düzeltme'yi seçin.",
    successNote: "Klinik değerlendirmenizi incelemeye başlamadan önce hesabınıza girerek değiştirebilirsiniz.", goAccount: "Hesabıma git", reviewing: "İnceleniyor",
  },
  ar: {
    lockedTitle: "تقييمك قيد المراجعة بالفعل",
    lockedDesc: "بدأ الفريق الطبي بمراجعته، لذلك لا يمكن تغيير الصور والبيانات التي أرسلتها. إذا كانت لديك معلومة جديدة فأرسلها هنا: لا تحلّ محل ما أرسلته سابقًا وستراجعها العيادة.",
    noteLabel: "ماذا تريد أن تضيف أو تصحح؟", notePlaceholder: "مثلًا: ظهرت بقعة جديدة، أو هذه هي الصورة التي كانت ناقصة.",
    addPhotos: "إضافة صور (حتى 4)", photosChosen: (n) => `تم اختيار ${n} صورة`,
    send: "إرسال إلى العيادة", sending: "جارٍ الإرسال…", sentTitle: "تم الإرسال", sentDesc: "ستراجعه العيادة. ما أرسلته سابقًا لا يتغير.",
    error: "تعذّر الإرسال. حاول مرة أخرى.", tooMany: "لديك بالفعل عدة إرسالات بانتظار المراجعة.", needSomething: "اكتب رسالة أو اختر صورة واحدة على الأقل.",
    yourSends: "إرسالاتك", pending: "بانتظار المراجعة", incorporated: "راجعته العيادة وأضافته", dismissed: "راجعته العيادة",
    photos: (n) => `${n} صورة`,
    rectifyHint: "لتصحيح بيانات في ملفك (مثل الاسم أو الهاتف) استخدم «بياناتي وحقوقي» واختر التصحيح.",
    successNote: "ما دامت العيادة لم تبدأ بمراجعة تقييمك، يمكنك تعديله بتسجيل الدخول إلى حسابك.", goAccount: "الذهاب إلى حسابي", reviewing: "قيد المراجعة",
  },
  zh: {
    lockedTitle: "您的评估已在审核中",
    lockedDesc: "医疗团队已开始审核，因此您已发送的照片和数据无法再更改。如有新的内容，请在此发送：不会替换之前的内容，诊所会进行查看。",
    noteLabel: "您想补充或更正什么？", notePlaceholder: "例如：出现了新的斑点，或这是之前缺少的照片。",
    addPhotos: "添加照片（最多 4 张）", photosChosen: (n) => `已选择 ${n} 张照片`,
    send: "发送给诊所", sending: "发送中…", sentTitle: "已发送", sentDesc: "诊所会进行查看。您之前发送的内容不会改变。",
    error: "无法发送，请重试。", tooMany: "您已有多条待审核的发送。", needSomething: "请填写留言或至少选择一张照片。",
    yourSends: "您的发送记录", pending: "待审核", incorporated: "诊所已审核并纳入", dismissed: "诊所已审核",
    photos: (n) => `${n} 张照片`,
    rectifyHint: "如需更正档案中的信息（如姓名或电话），请使用“我的数据与权利”并选择更正。",
    successNote: "在诊所开始审核之前，您可以登录账户修改您的评估。", goAccount: "进入我的账户", reviewing: "审核中",
  },
};

export type PortalEditText = { edit: string; extra: string; openHint: string; lockedHint: string };
export const PORTAL_EDIT_TEXT: Record<LangCode, PortalEditText> = {
  es: { edit: "Modificar mi evaluación", extra: "Enviar información adicional", openHint: "Puedes cambiar tus datos y fotos mientras la clínica no haya empezado a revisarla.", lockedHint: "Tu evaluación está en revisión: ya no se puede cambiar, pero puedes enviar información adicional." },
  en: { edit: "Edit my evaluation", extra: "Send additional information", openHint: "You can change your data and photos until the clinic starts reviewing it.", lockedHint: "Your evaluation is under review: it can no longer be changed, but you can send additional information." },
  pt: { edit: "Modificar minha avaliação", extra: "Enviar informações adicionais", openHint: "Você pode alterar seus dados e fotos enquanto a clínica não começar a analisá-la.", lockedHint: "Sua avaliação está em análise: não pode mais ser alterada, mas você pode enviar informações adicionais." },
  fr: { edit: "Modifier mon évaluation", extra: "Envoyer des informations complémentaires", openHint: "Vous pouvez modifier vos données et photos tant que la clinique n'a pas commencé l'examen.", lockedHint: "Votre évaluation est en cours d'examen : elle ne peut plus être modifiée, mais vous pouvez envoyer des informations complémentaires." },
  de: { edit: "Meine Auswertung ändern", extra: "Zusätzliche Informationen senden", openHint: "Sie können Daten und Fotos ändern, solange die Klinik die Prüfung nicht begonnen hat.", lockedHint: "Ihre Auswertung wird geprüft: Sie kann nicht mehr geändert werden, aber Sie können zusätzliche Informationen senden." },
  it: { edit: "Modifica la mia valutazione", extra: "Invia informazioni aggiuntive", openHint: "Puoi modificare dati e foto finché la clinica non inizia la revisione.", lockedHint: "La tua valutazione è in revisione: non si può più modificare, ma puoi inviare informazioni aggiuntive." },
  tr: { edit: "Değerlendirmemi düzenle", extra: "Ek bilgi gönder", openHint: "Klinik incelemeye başlamadan önce verilerinizi ve fotoğraflarınızı değiştirebilirsiniz.", lockedHint: "Değerlendirmeniz inceleniyor: artık değiştirilemez ancak ek bilgi gönderebilirsiniz." },
  ar: { edit: "تعديل تقييمي", extra: "إرسال معلومات إضافية", openHint: "يمكنك تغيير بياناتك وصورك ما دامت العيادة لم تبدأ بمراجعته.", lockedHint: "تقييمك قيد المراجعة: لا يمكن تغييره بعد الآن، لكن يمكنك إرسال معلومات إضافية." },
  zh: { edit: "修改我的评估", extra: "发送补充信息", openHint: "在诊所开始审核之前，您可以修改数据和照片。", lockedHint: "您的评估正在审核中：无法再修改，但可以发送补充信息。" },
};

// Panel de la clínica: «Novedades del paciente».
export type PatientUpdatesText = {
  title: string; subtitle: string; badge: string; dataChanged: string; photoChanged: (view: string) => string; additionSent: string;
  before: string; now: string; markSeen: string; incorporate: string; dismiss: string; pending: string; incorporated: string; dismissed: string;
  reviewedBy: (name: string) => string; photos: (n: number) => string; empty: string; error: string;
  fields: Record<string, string>;
};
const FIELDS = {
  es: { name: "Nombre", phone: "Teléfono", documentId: "RUT", email: "Correo", age: "Edad", city: "Ciudad", hairLossTime: "Tiempo de caída", pattern: "Zona", previousTreatment: "Tratamientos previos", symptoms: "Síntomas", surgeryHistory: "Cirugías previas", notes: "Notas", deliveryChannel: "Canal de resultados", clinicalData: "Respuestas clínicas" },
  en: { name: "Name", phone: "Phone", documentId: "ID number", email: "Email", age: "Age", city: "City", hairLossTime: "Hair loss duration", pattern: "Area", previousTreatment: "Previous treatments", symptoms: "Symptoms", surgeryHistory: "Previous surgeries", notes: "Notes", deliveryChannel: "Results channel", clinicalData: "Clinical answers" },
  pt: { name: "Nome", phone: "Telefone", documentId: "Documento", email: "E-mail", age: "Idade", city: "Cidade", hairLossTime: "Tempo de queda", pattern: "Área", previousTreatment: "Tratamentos anteriores", symptoms: "Sintomas", surgeryHistory: "Cirurgias anteriores", notes: "Notas", deliveryChannel: "Canal dos resultados", clinicalData: "Respostas clínicas" },
  fr: { name: "Nom", phone: "Téléphone", documentId: "Document d'identité", email: "E-mail", age: "Âge", city: "Ville", hairLossTime: "Durée de la chute", pattern: "Zone", previousTreatment: "Traitements antérieurs", symptoms: "Symptômes", surgeryHistory: "Chirurgies antérieures", notes: "Notes", deliveryChannel: "Canal des résultats", clinicalData: "Réponses cliniques" },
  de: { name: "Name", phone: "Telefon", documentId: "Ausweisnummer", email: "E-Mail", age: "Alter", city: "Stadt", hairLossTime: "Dauer des Haarausfalls", pattern: "Bereich", previousTreatment: "Frühere Behandlungen", symptoms: "Symptome", surgeryHistory: "Frühere Operationen", notes: "Notizen", deliveryChannel: "Ergebniskanal", clinicalData: "Klinische Angaben" },
  it: { name: "Nome", phone: "Telefono", documentId: "Documento", email: "Email", age: "Età", city: "Città", hairLossTime: "Durata della caduta", pattern: "Zona", previousTreatment: "Trattamenti precedenti", symptoms: "Sintomi", surgeryHistory: "Interventi precedenti", notes: "Note", deliveryChannel: "Canale dei risultati", clinicalData: "Risposte cliniche" },
  tr: { name: "Ad", phone: "Telefon", documentId: "Kimlik no", email: "E-posta", age: "Yaş", city: "Şehir", hairLossTime: "Saç dökülme süresi", pattern: "Bölge", previousTreatment: "Önceki tedaviler", symptoms: "Belirtiler", surgeryHistory: "Önceki ameliyatlar", notes: "Notlar", deliveryChannel: "Sonuç kanalı", clinicalData: "Klinik yanıtlar" },
  ar: { name: "الاسم", phone: "الهاتف", documentId: "رقم الهوية", email: "البريد", age: "العمر", city: "المدينة", hairLossTime: "مدة التساقط", pattern: "المنطقة", previousTreatment: "علاجات سابقة", symptoms: "الأعراض", surgeryHistory: "عمليات سابقة", notes: "ملاحظات", deliveryChannel: "قناة النتائج", clinicalData: "الإجابات السريرية" },
  zh: { name: "姓名", phone: "电话", documentId: "证件号", email: "邮箱", age: "年龄", city: "城市", hairLossTime: "脱发时长", pattern: "部位", previousTreatment: "既往治疗", symptoms: "症状", surgeryHistory: "既往手术", notes: "备注", deliveryChannel: "结果渠道", clinicalData: "临床回答" },
} as const;

export const PATIENT_UPDATES_TEXT: Record<LangCode, PatientUpdatesText> = {
  es: { title: "Novedades del paciente", subtitle: "Cambios y envíos posteriores a la evaluación. Nada se sobrescribe sin rastro.", badge: "Novedades", dataChanged: "Cambió sus datos", photoChanged: (v) => `Reemplazó la foto: ${v}`, additionSent: "Envió información adicional", before: "antes", now: "ahora", markSeen: "Marcar como vistas", incorporate: "Incorporar a la ficha", dismiss: "Descartar", pending: "Pendiente", incorporated: "Incorporado", dismissed: "Descartado", reviewedBy: (n) => `por ${n}`, photos: (n) => `${n} foto(s)`, empty: "Sin novedades.", error: "No pudimos cargar las novedades.", fields: FIELDS.es },
  en: { title: "Patient updates", subtitle: "Changes and submissions after the evaluation. Nothing is overwritten without a trace.", badge: "Updates", dataChanged: "Changed their data", photoChanged: (v) => `Replaced the photo: ${v}`, additionSent: "Sent additional information", before: "before", now: "now", markSeen: "Mark as seen", incorporate: "Include in record", dismiss: "Dismiss", pending: "Pending", incorporated: "Included", dismissed: "Dismissed", reviewedBy: (n) => `by ${n}`, photos: (n) => `${n} photo(s)`, empty: "No updates.", error: "We could not load the updates.", fields: FIELDS.en },
  pt: { title: "Novidades do paciente", subtitle: "Alterações e envios posteriores à avaliação. Nada é sobrescrito sem registro.", badge: "Novidades", dataChanged: "Alterou seus dados", photoChanged: (v) => `Substituiu a foto: ${v}`, additionSent: "Enviou informações adicionais", before: "antes", now: "agora", markSeen: "Marcar como vistas", incorporate: "Incorporar à ficha", dismiss: "Descartar", pending: "Pendente", incorporated: "Incorporado", dismissed: "Descartado", reviewedBy: (n) => `por ${n}`, photos: (n) => `${n} foto(s)`, empty: "Sem novidades.", error: "Não foi possível carregar as novidades.", fields: FIELDS.pt },
  fr: { title: "Nouveautés du patient", subtitle: "Modifications et envois après l'évaluation. Rien n'est écrasé sans trace.", badge: "Nouveautés", dataChanged: "A modifié ses données", photoChanged: (v) => `A remplacé la photo : ${v}`, additionSent: "A envoyé des informations complémentaires", before: "avant", now: "maintenant", markSeen: "Marquer comme vues", incorporate: "Intégrer au dossier", dismiss: "Écarter", pending: "En attente", incorporated: "Intégré", dismissed: "Écarté", reviewedBy: (n) => `par ${n}`, photos: (n) => `${n} photo(s)`, empty: "Aucune nouveauté.", error: "Impossible de charger les nouveautés.", fields: FIELDS.fr },
  de: { title: "Neuigkeiten des Patienten", subtitle: "Änderungen und Sendungen nach der Auswertung. Nichts wird spurlos überschrieben.", badge: "Neu", dataChanged: "Hat seine Daten geändert", photoChanged: (v) => `Hat das Foto ersetzt: ${v}`, additionSent: "Hat zusätzliche Informationen gesendet", before: "vorher", now: "jetzt", markSeen: "Als gesehen markieren", incorporate: "In die Akte übernehmen", dismiss: "Verwerfen", pending: "Offen", incorporated: "Übernommen", dismissed: "Verworfen", reviewedBy: (n) => `von ${n}`, photos: (n) => `${n} Foto(s)`, empty: "Keine Neuigkeiten.", error: "Neuigkeiten konnten nicht geladen werden.", fields: FIELDS.de },
  it: { title: "Novità del paziente", subtitle: "Modifiche e invii successivi alla valutazione. Nulla viene sovrascritto senza traccia.", badge: "Novità", dataChanged: "Ha modificato i suoi dati", photoChanged: (v) => `Ha sostituito la foto: ${v}`, additionSent: "Ha inviato informazioni aggiuntive", before: "prima", now: "ora", markSeen: "Segna come viste", incorporate: "Incorpora nella scheda", dismiss: "Scarta", pending: "In attesa", incorporated: "Incorporato", dismissed: "Scartato", reviewedBy: (n) => `da ${n}`, photos: (n) => `${n} foto`, empty: "Nessuna novità.", error: "Impossibile caricare le novità.", fields: FIELDS.it },
  tr: { title: "Hasta güncellemeleri", subtitle: "Değerlendirmeden sonraki değişiklikler ve gönderimler. Hiçbir şey iz bırakmadan üzerine yazılmaz.", badge: "Yenilik", dataChanged: "Verilerini değiştirdi", photoChanged: (v) => `Fotoğrafı değiştirdi: ${v}`, additionSent: "Ek bilgi gönderdi", before: "önce", now: "şimdi", markSeen: "Görüldü olarak işaretle", incorporate: "Dosyaya ekle", dismiss: "Yok say", pending: "Bekliyor", incorporated: "Eklendi", dismissed: "Yok sayıldı", reviewedBy: (n) => `${n} tarafından`, photos: (n) => `${n} fotoğraf`, empty: "Yenilik yok.", error: "Güncellemeler yüklenemedi.", fields: FIELDS.tr },
  ar: { title: "مستجدات المريض", subtitle: "تغييرات وإرسالات بعد التقييم. لا يُستبدل شيء دون أثر.", badge: "مستجدات", dataChanged: "غيّر بياناته", photoChanged: (v) => `استبدل الصورة: ${v}`, additionSent: "أرسل معلومات إضافية", before: "قبل", now: "الآن", markSeen: "تحديد كمقروء", incorporate: "إضافة إلى الملف", dismiss: "تجاهل", pending: "قيد الانتظار", incorporated: "تمت الإضافة", dismissed: "تم التجاهل", reviewedBy: (n) => `بواسطة ${n}`, photos: (n) => `${n} صورة`, empty: "لا مستجدات.", error: "تعذّر تحميل المستجدات.", fields: FIELDS.ar },
  zh: { title: "患者更新", subtitle: "评估之后的修改和提交。任何内容都不会无痕覆盖。", badge: "更新", dataChanged: "修改了数据", photoChanged: (v) => `替换了照片：${v}`, additionSent: "发送了补充信息", before: "之前", now: "现在", markSeen: "标记为已读", incorporate: "纳入档案", dismiss: "忽略", pending: "待处理", incorporated: "已纳入", dismissed: "已忽略", reviewedBy: (n) => `由 ${n}`, photos: (n) => `${n} 张照片`, empty: "暂无更新。", error: "无法加载更新。", fields: FIELDS.zh },
};
