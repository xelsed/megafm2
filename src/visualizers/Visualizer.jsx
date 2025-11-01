import React, { useRef, useEffect, Suspense, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import { OrbitControls, Environment, Stats, useContextBridge, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

// Use lazy loading for better performance
const PianoRollVisualizer = React.lazy(() => import('./PianoRollVisualizer'));
const ParticleFieldVisualizer = React.lazy(() => import('./ParticleFieldVisualizer'));
const GeometricVisualizer = React.lazy(() => import('./GeometricVisualizer'));
const CymaticVisualizer = React.lazy(() => import('./CymaticVisualizer'));
const CellularVisualizer = React.lazy(() => import('./CellularVisualizer'));
const FluidVisualizer = React.lazy(() => import('./FluidVisualizer'));

// Main visualizer component that manages all visualization modes
const Visualizer = () => {
  const { camera, scene } = useThree();
  const groupRef = useRef();
  
  // Get current state from Redux with fallback values for safety
  const visualizationMode = useSelector(state => state.visualizer?.visualizationMode || 'pianoRoll');
  const activeNotes = useSelector(state => state.midi?.activeNotes || []);
  const autoRotate = useSelector(state => state.visualizer?.autoRotate || false);
  const cameraPosition = useSelector(state => state.visualizer?.cameraPosition || { x: 0, y: 0, z: 10 });
  const colorScheme = useSelector(state => state.visualizer?.colorScheme || 'spectrum');
  const currentAlgorithm = useSelector(state => state.algorithm?.currentAlgorithm || 'fractal');
  
  // Set initial camera position
  useEffect(() => {
    if (camera && cameraPosition) {
      camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      camera.lookAt(0, 0, 0);
    }
    
    // Set scene background based on color scheme
    if (scene) {
      if (colorScheme === 'spectrum') {
        scene.background = new THREE.Color(0x050510);
      } else if (colorScheme === 'harmony') {
        scene.background = new THREE.Color(0x051015);
      } else {
        scene.background = new THREE.Color(0x050510);
      }
      
      // Add fog for depth
      scene.fog = new THREE.FogExp2(scene.background, 0.035);
    }
  }, [camera, cameraPosition, scene, colorScheme]);
  
  // Get tempo from Redux store - must be outside useFrame to follow React hooks rules
  const tempo = useSelector(state => state.algorithm?.tempo || 120);
  
  // Performance monitoring state
  const [perfLevel, setPerfLevel] = useState('medium'); // low, medium, high
  const performanceMode = useSelector(state => state.visualizer?.renderQuality || 'high');
  const frameTimesRef = useRef([]);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const [fps, setFps] = useState(60);
  const [dynamicPerformanceEnabled, setDynamicPerformanceEnabled] = useState(true);
  
  // Handle auto-rotation and tempo synchronization of the visualization
  // Also handle performance monitoring
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Use tempo from the outer scope (closure)
    const normalizedDelta = delta * (tempo / 120); // Scale by tempo ratio
    
    // Apply auto-rotation if enabled
    if (autoRotate) {
      // Adjust rotation speed based on visualization mode and tempo
      let rotationSpeed = 0.1;
      
      // Slower rotation for some visualizers
      if (visualizationMode === 'cymatic' || visualizationMode === 'cellular') {
        rotationSpeed = 0.02;
      }
      
      // Scale rotation speed by tempo for better synchronization
      groupRef.current.rotation.y += normalizedDelta * rotationSpeed;
    }
    
    // Store timing data for child visualizers to use
    groupRef.current.userData = {
      ...groupRef.current.userData,
      tempo,
      delta: normalizedDelta,
      time: state.clock.elapsedTime
    };
    
    // Performance monitoring
    if (dynamicPerformanceEnabled) {
      const now = performance.now();
      
      if (lastFrameTimeRef.current) {
        const frameTime = now - lastFrameTimeRef.current;
        frameTimesRef.current.push(frameTime);
        
        // Keep only the last 60 frames for averaging
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
        
        // Calculate average FPS every 30 frames to avoid too frequent updates
        frameCountRef.current++;
        if (frameCountRef.current % 30 === 0) {
          const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          const currentFps = Math.round(1000 / avgFrameTime);
          setFps(currentFps);
          
          // Adjust performance level based on frame rate, but only if user hasn't explicitly set it
          if (performanceMode === 'auto') {
            // Low performance if under 30 FPS
            if (currentFps < 30 && perfLevel !== 'low') {
              console.log(`Performance degradation detected (${currentFps} FPS), switching to low quality`);
              setPerfLevel('low');
            } 
            // Medium performance between 30-50 FPS
            else if (currentFps >= 30 && currentFps < 50 && perfLevel !== 'medium') {
              console.log(`Medium performance detected (${currentFps} FPS)`);
              setPerfLevel('medium');
            } 
            // High performance above 50 FPS
            else if (currentFps >= 50 && perfLevel !== 'high') {
              console.log(`High performance detected (${currentFps} FPS), enabling high quality`);
              setPerfLevel('high');
            }
          }
        }
      }
      
      lastFrameTimeRef.current = now;
    }
  });
  
  // Dynamic camera settings based on visualizer type
  useEffect(() => {
    if (!camera) return;
    
    // Reset camera position for different visualizers
    let newPosition = { x: 0, y: 0, z: 10 };
    
    switch (visualizationMode) {
      case 'pianoRoll':
        newPosition = { x: 0, y: 5, z: 12 };
        break;
      case 'particleField':
        newPosition = { x: 0, y: 0, z: 15 };
        break;
      case 'geometricObjects':
        newPosition = { x: 5, y: 5, z: 10 };
        break;
      case 'cymatic':
        newPosition = { x: 0, y: 8, z: 8 };
        break;
      case 'cellular':
        newPosition = { x: 0, y: 10, z: 10 };
        break;
      default:
        newPosition = { x: 0, y: 0, z: 12 };
    }
    
    // Clear any existing animation
    const animationId = groupRef.current?.userData?.cameraAnimationId;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Smoothly transition camera
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const duration = 1.5; // seconds
    let startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease in-out function
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      camera.position.x = startPos.x + (newPosition.x - startPos.x) * easeProgress;
      camera.position.y = startPos.y + (newPosition.y - startPos.y) * easeProgress;
      camera.position.z = startPos.z + (newPosition.z - startPos.z) * easeProgress;
      
      camera.lookAt(0, 0, 0);
      
      if (progress < 1) {
        const id = requestAnimationFrame(animateCamera);
        // Store animation ID for cleanup
        if (groupRef.current) {
          groupRef.current.userData = {
            ...groupRef.current.userData,
            cameraAnimationId: id
          };
        }
      } else if (groupRef.current) {
        // Clear animation ID when done
        groupRef.current.userData = {
          ...groupRef.current.userData,
          cameraAnimationId: null
        };
      }
    };
    
    animateCamera();
    
    // Clean up any ongoing camera animation on unmount or mode change
    return () => {
      const animId = groupRef.current?.userData?.cameraAnimationId;
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [visualizationMode, camera]);
  
  // Coordinate visualization speed with algorithm tempo
  useEffect(() => {
    // Align animation speeds with the algorithm's tempo
    // This ensures visual transitions match musical timing
    if (groupRef.current && currentAlgorithm) {
      // Store the algorithm type and any special timing requirements
      groupRef.current.userData = {
        ...groupRef.current.userData,
        currentAlgorithm,
        visualizationMode,
      };
      
      // Each algorithm has different visual tempo needs
      if (currentAlgorithm === 'cellular' && visualizationMode !== 'cellular') {
        // Force appropriate visualizer if needed through Redux actions
        // This ensures alignment between algorithm and visualization
        // Would dispatch here if needed, but it's handled in AlgorithmEngine now
      }
    }
  }, [currentAlgorithm, visualizationMode]);
  
  // Set performance level based on state or detect on first render
  useEffect(() => {
    // If user explicitly set a performance level, use that
    if (performanceMode !== 'auto') {
      setPerfLevel(performanceMode);
      // Disable dynamic performance adjustment for explicit settings
      setDynamicPerformanceEnabled(false);
    } else {
      // Enable dynamic performance adjustment for auto mode
      setDynamicPerformanceEnabled(true);
      
      // Initial detection for auto mode
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isLowPerfDevice = isMobile || (window.innerWidth <= 1024);
      setPerfLevel(isLowPerfDevice ? 'low' : 'medium');
    }
  }, [performanceMode]);
  
  // Memoize active notes to prevent unnecessary re-renders
  const memoizedActiveNotes = useMemo(() => activeNotes, 
    // Ensure proper dependency by creating a stable identifier for the notes
    [
      activeNotes.length, 
      // Create a stable identifier by checking the first note's value when available
      activeNotes.length > 0 && activeNotes[0].note ? activeNotes[0].note : 0,
      // Check for last note change to catch updates at the end of the array
      activeNotes.length > 0 ? activeNotes[activeNotes.length - 1]?.timestamp || 0 : 0
    ]);
  
  // Get current visualizer based on mode - memoized for performance
  const CurrentVisualizer = useMemo(() => {
    switch (visualizationMode) {
      case 'pianoRoll': return PianoRollVisualizer;
      case 'particleField': return ParticleFieldVisualizer;
      case 'geometricObjects': return GeometricVisualizer;
      case 'cymatic': return CymaticVisualizer;
      case 'cellular': return CellularVisualizer;
      case 'fluid': return FluidVisualizer;
      default: return PianoRollVisualizer;
    }
  }, [visualizationMode]);
  
  // Adaptive performance settings based on detected performance level
  const particleCount = useMemo(() => {
    switch (perfLevel) {
      case 'low': return 500;
      case 'medium': return 1500;
      case 'high': return 3000;
      default: return 1500;
    }
  }, [perfLevel]);
  
  const maxGeometricObjects = useMemo(() => {
    switch (perfLevel) {
      case 'low': return 50;
      case 'medium': return 150;
      case 'high': return 300;
      default: return 150;
    }
  }, [perfLevel]);
  
  // Pass performance level and particle count to child components
  const visualizerProps = useMemo(() => ({
    notes: memoizedActiveNotes,
    perfLevel,
    particleCount,
    maxGeometricObjects,
    tempo,
    colorScheme,
    currentAlgorithm
  }), [memoizedActiveNotes, perfLevel, particleCount, maxGeometricObjects, tempo, colorScheme, currentAlgorithm]);
  
  // Debug info for development
  const showDebugInfo = process.env.NODE_ENV === 'development';
  
  return (
    <Suspense fallback={null}>
      {/* Performance monitor - only in development */}
      {showDebugInfo && (
        <Stats showPanel={0} className="stats-panel" />
      )}
      
      {/* Adaptive DPR for performance */}
      <AdaptiveDpr pixelated />
      
      {/* Environment lighting */}
      <Environment preset="night" />
      
      {/* Global lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8} 
        castShadow={perfLevel === 'high'}
        shadow-mapSize-width={perfLevel === 'high' ? 1024 : 512}
        shadow-mapSize-height={perfLevel === 'high' ? 1024 : 512}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#4466ff" />
      
      {/* Controls */}
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        dampingFactor={0.1}
        enableDamping
      />
      
      {/* Visualization container with named reference for child components */}
      <group ref={groupRef} name="visualizerGroup">
        <CurrentVisualizer 
          activeNotes={memoizedActiveNotes} 
          perfLevel={perfLevel}
          particleCount={particleCount}
        />
      </group>
    </Suspense>
  );
};

export default Visualizer;