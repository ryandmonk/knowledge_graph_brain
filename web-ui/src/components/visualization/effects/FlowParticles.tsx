/**
 * Flow Particles Component
 * 
 * Creates animated particles that flow along graph edges:
 * - Particles follow edge curves
 * - Speed based on relationship weight
 * - Different colors for different relationship types
 * - WebGL-optimized rendering
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, BufferAttribute, Points, PointsMaterial, Color } from 'three';
import { LayoutEdge, LayoutNode } from '../utils/graphLayout';

interface FlowParticlesProps {
  edge: LayoutEdge;
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  particleCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  enabled?: boolean;
  bidirectional?: boolean;
}

interface Particle {
  progress: number;
  speed: number;
  size: number;
  opacity: number;
  direction: number; // 1 for source->target, -1 for reverse
}

export const FlowParticles: React.FC<FlowParticlesProps> = ({
  edge,
  sourceNode,
  targetNode,
  particleCount = 8,
  speed = 0.5,
  size = 0.3,
  opacity = 0.8,
  enabled = true,
  bidirectional = false
}) => {
  const pointsRef = useRef<Points>(null);
  const geometryRef = useRef<BufferGeometry>(null);
  const materialRef = useRef<PointsMaterial>(null);
  
  // Initialize particles
  const particles = useMemo<Particle[]>(() => {
    const result: Particle[] = [];
    const baseSpeed = speed * (edge.weight || 1);
    
    for (let i = 0; i < particleCount; i++) {
      result.push({
        progress: (i / particleCount) * (bidirectional ? 0.5 : 1.0),
        speed: baseSpeed * (0.8 + Math.random() * 0.4), // Random speed variation
        size: size * (0.7 + Math.random() * 0.6),
        opacity: opacity * (0.6 + Math.random() * 0.4),
        direction: 1
      });
      
      // Add reverse particles for bidirectional edges
      if (bidirectional) {
        result.push({
          progress: 0.5 + (i / particleCount) * 0.5,
          speed: baseSpeed * (0.8 + Math.random() * 0.4),
          size: size * (0.7 + Math.random() * 0.6),
          opacity: opacity * (0.6 + Math.random() * 0.4),
          direction: -1
        });
      }
    }
    
    return result;
  }, [particleCount, speed, edge.weight, size, opacity, bidirectional]);

  // Calculate curved path between nodes
  const pathPoints = useMemo(() => {
    const source = new Vector3(sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0);
    const target = new Vector3(targetNode.x || 0, targetNode.y || 0, targetNode.z || 0);
    
    // Create control point for curve (elevated midpoint)
    const midpoint = source.clone().add(target).multiplyScalar(0.5);
    const distance = source.distanceTo(target);
    const curveHeight = Math.min(distance * 0.2, 5); // Limit curve height
    midpoint.y += curveHeight;
    
    // Generate curve points using quadratic Bézier
    const points: Vector3[] = [];
    const segments = 50;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new Vector3();
      
      // Quadratic Bézier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      const oneMinusT = 1 - t;
      point
        .copy(source)
        .multiplyScalar(oneMinusT * oneMinusT)
        .add(midpoint.clone().multiplyScalar(2 * oneMinusT * t))
        .add(target.clone().multiplyScalar(t * t));
      
      points.push(point);
    }
    
    return points;
  }, [sourceNode.x, sourceNode.y, sourceNode.z, targetNode.x, targetNode.y, targetNode.z]);

  // Get point along curve at given progress (0-1)
  const getPointAtProgress = (progress: number): Vector3 => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const index = clampedProgress * (pathPoints.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const t = index - lowerIndex;
    
    if (lowerIndex === upperIndex) {
      return pathPoints[lowerIndex].clone();
    }
    
    return pathPoints[lowerIndex]
      .clone()
      .lerp(pathPoints[upperIndex], t);
  };

  // Get particle color based on edge properties
  const particleColor = useMemo(() => {
    const baseColor = new Color(edge.color || '#888888');
    return baseColor.multiplyScalar(1.5); // Brighten for particles
  }, [edge.color]);

  // Initialize geometry
  useEffect(() => {
    if (!geometryRef.current) return;
    
    const geometry = geometryRef.current;
    const totalParticles = particles.length;
    
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);
    const opacities = new Float32Array(totalParticles);
    
    // Initialize particle positions and attributes
    particles.forEach((particle, index) => {
      const position = getPointAtProgress(particle.progress);
      
      positions[index * 3] = position.x;
      positions[index * 3 + 1] = position.y;
      positions[index * 3 + 2] = position.z;
      
      colors[index * 3] = particleColor.r;
      colors[index * 3 + 1] = particleColor.g;
      colors[index * 3 + 2] = particleColor.b;
      
      sizes[index] = particle.size;
      opacities[index] = particle.opacity;
    });
    
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new BufferAttribute(opacities, 1));
  }, [particles, particleColor, getPointAtProgress]);

  // Animation loop
  useFrame((_, delta) => {
    if (!enabled || !geometryRef.current) return;
    
    const geometry = geometryRef.current;
    const positions = geometry.getAttribute('position') as BufferAttribute;
    const opacityAttr = geometry.getAttribute('opacity') as BufferAttribute;
    
    // Update particle positions
    particles.forEach((particle, index) => {
      // Update progress
      particle.progress += particle.speed * delta * particle.direction;
      
      // Loop particles
      if (particle.direction === 1 && particle.progress > 1) {
        particle.progress = 0;
      } else if (particle.direction === -1 && particle.progress < 0) {
        particle.progress = 1;
      }
      
      // Calculate new position
      const position = getPointAtProgress(particle.progress);
      
      positions.setXYZ(index, position.x, position.y, position.z);
      
      // Fade in/out at ends
      let alpha = particle.opacity;
      if (particle.progress < 0.1) {
        alpha *= particle.progress / 0.1;
      } else if (particle.progress > 0.9) {
        alpha *= (1.0 - particle.progress) / 0.1;
      }
      
      opacityAttr.setX(index, alpha);
    });
    
    positions.needsUpdate = true;
    opacityAttr.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={opacity}
        size={size}
        sizeAttenuation={true}
        depthWrite={false}
        blending={2} // AdditiveBlending
      />
    </points>
  );
};
