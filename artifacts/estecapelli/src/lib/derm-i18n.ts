// Textos del formulario del paciente para la especialidad "Dermatología", en los nueve idiomas.
// Las respuestas de selección se guardan como claves estables (ver specialties/dermatologia.ts en la API);
// aquí solo está el texto que ve el paciente, en el mismo orden de esas claves.
import type { LangCode } from "./language";

export const DERM_REASON_KEYS = ["mole", "spot", "acne", "rash", "growth", "other"] as const;
export const DERM_DURATION_KEYS = ["lt1m", "m1to6", "m6to12", "gt1y"] as const;
export const DERM_CHANGES_KEYS = ["none", "size", "colorShape", "symptoms"] as const;
export const DERM_SUN_KEYS = ["low", "moderate", "high"] as const;
export const DERM_SKIN_KEYS = ["light", "medium", "dark"] as const;
export const DERM_VIEW_KEYS = ["dermOverview", "dermClose", "dermDermoscopy"] as const;

export type DermText = {
  section: string;
  stepDetail: string;
  introDesc: string;
  consent: string;
  reason: [string, string[]];
  area: [string, string];
  duration: [string, string[]];
  changes: [string, string[]];
  history: [string, string];
  treatments: [string, string];
  sun: [string, string[]];
  skinType: [string, string[]];
  photos: Array<[string, string, string]>;
};

export const DERM_TEXT: Record<LangCode, DermText> = {
  es: {
    section: "Tu consulta de dermatología",
    stepDetail: "Antecedentes básicos",
    introDesc: "Este proceso nos permitirá conocer tu caso antes de la consulta. Te pediremos tus datos y fotografías de la zona de tu piel que te preocupa.",
    consent: "He leído y acepto el tratamiento de mis datos personales y de mis fotografías con el fin exclusivo de realizar una pre-evaluación dermatológica y de que el centro me contacte con los resultados. Entiendo que esta evaluación preliminar no es un diagnóstico médico.",
    reason: ["¿Qué te preocupa?", ["Lunar o lesión pigmentada", "Mancha en la piel", "Acné o rosácea", "Erupción, picazón o enrojecimiento", "Bulto, verruga o herida que no cierra", "Otro"]],
    area: ["¿En qué zona del cuerpo está?", "Por ejemplo: espalda, mejilla derecha…"],
    duration: ["¿Hace cuánto apareció?", ["Menos de 1 mes", "Entre 1 y 6 meses", "Entre 6 y 12 meses", "Más de 1 año"]],
    changes: ["¿Ha cambiado recientemente?", ["Sin cambios", "Ha crecido", "Cambió de color o de forma", "Pica, duele o sangra"]],
    history: ["Antecedentes", "Cáncer de piel tuyo o de tu familia, alergias…"],
    treatments: ["Medicamentos y tratamientos previos", "Lo que usas o has usado para esto"],
    sun: ["Exposición al sol", ["Baja", "Moderada", "Alta o con quemaduras frecuentes"]],
    skinType: ["Tipo de piel", ["Clara: se quema fácil y casi no se broncea", "Intermedia: se broncea gradualmente", "Oscura: rara vez se quema"]],
    photos: [["Vista panorámica", "Muestra la zona completa y un poco de su alrededor, para ver dónde está.", "Con buena luz natural y fondo liso. Mantén el teléfono a unos 40 cm."], ["Primer plano con referencia", "Acércate a la lesión y coloca al lado una regla o una moneda como referencia de tamaño.", "Enfoca bien y evita sombras sobre la piel. No uses zoom digital."], ["Dermatoscopía", "Si tu médico te lo pidió, sube la imagen tomada con dermatoscopio.", "Es opcional: puedes omitir esta foto."]],
  },
  en: {
    section: "Your dermatology consultation",
    stepDetail: "Basic background",
    introDesc: "This process lets us get to know your case before the consultation. We will ask for your details and photographs of the area of skin that worries you.",
    consent: "I have read and accept the processing of my personal data and photographs for the sole purpose of a dermatology pre-evaluation and so that the center can contact me with the results. I understand this preliminary evaluation is not a medical diagnosis.",
    reason: ["What is your concern?", ["Mole or pigmented lesion", "Skin spot", "Acne or rosacea", "Rash, itching or redness", "Lump, wart or sore that does not heal", "Other"]],
    area: ["Which area of the body is it on?", "For example: back, right cheek…"],
    duration: ["How long ago did it appear?", ["Less than 1 month", "Between 1 and 6 months", "Between 6 and 12 months", "More than 1 year"]],
    changes: ["Has it changed recently?", ["No changes", "It has grown", "It changed color or shape", "It itches, hurts or bleeds"]],
    history: ["Medical history", "Skin cancer in you or your family, allergies…"],
    treatments: ["Medications and previous treatments", "What you use or have used for this"],
    sun: ["Sun exposure", ["Low", "Moderate", "High or frequent sunburn"]],
    skinType: ["Skin type", ["Fair: burns easily and hardly tans", "Medium: tans gradually", "Dark: rarely burns"]],
    photos: [["Overview", "Show the whole area and a little of its surroundings, so we can see where it is.", "Use good natural light and a plain background. Hold the phone about 40 cm away."], ["Close-up with reference", "Get close to the lesion and place a ruler or a coin next to it as a size reference.", "Focus well and avoid shadows on the skin. Do not use digital zoom."], ["Dermoscopy", "If your doctor asked for it, upload the image taken with a dermatoscope.", "It is optional: you can skip this photo."]],
  },
  pt: {
    section: "Sua consulta de dermatologia",
    stepDetail: "Antecedentes básicos",
    introDesc: "Este processo nos permitirá conhecer seu caso antes da consulta. Pediremos seus dados e fotografias da área da pele que lhe preocupa.",
    consent: "Li e aceito o tratamento dos meus dados pessoais e das minhas fotografias com a finalidade exclusiva de realizar uma pré-avaliação dermatológica e de que o centro entre em contato comigo com os resultados. Entendo que esta avaliação preliminar não é um diagnóstico médico.",
    reason: ["O que lhe preocupa?", ["Pinta ou lesão pigmentada", "Mancha na pele", "Acne ou rosácea", "Erupção, coceira ou vermelhidão", "Caroço, verruga ou ferida que não cicatriza", "Outro"]],
    area: ["Em que parte do corpo está?", "Por exemplo: costas, bochecha direita…"],
    duration: ["Há quanto tempo apareceu?", ["Menos de 1 mês", "Entre 1 e 6 meses", "Entre 6 e 12 meses", "Mais de 1 ano"]],
    changes: ["Mudou recentemente?", ["Sem mudanças", "Cresceu", "Mudou de cor ou de forma", "Coça, dói ou sangra"]],
    history: ["Antecedentes", "Câncer de pele seu ou da família, alergias…"],
    treatments: ["Medicamentos e tratamentos anteriores", "O que usa ou já usou para isso"],
    sun: ["Exposição ao sol", ["Baixa", "Moderada", "Alta ou com queimaduras frequentes"]],
    skinType: ["Tipo de pele", ["Clara: queima fácil e quase não bronzeia", "Intermediária: bronzeia gradualmente", "Escura: raramente queima"]],
    photos: [["Vista panorâmica", "Mostre a área inteira e um pouco do entorno, para vermos onde está.", "Com boa luz natural e fundo liso. Segure o celular a cerca de 40 cm."], ["Close com referência", "Aproxime-se da lesão e coloque ao lado uma régua ou uma moeda como referência de tamanho.", "Foque bem e evite sombras sobre a pele. Não use zoom digital."], ["Dermatoscopia", "Se seu médico pediu, envie a imagem feita com dermatoscópio.", "É opcional: você pode pular esta foto."]],
  },
  fr: {
    section: "Votre consultation de dermatologie",
    stepDetail: "Antécédents de base",
    introDesc: "Ce processus nous permet de connaître votre cas avant la consultation. Nous vous demanderons vos coordonnées et des photographies de la zone de peau qui vous préoccupe.",
    consent: "J'ai lu et j'accepte le traitement de mes données personnelles et de mes photographies dans le seul but d'une pré-évaluation dermatologique et pour que le centre me contacte avec les résultats. Je comprends que cette évaluation préliminaire n'est pas un diagnostic médical.",
    reason: ["Qu'est-ce qui vous préoccupe ?", ["Grain de beauté ou lésion pigmentée", "Tache sur la peau", "Acné ou rosacée", "Éruption, démangeaison ou rougeur", "Bosse, verrue ou plaie qui ne guérit pas", "Autre"]],
    area: ["Sur quelle zone du corps ?", "Par exemple : dos, joue droite…"],
    duration: ["Depuis quand est-ce apparu ?", ["Moins de 1 mois", "Entre 1 et 6 mois", "Entre 6 et 12 mois", "Plus de 1 an"]],
    changes: ["Y a-t-il eu des changements récents ?", ["Aucun changement", "Elle a grandi", "Elle a changé de couleur ou de forme", "Elle démange, fait mal ou saigne"]],
    history: ["Antécédents", "Cancer de la peau chez vous ou dans votre famille, allergies…"],
    treatments: ["Médicaments et traitements antérieurs", "Ce que vous utilisez ou avez utilisé pour cela"],
    sun: ["Exposition au soleil", ["Faible", "Modérée", "Élevée ou coups de soleil fréquents"]],
    skinType: ["Type de peau", ["Claire : brûle facilement et bronze peu", "Intermédiaire : bronze progressivement", "Foncée : brûle rarement"]],
    photos: [["Vue d'ensemble", "Montrez toute la zone et un peu de ses alentours, pour voir où elle se trouve.", "Bonne lumière naturelle et fond uni. Tenez le téléphone à environ 40 cm."], ["Gros plan avec repère", "Approchez-vous de la lésion et placez à côté une règle ou une pièce comme repère de taille.", "Faites bien la mise au point et évitez les ombres sur la peau. N'utilisez pas le zoom numérique."], ["Dermoscopie", "Si votre médecin l'a demandé, envoyez l'image prise avec un dermatoscope.", "C'est facultatif : vous pouvez passer cette photo."]],
  },
  de: {
    section: "Ihre dermatologische Konsultation",
    stepDetail: "Grundlegende Angaben",
    introDesc: "Mit diesem Ablauf lernen wir Ihren Fall vor der Konsultation kennen. Wir bitten um Ihre Daten und Fotos der Hautstelle, die Ihnen Sorgen macht.",
    consent: "Ich habe die Verarbeitung meiner personenbezogenen Daten und Fotos gelesen und akzeptiere sie ausschließlich für eine dermatologische Voruntersuchung und dafür, dass das Zentrum mich mit den Ergebnissen kontaktiert. Ich verstehe, dass diese vorläufige Beurteilung keine ärztliche Diagnose ist.",
    reason: ["Was bereitet Ihnen Sorgen?", ["Muttermal oder pigmentierte Läsion", "Hautfleck", "Akne oder Rosazea", "Ausschlag, Juckreiz oder Rötung", "Knoten, Warze oder nicht heilende Wunde", "Anderes"]],
    area: ["An welcher Körperstelle?", "Zum Beispiel: Rücken, rechte Wange…"],
    duration: ["Seit wann besteht es?", ["Weniger als 1 Monat", "1 bis 6 Monate", "6 bis 12 Monate", "Mehr als 1 Jahr"]],
    changes: ["Hat es sich kürzlich verändert?", ["Keine Veränderung", "Es ist gewachsen", "Farbe oder Form hat sich geändert", "Es juckt, schmerzt oder blutet"]],
    history: ["Vorgeschichte", "Hautkrebs bei Ihnen oder in der Familie, Allergien…"],
    treatments: ["Medikamente und frühere Behandlungen", "Was Sie dafür anwenden oder angewendet haben"],
    sun: ["Sonnenexposition", ["Gering", "Mäßig", "Hoch oder häufiger Sonnenbrand"]],
    skinType: ["Hauttyp", ["Hell: verbrennt leicht, bräunt kaum", "Mittel: bräunt allmählich", "Dunkel: verbrennt selten"]],
    photos: [["Übersicht", "Zeigen Sie die ganze Stelle und etwas von der Umgebung, damit man sieht, wo sie liegt.", "Gutes Tageslicht und einfarbiger Hintergrund. Halten Sie das Telefon ca. 40 cm entfernt."], ["Nahaufnahme mit Referenz", "Gehen Sie nah an die Läsion heran und legen Sie ein Lineal oder eine Münze als Größenreferenz daneben.", "Gut scharfstellen und Schatten auf der Haut vermeiden. Keinen digitalen Zoom verwenden."], ["Dermatoskopie", "Wenn Ihr Arzt es verlangt hat, laden Sie das mit einem Dermatoskop aufgenommene Bild hoch.", "Optional: Sie können dieses Foto überspringen."]],
  },
  it: {
    section: "La tua visita dermatologica",
    stepDetail: "Antecedenti di base",
    introDesc: "Questo percorso ci permette di conoscere il tuo caso prima della visita. Ti chiederemo i tuoi dati e le fotografie della zona della pelle che ti preoccupa.",
    consent: "Ho letto e accetto il trattamento dei miei dati personali e delle mie fotografie al solo scopo di una pre-valutazione dermatologica e affinché il centro mi contatti con i risultati. Capisco che questa valutazione preliminare non è una diagnosi medica.",
    reason: ["Cosa ti preoccupa?", ["Neo o lesione pigmentata", "Macchia sulla pelle", "Acne o rosacea", "Eruzione, prurito o arrossamento", "Nodulo, verruca o ferita che non guarisce", "Altro"]],
    area: ["In quale zona del corpo si trova?", "Ad esempio: schiena, guancia destra…"],
    duration: ["Da quanto tempo è comparso?", ["Meno di 1 mese", "Tra 1 e 6 mesi", "Tra 6 e 12 mesi", "Più di 1 anno"]],
    changes: ["È cambiato di recente?", ["Nessun cambiamento", "È cresciuto", "Ha cambiato colore o forma", "Prude, fa male o sanguina"]],
    history: ["Anamnesi", "Tumori della pelle tuoi o in famiglia, allergie…"],
    treatments: ["Farmaci e trattamenti precedenti", "Cosa usi o hai usato per questo"],
    sun: ["Esposizione al sole", ["Bassa", "Moderata", "Alta o con scottature frequenti"]],
    skinType: ["Tipo di pelle", ["Chiara: si scotta facilmente e si abbronza poco", "Intermedia: si abbronza gradualmente", "Scura: si scotta raramente"]],
    photos: [["Vista d'insieme", "Mostra tutta la zona e un po' di ciò che la circonda, per vedere dov'è.", "Con buona luce naturale e sfondo neutro. Tieni il telefono a circa 40 cm."], ["Primo piano con riferimento", "Avvicinati alla lesione e metti accanto un righello o una moneta come riferimento di misura.", "Metti bene a fuoco ed evita ombre sulla pelle. Non usare lo zoom digitale."], ["Dermatoscopia", "Se il medico lo ha richiesto, carica l'immagine fatta con il dermatoscopio.", "È facoltativa: puoi saltare questa foto."]],
  },
  tr: {
    section: "Dermatoloji muayeneniz",
    stepDetail: "Temel öykü",
    introDesc: "Bu süreç, muayeneden önce durumunuzu tanımamızı sağlar. Bilgilerinizi ve cildinizde sizi endişelendiren bölgenin fotoğraflarını isteyeceğiz.",
    consent: "Kişisel verilerimin ve fotoğraflarımın yalnızca dermatolojik ön değerlendirme yapılması ve merkezin sonuçlarla bana ulaşması amacıyla işlenmesini okudum ve kabul ediyorum. Bu ön değerlendirmenin tıbbi bir teşhis olmadığını anlıyorum.",
    reason: ["Sizi ne endişelendiriyor?", ["Ben veya pigmentli lezyon", "Ciltte leke", "Akne veya rozasea", "Döküntü, kaşıntı veya kızarıklık", "Şişlik, siğil veya iyileşmeyen yara", "Diğer"]],
    area: ["Vücudun hangi bölgesinde?", "Örneğin: sırt, sağ yanak…"],
    duration: ["Ne zaman ortaya çıktı?", ["1 aydan az", "1 ile 6 ay arası", "6 ile 12 ay arası", "1 yıldan fazla"]],
    changes: ["Yakın zamanda değişti mi?", ["Değişiklik yok", "Büyüdü", "Rengi veya şekli değişti", "Kaşınıyor, ağrıyor veya kanıyor"]],
    history: ["Öykü", "Sizde veya ailenizde cilt kanseri, alerjiler…"],
    treatments: ["İlaçlar ve önceki tedaviler", "Bunun için kullandığınız veya kullandıklarınız"],
    sun: ["Güneşe maruz kalma", ["Düşük", "Orta", "Yüksek veya sık güneş yanığı"]],
    skinType: ["Cilt tipi", ["Açık: kolay yanar, zor bronzlaşır", "Orta: kademeli bronzlaşır", "Koyu: nadiren yanar"]],
    photos: [["Genel görünüm", "Bölgenin tamamını ve çevresinden biraz göstererek nerede olduğunu belli edin.", "İyi doğal ışık ve sade arka plan. Telefonu yaklaşık 40 cm uzakta tutun."], ["Referanslı yakın çekim", "Lezyona yaklaşın ve boyut referansı olarak yanına bir cetvel veya bozuk para koyun.", "İyi odaklayın ve ciltte gölgeden kaçının. Dijital yakınlaştırma kullanmayın."], ["Dermatoskopi", "Doktorunuz istediyse dermatoskopla çekilen görüntüyü yükleyin.", "İsteğe bağlıdır: bu fotoğrafı atlayabilirsiniz."]],
  },
  ar: {
    section: "استشارتك الجلدية",
    stepDetail: "خلفية أساسية",
    introDesc: "تتيح لنا هذه العملية التعرّف على حالتك قبل الاستشارة. سنطلب بياناتك وصورًا للمنطقة من جلدك التي تقلقك.",
    consent: "لقد قرأت وأوافق على معالجة بياناتي الشخصية وصوري لغرض وحيد هو إجراء تقييم أولي جلدي وأن يتواصل المركز معي بالنتائج. أدرك أن هذا التقييم الأولي ليس تشخيصًا طبيًا.",
    reason: ["ما الذي يقلقك؟", ["خال أو آفة صبغية", "بقعة على الجلد", "حب الشباب أو الوردية", "طفح أو حكة أو احمرار", "كتلة أو ثؤلول أو جرح لا يلتئم", "أخرى"]],
    area: ["في أي منطقة من الجسم؟", "مثال: الظهر، الخد الأيمن…"],
    duration: ["منذ متى ظهر؟", ["أقل من شهر", "بين شهر و6 أشهر", "بين 6 و12 شهرًا", "أكثر من سنة"]],
    changes: ["هل تغيّر مؤخرًا؟", ["لا تغيّر", "كبر حجمه", "تغيّر لونه أو شكله", "يحكّ أو يؤلم أو ينزف"]],
    history: ["السوابق", "سرطان الجلد لديك أو في العائلة، الحساسية…"],
    treatments: ["الأدوية والعلاجات السابقة", "ما تستخدمه أو استخدمته لهذا"],
    sun: ["التعرض للشمس", ["منخفض", "متوسط", "مرتفع أو حروق شمس متكررة"]],
    skinType: ["نوع البشرة", ["فاتحة: تحترق بسهولة وبالكاد تسمرّ", "متوسطة: تسمرّ تدريجيًا", "داكنة: نادرًا ما تحترق"]],
    photos: [["منظر عام", "أظهر المنطقة كاملة وجزءًا مما حولها لنرى مكانها.", "إضاءة طبيعية جيدة وخلفية سادة. أبقِ الهاتف على بعد 40 سم تقريبًا."], ["لقطة مقرّبة مع مرجع", "اقترب من الآفة وضع بجانبها مسطرة أو قطعة نقدية كمرجع للحجم.", "ركّز جيدًا وتجنّب الظلال على الجلد. لا تستخدم التكبير الرقمي."], ["تنظير الجلد", "إذا طلب طبيبك ذلك، ارفع الصورة الملتقطة بجهاز تنظير الجلد.", "اختيارية: يمكنك تخطي هذه الصورة."]],
  },
  zh: {
    section: "您的皮肤科咨询",
    stepDetail: "基本病史",
    introDesc: "此流程让我们在咨询前了解您的情况。我们会请您填写资料，并拍摄您担心的皮肤部位的照片。",
    consent: "我已阅读并同意仅为进行皮肤科初步评估以及让中心向我告知结果之目的，处理我的个人数据和照片。我理解此初步评估不是医学诊断。",
    reason: ["您担心什么？", ["痣或色素性皮损", "皮肤斑点", "痤疮或玫瑰痤疮", "皮疹、瘙痒或发红", "肿块、疣或不愈合的伤口", "其他"]],
    area: ["位于身体哪个部位？", "例如：背部、右脸颊…"],
    duration: ["出现多久了？", ["不到1个月", "1到6个月", "6到12个月", "超过1年"]],
    changes: ["最近有变化吗？", ["没有变化", "变大了", "颜色或形状改变", "发痒、疼痛或出血"]],
    history: ["既往史", "您或家人的皮肤癌病史、过敏…"],
    treatments: ["药物和既往治疗", "您为此使用或曾使用的"],
    sun: ["日晒情况", ["少", "中等", "多或经常晒伤"]],
    skinType: ["皮肤类型", ["白皙：易晒红，几乎不变黑", "中等：逐渐晒黑", "较深：很少晒红"]],
    photos: [["全景", "拍到整个部位及其周围一小部分，以便看出位置。", "自然光充足、背景简单。手机距离约40厘米。"], ["带参照物的特写", "靠近皮损，并在旁边放一把尺子或一枚硬币作为大小参照。", "对准焦点，避免皮肤上有阴影。不要使用数码变焦。"], ["皮肤镜", "如果医生要求，请上传用皮肤镜拍摄的图像。", "此项可选：可以跳过这张照片。"]],
  },
};

/** The patient's answers as rows with Spanish text, for the clinic's staff panel. */
export function dermSummaryRows(data: Record<string, string> | null | undefined): Array<{ label: string; value: string }> {
  const es = DERM_TEXT.es;
  const pick = (value: string | undefined, keys: readonly string[], labels: string[]) => {
    const index = value ? keys.indexOf(value) : -1;
    return index >= 0 ? labels[index] : "";
  };
  const answers = data ?? {};
  return [
    { label: es.reason[0], value: pick(answers.reason, DERM_REASON_KEYS, es.reason[1]) },
    { label: es.area[0], value: answers.area ?? "" },
    { label: es.duration[0], value: pick(answers.duration, DERM_DURATION_KEYS, es.duration[1]) },
    { label: es.changes[0], value: pick(answers.changes, DERM_CHANGES_KEYS, es.changes[1]) },
    { label: es.history[0], value: answers.history ?? "" },
    { label: es.treatments[0], value: answers.treatments ?? "" },
    { label: es.sun[0], value: pick(answers.sun, DERM_SUN_KEYS, es.sun[1]) },
    { label: es.skinType[0], value: pick(answers.skinType, DERM_SKIN_KEYS, es.skinType[1]) },
  ];
}
