import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';
import { cn } from '../lib/utils';
import '../services/EventEmitter';
import helvetikerFont from '../assets/fonts/helvetiker_regular.typeface.json';

interface CubeProps {
  onFaceClick: (face: string) => void;
  rotateToFace: (face: string) => void;
  meshRef: React.RefObject<THREE.Mesh>;
  showAxis: boolean;
  showLine: boolean;
  showText: boolean;
}

interface OrbitControllerProps {
  className?: string;
}

// Three.js Text Component
const ThreeText: React.FC<{
  text: string;
  position: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}> = ({ text, position, color = 'white', rotation }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<TextGeometry>();

  useEffect(() => {
    try {
      const font = new Font(helvetikerFont as any);
      const config = {
        font,
        size: 0.253,
        depth: 0.031625,
        curveSegments: 12,
        bevelEnabled: false,
      };
      const geo = new TextGeometry(text, config);
      geo.center();
      setGeometry(geo);
    } catch (error) {
      console.error('Error creating text geometry:', error);
    }
  }, [text]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} rotation={rotation}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

const AxesHelper: React.FC<{ meshRef: React.RefObject<THREE.Mesh>; showText: boolean }> = ({
  meshRef,
  showText,
}) => {
  // const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Z ve Y renklerini değiştir: Z -> blue, Y -> green
  const axesElements = [
    { text: '-X', position: [-1.58125, 0, 0] as [number, number, number], color: 'red' },
    { text: '-Z', position: [0, -1.58125, 0] as [number, number, number], color: 'blue' }, // Z artık blue
    { text: '-Y', position: [0, 0, -1.58125] as [number, number, number], color: 'green' }, // Y artık green
    { text: 'X', position: [1.58125, 0, 0] as [number, number, number], color: 'red' },
    { text: 'Z', position: [0, 1.58125, 0] as [number, number, number], color: 'blue' }, // Z artık blue
    { text: 'Y', position: [0, 0, 1.58125] as [number, number, number], color: 'green' }, // Y artık green
  ];

  useFrame(() => {
    if (meshRef.current && groupRef.current) {
      groupRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <group ref={groupRef}>
      {showText &&
        axesElements.map((axesElement) => (
          <ThreeText
            key={axesElement.text}
            text={axesElement.text}
            position={axesElement.position}
            color={axesElement.color}
          />
        ))}
      {/* AxesHelper yerine custom axes çiziyoruz çünkü renklerini değiştirmek gerekiyor */}
      <group>
        {/* X ekseni - Red */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-1.265, 0, 0, 1.265, 0, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="red" />
        </line>
        {/* Y ekseni - Green (renk değişti) */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, -1.265, 0, 0, 1.265])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="green" />
        </line>
        {/* Z ekseni - Blue (renk değişti) */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, -1.265, 0, 0, 1.265, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="blue" />
        </line>
      </group>
    </group>
  );
};

const Cube: React.FC<CubeProps> = ({ meshRef, onFaceClick, rotateToFace, showAxis, showLine, showText }) => {
  const [hovered, setHovered] = useState(false);

  const handleDoubleClick = (event: any) => {
    if (!meshRef.current) return;

    const intersectedFace = event.face?.normal;
    if (intersectedFace) {
      if (intersectedFace.z === 1) {
        onFaceClick('front');
        rotateToFace('front');
      } else if (intersectedFace.z === -1) {
        onFaceClick('back');
        rotateToFace('back');
      } else if (intersectedFace.x === 1) {
        onFaceClick('left');
        rotateToFace('left');
      } else if (intersectedFace.x === -1) {
        onFaceClick('right');
        rotateToFace('right');
      } else if (intersectedFace.y === 1) {
        onFaceClick('top');
        rotateToFace('top');
      } else if (intersectedFace.y === -1) {
        onFaceClick('bottom');
        rotateToFace('bottom');
      }
    }
  };

  // Z ve Y renklerini değiştir: Z -> blue, Y -> green (çubuklar için)
  const axesElements = [
    { text: 'X', position: [0.69575, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], color: 'red' },
    { text: '-X', position: [-0.69575, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], color: 'red' },
    { text: 'Z', position: [0, 0.69575, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], color: 'blue' }, // Z artık blue
    { text: '-Z', position: [0, -0.69575, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number], color: 'blue' }, // Z artık blue
    { text: 'Y', position: [0, 0, 0.69575] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: 'green' }, // Y artık green
    { text: '-Y', position: [0, 0, -0.69575] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], color: 'green' }, // Y artık green
  ];

  return (
    <group ref={meshRef as any}>
      <mesh
        onDoubleClick={handleDoubleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.265, 1.265, 1.265]} />
        <meshStandardMaterial
          color={hovered ? '#666666' : '#555555'}
          transparent={true}
          opacity={hovered ? (showAxis ? 0 : 1) : showAxis ? 0 : 1}
        />
      </mesh>

      {showLine && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.265, 1.265, 1.265)]} />
          <lineBasicMaterial
            color={hovered ? '#555555' : showAxis ? '#008F11' : '#454545'}
            linewidth={0.1265}
            opacity={0}
          />
        </lineSegments>
      )}

      {!showAxis && showText && (
        <>
          {axesElements.map((axesElement) => (
            <ThreeText
              key={axesElement.text}
              text={axesElement.text}
              position={axesElement.position}
              rotation={axesElement.rotation}
              color={axesElement.color}
            />
          ))}
        </>
      )}

      {showAxis && <AxesHelper meshRef={meshRef} showText={showText} />}
    </group>
  );
};

const OrbitController: React.FC<OrbitControllerProps> = ({ className }) => {
  // const [action, setAction] = useState<string | null>(null);
  const orbitControlsRef = useRef<any>();
  const meshRef = useRef<THREE.Mesh>(null);

  // EventEmitter'dan camera rotation değişikliklerini dinle
  useEffect(() => {
    const updateCubeRotation = () => {
      if (meshRef.current) {
        const viewer = (window as any).viewer;
        if (viewer && viewer.scene && viewer.scene.view) {
          const view = viewer.scene.view;
          // Diğer projede olduğu gibi: x: -pitch, y: -yaw (direkt radyan değerleri)
          gsap.to(meshRef.current.rotation, {
            x: -view.pitch,
            y: -view.yaw,
            duration: 0.1,
            ease: 'power2.out',
          });
        }
      }
    };

    const handleRotationChange = () => {
      updateCubeRotation();
    };

    // EventEmitter'a abone ol
    if (window.eventBus) {
      window.eventBus.on('camera-rotation-changed', handleRotationChange);
    }

    // Potree viewer'dan ilk rotation'ı al
    const getCurrentCameraRotation = () => {
      updateCubeRotation();
    };

    // Viewer hazır olana kadar bekle ve ilk rotation'ı al
    getCurrentCameraRotation();
    const intervalId = setInterval(() => {
      getCurrentCameraRotation();
    }, 100);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      if (window.eventBus) {
        window.eventBus.off('camera-rotation-changed', handleRotationChange);
      }
      orbitControlsRef.current?.dispose?.();
      if (meshRef.current) {
        meshRef.current.geometry?.dispose?.();
        const material = meshRef.current.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose?.());
        } else {
          material?.dispose?.();
        }
      }
    };
  }, []);

  const changeYawAndPitch = (yaw: number, pitch: number) => {
    const viewer = (window as any).viewer;
    if (!viewer || !viewer.scene || !viewer.scene.view) return;

    // Potree'nin view sistemini güncelle (diğer projede direkt atanıyor, normalize edilmiyor)
    viewer.scene.view.yaw = yaw;
    viewer.scene.view.pitch = pitch;
    
    // ViewP'yi de güncelle (eğer varsa)
    if (viewer.scene.viewP) {
      viewer.scene.viewP.yaw = yaw;
      viewer.scene.viewP.pitch = pitch;
    }
  };

  const handleFaceClick = (face: string) => {
    console.log('Clicked face:', face);
  };

  const rotateToFace = (face: string) => {
    const cameraRotation = new THREE.Vector3();
    switch (face) {
      case 'front':
        // Front: Y eksenine bak - Potree'de yaw 0, pitch 0 (Y pozitif yöne bakıyor)
        // Potree koordinat sistemi: X sağ, Y ileri, Z yukarı
        changeYawAndPitch(0, 0);
        cameraRotation.set(0, 0, 0); // Küp rotasyonu: Y eksenine bak
        break;
      case 'back':
        // -Y eksenine bak (back = Y negatif) - Potree'de yaw Math.PI
        changeYawAndPitch(Math.PI, 0);
        cameraRotation.set(0, Math.PI, 0); // Küp rotasyonu: -Y eksenine bak
        break;
      case 'right':
        // X eksenine bak (right = X pozitif) - Potree'de yaw -Math.PI/2, pitch 0
        changeYawAndPitch(-Math.PI / 2, 0);
        cameraRotation.set(0, -Math.PI / 2, 0); // Küp rotasyonu: X eksenine bak
        break;
      case 'left':
        // -X eksenine bak (left = X negatif) - Potree'de yaw Math.PI/2, pitch 0
        changeYawAndPitch(Math.PI / 2, 0);
        cameraRotation.set(0, Math.PI / 2, 0); // Küp rotasyonu: -X eksenine bak
        break;
      case 'top':
        // Z eksenine bak (top = Z pozitif, yukarı) - Potree'de yaw 0, pitch -Math.PI/2
        changeYawAndPitch(0, -Math.PI / 2);
        cameraRotation.set(-Math.PI / 2, 0, 0); // Küp rotasyonu: Z eksenine bak
        break;
      case 'bottom':
        // -Z eksenine bak (bottom = Z negatif, aşağı) - Diğer projede yaw -Math.PI kullanılıyor
        changeYawAndPitch(-Math.PI, Math.PI / 2);
        cameraRotation.set(-Math.PI / 2, -Math.PI, 0); // Küp rotasyonu: -Z eksenine bak
        break;
    }

    if (meshRef.current) {
      gsap.to(meshRef.current.rotation, {
        x: cameraRotation.x,
        y: cameraRotation.y,
        z: cameraRotation.z,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (orbitControlsRef.current) {
            orbitControlsRef.current.update();
          }
        },
      });
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-full',
        className
      )}
      style={{
        width: '94.875px',
        height: '94.875px',
        position: 'relative',
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      <Canvas
        gl={{
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          alpha: true,
          antialias: true,
        }}
        camera={{ position: [0, 0, 3.1625], fov: 75 }}
        style={{ 
          cursor: 'pointer', 
          borderRadius: '50%',
          backgroundColor: 'transparent',
        }}
        onCreated={({ gl, scene }) => {
          // Şeffaf arka plan için
          gl.setClearColor(0x000000, 0); // Alpha = 0 (tamamen şeffaf)
          scene.background = null;
          // Canvas DOM element'inin style'ını şeffaf yap
          const canvas = gl.domElement;
          if (canvas) {
            canvas.style.backgroundColor = 'transparent';
            canvas.style.display = 'block';
          }
        }}
      >
        <ambientLight intensity={1} />
        <pointLight position={[3.1625, 3.1625, 3.1625]} />
        <Cube
          meshRef={meshRef}
          onFaceClick={handleFaceClick}
          rotateToFace={rotateToFace}
          showAxis={true}
          showLine={true}
          showText={true}
        />
        <OrbitControls
          ref={orbitControlsRef}
          enableZoom={false}
          maxDistance={3.1625}
          enablePan={false}
          enableRotate={false}
        />
      </Canvas>
    </div>
  );
};

export default OrbitController;

