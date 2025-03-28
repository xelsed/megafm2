import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useThreeResources, addTrackedEventListener } from './BaseVisualizerComponent';

// Simple particle field visualizer that reacts to music
const ParticleFieldVisualizer = ({ activeNotes = [], perfLevel = 'medium', particleCount = 2000 }) => {
  const particlesRef = useRef();
  
  // Set actual particle count based on performance level
  const actualParticleCount = useMemo(() => {
    return particleCount; // Already received from parent based on performance level
  }, [particleCount]);
  
  // Create particles with initial random positions
  const particles = useMemo(() => {
    const positions = new Float32Array(actualParticleCount * 3);
    const colors = new Float32Array(actualParticleCount * 3);
    const sizes = new Float32Array(actualParticleCount);
    
    for (let i = 0; i < actualParticleCount; i++) {
      // Random position in a sphere
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Random colors
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
      
      // Random sizes
      sizes[i] = Math.random() * 0.5 + 0.1;
    }
    
    return { positions, colors, sizes };
  }, [actualParticleCount]);
  
  // Track all Three.js resources for proper cleanup
  const resourcesRef = useThreeResources(() => {
    // Create the geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particles.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(particles.sizes, 1));
    
    // Create the material
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    // Bind resize event
    const handleResize = () => {
      // Any resize handling logic
    };
    
    addTrackedEventListener(resourcesRef, window, 'resize', handleResize);
    
    return {
      geometries: [geometry],
      materials: [material],
      textures: [],
      renderTargets: [],
      eventListeners: []
    };
  }, [particles]);
  
  // React to active notes
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const colors = particlesRef.current.geometry.attributes.color.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    // Make particles react to notes
    const activeNoteCount = activeNotes.length;
    
    // Simple animation for all particles
    for (let i = 0; i < actualParticleCount; i++) {
      // Get current position
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Add small random movement
      positions[i * 3] += (Math.random() - 0.5) * 0.01 * delta * 60;
      positions[i * 3 + 1] += (Math.random() - 0.5) * 0.01 * delta * 60;
      positions[i * 3 + 2] += (Math.random() - 0.5) * 0.01 * delta * 60;
      
      // Make particles pulse with active notes
      if (activeNoteCount > 0) {
        for (let j = 0; j < activeNoteCount; j++) {
          const note = activeNotes[j];
          
          if (note && note.velocity) {
            // Map note velocity to particle size
            const velocityFactor = note.velocity / 127;
            sizes[i] = 0.1 + Math.random() * 0.4 * velocityFactor;
            
            // Map note pitch to particle color
            if (note.pitch) {
              const pitchNormalized = (note.pitch - 36) / 60; // Normalize to 0-1 range for typical MIDI notes
              
              // Create color based on pitch
              colors[i * 3] = pitchNormalized; // Red increases with pitch
              colors[i * 3 + 1] = 1 - pitchNormalized; // Green decreases with pitch
              colors[i * 3 + 2] = 0.5; // Blue constant
            }
          }
        }
      } else {
        // Default behavior when no notes are active
        sizes[i] = 0.1 + Math.sin(distance + state.clock.elapsedTime) * 0.05;
        
        // Slowly return to original colors
        colors[i * 3] = (colors[i * 3] * 0.95) + (Math.random() * 0.05);
        colors[i * 3 + 1] = (colors[i * 3 + 1] * 0.95) + (Math.random() * 0.05);
        colors[i * 3 + 2] = (colors[i * 3 + 2] * 0.95) + (Math.random() * 0.05);
      }
    }
    
    // Update the geometry attributes
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
  });
  
  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry attach="geometry" {...resourcesRef.current?.geometries[0]} />
        <pointsMaterial 
          attach="material"
          size={0.1}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
      
      <Text
        position={[0, 8, 0]}
        color="white"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        Particle Field Visualizer
      </Text>
    </>
  );
};

export default ParticleFieldVisualizer;