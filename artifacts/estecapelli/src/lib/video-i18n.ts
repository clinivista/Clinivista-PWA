// Textos del video por vista (plan Titanium) y de los planes de las clínicas, en los nueve idiomas.
import type { LangCode } from "./language";

export type ClinicPlan = "basic" | "unlimited" | "titanium";

export type VideoText = {
  // Planes (supra-control)
  planLabel: string;
  planNames: Record<ClinicPlan, string>;
  planHint: string;
  planSaved: (plan: string) => string;
  planFailed: string;
  // Configuración de fases
  checkbox: string;
  checkboxTitle: string;
  checkboxAria: (label: string) => string;
  onlyTitanium: string;
  phasesHint: string;
  lostPlanWarning: string;
  // Grabador
  record: string;
  recordAgain: string;
  recorderTitle: (label: string) => string;
  start: string;
  stop: string;
  retake: string;
  use: string;
  switchCamera: string;
  close: string;
  startsIn: (seconds: number) => string;
  recording: (seconds: number, max: number) => string;
  autoStop: (max: number) => string;
  preparing: string;
  cameraError: string;
  unsupported: string;
  uploadFile: string;
  fileTooBig: string;
  fileWrongType: string;
  tooLong: string;
  saving: string;
  saveFailed: string;
  // Reproducción
  video: string;
  loading: string;
  playError: string;
  noVideo: string;
  seconds: (seconds: number) => string;
  // Paciente
  patientIntro: (max: number) => string;
  patientSaved: string;
};

export const VIDEO_TEXT: Record<LangCode, VideoText> = {
  es: {
    planLabel: "Plan", planNames: { basic: "Básico", unlimited: "Ilimitado", titanium: "Titanium" },
    planHint: "Titanium agrega el video por fotografía. Ningún plan quita funciones que la clínica ya usa.",
    planSaved: (p) => `Plan actualizado a ${p}.`, planFailed: "No pudimos cambiar el plan. Inténtalo de nuevo.",
    checkbox: "Video", checkboxTitle: "En lugar de una foto, se graba un video corto (hasta 20 segundos) de esta vista.",
    checkboxAria: (l) => `Grabar video: ${l}`, onlyTitanium: "Disponible en el plan Titanium",
    phasesHint: "Marca «Video» (plan Titanium) para grabar un video corto de hasta 20 segundos en lugar de una foto; no se combina con «Documento» ni «Medir».",
    lostPlanWarning: "El plan de tu clínica ya no incluye video: los videos guardados se siguen viendo, pero las vistas de video no se pueden grabar. Quítalas o agrega vistas de foto en su lugar.",
    record: "Grabar video", recordAgain: "Repetir video", recorderTitle: (l) => `Video: ${l}`,
    start: "Empezar a grabar", stop: "Detener", retake: "Volver a grabar", use: "Usar este video", switchCamera: "Cambiar de cámara", close: "Cerrar",
    startsIn: (s) => `Empieza en ${s}…`, recording: (s, m) => `Grabando ${s} / ${m} s`, autoStop: (m) => `Se detiene solo a los ${m} segundos.`,
    preparing: "Abriendo la cámara…", cameraError: "No pudimos usar la cámara. Revisa el permiso del navegador o sube un archivo de video.",
    unsupported: "Este navegador no puede grabar video. Puedes subir un archivo MP4, WebM o MOV de hasta 25 MB.",
    uploadFile: "Subir un archivo de video", fileTooBig: "El video debe pesar hasta 25 MB.", fileWrongType: "El video debe ser MP4, WebM o MOV.",
    tooLong: "El video quedó demasiado pesado. Graba uno más corto.", saving: "Guardando video…", saveFailed: "No pudimos guardar el video.",
    video: "Video", loading: "Cargando video…", playError: "No pudimos reproducir el video.", noVideo: "Aún no hay video.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Graba un video corto (hasta ${m} segundos). Puedes verlo antes de usarlo.`, patientSaved: "Video guardado",
  },
  en: {
    planLabel: "Plan", planNames: { basic: "Basic", unlimited: "Unlimited", titanium: "Titanium" },
    planHint: "Titanium adds video per photo. No plan removes functions the clinic already uses.",
    planSaved: (p) => `Plan changed to ${p}.`, planFailed: "We could not change the plan. Please try again.",
    checkbox: "Video", checkboxTitle: "Instead of a photo, a short video (up to 20 seconds) of this view is recorded.",
    checkboxAria: (l) => `Record video: ${l}`, onlyTitanium: "Available on the Titanium plan",
    phasesHint: "Tick “Video” (Titanium plan) to record a short video of up to 20 seconds instead of a photo; it cannot be combined with “Document” or “Measure”.",
    lostPlanWarning: "Your clinic's plan no longer includes video: saved videos can still be watched, but video views cannot be recorded. Remove them or add photo views instead.",
    record: "Record video", recordAgain: "Record again", recorderTitle: (l) => `Video: ${l}`,
    start: "Start recording", stop: "Stop", retake: "Record again", use: "Use this video", switchCamera: "Switch camera", close: "Close",
    startsIn: (s) => `Starting in ${s}…`, recording: (s, m) => `Recording ${s} / ${m} s`, autoStop: (m) => `It stops by itself at ${m} seconds.`,
    preparing: "Opening the camera…", cameraError: "We could not use the camera. Check the browser permission or upload a video file.",
    unsupported: "This browser cannot record video. You can upload an MP4, WebM or MOV file of up to 25 MB.",
    uploadFile: "Upload a video file", fileTooBig: "The video must be 25 MB or less.", fileWrongType: "The video must be MP4, WebM or MOV.",
    tooLong: "The video is too large. Record a shorter one.", saving: "Saving video…", saveFailed: "We could not save the video.",
    video: "Video", loading: "Loading video…", playError: "We could not play the video.", noVideo: "No video yet.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Record a short video (up to ${m} seconds). You can watch it before using it.`, patientSaved: "Video saved",
  },
  pt: {
    planLabel: "Plano", planNames: { basic: "Básico", unlimited: "Ilimitado", titanium: "Titanium" },
    planHint: "O Titanium adiciona vídeo por fotografia. Nenhum plano remove funções que a clínica já usa.",
    planSaved: (p) => `Plano alterado para ${p}.`, planFailed: "Não foi possível alterar o plano. Tente novamente.",
    checkbox: "Vídeo", checkboxTitle: "Em vez de uma foto, grava-se um vídeo curto (até 20 segundos) desta vista.",
    checkboxAria: (l) => `Gravar vídeo: ${l}`, onlyTitanium: "Disponível no plano Titanium",
    phasesHint: "Marque «Vídeo» (plano Titanium) para gravar um vídeo curto de até 20 segundos em vez de uma foto; não se combina com «Documento» nem «Medir».",
    lostPlanWarning: "O plano da sua clínica não inclui mais vídeo: os vídeos salvos continuam visíveis, mas as vistas de vídeo não podem ser gravadas. Remova-as ou adicione vistas de foto no lugar.",
    record: "Gravar vídeo", recordAgain: "Repetir vídeo", recorderTitle: (l) => `Vídeo: ${l}`,
    start: "Começar a gravar", stop: "Parar", retake: "Gravar de novo", use: "Usar este vídeo", switchCamera: "Trocar de câmera", close: "Fechar",
    startsIn: (s) => `Começa em ${s}…`, recording: (s, m) => `Gravando ${s} / ${m} s`, autoStop: (m) => `Para sozinho aos ${m} segundos.`,
    preparing: "Abrindo a câmera…", cameraError: "Não foi possível usar a câmera. Verifique a permissão do navegador ou envie um arquivo de vídeo.",
    unsupported: "Este navegador não consegue gravar vídeo. Você pode enviar um arquivo MP4, WebM ou MOV de até 25 MB.",
    uploadFile: "Enviar um arquivo de vídeo", fileTooBig: "O vídeo deve ter até 25 MB.", fileWrongType: "O vídeo deve ser MP4, WebM ou MOV.",
    tooLong: "O vídeo ficou pesado demais. Grave um mais curto.", saving: "Salvando vídeo…", saveFailed: "Não foi possível salvar o vídeo.",
    video: "Vídeo", loading: "Carregando vídeo…", playError: "Não foi possível reproduzir o vídeo.", noVideo: "Ainda não há vídeo.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Grave um vídeo curto (até ${m} segundos). Você pode vê-lo antes de usar.`, patientSaved: "Vídeo salvo",
  },
  fr: {
    planLabel: "Forfait", planNames: { basic: "Basique", unlimited: "Illimité", titanium: "Titanium" },
    planHint: "Titanium ajoute la vidéo par photo. Aucun forfait ne retire de fonctions déjà utilisées par la clinique.",
    planSaved: (p) => `Forfait changé en ${p}.`, planFailed: "Impossible de changer le forfait. Réessayez.",
    checkbox: "Vidéo", checkboxTitle: "Au lieu d'une photo, une courte vidéo (jusqu'à 20 secondes) de cette vue est enregistrée.",
    checkboxAria: (l) => `Enregistrer une vidéo : ${l}`, onlyTitanium: "Disponible avec le forfait Titanium",
    phasesHint: "Cochez « Vidéo » (forfait Titanium) pour enregistrer une courte vidéo de 20 secondes maximum au lieu d'une photo ; elle ne se combine pas avec « Document » ni « Mesurer ».",
    lostPlanWarning: "Le forfait de votre clinique n'inclut plus la vidéo : les vidéos enregistrées restent visibles, mais les vues vidéo ne peuvent plus être enregistrées. Supprimez-les ou ajoutez des vues photo à la place.",
    record: "Enregistrer une vidéo", recordAgain: "Refaire la vidéo", recorderTitle: (l) => `Vidéo : ${l}`,
    start: "Commencer l'enregistrement", stop: "Arrêter", retake: "Recommencer", use: "Utiliser cette vidéo", switchCamera: "Changer de caméra", close: "Fermer",
    startsIn: (s) => `Début dans ${s}…`, recording: (s, m) => `Enregistrement ${s} / ${m} s`, autoStop: (m) => `S'arrête automatiquement à ${m} secondes.`,
    preparing: "Ouverture de la caméra…", cameraError: "Impossible d'utiliser la caméra. Vérifiez l'autorisation du navigateur ou envoyez un fichier vidéo.",
    unsupported: "Ce navigateur ne peut pas enregistrer de vidéo. Vous pouvez envoyer un fichier MP4, WebM ou MOV de 25 Mo maximum.",
    uploadFile: "Envoyer un fichier vidéo", fileTooBig: "La vidéo doit faire 25 Mo maximum.", fileWrongType: "La vidéo doit être au format MP4, WebM ou MOV.",
    tooLong: "La vidéo est trop lourde. Enregistrez-en une plus courte.", saving: "Enregistrement de la vidéo…", saveFailed: "Impossible d'enregistrer la vidéo.",
    video: "Vidéo", loading: "Chargement de la vidéo…", playError: "Impossible de lire la vidéo.", noVideo: "Pas encore de vidéo.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Enregistrez une courte vidéo (jusqu'à ${m} secondes). Vous pourrez la revoir avant de l'utiliser.`, patientSaved: "Vidéo enregistrée",
  },
  de: {
    planLabel: "Tarif", planNames: { basic: "Basis", unlimited: "Unbegrenzt", titanium: "Titanium" },
    planHint: "Titanium ergänzt Video pro Foto. Kein Tarif entfernt Funktionen, die die Klinik bereits nutzt.",
    planSaved: (p) => `Tarif auf ${p} geändert.`, planFailed: "Der Tarif konnte nicht geändert werden. Bitte erneut versuchen.",
    checkbox: "Video", checkboxTitle: "Statt eines Fotos wird ein kurzes Video (bis zu 20 Sekunden) dieser Ansicht aufgenommen.",
    checkboxAria: (l) => `Video aufnehmen: ${l}`, onlyTitanium: "Im Titanium-Tarif verfügbar",
    phasesHint: "Markieren Sie „Video“ (Titanium-Tarif), um statt eines Fotos ein kurzes Video von bis zu 20 Sekunden aufzunehmen; nicht kombinierbar mit „Dokument“ oder „Messen“.",
    lostPlanWarning: "Der Tarif Ihrer Klinik enthält kein Video mehr: Gespeicherte Videos bleiben sichtbar, aber Video-Ansichten können nicht aufgenommen werden. Entfernen Sie sie oder fügen Sie stattdessen Foto-Ansichten hinzu.",
    record: "Video aufnehmen", recordAgain: "Video wiederholen", recorderTitle: (l) => `Video: ${l}`,
    start: "Aufnahme starten", stop: "Stopp", retake: "Neu aufnehmen", use: "Dieses Video verwenden", switchCamera: "Kamera wechseln", close: "Schließen",
    startsIn: (s) => `Beginnt in ${s}…`, recording: (s, m) => `Aufnahme ${s} / ${m} s`, autoStop: (m) => `Stoppt automatisch nach ${m} Sekunden.`,
    preparing: "Kamera wird geöffnet…", cameraError: "Die Kamera konnte nicht verwendet werden. Prüfen Sie die Browser-Berechtigung oder laden Sie eine Videodatei hoch.",
    unsupported: "Dieser Browser kann kein Video aufnehmen. Sie können eine MP4-, WebM- oder MOV-Datei bis 25 MB hochladen.",
    uploadFile: "Videodatei hochladen", fileTooBig: "Das Video darf höchstens 25 MB groß sein.", fileWrongType: "Das Video muss MP4, WebM oder MOV sein.",
    tooLong: "Das Video ist zu groß. Nehmen Sie ein kürzeres auf.", saving: "Video wird gespeichert…", saveFailed: "Das Video konnte nicht gespeichert werden.",
    video: "Video", loading: "Video wird geladen…", playError: "Das Video konnte nicht abgespielt werden.", noVideo: "Noch kein Video.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Nehmen Sie ein kurzes Video auf (bis zu ${m} Sekunden). Sie können es vor dem Verwenden ansehen.`, patientSaved: "Video gespeichert",
  },
  it: {
    planLabel: "Piano", planNames: { basic: "Base", unlimited: "Illimitato", titanium: "Titanium" },
    planHint: "Titanium aggiunge il video per foto. Nessun piano toglie funzioni che la clinica già usa.",
    planSaved: (p) => `Piano cambiato in ${p}.`, planFailed: "Non è stato possibile cambiare il piano. Riprova.",
    checkbox: "Video", checkboxTitle: "Invece di una foto, si registra un breve video (fino a 20 secondi) di questa vista.",
    checkboxAria: (l) => `Registra video: ${l}`, onlyTitanium: "Disponibile nel piano Titanium",
    phasesHint: "Spunta «Video» (piano Titanium) per registrare un breve video fino a 20 secondi invece di una foto; non si combina con «Documento» né «Misura».",
    lostPlanWarning: "Il piano della tua clinica non include più il video: i video salvati restano visibili, ma le viste video non si possono registrare. Rimuovile o aggiungi viste foto al loro posto.",
    record: "Registra video", recordAgain: "Ripeti video", recorderTitle: (l) => `Video: ${l}`,
    start: "Inizia a registrare", stop: "Ferma", retake: "Registra di nuovo", use: "Usa questo video", switchCamera: "Cambia fotocamera", close: "Chiudi",
    startsIn: (s) => `Inizia tra ${s}…`, recording: (s, m) => `Registrazione ${s} / ${m} s`, autoStop: (m) => `Si ferma da solo a ${m} secondi.`,
    preparing: "Apertura della fotocamera…", cameraError: "Non è stato possibile usare la fotocamera. Controlla il permesso del browser o carica un file video.",
    unsupported: "Questo browser non può registrare video. Puoi caricare un file MP4, WebM o MOV fino a 25 MB.",
    uploadFile: "Carica un file video", fileTooBig: "Il video deve pesare al massimo 25 MB.", fileWrongType: "Il video deve essere MP4, WebM o MOV.",
    tooLong: "Il video è troppo pesante. Registrane uno più corto.", saving: "Salvataggio del video…", saveFailed: "Non è stato possibile salvare il video.",
    video: "Video", loading: "Caricamento del video…", playError: "Non è stato possibile riprodurre il video.", noVideo: "Ancora nessun video.", seconds: (s) => `${s} s`,
    patientIntro: (m) => `Registra un breve video (fino a ${m} secondi). Puoi rivederlo prima di usarlo.`, patientSaved: "Video salvato",
  },
  tr: {
    planLabel: "Paket", planNames: { basic: "Temel", unlimited: "Sınırsız", titanium: "Titanium" },
    planHint: "Titanium, fotoğraf başına video ekler. Hiçbir paket kliniğin zaten kullandığı işlevleri kaldırmaz.",
    planSaved: (p) => `Paket ${p} olarak değiştirildi.`, planFailed: "Paket değiştirilemedi. Lütfen tekrar deneyin.",
    checkbox: "Video", checkboxTitle: "Fotoğraf yerine bu görünümün kısa bir videosu (en fazla 20 saniye) kaydedilir.",
    checkboxAria: (l) => `Video kaydet: ${l}`, onlyTitanium: "Titanium paketinde mevcut",
    phasesHint: "Fotoğraf yerine en fazla 20 saniyelik kısa bir video kaydetmek için «Video»yu (Titanium paketi) işaretleyin; «Belge» veya «Ölç» ile birlikte kullanılamaz.",
    lostPlanWarning: "Kliniğinizin paketi artık video içermiyor: kayıtlı videolar izlenmeye devam eder, ancak video görünümleri kaydedilemez. Bunları kaldırın veya yerine fotoğraf görünümleri ekleyin.",
    record: "Video kaydet", recordAgain: "Videoyu tekrarla", recorderTitle: (l) => `Video: ${l}`,
    start: "Kaydı başlat", stop: "Durdur", retake: "Yeniden kaydet", use: "Bu videoyu kullan", switchCamera: "Kamerayı değiştir", close: "Kapat",
    startsIn: (s) => `${s} saniye sonra başlıyor…`, recording: (s, m) => `Kaydediliyor ${s} / ${m} sn`, autoStop: (m) => `${m} saniyede kendiliğinden durur.`,
    preparing: "Kamera açılıyor…", cameraError: "Kamera kullanılamadı. Tarayıcı iznini kontrol edin veya bir video dosyası yükleyin.",
    unsupported: "Bu tarayıcı video kaydedemiyor. En fazla 25 MB'lık bir MP4, WebM veya MOV dosyası yükleyebilirsiniz.",
    uploadFile: "Video dosyası yükle", fileTooBig: "Video en fazla 25 MB olmalıdır.", fileWrongType: "Video MP4, WebM veya MOV olmalıdır.",
    tooLong: "Video çok büyük oldu. Daha kısa bir tane kaydedin.", saving: "Video kaydediliyor…", saveFailed: "Video kaydedilemedi.",
    video: "Video", loading: "Video yükleniyor…", playError: "Video oynatılamadı.", noVideo: "Henüz video yok.", seconds: (s) => `${s} sn`,
    patientIntro: (m) => `Kısa bir video kaydedin (en fazla ${m} saniye). Kullanmadan önce izleyebilirsiniz.`, patientSaved: "Video kaydedildi",
  },
  ar: {
    planLabel: "الباقة", planNames: { basic: "الأساسية", unlimited: "غير المحدودة", titanium: "تيتانيوم" },
    planHint: "تضيف باقة تيتانيوم الفيديو لكل صورة. لا تُزيل أي باقة وظائف تستخدمها العيادة بالفعل.",
    planSaved: (p) => `تم تغيير الباقة إلى ${p}.`, planFailed: "تعذّر تغيير الباقة. حاول مرة أخرى.",
    checkbox: "فيديو", checkboxTitle: "بدلًا من صورة، يُسجَّل فيديو قصير (حتى 20 ثانية) لهذه اللقطة.",
    checkboxAria: (l) => `تسجيل فيديو: ${l}`, onlyTitanium: "متاح في باقة تيتانيوم",
    phasesHint: "حدّد «فيديو» (باقة تيتانيوم) لتسجيل فيديو قصير حتى 20 ثانية بدلًا من صورة؛ لا يُجمع مع «مستند» أو «قياس».",
    lostPlanWarning: "لم تعد باقة عيادتك تتضمن الفيديو: تبقى مقاطع الفيديو المحفوظة قابلة للمشاهدة، لكن لا يمكن تسجيل لقطات الفيديو. أزلها أو أضف لقطات صور بدلًا منها.",
    record: "تسجيل فيديو", recordAgain: "إعادة الفيديو", recorderTitle: (l) => `فيديو: ${l}`,
    start: "بدء التسجيل", stop: "إيقاف", retake: "إعادة التسجيل", use: "استخدام هذا الفيديو", switchCamera: "تبديل الكاميرا", close: "إغلاق",
    startsIn: (s) => `يبدأ خلال ${s}…`, recording: (s, m) => `جارٍ التسجيل ${s} / ${m} ث`, autoStop: (m) => `يتوقف تلقائيًا عند ${m} ثانية.`,
    preparing: "جارٍ فتح الكاميرا…", cameraError: "تعذّر استخدام الكاميرا. تحقّق من إذن المتصفح أو ارفع ملف فيديو.",
    unsupported: "لا يستطيع هذا المتصفح تسجيل الفيديو. يمكنك رفع ملف MP4 أو WebM أو MOV حتى 25 ميغابايت.",
    uploadFile: "رفع ملف فيديو", fileTooBig: "يجب ألا يتجاوز حجم الفيديو 25 ميغابايت.", fileWrongType: "يجب أن يكون الفيديو بصيغة MP4 أو WebM أو MOV.",
    tooLong: "الفيديو كبير جدًا. سجّل فيديو أقصر.", saving: "جارٍ حفظ الفيديو…", saveFailed: "تعذّر حفظ الفيديو.",
    video: "فيديو", loading: "جارٍ تحميل الفيديو…", playError: "تعذّر تشغيل الفيديو.", noVideo: "لا يوجد فيديو بعد.", seconds: (s) => `${s} ث`,
    patientIntro: (m) => `سجّل فيديو قصيرًا (حتى ${m} ثانية). يمكنك مشاهدته قبل استخدامه.`, patientSaved: "تم حفظ الفيديو",
  },
  zh: {
    planLabel: "套餐", planNames: { basic: "基础版", unlimited: "无限版", titanium: "钛金版" },
    planHint: "钛金版增加了按照片录制视频的功能。任何套餐都不会移除诊所已在使用的功能。",
    planSaved: (p) => `套餐已更改为${p}。`, planFailed: "无法更改套餐，请重试。",
    checkbox: "视频", checkboxTitle: "此视角将录制一段短视频（最长 20 秒）而不是拍照。",
    checkboxAria: (l) => `录制视频：${l}`, onlyTitanium: "钛金版套餐可用",
    phasesHint: "勾选“视频”（钛金版套餐）可录制最长 20 秒的短视频代替照片；不能与“文件”或“测量”同时使用。",
    lostPlanWarning: "您诊所的套餐已不再包含视频：已保存的视频仍可观看，但无法录制视频视角。请删除这些视角或改为添加照片视角。",
    record: "录制视频", recordAgain: "重新录制", recorderTitle: (l) => `视频：${l}`,
    start: "开始录制", stop: "停止", retake: "重新录制", use: "使用此视频", switchCamera: "切换摄像头", close: "关闭",
    startsIn: (s) => `${s} 秒后开始…`, recording: (s, m) => `正在录制 ${s} / ${m} 秒`, autoStop: (m) => `录到 ${m} 秒时自动停止。`,
    preparing: "正在打开摄像头…", cameraError: "无法使用摄像头。请检查浏览器权限或上传视频文件。",
    unsupported: "此浏览器无法录制视频。您可以上传不超过 25 MB 的 MP4、WebM 或 MOV 文件。",
    uploadFile: "上传视频文件", fileTooBig: "视频不能超过 25 MB。", fileWrongType: "视频必须是 MP4、WebM 或 MOV 格式。",
    tooLong: "视频太大，请录制更短的视频。", saving: "正在保存视频…", saveFailed: "无法保存视频。",
    video: "视频", loading: "正在加载视频…", playError: "无法播放视频。", noVideo: "还没有视频。", seconds: (s) => `${s} 秒`,
    patientIntro: (m) => `录制一段短视频（最长 ${m} 秒）。使用前可以先观看。`, patientSaved: "视频已保存",
  },
};
