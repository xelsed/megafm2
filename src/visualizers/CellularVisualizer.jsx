import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Trail, Billboard, PerspectiveCamera } from '@react-three/drei';
import { useSelector } from 'react-redux';

/**
 * Cellular Automaton Visualizer (Revisited & Enhanced)
 *
 * Renders 1D or 2D cellular automata based on Redux state and `activeNotes` prop.
 * Features:
 * - 1D/2D modes.
 * - Multiple color schemes.
 * - Performance levels ('low', 'medium', 'high') affecting detail and effects.
 * - Animated cell height/color/glow based on note state, velocity, and age.
 * - Animation speed synchronized with `noteInterval` from Redux.
 * - Particle effects ("sparks") on cell 'birth', speed linked to note velocity.
 * - Optional trails on active cells (high performance).
 * - Optional note labels (high performance).
 * - Camera/lighting adjustments for better visibility.
 * - Extensive comments explaining the functionality.
 *
 * Note: For significant performance gains with very large grids, consider refactoring
 * to use THREE.InstancedMesh for rendering the cells instead of mapping individual meshes.
 */
const CellularVisualizer = ({ activeNotes = [], perfLevel = 'medium' }) => {
  // --- Refs ---
  // Refs provide direct access to Three.js objects or persistent values without causing re-renders.
  const gridRef = useRef(); // Ref for the main group containing cells, allowing global transformations.
  const cellsRef = useRef([]); // Array of refs, one for each cell's Mesh object.
  const notesRef = useRef([]); // Holds the processed note data relevant for the *current* animation frame.
  const textRef = useRef(); // Ref for the main title Text component.
  const glowRef = useRef(); // Ref for the background glow plane Mesh.
  const trailsRef = useRef([]); // Array of refs for Trail components (only populated in high perf mode).

  // --- State ---
  // React state hooks manage component state that, when changed, triggers re-renders.
  const [hoveredCell, setHoveredCell] = useState(null); // Stores coords [x, y] of the currently hovered cell, or null.
  const [showLabels, setShowLabels] = useState(false); // Controls visibility of note labels, synced with Redux.
  const [particles, setParticles] = useState([]); // Array storing active particle objects for the "sparks" effect.
  const [simulatedNotes, setSimulatedNotes] = useState([]); // Stores placeholder notes for Game of Life demo when no real notes are provided.

  // --- Redux State ---
  // useSelector hooks subscribe to the Redux store and extract necessary data.
  const currentAlgorithm = useSelector(state => state.algorithm?.currentAlgorithm); // e.g., 'cellular'
  const cellularParameters = useSelector(state => state.algorithm?.algorithms?.cellular?.parameters); // e.g., { width, height, type, rule }
  const visualizerSettings = useSelector(state => state.visualizer || {}); // e.g., { colorScheme, showLabels, autoRotate }
  const tempo = useSelector(state => state.algorithm?.tempo || 120); // Beats per minute (currently unused directly in this component)
  const noteInterval = useSelector(state => state.algorithm?.noteInterval || 250); // Interval between musical steps/notes in ms. Crucial for animation sync.

  // --- Derived Values & Constants ---
  // Calculate values based on Redux state or props for easier use.
  const isCellular = currentAlgorithm === 'cellular'; // Is the cellular algorithm active?
  const is2D = isCellular && cellularParameters?.type === 'gameOfLife'; // Is it specifically the 2D Game of Life mode?
  const size = cellularParameters?.width || 16; // Grid width (columns), default 16.
  const height = is2D ? (cellularParameters?.height || 16) : 1; // Grid height (rows), 1 for 1D mode, default 16 for 2D.
  const historyDepth = is2D ? 1 : 32; // Number of generations to show vertically in 1D mode, 1 for 2D.

  // --- Memoized Calculations ---
  // useMemo avoids expensive recalculations on every render if dependencies haven't changed.

  // Calculate cell size and spacing based on grid width.
  const { cellSize, spacing } = useMemo(() => {
    const calculatedCellSize = Math.min(10 / size, 0.5); // Cell size shrinks with larger grids, capped at 0.5.
    const calculatedSpacing = calculatedCellSize * 1.1; // Gap between cells.
    console.log(`Calculated Cell Size: ${calculatedCellSize}, Spacing: ${calculatedSpacing}`);
    return { cellSize: calculatedCellSize, spacing: calculatedSpacing };
  }, [size]);

  // Define multiple color schemes and select the active one.
  const colors = useMemo(() => {
    const schemeType = visualizerSettings.colorScheme || 'default';
    console.log(`Using color scheme: ${schemeType}`);
    const schemes = {
        // Define colors for different cell states and UI elements for each scheme.
        default: { inactive: new THREE.Color(0x111133), active: new THREE.Color(0x44aaff), highlight: new THREE.Color(0xffaa44), birth: new THREE.Color(0x44ff88), death: new THREE.Color(0xff4466), harmony: new THREE.Color(0xaa44ff), hover: new THREE.Color(0xffffff), stable: new THREE.Color(0x33aadd), oscillator: new THREE.Color(0x22ddaa), grid: new THREE.Color(0x222244), background: new THREE.Color(0x223366) },
        neon: { inactive: new THREE.Color(0x111122), active: new THREE.Color(0x00ffff), highlight: new THREE.Color(0xff00ff), birth: new THREE.Color(0x33ff99), death: new THREE.Color(0xff3366), harmony: new THREE.Color(0xff66ff), hover: new THREE.Color(0xffffff), stable: new THREE.Color(0x33ffdd), oscillator: new THREE.Color(0x33ff66), grid: new THREE.Color(0x222244), background: new THREE.Color(0x220066) },
        monochrome: { inactive: new THREE.Color(0x111111), active: new THREE.Color(0xcccccc), highlight: new THREE.Color(0xffffff), birth: new THREE.Color(0xeeeeee), death: new THREE.Color(0x999999), harmony: new THREE.Color(0xbbbbbb), hover: new THREE.Color(0xffffff), stable: new THREE.Color(0xdddddd), oscillator: new THREE.Color(0xaaaaaa), grid: new THREE.Color(0x333333), background: new THREE.Color(0x444444) },
        warm: { inactive: new THREE.Color(0x221111), active: new THREE.Color(0xff8844), highlight: new THREE.Color(0xffcc22), birth: new THREE.Color(0xffaa44), death: new THREE.Color(0xbb2200), harmony: new THREE.Color(0xff66aa), hover: new THREE.Color(0xffffcc), stable: new THREE.Color(0xddaa66), oscillator: new THREE.Color(0xffcc88), grid: new THREE.Color(0x442211), background: new THREE.Color(0x662200) },
        cool: { inactive: new THREE.Color(0x111122), active: new THREE.Color(0x4488ff), highlight: new THREE.Color(0x22ccff), birth: new THREE.Color(0x44ddff), death: new THREE.Color(0x0022bb), harmony: new THREE.Color(0x88bbff), hover: new THREE.Color(0xccffff), stable: new THREE.Color(0x66aadd), oscillator: new THREE.Color(0x88ccff), grid: new THREE.Color(0x223344), background: new THREE.Color(0x002266) }
      };
    return schemes[schemeType] || schemes.default; // Return selected scheme or fallback to default.
  }, [visualizerSettings.colorScheme]);

  // Create cell geometry, varying detail based on performance level.
  const cellGeometry = useMemo(() => {
    console.log(`Creating cell geometry for perfLevel: ${perfLevel}`);
    // More subdivisions create slightly smoother lighting on edges but cost more performance.
    if (perfLevel === 'high') {
      // Higher detail for high performance.
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize, 2, 1, 2); // width, height, depth, widthSegments, heightSegments, depthSegments
    } else if (perfLevel === 'medium') {
      // Medium detail.
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize, 1, 1, 1);
    } else {
      // Lowest detail (simple box) for low performance.
      return new THREE.BoxGeometry(cellSize, 0.1, cellSize);
    }
  }, [cellSize, perfLevel]); // Recreate geometry if cellSize or perfLevel changes.

  // Create and configure the particle system (Points object) for "sparks".
  const particleSystem = useMemo(() => {
    if (perfLevel === 'low') {
        console.log("Skipping particle system creation (low perf).");
        return null; // No particles in low performance mode.
    }

    const particleCount = perfLevel === 'high' ? 1000 : 250; // Max number of particles.
    console.log(`Creating particle system with ${particleCount} particles.`);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3).fill(0); // Initialize position buffer.
    const colors = new Float32Array(particleCount * 3).fill(1); // Initialize color buffer.

    // Assign buffers to geometry attributes.
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Hint that buffers will be updated frequently (DynamicDrawUsage).
    geometry.attributes.position.usage = THREE.DynamicDrawUsage;
    geometry.attributes.color.usage = THREE.DynamicDrawUsage;

    // Create material for the points.
    const material = new THREE.PointsMaterial({
      size: 0.1, // Visual size of particles.
      transparent: true, // Enable transparency.
      vertexColors: true, // Use colors defined in the geometry attribute.
      blending: THREE.AdditiveBlending, // Particles add brightness where they overlap.
      depthWrite: false, // Particles don't obscure objects behind them.
      sizeAttenuation: true // Particles appear smaller further from the camera.
    });

    // Return the essential parts needed for rendering and updates.
    return { geometry, material, positions, colors, count: particleCount };
  }, [perfLevel]); // Recreate system if performance level changes.

  // Generate the data structure defining cell positions and coordinates.
  const cells = useMemo(() => {
    console.log(`Generating cell layout for ${size}x${height} grid, depth ${historyDepth}`);
    const cellData = [];
    const gridWidth = size * spacing;
    const gridDepth = historyDepth * spacing; // Total depth of the visualization.
    // Calculate offsets to center the grid visually.
    const offsetX = -gridWidth / 2 + spacing / 2;
    const offsetZ = -gridDepth / 2 + spacing / 2;

    // Loop through depth (generations for 1D, just 1 for 2D).
    for (let z = 0; z < historyDepth; z++) {
      // Loop through width (columns).
      for (let x = 0; x < size; x++) {
        // Loop through height (rows - only relevant for 2D).
        for (let y = 0; y < height; y++) {
            // Determine the Z position based on mode.
            const zPos = is2D ? (offsetZ + y * spacing) : (offsetZ + z * spacing);
            // Determine the coordinate used for matching notes.
            const yCoord = is2D ? y : z;

            cellData.push({
              position: [offsetX + x * spacing, 0, zPos], // Initial position in 3D space (Y=0).
              coords: [x, yCoord], // Logical coordinates [column, rowOrGeneration].
            });
        }
      }
    }
    return cellData;
  }, [is2D, size, height, historyDepth, spacing]); // Regenerate if layout parameters change.


  // --- Callbacks ---
  // useCallback memoizes functions so they aren't recreated on every render unless dependencies change.

  // Helper function to convert MIDI pitch number to note name string (e.g., 60 -> C4).
  const getPitchName = useCallback((pitch) => {
    if (typeof pitch !== 'number' || !Number.isFinite(pitch)) return ''; // Basic validation.
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1; // MIDI C4 is 60.
    const noteName = noteNames[pitch % 12];
    return `${noteName}${octave}`;
  }, []); // No dependencies, this function is pure.

  /**
   * Creates a burst of particles ("sparks") originating from a cell.
   * Typically called when a cell enters the 'birth' state.
   * Visual feedback for note creation/triggering.
   * @param {number} x - World X position for burst origin.
   * @param {number} y - World Y position for burst origin.
   * @param {number} z - World Z position for burst origin.
   * @param {number} colorHex - Color of the particles (hex number).
   * @param {string} type - Type of event ('birth', potentially 'death'), influences direction.
   * @param {number} [noteVelocity=80] - Velocity of the note (0-127), influences particle speed.
   */
  const createParticleBurst = useCallback((x, y, z, colorHex, type, noteVelocity = 80) => {
    if (perfLevel === 'low' || !particleSystem) return; // Skip if disabled or not ready.

    const maxTotalParticles = perfLevel === 'high' ? 500 : 150; // Max allowed particles.
    const currentParticleCount = particles.length;
    const availableSlots = maxTotalParticles - currentParticleCount;

    if (availableSlots <= 0) return; // Exit if limit reached.

    const burstSize = perfLevel === 'high' ? 20 : 8; // Number of particles per burst.
    const countToAdd = Math.min(burstSize, availableSlots);

    const newParticles = [];
    const burstColor = new THREE.Color(colorHex);

    // Generate properties for each new particle.
    for (let i = 0; i < countToAdd; i++) {
      const angle = Math.random() * Math.PI * 2; // Random horizontal direction.
      const upwardBias = type === 'birth' ? 0.8 : 0.2; // 'birth' particles move more upwards.

      // --- Calculate particle speed based on note velocity ---
      const normalizedVelocity = Math.max(0, noteVelocity) / 127; // Normalize 0-1.
      const baseSpeed = 0.02 + normalizedVelocity * 0.04; // Speed scales with velocity (range ~0.02 to 0.06).
      const speed = baseSpeed + Math.random() * 0.02; // Add randomness.
      // ---

      const lifeDecay = (perfLevel === 'high' ? (0.92 + Math.random() * 0.05) : (0.85 + Math.random() * 0.05)); // Decay rate.

      newParticles.push({
        id: Math.random(), // Simple unique key.
        position: [x, y, z],
        velocity: [
          Math.cos(angle) * speed,
          upwardBias * (speed * 1.2 + Math.random() * 0.03), // Slightly faster vertical component.
          Math.sin(angle) * speed
        ],
        color: burstColor,
        life: 1.0, // Start with full life.
        decay: lifeDecay,
      });
    }

    // Add new particles to state, ensuring total doesn't exceed max.
    setParticles(prev => [...prev, ...newParticles].slice(-maxTotalParticles));

  }, [perfLevel, particleSystem, particles.length]); // Dependencies.

  // Updates particle physics (position, life) and updates the Three.js BufferGeometry.
  const updateParticles = useCallback((delta) => {
    // Skip if particles are disabled or none exist.
    if (perfLevel === 'low' || !particleSystem || particles.length === 0) {
      // If particles just got disabled or cleared, ensure the geometry buffer is also cleared.
      if (particleSystem?.geometry && particleSystem.positions[1] !== -1000) { // Check if update needed.
        particleSystem.positions.fill(0);
        particleSystem.colors.fill(0);
        for (let i = 0; i < particleSystem.count; i++) {
          particleSystem.positions[i * 3 + 1] = -1000; // Move points far away.
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.geometry.attributes.color.needsUpdate = true;
      }
      return;
    }

    let needsGeomUpdate = false; // Flag to update geometry buffers.
    const gravity = 0.005; // Simple gravity effect.

    // Calculate next state for each particle.
    const nextParticles = particles.map(p => {
        needsGeomUpdate = true;
        const effectiveDelta = delta * 60; // Scale physics by delta time for frame rate independence.
        return {
          ...p,
          position: [ // Update position based on velocity and gravity.
            p.position[0] + p.velocity[0] * effectiveDelta,
            p.position[1] + p.velocity[1] * effectiveDelta - gravity * effectiveDelta,
            p.position[2] + p.velocity[2] * effectiveDelta
          ],
          life: p.life * Math.pow(p.decay, effectiveDelta), // Apply exponential decay based on delta.
        };
      })
      .filter(p => p.life > 0.015); // Remove particles whose life is negligible.

    // Update the React state with the new particle array.
    setParticles(nextParticles);

    // If particles were updated, update the Three.js BufferGeometry.
    if (needsGeomUpdate) {
      const { positions, colors, count, geometry } = particleSystem;

      // Update buffer data for active particles.
      let i = 0;
      for (; i < nextParticles.length && i < count; i++) {
        const p = nextParticles[i];
        const i3 = i * 3;
        positions[i3] = p.position[0];
        positions[i3 + 1] = p.position[1];
        positions[i3 + 2] = p.position[2];

        const lifeFactor = p.life; // Fade color brightness with life.
        colors[i3] = p.color.r * lifeFactor;
        colors[i3 + 1] = p.color.g * lifeFactor;
        colors[i3 + 2] = p.color.b * lifeFactor;
      }

      // Hide remaining unused points in the buffer.
      for (; i < count; i++) {
        if (positions[i * 3 + 1] === -1000) break; // Optimization: stop if already hidden.
        const i3 = i * 3;
        positions[i3] = 0;
        positions[i3 + 1] = -1000; // Move far away.
        positions[i3 + 2] = 0;
      }

      // Mark buffers as needing update.
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.computeBoundingSphere(); // Update bounding sphere for culling.
    }

  }, [particles, particleSystem, perfLevel]); // Dependencies.

  // Generates placeholder Game of Life patterns (returns data array, not meshes).
  const createSimulatedCellPatterns = useCallback(() => {
    const newFakeCells = [];
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(height / 2);

    const canPlacePattern = (x, y, w, h) => x >= 0 && y >= 0 && x + w <= size && y + h <= height;

    // Add Glider (2D only).
    if (is2D && canPlacePattern(1, 1, 3, 3)) {
      newFakeCells.push(
        { column: 1, row: 0, state: 'birth', velocity: 100, pitch: 60 }, { column: 2, row: 1, state: 'birth', velocity: 100, pitch: 62 },
        { column: 0, row: 2, state: 'birth', velocity: 100, pitch: 64 }, { column: 1, row: 2, state: 'birth', velocity: 100, pitch: 65 },
        { column: 2, row: 2, state: 'birth', velocity: 100, pitch: 67 }
      );
    }

    // Add Blinker (adapted for 1D/2D).
    const blinkerX = Math.max(0, centerX - 1);
    const blinkerY = is2D ? centerY : 0;
    if (canPlacePattern(blinkerX, blinkerY, 3, 1)) {
       newFakeCells.push(
         { column: blinkerX, row: blinkerY, state: 'oscillator', velocity: 80, pitch: 72 },
         { column: blinkerX + 1, row: blinkerY, state: 'oscillator', velocity: 80, pitch: 74 },
         { column: blinkerX + 2, row: blinkerY, state: 'oscillator', velocity: 80, pitch: 76 }
       );
    }

    // Add random 'birth' cells.
    const randomCount = is2D ? 5 : 3;
    for (let i = 0; i < randomCount; i++) {
      const randX = Math.floor(Math.random() * size);
      const randY = is2D ? Math.floor(Math.random() * height) : 0;
      if (!newFakeCells.some(c => c.column === randX && c.row === randY)) {
        newFakeCells.push({ column: randX, row: randY, state: 'birth', velocity: 70 + Math.floor(Math.random() * 58), pitch: 60 + Math.floor(Math.random() * 24) });
      }
    }

    // Add birthTime timestamp.
    const now = Date.now();
    return newFakeCells.map(note => ({ ...note, birthTime: now }));

  }, [size, height, is2D]); // Dependencies.


  // --- Effects ---
  // useEffect hooks run side effects after rendering, based on dependency changes.

  // Sync local showLabels state with Redux setting.
  useEffect(() => {
    setShowLabels(visualizerSettings.showLabels || false);
  }, [visualizerSettings.showLabels]);

  // Initialize/resize refs arrays for cell meshes and trails.
  useEffect(() => {
    cellsRef.current = Array(cells.length).fill(null); // Ensure array matches cell count.
    if (perfLevel === 'high') {
      trailsRef.current = Array(cells.length).fill(null); // Create trail refs only if needed.
    } else {
      trailsRef.current = []; // Clear refs otherwise.
    }
  }, [cells.length, perfLevel]); // Rerun if cell count or perfLevel changes.


  // Manage simulated notes for Game of Life demo mode.
  useEffect(() => {
    let intervalId = null;
    let timeoutId = null;

    // Only run simulation if in 2D mode and no real notes are provided.
    if (is2D && currentAlgorithm === 'cellular' && activeNotes.length === 0) {
      console.log("CellularVisualizer: No active notes in 2D mode, initializing simulation.");
      setSimulatedNotes(createSimulatedCellPatterns()); // Set initial patterns.

      const addMoreSimulated = () => {
        console.log("CellularVisualizer: Adding more simulated patterns.");
        setSimulatedNotes(prev => [...prev, ...createSimulatedCellPatterns()].slice(-150)); // Add more, limit history.
      };

      timeoutId = setTimeout(addMoreSimulated, 2500); // Add more after delay.
      intervalId = setInterval(addMoreSimulated, 8000); // Add more periodically.

    } else {
      // If conditions change (notes appear, mode changes), clear simulation.
      if (simulatedNotes.length > 0) {
        console.log("CellularVisualizer: Active notes detected or mode changed, clearing simulation.");
        setSimulatedNotes([]);
      }
    }

    // Cleanup timers on unmount or dependency change.
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [is2D, currentAlgorithm, activeNotes.length, createSimulatedCellPatterns, simulatedNotes.length]); // Dependencies.


  // Process incoming notes (real or simulated) into `notesRef` for the animation loop.
  useEffect(() => {
    // Determine which notes to use: real `activeNotes` or `simulatedNotes`.
    const sourceNotes = (is2D && activeNotes.length === 0) ? simulatedNotes : activeNotes;

    if (!sourceNotes || !cellsRef.current) {
      notesRef.current = []; // Clear ref if no data or refs not ready.
      return;
    }

    // Group notes by grid position using a Map for efficient lookup.
    const posMap = new Map();
    sourceNotes.forEach(note => {
      if (note && typeof note.column === 'number' && typeof note.row === 'number') {
        const key = `${note.column},${note.row}`;
        if (!posMap.has(key)) posMap.set(key, []);
        posMap.get(key).push({ // Add note with defaults.
          ...note, state: note.state || 'active', velocity: note.velocity || 80,
          pitch: note.pitch || 60, birthTime: note.birthTime || Date.now(),
        });
      }
    });

    // Process grouped notes: select one per position, trigger effects.
    const processedNotes = [];
    posMap.forEach((notesAtPos, key) => {
      // Prioritize note state for visual triggers (e.g., 'birth' for particles).
      let highestPriorityNote = notesAtPos[0];
      for (const note of notesAtPos) {
        if (note.state === 'birth') { highestPriorityNote = note; break; }
        else if (note.state === 'harmony' && highestPriorityNote.state !== 'birth') { highestPriorityNote = note; }
      }

      // Add the representative note for this frame's visualization data.
      processedNotes.push({
        column: highestPriorityNote.column, row: highestPriorityNote.row,
        velocity: highestPriorityNote.velocity, state: highestPriorityNote.state,
        pitch: highestPriorityNote.pitch, birthTime: highestPriorityNote.birthTime,
      });

      // Trigger particle burst effect for 'birth' state notes.
      if (highestPriorityNote.state === 'birth' && gridRef.current) {
        const cellIndex = cells.findIndex(cell => cell.coords[0] === highestPriorityNote.column && cell.coords[1] === highestPriorityNote.row);
        if (cellIndex >= 0 && cellsRef.current[cellIndex]) {
          const mesh = cellsRef.current[cellIndex];
          const worldPos = new THREE.Vector3();
          mesh.getWorldPosition(worldPos); // Get world position of the cell mesh.
          // Create particles, passing velocity.
          createParticleBurst(worldPos.x, worldPos.y, worldPos.z, colors.birth.getHex(), 'birth', highestPriorityNote.velocity);
        }
      }
    });

    // Update the notesRef, making the processed data available to useFrame.
    notesRef.current = processedNotes;

  }, [activeNotes, simulatedNotes, is2D, cells, colors.birth, colors.death, createParticleBurst]); // Dependencies.


  // --- Animation Loop (useFrame) ---
  // Runs every frame to update animations and visual properties.
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const adjustedDelta = Math.min(delta, 0.05); // Clamp delta to prevent large jumps.

    // --- Calculate Dynamic Lerp Factor ---
    // Adjusts animation speed based on `noteInterval` for better musical sync.
    const framesPerInterval = Math.max(1, noteInterval / 16.67); // Estimate frames per interval (~60fps).
    let lerpFactor = 1 - Math.pow(0.1, 1 / framesPerInterval); // Aim for ~90% completion in one interval.
    lerpFactor = Math.min(0.4, Math.max(0.05, lerpFactor)); // Clamp factor (5% to 40% per frame).

    // --- Update Systems ---
    updateParticles(adjustedDelta); // Update particle physics.

    // --- Update Title Text ---
    if (textRef.current) {
      const title = is2D ? "Conway's Game of Life" : `Cellular Automaton (Rule ${cellularParameters?.rule || 'N/A'})`;
      const noteCount = notesRef.current.length; // Count notes processed for *this* frame.
      textRef.current.text = `${title} - ${noteCount} active cells`;
      // Animate text color brightness.
      if (textRef.current.material) {
          // Use original logic: pulse color based on time and note count
          const pulseIntensity = Math.sin(time * 2) * 0.2 + 0.8;
          const noteColorFactor = Math.min(1, noteCount / (is2D ? 20 : 10)); // Normalize based on expected density
          // Interpolate between white and a slightly different color based on note count
          textRef.current.material.color.setRGB(
            1, // Red channel always 1 (white base)
            0.8 + 0.2 * pulseIntensity * noteColorFactor, // Green channel pulses towards white with more notes
            0.8 + 0.2 * pulseIntensity * (1 - noteColorFactor) // Blue channel pulses towards white with fewer notes
          );
      }
    }

    // --- Update Grid Group Animations ---
    if (gridRef.current) {
      // Breathing effect (vertical oscillation).
      const activeNoteCount = notesRef.current.length;
      const heightFactor = Math.min(1, activeNoteCount / (size * (is2D ? height : 5))); // Normalize based on density.
      const breathe = Math.sin(time * 0.8) * 0.04 * heightFactor; // Calculate oscillation.
      gridRef.current.position.y = breathe; // Apply Y position change.

      // Auto-rotation.
      if (visualizerSettings.autoRotate) {
        gridRef.current.rotation.y += adjustedDelta * 0.07; // Rotate based on delta time.
      }
    }

    // --- Update Background Glow ---
    if (glowRef.current) {
      // Animate scale and opacity based on activity and perf level (uses fixed lerp for ambient feel).
      const activeNoteCount = notesRef.current.length;
      let maxGlowIntensity = (perfLevel === 'high') ? 0.45 : (perfLevel === 'medium' ? 0.3 : 0.15);
      const glowIntensity = Math.min(1, activeNoteCount / (size * (is2D ? height : 3))) * maxGlowIntensity;
      const targetScale = 1 + glowIntensity;
      glowRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08); // Fixed lerp factor.
      if (glowRef.current.material) {
        const targetOpacity = perfLevel === 'low' ? 0.08 : 0.12;
        glowRef.current.material.opacity += (targetOpacity - glowRef.current.material.opacity) * 0.08; // Fixed lerp factor.
      }
    }

    // --- Update Individual Cell Visuals ---
    cellsRef.current.forEach((mesh, index) => {
      if (!mesh) return; // Skip if ref not ready.

      const cellData = cells[index];
      const [x, yCoord] = cellData.coords;

      // Find the note data for this cell from the processed notes for this frame.
      const activeNote = notesRef.current.find(note => note.column === x && note.row === yCoord);

      const wasActive = mesh.userData.active || false; // Store previous state.
      mesh.userData.active = !!activeNote; // Update current state.

      // --- Determine Target Visual Properties based on activeNote ---
      let targetColor = colors.inactive;
      let targetEmissiveIntensity = 0;
      let targetScaleY = 0.1; // Default inactive height.
      let targetPosY = 0; // Default inactive position.

      if (activeNote) { // If cell is active this frame:
        const age = (Date.now() - activeNote.birthTime) / 1000; // Age in seconds.
        const ageIntensity = Math.max(0, Math.min(1, 1.2 - age * 0.8)); // Intensity fades over ~1.5s.

        targetColor = colors[activeNote.state] || colors.active; // Get color based on state.

        // Calculate height based on state, velocity, and age.
        const velocityFactor = Math.max(0.2, activeNote.velocity / 127);
        switch (activeNote.state) {
          case 'birth': targetScaleY = 0.1 + velocityFactor * 1.5 * ageIntensity; break;
          case 'harmony': targetScaleY = 0.1 + velocityFactor * 0.6 * ageIntensity; break;
          default: targetScaleY = 0.1 + velocityFactor * 1.0 * ageIntensity;
        }
        targetScaleY = Math.max(0.1, targetScaleY); // Min height.
        targetPosY = targetScaleY / 2; // Position base at y=0.

        targetEmissiveIntensity = ageIntensity * 0.7; // Glow fades with age.

        // Apply hover effect if applicable.
        if (hoveredCell && hoveredCell[0] === x && hoveredCell[1] === yCoord && perfLevel !== 'low') {
          targetColor = targetColor.clone().lerp(colors.hover, 0.45);
          targetEmissiveIntensity = Math.max(targetEmissiveIntensity, 0.8);
          targetScaleY += 0.1; // Make hovered cell taller.
          targetPosY = targetScaleY / 2;
        }

      } else { // If cell is inactive this frame:
        targetColor = colors.inactive;
        targetEmissiveIntensity = 0;
        // If it was active previously, smoothly shrink it.
        if (wasActive) {
          const shrinkTargetScaleY = 0.1; // Target inactive height.
          // Interpolate scale directly towards the target using dynamic lerpFactor.
          mesh.scale.y += (shrinkTargetScaleY - mesh.scale.y) * lerpFactor * 0.8; // Slightly slower shrink.
          targetScaleY = mesh.scale.y; // Use current shrinking scale for position calculation.
        } else {
          targetScaleY = 0.1; // Already inactive, stay at min height.
        }
        targetPosY = targetScaleY / 2;
      }

      // --- Apply Animations using Dynamic Lerp Factor ---
      // Apply lerp for scale and position (shrinking handled slightly differently above).
      if (activeNote || !wasActive) { // Only lerp if becoming active or staying inactive.
        mesh.scale.y += (targetScaleY - mesh.scale.y) * lerpFactor;
        mesh.position.y += (targetPosY - mesh.position.y) * lerpFactor;
      } else { // If shrinking (wasActive is true, activeNote is false).
        mesh.position.y = mesh.scale.y / 2; // Ensure position matches the shrinking scale.
      }

      // Lerp color if changed.
      if (!mesh.material.color.equals(targetColor)) {
        mesh.material.color.lerp(targetColor, lerpFactor);
      }
      // Lerp emissive intensity.
      mesh.material.emissiveIntensity += (targetEmissiveIntensity - mesh.material.emissiveIntensity) * lerpFactor;
      // Lerp emissive color towards the base state color.
      const baseColor = colors[activeNote?.state || 'inactive'] || colors.inactive;
      if (!mesh.material.emissive.equals(baseColor)) {
        mesh.material.emissive.lerp(baseColor, lerpFactor);
      }

      // --- Update Trails (High Perf Only) ---
      if (perfLevel === 'high' && trailsRef.current[index]) {
        const trail = trailsRef.current[index];
        const shouldTrailBeVisible = !!activeNote && (activeNote.state === 'birth' || activeNote.state === 'active');
        // Toggle visibility.
        if (shouldTrailBeVisible && !trail.visible) trail.visible = true;
        else if (!shouldTrailBeVisible && trail.visible) trail.visible = false;
        // Update trail target position to follow animated cell.
        if (trail.visible && trail.children[0]) {
          trail.children[0].position.set(mesh.position.x, mesh.position.y + 0.05, mesh.position.z);
        }
      }
    });
  }); // End useFrame

  // --- JSX Structure ---
  return (
    // Add closing tag for the main group!
    <group name="cellularVisualizerGroup">
      {/* Explicit Camera Setup */}
      <PerspectiveCamera
        makeDefault // Use this camera for rendering.
        position={[0, size * spacing * 0.8, size * spacing * 1.1]} // Position relative to grid size.
        fov={55} // Field of view.
        near={0.1} // Near clipping plane.
        far={100} // Far clipping plane.
      />
      {/* Note: If OrbitControls are used, they should be added outside this component */}
      {/* and ideally configured to target the grid center [0, 0, 0]. */}

      {/* Title Text */}
      <Text
        ref={textRef}
        position={[0, Math.max(3, size * spacing * 0.35) + 1, 0]} // Position above grid.
        fontSize={0.55}
        color="white"
        anchorX="center"
        anchorY="middle"
   ////     font="/fonts/Inter-Bold.woff" // Ensure path is correct!
      >
        Cellular Automaton
      </Text>

      {/* Scene Lighting */}
      <ambientLight intensity={0.4} /> {/* General ambient light. */}
      <pointLight position={[size * spacing * 0.5, 8, 5]} intensity={0.6} color="#aabbff" distance={35} decay={1.5} /> {/* Cool point light. */}
      <pointLight position={[-size * spacing * 0.5, 3, -8]} intensity={0.35} color="#ffaa88" distance={30} decay={1.5}/> {/* Warm point light. */}
      <directionalLight position={[0, 10, 5]} intensity={0.15} color="#ffffff" /> {/* Subtle top-down light. */}

      {/* Background Glow Plane */}
      <mesh ref={glowRef} position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]} >
        <planeGeometry args={[size * spacing * 1.25, (is2D ? height : historyDepth) * spacing * 1.25]} />
        <meshBasicMaterial color={colors.background} transparent={true} opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Grid Container Group */}
      <group ref={gridRef} name="automatonGrid">
        {/* Optional Floor Plane (2D, Medium/High Perf) */}
        {is2D && perfLevel !== 'low' && (
          <mesh position={[0, -0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow >
            <planeGeometry args={[size * spacing, height * spacing]} />
            <meshStandardMaterial color="#151a29" metalness={0.1} roughness={0.9} transparent={true} opacity={0.65} />
          </mesh>
        )}

        {/* Render Cells */}
        {cells.map((cell, index) => (
          <React.Fragment key={`cell-frag-${index}`}>
            {/* Cell Mesh */}
            <mesh
              ref={el => cellsRef.current[index] = el}
              position={cell.position} scale={[1, 0.1, 1]} userData={{ active: false }}
              onPointerEnter={() => setHoveredCell(cell.coords)} onPointerLeave={() => setHoveredCell(null)}
            >
              <primitive object={cellGeometry} attach="geometry" />
              <meshStandardMaterial
                color={colors.inactive} metalness={0.35} roughness={0.55}
                emissive={colors.inactive} emissiveIntensity={0}
                transparent={true} opacity={0.9}
              />
              {/* Optional Note Label */}
              {showLabels && perfLevel === 'high' && (
                <Billboard follow={true} visible={!!notesRef.current.find(n => n.column === cell.coords[0] && n.row === cell.coords[1])} position={[0, 0.7, 0]} >
                  <Text fontSize={0.18} color="white" anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#111111" >
                    {getPitchName(notesRef.current.find(n => n.column === cell.coords[0] && n.row === cell.coords[1])?.pitch)}
                  </Text>
                </Billboard>
              )}
            </mesh>
            {/* Optional Trail */}
            {perfLevel === 'high' && (
              <Trail ref={el => trailsRef.current[index] = el} width={cellSize * 0.45} length={7} color={colors.birth} attenuation={(t) => Math.pow(t, 2.5)} visible={false} >
                <mesh position={cell.position} scale={0.01}> {/* Trail target */}
                  <sphereGeometry args={[1, 4, 4]} />
                  <meshBasicMaterial color="white" transparent opacity={0} depthWrite={false} />
                </mesh>
              </Trail>
            )}
          </React.Fragment>
        ))}

        {/* Particle System */}
        {perfLevel !== 'low' && particleSystem && (
          <points name="particleEffectSystem">
            <primitive object={particleSystem.geometry} attach="geometry" />
            <primitive object={particleSystem.material} attach="material" />
          </points>
        )}

        {/* Optional Grid Helper (2D Only) */}
        {is2D && (
          <gridHelper args={[ size * spacing, size, colors.grid.getHex(), colors.grid.getHex() ]} position={[0, -0.06, 0]} rotation={[0, 0, 0]} />
        )}
      </group> {/* End automatonGrid Group */}
    </group> // *** End cellularVisualizerGroup *** <-- FIX: Added missing closing tag
  ); // End return
};

export default CellularVisualizer;
