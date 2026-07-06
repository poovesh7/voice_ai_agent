import { ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { Suspense, useRef } from 'react';

import { useAssistantStore } from '../store/assistantStore.js';

function CharacterAvatar({ status, mouthLevel }) {
  const rig = useRef();
  const head = useRef();
  const mouth = useRef();
  const leftHair = useRef();
  const rightHair = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const listeningPulse = status === 'listening' ? 0.06 : 0.025;
    const thinkingPulse = status === 'thinking' ? Math.sin(t * 10) * 0.04 : 0;
    const speakingMouth = status === 'speaking' && mouthLevel === 0 ? Math.abs(Math.sin(t * 16)) * 0.85 : mouthLevel;

    rig.current.position.y = -0.58 + Math.sin(t * 1.5) * listeningPulse;
    rig.current.rotation.y = Math.sin(t * 0.65) * 0.08;
    head.current.rotation.z = Math.sin(t * 0.9) * 0.025;
    head.current.position.y = 1.36 + thinkingPulse;
    mouth.current.scale.y = 0.2 + speakingMouth * 1.85;
    mouth.current.position.y = -0.27 - speakingMouth * 0.035;
    leftHair.current.rotation.z = 0.2 + Math.sin(t * 1.1) * 0.025;
    rightHair.current.rotation.z = -0.2 + Math.sin(t * 1.05) * 0.025;
  });

  const glow = status === 'listening' ? '#43e2ff' : status === 'thinking' ? '#f4d35e' : status === 'speaking' ? '#8fffa2' : '#8ab7ff';

  return (
    <group ref={rig}>
      <group position={[0, -0.36, 0]}>
        <mesh position={[0, 0.3, -0.03]} rotation={[0.1, 0, 0]}>
          <capsuleGeometry args={[0.68, 0.95, 18, 36]} />
          <meshStandardMaterial color="#24222b" roughness={0.52} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.74, 0.24]} rotation={[0.8, 0, 0]}>
          <boxGeometry args={[1.65, 0.5, 0.08]} />
          <meshStandardMaterial color="#4f1720" roughness={0.48} metalness={0.18} />
        </mesh>
        <mesh position={[0, 0.44, 0.38]} rotation={[0.58, 0, 0]}>
          <boxGeometry args={[1.25, 0.42, 0.08]} />
          <meshStandardMaterial color="#a61d32" roughness={0.44} metalness={0.1} />
        </mesh>
      </group>

      <group ref={head} position={[0, 1.36, 0]}>
        <mesh>
          <sphereGeometry args={[0.62, 48, 48]} />
          <meshStandardMaterial color="#d8b8a6" roughness={0.5} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.48, -0.02]} scale={[1.02, 0.42, 0.96]}>
          <sphereGeometry args={[0.62, 48, 48]} />
          <meshStandardMaterial color="#171721" roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.18, 0.56]}>
          <boxGeometry args={[1.08, 0.18, 0.04]} />
          <meshStandardMaterial color="#9298aa" metalness={0.52} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.18, 0.585]}>
          <boxGeometry args={[0.27, 0.105, 0.025]} />
          <meshBasicMaterial color="#2c2e3a" />
        </mesh>
        <mesh ref={leftHair} position={[-0.38, 0.03, 0.45]} rotation={[0.08, -0.08, 0.2]}>
          <capsuleGeometry args={[0.085, 0.86, 10, 18]} />
          <meshStandardMaterial color="#191923" roughness={0.62} />
        </mesh>
        <mesh ref={rightHair} position={[0.38, 0.03, 0.45]} rotation={[0.08, 0.08, -0.2]}>
          <capsuleGeometry args={[0.085, 0.86, 10, 18]} />
          <meshStandardMaterial color="#191923" roughness={0.62} />
        </mesh>
        <mesh position={[-0.2, -0.05, 0.56]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.2, 0.035, 0.025]} />
          <meshBasicMaterial color="#111116" />
        </mesh>
        <mesh position={[0.2, -0.05, 0.56]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.2, 0.035, 0.025]} />
          <meshBasicMaterial color="#111116" />
        </mesh>
        <mesh position={[0, -0.14, 0.6]} scale={[0.58, 1, 1]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#b98e7f" roughness={0.5} />
        </mesh>
        <mesh ref={mouth} position={[0, -0.27, 0.59]}>
          <boxGeometry args={[0.28, 0.045, 0.025]} />
          <meshBasicMaterial color={status === 'speaking' ? glow : '#30171a'} />
        </mesh>
        <pointLight color={glow} intensity={1.8} distance={3.3} position={[0, 0.15, 1.1]} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
        <ringGeometry args={[1.05, 1.09, 96]} />
        <meshBasicMaterial color={status === 'idle' ? '#234557' : glow} />
      </mesh>
    </group>
  );
}

function LoadedAvatarModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  const model = scene.clone();
  return <primitive object={model} scale={1.15} position={[0, -0.9, 0]} />;
}

function AvatarModel({ status, mouthLevel }) {
  const modelUrl = import.meta.env.VITE_ROBOT_MODEL_URL || import.meta.env.VITE_AVATAR_MODEL_URL;
  if (!modelUrl) {
    return <CharacterAvatar status={status} mouthLevel={mouthLevel} />;
  }
  return <LoadedAvatarModel modelUrl={modelUrl} />;
}

export default function AvatarScene() {
  const status = useAssistantStore((state) => state.status);
  const mouthLevel = useAssistantStore((state) => state.mouthLevel);

  return (
    <Canvas camera={{ position: [0, 0.8, 4.9], fov: 34 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#061018']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2.4, 4.2, 3.5]} intensity={2.4} />
      <Suspense fallback={<CharacterAvatar status={status} mouthLevel={mouthLevel} />}>
        <AvatarModel status={status} mouthLevel={mouthLevel} />
        <ContactShadows position={[0, -0.8, 0]} opacity={0.45} scale={4} blur={2} far={2} />
        <Environment preset="night" />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.55}
        maxPolarAngle={Math.PI / 1.85}
      />
    </Canvas>
  );
}
