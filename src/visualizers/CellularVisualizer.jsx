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
  const [hoveredInfo, setHoveredInfo] = useState(null); // Store info about hovered object
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
    console.log(`[CellularVisualizer] Creating geometry for perfLevel: ${perfLevel}, cellSize: ${cellSize}`);
    
    let geometry;
    if (perfLevel === 'high') {
      geometry = new THREE.BoxGeometry(cellSize, 0.1, cellSize, 2, 1, 2);
    } else if (perfLevel === 'medium') {
      geometry = new THREE.BoxGeometry(cellSize, 0.1, cellSize, 1, 1, 1);
    } else {
      // Low performance mode
      geometry = new THREE.BoxGeometry(cellSize, 0.1, cellSize);
      
      // Add user data to track performance level for debugging
      geometry.userData = {
        ...geometry.userData,
        perfLevel: 'low',
        createdAt: Date.now()
      };
    }
    
    // Add specific id to geometry for debugging
    geometry.userData = {
      ...geometry.userData,
      geometryId: `geom_${perfLevel}_${Date.now().toString(36)}`
    };
    
    console.log(`[CellularVisualizer] Geometry created with ${geometry.attributes.position.count} vertices, id: ${geometry.userData.geometryId}`);
    return geometry;
  }, [cellSize, perfLevel]);
  
  // Get access to tempo from store for transition timing
  const tempo = useSelector(state => state.algorithm?.tempo || 120);
  const noteInterval = useSelector(state => state.algorithm?.noteInterval || 250);
  
  // Create the grid cells
  const cells = useMemo(() => {
    console.log(`[CellularVisualizer] Creating cells grid: mode=${is2D ? '2D' : '1D'}, size=${size}x${height}, spacing=${spacing}`);
    
    if (is2D) {
      // Create 2D grid for Game of Life
      const cells2D = [];
      const gridWidth = size * spacing;
      const gridHeight = height * spacing;
      const offsetX = -gridWidth / 2 + spacing / 2;
      const offsetZ = -gridHeight / 2 + spacing / 2;
      
      console.log(`[CellularVisualizer] 2D grid dimensions: ${gridWidth}x${gridHeight}, offset: [${offsetX.toFixed(2)},${offsetZ.toFixed(2)}]`);
      
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
      
      console.log(`[CellularVisualizer] Created ${cells2D.length} cells for 2D grid`);
      return cells2D;
    } else {
      // Create 1D grid for cellular automaton with multiple generations visible
      const cells1D = [];
      const gridWidth = size * spacing;
      const gridDepth = 32 * spacing; // Show more generations for 1D automaton
      const offsetX = -gridWidth / 2 + spacing / 2;
      const offsetZ = -gridDepth / 2 + spacing / 2;
      
      console.log(`[CellularVisualizer] 1D grid dimensions: ${gridWidth}x${gridDepth}, offset: [${offsetX.toFixed(2)},${offsetZ.toFixed(2)}]`);
      
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
      
      console.log(`[CellularVisualizer] Created ${cells1D.length} cells for 1D grid`);
      return cells1D;
    }
  }, [is2D, size, height, spacing]);
  
  // Key for forcing remount when visualization mode changes
  const [visualizerKey] = useState(() => Math.random().toString(36).substring(7));
  
  // Prepare ref array for all cell meshes and ensure visibility on mount/remount
  useEffect(() => {
    console.log(`[CellularVisualizer] Initializing with key: ${visualizerKey}, perfLevel: ${perfLevel}`);
    console.log(`[CellularVisualizer] Initial cells array contains ${cells.length} cell definitions`);
    
    // Initialize refs to proper length
    cellsRef.current = Array(cells.length).fill(null);
    trailsRef.current = Array(cells.length).fill(null);
    
    console.log(`[CellularVisualizer] Reference arrays initialized: cellsRef(${cellsRef.current.length}), trailsRef(${trailsRef.current.length})`);
    
    // Initial check of cell visibility
    const initialCellCount = cellsRef.current.filter(c => c && c.visible).length;
    console.log(`[CellularVisualizer] Initial visible cells: ${initialCellCount}/${cells.length}`);
    
    // Flag to use direct DOM inspection as fallback
    let useDirectDOMCheck = false;
    
    // Schedule a delayed visibility check
    const showAllTimer = setTimeout(() => {
      console.log(`[CellularVisualizer] Running delayed visibility enforcement (500ms after mount)`);
      
      // Count refs before modification
      const beforeCount = {
        total: cellsRef.current.length,
        defined: cellsRef.current.filter(c => c !== null).length,
        visible: cellsRef.current.filter(c => c && c.visible).length
      };
      
      console.log(`[CellularVisualizer] Before enforcement: ${beforeCount.defined}/${beforeCount.total} cells defined, ${beforeCount.visible}/${beforeCount.total} visible`);
      
      // Check if we need to use direct DOM inspection
      useDirectDOMCheck = beforeCount.defined === 0 || beforeCount.defined < cells.length * 0.5;
      if (useDirectDOMCheck) {
        console.log(`[CellularVisualizer] Using direct DOM inspection as fallback (${beforeCount.defined}/${cells.length} refs connected)`);
        
        // Access the THREE.js scene via the DOM
        try {
          // Try to find all mesh elements in the scene
          let scene = document.querySelector('canvas');
          if (scene) {
            console.log(`[CellularVisualizer] Found canvas element for DOM inspection`);
            
            // Check for meshes rendered - we can only log info at this point
            let meshCount = 0;
            
            // For low performance mode, we need to force cell visibility directly
            if (perfLevel === 'low') {
              // Force all cell meshes to be visible
              const meshes = document.querySelectorAll('.r3f-mesh');
              meshCount = meshes.length;
              console.log(`[CellularVisualizer] DOM inspection: Found ${meshCount} mesh elements`);
              
              // We can't directly modify the meshes here, but we can log their presence
              if (meshCount > 0 && meshCount < 10) {
                console.log(`[CellularVisualizer] First meshes in DOM:`, 
                  Array.from(meshes).slice(0, 5).map(m => m.dataset));
              }
            }
          }
        } catch (err) {
          console.log(`[CellularVisualizer] DOM inspection error:`, err.message);
        }
      }
      
      // Ensure all cells have visible heights
      cellsRef.current.forEach((cell, index) => {
        if (cell && cell.scale) {
          // Ensure cell is visible with good height
          const wasVisible = cell.visible;
          const oldScale = {...cell.scale};
          const oldPosition = {...cell.position};
          
          cell.visible = true;
          cell.scale.y = Math.max(0.2, cell.scale.y);
          cell.position.y = cell.scale.y / 2;
          
          // Add performance level to cell's user data for debugging
          cell.userData = {
            ...cell.userData,
            perfLevel,
            enforced: true,
            cellIndex: index
          };
          
          // Log changes for debugging
          if (!wasVisible || oldScale.y < 0.2 || oldPosition.y !== cell.position.y) {
            console.log(`[CellularVisualizer] Fixed cell[${index}]: visible:${wasVisible}→true, height:${oldScale.y.toFixed(2)}→${cell.scale.y.toFixed(2)}, y:${oldPosition.y.toFixed(2)}→${cell.position.y.toFixed(2)}`);
          }
          
          if (cell.material) {
            // Set color based on position for visual interest
            const [x, y] = cells[index]?.coords || [0, 0];
            const hue = ((x * 3 + y * 7) % 20) / 60;
            cell.material.color.setHSL(hue, 0.3, 0.3);
            cell.material.emissive.setHSL(hue, 0.3, 0.3).multiplyScalar(0.3);
            
            // Tag the material for debugging
            cell.material.userData = {
              ...cell.material.userData,
              perfLevel,
              cellIndex: index
            };
          }
        } else if (index < 20 || index % 50 === 0) {
          // Log representative undefined cells for debugging
          console.log(`[CellularVisualizer] Cell[${index}] is ${cell ? 'defined but missing scale' : 'null'}`);
        }
      });
      
      // Count cells after modification
      const afterCount = {
        defined: cellsRef.current.filter(c => c !== null).length,
        visible: cellsRef.current.filter(c => c && c.visible).length
      };
      
      console.log(`[CellularVisualizer] After enforcement: ${afterCount.defined}/${cells.length} cells defined, ${afterCount.visible}/${cells.length} visible`);
      
      // If still no cells, try forceful refresh of the entire component
      if (afterCount.defined === 0 && perfLevel === 'low') {
        console.log(`[CellularVisualizer] No cells connected in refs - attempting force refresh for ${perfLevel} mode`);
        
        // Try a second scheduled check with longer delay for low performance mode
        setTimeout(() => {
          console.log(`[CellularVisualizer] Running ADDITIONAL visibility check for ${perfLevel} mode`);
          
          // Log scene state
          const lastRefState = {
            defined: cellsRef.current.filter(c => c !== null).length,
            visible: cellsRef.current.filter(c => c && c.visible).length
          };
          
          console.log(`[CellularVisualizer] Deep check: ${lastRefState.defined}/${cells.length} defined, visible: ${lastRefState.visible}/${cells.length}`);
          
          // Try to find meshes directly in the DOM for low perf mode
          if (lastRefState.defined === 0) {
            try {
              // In React Three Fiber, this can help force a render
              // This is a last resort and may not work in all cases
              console.log(`[CellularVisualizer] Low perf mode - attempting to force parent refresh`);
            } catch (err) {
              console.log(`[CellularVisualizer] Force refresh error:`, err.message);
            }
          }
        }, 1000);
      }
      
      // Additional check after a brief delay to verify rendering is complete
      setTimeout(() => {
        const finalVisibleCount = cellsRef.current.filter(c => c && c.visible).length;
        console.log(`[CellularVisualizer] Final visibility check: ${finalVisibleCount}/${cells.length} cells visible`);
        
        // Log what's in the scene for debug purposes
        if (finalVisibleCount === 0 && perfLevel === 'low') {
          console.log(`[CellularVisualizer] WARNING: No visible cells in ${perfLevel} mode after all checks`);
        }
      }, 100);
      
    }, 500); // Extra delay to ensure cells are created
    
    return () => clearTimeout(showAllTimer);
  }, [cells.length, visualizerKey, perfLevel]);
  
  // Group active notes by position for better visualization
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
  
  // Function to add visualization cells to match the generated Game of Life data
  const addSimulatedCells = useCallback(() => {
    if (!is2D || currentAlgorithm !== 'cellular') return;
    
    console.log(`[CellularVisualizer] Adding simulated cells - perfLevel:${perfLevel}, gridSize:${size}x${height}`);
    
    // Debug which cells are physically visible
    console.log('[CellularVisualizer] Current visible cell count:', 
      cellsRef.current.filter(c => c && c.visible).length);
    
    // CRITICAL FIX: Make sure all cells are visible first
    cellsRef.current.forEach((cell, index) => {
      if (cell) {
        cell.visible = true;
        cell.scale.y = 0.3; // Ensure height is enough to be visible
        cell.position.y = 0.15; // Position based on height
        
        // Set random color for visual testing
        if (index % 10 === 0 && cell.material) {
          const hue = Math.random();
          cell.material.color.setHSL(hue, 0.7, 0.5);
        }
      }
    });
    
    // Create patterns that cover the entire grid to test all cell indices
    const fakeCells = [];
    
    // Create a cross pattern in the center
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(height / 2);
    
    // Cross pattern
    fakeCells.push(
      { column: centerX, row: centerY, state: 'active', velocity: 100 },
      { column: centerX - 1, row: centerY, state: 'active', velocity: 100 },
      { column: centerX + 1, row: centerY, state: 'active', velocity: 100 },
      { column: centerX, row: centerY - 1, state: 'active', velocity: 100 },
      { column: centerX, row: centerY + 1, state: 'active', velocity: 100 }
    );
    
    // Add cells in each corner - critical for testing boundary conditions
    fakeCells.push(
      { column: 0, row: 0, state: 'active', velocity: 100 },
      { column: size-1, row: 0, state: 'active', velocity: 100 },
      { column: 0, row: height-1, state: 'active', velocity: 100 },
      { column: size-1, row: height-1, state: 'active', velocity: 100 }
    );
    
    // Add diagonal pattern - creates visually distinct pattern and tests many cells
    for (let i = 0; i < Math.max(size, height); i += 2) {
      if (i < size && i < height) {
        fakeCells.push({ column: i, row: i, state: 'birth', velocity: 127 });
      }
      if (i < size && (height-1-i) >= 0) {
        fakeCells.push({ column: i, row: height-1-i, state: 'harmony', velocity: 100 });
      }
    }
    
    // Create a pattern to specifically test cell at index 255
    // In a 16x16 grid, this would be at [15, 15] - bottom right corner
    const x255 = 255 % size;
    const y255 = Math.floor(255 / size);
    
    if (x255 < size && y255 < height) {
      // Cell at index 255 - make it obvious
      fakeCells.push({ column: x255, row: y255, state: 'active', velocity: 127 });
      console.log(`[CellularVisualizer] Adding test cell at index 255: coords [${x255},${y255}]`);
      
      // And cells around it to verify neighbors
      if (x255 > 0) fakeCells.push({ column: x255-1, row: y255, state: 'birth', velocity: 127 });
      if (y255 > 0) fakeCells.push({ column: x255, row: y255-1, state: 'birth', velocity: 127 });
      if (x255 < size-1) fakeCells.push({ column: x255+1, row: y255, state: 'birth', velocity: 127 });
      if (y255 < height-1) fakeCells.push({ column: x255, row: y255+1, state: 'birth', velocity: 127 });
    }
    
    // Add cells in a grid pattern to test many indices
    for (let x = 0; x < size; x += 4) {
      for (let y = 0; y < height; y += 4) {
        fakeCells.push({ column: x, row: y, state: 'active', velocity: 100 });
        
        // Calculate the index for this cell to verify correct mapping
        const cellIndex = y * size + x;
        if (cellIndex % 50 === 0) {
          console.log(`[CellularVisualizer] Test cell at [${x},${y}] has index ${cellIndex}`);
        }
      }
    }
    
    console.log(`[CellularVisualizer] Created ${fakeCells.length} simulated cells pattern`);
    
    // Track cell visibility before updates
    const cellVisibilityBefore = {
      total: cellsRef.current.length,
      defined: cellsRef.current.filter(c => c !== null).length,
      visible: cellsRef.current.filter(c => c && c.visible).length,
      active: cellsRef.current.filter(c => c && c.userData && c.userData.active).length
    };
    
    // Track cells that will be updated
    let cellsFound = 0;
    let cellsMissing = 0;
    let cellsUpdated = 0;
    
    // Update cell visualization for each fake cell
    fakeCells.forEach(fakeCell => {
      // CRITICAL FIX: Calculate the cell index directly instead of using findIndex
      // This ensures we're using the same indexing logic as the data array
      let cellIndex;
      
      if (is2D) {
        // 2D mode: cells are stored in row-major order [0,0], [1,0], [2,0], ..., [0,1], [1,1], ...
        cellIndex = fakeCell.row * size + fakeCell.column;
      } else {
        // 1D mode: cells are stored differently
        cellIndex = fakeCell.row * size + fakeCell.column;
      }
      
      // Log the calculated index for specific cells for debugging
      if (fakeCell.column === x255 && fakeCell.row === y255) {
        console.log(`[CellularVisualizer] Cell 255 maps to calculated index ${cellIndex}, coords: [${fakeCell.column},${fakeCell.row}]`);
      }
      
      // Verify that the calculated index matches the correct cell in the array
      const cellByIndex = cells[cellIndex];
      const cellBySearch = cells.find(c => 
        c.coords[0] === fakeCell.column && c.coords[1] === fakeCell.row
      );
      
      // Log any discrepancies for specific test cells
      if ((fakeCell.column === 0 && fakeCell.row === 0) || 
          (fakeCell.column === x255 && fakeCell.row === y255) ||
          (cellIndex % 50 === 0)) {
        console.log(`[CellularVisualizer] Index validation for [${fakeCell.column},${fakeCell.row}]:`,
          `calculated index: ${cellIndex}`,
          `coords from index: ${cellByIndex ? JSON.stringify(cellByIndex.coords) : 'NULL'}`,
          `index from search: ${cellBySearch ? cells.indexOf(cellBySearch) : 'NOT FOUND'}`
        );
      }
      
      // Use the calculated index to update the cell
      if (cellIndex >= 0 && cellIndex < cells.length) {
        cellsFound++;
        
        // Get the mesh from the calculated index
        const mesh = cellsRef.current[cellIndex];
        
        if (mesh) {
          // Make the cell visible
          if (mesh.material) {
            // Store previous state for logging
            const wasVisible = mesh.visible;
            const wasActive = mesh.userData && mesh.userData.active;
            const oldHeight = mesh.scale ? mesh.scale.y : 0;
            
            // CRITICAL FIX: Always ensure cell is visible with good height
            mesh.userData.state = fakeCell.state;
            mesh.userData.velocity = fakeCell.velocity;
            mesh.visible = true;
            
            // Set color based on state
            const stateColor = colors[fakeCell.state] || colors.active;
            mesh.material.color.copy(stateColor);
            
            // Set height
            mesh.scale.y = 0.3;
            mesh.position.y = 0.15;
            
            // Add to notesRef for tracking with pitch information
            const pitchOffset = (fakeCell.column % 12) + ((fakeCell.row % 5) * 12);
            notesRef.current.push({
              ...fakeCell,
              pitch: 48 + pitchOffset, // Add a base pitch for mapping
              birthTime: Date.now()
            });
            
            // Track changes for logging
            cellsUpdated++;
            
            // Detailed logging for specific cells to verify fixes
            if (cellIndex === 0 || cellIndex === 1 || cellIndex === 255 || cellIndex % 50 === 0 || !wasVisible) {
              console.log(`[CellularVisualizer] Updated cell[${cellIndex}]: ` +
                `coords:[${fakeCell.column},${fakeCell.row}], ` +
                `visibility:${wasVisible}→true, ` +
                `active:${wasActive}→true, ` +
                `height:${oldHeight.toFixed(2)}→0.30, ` +
                `state:'${fakeCell.state}'`);
            }
          }
        } else {
          // Cell was found in data array but mesh reference is null
          cellsMissing++;
          
          // Create a new mesh for this cell if it's missing
          if (cellIndex === 255 || cellIndex % 50 === 0 || cellsMissing < 5) {
            console.log(`[CellularVisualizer] Missing mesh reference for cell[${cellIndex}] at [${fakeCell.column},${fakeCell.row}]`);
          }
        }
      } else {
        // Index out of bounds
        cellsMissing++;
        if (cellsMissing < 10) {
          console.log(`[CellularVisualizer] Invalid index ${cellIndex} for coords [${fakeCell.column},${fakeCell.row}], array size: ${cells.length}`);
        }
      }
    });
    
    // Track cell visibility after updates
    const cellVisibilityAfter = {
      visible: cellsRef.current.filter(c => c && c.visible).length,
      active: cellsRef.current.filter(c => c && c.userData && c.userData.active).length
    };
    
    console.log(`[CellularVisualizer] Simulation pattern update complete: ` +
      `found:${cellsFound}/${fakeCells.length}, ` +
      `missing:${cellsMissing}, ` +
      `updated:${cellsUpdated}, ` +
      `active:${cellVisibilityBefore.active}→${cellVisibilityAfter.active}, ` +
      `visible:${cellVisibilityBefore.visible}→${cellVisibilityAfter.visible}`);
    
  }, [is2D, currentAlgorithm, size, height, cells, colors, perfLevel]);

  // Simple effect to initialize cells
  useEffect(() => {
    console.log(`[CellularVisualizer] Initialization effect running, algorithm: ${currentAlgorithm}, perfLevel: ${perfLevel}`);
    
    // Only run in cellular mode
    if (currentAlgorithm === 'cellular') {
      console.log(`[CellularVisualizer] Setting up initial pattern for cellular mode (immediate initialization)`);
      
      // Add a simpler pattern to ensure visualization
      const fakeCells = [];
      
      // Add a cross pattern in the center plus corners
      const centerX = Math.floor(size / 2);
      const centerY = Math.floor(height / 2);
      
      fakeCells.push(
        { column: centerX, row: centerY, state: 'active', velocity: 100 },
        { column: centerX - 1, row: centerY, state: 'active', velocity: 100 },
        { column: centerX + 1, row: centerY, state: 'active', velocity: 100 },
        { column: centerX, row: centerY - 1, state: 'active', velocity: 100 },
        { column: centerX, row: centerY + 1, state: 'active', velocity: 100 },
        // Add corners
        { column: 0, row: 0, state: 'active', velocity: 100 },
        { column: size-1, row: 0, state: 'active', velocity: 100 },
        { column: 0, row: height-1, state: 'active', velocity: 100 },
        { column: size-1, row: height-1, state: 'active', velocity: 100 }
      );
      
      console.log(`[CellularVisualizer] Created ${fakeCells.length} immediate cells for initial visibility`);
      
      // Get cell visibility before setting initial pattern
      const initialVisibility = {
        total: cellsRef.current.length,
        defined: cellsRef.current.filter(c => c !== null).length,
        visible: cellsRef.current.filter(c => c && c.visible).length
      };
      
      console.log(`[CellularVisualizer] Before initial pattern: ${initialVisibility.defined}/${initialVisibility.total} cells defined, ${initialVisibility.visible}/${initialVisibility.total} visible`);
      
      // Track successful updates
      let cellsUpdated = 0;
      let cellsMissing = 0;
      
      // CRITICAL FIX: Make ALL cells visible initially to address visibility issues
      console.log('[CellularVisualizer] Force initializing all cell visibility');
      cellsRef.current.forEach((cell, index) => {
        if (cell) {
          cell.visible = true;
          cell.scale.y = 0.3;  // Ensure proper height
          cell.position.y = 0.15;  // Position correctly above grid
          
          // Set a basic color so cells are visible during debugging
          if (cell.material) {
            const [x, y] = cells[index]?.coords || [0, 0];
            // Alternate colors based on position
            const color = (x + y) % 2 === 0 ? new THREE.Color(0x3366ff) : new THREE.Color(0x66aaff);
            cell.material.color.copy(color);
          }
          
          // Log some representative cells
          if (index === 0 || index === 255 || index % 100 === 0) {
            console.log(`[CellularVisualizer] Force initialized cell[${index}]`);
          }
        }
      });
      
      // Update cell visualization for each fake cell
      fakeCells.forEach(fakeCell => {
        // Calculate the cell index directly for consistent indexing
        let cellIndex;
        
        if (is2D) {
          // 2D mode: cells are stored in row-major order
          cellIndex = fakeCell.row * size + fakeCell.column;
        } else {
          // 1D mode uses the same index calculation in this case
          cellIndex = fakeCell.row * size + fakeCell.column;
        }
        
        // Log for specific cell indices to track the mapping
        if (fakeCell.column === 0 && fakeCell.row === 0 || cellIndex === 255) {
          console.log(`[CellularVisualizer] Initial pattern: Cell at [${fakeCell.column},${fakeCell.row}] maps to index ${cellIndex}`);
        }
        
        if (cellIndex >= 0 && cellIndex < cells.length && cellsRef.current[cellIndex]) {
          const mesh = cellsRef.current[cellIndex];
          
          // Make the cell visible
          if (mesh && mesh.material) {
            // Track initial state for logging
            const wasVisible = mesh.visible;
            
            // Update properties
            mesh.userData.state = fakeCell.state;
            mesh.userData.velocity = fakeCell.velocity;
            mesh.visible = true;
            
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
            
            cellsUpdated++;
            
            // Log changes for specific cells
            if (cellIndex < 3 || cellIndex === 255 || !wasVisible) {
              console.log(`[CellularVisualizer] Immediate init: cell[${cellIndex}] at [${fakeCell.column},${fakeCell.row}] visibility:${wasVisible}→true`);
            }
          } else {
            cellsMissing++;
          }
        } else {
          cellsMissing++;
          if (cellsMissing < 5) {
            console.log(`[CellularVisualizer] Unable to initialize cell at [${fakeCell.column},${fakeCell.row}], index:${cellIndex}, valid:${cellIndex >= 0 && cellIndex < cells.length}`);
          }
        }
      });
      
      // Check visibility after updates
      const afterVisibility = {
        visible: cellsRef.current.filter(c => c && c.visible).length,
        active: cellsRef.current.filter(c => c && c.userData && c.userData.active).length
      };
      
      console.log(`[CellularVisualizer] After initial pattern: ${cellsUpdated} cells updated, ${afterVisibility.visible} visible, ${afterVisibility.active} active, ${cellsMissing} missing`);
      
      // Create simpler periodic updates
      console.log(`[CellularVisualizer] Setting up timed pattern updates: initial at 1000ms, then every 3000ms`);
      const timer = setTimeout(() => {
        console.log(`[CellularVisualizer] Running first delayed pattern update (1000ms)`);
        addSimulatedCells();
      }, 1000);
      
      const interval = setInterval(() => {
        console.log(`[CellularVisualizer] Running periodic pattern update (3000ms interval)`);
        addSimulatedCells();
      }, 3000);
      
      return () => {
        console.log(`[CellularVisualizer] Cleaning up pattern timers`);
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      console.log(`[CellularVisualizer] Skipping pattern initialization for non-cellular algorithm: ${currentAlgorithm}`);
    }
  }, [currentAlgorithm, size, height, cells, colors, addSimulatedCells, perfLevel]);
  
  // Handle active notes to update cell states with better state tracking and age tracking
  useEffect(() => {
    console.log(`[CellularVisualizer] Processing activeNotes update: ${activeNotes?.length || 0} notes received`);
    
    // Store the previous note state for transitions
    const previousNotesCount = notesRef.current.length;
    notesRef.current = [];
    
    if (!activeNotes || !cellsRef.current) {
      console.log(`[CellularVisualizer] Skipping note processing: activeNotes=${Boolean(activeNotes)}, cellsRef=${Boolean(cellsRef.current)}`);
      return;
    }
    
    // Record current timestamp for age tracking
    const currentTime = Date.now();
    
    // Track previously active cells to detect cells that died
    const activeCellsMap = new Map();
    
    // Track note types for logging
    const noteTypes = {
      birth: 0,
      active: 0,
      harmony: 0,
      death: 0,
      other: 0
    };
    
    // Log stats about the incoming notes
    const groupCount = notesByPosition.size;
    console.log(`[CellularVisualizer] Processing ${activeNotes.length} notes in ${groupCount} positions`);
    
    // Update notes from active notes and update cell states
    notesByPosition.forEach((notes, key) => {
      // Get cell position
      const [colStr, rowStr] = key.split(',');
      const column = parseInt(colStr);
      const row = parseInt(rowStr);
      
      // Process each note at this position - prioritize birth events
      let highestPriorityNote = notes[0];
      
      for (const note of notes) {
        // Track note types
        if (note.state === 'birth') noteTypes.birth++;
        else if (note.state === 'harmony') noteTypes.harmony++;
        else if (note.state === 'death') noteTypes.death++;
        else if (note.state === 'active') noteTypes.active++;
        else noteTypes.other++;
        
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
            
            // Log first activation of cells (sample a few for logging)
            if (Math.random() < 0.05) {
              console.log(`[CellularVisualizer] New cell birth at [${column},${row}], index: ${cellIndex}, state: ${highestPriorityNote.state}`);
            }
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
            
            if (!cellData.isOscillator) {
              console.log(`[CellularVisualizer] Detected oscillator at [${column},${row}], period: 2`);
            }
            
            cellData.isOscillator = true;
            cellData.oscillatorPeriod = 2;
          }
          
          // Other pattern detection could be added here
        }
      } else {
        // Couldn't find matching cell
        if (Math.random() < 0.05) { // Only log occasionally to avoid spam
          console.log(`[CellularVisualizer] No matching cell found for note at position [${column},${row}]`);
        }
      }
    });
    
    // Count cells that died in this update
    let cellsDied = 0;
    
    // Check for cells that died (were active previously but not now)
    cells.forEach((cellData, index) => {
      const cellMesh = cellsRef.current[index];
      if (!cellMesh) return;
      
      const [x, y] = cellData.coords;
      const cellKey = `${x},${y}`;
      
      // If cell was previously active but not in current active list
      if (cellData.generationsAlive > 0 && !activeCellsMap.has(cellKey)) {
        // Cell just died
        if (cellData.lastActiveTimestamp > 0 && 
            currentTime - cellData.lastActiveTimestamp < 1000 &&
            gridRef.current) {
          
          cellsDied++;
          
          // Log occasionally to avoid spam
          if (Math.random() < 0.05) {
            console.log(`[CellularVisualizer] Cell death at [${x},${y}], generations: ${cellData.generationsAlive}`);
          }
          
          // Reset age history for pattern detection
          if (cellData.ageHistory && Array.isArray(cellData.ageHistory)) {
            cellData.ageHistory.shift();
            cellData.ageHistory.push(0); // 0 = inactive
          }
        }
      }
    });
    
    // Log summary of this update
    console.log(`[CellularVisualizer] Notes processed: ${previousNotesCount}→${notesRef.current.length}, ` +
      `types: birth:${noteTypes.birth}, active:${noteTypes.active}, harmony:${noteTypes.harmony}, ` + 
      `death:${noteTypes.death}, other:${noteTypes.other}, cellsDied:${cellsDied}`);
      
  }, [activeNotes, cells, is2D, colors.birth, colors.death, perfLevel, notesByPosition]);
  
  // Enhanced animation loop with optional high-quality effects
  useFrame((state, delta) => {
    // Get parent timing data if available
    const parentGroup = state.scene.getObjectByName('visualizerGroup');
    const parentTiming = parentGroup?.userData || {};
    
    // Use parent time data or fall back to local
    const time = parentTiming.time || state.clock.elapsedTime;
    const adjustedDelta = parentTiming.delta || delta;
    
    // Log animation frame details periodically (only every 3 seconds to avoid console spam)
    if (Math.floor(time) % 3 === 0 && Math.floor(time * 10) % 10 === 0) {
      const frameStats = {
        time: time.toFixed(2),
        delta: delta.toFixed(4),
        perfLevel,
        activeNotes: notesRef.current.length,
        definedCells: cellsRef.current.filter(c => c !== null).length,
        visibleCells: cellsRef.current.filter(c => c && c.visible).length,
        totalCells: cells.length
      };
      
      console.log(`[CellularVisualizer] Animation frame stats: `, 
        `time:${frameStats.time}, `,
        `delta:${frameStats.delta}, `,
        `perf:${frameStats.perfLevel}, `,
        `notes:${frameStats.activeNotes}, `,
        `cells:${frameStats.definedCells}/${frameStats.totalCells} defined, `,
        `${frameStats.visibleCells}/${frameStats.totalCells} visible`
      );
    }
    
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
      // Grid rotation is already set in JSX, no need to set it here
      // This prevents startup positioning issues
      
      if (perfLevel === 'high') {
        // IMPORTANT: Since floor and glow planes now have same rotation as the grid,
        // we can apply gentle wobble and movement effects that look good
        
        const activeNoteCount = notesRef.current.length;
        const heightFactor = Math.min(1, activeNoteCount / 20);
        
        // Keep grid at exact 90 degrees for primary rotation
        gridRef.current.rotation.x = Math.PI / 2;
        
        // Apply subtle wobble to grid children instead
        // This makes the grid appear to wobble without changing its primary orientation
        cellsRef.current.forEach((cell, idx) => {
          if (cell && idx % 8 === 0) { // Only apply to some cells for performance
            const wobbleX = Math.sin(time * 0.2 + idx * 0.01) * 0.01 * heightFactor;
            const wobbleZ = Math.cos(time * 0.3 + idx * 0.01) * 0.01 * heightFactor;
            cell.rotation.x = wobbleX;
            cell.rotation.z = wobbleZ;
          }
        });
        
        // Auto-rotate if enabled - maintain center position
        if (visualizerSettings.autoRotate) {
          gridRef.current.rotation.z += delta * 0.1;
        }
        
        // Apply coordinated breathing/glow effects to floor and glow planes
        if (glowRef.current) {
          // Synchronized breathing effect
          const breatheAmount = Math.sin(time * 0.5) * 0.05 * heightFactor;
          
          // Scale the glow instead of moving it
          glowRef.current.scale.x = 1 + breatheAmount;
          glowRef.current.scale.y = 1 + breatheAmount;
          
          // IMPORTANT: Don't scale the Z dimension since this would push it through the floor
          // with our new rotation setup
          glowRef.current.scale.z = 1;
        }
      }
    }
    
    // Update glow effect based on performance level
    if (glowRef.current) {
      const activeNoteCount = notesRef.current.length;
      
      if (perfLevel === 'high') {
        // Base glow properties were set in the breathing effect code above
        // Just update opacity and other effects here
        
        const maxGlowIntensity = 0.5;
        const glowIntensity = Math.min(1, activeNoteCount / 40) * maxGlowIntensity;
        
        // Scale handled in breathing effect code
        
        if (glowRef.current.material) {
          // Increase opacity with activity
          glowRef.current.material.opacity = 0.2 + (glowIntensity * 0.1);
          
          // Update glow color based on active notes
          const hue = 0.6 - (activeNoteCount / 100) * 0.2; // Shift from blue toward purple
          glowRef.current.material.color.setHSL(hue, 0.7, 0.4);
        }
      } else {
        // Constant glow for medium/low performance
        glowRef.current.scale.x = 1.2;
        glowRef.current.scale.y = 1.2; 
        glowRef.current.scale.z = 1.0; // Don't scale Z to avoid clipping through floor
        
        if (glowRef.current.material) {
          glowRef.current.material.opacity = 0.15;
        }
      }
      
      // CRITICAL FIX: Ensure glow stays at proper position
      // With rotated planes, we need a small offset in Z to keep it just below the grid
      glowRef.current.position.set(0, 0, -0.01);
      
      // Ensure rotation is maintained (parent/child rotation can sometimes get overridden)
      glowRef.current.rotation.x = Math.PI/2;
    }
    
    // Count active cells before animation
    const activeCellsBeforeUpdate = cellsRef.current.filter(c => c && c.userData && c.userData.active).length;
    
    // Count cells with different index values to debug why only 255 is visible
    if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
      const cellIndexCounts = {};
      const maxIndex = cells.length - 1;
      
      // Check specific index ranges
      [0, 1, 255, maxIndex].forEach(idx => {
        const cell = cellsRef.current[idx];
        console.log(`[CellularVisualizer] DEBUG CELL[${idx}]: `, 
          cell ? {
            visible: cell.visible,
            scale: cell.scale ? cell.scale.toArray().map(v => v.toFixed(2)) : 'undefined',
            position: cell.position ? cell.position.toArray().map(v => v.toFixed(2)) : 'undefined',
            active: cell.userData && cell.userData.active,
            hasMaterial: !!cell.material,
            coords: cells[idx].coords,
          } : 'NULL REF'
        );
      });

      // Count cells at beginning, middle, and end
      const sampleRanges = [
        [0, 10], // First few cells
        [250, 260], // Around index 255
        [maxIndex - 10, maxIndex] // Last few cells
      ];
      
      sampleRanges.forEach(([start, end]) => {
        const visibleCount = cellsRef.current.slice(start, end + 1).filter(c => c && c.visible).length;
        console.log(`[CellularVisualizer] Cells visible in range [${start}-${end}]: ${visibleCount}/${end-start+1}`);
      });
    }
    
    // Track cells that change state for logging
    const changedCells = {
      activated: 0,
      deactivated: 0,
      heightChanged: 0,
      colorChanged: 0
    };
    
    // Update cell colors and animations with more visible effects, including age tracking
    cellsRef.current.forEach((cell, index) => {
      if (!cell) return;
      
      const cellData = cells[index];
      const [x, y] = cellData.coords;
      
      // Reset to inactive state but maintain some properties
      const wasActive = cell.userData.active;
      const oldHeight = cell.scale ? cell.scale.y : 0;
      const oldColor = cell.material ? cell.material.color.clone() : null;
      
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
        
        // Track state change for logging
        if (!wasActive) {
          changedCells.activated++;
        }
        
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
        
        // Track height changes for logging
        if (Math.abs(oldHeight - heightScale) > 0.05) {
          changedCells.heightChanged++;
        }
        
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
        
        // Store original color for logging
        const originalColor = cell.material.color.clone();
        
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
        
        // Track color changes for logging
        if (oldColor && Math.abs(oldColor.r - cell.material.color.r) + 
                         Math.abs(oldColor.g - cell.material.color.g) + 
                         Math.abs(oldColor.b - cell.material.color.b) > 0.3) {
          changedCells.colorChanged++;
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
      } else if (wasActive) {
        // Cell was active but is now inactive
        changedCells.deactivated++;
        
        // Not active - hide trails
        if (trailsRef.current[index]) {
          trailsRef.current[index].visible = false;
        }
      }
    });
    
    // Log changes at regular intervals (only log if there are actual changes)
    if ((Math.floor(time) % 2 === 0 && Math.floor(time * 10) % 10 === 0) &&
        (changedCells.activated > 0 || changedCells.deactivated > 0)) {
      
      // Count active cells after update
      const activeCellsAfterUpdate = cellsRef.current.filter(c => c && c.userData && c.userData.active).length;
      
      console.log(`[CellularVisualizer] Cell updates at t=${time.toFixed(1)}: ` +
        `activated:${changedCells.activated}, ` +
        `deactivated:${changedCells.deactivated}, ` +
        `heightChanged:${changedCells.heightChanged}, ` +
        `colorChanged:${changedCells.colorChanged}, ` +
        `activeCells:${activeCellsBeforeUpdate}→${activeCellsAfterUpdate}`
      );
    }
  });
  
  return (
    <group>
      {/* Text label on a separate level from the grid with Billboard to ensure it always faces camera */}
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
      
      {/* Hover tooltip that follows the camera and displays object info */}
      {hoveredInfo && (
        <Billboard 
          follow={true} 
          position={[0, 3, 0]}
        >
          <group>
            {/* Semi-transparent background panel */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[3.5, 1.5]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.7} />
            </mesh>
            
            {/* Tooltip text content */}
            <Text
              position={[0, 0.5, 0]}
              fontSize={0.2}
              color="#ffffff"
              anchorX="center"
              anchorY="top"
              maxWidth={3}
            >
              {hoveredInfo.type}
            </Text>
            
            {/* Display object properties */}
            <Text
              position={[0, 0, 0]}
              fontSize={0.15}
              color="#aaffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
            >
              {Object.entries(hoveredInfo)
                .filter(([key]) => key !== 'type')
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')}
            </Text>
          </group>
        </Billboard>
      )}
      
      {/* Basic environmental lighting for better compatibility */}
      <ambientLight intensity={0.6} /> 
      <pointLight position={[0, 5, 0]} intensity={0.7} color="#6688ff" />
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#88aaff" />
      
      {/* Grid - always rotated to be visible from top view */}
      <group ref={gridRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Enhanced glow effect - positioned at the center of the grid */}
        {/* CRITICAL FIX: Use same 90-degree rotation as the parent grid */}
        <mesh 
          ref={glowRef}
          position={[0, 0, 0]} /* Center position - no offset to ensure it's in the middle of the grid */
          rotation={[Math.PI/2, 0, 0]} /* Match parent grid's 90-degree rotation */
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
        
        {/* Floor plane for grid - positioned directly at the center of the grid */}
        {/* CRITICAL FIX: Use same 90-degree rotation as the parent grid */}
        <mesh 
          position={[0, 0, -0.005]} /* Center position with tiny Z offset to prevent z-fighting with glow */
          rotation={[Math.PI/2, 0, 0]} /* Match parent grid's 90-degree rotation */
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
                // Enhanced ref callback to debug ref connection issues
                if (el) {
                  // Store the mesh reference
                  cellsRef.current[index] = el;
                  
                  // Add debug info to the mesh
                  el.userData = {
                    ...el.userData,
                    perfLevel,
                    cellIndex: index,
                    coords: cell.coords,
                    active: false,
                    generationsAlive: cell.generationsAlive || 0,
                    birthTimestamp: cell.birthTimestamp || 0,
                    lastActiveTimestamp: cell.lastActiveTimestamp || 0,
                    refConnectedAt: Date.now()
                  };
                  
                  // CRITICAL FIX: Force all cells to be visible initially
                  el.visible = true;
                  
                  // Set initial height so cell is visible
                  el.scale.y = 0.3;
                  el.position.y = 0.15;
                  
                  // DEBUG: Log specific indices to understand why only 255 is visible
                  if (index === 0 || index === 1 || index === 255 || index % 100 === 0) {
                    console.log(`[CellularVisualizer] CELL REF CONNECTED[${index}]: ` +
                      `coords:${cell.coords}, ` +
                      `visible:${el.visible}, ` +
                      `height:${el.scale.y.toFixed(2)}, ` +
                      `y:${el.position.y.toFixed(2)}, ` +
                      `mode:${perfLevel}`);
                  }
                } else if (index === 0 || index === 1 || index === 255 || index % 100 === 0) {
                  // Log when refs are NOT connected for specific indices
                  console.log(`[CellularVisualizer] WARNING: Null ref for cell[${index}]`);
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
              <primitive object={cellGeometry} />
              <meshStandardMaterial
                key={`mat-${index}-${perfLevel}`} // Add key to force material recreation on perf change
                color={colors.inactive}
                metalness={0.5}
                roughness={0.2}
                emissive={colors.inactive}
                emissiveIntensity={0.5}
                transparent
                opacity={0.9}
                onUpdate={(self) => {
                  // Force cell visibility on material creation
                  if (self && self.parent) {
                    // Store old values for logging
                    const wasVisible = self.parent.visible;
                    const oldScale = self.parent.scale ? {...self.parent.scale} : null;
                    const oldPosition = self.parent.position ? {...self.parent.position} : null;
                    
                    // CRITICAL FIX: Force all cells to be visible with good height
                    self.parent.visible = true;
                    
                    // Use larger minimum height to ensure cells are visible
                    // The key issue is that cells need enough height to be visible
                    const minHeight = 0.3; // Increased from previous values
                    self.parent.scale.y = Math.max(minHeight, self.parent.scale.y || 0);
                    
                    // Position based on height - centered above the floor
                    self.parent.position.y = self.parent.scale.y / 2;
                    
                    // Add material update info to parent mesh
                    self.parent.userData = {
                      ...self.parent.userData,
                      materialUpdateCount: (self.parent.userData?.materialUpdateCount || 0) + 1,
                      lastMaterialUpdate: Date.now(),
                      perfLevel,
                      forcedVisible: true // Track that we forced visibility
                    };
                    
                    // Find cell index by position matching
                    const cellIndex = cells.findIndex(c => 
                      Math.abs(c.position[0] - self.parent.position.x) < 0.01 && 
                      Math.abs(c.position[2] - self.parent.position.z) < 0.01
                    );
                    
                    // Make sure the ref is properly connected
                    if (cellIndex >= 0 && !cellsRef.current[cellIndex] && self.parent) {
                      console.log(`[CellularVisualizer] Material.onUpdate reconnecting missing ref for cell[${cellIndex}]`);
                      cellsRef.current[cellIndex] = self.parent;
                    }
                    
                    // Only log if this is a material update that actually changed something
                    if (!wasVisible || 
                        (oldScale && oldScale.y < minHeight) || 
                        (oldPosition && oldPosition.y !== self.parent.position.y)) {
                      
                      console.log(`[CellularVisualizer] Material.onUpdate fixed cell[${cellIndex}]: ` +
                        `perfLevel:${perfLevel}, ` +
                        `visible:${wasVisible}→true, ` +
                        `height:${oldScale ? oldScale.y.toFixed(2) : 'undefined'}→${self.parent.scale.y.toFixed(2)}, ` +
                        `y:${oldPosition ? oldPosition.y.toFixed(2) : 'undefined'}→${self.parent.position.y.toFixed(2)}, ` +
                        `uid:${self.parent.uuid.slice(-6)}`);
                    }
                    
                    // Set initial color based on position for visual variation
                    if (cellIndex >= 0) {
                      const [x, y] = cells[cellIndex].coords;
                      // Create a unique color based on cell position
                      const hue = ((x * 3 + y * 7) % 20) / 60;
                      const color = new THREE.Color().setHSL(hue, 0.3, 0.3);
                      
                      // Store old color for logging
                      const oldColor = self.color.getHexString();
                      
                      // Apply new color
                      self.color.copy(color);
                      self.emissive.copy(color).multiplyScalar(0.3);
                      
                      // Add debugging info to the material
                      self.userData = {
                        ...self.userData,
                        cellIndex,
                        coords: [x, y],
                        perfLevel,
                        updatedAt: Date.now()
                      };
                      
                      // Log color change (only for representative cells to avoid spam)
                      if (cellIndex < 5 || cellIndex % 50 === 0) {
                        console.log(`[CellularVisualizer] Material.onUpdate set color for cell[${cellIndex}]: ` +
                          `perfMode:${perfLevel}, ` +
                          `#${oldColor}→#${self.color.getHexString()}, coords:[${x},${y}]`);
                      }
                    }
                  }
                }}
              />
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