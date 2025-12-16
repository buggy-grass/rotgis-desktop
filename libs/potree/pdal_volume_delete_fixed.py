import json, math, numpy as np
import pdal

# Bu kod, Potree BoxVolume'den gelen değerlerle PDAL'da nokta silme işlemi yapar

def rot_matrix(yaw, pitch, roll):
    """
    Yaw-Pitch-Roll (ZYX sırası) rotasyon matrisi
    Yaw: Z ekseni etrafında dönüş
    Pitch: Y ekseni etrafında dönüş
    Roll: X ekseni etrafında dönüş
    """
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    
    # ZYX sırası (önce Z, sonra Y, sonra X)
    Rz = np.array([[cy, -sy, 0],
                   [sy,  cy, 0],
                   [ 0,   0, 1]])
    
    Ry = np.array([[ cp, 0, sp],
                   [  0, 1,  0],
                   [-sp, 0, cp]])
    
    Rx = np.array([[1,  0,   0],
                   [0, cr, -sr],
                   [0, sr,  cr]])
    
    # ZYX sırası: R = Rz * Ry * Rx
    return Rz @ Ry @ Rx


def get_volume_aabb(px, py, pz, sx, sy, sz, yaw, pitch, roll):
    """
    BoxVolume'ün AABB'sini hesapla
    
    Args:
        px, py, pz: Volume pozisyonu (merkez)
        sx, sy, sz: Volume scale (genişlik, uzunluk, yükseklik)
        yaw, pitch, roll: Rotasyon açıları (radyan)
    
    Returns:
        (xmin, ymin, zmin, xmax, ymax, zmax)
    """
    # Yarı boyutlar (merkezden köşelere olan mesafe)
    hx, hy, hz = sx / 2.0, sy / 2.0, sz / 2.0
    
    # Local space'deki 8 köşe noktası (merkez 0,0,0'da)
    corners_local = np.array([
        [-hx, -hy, -hz],  # 0: sol-alt-ön
        [ hx, -hy, -hz],  # 1: sağ-alt-ön
        [ hx,  hy, -hz],  # 2: sağ-üst-ön
        [-hx,  hy, -hz],  # 3: sol-üst-ön
        [-hx, -hy,  hz],  # 4: sol-alt-arka
        [ hx, -hy,  hz],  # 5: sağ-alt-arka
        [ hx,  hy,  hz],  # 6: sağ-üst-arka
        [-hx,  hy,  hz],  # 7: sol-üst-arka
    ])
    
    # Rotasyon matrisi
    R = rot_matrix(yaw, pitch, roll)
    
    # Köşeleri döndür (her köşe bir sütun vektör olarak)
    corners_rotated = (R @ corners_local.T).T
    
    # Pozisyonu ekle (dünya koordinatlarına taşı)
    corners_world = corners_rotated.copy()
    corners_world[:, 0] += px
    corners_world[:, 1] += py
    corners_world[:, 2] += pz
    
    # AABB hesapla
    xmin, ymin, zmin = corners_world.min(axis=0)
    xmax, ymax, zmax = corners_world.max(axis=0)
    
    return xmin, ymin, zmin, xmax, ymax, zmax


def pdal_volume_delete(input_file, output_file, px, py, pz, sx, sy, sz, yaw, pitch, roll):
    """
    BoxVolume içindeki noktaları sil
    
    Args:
        input_file: Giriş LAZ dosyası
        output_file: Çıkış LAZ dosyası
        px, py, pz: Volume pozisyonu
        sx, sy, sz: Volume scale (genişlik, uzunluk, yükseklik)
        yaw, pitch, roll: Rotasyon açıları (radyan)
    """
    # AABB hesapla
    xmin, ymin, zmin, xmax, ymax, zmax = get_volume_aabb(px, py, pz, sx, sy, sz, yaw, pitch, roll)
    
    # Debug: AABB değerlerini yazdır
    print("=" * 60)
    print("Volume AABB (Axis-Aligned Bounding Box):")
    print(f"  X: [{xmin:.6f}, {xmax:.6f}] (size: {xmax-xmin:.6f})")
    print(f"  Y: [{ymin:.6f}, {ymax:.6f}] (size: {ymax-ymin:.6f})")
    print(f"  Z: [{zmin:.6f}, {zmax:.6f}] (size: {zmax-zmin:.6f})")
    print("=" * 60)
    
    # AABB kontrolü
    if abs(xmax - xmin) < 1e-6 or abs(ymax - ymin) < 1e-6 or abs(zmax - zmin) < 1e-6:
        raise ValueError(f"Invalid AABB: At least one axis has zero size. "
                        f"X: {xmax-xmin:.6f}, Y: {ymax-ymin:.6f}, Z: {zmax-zmin:.6f}")
    
    # PDAL pipeline
    # outside=True: Box DIŞINDAKİ noktaları al (yani box içindekileri SİL)
    pipeline = {
        "pipeline": [
            {"type": "readers.las", "filename": input_file},
            
            # Box dışındaki noktaları al (box içindekileri sil)
            {
                "type": "filters.crop",
                "bounds": f"([{xmin},{xmax}], [{ymin},{ymax}], [{zmin},{zmax}])",
                "outside": True  # True = box dışındakileri al (içindekileri sil)
            },
            
            {"type": "writers.las", "filename": output_file}
        ]
    }
    
    try:
        pipeline_obj = pdal.Pipeline(json.dumps(pipeline))
        pipeline_obj.execute()
        
        metadata = pipeline_obj.metadata
        stats = pipeline_obj.stats
        
        print(f"\n✓ Point cloud processed successfully!")
        print(f"  Input:  {input_file}")
        print(f"  Output: {output_file}")
        
        # İstatistikleri yazdır
        if 'metadata' in metadata:
            m = metadata['metadata']
            if 'filters.crop' in m:
                crop_info = m['filters.crop']
                if 'num_points' in crop_info:
                    print(f"  Points after crop: {crop_info['num_points']}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ PDAL Pipeline Error: {e}")
        print(f"  Pipeline JSON:")
        print(json.dumps(pipeline, indent=2))
        raise


# Örnek kullanım:
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="PDAL Volume Delete - BoxVolume içindeki noktaları sil")
    
    parser.add_argument("--i", required=True, type=str, help="Input LAZ file")
    parser.add_argument("--o", required=True, type=str, help="Output LAZ file")
    
    # Potree Volume position
    parser.add_argument("--px", required=True, type=float, help="Volume position X")
    parser.add_argument("--py", required=True, type=float, help="Volume position Y")
    parser.add_argument("--pz", required=True, type=float, help="Volume position Z")
    
    # Potree Volume scale (genişlik, uzunluk, yükseklik)
    parser.add_argument("--sx", required=True, type=float, help="Volume scale X (width)")
    parser.add_argument("--sy", required=True, type=float, help="Volume scale Y (length)")
    parser.add_argument("--sz", required=True, type=float, help="Volume scale Z (height)")
    
    # Potree Volume rotation (radyan)
    parser.add_argument("--yaw", required=True, type=float, help="Yaw angle (radians)")
    parser.add_argument("--pitch", required=True, type=float, help="Pitch angle (radians)")
    parser.add_argument("--roll", required=True, type=float, help="Roll angle (radians)")
    
    args = parser.parse_args()
    
    # Kontroller
    if args.sx <= 0 or args.sy <= 0 or args.sz <= 0:
        raise ValueError(f"Scale values must be positive: sx={args.sx}, sy={args.sy}, sz={args.sz}")
    
    # İşlemi çalıştır
    pdal_volume_delete(
        args.i, args.o,
        args.px, args.py, args.pz,
        args.sx, args.sy, args.sz,
        args.yaw, args.pitch, args.roll
    )




