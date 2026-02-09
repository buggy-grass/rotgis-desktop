import ProjectActions from "../store/actions/ProjectActions";
import type { AnnotationLayer } from "../types/ProjectTypes";

/** Bekleyen ekleme: annotation yerleştirildiğinde Redux'a yazmak için */
interface PendingInsertion {
  pointCloudId: string;
  title: string;
  content: string;
}

let pendingInsertion: PendingInsertion | null = null;

function handleAnnotationPlaced(data: { annotation: any }) {
  const pending = pendingInsertion;
  if (!pending) return;

  const annotation = data.annotation;
  if (!annotation?.position) return;

  const id = annotation.uuid || `annotation-${Date.now()}`;
  const position: [number, number, number] = [
    annotation.position.x,
    annotation.position.y,
    annotation.position.z,
  ];
  const extent = {
    min: { x: position[0], y: position[1], z: position[2] },
    max: { x: position[0], y: position[1], z: position[2] },
  };

  const layer: AnnotationLayer = {
    id,
    name: pending.title,
    type: "annotation",
    visible: true,
    pointCloudId: pending.pointCloudId,
    title: pending.title,
    content: pending.content,
    position,
    extent,
  };

  ProjectActions.addAnnotationLayer(pending.pointCloudId, layer);
  pendingInsertion = null;
}

/** eventBus listener bir kez kaydedilsin */
let listenerRegistered = false;

function ensureListener() {
  if (listenerRegistered || typeof window === "undefined" || !window.eventBus) return;
  listenerRegistered = true;
  window.eventBus.on("annotation_placed", handleAnnotationPlaced);
}

class AnnotationService {
  /**
   * Annotation ekleme modunu başlatır: kullanıcı sahneye tıklayarak nokta seçer,
   * yerleştirilen annotation modelData.id ile eşleşen nokta bulutuna Redux ve projeye yazılır.
   * @param title Başlık (header)
   * @param content İçerik (açıklama)
   * @param pointCloudId Nokta bulutu ID'si (örn. statusBarReducer.modelData.id)
   */
  static startInsertion(title: string, content: string, pointCloudId: string): void {
    if (!window.viewer?.annotationTool) {
      console.warn("AnnotationService: viewer or annotationTool not available");
      return;
    }
    if (!pointCloudId) {
      console.warn("AnnotationService: pointCloudId is required");
      return;
    }

    ensureListener();
    pendingInsertion = { pointCloudId, title, content };

    window.viewer.annotationTool.startInsertion({
      title,
      description: content,
    });
  }

  /** Bekleyen eklemeyi iptal eder (örn. kullanıcı iptal ederse) */
  static clearPending(): void {
    pendingInsertion = null;
  }
}

export default AnnotationService;
