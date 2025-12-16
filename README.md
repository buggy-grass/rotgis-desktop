# RotGIS Desktop

Electron + TypeScript + React + Shadcn UI + Lucide React Icons + Webpack ile geliştirilmiş desktop uygulaması template'i.

## Özellikler

- ⚡ **Electron** - Cross-platform desktop uygulama framework'ü
- 🔷 **TypeScript** - Tip güvenli kod geliştirme
- ⚛️ **React** - Modern UI kütüphanesi
- 🎨 **Shadcn UI** - Güzel ve erişilebilir UI bileşenleri
- 🎯 **Lucide React Icons** - Modern icon seti
- 📦 **Webpack** - Module bundler
- 🌙 **Dark Mode** - Varsayılan dark tema

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run start:dev

# Production build
npm run build

# Build sonrası çalıştır
npm run build && npm start
```

## Proje Yapısı

```
rotgis-desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts
│   │   └── preload.ts
│   └── renderer/       # React uygulaması
│       ├── components/
│       │   └── ui/     # Shadcn UI bileşenleri
│       ├── lib/        # Yardımcı fonksiyonlar
│       ├── styles/     # CSS dosyaları
│       ├── App.tsx
│       ├── index.tsx
│       └── index.html
├── dist/               # Build çıktısı
├── webpack.config.js
├── tsconfig.json
└── tailwind.config.js
```

## Geliştirme

Uygulama geliştirme modunda çalıştırıldığında otomatik olarak hot-reload özelliği aktif olur. Kod değişiklikleriniz otomatik olarak yansır.

## Lisans

MIT

