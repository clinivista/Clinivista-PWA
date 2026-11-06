// Textos del visor giratorio de fotos de la ficha, en los nueve idiomas.
import type { LangCode } from "./language";

export type TurntableText = { title: string; prev: string; next: string; play: string; pause: string; top: string; hint: string; note: string };

export const TURNTABLE_TEXT: Record<LangCode, TurntableText> = {
  es: {"title": "Vista giratoria", "prev": "Girar a la izquierda", "next": "Girar a la derecha", "play": "Girar sola", "pause": "Detener", "top": "Superior", "hint": "Arrastra la foto para girar la cabeza", "note": "Es un recorrido por las fotos, no un modelo 3D medido: no sirve para medir."},
  en: {"title": "Turntable view", "prev": "Rotate left", "next": "Rotate right", "play": "Auto-rotate", "pause": "Stop", "top": "Top", "hint": "Drag the photo to turn the head", "note": "A walk-through of the photos, not a measured 3D model: not for measuring."},
  pt: {"title": "Vista giratória", "prev": "Girar para a esquerda", "next": "Girar para a direita", "play": "Girar sozinha", "pause": "Parar", "top": "Superior", "hint": "Arraste a foto para girar a cabeça", "note": "É um percurso pelas fotos, não um modelo 3D medido: não serve para medir."},
  fr: {"title": "Vue rotative", "prev": "Tourner à gauche", "next": "Tourner à droite", "play": "Rotation auto", "pause": "Arrêter", "top": "Dessus", "hint": "Faites glisser la photo pour tourner la tête", "note": "Simple parcours des photos, pas un modèle 3D mesuré : ne sert pas à mesurer."},
  de: {"title": "Drehansicht", "prev": "Nach links drehen", "next": "Nach rechts drehen", "play": "Automatisch drehen", "pause": "Anhalten", "top": "Oben", "hint": "Ziehen Sie das Foto, um den Kopf zu drehen", "note": "Ein Rundgang durch die Fotos, kein vermessenes 3D-Modell: nicht zum Messen geeignet."},
  it: {"title": "Vista rotante", "prev": "Ruota a sinistra", "next": "Ruota a destra", "play": "Rotazione automatica", "pause": "Ferma", "top": "Alto", "hint": "Trascina la foto per girare la testa", "note": "È un percorso tra le foto, non un modello 3D misurato: non serve per misurare."},
  tr: {"title": "Döner görünüm", "prev": "Sola döndür", "next": "Sağa döndür", "play": "Otomatik döndür", "pause": "Durdur", "top": "Üst", "hint": "Başı çevirmek için fotoğrafı sürükleyin", "note": "Fotoğraflar arasında bir gezintidir, ölçülmüş 3B model değildir: ölçüm için uygun değildir."},
  ar: {"title": "عرض دوّار", "prev": "تدوير لليسار", "next": "تدوير لليمين", "play": "تدوير تلقائي", "pause": "إيقاف", "top": "علوي", "hint": "اسحب الصورة لتدوير الرأس", "note": "جولة بين الصور وليست نموذجًا ثلاثي الأبعاد مقيسًا: لا تصلح للقياس."},
  zh: {"title": "旋转视图", "prev": "向左旋转", "next": "向右旋转", "play": "自动旋转", "pause": "停止", "top": "顶部", "hint": "拖动照片以转动头部", "note": "这只是照片的浏览，不是经过测量的 3D 模型：不能用于测量。"},
};
