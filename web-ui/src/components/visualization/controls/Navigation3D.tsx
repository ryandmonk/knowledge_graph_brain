import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Navigation3DProps {
  enabled?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  keyboardControls?: boolean;
  touchControls?: boolean;
}

const Navigation3D: React.FC<Navigation3DProps> = ({
  enabled = true,
  autoRotate = false,
  autoRotateSpeed = 0.5,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  minDistance = 10,
  maxDistance = 1000,
  onCameraChange,
  keyboardControls = true,
  touchControls = true
}) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const [isAnimating] = useState(false);
  const keyPressedRef = useRef<Set<string>>(new Set());

  // Initialize controls
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    
    // Configure controls
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = enablePan;
    controls.enableZoom = enableZoom;
    controls.enableRotate = enableRotate;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.maxPolarAngle = Math.PI;
    controls.minPolarAngle = 0;

    // Touch controls configuration
    if (touchControls) {
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
    }

    // Camera change listener
    const handleChange = () => {
      if (onCameraChange) {
        onCameraChange(camera.position.clone(), controls.target.clone());
      }
    };

    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener('change', handleChange);
    };
  }, [camera, enablePan, enableZoom, enableRotate, autoRotate, autoRotateSpeed, minDistance, maxDistance, onCameraChange, touchControls]);

  // Keyboard navigation
  useEffect(() => {
    if (!keyboardControls || !enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      keyPressedRef.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keyPressedRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardControls, enabled]);

  // Smooth camera animations (for future API exposure)
  // const animateToPosition = useCallback(
  //   (position: THREE.Vector3, target: THREE.Vector3, duration: number = 1000) => {
  //     if (!controlsRef.current) return;

  //     setIsAnimating(true);
  //     const controls = controlsRef.current;
  //     const startPosition = camera.position.clone();
  //     const startTarget = controls.target.clone();
      
  //     let startTime: number;

  //     const animate = (time: number) => {
  //       if (!startTime) startTime = time;
  //       const elapsed = time - startTime;
  //       const progress = Math.min(elapsed / duration, 1);

  //       // Smooth easing function
  //       const easeInOut = (t: number) => t * t * (3 - 2 * t);
  //       const easedProgress = easeInOut(progress);

  //       // Interpolate position and target
  //       camera.position.lerpVectors(startPosition, position, easedProgress);
  //       controls.target.lerpVectors(startTarget, target, easedProgress);
  //       controls.update();

  //       if (progress < 1) {
  //         requestAnimationFrame(animate);
  //       } else {
  //         setIsAnimating(false);
  //       }
  //     };

  //     requestAnimationFrame(animate);
  //   },
  //   [camera]
  // );

  // Frame-based keyboard movement
  useFrame((_state, delta) => {
    if (!controlsRef.current || !keyboardControls || !enabled) return;

    const controls = controlsRef.current;
    const keys = keyPressedRef.current;
    const speed = 50 * delta;
    let needsUpdate = false;

    // WASD movement
    if (keys.has('w') || keys.has('arrowup')) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.add(forward.multiplyScalar(speed));
      needsUpdate = true;
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      camera.position.add(backward.multiplyScalar(speed));
      needsUpdate = true;
    }
    if (keys.has('a') || keys.has('arrowleft')) {
      const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
      camera.position.add(left.multiplyScalar(speed));
      needsUpdate = true;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      camera.position.add(right.multiplyScalar(speed));
      needsUpdate = true;
    }

    // QE for up/down movement
    if (keys.has('q')) {
      camera.position.y += speed;
      needsUpdate = true;
    }
    if (keys.has('e')) {
      camera.position.y -= speed;
      needsUpdate = true;
    }

    if (needsUpdate) {
      controls.update();
    }
  });

  // Public API for external control (can be exposed later via ref)
  // const navigationAPI = {
  //   animateToPosition,
  //   resetView: () => {
  //     animateToPosition(
  //       new THREE.Vector3(50, 50, 50),
  //       new THREE.Vector3(0, 0, 0)
  //     );
  //   },
  //   focusOnPoint: (point: THREE.Vector3, distance: number = 100) => {
  //     const direction = camera.position.clone().sub(point).normalize();
  //     const newPosition = point.clone().add(direction.multiplyScalar(distance));
  //     animateToPosition(newPosition, point);
  //   },
  //   setAutoRotate: (enabled: boolean) => {
  //     if (controlsRef.current) {
  //       controlsRef.current.autoRotate = enabled;
  //     }
  //   },
  //   isAnimating
  // };

  // Store API in a ref for external access  
  // Note: Exposing navigation API for external control

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enabled && !isAnimating}
      enableDamping
      dampingFactor={0.05}
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI}
      minPolarAngle={0}
    />
  );
};

export default Navigation3D;
export type { Navigation3DProps };
