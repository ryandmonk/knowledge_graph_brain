import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode3D } from '../../../utils/api';
import { PulsingNode } from '../effects/PulsingNode';
import { LayoutNode } from '../utils/graphLayout';

interface GraphNodeProps {
  node: LayoutNode; // Changed from GraphNode3D to LayoutNode for consistency
  position: [number, number, number];
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (node: GraphNode3D) => void;
  onHover?: (node: GraphNode3D | null) => void;
  showLabel?: boolean;
  cameraDistance?: number;
  activityLevel?: number; // For pulsing animation
  enablePulsing?: boolean;
}

// Color mapping for different node types
const NODE_COLORS = {
  Person: '#4f46e5',     // Indigo
  Document: '#059669',   // Emerald  
  Organization: '#dc2626', // Red
  Event: '#7c3aed',      // Violet
  Location: '#ea580c',   // Orange
  Concept: '#0891b2',    // Cyan
  Unknown: '#6b7280'     // Gray
} as const;

const GraphNode: React.FC<GraphNodeProps> = ({
  node,
  position,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  showLabel = true,
  cameraDistance = 100,
  activityLevel = 0,
  enablePulsing = true
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [localHovered, setLocalHovered] = useState(false);
  
  // Calculate node size based on properties and connections
  const nodeSize = useMemo(() => {
    const baseSize = node.size || 1;
    const scaleFactor = isSelected ? 1.5 : isHovered || localHovered ? 1.2 : 1;
    return Math.max(0.8, baseSize * scaleFactor);
  }, [node.size, isSelected, isHovered, localHovered]);

  // Get color for node type
  const nodeColor = useMemo(() => {
    return node.color || NODE_COLORS[node.type as keyof typeof NODE_COLORS] || NODE_COLORS.Unknown;
  }, [node.color, node.type]);

  // Calculate emissive intensity for glow effect
  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.4;
    if (isHovered || localHovered) return 0.3;
    return 0.1;
  }, [isSelected, isHovered, localHovered]);

  // Animation for selected/hovered state
  useFrame((state) => {
    if (meshRef.current && (isSelected || localHovered)) {
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.y = time * 0.5;
    }
  });

  // Handle mouse events
  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.(node);
  };

  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setLocalHovered(true);
    onHover?.(node);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setLocalHovered(false);
    onHover?.(null);
    document.body.style.cursor = 'default';
  };

  // Calculate label visibility based on camera distance
  const showLabelAtDistance = useMemo(() => {
    return showLabel && cameraDistance < 150;
  }, [showLabel, cameraDistance]);

  return (
    <PulsingNode
      node={node}
      position={position}
      isSelected={isSelected}
      isHovered={isHovered || localHovered}
      activityLevel={activityLevel}
      pulseEnabled={enablePulsing}
    >
      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[nodeSize, 16, 16]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.8}
          transparent={true}
          opacity={isSelected ? 1.0 : 0.9}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize * 1.3, nodeSize * 1.5, 32]} />
          <meshBasicMaterial
            color={nodeColor}
            transparent={true}
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Node label */}
      {showLabelAtDistance && (
        <Text
          position={[0, nodeSize + 1, 0]}
          fontSize={Math.max(0.8, nodeSize * 0.6)}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.1}
          outlineColor="black"
          maxWidth={20}
          textAlign="center"
        >
          {node.label}
        </Text>
      )}

      {/* Type indicator */}
      {(isHovered || localHovered || isSelected) && (
        <Text
          position={[0, -nodeSize - 0.8, 0]}
          fontSize={0.5}
          color="#aaaaaa"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.05}
          outlineColor="black"
        >
          {node.type}
        </Text>
      )}
    </PulsingNode>
  );
};

export default GraphNode;
