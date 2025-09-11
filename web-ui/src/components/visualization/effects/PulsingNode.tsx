/**
 * Pulsing Node Component
 * 
 * Provides animated pulsing effects for graph nodes:
 * - Activity-based pulsing (centrality metrics)
 * - Selection highlighting
 * - Hover effects
 * - Smooth transitions
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { LayoutNode } from '../utils/graphLayout';

interface PulsingNodeProps {
  node: LayoutNode;
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  activityLevel?: number; // 0-1 scale based on centrality metrics
  pulseEnabled?: boolean;
  children: React.ReactNode;
}

export const PulsingNode: React.FC<PulsingNodeProps> = ({
  node,
  position,
  isSelected,
  isHovered,
  activityLevel = 0,
  pulseEnabled = true,
  children
}) => {
  const groupRef = useRef<any>(null);
  const glowRef = useRef<Mesh>(null);
  
  // Animation parameters based on activity level and state
  const animationParams = useMemo(() => {
    const basePulseSpeed = 1.0;
    const activityMultiplier = 1.0 + (activityLevel * 2.0); // 1.0 to 3.0 range
    
    return {
      pulseSpeed: basePulseSpeed * activityMultiplier,
      pulseIntensity: 0.1 + (activityLevel * 0.3), // 0.1 to 0.4 range
      glowIntensity: activityLevel * 0.5, // 0 to 0.5 range
      selectedPulseSpeed: 2.0,
      selectedPulseIntensity: 0.3,
      hoveredScaleMultiplier: 1.1
    };
  }, [activityLevel]);

  // Colors for different states
  const colors = useMemo(() => ({
    normal: new Color(node.color || '#4A90E2'),
    selected: new Color('#ff6b6b'),
    hovered: new Color('#ffd93d'),
    glow: new Color(node.color || '#4A90E2').multiplyScalar(1.5)
  }), [node.color]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current || !pulseEnabled) return;

    const time = state.clock.elapsedTime;
    const group = groupRef.current;
    
    // Base scale animation
    let scale = 1.0;
    let glowScale = 1.0;
    let pulseSpeed = animationParams.pulseSpeed;
    let pulseIntensity = animationParams.pulseIntensity;

    // State-specific modifications
    if (isSelected) {
      pulseSpeed = animationParams.selectedPulseSpeed;
      pulseIntensity = animationParams.selectedPulseIntensity;
      scale = 1.1; // Slightly larger when selected
    }
    
    if (isHovered) {
      scale *= animationParams.hoveredScaleMultiplier;
      pulseIntensity *= 1.5;
    }

    // Calculate pulsing scale
    const pulseScale = 1.0 + Math.sin(time * pulseSpeed) * pulseIntensity;
    const finalScale = scale * pulseScale;
    
    // Apply scale to group
    group.scale.setScalar(finalScale);

    // Glow effect
    if (glowRef.current) {
      const glow = glowRef.current;
      const glowPulse = 1.0 + Math.sin(time * pulseSpeed * 0.7) * 0.2;
      glowScale = finalScale * 1.2 * glowPulse;
      
      glow.scale.setScalar(glowScale);
      
      // Glow opacity based on activity and state
      let glowOpacity = animationParams.glowIntensity;
      if (isSelected) glowOpacity = Math.max(glowOpacity, 0.6);
      if (isHovered) glowOpacity = Math.max(glowOpacity, 0.4);
      
      if (glow.material && 'opacity' in glow.material) {
        (glow.material as any).opacity = glowOpacity * (0.5 + Math.sin(time * pulseSpeed) * 0.3);
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Glow effect mesh */}
      {(activityLevel > 0.1 || isSelected || isHovered) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[(node.size || 1) * 1.5, 16, 16]} />
          <meshBasicMaterial
            color={isSelected ? colors.selected : isHovered ? colors.hovered : colors.glow}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Main node content */}
      {children}
    </group>
  );
};
