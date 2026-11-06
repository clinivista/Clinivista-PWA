// Textos de la comparación avanzada de fotos (zoom sincronizado, superposición con transparencia y cortina), en los nueve idiomas.
import type { LangCode } from "./language";

export type CompareText = {
  open: string;
  title: string;
  before: string;
  after: string;
  modeSide: string;
  modeOverlay: string;
  modeWipe: string;
  opacity: string;
  wipe: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  close: string;
  hint: string;
  note: string;
};

export const COMPARE_TEXT: Record<LangCode, CompareText> = {
  es: {"open": "Comparar con zoom y transparencia", "title": "Comparar fotos", "before": "Antes", "after": "Después", "modeSide": "Lado a lado", "modeOverlay": "Superpuesta", "modeWipe": "Cortina", "opacity": "Transparencia de «Después»", "wipe": "Posición de la cortina", "zoomIn": "Acercar", "zoomOut": "Alejar", "reset": "Ajustar", "close": "Cerrar", "hint": "Un solo zoom y desplazamiento para las dos fotos: acerca y mueve una y la otra la sigue.", "note": "Comparación visual: solo vale si las fotos se tomaron con el mismo ángulo, distancia y luz. No es una medición."},
  en: {"open": "Compare with zoom and transparency", "title": "Compare photos", "before": "Before", "after": "After", "modeSide": "Side by side", "modeOverlay": "Overlay", "modeWipe": "Slider", "opacity": "“After” transparency", "wipe": "Slider position", "zoomIn": "Zoom in", "zoomOut": "Zoom out", "reset": "Fit", "close": "Close", "hint": "One zoom and pan for both photos: zoom and move one and the other follows.", "note": "Visual comparison: only valid if the photos were taken at the same angle, distance and light. It is not a measurement."},
  pt: {"open": "Comparar com zoom e transparência", "title": "Comparar fotos", "before": "Antes", "after": "Depois", "modeSide": "Lado a lado", "modeOverlay": "Sobreposta", "modeWipe": "Cortina", "opacity": "Transparência de «Depois»", "wipe": "Posição da cortina", "zoomIn": "Aproximar", "zoomOut": "Afastar", "reset": "Ajustar", "close": "Fechar", "hint": "Um só zoom e deslocamento para as duas fotos: aproxime e mova uma e a outra acompanha.", "note": "Comparação visual: só vale se as fotos foram tiradas com o mesmo ângulo, distância e luz. Não é uma medição."},
  fr: {"open": "Comparer avec zoom et transparence", "title": "Comparer les photos", "before": "Avant", "after": "Après", "modeSide": "Côte à côte", "modeOverlay": "Superposée", "modeWipe": "Rideau", "opacity": "Transparence de « Après »", "wipe": "Position du rideau", "zoomIn": "Zoomer", "zoomOut": "Dézoomer", "reset": "Ajuster", "close": "Fermer", "hint": "Un seul zoom et déplacement pour les deux photos : zoomez et déplacez-en une, l'autre suit.", "note": "Comparaison visuelle : valable seulement si les photos ont été prises sous le même angle, à la même distance et avec la même lumière. Ce n'est pas une mesure."},
  de: {"open": "Mit Zoom und Transparenz vergleichen", "title": "Fotos vergleichen", "before": "Vorher", "after": "Nachher", "modeSide": "Nebeneinander", "modeOverlay": "Überlagert", "modeWipe": "Schieber", "opacity": "Transparenz von „Nachher“", "wipe": "Position des Schiebers", "zoomIn": "Vergrößern", "zoomOut": "Verkleinern", "reset": "Einpassen", "close": "Schließen", "hint": "Ein gemeinsamer Zoom und Ausschnitt für beide Fotos: Zoomen und verschieben Sie eines, das andere folgt.", "note": "Visueller Vergleich: nur gültig, wenn die Fotos im gleichen Winkel, Abstand und Licht aufgenommen wurden. Keine Messung."},
  it: {"open": "Confronta con zoom e trasparenza", "title": "Confronta le foto", "before": "Prima", "after": "Dopo", "modeSide": "Affiancate", "modeOverlay": "Sovrapposte", "modeWipe": "Cursore", "opacity": "Trasparenza di «Dopo»", "wipe": "Posizione del cursore", "zoomIn": "Ingrandisci", "zoomOut": "Riduci", "reset": "Adatta", "close": "Chiudi", "hint": "Un solo zoom e spostamento per le due foto: ingrandisci e sposta una e l'altra la segue.", "note": "Confronto visivo: vale solo se le foto sono state scattate con lo stesso angolo, distanza e luce. Non è una misurazione."},
  tr: {"open": "Yakınlaştırma ve saydamlıkla karşılaştır", "title": "Fotoğrafları karşılaştır", "before": "Önce", "after": "Sonra", "modeSide": "Yan yana", "modeOverlay": "Üst üste", "modeWipe": "Perde", "opacity": "«Sonra» saydamlığı", "wipe": "Perde konumu", "zoomIn": "Yakınlaştır", "zoomOut": "Uzaklaştır", "reset": "Sığdır", "close": "Kapat", "hint": "İki fotoğraf için tek yakınlaştırma ve kaydırma: birini yakınlaştırıp kaydırın, diğeri onu izler.", "note": "Görsel karşılaştırma: yalnızca fotoğraflar aynı açı, mesafe ve ışıkta çekildiyse geçerlidir. Ölçüm değildir."},
  ar: {"open": "قارن مع التكبير والشفافية", "title": "مقارنة الصور", "before": "قبل", "after": "بعد", "modeSide": "جنبًا إلى جنب", "modeOverlay": "متراكبة", "modeWipe": "شريط منزلق", "opacity": "شفافية «بعد»", "wipe": "موضع الشريط", "zoomIn": "تكبير", "zoomOut": "تصغير", "reset": "ملاءمة", "close": "إغلاق", "hint": "تكبير وتحريك واحد للصورتين: كبّر إحداهما وحرّكها وستتبعها الأخرى.", "note": "مقارنة بصرية: لا تصح إلا إذا التُقطت الصور بالزاوية والمسافة والإضاءة نفسها. وليست قياسًا."},
  zh: {"open": "缩放与透明度对比", "title": "对比照片", "before": "之前", "after": "之后", "modeSide": "并排", "modeOverlay": "叠加", "modeWipe": "滑动对比", "opacity": "“之后”的透明度", "wipe": "滑块位置", "zoomIn": "放大", "zoomOut": "缩小", "reset": "适应", "close": "关闭", "hint": "两张照片共用同一缩放和平移：放大并移动一张，另一张随之同步。", "note": "视觉对比：仅当照片以相同角度、距离和光线拍摄时才有效，并非测量。"},
};
