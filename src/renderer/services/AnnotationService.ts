class AnnotationService {
  static add(title: string, description: string) {
    if (!window.viewer || !window.Potree) {
      return;
    }

    const annotation = window.viewer.annotationTool.startInsertion({
      title: title,
      description: description,
    });
    console.error(annotation);
  }
}

export default AnnotationService;
