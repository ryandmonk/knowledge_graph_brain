import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface SelectionState {
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  hoveredNode: string | null;
  hoveredEdge: string | null;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    type: 'node' | 'edge' | null;
    targetId: string | null;
  };
}

interface SelectionManagerProps {
  onSelectionChange?: (selection: SelectionState) => void;
  multiSelect?: boolean;
  enabled?: boolean;
}

// Future API interface for external control
// interface SelectionManagerAPI {
//   clearSelection: () => void;
//   selectNode: (nodeId: string, multi?: boolean) => void;
//   selectEdge: (edgeId: string, multi?: boolean) => void;
//   getSelection: () => SelectionState;
// }

export const SelectionManager: React.FC<SelectionManagerProps> = ({
  onSelectionChange,
  multiSelect = true,
  enabled = true
}) => {
  const { scene, camera, gl } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    hoveredNode: null,
    hoveredEdge: null,
    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      type: null,
      targetId: null
    }
  });

  // Update parent component when selection changes
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  // Mouse interaction handlers
  const handleMouseMove = (event: MouseEvent) => {
    if (!enabled) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycasting to detect hovered objects
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    let hoveredNode: string | null = null;
    let hoveredEdge: string | null = null;

    for (const intersect of intersects) {
      const object = intersect.object;
      if (object.userData.type === 'node' && object.userData.nodeId) {
        hoveredNode = object.userData.nodeId;
        break;
      } else if (object.userData.type === 'edge' && object.userData.edgeId) {
        hoveredEdge = object.userData.edgeId;
        break;
      }
    }

    setSelection(prev => ({
      ...prev,
      hoveredNode,
      hoveredEdge
    }));

    // Update cursor style
    gl.domElement.style.cursor = (hoveredNode || hoveredEdge) ? 'pointer' : 'default';
  };

  const handleMouseClick = (event: MouseEvent) => {
    if (!enabled) return;

    // Hide context menu on click
    if (selection.contextMenu.visible) {
      setSelection(prev => ({
        ...prev,
        contextMenu: { ...prev.contextMenu, visible: false }
      }));
      return;
    }

    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    let clicked = false;

    for (const intersect of intersects) {
      const object = intersect.object;
      
      if (object.userData.type === 'node' && object.userData.nodeId) {
        handleNodeClick(object.userData.nodeId, event.ctrlKey || event.metaKey);
        clicked = true;
        break;
      } else if (object.userData.type === 'edge' && object.userData.edgeId) {
        handleEdgeClick(object.userData.edgeId, event.ctrlKey || event.metaKey);
        clicked = true;
        break;
      }
    }

    // Clear selection if clicking on empty space
    if (!clicked && !event.ctrlKey && !event.metaKey) {
      setSelection(prev => ({
        ...prev,
        selectedNodes: new Set(),
        selectedEdges: new Set()
      }));
    }
  };

  const handleContextMenu = (event: MouseEvent) => {
    if (!enabled) return;
    
    event.preventDefault();

    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    for (const intersect of intersects) {
      const object = intersect.object;
      
      if (object.userData.type === 'node' && object.userData.nodeId) {
        setSelection(prev => ({
          ...prev,
          contextMenu: {
            visible: true,
            x: event.clientX,
            y: event.clientY,
            type: 'node',
            targetId: object.userData.nodeId
          }
        }));
        return;
      } else if (object.userData.type === 'edge' && object.userData.edgeId) {
        setSelection(prev => ({
          ...prev,
          contextMenu: {
            visible: true,
            x: event.clientX,
            y: event.clientY,
            type: 'edge',
            targetId: object.userData.edgeId
          }
        }));
        return;
      }
    }
  };

  const handleNodeClick = (nodeId: string, isMultiSelect: boolean) => {
    setSelection(prev => {
      const newSelectedNodes = new Set(prev.selectedNodes);
      
      if (isMultiSelect && multiSelect) {
        if (newSelectedNodes.has(nodeId)) {
          newSelectedNodes.delete(nodeId);
        } else {
          newSelectedNodes.add(nodeId);
        }
      } else {
        newSelectedNodes.clear();
        newSelectedNodes.add(nodeId);
      }

      return {
        ...prev,
        selectedNodes: newSelectedNodes,
        selectedEdges: isMultiSelect && multiSelect ? prev.selectedEdges : new Set()
      };
    });
  };

  const handleEdgeClick = (edgeId: string, isMultiSelect: boolean) => {
    setSelection(prev => {
      const newSelectedEdges = new Set(prev.selectedEdges);
      
      if (isMultiSelect && multiSelect) {
        if (newSelectedEdges.has(edgeId)) {
          newSelectedEdges.delete(edgeId);
        } else {
          newSelectedEdges.add(edgeId);
        }
      } else {
        newSelectedEdges.clear();
        newSelectedEdges.add(edgeId);
      }

      return {
        ...prev,
        selectedNodes: isMultiSelect && multiSelect ? prev.selectedNodes : new Set(),
        selectedEdges: newSelectedEdges
      };
    });
  };

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key.toLowerCase()) {
        case 'escape':
          setSelection(prev => ({
            ...prev,
            selectedNodes: new Set(),
            selectedEdges: new Set(),
            contextMenu: { ...prev.contextMenu, visible: false }
          }));
          break;
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Select all nodes (implementation depends on available nodes)
            console.log('Select All - Feature ready for implementation');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  // Set up mouse event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleMouseClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, selection.contextMenu.visible]);

  // Public API for external control (future ref exposure)
  // const selectionAPI: SelectionManagerAPI = {
  //   clearSelection: () => {
  //     setSelection(prev => ({
  //       ...prev,
  //       selectedNodes: new Set(),
  //       selectedEdges: new Set()
  //     }));
  //   },
  //   selectNode: (nodeId: string, multi: boolean = false) => {
  //     handleNodeClick(nodeId, multi);
  //   },
  //   selectEdge: (edgeId: string, multi: boolean = false) => {
  //     handleEdgeClick(edgeId, multi);
  //   },
  //   getSelection: () => selection
  // };

  // Store API for external access (future ref exposure)
  // Note: This could be exposed via forwardRef if needed

  return null; // This component handles events, no visual rendering
};

export default SelectionManager;
