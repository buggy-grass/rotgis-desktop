# NVIDIA GPU Kurulum Kılavuzu

Electron uygulamasının NVIDIA GPU'yu kullanması için aşağıdaki adımları izleyin:

## Otomatik Yöntem (Kod ile)

Kod içinde zaten NVIDIA GPU'yu zorlamak için optimizasyonlar yapıldı:
- DirectX 11 kullanımı (`use-angle=d3d11`)
- GPU sandbox devre dışı
- High-performance GPU tercihi

## Manuel Yöntem (Windows Graphics Settings)

Eğer hala Intel GPU kullanılıyorsa, Windows Graphics Settings'ten manuel olarak ayarlayın:

### Yöntem 1: Windows Graphics Settings

1. **Windows Ayarlar** > **Sistem** > **Ekran** > **Grafik ayarları**
2. **Klasik uygulama** seçin
3. **Gözat** butonuna tıklayın
4. Electron uygulamanızın `.exe` dosyasını seçin:
   - Development: `node_modules\.bin\electron.cmd` veya `node_modules\electron\dist\electron.exe`
   - Production: Uygulamanızın `.exe` dosyası
5. **Seçenekler** butonuna tıklayın
6. **Yüksek performans** seçin (NVIDIA GPU)
7. **Kaydet**

### Yöntem 2: NVIDIA Control Panel

1. **NVIDIA Control Panel**'i açın
2. **Manage 3D Settings** > **Program Settings**
3. **Add** butonuna tıklayın
4. Electron uygulamanızı seçin
5. **Preferred graphics processor** için **High-performance NVIDIA processor** seçin
6. **Apply**

### Yöntem 3: Ortam Değişkenleri (Gelişmiş)

Uygulamayı başlatmadan önce ortam değişkenlerini ayarlayın:

```powershell
# PowerShell'de
$env:__GL_SYNC_TO_VBLANK = "0"
$env:__GL_THREADED_OPTIMIZATIONS = "1"
$env:__GL_YIELD = "NOTHING"
$env:DXGI_DEBUG_DEVICE = "1"
```

## GPU Kontrolü

Uygulama başladığında console'da şu mesajları göreceksiniz:

- ✅ **NVIDIA GPU detected and active!** - NVIDIA GPU başarıyla kullanılıyor
- ⚠️ **NVIDIA GPU not detected** - Hala Intel GPU kullanılıyor (yukarıdaki adımları uygulayın)

## Sorun Giderme

### Hala Intel GPU görünüyorsa:

1. Uygulamayı tamamen kapatın
2. Windows Graphics Settings'ten NVIDIA GPU'ya atayın
3. Uygulamayı yeniden başlatın
4. Console'da GPU bilgisini kontrol edin

### DirectX 11 hatası alıyorsanız:

1. NVIDIA driver'ınızı güncelleyin
2. DirectX 11'in yüklü olduğundan emin olun
3. `use-angle=gl` kullanmayı deneyin (kod içinde)

## Performans İpuçları

NVIDIA GPU kullanıldığında:
- Potree point cloud rendering çok daha hızlı olacak
- WebGL performansı artacak
- GPU memory kullanımı optimize edilecek
- FPS artacak

