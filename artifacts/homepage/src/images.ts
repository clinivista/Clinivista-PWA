// Única configuración de las fotografías del sitio. Son imágenes ilustrativas
// generadas con IA (personas sintéticas), entregadas por el usuario y autorizadas
// para uso comercial; están en public/images en AVIF/WebP (varios anchos) más un
// JPEG de respaldo (scripts/optimize-images.mjs). Para reemplazarlas por fotos
// reales con consentimiento, cambia `name`, `widths`, `width`/`height` y `alt`.
import type { LangCode } from "./i18n";

export type SiteImage = {
  /** Prefijo de los archivos en /images: `${name}-${ancho}.avif|webp` y `${name}.jpg`. */
  name: string;
  widths: number[];
  /** Tamaño original (proporción; evita saltos de diseño). */
  width: number;
  height: number;
  alt: Record<LangCode, string>;
  /** Rostros, piel o antes/después: llevan la etiqueta «Imagen ilustrativa». */
  illustrative: boolean;
  /** Un solo archivo con dos paneles iguales: izquierdo «antes», derecho «después». */
  diptych?: boolean;
};

export const IMAGES = {
  hero: {
    name: "hero-profesional", widths: [800, 1200, 1774], width: 1774, height: 887, illustrative: false,
    alt: {
      es: "Profesional de la salud con bata blanca trabajando frente a un computador portátil en una clínica luminosa",
      en: "Healthcare professional in a white coat working at a laptop in a bright clinic",
      pt: "Profissional de saúde de jaleco branco trabalhando em um notebook em uma clínica iluminada",
      fr: "Professionnelle de santé en blouse blanche travaillant sur un ordinateur portable dans une clinique lumineuse",
      de: "Ärztin im weißen Kittel arbeitet in einer hellen Klinik an einem Laptop",
      it: "Professionista sanitaria in camice bianco al lavoro su un portatile in una clinica luminosa",
      tr: "Aydınlık bir klinikte dizüstü bilgisayarda çalışan beyaz önlüklü sağlık profesyoneli",
      ar: "أخصائية رعاية صحية بمعطف أبيض تعمل على حاسوب محمول في عيادة مضيئة",
      zh: "身穿白大褂的医护人员在明亮的诊所里使用笔记本电脑",
    },
  },
  faces: {
    name: "rostros-comparativa", widths: [768, 1536], width: 1536, height: 1024, illustrative: true, diptych: true,
    alt: {
      es: "Ejemplo ilustrativo: el mismo rostro femenino de frente en dos fotografías, antes y después",
      en: "Illustrative example: the same woman's face, front view, in two photos, before and after",
      pt: "Exemplo ilustrativo: o mesmo rosto feminino de frente em duas fotos, antes e depois",
      fr: "Exemple illustratif : le même visage féminin de face sur deux photos, avant et après",
      de: "Illustratives Beispiel: dasselbe Frauengesicht frontal auf zwei Fotos, vorher und nachher",
      it: "Esempio illustrativo: lo stesso volto femminile frontale in due foto, prima e dopo",
      tr: "Örnek görsel: aynı kadın yüzünün önden iki fotoğrafı, öncesi ve sonrası",
      ar: "مثال توضيحي: الوجه نفسه لامرأة من الأمام في صورتين، قبل وبعد",
      zh: "示意图：同一位女性的正面照片，前后两张对比",
    },
  },
  skin: {
    name: "piel-comparativa", widths: [768, 1536], width: 1536, height: 1024, illustrative: true, diptych: true,
    alt: {
      es: "Simulación ilustrativa: primer plano de la misma mejilla, antes con imperfecciones y después con menos",
      en: "Illustrative simulation: close-up of the same cheek, before with blemishes and after with fewer",
      pt: "Simulação ilustrativa: close da mesma bochecha, antes com imperfeições e depois com menos",
      fr: "Simulation illustrative : gros plan de la même joue, avant avec des imperfections et après avec moins",
      de: "Illustrative Simulation: Nahaufnahme derselben Wange, vorher mit Unreinheiten und nachher mit weniger",
      it: "Simulazione illustrativa: primo piano della stessa guancia, prima con imperfezioni e dopo con meno",
      tr: "Örnek simülasyon: aynı yanağın yakın çekimi, öncesinde lekeli, sonrasında daha az lekeli",
      ar: "محاكاة توضيحية: لقطة قريبة للخد نفسه، قبل مع شوائب وبعد مع شوائب أقل",
      zh: "示意模拟：同一侧脸颊的特写，之前有瑕疵，之后瑕疵减少",
    },
  },
  dermatologia: {
    name: "dermatologia", widths: [160, 320], width: 1254, height: 1254, illustrative: true,
    alt: {
      es: "Primer plano de la piel de una mejilla", en: "Close-up of the skin of a cheek", pt: "Close da pele de uma bochecha",
      fr: "Gros plan de la peau d'une joue", de: "Nahaufnahme der Haut einer Wange", it: "Primo piano della pelle di una guancia",
      tr: "Bir yanak cildinin yakın çekimi", ar: "لقطة قريبة لبشرة الخد", zh: "脸颊皮肤特写",
    },
  },
  tricologia: {
    name: "tricologia", widths: [160, 320], width: 1254, height: 1254, illustrative: true,
    alt: {
      es: "Cuero cabelludo visto desde arriba con la raya del pelo al centro", en: "Scalp seen from above with a center hair part",
      pt: "Couro cabeludo visto de cima com risca ao meio", fr: "Cuir chevelu vu de dessus avec une raie au milieu",
      de: "Kopfhaut von oben mit Mittelscheitel", it: "Cuoio capelluto visto dall'alto con la riga al centro",
      tr: "Ortadan ayrılmış saçla yukarıdan görülen saçlı deri", ar: "فروة الرأس من الأعلى مع فرق الشعر في المنتصف", zh: "从上方看头皮，头发中分",
    },
  },
  cirugiaPlastica: {
    name: "cirugia-plastica", widths: [160, 320], width: 1254, height: 1254, illustrative: true,
    alt: {
      es: "Retrato de una mujer de tres cuartos sobre fondo azul claro", en: "Three-quarter portrait of a woman on a light blue background",
      pt: "Retrato de uma mulher em três quartos sobre fundo azul-claro", fr: "Portrait de trois quarts d'une femme sur fond bleu clair",
      de: "Halbprofil-Porträt einer Frau vor hellblauem Hintergrund", it: "Ritratto di tre quarti di una donna su sfondo azzurro",
      tr: "Açık mavi arka planda bir kadının yarım profil portresi", ar: "صورة لامرأة بزاوية ثلاثة أرباع على خلفية زرقاء فاتحة", zh: "浅蓝色背景下的女性四分之三侧面肖像",
    },
  },
} satisfies Record<string, SiteImage>;

export type ImageKey = keyof typeof IMAGES;

export const srcSet = (img: SiteImage, format: "avif" | "webp") =>
  img.widths.map((w) => `/images/${img.name}-${w}.${format} ${w}w`).join(", ");
export const fallbackSrc = (img: SiteImage) => `/images/${img.name}.jpg`;
