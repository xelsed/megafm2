import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// Map MIDI notes to shapes
const noteToShapeMapping = {
  0: 'tetrahedron',   // C
  1: 'box',           // C#
  2: 'octahedron',    // D
  3: 'dodecahedron',  // D#
  4: 'icosahedron',   // E
  5: 'sphere',        // F
  6: 'tetrahedron',   // F#
  7: 'box',           // G
  8: 'octahedron',    // G#
  9: 'dodecahedron',  // A
  10: 'icosahedron',  // A#
  11: 'sphere'        // B
};

const GeometricVisualizer = ({ activeNotes = [] }) => {
  const groupRef = useRef();
  const meshesRef = useRef([]);
  
  // Create a geometry container to hold all geometries
  const geometries = useMemo(() => {
    return {
      tetrahedron: new THREE.TetrahedronGeometry(1, 0),
      box: new THREE.BoxGeometry(1, 1, 1),
      octahedron: new THREE.OctahedronGeometry(1, 0),
      dodecahedron: new THREE.DodecahedronGeometry(1, 0),
      icosahedron: new THREE.IcosahedronGeometry(1, 0),
      sphere: new THREE.SphereGeometry(1, 16, 16)
    };
  }, []);
  
  // Create mesh instances for active notes
  const visibleMeshes = useMemo(() => {
    return activeNotes.map((noteData, index) => {
      const note = noteData?.note || 60;
      const velocity = noteData?.velocity || 100;
      
      // Get proper shape based on note pitch class
      const noteClass = note % 12;
      const shapeType = noteToShapeMapping[noteClass] || 'box';
      
      // Map note to radius/scale (higher notes = smaller objects)
      const octave = Math.floor(note / 12) - 1; // MIDI octave
      const scale = 0.3 + (0.15 * (octave - 4)); // Adjust size based on octave
      
      // Map velocity to opacity and scale
      const opacity = 0.3 + (velocity / 127) * 0.7;
      const velocityScale = 0.5 + (velocity / 127) * 0.5;
      
      // Map note to color (hue)
      const hue = noteClass / 12;
      const { r, g, b } = new THREE.Color().setHSL(hue, 0.8, 0.6);
      
      // Position in a circular arrangement
      const angle = (index / activeNotes.length) * Math.PI * 2;
      const radius = 5;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      
      // Y position based on octave
      const y = octave - 5; // Center around middle octave
      
      return {
        id: `${note}-${index}`,
        geometry: geometries[shapeType],
        position: [x, y, z],
        rotation: [0, 0, 0],
        scale: [scale * velocityScale, scale * velocityScale, scale * velocityScale],
        color: [r, g, b],
        opacity: opacity,
        velocity: velocity,
        note: note
      };
    });
  }, [activeNotes, geometries]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Rotate the entire group for overall movement
    groupRef.current.rotation.y = time * 0.1;
    
    // Animate each mesh
    meshesRef.current.forEach((mesh, index) => {
      if (!mesh) return;
      
      const data = visibleMeshes[index];
      if (!data) return;
      
      // Pulsating based on note velocity
      const pulseSpeed = 2 + (data.note % 12) * 0.2;
      const pulseSize = 0.1 + (data.velocity / 127) * 0.2;
      const pulse = 1 + Math.sin(time * pulseSpeed) * pulseSize;
      
      // Apply pulsating scale
      mesh.scale.set(
        data.scale[0] * pulse,
        data.scale[1] * pulse,
        data.scale[2] * pulse
      );
      
      // Individual rotation based on note
      mesh.rotation.x += delta * (0.5 + (data.note % 12) * 0.1);
      mesh.rotation.y += delta * (0.3 + (data.note % 7) * 0.1);
      mesh.rotation.z += delta * (0.1 + (data.note % 5) * 0.1);
    });
  });
  
  // Reset mesh refs when the number of visible meshes changes
  React.useEffect(() => {
    meshesRef.current = meshesRef.current.slice(0, visibleMeshes.length);
  }, [visibleMeshes.length]);
  
  return (
    <group ref={groupRef}>
      {visibleMeshes.map((data, index) => (
        <mesh
          key={data.id}
          ref={el => meshesRef.current[index] = el}
          position={data.position}
          rotation={data.rotation}
          scale={data.scale}
        >
          {data.geometry && <primitive object={data.geometry} attach="geometry" />}
          <meshPhysicalMaterial
            color={new THREE.Color(data.color[0], data.color[1], data.color[2])}
            transparent
            opacity={data.opacity}
            metalness={0.2}
            roughness={0.3}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
          />
        </mesh>
      ))}
      
      <Text
        position={[0, 7, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Geometric Visualizer
      </Text>
    </group>
  );
};

export default GeometricVisualizer;