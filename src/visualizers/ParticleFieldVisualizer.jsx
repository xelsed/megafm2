import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// Simple particle field visualizer that reacts to music
const ParticleFieldVisualizer = ({ activeNotes = [] }) => {
  const particlesRef = useRef();
  const particleCount = 2000;
  
  // Create particles with initial random positions
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Random position in a sphere
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);     // x
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // y
      positions[i * 3 + 2] = radius * Math.cos(phi);                   // z
      
      // Random color
      colors[i * 3] = 0.3 + Math.random() * 0.7;     // r
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.7; // g
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // b - more blue
      
      // Random size
      sizes[i] = 0.1 + Math.random() * 0.2;
    }
    
    return { positions, colors, sizes };
  }, [particleCount]);
  
  // Update particles on each frame
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const colors = particlesRef.current.geometry.attributes.color.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    // Pulse effect based on active notes
    const pulseStrength = activeNotes.length * 0.1;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < particleCount; i++) {
      // Add some simple animation - particles orbit and pulsate
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Orbit movement
      const distance = Math.sqrt(x * x + z * z);
      const angle = Math.atan2(z, x) + delta * 0.1 * (1 + Math.sin(time * 0.1) * 0.1);
      
      positions[i * 3] = distance * Math.cos(angle);     // new x
      positions[i * 3 + 2] = distance * Math.sin(angle); // new z
      
      // Add vertical wave
      positions[i * 3 + 1] = y + Math.sin(time + i * 0.01) * 0.02;
      
      // Size pulsing based on active notes
      sizes[i] = (0.1 + Math.random() * 0.2) * (1 + pulseStrength * Math.sin(time * 5 + i * 0.01));
      
      // Color changes based on active notes
      if (activeNotes.length > 0 && i % 20 === 0) {
        // Change some particles to highlight colors
        const noteIndex = i % activeNotes.length;
        const note = activeNotes[noteIndex]?.note || 60;
        
        // Map note to color (hue)
        const hue = ((note % 12) / 12);
        const { r, g, b } = new THREE.Color().setHSL(hue, 0.8, 0.6);
        
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
  });
  
  // Create the particle system
  return (
    <group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={particles.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={particles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      
      <Text
        position={[0, 7, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Particle Field Visualizer
      </Text>
    </group>
  );
};

export default ParticleFieldVisualizer;