import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface FPSMeterProps {
  className?: string;
}

const FPSMeter: React.FC<FPSMeterProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fpsHistoryRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const [currentFPS, setCurrentFPS] = useState<number>(0);
  const maxHistoryLength = 60; // Son 60 frame'i sakla
  const potreeFrameTimeRef = useRef<number[]>([]); // Potree frame zamanları
  const lastPotreeFrameRef = useRef<number>(0);
  const smoothFPSRef = useRef<number>(0); // Smooth geçiş için interpolated FPS
  const targetFPSRef = useRef<number>(0); // Hedef FPS değeri

  // Potree render loop'una bağlan
  useEffect(() => {
    const checkPotreeViewer = () => {
      if ((window as any).viewer && (window as any).viewer.renderer) {
        const viewer = (window as any).viewer;
        
        // Potree'nin update event'ini dinle
        const onPotreeUpdate = () => {
          const now = performance.now();
          potreeFrameTimeRef.current.push(now);
          
          // Son 1 saniyede kaç frame olduğunu hesapla
          const oneSecondAgo = now - 1000;
          potreeFrameTimeRef.current = potreeFrameTimeRef.current.filter(
            (time) => time > oneSecondAgo
          );
          
          const potreeFPS = potreeFrameTimeRef.current.length;
          lastPotreeFrameRef.current = potreeFPS;
        };

        viewer.addEventListener('update', onPotreeUpdate);

        return () => {
          viewer.removeEventListener('update', onPotreeUpdate);
        };
      }
      return null;
    };

    // Potree viewer hazır olana kadar bekle
    const interval = setInterval(() => {
      const cleanup = checkPotreeViewer();
      if (cleanup) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutunu ayarla (yüksek çözünürlük için scale)
    const dpr = window.devicePixelRatio || 1;
    const width = 100;
    const height = 60;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Daha gerçekçi 3D bar çizimi
    const draw3DBar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      barWidth: number,
      barHeight: number,
      depth: number,
      color: string,
      isHighlight: boolean = false
    ) => {
      if (barHeight <= 0) return;

      // Gradient oluştur (daha gerçekçi görünüm)
      const gradient = ctx.createLinearGradient(x, y - barHeight, x, y);
      const baseColor = color;
      
      // Renk parse et
      const rgb = baseColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        
        // Üst kısım daha açık
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
        // Alt kısım daha koyu
        gradient.addColorStop(1, `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.9)`);
      }

      // Ana bar (ön yüz) - gradient ile
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y - barHeight, barWidth, barHeight);

      // Üst yüz (3D derinlik) - highlight efekti
      if (barHeight > 0) {
        const topGradient = ctx.createLinearGradient(
          x, y - barHeight,
          x + depth, y - barHeight - depth
        );
        topGradient.addColorStop(0, isHighlight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)');
        topGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(x, y - barHeight);
        ctx.lineTo(x + depth, y - barHeight - depth);
        ctx.lineTo(x + barWidth + depth, y - barHeight - depth);
        ctx.lineTo(x + barWidth, y - barHeight);
        ctx.closePath();
        ctx.fill();
      }

      // Sağ yüz (3D derinlik) - shadow efekti
      if (barHeight > 0) {
        const sideGradient = ctx.createLinearGradient(
          x + barWidth, y - barHeight,
          x + barWidth + depth, y - barHeight - depth
        );
        sideGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        sideGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = sideGradient;
        ctx.beginPath();
        ctx.moveTo(x + barWidth, y - barHeight);
        ctx.lineTo(x + barWidth + depth, y - barHeight - depth);
        ctx.lineTo(x + barWidth + depth, y - depth);
        ctx.lineTo(x + barWidth, y);
        ctx.closePath();
        ctx.fill();
      }

      // Border (ön yüz) - daha ince ve yumuşak
      // ctx.strokeStyle = isHighlight 
      //   ? 'rgba(106, 167, 130, 0.6)' 
      //   : 'rgba(0, 0, 0, 0.2)';
      // ctx.lineWidth = isHighlight ? 1.5 : 0.5;
      // ctx.strokeRect(x, y - barHeight, barWidth, barHeight);
    };

    const draw = () => {
      // Canvas'ı temizle
      ctx.fillStyle = 'hsl(var(--card))';
      ctx.fillRect(0, 0, width, height);

      // FPS metni (yeşil renk, görünür) - ÜSTTE
      // Önce arka plan (okunabilirlik için)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(width / 2 - 35, 2, 70, 18);
      
      // Yeşil renk
      ctx.fillStyle = 'rgba(17, 137, 61, 1)'; // Yeşil renk
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(`${currentFPS.toFixed(0)} FPS`, width / 2, 11);

      // Yazının altından başlayacak şekilde çubuklar için alan
      const textBottom = 22; // Yazının alt kenarı
      const chartTop = textBottom + 10; // Çubukların başlangıç yeri
      const chartHeight = height - chartTop - 15; // Çubuklar için kalan alan

      // Grid arka plan (çubukların olduğu alanda)
      ctx.strokeStyle = 'hsl(var(--muted))';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 10; i++) {
        const gridY = height - 10 - (i * chartHeight / 10);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, gridY);
        ctx.lineTo(width, gridY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // FPS barları çiz (yazının altında, tam soldan başlayarak)
      const barWidth = width / maxHistoryLength;
      // const barSpacing = 0;
      const maxBarHeight = chartHeight;
      const depth = 2.5; // 3D derinlik

      fpsHistoryRef.current.forEach((fps, index) => {
        const barHeight = Math.max(1, (fps / 60) * maxBarHeight); // Minimum 1px
        const x = index * barWidth; // Tam soldan başla (0'dan)
        const y = height - 10; // Alt kenar

        // Renk: FPS'e göre (yeşil -> sarı -> kırmızı) - daha canlı renkler
        let color: string;
        if (fps >= 50) {
          color = 'rgb(34, 197, 94)'; // Yeşil - daha canlı
        } else if (fps >= 30) {
          color = 'rgb(234, 179, 8)'; // Sarı - daha canlı
        } else {
          color = 'rgb(239, 68, 68)'; // Kırmızı - daha canlı
        }

        // Son birkaç bar'ı highlight et (smooth geçiş)
        const isHighlight = index >= fpsHistoryRef.current.length - 3;

        draw3DBar(ctx, x, y, barWidth, barHeight, depth, color, isHighlight);
      });

      // Min/Max değerleri (daha küçük font)
      ctx.fillStyle = 'hsl(var(--muted-foreground))';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('0', 0, height - 3);
      ctx.textAlign = 'right';
      ctx.fillText('60', width, height - 3);
    };

    const updateFPS = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      frameCountRef.current++;

      // Potree FPS'ini kullan (eğer varsa), yoksa genel FPS'i kullan
      let fps = lastPotreeFrameRef.current || 0;
      
      // Her 500ms'de bir FPS hesapla (daha smooth için)
      if (deltaTime >= 500) {
        if (fps === 0) {
          // Potree yoksa genel FPS'i hesapla
          fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        }
        
        // Hedef FPS'i güncelle
        targetFPSRef.current = fps;
        setCurrentFPS(fps);

        // Reset
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      // Smooth interpolation (her frame'de yumuşak geçiş)
      const smoothingFactor = 0.15; // 0-1 arası, daha küçük = daha smooth
      smoothFPSRef.current += (targetFPSRef.current - smoothFPSRef.current) * smoothingFactor;
      
      // Smooth FPS'i geçmişe ekle (smooth geçiş için)
      const smoothFPS = Math.round(smoothFPSRef.current);
      fpsHistoryRef.current.push(smoothFPS);
      if (fpsHistoryRef.current.length > maxHistoryLength) {
        fpsHistoryRef.current.shift();
      }

      // Her frame'de çiz (smooth animasyon için)
      draw();

      animationFrameRef.current = requestAnimationFrame(updateFPS);
    };

    // Başlat
    animationFrameRef.current = requestAnimationFrame(updateFPS);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentFPS]);

  return (
    <div
      className={cn(
        'relative rounded-lg border border-border bg-card p-1 shadow-lg',
        className
      )}
      style={{ opacity: 0.9, borderRadius: '2px' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
};

export default FPSMeter;
