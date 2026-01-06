/**
 * Potree Background Service
 * Gradient skybox ve grid zemin için custom background modları
 */

class PotreeBackgroundService {
  /**
   * Gradient skybox ve grid zemin ile yeni background modu ekler
   */
  static setupGradientGridBackground(viewer: any) {
    if (!viewer || !viewer.scene) {
      console.warn('Potree viewer veya scene bulunamadı');
      return;
    }

    // Eğer zaten setup edilmişse, tekrar setup etme
    if (viewer.scene.sceneBG && viewer.scene.sceneBG.getObjectByName('gradient_skybox')) {
      return; // Zaten setup edilmiş, tekrar yapma
    }

    const THREE = (window as any).THREE;
    if (!THREE) {
      console.warn('THREE.js bulunamadı');
      return;
    }

    // Gradient skybox texture oluştur (maksimum boyut = çizgisiz smooth gradient)
    const gradientTexture = this.createGradientSkyboxTexture(4096, 4096);

    // SceneBG'yi kontrol et veya oluştur
    if (!viewer.scene.sceneBG) {
      viewer.scene.sceneBG = new THREE.Scene();
    }
    if (!viewer.scene.cameraBG) {
      viewer.scene.cameraBG = new THREE.Camera();
    }

    // Gradient skybox için plane (arka plan) - tüm ekranı kaplasın
    const skyboxPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 1),
      new THREE.MeshBasicMaterial({
        map: gradientTexture,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    skyboxPlane.name = 'gradient_skybox';
    skyboxPlane.position.z = -1; // Arka planda

    // Eski gradient-grid elemanlarını temizle
    const existingSkybox = viewer.scene.sceneBG.getObjectByName('gradient_skybox');
    const existingGrid = viewer.scene.sceneBG.getObjectByName('grid_ground');
    if (existingSkybox) viewer.scene.sceneBG.remove(existingSkybox);
    if (existingGrid) viewer.scene.sceneBG.remove(existingGrid);

    // Yeni skybox plane'i ekle (gradient skybox)
    viewer.scene.sceneBG.add(skyboxPlane);

    // Background modunu extend et
    const originalSetBackground = viewer.setBackground.bind(viewer);
    viewer.setBackground = function(bg: string) {
      if (bg === 'gradient-grid') {
        this.background = 'gradient-grid';
        this.dispatchEvent({ type: 'background_changed', viewer: this });
      } else {
        originalSetBackground(bg);
      }
    };

    // Potree'nin render mekanizmasını patch et
    // Gradient-grid'i gradient gibi render et (sceneBG.render kullanarak)
    this.patchRenderFunction(viewer);
  }

  /**
   * Render fonksiyonunu patch ederek gradient-grid modunu destekler
   * Not: potree.js dosyasında render fonksiyonlarına gradient-grid kontrolü eklendi
   */
  private static patchRenderFunction(_viewer: any) {
    // potree.js'de tüm render fonksiyonlarına gradient-grid kontrolü eklendi
    // Bu fonksiyon şimdilik boş, ileride ek özellikler için kullanılabilir
  }

  /**
   * Gradient skybox texture oluşturur (siyahtan griye geçiş)
   */
  private static createGradientSkyboxTexture(width: number, height: number): any {
    const THREE = (window as any).THREE;
    const size = width * height;
    const data = new Uint8Array(3 * size); // RGB

    // Gradient renkleri (üst: siyah, alt: koyu gri) - siyahtan griye geçiş
    const topColor = { r: 32, g: 32, b: 32 }; // Siyah (üst)
    const bottomColor = { r: 32, g: 32, b: 32 }; // Koyu gri (alt - siyaha yakın)

    // Perfect smooth gradient - çizgisiz geçiş için
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const i = x + width * y;
        
        // Y pozisyonuna göre gradient (y=0 üst, y=height alt)
        // Perfect smooth için merkez nokta kullan (sub-pixel precision)
        const t = (y + 5) / height; // 0-1 arası
        
        // Pure linear interpolation (en smooth, easing yok - çizgi yok)
        const r = topColor.r * (1 - t) + bottomColor.r * t;
        const g = topColor.g * (1 - t) + bottomColor.g * t;
        const b = topColor.b * (1 - t) + bottomColor.b * t;

        // Yuvarlama (high precision ile çizgi olmaz)
        data[3 * i + 0] = Math.round(r);
        data[3 * i + 1] = Math.round(g);
        data[3 * i + 2] = Math.round(b);
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
    texture.needsUpdate = true;
    
    // Smooth gradient için filtering ayarları
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; // Mipmap'e gerek yok, smooth gradient için
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }
}

export default PotreeBackgroundService;

