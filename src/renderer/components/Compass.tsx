import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import '../services/EventEmitter';

interface CompassProps {
  className?: string;
}

const Compass: React.FC<CompassProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [rotation, setRotation] = useState<number>(0); // Y ekseni rotasyonu (yaw)

  // EventEmitter'dan camera rotation değişikliklerini dinle
  useEffect(() => {
    const handleRotationChange = (data: { yaw: number }) => {
      setRotation(data.yaw);
    };

    // EventEmitter'a abone ol
    if (window.eventBus) {
      window.eventBus.on('camera-rotation-changed', handleRotationChange);
    }

    // Cleanup
    return () => {
      if (window.eventBus) {
        window.eventBus.off('camera-rotation-changed', handleRotationChange);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CSS variable'ları gerçek renk değerlerine çevir
    const getCSSColor = (varName: string, fallback: string = '#000000'): string => {
      const style = getComputedStyle(document.documentElement);
      const value = style.getPropertyValue(varName).trim();
      if (value) {
        // HSL formatı ise RGB'ye çevir
        if (value.includes('hsl')) {
          return value; // HSL'i doğrudan kullanabiliriz
        }
        // Virgülle ayrılmış HSL değerleri ise (örn: "0 0% 7.8%")
        const hslMatch = value.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)/);
        if (hslMatch) {
          return `hsl(${hslMatch[1]}, ${hslMatch[2]}, ${hslMatch[3]})`;
        }
      }
      return fallback;
    };

    // Canvas boyutunu ayarla (yüksek çözünürlük için scale)
    const dpr = window.devicePixelRatio || 1;
    const size = 75.9; // Pusula boyutu (%15 büyütüldü)
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 5;

    // 3D görünümlü pusula çizimi
    const drawCompass = () => {
      // Renkleri al
      const cardColor = getCSSColor('--card', 'hsl(0, 0%, 10%)');
      const mutedColor = getCSSColor('--muted', 'hsl(0, 0%, 16.5%)');
      const borderColor = getCSSColor('--border', 'hsl(0, 0%, 16.5%)');
      const backgroundColor = getCSSColor('--background', 'hsl(0, 0%, 7.8%)');
      const foregroundColor = getCSSColor('--foreground', 'hsl(0, 0%, 90%)');
      const primaryColor = getCSSColor('--primary', 'hsl(0, 0%, 23%)');

      // Canvas'ı temizle (şeffaf)
      ctx.clearRect(0, 0, size, size);

      // Dış halka (3D görünüm için gradient)
      const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 5);
      outerGradient.addColorStop(0, mutedColor);
      outerGradient.addColorStop(0.7, mutedColor);
      outerGradient.addColorStop(1, borderColor);
      
      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
      ctx.fill();

      // İç halka (pusula yüzeyi)
      const innerGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
      innerGradient.addColorStop(0, backgroundColor);
      innerGradient.addColorStop(0.5, cardColor);
      innerGradient.addColorStop(1, mutedColor);
      
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Yön işaretleri (N, S, E, W)
      const directions = [
        { text: 'N', angle: 0, color: 'rgb(239, 68, 68)' }, // Kırmızı (Kuzey)
        { text: 'E', angle: 90, color: foregroundColor },
        { text: 'S', angle: 180, color: foregroundColor },
        { text: 'W', angle: 270, color: foregroundColor },
      ];

      directions.forEach((dir) => {
        const angle = ((dir.angle - rotation) * Math.PI) / 180;
        const x = centerX + Math.sin(angle) * (radius - 7.5);
        const y = centerY - Math.cos(angle) * (radius - 7.5);

        // Nokta işareti
        ctx.fillStyle = dir.color;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = dir.color;
        ctx.font = dir.text === 'N' ? 'bold 7px sans-serif' : '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 1;
        ctx.fillText(dir.text, x, y - 6);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });

      // Küçük yön çizgileri (her 30 derecede)
      for (let i = 0; i < 12; i++) {
        const angle = ((i * 30 - rotation) * Math.PI) / 180;
        const isMajor = i % 3 === 0; // Her 90 derecede büyük çizgi
        
        const startRadius = radius - (isMajor ? 6 : 4);
        const endRadius = radius - 1;
        
        const x1 = centerX + Math.sin(angle) * startRadius;
        const y1 = centerY - Math.cos(angle) * startRadius;
        const x2 = centerX + Math.sin(angle) * endRadius;
        const y2 = centerY - Math.cos(angle) * endRadius;

        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = isMajor ? 1 : 0.5;
        ctx.globalAlpha = isMajor ? 1 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Merkez nokta ve gölge
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      // İç gölge efekti
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX - 1, centerY - 1, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pusula iğnesi (Kuzey-Güney)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((-rotation * Math.PI) / 180);

      // Kuzey iğnesi (kırmızı, üçgen)
      ctx.fillStyle = 'rgb(239, 68, 68)';
      ctx.beginPath();
      ctx.moveTo(0, -radius + 2.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 7.5);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();

      // Güney iğnesi (beyaz/gri, üçgen)
      ctx.fillStyle = foregroundColor;
      ctx.beginPath();
      ctx.moveTo(0, radius - 2.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, -7.5);
      ctx.lineTo(3, 0);
      ctx.closePath();
      ctx.fill();

      // İğne merkez noktası
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      drawCompass();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Başlat
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rotation]);

  return (
    <div
      className={cn(
        'relative',
        className
      )}
      style={{ backgroundColor: 'transparent' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'auto', backgroundColor: 'transparent' }}
      />
    </div>
  );
};

export default Compass;

