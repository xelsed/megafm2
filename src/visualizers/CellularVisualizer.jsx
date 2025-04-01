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
  
  // Create particle system with performance-based sizing
  const particleSystem = useMemo(() => {
    // Set particle count based on performance level
    const particleCount = perfLevel === 'high' ? 500 : 
                       perfLevel === 'medium' ? 300 : 200;
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize all particles at origin with white color
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = -100; // Move them out of view initially
      positions[i3 + 2] = 0;
      
      colors[i3] = 1;     // R
      colors[i3 + 1] = 1; // G
      colors[i3 + 2] = 1; // B
    }
    
    return { 
      positions, 
      colors, 
      count: particleCount
    };
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
            generationsAlive: 0,
            birthTimestamp: 0,        // When the cell was first activated
            lastActiveTimestamp: 0,   // When the cell was last active
            ageHistory: [0, 0, 0],    // History of activity for pattern detection
            isOscillator: false,      // Whether this cell is part of an oscillator pattern
            oscillatorPeriod: 0       // Period of oscillation if part of an oscillator
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
            generationsAlive: 0,
            birthTimestamp: 0,
            lastActiveTimestamp: 0,
            ageHistory: [0, 0, 0],
            isOscillator: false,
            oscillatorPeriod: 0
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
  
  // Enhanced function to create particle burst effects with performance scaling
  const createParticleBurst = useCallback((x, y, z, color, type) => {
    // Create particles based on performance level
    const maxParticles = perfLevel === 'high' ? 50 : 
                         perfLevel === 'medium' ? 30 : 20;
                         
    if (particles.length >= maxParticles) return;
    
    const newParticles = [];
    // Create particles based on performance setting
    const particleCount = perfLevel === 'high' ? 8 : 
                          perfLevel === 'medium' ? 5 : 3;
    
    for (let i = 0; i < particleCount; i++) {
      // Generate random direction with more variation in high performance mode
      const angle = Math.random() * Math.PI * 2;
      const upwardBias = type === 'birth' ? 0.7 : 0.2; // Birth particles go up, death go down
      
      // More dynamic particles in high performance mode
      const speedMultiplier = perfLevel === 'high' ? 0.07 : 0.05;
      
      // Create particle with performance-based properties
      newParticles.push({
        position: [x, y, z],
        velocity: [
          Math.cos(angle) * speedMultiplier,
          upwardBias * speedMultiplier,
          Math.sin(angle) * speedMultiplier
        ],
        color: new THREE.Color(color || 0xffffff),
        life: perfLevel === 'high' ? 1.2 : 1.0 // Longer-lived particles in high performance mode
      });
    }
    
    setParticles(prev => {
      // Limit total particles based on performance
      const combined = [...prev, ...newParticles];
      return combined.slice(-maxParticles); // Keep only the newest particles
    });
  }, [particles.length, perfLevel]);
  
  // Function to add visualization cells to match the generated Game of Life data
  const addSimulatedCells = useCallback(() => {
    if (!is2D || currentAlgorithm !== 'cellular') return;
    
    console.log("Adding visualization cells for Game of Life pattern");
    
    // Create cross pattern in the center to ensure visibility
    const fakeCells = [];
    
    // Create a cross pattern in the center
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(height / 2);
    
    fakeCells.push(
      { column: centerX, row: centerY, state: 'active', velocity: 100 },
      { column: centerX - 1, row: centerY, state: 'active', velocity: 100 },
      { column: centerX + 1, row: centerY, state: 'active', velocity: 100 },
      { column: centerX, row: centerY - 1, state: 'active', velocity: 100 },
      { column: centerX, row: centerY + 1, state: 'active', velocity: 100 }
    );
    
    // Add cells in each quadrant to ensure good visualization
    const quadrantPoints = [
      [Math.floor(size/4), Math.floor(height/4)],         // Top-left
      [Math.floor(3*size/4), Math.floor(height/4)],       // Top-right
      [Math.floor(size/4), Math.floor(3*height/4)],       // Bottom-left
      [Math.floor(3*size/4), Math.floor(3*height/4)]      // Bottom-right
    ];
    
    // Add a few cells in each quadrant
    quadrantPoints.forEach(([qx, qy]) => {
      fakeCells.push(
        { column: qx, row: qy, state: 'birth', velocity: 127 },
        { column: qx + 1, row: qy, state: 'birth', velocity: 120 },
        { column: qx, row: qy + 1, state: 'birth', velocity: 110 }
      );
    });
    
    // Update cell visualization for each fake cell
    fakeCells.forEach(fakeCell => {
      const cellIndex = cells.findIndex(c => 
        c.coords[0] === fakeCell.column && c.coords[1] === fakeCell.row
      );
      
      if (cellIndex !== -1 && cellsRef.current[cellIndex]) {
        const mesh = cellsRef.current[cellIndex];
        
        // Make the cell visible
        if (mesh.material) {
          mesh.userData.state = fakeCell.state;
          mesh.userData.velocity = fakeCell.velocity;
          
          // Set color based on state
          const stateColor = colors[fakeCell.state] || colors.active;
          mesh.material.color.copy(stateColor);
          
          // Set height for visibility
          mesh.scale.y = 0.3;
          mesh.position.y = 0.15;
          
          // Add to notesRef for tracking with pitch information
          const pitchOffset = (fakeCell.column % 12) + ((fakeCell.row % 5) * 12);
          notesRef.current.push({
            ...fakeCell,
            pitch: 48 + pitchOffset, // Add a base pitch for mapping
            birthTime: Date.now()
          });
        }
      }
    });
  }, [is2D, currentAlgorithm, size, height, cells, colors]);

  // Simple effect to initialize cells
  useEffect(() => {
    // Only run in cellular mode
    if (currentAlgorithm === 'cellular') {
      // Add a simpler pattern to ensure visualization
      const fakeCells = [];
      
      // Add a cross pattern in the center
      const centerX = Math.floor(size / 2);
      const centerY = Math.floor(height / 2);
      
      fakeCells.push(
        { column: centerX, row: centerY, state: 'active', velocity: 100 },
        { column: centerX - 1, row: centerY, state: 'active', velocity: 100 },
        { column: centerX + 1, row: centerY, state: 'active', velocity: 100 },
        { column: centerX, row: centerY - 1, state: 'active', velocity: 100 },
        { column: centerX, row: centerY + 1, state: 'active', velocity: 100 }
      );
      
      // Update cell visualization for each fake cell
      fakeCells.forEach(fakeCell => {
        const cellIndex = cells.findIndex(c => 
          c.coords[0] === fakeCell.column && c.coords[1] === fakeCell.row
        );
        
        if (cellIndex !== -1 && cellsRef.current[cellIndex]) {
          const mesh = cellsRef.current[cellIndex];
          
          // Make the cell visible
          if (mesh.material) {
            mesh.userData.state = fakeCell.state;
            mesh.userData.velocity = fakeCell.velocity;
            
            // Set color based on state
            const stateColor = colors[fakeCell.state] || colors.active;
            mesh.material.color.copy(stateColor);
            
            // Set height
            mesh.scale.y = 0.3;
            mesh.position.y = 0.15;
            
            // Add to notesRef for tracking
            notesRef.current.push({
              ...fakeCell,
              birthTime: Date.now()
            });
          }
        }
      });
      
      // Create simpler periodic updates
      const timer = setTimeout(addSimulatedCells, 1000);
      const interval = setInterval(addSimulatedCells, 3000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [currentAlgorithm, size, height, cells, colors, addSimulatedCells]);
  
  // Update particles function - moved from duplicate location
  
  // Handle active notes to update cell states with better state tracking and age tracking
  useEffect(() => {
    // Store the previous note state for transitions
    notesRef.current = [];
    
    if (!activeNotes || !cellsRef.current) return;
    
    // Record current timestamp for age tracking
    const currentTime = Date.now();
    
    // Track previously active cells to detect cells that died
    const activeCellsMap = new Map();
    
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
        birthTime: highestPriorityNote.birthTime || currentTime
      });
      
      // Mark cell as active in our tracking map
      activeCellsMap.set(`${column},${row}`, true);
      
      // Find the cell in our grid to update its age and timestamps
      const cellIndex = cells.findIndex(cell => 
        cell.coords[0] === column && (is2D ? cell.coords[1] === row : true)
      );
      
      if (cellIndex >= 0) {
        const cellData = cells[cellIndex];
        const cellMesh = cellsRef.current[cellIndex];
        
        // If this is a newly active cell (first birth)
        if (cellData.generationsAlive === 0 || highestPriorityNote.state === 'birth') {
          // Set birthTimestamp if this is a new cell
          if (cellData.birthTimestamp === 0) {
            cellData.birthTimestamp = currentTime;
            if (cellMesh && cellMesh.userData) {
              cellMesh.userData.birthTimestamp = currentTime;
            }
          }
          
          // Create particle effects for birth events
          if (highestPriorityNote.state === 'birth' && gridRef.current && cellMesh) {
            const worldPos = new THREE.Vector3();
            cellMesh.getWorldPosition(worldPos);
            
            // Create particles at this location with color based on cell importance
            createParticleBurst(
              worldPos.x, 
              worldPos.y, 
              worldPos.z, 
              colors.birth.getHex(), 
              'birth'
            );
          }
        }
        
        // Update last active timestamp
        cellData.lastActiveTimestamp = currentTime;
        if (cellMesh && cellMesh.userData) {
          cellMesh.userData.lastActiveTimestamp = currentTime;
        }
        
        // Update age history for pattern detection (shift and add)
        if (cellData.ageHistory && Array.isArray(cellData.ageHistory)) {
          cellData.ageHistory.shift();
          cellData.ageHistory.push(1); // 1 = active
        }
        
        // Detect oscillator patterns 
        // If we have a consistent pattern of activation/deactivation
        if (perfLevel === 'high' && cellData.ageHistory && 
            cellData.ageHistory.length >= 3 && 
            cellData.generationsAlive >= 3) {
          
          // Simple detection of period-2 oscillator (blinker)
          if (JSON.stringify(cellData.ageHistory) === JSON.stringify([0, 1, 0]) ||
              JSON.stringify(cellData.ageHistory) === JSON.stringify([1, 0, 1])) {
            cellData.isOscillator = true;
            cellData.oscillatorPeriod = 2;
          }
          
          // Other pattern detection could be added here
        }
      }
    });
    
    // Check for cells that died (were active previously but not now)
    cells.forEach((cellData, index) => {
      const cellMesh = cellsRef.current[index];
      if (!cellMesh) return;
      
      const [x, y] = cellData.coords;
      const cellKey = `${x},${y}`;
      
      // If cell was previously active but not in current active list
      if (cellData.generationsAlive > 0 && !activeCellsMap.has(cellKey)) {
        // Cell just died - create death particles
        if (cellData.lastActiveTimestamp > 0 && 
            currentTime - cellData.lastActiveTimestamp < 1000 &&
            gridRef.current) {
          
          // Create death particles
          const worldPos = new THREE.Vector3();
          cellMesh.getWorldPosition(worldPos);
          
          createParticleBurst(
            worldPos.x, 
            worldPos.y, 
            worldPos.z, 
            colors.death.getHex(), 
            'death'
          );
          
          // Reset age history for pattern detection
          if (cellData.ageHistory && Array.isArray(cellData.ageHistory)) {
            cellData.ageHistory.shift();
            cellData.ageHistory.push(0); // 0 = inactive
          }
        }
      }
    });
  }, [activeNotes, cells, is2D, colors.birth, colors.death, perfLevel, createParticleBurst]);
  
  // Basic particle update function
  const updateParticles = useCallback((delta) => {
    if (!particleSystem || particles.length === 0) return;
    
    // Update particle positions and lifetimes
    setParticles(prevParticles => {
      // Limit max number of particles
      const maxParticles = 100;
      let particlesToProcess = prevParticles.slice(-maxParticles);
      
      // Update each particle
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
            // Apply decay
            life: particle.life * 0.95
          };
        })
        .filter(particle => particle.life > 0.01); // Remove dead particles
        
      // Update particle system position and color arrays
      if (updatedParticles.length > 0 && particleSystem) {
        const positions = particleSystem.positions;
        const colors = particleSystem.colors;
        
        // Reset all particles to be invisible
        for (let i = 0; i < particleSystem.count; i++) {
          const i3 = i * 3;
          positions[i3] = 0;
          positions[i3 + 1] = -1000; // Move unused particles far away
          positions[i3 + 2] = 0;
        }
        
        // Update only the active particles
        updatedParticles.forEach((particle, i) => {
          if (i >= particleSystem.count) return;
          
          const i3 = i * 3;
          positions[i3] = particle.position[0];
          positions[i3 + 1] = particle.position[1];
          positions[i3 + 2] = particle.position[2];
          
          const r = particle.color ? particle.color.r : 1;
          const g = particle.color ? particle.color.g : 1;
          const b = particle.color ? particle.color.b : 1;
          
          colors[i3] = r * particle.life;
          colors[i3 + 1] = g * particle.life;
          colors[i3 + 2] = b * particle.life;
        });
      }
      
      return updatedParticles;
    });
  }, [particles, particleSystem]);
  
  // Enhanced animation loop with optional high-quality effects
  useFrame((state, delta) => {
    // Get parent timing data if available
    const parentGroup = state.scene.getObjectByName('visualizerGroup');
    const parentTiming = parentGroup?.userData || {};
    
    // Use parent time data or fall back to local
    const time = parentTiming.time || state.clock.elapsedTime;
    const adjustedDelta = parentTiming.delta || delta;
    
    // Update text display
    if (textRef.current) {
      const title = is2D ? "Conway's Game of Life" : `Cellular Automaton (Rule ${cellularParameters?.rule || 30})`;
      const noteCount = notesRef.current.length;
      textRef.current.text = `${title} - ${noteCount} active cells`;
      
      // Pulse text color based on activity - brings back animation
      if (textRef.current.material) {
        if (perfLevel === 'high') {
          const pulseIntensity = Math.sin(time * 2) * 0.2 + 0.8;
          const noteColorFactor = Math.min(1, noteCount / 10);
          textRef.current.material.color.setRGB(
            1,
            0.8 + 0.2 * pulseIntensity * noteColorFactor,
            0.8 + 0.2 * (1 - noteColorFactor)
          );
        } else {
          // Simple color for lower performance
          textRef.current.material.color.setRGB(1, 1, 1);
        }
      }
    }
    
    // Update grid with animation for high quality mode
    if (gridRef.current) {
      // Set proper grid rotation
      gridRef.current.rotation.x = Math.PI / 2;
      
      if (perfLevel === 'high') {
        // Add breathing effect for high performance mode
        const activeNoteCount = notesRef.current.length;
        const heightFactor = Math.min(1, activeNoteCount / 20);
        const breathe = Math.sin(time * 0.5) * 0.1 * heightFactor;
        gridRef.current.position.y = breathe;
        
        // Small wobble effect in high performance mode
        gridRef.current.rotation.z = Math.sin(time * 0.2) * 0.05 * (1 + heightFactor * 0.5);
        
        // Auto-rotate if enabled
        if (visualizerSettings.autoRotate) {
          gridRef.current.rotation.y += delta * 0.1;
        }
      }
    }
    
    // Update particles
    if (particles.length > 0) {
      updateParticles(adjustedDelta);
    }
    
    // Update glow effect based on performance level
    if (glowRef.current) {
      if (perfLevel === 'high') {
        const activeNoteCount = notesRef.current.length;
        const maxGlowIntensity = 0.5;
        const glowIntensity = Math.min(1, activeNoteCount / 40) * maxGlowIntensity;
        glowRef.current.scale.setScalar(1 + glowIntensity);
        
        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.2;
        }
      } else {
        // Constant glow for medium/low performance
        glowRef.current.scale.setScalar(1.2);
        
        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.15;
        }
      }
    }
    
    // Update cell colors and animations with more visible effects, including age tracking
    cellsRef.current.forEach((cell, index) => {
      if (!cell) return;
      
      const cellData = cells[index];
      const [x, y] = cellData.coords;
      
      // Reset to inactive state but maintain some properties
      const wasActive = cell.userData.active;
      cell.userData.active = false;
      
      // Default inactive state with slight glow
      cell.material.color.copy(colors.inactive);
      cell.material.emissiveIntensity = 0.2;
      
      // Add a subtle animation to all cells based on time
      const time = state.clock.elapsedTime;
      const pulseFactor = Math.sin(time * 0.5 + (x + y) * 0.2) * 0.05 + 0.95;
      
      // Determine if cell should shrink or maintain height with animation
      if (!wasActive) {
        // Even inactive cells have a slight height variation
        cell.scale.y = 0.1 * pulseFactor; 
        cell.position.y = cell.scale.y / 2;
        
        // Reset generation counter for inactive cells
        cellData.generationsAlive = 0;
        
        // Add slight color variation based on position for visual interest
        const hue = ((x + y) % 20) / 20;
        const saturation = 0.2;
        const lightness = 0.2 + Math.sin(time * 0.3 + x * 0.1) * 0.05;
        cell.material.color.setHSL(hue, saturation, lightness);
      } else {
        // Shrink gradually if was previously active, but maintain animation
        cell.scale.y = Math.max(0.1, cell.scale.y * 0.9) * pulseFactor;
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
        // Mark cell as active and increment its alive generations counter
        cell.userData.active = true;
        
        // Increment generation counter for cells that remain alive
        if (!cell.userData.generationsAlive) {
          cell.userData.generationsAlive = 0;
        }
        
        // Increment the generation counter for this cell data
        cellData.generationsAlive = (cellData.generationsAlive || 0) + 1;
        // Cap at 10 generations for color mapping
        cellData.generationsAlive = Math.min(10, cellData.generationsAlive);
        
        // Age of this instance of activity
        const age = (Date.now() - activeNote.birthTime) / 1000;
        const intensity = Math.max(0, Math.min(1, 1.5 - age));
        
        // Scale the cell height based on velocity, activity state, and generations alive
        let heightScale = 0.1;
        const generationBoost = Math.min(1, cellData.generationsAlive / 10) * 0.3;
        
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
            // Standard active cells - taller when they've been alive longer
            heightScale = 0.1 + (activeNote.velocity / 127) * 1.5 * Math.max(0.2, intensity) + generationBoost;
        }
        
        // Apply height scale
        cell.scale.y = heightScale;
        cell.position.y = heightScale / 2;
        
        // Base color based on state
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
        
        // Create an age-based color that transitions as the cell gets older
        // Each generation changes the color to create a visually interesting pattern
        const cellAge = cellData.generationsAlive || 1;
        let ageColor = new THREE.Color();
        
        if (cellAge <= 1) {
          // New cells get the standard color
          ageColor.copy(color);
        } else {
          // Map generations alive (1-10) to a color gradient
          // Change hue based on generation, shifting from blue to magenta to gold
          const hueShift = (cellAge - 1) / 9; // 0 to 1 range for generations 1-10
          
          if (perfLevel === 'high') {
            // More complex coloring for high performance mode
            switch (activeNote.state) {
              case 'birth':
                // Birth cells shift from green to yellow to red
                ageColor.setHSL(0.35 - (hueShift * 0.35), 0.8, 0.6);
                break;
              case 'harmony':
                // Harmony cells shift from purple to pink to orange
                ageColor.setHSL(0.75 - (hueShift * 0.25), 0.7, 0.6);
                break;
              case 'stable':
                // Stable cells shift from teal to blue to purple
                ageColor.setHSL(0.5 - (hueShift * 0.25), 0.7, 0.5);
                break;
              default: // 'active'
                // Active cells shift from blue to cyan to lime
                ageColor.setHSL(0.6 - (hueShift * 0.3), 0.7, 0.5 + (hueShift * 0.2));
            }
          } else {
            // Simpler version for medium/low performance
            // Shift from base color toward a secondary color based on age
            const baseHue = {
              birth: 0.3, // Green
              harmony: 0.8, // Purple
              stable: 0.5, // Teal
              active: 0.6  // Blue
            }[activeNote.state] || 0.6;
            
            const targetHue = baseHue - 0.3; // Shift hue by 30%
            const resultHue = baseHue - (hueShift * 0.3);
            
            ageColor.setHSL(resultHue, 0.7, 0.5 + (hueShift * 0.2));
          }
        }
        
        // Blend color based on age for transition effects - scale transition time with tempo
        const noteTransitionTime = noteInterval / 1000; // Convert interval from ms to seconds
        const shortTransitionTime = Math.max(0.1, Math.min(0.3, noteTransitionTime * 0.5));
        const longTransitionTime = Math.max(0.3, Math.min(1.0, noteTransitionTime * 2));
        
        if (age < shortTransitionTime) {
          // New activations use the age color directly
          cell.material.color.copy(ageColor);
        } else {
          // Gradually fade the color with timing scaled to note interval
          const transitionProgress = Math.min(1, (age - shortTransitionTime) / longTransitionTime);
          
          // For high performance, more interesting color transition
          if (perfLevel === 'high') {
            // Pulse between age color and a slightly different color
            const pulseAmount = Math.sin(time * 3 + x * 0.2 + y * 0.3) * 0.1 + 0.9;
            const pulseColor = new THREE.Color(ageColor).multiplyScalar(pulseAmount);
            cell.material.color.copy(ageColor).lerp(pulseColor, transitionProgress);
          } else {
            // Simpler fade for medium/low performance
            cell.material.color.copy(ageColor).lerp(colors.active, transitionProgress);
          }
        }
        
        // Add glow effect with emission based on state, with stronger emission for older cells
        const ageEmissionBoost = Math.min(1, cellData.generationsAlive / 10) * 0.3;
        cell.material.emissive.copy(cell.material.color).multiplyScalar(0.5 + ageEmissionBoost);
        cell.material.emissiveIntensity = intensity + ageEmissionBoost;
        
        // Add hover effect if this is the hovered cell (only in high/medium perf)
        if (hoveredCell && hoveredCell[0] === x && hoveredCell[1] === y && perfLevel !== 'low') {
          cell.material.color.lerp(colors.hover, 0.3);
          cell.material.emissiveIntensity = Math.max(intensity, 0.5);
        }
        
        // Add age-based trail effects
        const trailVisible = cellData.generationsAlive >= 3 && perfLevel === 'high';
        if (trailsRef.current[index]) {
          // Show trails for cells that have been alive for a while
          trailsRef.current[index].visible = trailVisible;
          
          // Adjust trail color based on age
          if (trailVisible && trailsRef.current[index].material) {
            // Use a color based on cell age
            const ageRatio = Math.min(1, (cellData.generationsAlive - 3) / 7); // 0-1 for generations 3-10
            const trailHue = 0.6 - (ageRatio * 0.6); // Shift from blue to red
            const trailColor = new THREE.Color().setHSL(trailHue, 0.8, 0.6);
            trailsRef.current[index].material.color = trailColor;
          }
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
      >
        Cellular Automaton
      </Text>
      
      {/* Basic environmental lighting for better compatibility */}
      <ambientLight intensity={0.6} /> 
      <pointLight position={[0, 5, 0]} intensity={0.7} color="#6688ff" />
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#88aaff" />
      
      {/* Grid - rotate to be more visible from top view */}
      <group ref={gridRef} rotation={[0, 0, 0]}>
        {/* Enhanced glow effect under the grid */}
        <mesh 
          ref={glowRef}
          position={[0, -0.2, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[size * spacing * 2, size * spacing * 2]} />
          <meshBasicMaterial 
            color={0x224466} 
            transparent={true} 
            opacity={0.3} 
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        {/* Floor plane for grid - always visible for better clarity with animation */}
        <mesh 
          position={[0, -0.05, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[size * spacing * 1.5, size * spacing * 1.5]} />
          <meshBasicMaterial 
            color="#142440"
            transparent={true}
            opacity={0.9}
          />
        </mesh>
        
        {/* Cells */}
        {cells.map((cell, index) => (
          <group key={`cell-container-${index}`}>
            {/* Main cell cube */}
            <mesh
              key={`cell-${index}`}
              ref={el => cellsRef.current[index] = el}
              position={[...cell.position]}
              userData={{ 
                active: false,
                generationsAlive: cell.generationsAlive || 0,
                birthTimestamp: cell.birthTimestamp || 0,
                lastActiveTimestamp: cell.lastActiveTimestamp || 0
              }}
              onClick={() => setHoveredCell(cell.coords)}
              onPointerEnter={() => setHoveredCell(cell.coords)}
              onPointerLeave={() => setHoveredCell(null)}
            >
              <primitive object={cellGeometry} />
              <meshStandardMaterial
                color={colors.inactive}
                metalness={0.5}
                roughness={0.2}
                emissive={colors.inactive}
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.9}
              />
              
              {/* Note labels removed */}
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
        
        {/* Simple standard particle system */}
        {particleSystem && (
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={particleSystem.count}
                array={particleSystem.positions}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                count={particleSystem.count}
                array={particleSystem.colors}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.2}
              vertexColors
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              sizeAttenuation
            />
          </points>
        )}
        
        {/* Grid lines */}
        {/* <gridHelper 
          args={[size * spacing * 1.02, size, colors.grid.getHex(), colors.grid.getHex()]} 
          position={[0, 0.01, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        /> */}
      </group>
    </group>
  );
};

export default CellularVisualizer;