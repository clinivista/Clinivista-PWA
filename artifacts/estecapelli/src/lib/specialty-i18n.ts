// Textos del formulario del paciente para la especialidad "Cirugía plástica", en los nueve idiomas.
// Las respuestas de selección se guardan como claves estables (ver specialties/plastica.ts en la API);
// aquí solo está el texto que ve el paciente, en el mismo orden de esas claves.
import type { LangCode } from "./language";

export const PLASTIC_PROCEDURE_KEYS = ["rhinoplasty", "breastAugmentation", "breastReduction", "breastLift", "abdominoplasty", "liposuction", "blepharoplasty", "facelift", "otoplasty", "other", "notSure"] as const;
export const PLASTIC_TIMEFRAME_KEYS = ["lt3", "m3to6", "m6to12", "informing"] as const;
export const PLASTIC_SMOKING_KEYS = ["no", "former", "yes"] as const;
export const PLASTIC_VIEW_KEYS = ["plasticFront", "plasticProfileRight", "plasticProfileLeft", "plasticObliqueRight", "plasticObliqueLeft"] as const;

export type PlasticText = {
  section: string;
  stepDetail: string;
  introDesc: string;
  consent: string;
  procedure: [string, string[]];
  concern: [string, string];
  timeframe: [string, string[]];
  previousSurgeries: [string, string];
  conditions: [string, string];
  medicationsAllergies: [string, string];
  smoking: [string, string[]];
  photos: Array<[string, string, string]>;
};

export const PLASTIC_TEXT: Record<LangCode, PlasticText> = {
  es: {
    section: "Tu interés en cirugía plástica",
    stepDetail: "Antecedentes básicos",
    introDesc: "Este proceso nos permitirá conocer tu caso a detalle antes de la consulta presencial. Te pediremos tus datos y 5 fotografías precisas de la zona que te interesa.",
    consent: "He leído y acepto el tratamiento de mis datos personales y de mis fotografías con el fin exclusivo de realizar una pre-evaluación de cirugía plástica y de que el centro me contacte con los resultados. Entiendo que esta evaluación preliminar no constituye un diagnóstico médico y que puedo revocar este consentimiento en cualquier momento.",
    procedure: ["¿Qué procedimiento te interesa?", ["Rinoplastia", "Aumento mamario", "Reducción mamaria", "Mastopexia (elevación mamaria)", "Abdominoplastia", "Liposucción", "Blefaroplastia", "Lifting facial", "Otoplastia", "Otro", "No estoy seguro/a"]],
    concern: ["¿Qué te gustaría mejorar?", "Cuéntanos con tus palabras"],
    timeframe: ["¿Cuándo te gustaría operarte?", ["En menos de 3 meses", "Entre 3 y 6 meses", "Entre 6 y 12 meses", "Solo me estoy informando"]],
    previousSurgeries: ["Cirugías previas", "Indica cuáles y hace cuánto, si las hubo"],
    conditions: ["Enfermedades o condiciones médicas", "Por ejemplo: diabetes, hipertensión…"],
    medicationsAllergies: ["Medicamentos y alergias", "Los que usas a diario y a qué eres alérgico/a"],
    smoking: ["¿Fumas?", ["No fumo", "Soy exfumador/a", "Fumo"]],
    photos: [
      ["Vista frontal", "De frente, de pie y relajado/a, con la zona de interés completa a la vista.", "Mira a la cámara con buena luz y fondo liso. Con ropa que deje ver la zona."],
      ["Perfil derecho", "Gira 90° para mostrar tu lado derecho, de pie y relajado/a.", "Mantén la espalda recta y los brazos sueltos, sin tapar la zona."],
      ["Perfil izquierdo", "Gira 90° para mostrar tu lado izquierdo, de pie y relajado/a.", "Mantén la espalda recta y los brazos sueltos, sin tapar la zona."],
      ["Oblicua derecha", "Gira unos 45° hacia la derecha, de pie y relajado/a.", "Mantén el teléfono a la altura de la zona y con buena luz."],
      ["Oblicua izquierda", "Gira unos 45° hacia la izquierda, de pie y relajado/a.", "Mantén el teléfono a la altura de la zona y con buena luz."],
    ],
  },
  en: {
    section: "Your interest in plastic surgery",
    stepDetail: "Basic background",
    introDesc: "This process lets us get to know your case in detail before the in-person consultation. We will ask for your details and 5 precise photographs of the area you are interested in.",
    consent: "I have read and accept the processing of my personal data and photographs for the sole purpose of a plastic surgery pre-evaluation and so that the center can contact me with the results. I understand this preliminary evaluation is not a medical diagnosis and that I may withdraw this consent at any time.",
    procedure: ["Which procedure are you interested in?", ["Rhinoplasty", "Breast augmentation", "Breast reduction", "Breast lift (mastopexy)", "Abdominoplasty (tummy tuck)", "Liposuction", "Blepharoplasty (eyelid surgery)", "Facelift", "Otoplasty (ear surgery)", "Other", "I'm not sure"]],
    concern: ["What would you like to improve?", "Tell us in your own words"],
    timeframe: ["When would you like to have surgery?", ["Within 3 months", "Between 3 and 6 months", "Between 6 and 12 months", "I'm just gathering information"]],
    previousSurgeries: ["Previous surgeries", "Which ones and how long ago, if any"],
    conditions: ["Medical conditions", "For example: diabetes, high blood pressure…"],
    medicationsAllergies: ["Medications and allergies", "What you take daily and what you are allergic to"],
    smoking: ["Do you smoke?", ["I don't smoke", "I'm a former smoker", "I smoke"]],
    photos: [
      ["Front view", "Facing the camera, standing and relaxed, with the whole area of interest in view.", "Look at the camera in good light against a plain background. Wear clothing that shows the area."],
      ["Right profile", "Turn 90° to show your right side, standing and relaxed.", "Keep your back straight and arms loose, not covering the area."],
      ["Left profile", "Turn 90° to show your left side, standing and relaxed.", "Keep your back straight and arms loose, not covering the area."],
      ["Right oblique", "Turn about 45° to the right, standing and relaxed.", "Hold the phone at the height of the area, in good light."],
      ["Left oblique", "Turn about 45° to the left, standing and relaxed.", "Hold the phone at the height of the area, in good light."],
    ],
  },
  pt: {
    section: "Seu interesse em cirurgia plástica",
    stepDetail: "Antecedentes básicos",
    introDesc: "Este processo nos permitirá conhecer seu caso em detalhe antes da consulta presencial. Pediremos seus dados e 5 fotografias precisas da área que lhe interessa.",
    consent: "Li e aceito o tratamento dos meus dados pessoais e das minhas fotografias com a finalidade exclusiva de realizar uma pré-avaliação de cirurgia plástica e de que o centro entre em contato comigo com os resultados. Entendo que esta avaliação preliminar não constitui um diagnóstico médico e que posso revogar este consentimento a qualquer momento.",
    procedure: ["Qual procedimento lhe interessa?", ["Rinoplastia", "Aumento mamário", "Redução mamária", "Mastopexia (elevação mamária)", "Abdominoplastia", "Lipoaspiração", "Blefaroplastia", "Lifting facial", "Otoplastia", "Outro", "Não tenho certeza"]],
    concern: ["O que você gostaria de melhorar?", "Conte com suas palavras"],
    timeframe: ["Quando gostaria de operar?", ["Em menos de 3 meses", "Entre 3 e 6 meses", "Entre 6 e 12 meses", "Estou apenas me informando"]],
    previousSurgeries: ["Cirurgias anteriores", "Quais e há quanto tempo, se houve"],
    conditions: ["Doenças ou condições médicas", "Por exemplo: diabetes, hipertensão…"],
    medicationsAllergies: ["Medicamentos e alergias", "O que usa diariamente e a que tem alergia"],
    smoking: ["Você fuma?", ["Não fumo", "Sou ex-fumante", "Fumo"]],
    photos: [
      ["Vista frontal", "De frente, em pé e relaxado(a), com toda a área de interesse à vista.", "Olhe para a câmera com boa luz e fundo liso. Use roupa que deixe a área visível."],
      ["Perfil direito", "Gire 90° para mostrar o lado direito, em pé e relaxado(a).", "Mantenha as costas retas e os braços soltos, sem cobrir a área."],
      ["Perfil esquerdo", "Gire 90° para mostrar o lado esquerdo, em pé e relaxado(a).", "Mantenha as costas retas e os braços soltos, sem cobrir a área."],
      ["Oblíqua direita", "Gire cerca de 45° para a direita, em pé e relaxado(a).", "Segure o celular na altura da área e com boa luz."],
      ["Oblíqua esquerda", "Gire cerca de 45° para a esquerda, em pé e relaxado(a).", "Segure o celular na altura da área e com boa luz."],
    ],
  },
  fr: {
    section: "Votre intérêt pour la chirurgie plastique",
    stepDetail: "Antécédents de base",
    introDesc: "Ce processus nous permettra de bien connaître votre cas avant la consultation en personne. Nous vous demanderons vos données et 5 photographies précises de la zone qui vous intéresse.",
    consent: "J'ai lu et j'accepte le traitement de mes données personnelles et de mes photographies à seule fin de réaliser une préévaluation de chirurgie plastique et que le centre me contacte avec les résultats. Je comprends que cette évaluation préliminaire ne constitue pas un diagnostic médical et que je peux retirer ce consentement à tout moment.",
    procedure: ["Quelle intervention vous intéresse ?", ["Rhinoplastie", "Augmentation mammaire", "Réduction mammaire", "Mastopexie (lifting des seins)", "Abdominoplastie", "Liposuccion", "Blépharoplastie", "Lifting du visage", "Otoplastie", "Autre", "Je ne suis pas sûr(e)"]],
    concern: ["Qu'aimeriez-vous améliorer ?", "Dites-le avec vos mots"],
    timeframe: ["Quand souhaitez-vous vous faire opérer ?", ["Dans moins de 3 mois", "Entre 3 et 6 mois", "Entre 6 et 12 mois", "Je m'informe seulement"]],
    previousSurgeries: ["Chirurgies antérieures", "Lesquelles et il y a combien de temps, le cas échéant"],
    conditions: ["Maladies ou conditions médicales", "Par exemple : diabète, hypertension…"],
    medicationsAllergies: ["Médicaments et allergies", "Ce que vous prenez chaque jour et ce à quoi vous êtes allergique"],
    smoking: ["Fumez-vous ?", ["Je ne fume pas", "Je suis ancien(ne) fumeur(se)", "Je fume"]],
    photos: [
      ["Vue de face", "De face, debout et détendu(e), avec toute la zone concernée visible.", "Regardez l'appareil, avec une bonne lumière et un fond uni. Portez des vêtements qui laissent voir la zone."],
      ["Profil droit", "Tournez-vous de 90° pour montrer votre côté droit, debout et détendu(e).", "Gardez le dos droit et les bras le long du corps, sans cacher la zone."],
      ["Profil gauche", "Tournez-vous de 90° pour montrer votre côté gauche, debout et détendu(e).", "Gardez le dos droit et les bras le long du corps, sans cacher la zone."],
      ["Oblique droite", "Tournez-vous d'environ 45° vers la droite, debout et détendu(e).", "Tenez le téléphone à la hauteur de la zone, avec une bonne lumière."],
      ["Oblique gauche", "Tournez-vous d'environ 45° vers la gauche, debout et détendu(e).", "Tenez le téléphone à la hauteur de la zone, avec une bonne lumière."],
    ],
  },
  de: {
    section: "Ihr Interesse an plastischer Chirurgie",
    stepDetail: "Grundlegende Angaben",
    introDesc: "Mit diesem Ablauf lernen wir Ihren Fall vor der Beratung vor Ort genau kennen. Wir bitten Sie um Ihre Angaben und 5 präzise Fotos des Bereichs, der Sie interessiert.",
    consent: "Ich habe die Verarbeitung meiner personenbezogenen Daten und meiner Fotos ausschließlich zum Zweck einer Voruntersuchung der plastischen Chirurgie gelesen und akzeptiere sie, ebenso dass das Zentrum mich mit den Ergebnissen kontaktiert. Ich verstehe, dass diese vorläufige Beurteilung keine medizinische Diagnose ist und dass ich diese Einwilligung jederzeit widerrufen kann.",
    procedure: ["Welcher Eingriff interessiert Sie?", ["Nasenkorrektur (Rhinoplastik)", "Brustvergrößerung", "Brustverkleinerung", "Bruststraffung (Mastopexie)", "Bauchdeckenstraffung", "Fettabsaugung", "Lidkorrektur (Blepharoplastik)", "Facelifting", "Ohrkorrektur (Otoplastik)", "Anderes", "Ich bin nicht sicher"]],
    concern: ["Was möchten Sie verbessern?", "Beschreiben Sie es in Ihren eigenen Worten"],
    timeframe: ["Wann möchten Sie sich operieren lassen?", ["Innerhalb von 3 Monaten", "In 3 bis 6 Monaten", "In 6 bis 12 Monaten", "Ich informiere mich nur"]],
    previousSurgeries: ["Frühere Operationen", "Welche und vor wie langer Zeit, falls vorhanden"],
    conditions: ["Erkrankungen oder medizinische Besonderheiten", "Zum Beispiel: Diabetes, Bluthochdruck …"],
    medicationsAllergies: ["Medikamente und Allergien", "Was Sie täglich einnehmen und wogegen Sie allergisch sind"],
    smoking: ["Rauchen Sie?", ["Ich rauche nicht", "Ich bin Ex-Raucher(in)", "Ich rauche"]],
    photos: [
      ["Vorderansicht", "Von vorn, stehend und entspannt, der gesamte interessierende Bereich ist sichtbar.", "Blicken Sie in die Kamera, bei gutem Licht und vor einem einfarbigen Hintergrund. Tragen Sie Kleidung, die den Bereich freilässt."],
      ["Rechtes Profil", "Drehen Sie sich um 90°, um Ihre rechte Seite zu zeigen, stehend und entspannt.", "Halten Sie den Rücken gerade und die Arme locker, ohne den Bereich zu verdecken."],
      ["Linkes Profil", "Drehen Sie sich um 90°, um Ihre linke Seite zu zeigen, stehend und entspannt.", "Halten Sie den Rücken gerade und die Arme locker, ohne den Bereich zu verdecken."],
      ["Schräg rechts", "Drehen Sie sich etwa 45° nach rechts, stehend und entspannt.", "Halten Sie das Telefon auf Höhe des Bereichs und sorgen Sie für gutes Licht."],
      ["Schräg links", "Drehen Sie sich etwa 45° nach links, stehend und entspannt.", "Halten Sie das Telefon auf Höhe des Bereichs und sorgen Sie für gutes Licht."],
    ],
  },
  it: {
    section: "Il tuo interesse per la chirurgia plastica",
    stepDetail: "Informazioni di base",
    introDesc: "Questo processo ci permetterà di conoscere il tuo caso nel dettaglio prima della visita di persona. Ti chiederemo i tuoi dati e 5 fotografie precise della zona che ti interessa.",
    consent: "Ho letto e accetto il trattamento dei miei dati personali e delle mie fotografie al solo scopo di effettuare una pre-valutazione di chirurgia plastica e che il centro mi contatti con i risultati. Capisco che questa valutazione preliminare non costituisce una diagnosi medica e che posso revocare questo consenso in qualsiasi momento.",
    procedure: ["Quale intervento ti interessa?", ["Rinoplastica", "Aumento del seno", "Riduzione del seno", "Mastopessi (sollevamento del seno)", "Addominoplastica", "Liposuzione", "Blefaroplastica", "Lifting del viso", "Otoplastica", "Altro", "Non sono sicuro/a"]],
    concern: ["Cosa vorresti migliorare?", "Raccontacelo con parole tue"],
    timeframe: ["Quando vorresti operarti?", ["Entro 3 mesi", "Tra 3 e 6 mesi", "Tra 6 e 12 mesi", "Mi sto solo informando"]],
    previousSurgeries: ["Interventi precedenti", "Quali e da quanto tempo, se ce ne sono stati"],
    conditions: ["Malattie o condizioni mediche", "Per esempio: diabete, ipertensione…"],
    medicationsAllergies: ["Farmaci e allergie", "Cosa assumi ogni giorno e a cosa sei allergico/a"],
    smoking: ["Fumi?", ["Non fumo", "Sono un ex fumatore/trice", "Fumo"]],
    photos: [
      ["Vista frontale", "Di fronte, in piedi e rilassato/a, con tutta la zona di interesse visibile.", "Guarda la fotocamera con buona luce e sfondo neutro. Indossa abiti che lascino vedere la zona."],
      ["Profilo destro", "Ruota di 90° per mostrare il lato destro, in piedi e rilassato/a.", "Tieni la schiena dritta e le braccia lungo il corpo, senza coprire la zona."],
      ["Profilo sinistro", "Ruota di 90° per mostrare il lato sinistro, in piedi e rilassato/a.", "Tieni la schiena dritta e le braccia lungo il corpo, senza coprire la zona."],
      ["Obliqua destra", "Ruota di circa 45° verso destra, in piedi e rilassato/a.", "Tieni il telefono all'altezza della zona e con buona luce."],
      ["Obliqua sinistra", "Ruota di circa 45° verso sinistra, in piedi e rilassato/a.", "Tieni il telefono all'altezza della zona e con buona luce."],
    ],
  },
  tr: {
    section: "Plastik cerrahiye ilginiz",
    stepDetail: "Temel bilgiler",
    introDesc: "Bu süreç, yüz yüze muayeneden önce durumunuzu ayrıntılı olarak tanımamızı sağlar. Bilgilerinizi ve ilgilendiğiniz bölgenin 5 net fotoğrafını isteyeceğiz.",
    consent: "Kişisel verilerimin ve fotoğraflarımın yalnızca bir plastik cerrahi ön değerlendirmesi yapılması ve merkezin sonuçlarla bana ulaşması amacıyla işlenmesini okudum ve kabul ediyorum. Bu ön değerlendirmenin tıbbi bir tanı olmadığını ve bu onayı istediğim zaman geri çekebileceğimi anlıyorum.",
    procedure: ["Hangi işlemle ilgileniyorsunuz?", ["Rinoplasti", "Meme büyütme", "Meme küçültme", "Meme dikleştirme (mastopeksi)", "Karın germe", "Liposuction", "Göz kapağı estetiği (blefaroplasti)", "Yüz germe", "Kulak estetiği (otoplasti)", "Diğer", "Emin değilim"]],
    concern: ["Neyi iyileştirmek istersiniz?", "Kendi sözlerinizle anlatın"],
    timeframe: ["Ameliyatı ne zaman olmak istersiniz?", ["3 ay içinde", "3 ile 6 ay arasında", "6 ile 12 ay arasında", "Sadece bilgi alıyorum"]],
    previousSurgeries: ["Geçirilmiş ameliyatlar", "Varsa hangileri ve ne zaman"],
    conditions: ["Hastalıklar veya tıbbi durumlar", "Örneğin: diyabet, hipertansiyon…"],
    medicationsAllergies: ["İlaçlar ve alerjiler", "Her gün kullandıklarınız ve alerjiniz olanlar"],
    smoking: ["Sigara içiyor musunuz?", ["İçmiyorum", "Bıraktım", "İçiyorum"]],
    photos: [
      ["Önden görünüm", "Karşıdan, ayakta ve rahat, ilgilendiğiniz bölgenin tamamı görünsün.", "İyi ışıkta ve düz bir fonda kameraya bakın. Bölgeyi gösteren kıyafetler giyin."],
      ["Sağ profil", "Sağ tarafınızı göstermek için 90° dönün, ayakta ve rahat.", "Sırtınızı dik, kollarınızı serbest tutun; bölgeyi kapatmayın."],
      ["Sol profil", "Sol tarafınızı göstermek için 90° dönün, ayakta ve rahat.", "Sırtınızı dik, kollarınızı serbest tutun; bölgeyi kapatmayın."],
      ["Sağ çapraz", "Sağa doğru yaklaşık 45° dönün, ayakta ve rahat.", "Telefonu bölgenin yüksekliğinde ve iyi ışıkta tutun."],
      ["Sol çapraz", "Sola doğru yaklaşık 45° dönün, ayakta ve rahat.", "Telefonu bölgenin yüksekliğinde ve iyi ışıkta tutun."],
    ],
  },
  ar: {
    section: "اهتمامك بالجراحة التجميلية",
    stepDetail: "معلومات أساسية",
    introDesc: "تتيح لنا هذه العملية التعرّف على حالتك بالتفصيل قبل الاستشارة الحضورية. سنطلب بياناتك و5 صور دقيقة للمنطقة التي تهمك.",
    consent: "لقد قرأتُ وأوافق على معالجة بياناتي الشخصية وصوري لغرض وحيد هو إجراء تقييم مسبق للجراحة التجميلية وأن يتواصل معي المركز بالنتائج. أفهم أن هذا التقييم الأولي ليس تشخيصًا طبيًا وأن بإمكاني سحب هذه الموافقة في أي وقت.",
    procedure: ["ما الإجراء الذي يهمك؟", ["تجميل الأنف", "تكبير الثدي", "تصغير الثدي", "شد الثدي", "شد البطن", "شفط الدهون", "تجميل الجفون", "شد الوجه", "تجميل الأذن", "آخر", "لستُ متأكدًا"]],
    concern: ["ما الذي تودّ تحسينه؟", "أخبرنا بكلماتك"],
    timeframe: ["متى ترغب في إجراء الجراحة؟", ["خلال أقل من 3 أشهر", "بين 3 و6 أشهر", "بين 6 و12 شهرًا", "أستعلم فقط"]],
    previousSurgeries: ["العمليات السابقة", "أيّها ومنذ متى، إن وُجدت"],
    conditions: ["الأمراض أو الحالات الطبية", "مثلًا: السكري، ارتفاع الضغط…"],
    medicationsAllergies: ["الأدوية والحساسية", "ما تتناوله يوميًا وما تعاني حساسية منه"],
    smoking: ["هل تدخّن؟", ["لا أدخّن", "مدخّن سابق", "أدخّن"]],
    photos: [
      ["من الأمام", "مواجهًا الكاميرا، واقفًا ومسترخيًا، مع ظهور المنطقة المعنية كاملة.", "انظر إلى الكاميرا في إضاءة جيدة وخلفية سادة. ارتدِ ملابس تُظهر المنطقة."],
      ["الجانب الأيمن", "استدر 90° لإظهار جانبك الأيمن، واقفًا ومسترخيًا.", "أبقِ ظهرك مستقيمًا وذراعيك مرخيتين دون تغطية المنطقة."],
      ["الجانب الأيسر", "استدر 90° لإظهار جانبك الأيسر، واقفًا ومسترخيًا.", "أبقِ ظهرك مستقيمًا وذراعيك مرخيتين دون تغطية المنطقة."],
      ["مائلة لليمين", "استدر نحو 45° إلى اليمين، واقفًا ومسترخيًا.", "أمسك الهاتف على مستوى المنطقة وفي إضاءة جيدة."],
      ["مائلة لليسار", "استدر نحو 45° إلى اليسار، واقفًا ومسترخيًا.", "أمسك الهاتف على مستوى المنطقة وفي إضاءة جيدة."],
    ],
  },
  zh: {
    section: "您对整形外科的需求",
    stepDetail: "基本情况",
    introDesc: "此流程让我们在面诊之前详细了解您的情况。我们将请您提供个人资料以及您所关注部位的5张清晰照片。",
    consent: "我已阅读并同意仅为进行整形外科预评估以及让诊所向我告知结果之目的，处理我的个人资料和照片。我理解此初步评估不构成医学诊断，并且我可以随时撤回此同意。",
    procedure: ["您想了解哪种手术？", ["鼻整形", "隆胸", "缩胸", "乳房提升", "腹部整形（吸脂紧致）", "吸脂", "眼睑整形", "面部提升", "耳整形", "其他", "我不确定"]],
    concern: ["您希望改善什么？", "请用您自己的话描述"],
    timeframe: ["您希望什么时候手术？", ["3个月内", "3到6个月之间", "6到12个月之间", "我只是先了解一下"]],
    previousSurgeries: ["既往手术", "如有，请说明是哪些以及多久以前"],
    conditions: ["疾病或健康状况", "例如：糖尿病、高血压……"],
    medicationsAllergies: ["药物和过敏", "您每天使用的药物以及过敏的物质"],
    smoking: ["您吸烟吗？", ["不吸烟", "已戒烟", "吸烟"]],
    photos: [
      ["正面", "面向镜头，站立放松，让整个目标部位完整可见。", "在良好光线和纯色背景下看向镜头。穿着能露出该部位的衣服。"],
      ["右侧面", "向右转90°，展示右侧，站立放松。", "保持背部挺直、双臂自然下垂，不要遮挡该部位。"],
      ["左侧面", "向左转90°，展示左侧，站立放松。", "保持背部挺直、双臂自然下垂，不要遮挡该部位。"],
      ["右斜侧", "向右转约45°，站立放松。", "手机与该部位保持同一高度，并保证光线良好。"],
      ["左斜侧", "向左转约45°，站立放松。", "手机与该部位保持同一高度，并保证光线良好。"],
    ],
  },
};

/** The patient's answers as rows with Spanish text, for the clinic's staff panel. */
export function plasticSummaryRows(data: Record<string, string> | null | undefined): Array<{ label: string; value: string }> {
  const es = PLASTIC_TEXT.es;
  const pick = (value: string | undefined, keys: readonly string[], labels: string[]) => {
    const index = value ? keys.indexOf(value) : -1;
    return index >= 0 ? labels[index] : "";
  };
  const answers = data ?? {};
  return [
    { label: es.procedure[0], value: pick(answers.procedure, PLASTIC_PROCEDURE_KEYS, es.procedure[1]) },
    { label: es.concern[0], value: answers.concern ?? "" },
    { label: es.timeframe[0], value: pick(answers.timeframe, PLASTIC_TIMEFRAME_KEYS, es.timeframe[1]) },
    { label: es.previousSurgeries[0], value: answers.previousSurgeries ?? "" },
    { label: es.conditions[0], value: answers.conditions ?? "" },
    { label: es.medicationsAllergies[0], value: answers.medicationsAllergies ?? "" },
    { label: es.smoking[0], value: pick(answers.smoking, PLASTIC_SMOKING_KEYS, es.smoking[1]) },
  ];
}
