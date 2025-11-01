import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import { Sphere, Text, OrbitControls, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Custom shader for fluid simulation
const FluidMaterial = shaderMaterial(
  // Uniforms
  {
    time: 0,
    resolution: new THREE.Vector2(1, 1),
    baseColor: new THREE.Color(0x0c3862),
    highlightColor: new THREE.Color(0x18a0fb),
    noiseScale: 2.0,
    noiseSpeed: 0.5,
    noiseStrength: 1.2,
    activeNotes: new Float32Array(128).fill(0),
    noteIntensity: new Float32Array(128).fill(0)
  },
  // Vertex shader
  /* glsl */`
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normal;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /* glsl */`
    uniform float time;
    uniform vec2 resolution;
    uniform vec3 baseColor;
    uniform vec3 highlightColor;
    uniform float noiseScale;
    uniform float noiseSpeed;
    uniform float noiseStrength;
    uniform float activeNotes[128];
    uniform float noteIntensity[128];
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      // First corner
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      // x0 = x0 - 0. + 0.0 * C 
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      
      // Permutations
      i = mod289(i);
      vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
      // Gradients
      // (N*N points uniformly over a square, mapped onto an octahedron)
      float n_ = 1.0/7.0; // N=7
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  // fmod(p,N*N)
      
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);    // fmod(j,N)
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      // Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      // Base fluid movement
      float noise1 = snoise(vec3(vUv * noiseScale, time * noiseSpeed)) * 0.5 + 0.5;
      float noise2 = snoise(vec3(vUv * noiseScale * 2.0, time * noiseSpeed * 0.8 + 10.0)) * 0.5 + 0.5;
      
      // Note influence
      float noteEffect = 0.0;
      float noteCount = 0.0;
      
      // Calculate the effect of active notes on this fragment
      for (int i = 0; i < 128; i++) {
        if (activeNotes[i] > 0.1) {
          // Each note affects a different part of the spectrum
          float notePitch = float(i) / 127.0;
          float dist = abs(vUv.x - notePitch) * 2.0;
          float contrib = max(0.0, 1.0 - dist) * noteIntensity[i];
          noteEffect += contrib;
          noteCount += 1.0;
        }
      }
      
      // Normalize note effect and boost it
      noteEffect = noteEffect > 0.0 ? noteEffect * (1.0 + noteCount * 0.05) : 0.0;
      
      // Combine noises
      float finalNoise = mix(noise1, noise2, 0.5) * noiseStrength;
      
      // Add note influence to noise
      finalNoise += noteEffect * 0.5;
      
      // Create dynamic color based on noise and note activity
      vec3 color = mix(baseColor, highlightColor, finalNoise);
      
      // Add highlights for high note activity
      if (noteEffect > 0.8) {
        color += vec3(0.2, 0.5, 0.8) * (noteEffect - 0.8) * 5.0;
      }
      
      // Add fresnel effect for edge glow
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
      color = mix(color, highlightColor, fresnel * 0.6);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

// Extend Three Fiber with our custom material
extend({ FluidMaterial });

/**
 * FluidVisualizer - A fluid dynamics based visualizer that responds to MIDI notes
 * Simulates liquid-like motion with dynamic responses to active notes
 */
const FluidVisualizer = ({ activeNotes = [], perfLevel = 'medium' }) => {
  // Refs for animated elements
  const meshRef = useRef();
  const materialRef = useRef();
  const textRef = useRef();
  const pointsRef = useRef();
  
  // Configuration state
  const [resolution] = useState(() => new THREE.Vector2(1024, 1024));
  const [noteInfluence] = useState(() => new Float32Array(128).fill(0));
  
  // Redux state
  const currentAlgorithm = useSelector(state => state.algorithm?.currentAlgorithm);
  const tempo = useSelector(state => state.algorithm?.tempo || 120);
  const visualizerSettings = useSelector(state => state.visualizer || {});
  
  // Auto-determine performance level based on device if needed
  const actualPerfLevel = useMemo(() => {
    if (perfLevel === 'auto') {
      // Check if we're on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      return isMobile ? 'low' : 'medium';
    }
    return perfLevel;
  }, [perfLevel]);
  
  // Adjust shader quality based on performance level
  useEffect(() => {
    if (materialRef.current) {
      // Higher noise detail for better machines
      if (actualPerfLevel === 'high') {
        materialRef.current.noiseScale = 3.0;
        materialRef.current.noiseStrength = 1.5;
      } else if (actualPerfLevel === 'medium') {
        materialRef.current.noiseScale = 2.0;
        materialRef.current.noiseStrength = 1.2;
      } else {
        materialRef.current.noiseScale = 1.0;
        materialRef.current.noiseStrength = 1.0;
      }
    }
  }, [actualPerfLevel]);
  
  // Process active notes and update shader uniforms
  useEffect(() => {
    if (!materialRef.current) return;
    
    // Reset active notes array
    const activeNotesArray = new Float32Array(128).fill(0);
    
    // Update active notes
    activeNotes.forEach(note => {
      const { note: pitch, velocity = 100 } = note;
      if (pitch >= 0 && pitch < 128) {
        // Mark note as active
        activeNotesArray[pitch] = 1.0;
        
        // Update note intensity with attack and decay
        noteInfluence[pitch] = Math.min(1.0, (velocity / 127) * 1.2);
      }
    });
    
    // Decay inactive notes
    for (let i = 0; i < 128; i++) {
      if (activeNotesArray[i] < 0.1) {
        // Exponential decay for smooth transitions
        noteInfluence[i] *= 0.9;
      }
    }
    
    // Update shader uniforms
    materialRef.current.activeNotes = activeNotesArray;
    materialRef.current.noteIntensity = noteInfluence;
    
    // Update noise speed based on tempo
    materialRef.current.noiseSpeed = (tempo / 120) * 0.5;
    
  }, [activeNotes, tempo, noteInfluence]);
  
  // Animation loop
  useFrame((state) => {
    if (!materialRef.current) return;
    
    // Update time uniform for animation
    materialRef.current.time = state.clock.elapsedTime;
    
    // Update text with current state
    if (textRef.current) {
      const noteCount = activeNotes.length;
      const algorithmName = currentAlgorithm.charAt(0).toUpperCase() + currentAlgorithm.slice(1);
      textRef.current.text = `${algorithmName} Fluid - ${noteCount} active notes`;
      
      // Text color animation
      if (noteCount > 0 && textRef.current.material) {
        const pulseIntensity = (Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.8);
        textRef.current.material.color.setRGB(
          0.8,
          0.9 + 0.1 * pulseIntensity,
          1.0
        );
      }
    }
    
    // Subtle mesh animation
    if (meshRef.current && actualPerfLevel !== 'low') {
      const time = state.clock.elapsedTime;
      meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.05;
      meshRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }
    
    // Update particle effects for high performance only
    if (pointsRef.current && actualPerfLevel === 'high') {
      const positions = pointsRef.current.geometry.attributes.position.array;
      const noteActivity = activeNotes.length / 20; // 0-1 range assuming max ~20 notes
      
      // Animate each particle
      for (let i = 0; i < positions.length; i += 3) {
        const idx = i / 3;
        const time = state.clock.elapsedTime;
        
        // Orbit-like movement
        const angle = time * (0.2 + idx * 0.001) + idx;
        const radius = 2 + Math.sin(time * 0.1 + idx * 0.1) * 0.5;
        const height = Math.cos(time * 0.2 + idx * 0.05) * 1.5;
        
        // Add more movement when notes are active
        const noteFactor = noteActivity * Math.sin(time * 2 + idx * 0.1) * 0.5;
        
        positions[i] = Math.cos(angle) * (radius + noteFactor);
        positions[i+1] = height + noteFactor;
        positions[i+2] = Math.sin(angle) * (radius + noteFactor);
      }
      
      // Mark positions for update
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  // Generate particles for high performance mode
  const particles = useMemo(() => {
    if (actualPerfLevel !== 'high') return null;
    
    // Create random particle positions
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Position in sphere
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1;
      const height = (Math.random() - 0.5) * 2;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Color gradient from blue to cyan
      const hue = 0.6 - Math.random() * 0.1;
      const saturation = 0.7 + Math.random() * 0.3;
      const lightness = 0.6 + Math.random() * 0.4;
      
      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Size variation
      sizes[i] = 0.05 + Math.random() * 0.15;
    }
    
    return { positions, colors, sizes };
  }, [actualPerfLevel]);
  
  // Color configuration
  const colors = useMemo(() => {
    const schemeType = visualizerSettings.colorScheme || 'default';
    
    const schemes = {
      default: {
        base: new THREE.Color(0x0c3862),
        highlight: new THREE.Color(0x18a0fb)
      },
      warm: {
        base: new THREE.Color(0x5a1f09),
        highlight: new THREE.Color(0xff6a2c)
      },
      cool: {
        base: new THREE.Color(0x091a28),
        highlight: new THREE.Color(0x04d9ff)
      },
      monochrome: {
        base: new THREE.Color(0x202020),
        highlight: new THREE.Color(0xcccccc)
      },
      neon: {
        base: new THREE.Color(0x100537),
        highlight: new THREE.Color(0xff00ff)
      }
    };
    
    return schemes[schemeType] || schemes.default;
  }, [visualizerSettings.colorScheme]);
  
  return (
    <group>
      {/* Top display text */}
      <Text
        ref={textRef}
        position={[0, 4.5, 0]}
        fontSize={0.7}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Fluid Visualizer
      </Text>
      
      {/* Fluid mesh */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {actualPerfLevel === 'high' ? (
          <torusKnotGeometry args={[2, 0.6, 128, 32]} />
        ) : actualPerfLevel === 'medium' ? (
          <torusKnotGeometry args={[2, 0.6, 64, 16]} />
        ) : (
          <torusKnotGeometry args={[2, 0.6, 32, 8]} />
        )}
        
        <fluidMaterial 
          ref={materialRef}
          baseColor={colors.base}
          highlightColor={colors.highlight}
          resolution={resolution}
        />
      </mesh>
      
      {/* Particle effect (high performance only) */}
      {actualPerfLevel === 'high' && particles && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particles.positions.length / 3}
              array={particles.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={particles.colors.length / 3}
              array={particles.colors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={particles.sizes.length}
              array={particles.sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            vertexColors
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
      
      {/* Global lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#18a0fb" />
    </group>
  );
};

export default FluidVisualizer;