import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture, Trail, Billboard } from '@react-three/drei';
import { useSelector } from 'react-redux';

/**
 * Specialized visualizer for cellular automata, particularly Conway's Game of Life
 * Renders both 1D and 2D cellular automata with color-coded cells and animations
 */
const CellularVisualizer = ({ activeNotes = [], perfLevel = 'medium' }) => {
  // Helper function to map MIDI pitch to note name
  const getPitchName = (pitch) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteName = noteNames[pitch % 12];
    return `${noteName}${octave}`;
  };
  const gridRef = useRef();
  const cellsRef = useRef([]);
  const notesRef = useRef([]);
  const textRef = useRef();
  const glowRef = useRef();
  const trailsRef = useRef([]);
  
  // State to track for visualization
  const [hoveredCell, setHoveredCell] = useState(null);
  const [showLabels, setShowLabels] = useState(false);
  
  // Get cellular automata data from redux store
  const currentAlgorithm = useSelector(state => state.algorithm?.currentAlgorithm);
  const cellularParameters = useSelector(state => state.algorithm?.algorithms?.cellular?.parameters);
  const isCellular = currentAlgorithm === 'cellular';
  const is2D = isCellular && cellularParameters?.type === 'gameOfLife';
  const visualizerSettings = useSelector(state => state.visualizer || {});
  
  // Generate grid of cells for visualization
  const size = cellularParameters?.width || 16;
  const height = cellularParameters?.height || 16;
  const cellSize = useMemo(() => Math.min(10 / size, 0.5), [size]);
  const spacing = cellSize * 1.1;
  
  // Cell particle for birth/death animations
  const particlesRef = useRef([]);
  const [particles, setParticles] = useState([]);
  
  // Update visibility based on visualizer settings
  useEffect(() => {
    setShowLabels(visualizerSettings.showLabels || false);
  }, [visualizerSettings.showLabels]);
  
  // Colors for different types of cells - enhanced color palette for various states
  const colors = useMemo(() => {
    // Get the color scheme from the visualizer settings
    const schemeType = visualizerSettings.colorScheme || 'default';
    
    const schemes = {
      default: {
        inactive: new THREE.Color(0x111133),
        active: new THREE.Color(0x44aaff),
        highlight: new THREE.Color(0xffaa44),
        birth: new THREE.Color(0x44ff88),
        death: new THREE.Color(0xff4466),
        harmony: new THREE.Color(0xaa44ff),
        hover: new THREE.Color(0xffffff),
        stable: new THREE.Color(0x33aadd),
        oscillator: new THREE.Color(0x22ddaa),
        grid: new THREE.Color(0x222244),
        background: new THREE.Color(0x223366)
      },
      neon: {
        inactive: new THREE.Color(0x111122),
        active: new THREE.Color(0x00ffff),
        highlight: new THREE.Color(0xff00ff),
        birth: new THREE.Color(0x33ff99),
        death: new THREE.Color(0xff3366),
        harmony: new THREE.Color(0xff66ff),
        hover: new THREE.Color(0xffffff),
        stable: new THREE.Color(0x33ffdd),
        oscillator: new THREE.Color(0x33ff66),
        grid: new THREE.Color(0x222244),
        background: new THREE.Color(0x220066)
      },
      monochrome: {
        inactive: new THREE.Color(0x111111),
        active: new THREE.Color(0xcccccc),
        highlight: new THREE.Color(0xffffff),
        birth: new THREE.Color(0xeeeeee),
        death: new THREE.Color(0x999999),
        harmony: new THREE.Color(0xbbbbbb),
        hover: new THREE.Color(0xffffff),
        stable: new THREE.Color(0xdddddd),
        oscillator: new THREE.Color(0xaaaaaa),
        grid: new THREE.Color(0x333333),
        background: new THREE.Color(0x444444)
      },
      warm: {
        inactive: new THREE.Color(0x221111),
        active: new THREE.Color(0xff8844),
        highlight: new THREE.Color(0xffcc22),
        birth: new THREE.Color(0xffaa44),
        death: new THREE.Color(0xbb2200),
        harmony: new THREE.Color(0xff66aa),
        hover: new THREE.Color(0xffffcc),
        stable: new THREE.Color(0xddaa66),
        oscillator: new THREE.Color(0xffcc88),
        grid: new THREE.Color(0x442211),
        background: new THREE.Color(0x662200)
      },
      cool: {
        inactive: new THREE.Color(0x111122),
        active: new THREE.Color(0x4488ff),
        highlight: new THREE.Color(0x22ccff),
        birth: new THREE.Color(0x44ddff),
        death: new THREE.Color(0x0022bb),
        harmony: new THREE.Color(0x88bbff),
        hover: new THREE.Color(0xccffff),
        stable: new THREE.Color(0x66aadd),
        oscillator: new THREE.Color(0x88ccff),
        grid: new THREE.Color(0x223344),
        background: new THREE.Color(0x002266)
      }
    };
    
    return schemes[schemeType] || schemes.default;
  }, [visualizerSettings.colorScheme]);
  
  // Create cell geometry for different performance levels
  const cellGeometry = useMemo(() => {
    if (perfLevel === 'high') {
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize, 2, 1, 2);
    } else if (perfLevel === 'medium') {
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize, 1, 1, 1);
    } else {
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize);
    }
  }, [cellSize, perfLevel]);
  
  // Create a particle system for visual effects
  const particleSystem = useMemo(() => {
    if (perfLevel === 'low') return null; // Skip for low performance
    
    const particleCount = perfLevel === 'high' ? 1000 : 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize all particles at origin
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    return { geometry, material, positions, colors, count: particleCount };
  }, [perfLevel]);
  
  // Get access to tempo from store for transition timing
  const tempo = useSelector(state => state.algorithm?.tempo || 120);
  const noteInterval = useSelector(state => state.algorithm?.noteInterval || 250);
  
  // Create the grid cells
  const cells = useMemo(() => {
    if (is2D) {
      // Create 2D grid for Game of Life
      const cells2D = [];
      const gridWidth = size * spacing;
      const gridHeight = height * spacing;
      const offsetX = -gridWidth / 2 + spacing / 2;
      const offsetZ = -gridHeight / 2 + spacing / 2;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < size; x++) {
          cells2D.push({
            position: [
              offsetX + x * spacing,
              0,
              offsetZ + y * spacing
            ],
            coords: [x, y],
            state: 'inactive',
            generationsAlive: 0
          });
        }
      }
      
      return cells2D;
    } else {
      // Create 1D grid for cellular automaton with multiple generations visible
      const cells1D = [];
      const gridWidth = size * spacing;
      const gridDepth = 32 * spacing; // Show more generations for 1D automaton
      const offsetX = -gridWidth / 2 + spacing / 2;
      const offsetZ = -gridDepth / 2 + spacing / 2;
      
      // In 1D mode, we show multiple generations stacked along Z axis
      for (let z = 0; z < 32; z++) {
        for (let x = 0; x < size; x++) {
          cells1D.push({
            position: [
              offsetX + x * spacing,
              0,
              offsetZ + z * spacing
            ],
            coords: [x, z], // x is horizontal position, z is generation number
            state: 'inactive',
            generationsAlive: 0
          });
        }
      }
      
      return cells1D;
    }
  }, [is2D, size, height, spacing]);
  
  // Prepare ref array for all cell meshes
  useEffect(() => {
    cellsRef.current = cellsRef.current.slice(0, cells.length);
    trailsRef.current = Array(cells.length).fill(null);
  }, [cells.length]);
  
  // Group active notes by cell position for better visualization
  const notesByPosition = useMemo(() => {
    const posMap = new Map();
    
    activeNotes.forEach(note => {
      if (note.column !== undefined && note.row !== undefined) {
        const key = `${note.column},${note.row}`;
        if (!posMap.has(key)) {
          posMap.set(key, []);
        }
        
        // Default to 'active' state if not specified
        const noteWithState = {
          ...note,
          state: note.state || 'active',
          birthTime: Date.now()
        };
        
        posMap.get(key).push(noteWithState);
      }
    });
    
    return posMap;
  }, [activeNotes]);
  
  // Function to create particle burst effects with limits
  const createParticleBurst = (x, y, z, color, type) => {
    if (perfLevel === 'low' || !particleSystem) return;
    
    // Don't create more particles if we're already at the limit
    const maxParticles = perfLevel === 'high' ? 500 : 200;
    if (particles.length >= maxParticles) return;
    
    const newParticles = [];
    // Adjust particle count based on current count to prevent overloading
    const particleCount = perfLevel === 'high' ? 
      Math.min(20, maxParticles - particles.length) : 
      Math.min(10, maxParticles - particles.length);
    
    // If we can't create any more particles, return
    if (particleCount <= 0) return;
    
    for (let i = 0; i < particleCount; i++) {
      // Generate random direction
      const angle = Math.random() * Math.PI * 2;
      const upwardBias = type === 'birth' ? 0.8 : 0.2; // Birth particles go up, death go down
      
      // Create particle with faster decay for better performance
      const decayRate = perfLevel === 'high' ? (0.92 + Math.random() * 0.05) : (0.85 + Math.random() * 0.05);
      
      newParticles.push({
        position: [x, y, z],
        velocity: [
          Math.cos(angle) * (0.03 + Math.random() * 0.03),
          upwardBias * (0.04 + Math.random() * 0.06),
          Math.sin(angle) * (0.03 + Math.random() * 0.03)
        ],
        color: new THREE.Color(color),
        life: 1.0,
        decay: decayRate,
        createdAt: Date.now() // Track creation time for lifecycle management
      });
    }
    
    setParticles(prev => {
      // If adding these would exceed our limit, remove the oldest particles first
      const combined = [...prev, ...newParticles];
      if (combined.length > maxParticles) {
        return combined.slice(-maxParticles); // Keep only the newest particles
      }
      return combined;
    });
  };
  
  // Handle active notes to update cell states with better state tracking
  useEffect(() => {
    // Store the previous note state for transitions
    notesRef.current = [];
    
    if (!activeNotes || !cellsRef.current) return;
    
    // Update notes from active notes and update cell states
    notesByPosition.forEach((notes, key) => {
      // Get cell position
      const [colStr, rowStr] = key.split(',');
      const column = parseInt(colStr);
      const row = parseInt(rowStr);
      
      // Process each note at this position - prioritize birth events
      let highestPriorityNote = notes[0];
      
      for (const note of notes) {
        // Birth events take priority for visualization
        if (note.state === 'birth') {
          highestPriorityNote = note;
          break;
        } else if (note.state === 'harmony' && highestPriorityNote.state !== 'birth') {
          // Harmony next important
          highestPriorityNote = note;
        }
      }
      
      notesRef.current.push({
        column,
        row,
        velocity: highestPriorityNote.velocity,
        state: highestPriorityNote.state,
        pitch: highestPriorityNote.pitch,
        birthTime: highestPriorityNote.birthTime || Date.now()
      });
      
      // Create particle effects for birth/death events if we haven't processed this cell recently
      if (highestPriorityNote.state === 'birth' && gridRef.current) {
        // Get world position for particles
        const cellIndex = cells.findIndex(cell => 
          cell.coords[0] === column && (is2D ? cell.coords[1] === row : true)
        );
        
        if (cellIndex >= 0 && cellsRef.current[cellIndex]) {
          const cell = cellsRef.current[cellIndex];
          const worldPos = new THREE.Vector3();
          cell.getWorldPosition(worldPos);
          
          // Create particles at this location
          createParticleBurst(
            worldPos.x, 
            worldPos.y, 
            worldPos.z, 
            colors.birth.getHex(), 
            'birth'
          );
        }
      }
    });
  }, [activeNotes, cells, is2D, colors.birth, colors.death]);
  
  // Update particles in animation loop with memory leak prevention
  const updateParticles = useCallback((delta) => {
    if (perfLevel === 'low' || !particleSystem || particles.length === 0) return;
    
    // Update particle positions and lifetimes
    setParticles(prevParticles => {
      // Memory leak prevention: limit max number of particles
      const maxParticles = perfLevel === 'high' ? 500 : 200;
      let particlesToProcess = prevParticles;
      
      if (prevParticles.length > maxParticles) {
        // If we have too many particles, keep only the newest ones
        particlesToProcess = prevParticles.slice(-maxParticles);
      }
      
      const updatedParticles = particlesToProcess
        .map(particle => {
          // Apply velocity and gravity
          return {
            ...particle,
            position: [
              particle.position[0] + particle.velocity[0],
              particle.position[1] + particle.velocity[1] - 0.005, // Gravity
              particle.position[2] + particle.velocity[2]
            ],
            // Apply faster decay for better performance
            life: particle.life * (perfLevel === 'high' ? particle.decay : particle.decay * 0.9)
          };
        })
        .filter(particle => particle.life > 0.01); // Remove dead particles
        
      // Update particle system geometry if we have particles
      if (updatedParticles.length > 0 && particleSystem.geometry) {
        const positions = particleSystem.positions;
        const colors = particleSystem.colors;
        
        // Reset all particles to origin/invisible
        for (let i = 0; i < particleSystem.count; i++) {
          const i3 = i * 3;
          positions[i3] = 0;
          positions[i3 + 1] = -1000; // Move unused particles far away
          positions[i3 + 2] = 0;
          
          colors[i3] = 0;
          colors[i3 + 1] = 0;
          colors[i3 + 2] = 0;
        }
        
        // Update with active particles
        updatedParticles.forEach((particle, i) => {
          if (i >= particleSystem.count) return;
          
          const i3 = i * 3;
          positions[i3] = particle.position[0];
          positions[i3 + 1] = particle.position[1];
          positions[i3 + 2] = particle.position[2];
          
          colors[i3] = particle.color.r * particle.life;
          colors[i3 + 1] = particle.color.g * particle.life;
          colors[i3 + 2] = particle.color.b * particle.life;
        });
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.geometry.attributes.color.needsUpdate = true;
      }
      
      return updatedParticles;
    });
  }, [particles, particleSystem, perfLevel]);
  
  // Animation loop with enhanced effects and synchronization with algorithm tempo
  useFrame((state, delta) => {
    // Get parent timing data if available for better synchronization
    const parentGroup = state.scene.getObjectByName('visualizerGroup');
    const parentTiming = parentGroup?.userData || {};
    
    // Use parent time data or fall back to local
    const time = parentTiming.time || state.clock.elapsedTime;
    // Adjust delta based on tempo if available
    const adjustedDelta = parentTiming.delta || delta;
    
    // Update text display
    if (textRef.current) {
      const title = is2D ? "Conway's Game of Life" : `Cellular Automaton (Rule ${cellularParameters?.rule || 30})`;
      const noteCount = notesRef.current.length;
      textRef.current.text = `${title} - ${noteCount} active cells`;
      
      // Pulse text color based on activity
      if (textRef.current.material) {
        const pulseIntensity = Math.sin(time * 2) * 0.2 + 0.8;
        const noteColorFactor = Math.min(1, noteCount / 10);
        textRef.current.material.color.setRGB(
          1,
          0.8 + 0.2 * pulseIntensity * noteColorFactor,
          0.8 + 0.2 * (1 - noteColorFactor)
        );
      }
    }
    
    // Update grid rotation and animation
    if (gridRef.current) {
      // Tilt the grid for better visibility
      gridRef.current.rotation.x = -Math.PI / 4;
      
      // Slightly raise/lower grid with activity - breathing effect
      const activeNoteCount = notesRef.current.length;
      const heightFactor = Math.min(1, activeNoteCount / 20);
      const breathe = Math.sin(time * 0.5) * 0.1 * heightFactor;
      gridRef.current.position.y = breathe;
      
      // Small wobble effect - more intense with more activity
      gridRef.current.rotation.z = Math.sin(time * 0.2) * 0.05 * (1 + heightFactor * 0.5);
      
      // If auto-rotate is enabled, slowly rotate the grid
      if (visualizerSettings.autoRotate) {
        gridRef.current.rotation.y += delta * 0.1;
      }
    }
    
    // Check if we need to update particles
    if (particles.length > 0) {
      updateParticles(adjustedDelta);
    }
    
    // Update glow effects based on activity and performance level
    if (glowRef.current) {
      const activeNoteCount = notesRef.current.length;
      // Scale glow intensity based on performance level
      let maxGlowIntensity;
      if (perfLevel === 'high') {
        maxGlowIntensity = 0.5;
      } else if (perfLevel === 'medium') {
        maxGlowIntensity = 0.3;
      } else {
        maxGlowIntensity = 0.2;
      }
      
      const glowIntensity = Math.min(1, activeNoteCount / 40) * maxGlowIntensity;
      glowRef.current.scale.setScalar(1 + glowIntensity);
      
      // Adjust opacity based on performance level to reduce fill-rate impact
      if (glowRef.current.material) {
        glowRef.current.material.opacity = perfLevel === 'low' ? 0.1 : 0.15;
      }
    }
    
    // Update cell colors and animations with more nuanced effects
    cellsRef.current.forEach((cell, index) => {
      if (!cell) return;
      
      const cellData = cells[index];
      const [x, y] = cellData.coords;
      
      // Reset to inactive state but maintain some properties
      const wasActive = cell.userData.active;
      cell.userData.active = false;
      
      // Default inactive state
      cell.material.color.copy(colors.inactive);
      cell.material.emissiveIntensity = 0;
      
      // Determine if cell should shrink or maintain height
      if (!wasActive) {
        cell.scale.y = 0.1; // Inactive height
        cell.position.y = 0;
      } else {
        // Shrink gradually if was previously active
        cell.scale.y = Math.max(0.1, cell.scale.y * 0.9);
        cell.position.y = cell.scale.y / 2;
      }
      
      // Check if this cell has active notes
      let activeNote = null;
      
      // For 2D mode, match exact coordinates
      if (is2D) {
        activeNote = notesRef.current.find(note => note.column === x && note.row === y);
      } 
      // For 1D mode, check if this is the current generation cell or a historical cell
      else {
        // Current generation (y=0 in the visualization) gets the active notes
        // y coordinate in the cells array represents the generation/history
        const isCurrentGen = y === 0;
        const isHistorical = y > 0;
        
        if (isCurrentGen) {
          activeNote = notesRef.current.find(note => note.column === x && note.row === 0);
        } 
        // For historical generations, look up the appropriate generation data
        else if (isHistorical) {
          // Find any notes from the right generation and column
          activeNote = notesRef.current.find(note => note.column === x && note.row === y);
        }
      }
      
      // Apply visual updates if this cell is active
      if (activeNote) {
        cell.userData.active = true;
        const age = (Date.now() - activeNote.birthTime) / 1000;
        const intensity = Math.max(0, Math.min(1, 1.5 - age));
        
        // Scale the cell height based on velocity and activity state
        let heightScale = 0.1;
        
        switch (activeNote.state) {
          case 'birth':
            // Birth cells grow taller with higher velocity
            heightScale = 0.1 + (activeNote.velocity / 127) * 2 * Math.max(0.4, intensity);
            break;
          case 'harmony':
            // Harmony cells are generally shorter
            heightScale = 0.1 + (activeNote.velocity / 127) * 0.8 * Math.max(0.3, intensity);
            break;
          default: // 'active'
            // Standard active cells
            heightScale = 0.1 + (activeNote.velocity / 127) * 1.5 * Math.max(0.2, intensity);
        }
        
        // Apply height scale
        cell.scale.y = heightScale;
        cell.position.y = heightScale / 2;
        
        // Apply color based on state and age
        let color = colors.active;
        
        switch (activeNote.state) {
          case 'birth':
            color = colors.birth;
            break;
          case 'death':
            color = colors.death;
            break;
          case 'harmony':
            color = colors.harmony;
            break;
          case 'oscillator':
            color = colors.oscillator;
            break;
          case 'stable':
            color = colors.stable;
            break;
          default: // 'active'
            color = colors.active;
        }
        
        // Blend color based on age for transition effects - scale transition time with tempo
        const noteTransitionTime = noteInterval / 1000; // Convert interval from ms to seconds
        const shortTransitionTime = Math.max(0.1, Math.min(0.3, noteTransitionTime * 0.5));
        const longTransitionTime = Math.max(0.3, Math.min(1.0, noteTransitionTime * 2));
        
        if (age < shortTransitionTime) {
          cell.material.color.copy(color);
        } else {
          // Gradually fade to regular active color with timing scaled to note interval
          const transitionProgress = Math.min(1, (age - shortTransitionTime) / longTransitionTime);
          cell.material.color.copy(color).lerp(colors.active, transitionProgress);
        }
        
        // Add glow effect with emission based on state
        cell.material.emissive.copy(cell.material.color).multiplyScalar(0.5);
        cell.material.emissiveIntensity = intensity;
        
        // Add hover effect if this is the hovered cell (only in high/medium perf)
        if (hoveredCell && hoveredCell[0] === x && hoveredCell[1] === y && perfLevel !== 'low') {
          cell.material.color.lerp(colors.hover, 0.3);
          cell.material.emissiveIntensity = Math.max(intensity, 0.5);
        }
        
        // Create trail effect for active cells (high perf only)
        if (trailsRef.current[index] && perfLevel === 'high' && activeNote.state === 'birth') {
          trailsRef.current[index].visible = true;
        }
      } else {
        // Not active - hide trails
        if (trailsRef.current[index]) {
          trailsRef.current[index].visible = false;
        }
      }
    });
  });
  
  return (
    <group>
      {/* Title */}
      <Text
        ref={textRef}
        position={[0, 5, 0]}
        fontSize={0.7}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Cellular Automaton
      </Text>
      
      {/* Environmental lighting */}
      <ambientLight intensity={0.2} /> 
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#6688ff" />
      
      {/* Subtle glow effect under the grid */}
      <mesh 
        ref={glowRef}
        position={[0, -0.2, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[size * spacing, size * spacing]} />
        <meshBasicMaterial 
          color={colors.background} 
          transparent={true} 
          opacity={0.15} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Grid */}
      <group ref={gridRef}>
        {/* Floor plane for grid - better in 2D mode */}
        {is2D && perfLevel !== 'low' && (
          <mesh 
            position={[0, -0.05, 0]} 
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[size * spacing, size * spacing]} />
            <meshStandardMaterial 
              color="#112244"
              metalness={0.2}
              roughness={0.8}
              transparent={true}
              opacity={0.7}
            />
          </mesh>
        )}
        
        {/* Cells */}
        {cells.map((cell, index) => (
          <group key={`cell-container-${index}`}>
            {/* Main cell cube */}
            <mesh
              key={`cell-${index}`}
              ref={el => cellsRef.current[index] = el}
              position={[...cell.position]}
              userData={{ active: false }}
              onClick={() => setHoveredCell(cell.coords)}
              onPointerEnter={() => setHoveredCell(cell.coords)}
              onPointerLeave={() => setHoveredCell(null)}
            >
              <primitive object={cellGeometry} />
              <meshStandardMaterial
                color={colors.inactive}
                metalness={0.4}
                roughness={0.2}
                emissive={colors.inactive}
                emissiveIntensity={0}
                transparent={true}
                opacity={0.9}
              />
              
              {/* Note labels - only shown if showLabels is true and we have high performance */}
              {showLabels && perfLevel === 'high' && (
                <Billboard
                  follow={true}
                  visible={!!notesRef.current.find(n => 
                    n.column === cell.coords[0] && 
                    (is2D ? n.row === cell.coords[1] : cell.coords[1] === 0)
                  )}
                  position={[0, 0.5, 0]}
                >
                  <Text
                    fontSize={0.25}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    fillOpacity={0.8}
                  >
                    {getPitchName(notesRef.current.find(n => 
                      n.column === cell.coords[0] && 
                      (is2D ? n.row === cell.coords[1] : cell.coords[1] === 0)
                    )?.pitch || 60)}
                  </Text>
                </Billboard>
              )}
            </mesh>
            
            {/* Add trails for birth/active cells in high performance mode */}
            {perfLevel === 'high' && (
              <Trail
                ref={el => trailsRef.current[index] = el}
                width={0.2}
                length={8}
                color={colors.birth.getHex()}
                attenuation={(t) => t * t}
                visible={false}
              >
                <mesh
                  position={[
                    cell.position[0], 
                    cell.position[1] + 0.2, 
                    cell.position[2]
                  ]}
                  scale={0.1}
                >
                  <sphereGeometry args={[1, 4, 4]} />
                  <meshBasicMaterial color={colors.birth.getHex()} transparent opacity={0.6} />
                </mesh>
              </Trail>
            )}
          </group>
        ))}
        
        {/* Particle system for effects */}
        {perfLevel !== 'low' && particleSystem && (
          <points>
            <primitive object={particleSystem.geometry} />
            <primitive object={particleSystem.material} />
          </points>
        )}
        
        {/* Grid lines */}
        {is2D && (
          <gridHelper 
            args={[size * spacing * 1.02, size, colors.grid.getHex(), colors.grid.getHex()]} 
            position={[0, 0.01, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        )}
      </group>
    </group>
  );
};

export default CellularVisualizer;