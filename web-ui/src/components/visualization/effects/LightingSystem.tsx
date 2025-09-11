/**
 * Advanced Lighting System
 * 
 * Provides professional lighting setup for 3D knowledge graph:
 * - Dynamic community lighting
 * - Shadow mapping
 * - Ambient occlusion simulation
 * - Performance-optimized lighting
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, PointLight, SpotLight, Vector3 } from 'three';
import { GraphAnalytics } from '../utils/graphAnalytics';

interface LightingSystemProps {
  analytics?: GraphAnalytics | null;
  communityVisualizationEnabled?: boolean;
  enableShadows?: boolean;
  lightingIntensity?: number;
  dynamicLighting?: boolean;
  cameraPosition?: [number, number, number];
}

export const LightingSystem: React.FC<LightingSystemProps> = ({
  analytics,
  communityVisualizationEnabled = false,
  enableShadows = true,
  lightingIntensity = 1.0,
  dynamicLighting = true
}) => {
  const mainLightRef = useRef<DirectionalLight>(null);
  const fillLightRef = useRef<DirectionalLight>(null);
  const rimLightRef = useRef<PointLight>(null);
  const communityLightsRef = useRef<SpotLight[]>([]);

  // Community light colors
  const communityColors = useMemo(() => [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726',
    '#AB47BC', '#66BB6A', '#EF5350', '#26C6DA',
    '#FFCA28', '#7E57C2', '#29B6F6', '#FF7043'
  ], []);

  // Calculate community centers for lighting
  const communityCenters = useMemo(() => {
    if (!analytics?.communities || !communityVisualizationEnabled) return [];

    const centers: { position: Vector3; color: string; intensity: number }[] = [];
    const communityGroups = new Map<number, Vector3[]>();

    // Group nodes by community
    analytics.communities.forEach(({ communityId }) => {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      // Note: We'd need node positions here, which would come from props
      // For now, we'll create mock centers
    });

    // Calculate centers (simplified for demo)
    const uniqueCommunities = [...new Set(analytics.communities.map(c => c.communityId))];
    uniqueCommunities.forEach((_, index) => {
      const angle = (index / uniqueCommunities.length) * Math.PI * 2;
      const radius = 30;
      
      centers.push({
        position: new Vector3(
          Math.cos(angle) * radius,
          10,
          Math.sin(angle) * radius
        ),
        color: communityColors[index % communityColors.length],
        intensity: 0.3 * lightingIntensity
      });
    });

    return centers;
  }, [analytics, communityVisualizationEnabled, communityColors, lightingIntensity]);

  // Dynamic lighting animation
  useFrame((state) => {
    if (!dynamicLighting) return;

    const time = state.clock.elapsedTime;
    
    // Subtle main light movement
    if (mainLightRef.current) {
      const light = mainLightRef.current;
      const basePosition = new Vector3(100, 100, 100);
      light.position.copy(basePosition);
      light.position.x += Math.sin(time * 0.1) * 10;
      light.position.z += Math.cos(time * 0.1) * 10;
    }

    // Animate rim light
    if (rimLightRef.current) {
      const light = rimLightRef.current;
      light.intensity = (0.4 + Math.sin(time * 0.5) * 0.1) * lightingIntensity;
    }

    // Animate community lights
    communityLightsRef.current.forEach((light, index) => {
      if (light && communityCenters[index]) {
        const center = communityCenters[index];
        const offset = Math.sin(time * 0.3 + index) * 0.1;
        light.intensity = center.intensity * (1 + offset);
      }
    });
  });

  return (
    <>
      {/* Main Key Light */}
      <directionalLight
        ref={mainLightRef}
        position={[100, 100, 100]}
        intensity={0.8 * lightingIntensity}
        color="#ffffff"
        castShadow={enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0005}
      />

      {/* Fill Light */}
      <directionalLight
        ref={fillLightRef}
        position={[-50, 30, -50]}
        intensity={0.3 * lightingIntensity}
        color="#e6f3ff"
      />

      {/* Rim Light for depth */}
      <pointLight
        ref={rimLightRef}
        position={[-100, -100, -100]}
        intensity={0.4 * lightingIntensity}
        color="#4f46e5"
        distance={200}
        decay={2}
      />

      {/* Ambient Light */}
      <ambientLight 
        intensity={0.4 * lightingIntensity} 
        color="#f0f8ff" 
      />

      {/* Community Spotlights */}
      {communityVisualizationEnabled && communityCenters.map((center, index) => (
        <spotLight
          key={`community-light-${index}`}
          ref={(ref) => {
            if (ref) communityLightsRef.current[index] = ref;
          }}
          position={[center.position.x, center.position.y + 20, center.position.z]}
          target-position={[center.position.x, center.position.y, center.position.z]}
          intensity={center.intensity}
          color={center.color}
          angle={Math.PI / 8}
          penumbra={0.3}
          distance={100}
          decay={2}
          castShadow={enableShadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      ))}

      {/* Volumetric lighting effect (hemisphere light) */}
      <hemisphereLight
        args={["#87CEEB", "#654321", 0.2 * lightingIntensity]}
      />
    </>
  );
};
