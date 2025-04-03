import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Trail, Billboard } from '@react-three/drei';
import { useSelector } from 'react-redux';

// Import modular components
import { HoverTooltip } from './cellular/HoverTooltip';
import { CellGrid, Cell } from './cellular/CellGrid';
import { getPitchName, getCellIndex, createTestPattern, calculateGridDimensions } from './cellular/CellularUtils';

/**
 * Specialized visualizer for cellular automata, particularly Conway's Game of Life
 * Renders both 1D and 2D cellular automata with color-coded cells and animations
 */
const CellularVisualizer = ({ activeNotes = [], perfLevel = 'medium' }) => {
  // Setup refs for visualization components
  const gridRef = useRef();
  const cellsRef = useRef([]);
  const notesRef = useRef([]);
  const textRef = useRef();
  const glowRef = useRef();
  const trailsRef = useRef([]);

  // UI state
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [showLabels, setShowLabels] = useState(false);

  // Get cellular data from Redux
  const currentAlgorithm = useSelector(state => state.algorithm?.currentAlgorithm);
  const cellularParameters = useSelector(state => state.algorithm?.algorithms?.cellular?.parameters);
  const isCellular = currentAlgorithm === 'cellular';
  const is2D = isCellular && cellularParameters?.type === 'gameOfLife';
  const visualizerSettings = useSelector(state => state.visualizer || {});

  // Grid configuration
  const size = cellularParameters?.width || 16;
  const height = cellularParameters?.height || 16;
  const cellSize = useMemo(() => Math.min(10 / size, 0.5), [size]);
  const spacing = cellSize * 1.1;

  // UI configuration from store
  useEffect(() => {
    setShowLabels(visualizerSettings.showLabels || false);
  }, [visualizerSettings.showLabels]);

  // Colors for different cell states
  const colors = useMemo(() => {
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

  // Cell segments based on performance level
  const cellSegments = useMemo(() => {
    if (perfLevel === 'high') {
      return [2, 1, 2];
    } else if (perfLevel === 'medium') {
      return [1, 1, 1];
    }
    return undefined; // Low performance mode - no extra segments
  }, [perfLevel]);

  // Get timing parameters from store
  const tempo = useSelector(state => state.algorithm?.tempo || 120);
  const noteInterval = useSelector(state => state.algorithm?.noteInterval || 250);

  // Generate cell data grid
  const cells = useMemo(() => {
    if (is2D) {
      // 2D grid for Game of Life
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
            birthTimestamp: 0,
            lastActiveTimestamp: 0,
            ageHistory: [0, 0, 0],
            isOscillator: false,
            oscillatorPeriod: 0
          });
        }
      }

      return cells2D;
    } else {
      // 1D grid with generation history
      const cells1D = [];
      const gridWidth = size * spacing;
      const gridDepth = 32 * spacing; // Show multiple generations
      const offsetX = -gridWidth / 2 + spacing / 2;
      const offsetZ = -gridDepth / 2 + spacing / 2;

      // Multiple generations stacked along Z axis
      for (let z = 0; z < 32; z++) {
        for (let x = 0; x < size; x++) {
          cells1D.push({
            position: [
              offsetX + x * spacing,
              0,
              offsetZ + z * spacing
            ],
            coords: [x, z], // x is position, z is generation number
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

  // Force unique key for remounting
  const [visualizerKey] = useState(() => Math.random().toString(36).substring(7));

  // Initialize refs and ensure cell visibility
  useEffect(() => {
    // Initialize refs with proper length
    cellsRef.current = Array(cells.length).fill(null);
    trailsRef.current = Array(cells.length).fill(null);

    // Force cell visibility (delayed to ensure cells are created)
    const showAllTimer = setTimeout(() => {
      cellsRef.current.forEach((cell, index) => {
        if (cell && cell.scale) {
          // Ensure visibility and minimum height
          cell.visible = true;
          cell.scale.y = Math.max(0.2, cell.scale.y);
          cell.position.y = cell.scale.y / 2;

          // Add metadata for debugging
          cell.userData = {
            ...cell.userData,
            perfLevel,
            enforced: true,
            cellIndex: index
          };

          if (cell.material) {
            // Add visual variation based on position
            const [x, y] = cells[index]?.coords || [0, 0];
            const hue = ((x * 3 + y * 7) % 20) / 60;
            cell.material.color.setHSL(hue, 0.3, 0.3);
            cell.material.emissive.setHSL(hue, 0.3, 0.3).multiplyScalar(0.3);
          }
        }
      });
    }, 500);

    return () => clearTimeout(showAllTimer);
  }, [cells.length, visualizerKey, perfLevel]);

  // Group active notes by position for efficient rendering
  const notesByPosition = useMemo(() => {
    const posMap = new Map();

    activeNotes.forEach(note => {
      if (note.column !== undefined && note.row !== undefined) {
        const key = `${note.column},${note.row}`;
        if (!posMap.has(key)) {
          posMap.set(key, []);
        }

        // Add default state if not specified
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

  // Create test pattern for development and debugging
  const addSimulatedCells = useCallback(() => {
    if (!is2D || currentAlgorithm !== 'cellular') return;

    // Force cells to be visible
    cellsRef.current.forEach((cell, index) => {
      if (cell) {
        cell.visible = true;
        cell.scale.y = 0.3;
        cell.position.y = 0.15;
      }
    });

    // Create test pattern
    const fakeCells = createTestPattern(size, height);

    // Apply simulated cells to the visualization
    fakeCells.forEach(fakeCell => {
      // Calculate correct index for the cell
      const cellIndex = getCellIndex(fakeCell.column, fakeCell.row, size, is2D);

      if (cellIndex >= 0 && cellIndex < cells.length) {
        const mesh = cellsRef.current[cellIndex];

        if (mesh && mesh.material) {
          // Update cell properties
          mesh.userData.state = fakeCell.state;
          mesh.userData.velocity = fakeCell.velocity;
          mesh.visible = true;

          // Update appearance
          const stateColor = colors[fakeCell.state] || colors.active;
          mesh.material.color.copy(stateColor);
          mesh.scale.y = 0.3;
          mesh.position.y = 0.15;

          // Track the note
          const pitchOffset = (fakeCell.column % 12) + ((fakeCell.row % 5) * 12);
          notesRef.current.push({
            ...fakeCell,
            pitch: 48 + pitchOffset,
            birthTime: Date.now()
          });
        }
      }
    });
  }, [is2D, currentAlgorithm, size, height, cells, colors]);

  // Initialize with test pattern when in cellular mode
  useEffect(() => {
    if (currentAlgorithm === 'cellular') {
      // Make all cells visible initially
      cellsRef.current.forEach((cell, index) => {
        if (cell) {
          cell.visible = true;
          cell.scale.y = 0.3;
          cell.position.y = 0.15;

          if (cell.material) {
            const [x, y] = cells[index]?.coords || [0, 0];
            const color = (x + y) % 2 === 0 ? new THREE.Color(0x3366ff) : new THREE.Color(0x66aaff);
            cell.material.color.copy(color);
          }
        }
      });

      // Create initial patterns
      const timer = setTimeout(() => {
        addSimulatedCells();
      }, 1000);

      // Periodically update for animation
      const interval = setInterval(() => {
        addSimulatedCells();
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [currentAlgorithm, cells, colors, addSimulatedCells]);

  // Process active notes to update cell states
  useEffect(() => {
    // Reset notes array
    notesRef.current = [];

    if (!activeNotes || !cellsRef.current) {
      return;
    }

    // Current time for age calculations
    const currentTime = Date.now();

    // Track active cells for death detection
    const activeCellsMap = new Map();

    // Process note groups by position
    notesByPosition.forEach((notes, key) => {
      const [colStr, rowStr] = key.split(',');
      const column = parseInt(colStr);
      const row = parseInt(rowStr);

      // Select highest priority note at this position
      let highestPriorityNote = notes[0];

      for (const note of notes) {
        // Birth events take priority
        if (note.state === 'birth') {
          highestPriorityNote = note;
          break;
        } else if (note.state === 'harmony' && highestPriorityNote.state !== 'birth') {
          // Harmony events next
          highestPriorityNote = note;
        }
      }

      // Add to active notes
      notesRef.current.push({
        column,
        row,
        velocity: highestPriorityNote.velocity,
        state: highestPriorityNote.state,
        pitch: highestPriorityNote.pitch,
        birthTime: highestPriorityNote.birthTime || currentTime
      });

      // Mark as active
      activeCellsMap.set(`${column},${row}`, true);

      // Find matching cell in the grid
      const cellIndex = cells.findIndex(cell =>
        cell.coords[0] === column && (is2D ? cell.coords[1] === row : true)
      );

      if (cellIndex >= 0) {
        const cellData = cells[cellIndex];
        const cellMesh = cellsRef.current[cellIndex];

        // Update cell birth timestamp if new
        if (cellData.generationsAlive === 0 || highestPriorityNote.state === 'birth') {
          if (cellData.birthTimestamp === 0) {
            cellData.birthTimestamp = currentTime;
            if (cellMesh && cellMesh.userData) {
              cellMesh.userData.birthTimestamp = currentTime;
            }
          }
        }

        // Update active timestamp
        cellData.lastActiveTimestamp = currentTime;
        if (cellMesh && cellMesh.userData) {
          cellMesh.userData.lastActiveTimestamp = currentTime;
        }

        // Update history for pattern detection
        if (cellData.ageHistory && Array.isArray(cellData.ageHistory)) {
          cellData.ageHistory.shift();
          cellData.ageHistory.push(1); // 1 = active
        }

        // Detect oscillator patterns (high performance mode only)
        if (perfLevel === 'high' && cellData.ageHistory &&
          cellData.ageHistory.length >= 3 &&
          cellData.generationsAlive >= 3) {

          // Look for period-2 oscillator pattern
          if (JSON.stringify(cellData.ageHistory) === JSON.stringify([0, 1, 0]) ||
            JSON.stringify(cellData.ageHistory) === JSON.stringify([1, 0, 1])) {

            cellData.isOscillator = true;
            cellData.oscillatorPeriod = 2;
          }
        }
      }
    });

    // Check for cells that died in this update
    cells.forEach((cellData, index) => {
      const cellMesh = cellsRef.current[index];
      if (!cellMesh) return;

      const [x, y] = cellData.coords;
      const cellKey = `${x},${y}`;

      // If cell was active but is no longer in the active list
      if (cellData.generationsAlive > 0 && !activeCellsMap.has(cellKey)) {
        // Recent death (within the last second)
        if (cellData.lastActiveTimestamp > 0 &&
          currentTime - cellData.lastActiveTimestamp < 1000) {

          // Update age history
          if (cellData.ageHistory && Array.isArray(cellData.ageHistory)) {
            cellData.ageHistory.shift();
            cellData.ageHistory.push(0); // 0 = inactive
          }
        }
      }
    });
  }, [activeNotes, cells, is2D, notesByPosition, perfLevel]);

  // Animation loop
  useFrame((state, delta) => {
    // Get parent timing data
    const parentGroup = state.scene.getObjectByName('visualizerGroup');
    const parentTiming = parentGroup?.userData || {};
    const time = parentTiming.time || state.clock.elapsedTime;

    // Update title text
    if (textRef.current) {
      const title = is2D ? "Conway's Game of Life" : `Cellular Automaton (Rule ${cellularParameters?.rule || 30})`;
      const noteCount = notesRef.current.length;
      textRef.current.text = `${title} - ${noteCount} active cells`;

      // Text color animation in high performance mode
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
          textRef.current.material.color.setRGB(1, 1, 1);
        }
      }
    }

    // Update grid animations
    if (gridRef.current) {
      if (perfLevel === 'high') {
        const activeNoteCount = notesRef.current.length;
        const heightFactor = Math.min(1, activeNoteCount / 20);

        // Maintain base 90-degree rotation
        gridRef.current.rotation.x = Math.PI / 2;

        // Subtle wobble effect on select cells for performance
        cellsRef.current.forEach((cell, idx) => {
          if (cell && idx % 8 === 0) {
            const wobbleX = Math.sin(time * 0.2 + idx * 0.01) * 0.01 * heightFactor;
            const wobbleZ = Math.cos(time * 0.3 + idx * 0.01) * 0.01 * heightFactor;
            cell.rotation.x = wobbleX;
            cell.rotation.z = wobbleZ;
          }
        });

        // Auto-rotation
        if (visualizerSettings.autoRotate) {
          gridRef.current.rotation.z += delta * 0.1;
        }

        // Glow animation
        if (glowRef.current) {
          const breatheAmount = Math.sin(time * 0.5) * 0.05 * heightFactor;
          glowRef.current.scale.x = 1 + breatheAmount;
          glowRef.current.scale.y = 1 + breatheAmount;
          glowRef.current.scale.z = 1; // Keep Z constant to avoid clipping
        }
      }
    }

    // Update glow effect
    if (glowRef.current) {
      const activeNoteCount = notesRef.current.length;

      if (perfLevel === 'high') {
        const maxGlowIntensity = 0.5;
        const glowIntensity = Math.min(1, activeNoteCount / 40) * maxGlowIntensity;

        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.2 + (glowIntensity * 0.1);

          // Dynamic color based on activity
          const hue = 0.6 - (activeNoteCount / 100) * 0.2;
          glowRef.current.material.color.setHSL(hue, 0.7, 0.4);
        }
      } else {
        // Simpler constant effect for lower performance
        glowRef.current.scale.x = 1.2;
        glowRef.current.scale.y = 1.2;
        glowRef.current.scale.z = 1.0;

        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.15;
        }
      }

      // Ensure proper positioning
      glowRef.current.position.set(0, 0, -0.01);
      glowRef.current.rotation.x = Math.PI / 2;
    }

    // Update cell colors and animations
    cellsRef.current.forEach((cell, index) => {
      if (!cell) return;

      const cellData = cells[index];
      const [x, y] = cellData.coords;

      // Record prior state for change detection
      const wasActive = cell.userData.active;

      // Reset to inactive
      cell.userData.active = false;
      cell.material.color.copy(colors.inactive);
      cell.material.emissiveIntensity = 0.2;

      // Base animation for all cells
      const pulseFactor = Math.sin(time * 0.5 + (x + y) * 0.2) * 0.05 + 0.95;

      // Set initial inactive state
      if (!wasActive) {
        cell.scale.y = 0.1 * pulseFactor;
        cell.position.y = cell.scale.y / 2;

        // Reset generation counter
        cellData.generationsAlive = 0;

        // Subtle color variation based on position
        const hue = ((x + y) % 20) / 20;
        cell.material.color.setHSL(hue, 0.2, 0.2 + Math.sin(time * 0.3 + x * 0.1) * 0.05);
      } else {
        // Gradual fade-out animation
        cell.scale.y = Math.max(0.1, cell.scale.y * 0.9) * pulseFactor;
        cell.position.y = cell.scale.y / 2;
      }

      // Find matching active note for this cell
      let activeNote = null;

      if (is2D) {
        // Direct coordinate matching for 2D mode
        activeNote = notesRef.current.find(note => note.column === x && note.row === y);
      } else {
        // Special handling for 1D with history generations
        const isCurrentGen = y === 0;
        const isHistorical = y > 0;

        if (isCurrentGen) {
          activeNote = notesRef.current.find(note => note.column === x && note.row === 0);
        } else if (isHistorical) {
          activeNote = notesRef.current.find(note => note.column === x && note.row === y);
        }
      }

      // Apply visual updates for active cells
      if (activeNote) {
        // Mark as active
        cell.userData.active = true;

        // Increment generation counters
        if (!cell.userData.generationsAlive) {
          cell.userData.generationsAlive = 0;
        }

        cellData.generationsAlive = (cellData.generationsAlive || 0) + 1;
        cellData.generationsAlive = Math.min(10, cellData.generationsAlive); // Cap for color mapping

        // Age of this instance of activity
        const age = (Date.now() - activeNote.birthTime) / 1000;
        const intensity = Math.max(0, Math.min(1, 1.5 - age));

        // Set height based on state, velocity and age
        let heightScale = 0.1;
        const generationBoost = Math.min(1, cellData.generationsAlive / 10) * 0.3;

        switch (activeNote.state) {
          case 'birth':
            heightScale = 0.1 + (activeNote.velocity / 127) * 2 * Math.max(0.4, intensity);
            break;
          case 'harmony':
            heightScale = 0.1 + (activeNote.velocity / 127) * 0.8 * Math.max(0.3, intensity);
            break;
          default: // 'active'
            heightScale = 0.1 + (activeNote.velocity / 127) * 1.5 * Math.max(0.2, intensity) + generationBoost;
        }

        // Apply height
        cell.scale.y = heightScale;
        cell.position.y = heightScale / 2;

        // Set base color by state
        let color = colors.active;

        switch (activeNote.state) {
          case 'birth': color = colors.birth; break;
          case 'death': color = colors.death; break;
          case 'harmony': color = colors.harmony; break;
          case 'oscillator': color = colors.oscillator; break;
          case 'stable': color = colors.stable; break;
          default: color = colors.active;
        }

        // Apply age-based color transitions
        const cellAge = cellData.generationsAlive || 1;
        let ageColor = new THREE.Color();

        if (cellAge <= 1) {
          // New cells use base color
          ageColor.copy(color);
        } else {
          // Age-based color shifting
          const hueShift = (cellAge - 1) / 9; // 0-1 range for generations 1-10

          if (perfLevel === 'high') {
            // Complex coloring for high performance
            switch (activeNote.state) {
              case 'birth':
                ageColor.setHSL(0.35 - (hueShift * 0.35), 0.8, 0.6); // Green to red
                break;
              case 'harmony':
                ageColor.setHSL(0.75 - (hueShift * 0.25), 0.7, 0.6); // Purple to orange
                break;
              case 'stable':
                ageColor.setHSL(0.5 - (hueShift * 0.25), 0.7, 0.5); // Teal to purple
                break;
              default:
                ageColor.setHSL(0.6 - (hueShift * 0.3), 0.7, 0.5 + (hueShift * 0.2)); // Blue to lime
            }
          } else {
            // Simpler transitions for medium/low performance
            const baseHue = {
              birth: 0.3, // Green
              harmony: 0.8, // Purple
              stable: 0.5, // Teal
              active: 0.6  // Blue
            }[activeNote.state] || 0.6;

            const resultHue = baseHue - (hueShift * 0.3);
            ageColor.setHSL(resultHue, 0.7, 0.5 + (hueShift * 0.2));
          }
        }

        // Apply color with transitions based on note interval timing
        const noteTransitionTime = noteInterval / 1000;
        const shortTransitionTime = Math.max(0.1, Math.min(0.3, noteTransitionTime * 0.5));
        const longTransitionTime = Math.max(0.3, Math.min(1.0, noteTransitionTime * 2));

        if (age < shortTransitionTime) {
          // New activation - use direct color
          cell.material.color.copy(ageColor);
        } else {
          // Transition based on age
          const transitionProgress = Math.min(1, (age - shortTransitionTime) / longTransitionTime);

          if (perfLevel === 'high') {
            // Animated pulsing effect
            const pulseAmount = Math.sin(time * 3 + x * 0.2 + y * 0.3) * 0.1 + 0.9;
            const pulseColor = new THREE.Color(ageColor).multiplyScalar(pulseAmount);
            cell.material.color.copy(ageColor).lerp(pulseColor, transitionProgress);
          } else {
            // Simple fade for lower performance
            cell.material.color.copy(ageColor).lerp(colors.active, transitionProgress);
          }
        }

        // Add glow with emission
        const ageEmissionBoost = Math.min(1, cellData.generationsAlive / 10) * 0.3;
        cell.material.emissive.copy(cell.material.color).multiplyScalar(0.5 + ageEmissionBoost);
        cell.material.emissiveIntensity = intensity + ageEmissionBoost;

        // Add hover effect
        if (hoveredCell && hoveredCell[0] === x && hoveredCell[1] === y && perfLevel !== 'low') {
          cell.material.color.lerp(colors.hover, 0.3);
          cell.material.emissiveIntensity = Math.max(intensity, 0.5);
        }

        // Trail effects for age visualization
        const trailVisible = cellData.generationsAlive >= 3 && perfLevel === 'high';
        if (trailsRef.current[index]) {
          trailsRef.current[index].visible = trailVisible;

          if (trailVisible && trailsRef.current[index].material) {
            // Age-based trail color
            const ageRatio = Math.min(1, (cellData.generationsAlive - 3) / 7);
            const trailHue = 0.6 - (ageRatio * 0.6); // Blue to red
            const trailColor = new THREE.Color().setHSL(trailHue, 0.8, 0.6);
            trailsRef.current[index].material.color = trailColor;
          }
        }
      } else if (wasActive && trailsRef.current[index]) {
        // Hide trails for inactive cells
        trailsRef.current[index].visible = false;
      }
    });
  });

  return (
    <group>
      {/* Title label */}
      <group position={[0, 5, 0]}>
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            ref={textRef}
            position={[0, 0, 0]}
            fontSize={0.7}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Cellular Automaton
          </Text>
        </Billboard>
      </group>

      {/* Hover tooltip */}
      <HoverTooltip info={hoveredInfo} position={[0, 3, 8]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 0]} intensity={0.7} color="#6688ff" />
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#88aaff" />

      {/* Grid with cells */}
      <group ref={gridRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Glow effect */}
        <mesh
          ref={glowRef}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredInfo({
              type: 'Glow Effect',
              object: e.object.type || 'Mesh',
              material: e.object.material.type || 'MeshBasicMaterial',
              size: `${(size * spacing * 2).toFixed(1)} x ${(size * spacing * 2).toFixed(1)}`
            });
          }}
          onPointerLeave={() => setHoveredInfo(null)}
        >
          <planeGeometry args={[size * spacing * 2, size * spacing * 2]} />
          <meshBasicMaterial
            color={0x224466}
            transparent={true}
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Floor plane */}
        <mesh
          position={[0, 0, -0.005]}
          rotation={[Math.PI / 2, 0, 0]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredInfo({
              type: 'Floor Plane',
              object: e.object.type || 'Mesh',
              material: e.object.material.type || 'MeshBasicMaterial',
              size: `${(size * spacing * 1.5).toFixed(1)} x ${(size * spacing * 1.5).toFixed(1)}`
            });
          }}
          onPointerLeave={() => setHoveredInfo(null)}
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
              ref={el => {
                if (el) {
                  // Store reference
                  cellsRef.current[index] = el;

                  // Initialize properties
                  el.userData = {
                    perfLevel,
                    cellIndex: index,
                    coords: cell.coords,
                    active: false,
                    generationsAlive: cell.generationsAlive || 0,
                    birthTimestamp: cell.birthTimestamp || 0,
                    lastActiveTimestamp: cell.lastActiveTimestamp || 0
                  };

                  // Ensure visibility
                  el.visible = true;
                  el.scale.y = 0.3;
                  el.position.y = 0.15;
                }
              }}
              position={[...cell.position]}
              userData={{
                active: false,
                generationsAlive: cell.generationsAlive || 0,
                birthTimestamp: cell.birthTimestamp || 0,
                lastActiveTimestamp: cell.lastActiveTimestamp || 0,
                perfLevel,
                cellIndex: index,
                coords: cell.coords
              }}
              onClick={() => {
                setHoveredCell(cell.coords);
                setHoveredInfo({
                  type: 'Cell',
                  coords: `[${cell.coords[0]}, ${cell.coords[1]}]`,
                  state: cell.state || 'inactive',
                  index: index
                });
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                setHoveredCell(cell.coords);
                setHoveredInfo({
                  type: 'Cell',
                  coords: `[${cell.coords[0]}, ${cell.coords[1]}]`,
                  state: cell.state || 'inactive',
                  index: index,
                  object: e.object.type || 'Mesh'
                });
              }}
              onPointerLeave={() => {
                setHoveredCell(null);
                setHoveredInfo(null);
              }}
            >
              <boxGeometry 
                args={[cellSize, 0.1, cellSize]}
                segments={cellSegments}
              />
              <meshStandardMaterial
                key={`mat-${index}-${perfLevel}`}
                color={colors.inactive}
                metalness={0.5}
                roughness={0.2}
                emissive={colors.inactive}
                emissiveIntensity={0.5}
                transparent
                opacity={0.9}
                onUpdate={(self) => {
                  // Force visibility on material creation
                  if (self && self.parent) {
                    // Force visibility
                    self.parent.visible = true;

                    // Set appropriate height 
                    const minHeight = 0.3;
                    self.parent.scale.y = Math.max(minHeight, self.parent.scale.y || 0);
                    self.parent.position.y = self.parent.scale.y / 2;

                    // Set initial color based on position
                    if (typeof index === 'number' && index >= 0 && cells[index]) {
                      const [x, y] = cells[index].coords;
                      const hue = ((x * 3 + y * 7) % 20) / 60;
                      const color = new THREE.Color().setHSL(hue, 0.3, 0.3);

                      self.color.copy(color);
                      self.emissive.copy(color).multiplyScalar(0.3);
                    }
                  }
                }}
              />
            </mesh>

            {/* Optional trail effect */}
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
                  onPointerEnter={(e) => {
                    e.stopPropagation();
                    setHoveredInfo({
                      type: 'Trail Particle',
                      coords: `[${cell.coords[0]}, ${cell.coords[1]}]`,
                      cellIndex: index,
                      object: e.object.type || 'Mesh',
                      geometry: 'SphereGeometry'
                    });
                  }}
                  onPointerLeave={() => setHoveredInfo(null)}
                >
                  <sphereGeometry args={[1, 4, 4]} />
                  <meshBasicMaterial color={colors.birth.getHex()} transparent opacity={0.6} />
                </mesh>
              </Trail>
            )}
          </group>
        ))}
      </group>
    </group>
  );
};

export default CellularVisualizer;