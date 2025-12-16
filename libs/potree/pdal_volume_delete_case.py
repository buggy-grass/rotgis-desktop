elif args.run == "pdalVolumeDelete":
    import json, math, numpy as np
    
    parser.add_argument("--i", required=True, type=str, help="Input LAZ")
    parser.add_argument("--o", required=True, type=str, help="Output LAZ")
    
    # Potree Volume position
    parser.add_argument("--px", required=True, type=float)
    parser.add_argument("--py", required=True, type=float)
    parser.add_argument("--pz", required=True, type=float)
    
    # Potree Volume scale (genişlik, uzunluk, yükseklik)
    parser.add_argument("--sx", required=True, type=float)
    parser.add_argument("--sy", required=True, type=float)
    parser.add_argument("--sz", required=True, type=float)
    
    # Potree Volume rotation - ÜÇ YÖNTEM:
    # 1) Quaternion (ÖNERİLEN - Potree'de highlight quaternion'a göre yapılıyor!)
    parser.add_argument("--qx", required=False, type=float, help="Quaternion x component")
    parser.add_argument("--qy", required=False, type=float, help="Quaternion y component")
    parser.add_argument("--qz", required=False, type=float, help="Quaternion z component")
    parser.add_argument("--qw", required=False, type=float, help="Quaternion w component")
    
    # 2) Rotasyon matrisi direkt (geriye uyumluluk için)
    parser.add_argument("--rm00", required=False, type=float, help="Rotation matrix [0,0]")
    parser.add_argument("--rm01", required=False, type=float, help="Rotation matrix [0,1]")
    parser.add_argument("--rm02", required=False, type=float, help="Rotation matrix [0,2]")
    parser.add_argument("--rm10", required=False, type=float, help="Rotation matrix [1,0]")
    parser.add_argument("--rm11", required=False, type=float, help="Rotation matrix [1,1]")
    parser.add_argument("--rm12", required=False, type=float, help="Rotation matrix [1,2]")
    parser.add_argument("--rm20", required=False, type=float, help="Rotation matrix [2,0]")
    parser.add_argument("--rm21", required=False, type=float, help="Rotation matrix [2,1]")
    parser.add_argument("--rm22", required=False, type=float, help="Rotation matrix [2,2]")
    
    # 3) Euler açıları (geriye uyumluluk için, opsiyonel)
    parser.add_argument("--yaw", required=False, type=float, help="Yaw angle (radians)")
    parser.add_argument("--pitch", required=False, type=float, help="Pitch angle (radians)")
    parser.add_argument("--roll", required=False, type=float, help="Roll angle (radians)")
    
    args = parser.parse_args()
    
    # Rotasyon yöntemi kontrolü
    use_quaternion = (args.qx is not None and args.qy is not None and 
                      args.qz is not None and args.qw is not None)
    
    use_rotation_matrix = (args.rm00 is not None and args.rm01 is not None and args.rm02 is not None and
                          args.rm10 is not None and args.rm11 is not None and args.rm12 is not None and
                          args.rm20 is not None and args.rm21 is not None and args.rm22 is not None)
    
    use_euler = (args.roll is not None and args.pitch is not None and args.yaw is not None)
    
    if not use_quaternion and not use_rotation_matrix and not use_euler:
        raise ValueError("Either quaternion (--qx, --qy, --qz, --qw), rotation matrix (--rm00 to --rm22), or Euler angles (--roll, --pitch, --yaw) must be provided!")
    
    # --------------------------
    # 1) Rotasyon matrisi
    # --------------------------
    # ÖNEMLİ: Potree'de highlight quaternion'a göre yapılıyor!
    # Bu yüzden quaternion kullanmak en doğru yöntem.
    # 
    # Quaternion'dan rotasyon matrisine dönüşüm:
    # THREE.js quaternion formatı: (x, y, z, w)
    def quaternion_to_matrix(qx, qy, qz, qw):
        """
        Quaternion'dan rotasyon matrisine dönüşüm
        THREE.js quaternion formatı: (x, y, z, w)
        """
        # Quaternion normalize et (güvenlik için)
        norm = math.sqrt(qx*qx + qy*qy + qz*qz + qw*qw)
        if norm > 0:
            qx, qy, qz, qw = qx/norm, qy/norm, qz/norm, qw/norm
        
        # Quaternion'dan rotasyon matrisi
        # R = [
        #   [1-2(qy²+qz²), 2(qxqy-qzqw), 2(qxqz+qyqw)],
        #   [2(qxqy+qzqw), 1-2(qx²+qz²), 2(qyqz-qxqw)],
        #   [2(qxqz-qyqw), 2(qyqz+qxqw), 1-2(qx²+qy²)]
        # ]
        qx2, qy2, qz2 = qx*qx, qy*qy, qz*qz
        qxy, qxz, qyz = qx*qy, qx*qz, qy*qz
        qxw, qyw, qzw = qx*qw, qy*qw, qz*qw
        
        R = np.array([
            [1 - 2*(qy2 + qz2), 2*(qxy - qzw), 2*(qxz + qyw)],
            [2*(qxy + qzw), 1 - 2*(qx2 + qz2), 2*(qyz - qxw)],
            [2*(qxz - qyw), 2*(qyz + qxw), 1 - 2*(qx2 + qy2)]
        ])
        
        return R
    
    # Euler açılarından rotasyon matrisi (geriye uyumluluk için)
    # ÖNEMLİ: THREE.js'de rotation order "XYZ" ise:
    # - roll = X ekseni (euler.x)
    # - pitch = Y ekseni (euler.y)  
    # - yaw = Z ekseni (euler.z)
    # 
    # THREE.js XYZ rotation order: R = Rz(yaw) * Ry(pitch) * Rx(roll)
    def rot_matrix_xyz(roll, pitch, yaw):
        """
        THREE.js XYZ rotation order için rotasyon matrisi
        roll: X ekseni (euler.x)
        pitch: Y ekseni (euler.y)
        yaw: Z ekseni (euler.z)
        """
        cr, sr = math.cos(roll), math.sin(roll)
        cp, sp = math.cos(pitch), math.sin(pitch)
        cy, sy = math.cos(yaw), math.sin(yaw)
        
        # X ekseni rotasyonu (roll)
        Rx = np.array([[1,   0,   0],
                       [0,  cr, -sr],
                       [0,  sr,  cr]])
        
        # Y ekseni rotasyonu (pitch)
        Ry = np.array([[ cp,  0,  sp],
                       [  0,  1,   0],
                       [-sp,  0,  cp]])
        
        # Z ekseni rotasyonu (yaw)
        Rz = np.array([[cy, -sy,  0],
                       [sy,  cy,  0],
                       [ 0,   0,  1]])
        
        # XYZ order: R = Rz * Ry * Rx (sağdan sola uygulanır)
        # NOT: Köşeleri döndürürken matrisi doğrudan uyguluyoruz
        # 
        # ÖNEMLİ: Pitch 90° olduğunda gimbal lock oluşabilir
        # Bu durumda rotation matrisi sırası kritik olabilir
        # 
        # TEST: Ters sırada uygulamayı deneyin (eğer sorun devam ederse)
        # return Rx @ Ry @ Rz
        
        # Normal sırada (XYZ order)
        return Rz @ Ry @ Rx
    
    # --------------------------
    # 2) Volume'ın 8 köşesini çıkar
    # --------------------------
    # Potree'de BoxVolume: BoxGeometry(1, 1, 1) oluşturuluyor
    # THREE.js BoxGeometry(width, height, depth):
    #   - width = X ekseni boyutu
    #   - height = Y ekseni boyutu  
    #   - depth = Z ekseni boyutu
    # 
    # ÖNEMLİ: Potree'de scale direkt olarak boyutları veriyor (sx, sy, sz)
    # BoxGeometry(1, 1, 1) köşeleri -0.5 ile 0.5 arasında
    # Scale uygulandığında: köşeler (-sx/2, -sy/2, -sz/2) ile (sx/2, sy/2, sz/2) arasında
    # 
    # Yarı boyutlar (merkezden köşelere olan mesafe)
    # NOT: Scale değerleri direkt boyut, yarı boyut değil!
    hx, hy, hz = args.sx / 2.0, args.sy / 2.0, args.sz / 2.0
    
    # Local space'deki köşeler (merkez 0,0,0'da)
    # THREE.js'de: X=sağ, Y=yukarı, Z=öne (right-handed coordinate system)
    # Potree'de de aynı sistem kullanılıyor
    # 
    # NOT: Eksen eşleşmesi kontrolü gerekebilir!
    # Eğer küpün uzunluğu doğru ama genişliği yanlışsa, sx ve sy yer değiştirmiş olabilir
    corners_local = np.array([
        [-hx, -hy, -hz],  # 0: sol-alt-arka
        [ hx, -hy, -hz],  # 1: sağ-alt-arka
        [ hx,  hy, -hz],  # 2: sağ-üst-arka
        [-hx,  hy, -hz],  # 3: sol-üst-arka
        [-hx, -hy,  hz],  # 4: sol-alt-ön
        [ hx, -hy,  hz],  # 5: sağ-alt-ön
        [ hx,  hy,  hz],  # 6: sağ-üst-ön
        [-hx,  hy,  hz],  # 7: sol-üst-ön
    ])
    
    # DEBUG: Köşeleri yazdır
    print("Local corners (before rotation):")
    for i, corner in enumerate(corners_local):
        print(f"  Corner {i}: ({corner[0]:.3f}, {corner[1]:.3f}, {corner[2]:.3f})")
    print(f"  Half-sizes: hx={hx:.3f}, hy={hy:.3f}, hz={hz:.3f}")
    
    # --------------------------
    # 3) Rotasyon uygula
    # --------------------------
    # ÜÇ YÖNTEM: Quaternion (ÖNERİLEN), Rotasyon matrisi direkt, veya Euler açıları
    
    if use_quaternion:
        # YÖNTEM 1: Quaternion (ÖNERİLEN - Potree'de highlight quaternion'a göre yapılıyor!)
        print("Using quaternion (from volume.quaternion)...")
        print(f"  Quaternion: ({args.qx:.6f}, {args.qy:.6f}, {args.qz:.6f}, {args.qw:.6f})")
        
        # Quaternion'dan rotasyon matrisi oluştur
        R = quaternion_to_matrix(args.qx, args.qy, args.qz, args.qw)
        
        # Quaternion normalize kontrolü
        q_norm = math.sqrt(args.qx*args.qx + args.qy*args.qy + args.qz*args.qz + args.qw*args.qw)
        print(f"  Quaternion norm: {q_norm:.6f} (should be ~1.0)")
        
        if abs(q_norm - 1.0) > 0.1:
            print("  ⚠ WARNING: Quaternion is not normalized! Normalizing...")
            # Quaternion'ı normalize et
            args.qx, args.qy, args.qz, args.qw = args.qx/q_norm, args.qy/q_norm, args.qz/q_norm, args.qw/q_norm
            R = quaternion_to_matrix(args.qx, args.qy, args.qz, args.qw)
        
    elif use_rotation_matrix:
        # YÖNTEM 1: Rotasyon matrisi direkt (önerilen, gimbal lock sorunu yok)
        print("Using rotation matrix directly (from matrixWorld)...")
        
        # JavaScript'ten gelen matris: column-major formatında
        # [rm00, rm01, rm02] = [m11, m12, m13] (ilk satır)
        # [rm10, rm11, rm12] = [m21, m22, m23] (ikinci satır)
        # [rm20, rm21, rm22] = [m31, m32, m33] (üçüncü satır)
        R_raw = np.array([
            [args.rm00, args.rm01, args.rm02],
            [args.rm10, args.rm11, args.rm12],
            [args.rm20, args.rm21, args.rm22]
        ])
        
        # Rotasyon matrisi kontrolü
        det_raw = np.linalg.det(R_raw)
        print(f"  Original matrix determinant: {det_raw:.6f} (should be ~1.0)")
        
        # Birim matris kontrolü (rotasyon yoksa)
        is_identity = np.allclose(R_raw, np.eye(3), atol=1e-6)
        if is_identity:
            print("  ⚠ WARNING: Rotation matrix is identity matrix (no rotation)!")
            print("  This might indicate that extractRotation() didn't work correctly.")
            print("  Falling back to Euler angles if available...")
            
            # Euler açıları varsa onları kullan
            if use_euler:
                print("  Using Euler angles instead...")
                R = rot_matrix_xyz(args.roll, args.pitch, args.yaw)
            else:
                # Birim matris kullan (rotasyon yok)
                R = R_raw
        else:
            # THREE.js column-major → numpy row-major için transpoze
            # extractRotation ile alınan matris column-major formatında olabilir
            R = R_raw.T  # Transpoze et
            
            # Transpoze edilmiş matris kontrolü
            det = np.linalg.det(R)
            print(f"  Transposed matrix determinant: {det:.6f}")
            
            # Eğer transpoze edilmiş matris determinant'ı 1 değilse, direkt kullan
            if abs(det - 1.0) > 0.1:
                print("  ⚠ Transposed matrix invalid, using original...")
                R = R_raw
        
    else:
        # YÖNTEM 2: Euler açılarından rotasyon matrisi oluştur (geriye uyumluluk)
        print("Using Euler angles (roll, pitch, yaw)...")
        
        # ÖNEMLİ: Euler açılarını normalize et [-π, π] aralığına
        # volume.rotation değerleri bazen normalize edilmemiş olabilir
        # Örnek: -135° ile 225° aynı rotasyonu temsil eder, ama normalize edilmeli
        def normalize_angle(angle):
            """Açıyı [-π, π] aralığına normalize et"""
            # math.fmod kullanarak daha hızlı normalize et
            angle = math.fmod(angle, 2 * math.pi)
            if angle > math.pi:
                angle -= 2 * math.pi
            elif angle < -math.pi:
                angle += 2 * math.pi
            return angle
        
        roll_normalized = normalize_angle(args.roll)
        pitch_normalized = normalize_angle(args.pitch)
        yaw_normalized = normalize_angle(args.yaw)
        
        print(f"  Rotation (original, deg): roll={math.degrees(args.roll):.2f}°, pitch={math.degrees(args.pitch):.2f}°, yaw={math.degrees(args.yaw):.2f}°")
        print(f"  Rotation (normalized, deg): roll={math.degrees(roll_normalized):.2f}°, pitch={math.degrees(pitch_normalized):.2f}°, yaw={math.degrees(yaw_normalized):.2f}°")
        
        # ÖNEMLİ: Normalize edilmiş açıların orijinal açılardan farklı olup olmadığını kontrol et
        if (abs(roll_normalized - args.roll) > 0.01 or 
            abs(pitch_normalized - args.pitch) > 0.01 or 
            abs(yaw_normalized - args.yaw) > 0.01):
            print("  ⚠ WARNING: Rotation angles were normalized!")
            print("  This might indicate that volume.rotation values were not normalized in JavaScript.")
            print("  Consider normalizing angles in JavaScript before sending to Python.")
        
        # Pitch 90° kontrolü (gimbal lock)
        pitch_deg = math.degrees(pitch_normalized)
        if abs(abs(pitch_deg) - 90) < 1.0:
            print(f"⚠ WARNING: Pitch is ~90° ({pitch_deg:.2f}°), gimbal lock possible!")
            print("  Consider using rotation matrix directly instead!")
        
        # Normalize edilmiş açılarla rotasyon matrisi oluştur
        R = rot_matrix_xyz(roll_normalized, pitch_normalized, yaw_normalized)
    
    # DEBUG: Rotasyon matrisini yazdır
    print("Rotation matrix:")
    print(R)
    print(f"  Determinant: {np.linalg.det(R):.6f} (should be ~1.0)")
    
    # ALTERNATIF TEST: Ters sırada rotasyon matrisi (eğer sorun devam ederse)
    # R_alt = rot_matrix_xyz(args.roll, args.pitch, args.yaw)
    # cr, sr = math.cos(args.roll), math.sin(args.roll)
    # cp, sp = math.cos(args.pitch), math.sin(args.pitch)
    # cy, sy = math.cos(args.yaw), math.sin(args.yaw)
    # Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    # Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
    # Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    # R_alt = Rx @ Ry @ Rz  # Ters sırada
    # print("Alternative rotation matrix (Rx @ Ry @ Rz):")
    # print(R_alt)
    
    # Köşeleri döndür
    # NOT: THREE.js'de rotasyon matrisi vektörleri döndürmek için kullanılır
    # 
    # NumPy'de matris çarpımı:
    # - R @ corners_local.T: her köşe bir sütun vektör (3 x N) → (3 x N)
    # - .T: tekrar satır formatına çevir (N x 3)
    # 
    # ALTERNATIF: Köşeleri satır vektör olarak döndür
    # - corners_local @ R.T: her köşe bir satır vektör (N x 3) → (N x 3)
    
    # Birim matris kontrolü - eğer rotasyon yoksa direkt kullan
    is_identity_rotation = np.allclose(R, np.eye(3), atol=1e-6)
    if is_identity_rotation:
        print("  ⚠ No rotation detected, using corners directly...")
        corners_rotated = corners_local.copy()
    else:
        # Rotasyon uygula - İKİ YÖNTEM TEST ET
        # YÖNTEM 1: Standart (sütun vektör olarak)
        corners_rotated_1 = (R @ corners_local.T).T
        
        # YÖNTEM 2: Rotasyon matrisinin tersini al (yön tersine)
        corners_rotated_2 = (R.T @ corners_local.T).T
        
        # YÖNTEM 3: Satır vektör olarak
        corners_rotated_3 = corners_local @ R.T
        
        # YÖNTEM 4: Satır vektör + ters matris
        corners_rotated_4 = corners_local @ R
        
        # DEBUG: Tüm yöntemleri karşılaştır
        print("  Testing rotation methods:")
        print(f"    Method 1 (R @ corners.T).T: first corner = {corners_rotated_1[0]}")
        print(f"    Method 2 (R.T @ corners.T).T: first corner = {corners_rotated_2[0]}")
        print(f"    Method 3 (corners @ R.T): first corner = {corners_rotated_3[0]}")
        print(f"    Method 4 (corners @ R): first corner = {corners_rotated_4[0]}")
        
        # Varsayılan olarak Method 2 kullan (rotasyon yönü tersine)
        # THREE.js'de rotasyon matrisi bazen ters yönde uygulanabilir
        # Method 2: R.T kullanarak rotasyon yönünü tersine çeviriyoruz
        corners_rotated = corners_rotated_2
        
        # ALTERNATIF: Eğer Method 2 yanlışsa, Method 1'i deneyin (standart)
        # corners_rotated = corners_rotated_1
    
    # DEBUG: Döndürülmüş köşeleri yazdır
    print("Rotated corners (before translation):")
    for i, corner in enumerate(corners_rotated):
        print(f"  Corner {i}: ({corner[0]:.3f}, {corner[1]:.3f}, {corner[2]:.3f})")
    
    # --------------------------
    # 4) Dünya pozisyonuna taşı
    # --------------------------
    # Position merkez noktası, köşeleri bu merkeze göre kaydır
    corners_world = corners_rotated.copy()
    corners_world[:, 0] += args.px
    corners_world[:, 1] += args.py
    corners_world[:, 2] += args.pz
    
    # --------------------------
    # 5) AABB çıkar (PDAL axis aligned ister)
    # --------------------------
    xmin, ymin, zmin = corners_world.min(axis=0)
    xmax, ymax, zmax = corners_world.max(axis=0)
    
    # AABB boyut kontrolü
    xsize = xmax - xmin
    ysize = ymax - ymin
    zsize = zmax - zmin
    
    print("=" * 60)
    print("Volume Parameters:")
    print(f"  Position: ({args.px:.6f}, {args.py:.6f}, {args.pz:.6f})")
    print(f"  Scale (FULL SIZE): ({args.sx:.6f}, {args.sy:.6f}, {args.sz:.6f})")
    print(f"  Half-size: ({hx:.6f}, {hy:.6f}, {hz:.6f})")
    if use_rotation_matrix:
        print(f"  Rotation: Using rotation matrix directly (from matrixWorld)")
    else:
        print(f"  Rotation (rad): roll={args.roll:.6f}, pitch={args.pitch:.6f}, yaw={args.yaw:.6f}")
        print(f"  Rotation (deg): roll={math.degrees(args.roll):.2f}°, pitch={math.degrees(args.pitch):.2f}°, yaw={math.degrees(args.yaw):.2f}°")
    print("")
    print("AABB Bounds (rotated volume):")
    print(f"  X: [{xmin:.6f}, {xmax:.6f}] (size: {xsize:.6f})")
    print(f"  Y: [{ymin:.6f}, {ymax:.6f}] (size: {ysize:.6f})")
    print(f"  Z: [{zmin:.6f}, {zmax:.6f}] (size: {zsize:.6f})")
    print("")
    print("Expected vs Actual:")
    print(f"  Expected size: ({args.sx:.6f}, {args.sy:.6f}, {args.sz:.6f})")
    print(f"  AABB size: ({xsize:.6f}, {ysize:.6f}, {zsize:.6f})")
    print("=" * 60)
    
    # Hata kontrolü
    if abs(xsize) < 1e-6 or abs(ysize) < 1e-6 or abs(zsize) < 1e-6:
        raise ValueError(f"Invalid AABB: At least one axis has zero size. "
                         f"X: {xsize:.6f}, Y: {ysize:.6f}, Z: {zsize:.6f}")
    
    # Scale kontrolü
    if args.sx <= 0 or args.sy <= 0 or args.sz <= 0:
        raise ValueError(f"Scale values must be positive: sx={args.sx}, sy={args.sy}, sz={args.sz}")
    
    # --------------------------
    # 6) PDAL pipeline
    # outside = True → Box DIŞINDAKİ noktaları al (box içindekileri SİL)
    # 
    # NOT: PDAL filters.crop sadece AABB (axis-aligned bounding box) destekler
    # Rotasyonlu box için AABB kullanıyoruz (rotasyonlu box'ın AABB'si)
    # Bu yaklaşım rotasyonlu box'ın tam sınırlarını vermez ama yaklaşık sonuç verir
    # 
    # UYARI: Eğer box rotasyonlu ise, AABB rotasyonlu box'ın tam sınırlarını vermez
    # Bu durumda bazı noktalar yanlış kesilebilir
    # --------------------------
    
    # AABB bounds (rotasyonlu box'ın AABB'si)
    bounds_string = f"([{xmin},{xmax}], [{ymin},{ymax}], [{zmin},{zmax}])"
    
    # Rotasyon kontrolü - eğer rotasyon varsa Python'da işle
    is_rotated = not is_identity_rotation
    
    if is_rotated:
        print("⚠ Volume is rotated - Using Python-based processing for accurate results...")
        print("")
        
        # ROTASYONLU BOX İÇİN PYTHON'DA İŞLEME
        # PDAL Python filter exe'ye dahil edilemediği için,
        # Python'da point cloud'u okuyup, rotasyonlu box kontrolü yapıp, sonra yazıyoruz
        
        try:
            import laspy
            
            # Point cloud'u oku
            print(f"Reading point cloud: {args.i}")
            las = laspy.read(args.i)
            
            # Noktaları al
            points = np.column_stack([las.x, las.y, las.z])
            num_points = len(points)
            print(f"  Total points: {num_points:,}")
            
            # Box parametreleri
            box_center = np.array([args.px, args.py, args.pz])
            half_sizes = np.array([args.sx / 2.0, args.sy / 2.0, args.sz / 2.0])
            
            # ÖNEMLİ: Rotasyon matrisi zaten normalize edilmiş açılardan oluşturuldu
            # (Eğer Euler açıları kullanıldıysa normalize edildi, rotation matrix kullanıldıysa zaten doğru)
            
            # DEBUG: Rotasyon matrisini kontrol et
            print("Processing points with rotated box...")
            print(f"  Box center: ({box_center[0]:.3f}, {box_center[1]:.3f}, {box_center[2]:.3f})")
            print(f"  Half-sizes: ({half_sizes[0]:.3f}, {half_sizes[1]:.3f}, {half_sizes[2]:.3f})")
            print(f"  Rotation matrix determinant: {np.linalg.det(R):.6f}")
            
            # Rotasyon matrisi: R, world space'deki bir vektörü lokal space'e dönüştürür
            # Rotasyon matrisleri ortogonal olduğu için: R^-1 = R^T
            # 
            # THREE.js'de: world_point = center + R @ local_point
            # Buradan: local_point = R^T @ (world_point - center)
            # 
            # Ama dikkat: Rotasyon matrisinin yönü önemli!
            # Eğer R, lokal -> world dönüşümü ise, world -> local için R^T kullanırız
            # Eğer R, world -> local dönüşümü ise, direkt R kullanırız
            
            # TEST: İki yöntemi de dene
            # YÖNTEM 1: R^T kullan (standart, rotasyon matrisinin tersi)
            points_relative = points - box_center  # Merkeze göre
            points_local_method1 = (R.T @ points_relative.T).T  # Lokal koordinatlara dönüştür (R^T)
            
            # YÖNTEM 2: R direkt kullan (eğer R zaten world->local ise)
            points_local_method2 = (R @ points_relative.T).T  # Lokal koordinatlara dönüştür (R)
            
            # Test için: İlk birkaç noktayı kontrol et
            print("  Testing rotation direction with first point:")
            print(f"    Original point: ({points[0, 0]:.3f}, {points[0, 1]:.3f}, {points[0, 2]:.3f})")
            print(f"    Relative to center: ({points_relative[0, 0]:.3f}, {points_relative[0, 1]:.3f}, {points_relative[0, 2]:.3f})")
            print(f"    Local (R^T method): ({points_local_method1[0, 0]:.3f}, {points_local_method1[0, 1]:.3f}, {points_local_method1[0, 2]:.3f})")
            print(f"    Local (R method): ({points_local_method2[0, 0]:.3f}, {points_local_method2[0, 1]:.3f}, {points_local_method2[0, 2]:.3f})")
            
            # Varsayılan olarak R^T kullan (Method 1)
            # Eğer bu yanlışsa, Method 2'yi deneyin
            # 
            # NOT: Eğer kesme yanlışsa, aşağıdaki satırı değiştirin:
            # points_local = points_local_method1  # R^T kullan
            # points_local = points_local_method2  # R direkt kullan
            
            # TEST: Her iki yöntemi de test et ve hangisinin daha mantıklı olduğunu kontrol et
            # Eğer box'un merkezine yakın noktalar lokal koordinatlarda küçük değerler vermeli
            # Merkeze en yakın noktayı bul ve kontrol et
            center_idx = np.argmin(np.linalg.norm(points_relative, axis=1))
            print(f"  Closest point to center (index {center_idx}):")
            print(f"    Method 1 (R^T): local=({points_local_method1[center_idx, 0]:.3f}, "
                  f"{points_local_method1[center_idx, 1]:.3f}, {points_local_method1[center_idx, 2]:.3f})")
            print(f"    Method 2 (R): local=({points_local_method2[center_idx, 0]:.3f}, "
                  f"{points_local_method2[center_idx, 1]:.3f}, {points_local_method2[center_idx, 2]:.3f})")
            
            # Varsayılan: R^T kullan (Method 1)
            # Eğer sorun devam ederse, Method 2'yi deneyin (R direkt)
            # 
            # ÖNEMLİ: Potree'de highlight yapılan noktalar ile Python'da silinen noktalar
            # aynı olmalı. Eğer farklıysa, rotasyon matrisi yönü yanlış olabilir.
            # 
            # TEST: Eğer sorun devam ederse, aşağıdaki satırı değiştirin:
            # points_local = points_local_method1  # R^T kullan (standart)
            # points_local = points_local_method2  # R direkt kullan (alternatif)
            
            points_local = points_local_method1
            
            # Box'un içinde mi kontrol et
            # Box'un merkezi (0,0,0) ve yarı boyutları hx, hy, hz
            # Lokal koordinatlarda box: [-hx, hx] x [-hy, hy] x [-hz, hz]
            # 
            # ÖNEMLİ: Potree'de highlight yapılan noktalar box'un içinde olmalı
            # Python'da da aynı noktaları silmeliyiz
            inside_mask = (
                (np.abs(points_local[:, 0]) <= half_sizes[0]) &
                (np.abs(points_local[:, 1]) <= half_sizes[1]) &
                (np.abs(points_local[:, 2]) <= half_sizes[2])
            )
            
            # DEBUG: Box sınırlarını kontrol et
            print(f"  Box bounds (local space):")
            print(f"    X: [-{half_sizes[0]:.3f}, {half_sizes[0]:.3f}]")
            print(f"    Y: [-{half_sizes[1]:.3f}, {half_sizes[1]:.3f}]")
            print(f"    Z: [-{half_sizes[2]:.3f}, {half_sizes[2]:.3f}]")
            
            # DEBUG: İlk birkaç noktanın durumunu kontrol et
            print(f"  First 5 points inside check:")
            for i in range(min(5, len(points))):
                local_pt = points_local[i]
                is_inside = (
                    (np.abs(local_pt[0]) <= half_sizes[0]) &
                    (np.abs(local_pt[1]) <= half_sizes[1]) &
                    (np.abs(local_pt[2]) <= half_sizes[2])
                )
                print(f"    Point {i}: local=({local_pt[0]:.3f}, {local_pt[1]:.3f}, {local_pt[2]:.3f}), "
                      f"inside={is_inside}, "
                      f"abs=({np.abs(local_pt[0]):.3f}, {np.abs(local_pt[1]):.3f}, {np.abs(local_pt[2]):.3f}), "
                      f"half=({half_sizes[0]:.3f}, {half_sizes[1]:.3f}, {half_sizes[2]:.3f})")
            
            # outside=True olduğu için: box'un DIŞINDAKİ noktaları al
            outside_mask = ~inside_mask
            points_outside = points[outside_mask]
            
            num_removed = np.sum(inside_mask)
            num_kept = np.sum(outside_mask)
            print(f"  Points removed (inside box): {num_removed:,}")
            print(f"  Points kept (outside box): {num_kept:,}")
            
            # Yeni LAS dosyası oluştur
            print(f"Writing output: {args.o}")
            las_out = laspy.create(point_format=las.header.point_format, file_version=las.header.version)
            
            # Header'ı kopyala
            las_out.header.scales = las.header.scales
            las_out.header.offsets = las.header.offsets
            
            # Sadece box dışındaki noktaları yaz
            las_out.x = points_outside[:, 0]
            las_out.y = points_outside[:, 1]
            las_out.z = points_outside[:, 2]
            
            # Diğer özellikleri kopyala (varsa)
            if hasattr(las, 'intensity'):
                las_out.intensity = las.intensity[outside_mask]
            if hasattr(las, 'classification'):
                las_out.classification = las.classification[outside_mask]
            if hasattr(las, 'return_number'):
                las_out.return_number = las.return_number[outside_mask]
            if hasattr(las, 'number_of_returns'):
                las_out.number_of_returns = las.number_of_returns[outside_mask]
            if hasattr(las, 'red') and hasattr(las, 'green') and hasattr(las, 'blue'):
                las_out.red = las.red[outside_mask]
                las_out.green = las.green[outside_mask]
                las_out.blue = las.blue[outside_mask]
            
            # Dosyayı yaz
            las_out.write(args.o)
            
            print(f"✓ Point Cloud cropped successfully: {args.o}")
            
        except ImportError:
            print("⚠ ERROR: 'laspy' library not found!")
            print("  Install it with: pip install laspy")
            print("  Falling back to AABB method (less accurate for rotated boxes)...")
            print("")
            is_rotated = False  # Fallback to AABB
        except Exception as e:
            print(f"⚠ ERROR in Python processing: {e}")
            print("  Falling back to AABB method (less accurate for rotated boxes)...")
            print("")
            is_rotated = False  # Fallback to AABB
    
    # Eğer rotasyon yoksa veya Python işleme başarısız olduysa, AABB kullan
    if not is_rotated:
        # Pipeline: Sadece AABB kullan
        pipeline = {
            "pipeline": [
                {"type": "readers.las", "filename": args.i},
                
                # Box dışındaki noktaları al (box içindekileri sil)
                # AABB kullanılıyor
                {
                    "type": "filters.crop",
                    "bounds": bounds_string,  # String formatı
                    "outside": True  # True = box dışındakileri al (içindekileri sil)
                },
                
                {"type": "writers.las", "filename": args.o}
            ]
        }
        
        # DEBUG: Kullanılan bounds formatını yazdır
        print("PDAL Bounds Format:")
        print(f"  String: {bounds_string}")
        print("")
        
        try:
            # pdalpipeline.run_pipeline() kullanarak pipeline'ı çalıştır
            pdalpipeline.run_pipeline(pipeline)
            
            print(f"✓ Point Cloud cropped successfully: {args.o}")
            
        except Exception as e:
            print(f"✗ Point Cloud crop error: {e}")
            print(f"  Pipeline JSON:")
            print(json.dumps(pipeline, indent=2))
            raise

