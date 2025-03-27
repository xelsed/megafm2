import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// Calculate frequency from MIDI note number
const midiNoteToFrequency = (note) => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

// Generate cymatics pattern equations
const getPatternEquation = (type, frequency, x, y, time, amplitude = 1) => {
  const k = frequency * 0.02; // Wave number scaling
  const omega = frequency * 0.5; // Angular frequency scaling
  
  switch (type) {
    case 'bessel':
      const r = Math.sqrt(x*x + y*y);
      return amplitude * Math.cos(omega * time) * Math.sin(k * r) / (k * r || 1);
      
    case 'chladni':
      return amplitude * Math.sin(k * x) * Math.sin(k * y) * Math.cos(omega * time);
      
    case 'standing-wave':
      return amplitude * Math.sin(k * x) * Math.cos(omega * time);
      
    case 'interference':
      return amplitude * (Math.sin(k * x + omega * time) + Math.sin(k * y + omega * time));
      
    case 'harmonic':
      const n = Math.floor(frequency / 55) + 1; // Harmonic number
      return amplitude * Math.sin(n * k * x) * Math.sin(n * k * y) * Math.cos(omega * time);
      
    default:
      return 0;
  }
};

const CymaticVisualizer = ({ activeNotes = [] }) => {
  const meshRef = useRef();
  const planeSize = 10;
  const resolution = 64; // Resolution of the grid
  
  // Create the geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(planeSize, planeSize, resolution, resolution);
    // Rotate to be horizontal
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [planeSize, resolution]);
  
  // Shader materials for cymatics
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x000022) },
        colorB: { value: new THREE.Color(0x6677ff) }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
          vUv = uv;
          
          // Pass elevation to fragment shader
          vElevation = position.y;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
          // Map elevation to color gradient
          float intensity = smoothstep(-0.5, 0.5, vElevation);
          
          // Create glow effect
          float glow = smoothstep(0.1, 0.5, abs(vElevation)) * 0.5;
          
          // Mix colors based on elevation
          vec3 color = mix(colorA, colorB, intensity + glow);
          
          // Add rings to enhance cymatics visualization
          float rings = sin(length(vUv - 0.5) * 20.0) * 0.5 + 0.5;
          color = mix(color, vec3(1.0, 1.0, 1.0), rings * abs(vElevation) * 0.3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: false,
      side: THREE.DoubleSide
    });
  }, []);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const positions = meshRef.current.geometry.attributes.position.array;
    
    // Update shader time uniform
    if (meshRef.current.material.uniforms) {
      meshRef.current.material.uniforms.time.value = time;
    }
    
    // No active notes - create gentle ripples
    if (activeNotes.length === 0) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Distance from center
        const dist = Math.sqrt(x * x + z * z);
        
        // Simple ripple effect
        positions[i + 1] = Math.sin(dist * 2.0 - time * 2) * 0.1;
      }
    } else {
      // Apply cymatics patterns based on active notes
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Normalize coordinates to -1 to 1 range
        const nx = x / (planeSize / 2);
        const nz = z / (planeSize / 2);
        
        let elevation = 0;
        
        // Sum the effects of all active notes
        activeNotes.forEach((noteData, index) => {
          const note = noteData?.note || 60;
          const velocity = noteData?.velocity || 100;
          const normalized_velocity = velocity / 127;
          
          // Calculate frequency from note
          const freq = midiNoteToFrequency(note);
          
          // Choose pattern type based on note pitch class
          const patternTypes = ['bessel', 'chladni', 'standing-wave', 'interference', 'harmonic'];
          const patternType = patternTypes[note % patternTypes.length];
          
          // Get pattern value and scale by velocity
          const amplitude = normalized_velocity * 0.3;
          const patternValue = getPatternEquation(patternType, freq, nx, nz, time, amplitude);
          
          // Add this note's contribution to the total elevation
          elevation += patternValue;
        });
        
        // Set the Y position (elevation)
        positions[i + 1] = elevation;
      }
    }
    
    // Update the geometry
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate the entire plane gently
    meshRef.current.rotation.y = time * 0.1;
  });
  
  return (
    <group>
      <mesh ref={meshRef} position={[0, -1, 0]}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
      
      <Text
        position={[0, 7, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Cymatic Visualizer
      </Text>
    </group>
  );
};

export default CymaticVisualizer;