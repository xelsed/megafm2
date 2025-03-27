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
  
  // Handle auto-rotation and tempo synchronization of the visualization
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
        requestAnimationFrame(animateCamera);
      }
    };
    
    animateCamera();
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
  
  // Performance settings
  const [perfLevel, setPerfLevel] = useState('medium'); // low, medium, high
  const performanceMode = useSelector(state => state.visualizer?.renderQuality || 'high');
  
  // Set performance level based on state or detect on first render
  useEffect(() => {
    if (performanceMode !== perfLevel) {
      setPerfLevel(performanceMode);
    } else if (perfLevel === 'medium') {
      // Auto-detect performance level on first render if not explicitly set
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isLowPerfDevice = isMobile || (window.innerWidth <= 1024);
      setPerfLevel(isLowPerfDevice ? 'low' : 'high');
    }
  }, [performanceMode, perfLevel]);
  
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
      default: return PianoRollVisualizer;
    }
  }, [visualizationMode]);
  
  // Adaptive performance settings
  const particleCount = useMemo(() => {
    switch (perfLevel) {
      case 'low': return 500;
      case 'medium': return 1500;
      case 'high': return 3000;
      default: return 1500;
    }
  }, [perfLevel]);
  
  // Render the appropriate visualizer based on the selected mode
  return (
    <Suspense fallback={null}>
      {/* Performance monitor - only in development */}
      {process.env.NODE_ENV === 'development' && (
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