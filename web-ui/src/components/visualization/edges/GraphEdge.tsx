import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { LayoutEdge, LayoutNode } from '../utils/graphLayout';
import { FlowParticles } from '../effects/FlowParticles';

interface GraphEdgeProps {
  edge: LayoutEdge;
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (edge: LayoutEdge) => void;
  onHover?: (edge: LayoutEdge | null) => void;
  animated?: boolean;
  showParticles?: boolean;
  particleCount?: number;
}

// Color mapping for different relationship types
const EDGE_COLORS = {
  FOLLOWS: '#3b82f6',      // Blue
  MENTIONS: '#10b981',     // Emerald
  CONTAINS: '#f59e0b',     // Amber
  RELATES_TO: '#8b5cf6',   // Violet
  BELONGS_TO: '#ef4444',   // Red
  CREATED: '#06b6d4',      // Cyan
  REFERENCES: '#84cc16',   // Lime
  default: '#6b7280'       // Gray
} as const;

const GraphEdge: React.FC<GraphEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  animated = false,
  showParticles = false,
  particleCount = 6
}) => {
  const lineRef = useRef<any>(null);
  const [localHovered, setLocalHovered] = useState(false);

  // Calculate edge geometry
  const { points, midpoint } = useMemo(() => {
    const source = new THREE.Vector3(
      sourceNode.x || 0,
      sourceNode.y || 0,
      sourceNode.z || 0
    );
    const target = new THREE.Vector3(
      targetNode.x || 0,
      targetNode.y || 0,
      targetNode.z || 0
    );

    // Create curved line for better visual separation
    const direction = target.clone().sub(source);
    const distance = direction.length();
    const midpoint = source.clone().add(direction.clone().multiplyScalar(0.5));
    
    // Add curve offset perpendicular to the line
    const perpendicular = new THREE.Vector3()
      .crossVectors(direction.normalize(), new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(distance * 0.1);
    
    const curvePoint = midpoint.clone().add(perpendicular);
    
    // Create smooth curve points
    const curve = new THREE.QuadraticBezierCurve3(source, curvePoint, target);
    const points = curve.getPoints(20);

    return {
      points,
      midpoint: curvePoint
    };
  }, [sourceNode.x, sourceNode.y, sourceNode.z, targetNode.x, targetNode.y, targetNode.z]);

  // Get color for relationship type
  const edgeColor = useMemo(() => {
    return edge.color || 
           EDGE_COLORS[edge.relationship as keyof typeof EDGE_COLORS] || 
           EDGE_COLORS.default;
  }, [edge.color, edge.relationship]);

  // Calculate line width based on weight and state
  const lineWidth = useMemo(() => {
    const baseWidth = Math.max(0.5, (edge.weight || 1) * 0.8);
    const scaleFactor = isSelected ? 2 : (isHovered || localHovered) ? 1.5 : 1;
    return baseWidth * scaleFactor;
  }, [edge.weight, isSelected, isHovered, localHovered]);

  // Calculate opacity
  const opacity = useMemo(() => {
    if (isSelected) return 1.0;
    if (isHovered || localHovered) return 0.8;
    return 0.6;
  }, [isSelected, isHovered, localHovered]);

  // Animation for data flow
  useFrame((state) => {
    if (animated && lineRef.current) {
      const time = state.clock.getElapsedTime();
      // Create flowing animation along the edge
      const material = lineRef.current.material;
      if (material && material.uniforms) {
        material.uniforms.time = { value: time };
      }
    }
  });

  // Handle mouse events
  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.(edge);
  };

  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setLocalHovered(true);
    onHover?.(edge);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setLocalHovered(false);
    onHover?.(null);
    document.body.style.cursor = 'default';
  };

  return (
    <group>
      {/* Main edge line */}
      <Line
        ref={lineRef}
        points={points}
        color={edgeColor}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* Arrow head for direction */}
      <mesh position={[targetNode.x || 0, targetNode.y || 0, targetNode.z || 0]}>
        <coneGeometry args={[lineWidth * 0.8, lineWidth * 2, 8]} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Edge label */}
      {(isSelected || localHovered) && (
        <group position={[midpoint.x, midpoint.y, midpoint.z]}>
          <mesh>
            <planeGeometry args={[edge.relationship.length * 0.8, 1.5]} />
            <meshBasicMaterial
              color="black"
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* TODO: Add Text component for edge labels when drei Text is working properly */}
        </group>
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Line
          points={points}
          color="#ffffff"
          lineWidth={lineWidth + 1}
          transparent
          opacity={0.3}
        />
      )}

      {/* Weight indicator */}
      {edge.weight && edge.weight > 1 && (isSelected || localHovered) && (
        <mesh position={[midpoint.x, midpoint.y + 2, midpoint.z]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial
            color={edgeColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Flow Particles */}
      {(showParticles || animated) && (
        <FlowParticles
          edge={edge}
          sourceNode={sourceNode}
          targetNode={targetNode}
          particleCount={particleCount}
          speed={0.5 * (edge.weight || 1)}
          enabled={true}
          bidirectional={false}
        />
      )}
    </group>
  );
};

export default GraphEdge;
