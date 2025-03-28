/**
 * Cellular Automata Music Generator
 * Uses both one-dimensional cellular automata (like Rule 30) and Conway's Game of Life (2D)
 * to generate musical patterns with various complexity levels
 */
class CellularGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      rule: 30,                 // Cellular automaton rule (0-255) for 1D mode
      type: '1D',               // Type of cellular automaton: '1D' or 'gameOfLife'
      initialCondition: 'center', // Initial state: center, random, custom, glider, etc.
      width: 16,                // Width of the automaton grid
      height: 16,               // Height for 2D grid (Game of Life)
      threshold: 0.5,           // Threshold for converting cells to notes
      iterations: 32,           // Number of iterations to evolve the automaton
      density: 0.3,             // Initial cell density for random patterns
      velocityMap: 'linear',    // How to map cell position to velocity: linear, distance, random
      performanceMode: 'auto',  // Performance level: low, medium, high, auto (adapts based on grid size)
      buchlaMode: false,        // Buchla 252e-inspired sequencing mode for more musical output
      preferredPatterns: []     // Patterns to prioritize when in Buchla mode
    };
    
    // Different scales to map cells to notes
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 2, 4, 7, 9],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      // Additional exotic scales
      wholetone: [0, 2, 4, 6, 8, 10],
      diminished: [0, 2, 3, 5, 6, 8, 9, 11],
      harmonicminor: [0, 2, 3, 5, 7, 8, 11],
      dorian: [0, 2, 3, 5, 7, 9, 10]
    };
    
    // Base notes for different scale ranges starting at C3 (48)
    this.baseNotes = {
      high: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84], // C4-C6 pentatonic + harmonics
      mid: [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72], // C3-C5 pentatonic + harmonics
      low: [36, 38, 40, 43, 45, 48, 50, 52, 55, 57, 60]  // C2-C4 pentatonic + harmonics
    };
    
    // Buchla 252e-inspired rhythm & accent patterns
    this.buchlaPatterns = {
      // Classic clock division patterns from Buchla 252e
      pulses: [2, 3, 4, 5, 7, 8, 16],  // Number of pulses
      accents: [1, 2, 3],              // Accent every nth pulse
      // Stage offset patterns
      offsets: [0, 1, 2, 3]            // Stage offset amounts
    };
    
    // Use mid-range notes by default
    this.notes = this.baseNotes.mid;
    
    // Store key state information for visualization and generation
    this.grid = [];                       // Current 2D grid
    this.generations = [];                // History of grid states
    this.cellChanges = [];                // Tracks cell changes (birth/death) for visualization
    this.currentGeneration = 0;           // Track current generation number
    this.activeCount = 0;                 // Count of active cells (for performance monitoring)
    this.stablePatternDetected = false;   // Flag to detect if pattern has stabilized
    
    // Track cell states for visualization and pattern detection
    this.cellState = [];                  // Tracks state history for each cell
    this.oscillatorPatterns = [];         // Tracks detected oscillator patterns
    this.stableCells = new Set();         // Tracks cells that are part of stable patterns
    this.detectedMetaPatterns = [];       // Tracks emergent meta-patterns for Buchla mode
    
    // Performance optimizations for larger grids
    this.activeQueueFront = [];           // Cells to check in the front generation
    this.activeQueueBack = [];            // Cells to check in the next generation
    
    // Set optimal parameters based on grid size
    this.setPerformanceParameters();
    
    // Last error timestamp to prevent error spam
    this.lastErrorTime = 0;
  }
  
  /**
   * Set optimal parameters based on grid size to prevent performance issues
   */
  setPerformanceParameters() {
    const { width, height, performanceMode } = this.parameters;
    const gridSize = width * height;
    
    // Determine performance level based on grid size
    let perfLevel = performanceMode;
    if (performanceMode === 'auto') {
      if (gridSize > 1000) {
        perfLevel = 'low';
      } else if (gridSize > 400) {
        perfLevel = 'medium';
      } else {
        perfLevel = 'high';
      }
    }
    
    this.performanceLevel = perfLevel;
    
    // Apply constraints based on performance level
    if (perfLevel === 'low') {
      // For low performance, limit grid size and history
      this.maxGenerationsToStore = 5;
      this.maxCellChangesToTrack = 100;
      this.detectPatterns = false;
    } else if (perfLevel === 'medium') {
      // For medium performance
      this.maxGenerationsToStore = 10;
      this.maxCellChangesToTrack = 500;
      this.detectPatterns = true;
    } else {
      // For high performance, keep detailed history
      this.maxGenerationsToStore = 20;
      this.maxCellChangesToTrack = 1000;
      this.detectPatterns = true;
    }
    
    console.log(`Cellular automaton using ${perfLevel} performance level for grid size ${width}x${height}`);
  }
  
  /**
   * Generate a sequence of notes based on cellular automata evolution
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    const { 
      type, rule, width, height, initialCondition, threshold, iterations, 
      density, velocityMap, harmonies, emphasizeBirths, noteRange, scale 
    } = this.parameters;
    
    // Reset state tracking for a new generation
    this.cellChanges = [];
    this.currentGeneration = 0;
    
    // Set the note range based on parameter
    if (noteRange && this.baseNotes[noteRange]) {
      this.notes = this.baseNotes[noteRange];
    } else {
      this.notes = this.baseNotes.mid; // Default to mid range
    }
    
    // Set the scale if specified
    if (scale && this.scales[scale]) {
      this.currentScale = this.scales[scale];
    } else {
      this.currentScale = this.scales.pentatonic; // Default to pentatonic
    }
    
    // Use Game of Life or 1D cellular automaton based on type
    if (type === 'gameOfLife') {
      return this.generateGameOfLife(width, height, initialCondition, iterations, density);
    } else {
      return this.generate1DAutomaton(rule, width, initialCondition, threshold, iterations);
    }
  }
  
  /**
   * Generate a sequence using 1D cellular automaton
   */
  generate1DAutomaton(rule, width, initialCondition, threshold, generations) {
    // Generate initial state based on the initialCondition parameter
    let currentState = this.generateInitialState1D(width, initialCondition);
    
    // Store all generations in a 2D array
    const caGrid = [currentState];
    this.generations = caGrid;
    
    // Evolve the automaton for the specified number of generations
    for (let gen = 1; gen < generations; gen++) {
      currentState = this.evolve1DAutomaton(currentState, rule);
      caGrid.push(currentState);
    }
    
    // Convert the CA grid to a musical sequence
    const sequence = caGrid.map((generation, genIndex) => {
      const step = {
        step: genIndex,
        time: genIndex * 250, // milliseconds
        notes: []
      };
      
      // Convert cell states to notes
      generation.forEach((cell, cellIndex) => {
        if (cell === 1) {
          // Use selected scale for note mapping
          const scale = this.currentScale || this.scales.pentatonic;
          // Ensure noteIndex is within bounds of the scale
          const noteIndex = Math.min(Math.floor(cellIndex % scale.length), scale.length - 1);
          const scaleDegree = scale[noteIndex];
          
          // Get base note from the selected range with bounds checking
          const baseNote = this.notes && this.notes.length > 0 ? this.notes[0] : 48; // Default to C3
          
          // Calculate velocity based on chosen mapping mode
          let velocity = 80;
          const velocityMap = this.parameters.velocityMap || 'linear';
          
          switch (velocityMap) {
            case 'distance':
              // Cells farther from center have higher velocity
              const center = Math.floor(width / 2);
              const distance = Math.abs(cellIndex - center) / center;
              velocity = 70 + Math.floor(distance * 57); // 70-127 range
              break;
            case 'random':
              velocity = 70 + Math.floor(Math.random() * 57); // 70-127 range
              break;
            case 'linear':
            default:
              // Evenly distribute velocities across the width
              velocity = 70 + Math.floor((cellIndex / width) * 57); // 70-127 range
          }
          
          // Check if this is a newly born cell
          const isBirth = genIndex > 0 && 
                          caGrid[genIndex-1][cellIndex] === 0 && 
                          cell === 1;
          
          // Emphasize births if enabled
          if (isBirth && this.parameters.emphasizeBirths !== false) {
            velocity = Math.min(127, velocity + 20); // Boost velocity for births
          }
          
          // Calculate the octave offset based on generation (newer generations = higher octaves)
          // This creates a rising effect as the pattern evolves
          const octaveOffset = Math.min(2, Math.floor(genIndex / (generations / 3)));
          
          // Add base note
          step.notes.push({
            pitch: baseNote + scaleDegree + (octaveOffset * 12),
            velocity: velocity,
            column: cellIndex,
            row: genIndex,
            state: isBirth ? 'birth' : 'active'
          });
          
          // Add harmony note if enabled and conditions match
          const shouldAddHarmony = this.parameters.harmonies !== false && 
                                 (Math.random() < threshold && genIndex % 4 === 0);
          
          if (shouldAddHarmony) {
            // Calculate harmony note - third in the scale
            const harmonyIndex = (noteIndex + 2) % scale.length;
            const harmonyScaleDegree = scale[harmonyIndex];
            
            step.notes.push({
              pitch: baseNote + harmonyScaleDegree + (octaveOffset * 12),
              velocity: Math.max(50, velocity - 20), // Slightly quieter harmony
              column: cellIndex,
              row: genIndex,
              state: 'harmony'
            });
          }
        }
      });
      
      return step;
    });
    
    return sequence;
  }
  
  /**
   * Generate a sequence using Conway's Game of Life (2D)
   * With improved performance, Buchla-inspired enhancements, and error handling
   * 
   * This implementation ensures cells are always active and visible in the visualization,
   * and generates MIDI notes for active cells.
   */
  generateGameOfLife(width, height, initialPattern, iterations, density) {
    try {
      console.log("Generating Game of Life sequence with parameters:", 
                 {width, height, initialPattern, iterations, density});
                 
      // Safety limits for performance
      width = Math.min(width, 50);
      height = Math.min(height, 50);
      iterations = Math.min(iterations, 100);
      
      // Use default density if not provided
      density = typeof density === 'number' ? density : 0.3;
      
      // Force a minimum density to ensure cells are present
      if (initialPattern === 'random' && density < 0.2) {
        density = 0.2; // Ensure at least 20% of cells are active for random patterns
        console.log(`Adjusted density to ${density} to ensure activity`);
      }
      
      // Initialize the grid with the selected pattern
      let grid = this.generateInitialState2D(width, height, initialPattern, density);
      
      // If grid is empty or has very few cells, force multiple patterns to ensure visibility
      const cellCount = this.countCells(grid);
      if (cellCount < 10) {
        console.log(`Not enough cells in initial grid with pattern ${initialPattern}, adding more patterns`);
        
        // Add a blinker in the center
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        if (centerX > 1 && centerY > 0 && centerX < width - 2 && centerY < height - 1) {
          grid[centerY][centerX-1] = 1;
          grid[centerY][centerX] = 1;
          grid[centerY][centerX+1] = 1;
        }
        
        // Add a glider in a different part
        const gliderX = Math.floor(width / 4);
        const gliderY = Math.floor(height / 4);
        
        if (gliderX > 1 && gliderY > 1 && gliderX < width - 3 && gliderY < height - 3) {
          grid[gliderY][gliderX+1] = 1;
          grid[gliderY+1][gliderX+2] = 1;
          grid[gliderY+2][gliderX] = 1;
          grid[gliderY+2][gliderX+1] = 1;
          grid[gliderY+2][gliderX+2] = 1;
        }
        
        // Add a block pattern in another area
        const blockX = Math.floor(3 * width / 4);
        const blockY = Math.floor(3 * height / 4);
        
        if (blockX > 0 && blockY > 0 && blockX < width - 2 && blockY < height - 2) {
          grid[blockY][blockX] = 1;
          grid[blockY][blockX+1] = 1;
          grid[blockY+1][blockX] = 1;
          grid[blockY+1][blockX+1] = 1;
        }
      }
      
      this.grid = grid;
      
      // Track previous grid state to detect changes
      let previousGrid = this.cloneGrid(grid);
      
      // Store all generations (with memory management)
      const allGenerations = [this.cloneGrid(grid)];
      this.generations = allGenerations;
      
      // Initialize the tracking of cell changes (for visualization)
      this.cellChanges = [[]]; // First generation has no changes
      
      // Track active cells for optimization
      this.initializeActiveQueue(grid);
      
      // Track active cells in each generation for sonification
      const sequence = [];
      
      // Track pattern detection for musical features
      let stabilityCounter = 0;
      let lastActiveCount = 0;
      
      // Performance monitoring
      const perfStartTime = Date.now();
      
      // Evolve the grid for the specified number of iterations
      for (let iter = 0; iter < iterations; iter++) {
        this.currentGeneration = iter;
        
        // Check for stability or performance issues
        if (stabilityCounter > 10) {
          console.log("Pattern stabilized, introducing small mutation for interest");
          this.introduceMutation(grid, width, height);
          stabilityCounter = 0;
        }
        
        // Create a step for this iteration
        const step = {
          step: iter,
          time: iter * 250, // milliseconds
          notes: []
        };
        
        // Evolve the grid one step with optimized algorithm
        grid = this.evolveGameOfLife(grid, previousGrid);
        previousGrid = this.cloneGrid(grid);
        
        // Memory management: avoid storing too many generations
        if (allGenerations.length > this.maxGenerationsToStore) {
          allGenerations.shift(); // Remove oldest generation
        }
        allGenerations.push(this.cloneGrid(grid));
        
        // Count active cells for stability detection
        let activeCount = 0;
        
        // Convert active cells to notes with Buchla-style musically interesting mappings
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) {
              activeCount++;
              
              // Determine if this is a newly born cell for visual and sonic emphasis
              const isBirth = allGenerations.length >= 2 && 
                            allGenerations[allGenerations.length - 1][y][x] === 1 &&
                            (allGenerations.length < 3 || 
                             allGenerations[allGenerations.length - 2][y][x] === 0);
              
              // Detect if this cell is part of a stable pattern (oscillator)
              const isStable = this.stableCells.has(`${x},${y}`);
              
              // Determine cell type for musical expression
              let cellState = 'active';
              if (isBirth) cellState = 'birth';
              else if (isStable) cellState = 'stable';
              
              // Apply Buchla-inspired musical mapping
              const musical = this.mapCellToMusicalNote(x, y, width, height, cellState);
              
              // Add the note to this step with the appropriate state and musical parameters
              step.notes.push({
                pitch: musical.pitch,
                velocity: musical.velocity,
                column: x,
                row: y,
                state: cellState
              });
              
              // Add harmony notes if enabled with Buchla-inspired musically coherent intervals
              if (this.parameters.harmonies !== false && 
                  (isBirth || this.parameters.buchlaMode || 
                   this.countNeighbors(grid, x, y, width, height) >= 4)) {
                
                // Add harmonic note with Buchla-inspired mappings
                const harmony = this.createHarmonyNote(musical, cellState);
                
                step.notes.push({
                  pitch: harmony.pitch,
                  velocity: harmony.velocity,
                  column: x,
                  row: y,
                  state: 'harmony'
                });
              }
            }
          }
        }
        
        // Check for pattern stability
        if (Math.abs(activeCount - lastActiveCount) < 2) {
          stabilityCounter++;
        } else {
          stabilityCounter = 0;
        }
        lastActiveCount = activeCount;
        
        // Store active count for pattern analysis
        this.activeCount = activeCount;
        
        // Limit notes if there are too many (performance optimization)
        if (step.notes.length > 32) {
          // Keep only the most musically interesting notes
          step.notes.sort((a, b) => {
            // Prioritize births and stable patterns
            if (a.state === 'birth' && b.state !== 'birth') return -1;
            if (b.state === 'birth' && a.state !== 'birth') return 1;
            if (a.state === 'stable' && b.state !== 'stable') return -1;
            if (b.state === 'stable' && a.state !== 'stable') return 1;
            
            // Then prioritize by velocity (louder notes)
            return b.velocity - a.velocity;
          });
          
          step.notes = step.notes.slice(0, 32);
        }
        
        sequence.push(step);
        
        // Performance monitoring - log warning if iterations are taking too long
        if (iter === 5) {
          const avgTime = (Date.now() - perfStartTime) / 5;
          if (avgTime > 50) {
            console.warn(`Game of Life iterations taking ${avgTime.toFixed(2)}ms each, may need optimization`);
          }
        }
      }
      
      return sequence;
      
    } catch (error) {
      console.error(`Error in generateGameOfLife: ${error.message}`);
      // Return a simple fallback sequence to prevent crashing
      return this.generateFallbackSequence(iterations);
    }
  }
  
  /**
   * Map a cell position to a musical note with Buchla-inspired characteristics
   * Creates more musically coherent output
   */
  mapCellToMusicalNote(x, y, width, height, cellState) {
    // Get the selected scale with bounds checking
    const scale = this.currentScale || this.scales.pentatonic;
    if (!scale || scale.length === 0) {
      // Fallback safety for invalid scale
      return { pitch: 60, velocity: 100 };
    }
    
    // Ensure x and y are within bounds
    const safeX = Math.min(Math.max(0, x), width - 1);
    const safeY = Math.min(Math.max(0, y), height - 1);
    
    // Buchla-inspired mapping: X position to scale degree
    // For Buchla mode, we focus on musically stable patterns rather than 
    // strict mapping of x position to pitch
    let noteIndex;
    
    if (this.parameters.buchlaMode) {
      // In Buchla mode, use a more structured approach
      // Column indexes used for scales are selected to create cohesive phrases
      noteIndex = (safeX % 8) % scale.length; // 8-step patterns common in sequencers
      
      // Add structured variations for odd rows (Buchla sequencers often have row variations)
      if (safeY % 2 === 1) {
        // Offset for odd rows to create complementary patterns
        noteIndex = (noteIndex + 2) % scale.length;
      }
    } else {
      // Standard mapping
      noteIndex = safeX % scale.length;
    }
    
    // Ensure noteIndex is within bounds
    noteIndex = Math.min(Math.max(0, noteIndex), scale.length - 1);
    const scaleDegree = scale[noteIndex];
    
    // Map Y position to octave with Buchla-like stage approach and bounds checking
    let octaveOffset;
    if (this.parameters.buchlaMode) {
      // Divide grid into 4 octave regions (similar to Buchla's stage approach)
      const stage = Math.floor(safeY / (height / 4));
      // Limit to reasonable range to avoid extreme pitches
      octaveOffset = Math.min(Math.max(0, stage), 3) * 12;
    } else {
      // Standard mapping with 3 octave range
      const stage = Math.floor(safeY / (height / 3));
      octaveOffset = Math.min(Math.max(0, stage), 2) * 12; 
    }
    
    // Calculate base note from the selected note range with bounds checking
    const baseNote = this.notes && this.notes.length > 0 ? this.notes[0] : 48; // Default to C3 if no range set
    // Limit pitch to MIDI range (0-127)
    const rawPitch = baseNote + scaleDegree + octaveOffset;
    const pitch = Math.min(Math.max(0, rawPitch), 127);
    
    // Calculate velocity with Buchla-inspired accent patterns
    let velocity;
    const velocityMap = this.parameters.velocityMap || 'linear';
    const emphasizeBirths = this.parameters.emphasizeBirths !== false;
    
    const isBirth = cellState === 'birth';
    const isStable = cellState === 'stable';
    
    if (this.parameters.buchlaMode) {
      // Apply Buchla-like accent patterns
      // In Buchla sequencers, certain steps typically get accented
      const accentStep = x % 8 === 0 || x % 8 === 4; // Accent on the 1 and 5
      const secondaryAccent = x % 8 === 2 || x % 8 === 6; // Secondary accent on 3 and 7
      
      if (isBirth && emphasizeBirths) {
        // Birth cells get highest velocity
        velocity = 115 + Math.floor(Math.random() * 12); // 115-127
      } else if (accentStep) {
        // Primary accents
        velocity = 100 + Math.floor(Math.random() * 15); // 100-115
      } else if (secondaryAccent) {
        // Secondary accents
        velocity = 85 + Math.floor(Math.random() * 15); // 85-100
      } else if (isStable) {
        // Stable patterns get medium velocity for consistent background
        velocity = 75 + Math.floor(Math.random() * 10); // 75-85
      } else {
        // Regular notes get lower velocity
        velocity = 60 + Math.floor(Math.random() * 15); // 60-75
      }
    } else {
      // Standard velocity mapping
      switch (velocityMap) {
        case 'distance': 
          // Distance from center determines velocity - edge = louder
          const centerX = Math.floor(width / 2);
          const centerY = Math.floor(height / 2);
          const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          const normalizedDistance = distance / maxDistance;
          
          // Base velocity on distance and birth state
          if (isBirth && emphasizeBirths) {
            velocity = 100 + Math.floor(normalizedDistance * 27); // 100-127 for births
          } else {
            velocity = 70 + Math.floor(normalizedDistance * 40); // 70-110 otherwise
          }
          break;
          
        case 'random':
          // Random velocity with emphasis for births
          if (isBirth && emphasizeBirths) {
            velocity = 100 + Math.floor(Math.random() * 27); // 100-127
          } else {
            velocity = 70 + Math.floor(Math.random() * 40); // 70-110
          }
          break;
          
        case 'linear':
        default:
          // Linear mapping based on position
          const normalizedPos = ((x / width) + (y / height)) / 2; // 0-1 range
          
          if (isBirth && emphasizeBirths) {
            velocity = 100 + Math.floor(normalizedPos * 27); // 100-127
          } else {
            velocity = 70 + Math.floor(normalizedPos * 40); // 70-110
          }
          break;
      }
    }
    
    return { pitch, velocity };
  }
  
  /**
   * Create a harmony note for the given note based on music theory
   * Uses Buchla-inspired interval relationships for more coherent output
   */
  createHarmonyNote(note, cellState) {
    const scale = this.currentScale || this.scales.pentatonic;
    const pitch = note.pitch;
    
    // Extract scale degree from pitch
    const noteValue = pitch % 12;
    const scaleIndex = scale.indexOf(noteValue % 12);
    
    let harmonyPitch;
    
    if (this.parameters.buchlaMode) {
      // In Buchla mode, use more musical harmony intervals
      // Determine appropriate musical interval based on cell state
      
      if (cellState === 'birth') {
        // For birth cells, use a perfect fifth (7 semitones) - bright, open sound
        harmonyPitch = pitch + 7;
      } else if (cellState === 'stable') {
        // For stable patterns, use a major third (4 semitones) - stable, consonant
        harmonyPitch = pitch + 4;
      } else {
        // For regular cells, use diatonic harmonies (in the scale)
        // Calculate a scale-appropriate third (might be major or minor depending on scale)
        const thirdIndex = (scaleIndex + 2) % scale.length;
        const thirdInterval = scale[thirdIndex] - scale[scaleIndex];
        harmonyPitch = pitch + thirdInterval;
      }
    } else {
      // Standard harmony calculation - third in the scale
      const harmonyIndex = (scaleIndex + 2) % scale.length;
      const harmonyScaleDegree = scale[harmonyIndex];
      const baseNote = Math.floor(pitch / 12) * 12;
      harmonyPitch = baseNote + harmonyScaleDegree;
    }
    
    // Make harmony note quieter than the main note
    const velocity = Math.max(50, note.velocity - 25);
    
    return { pitch: harmonyPitch, velocity };
  }
  
  /**
   * Introduce a small mutation to keep patterns interesting
   * Similar to the "pressure points" feature in Buchla instruments
   */
  introduceMutation(grid, width, height) {
    // Find a good spot to mutate
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    
    // Add a small random pattern near the center
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const nx = cx + x;
        const ny = cy + y;
        
        // Check bounds
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          // Random toggle with higher probability of adding cells
          if (Math.random() < 0.7) {
            grid[ny][nx] = 1;
          }
        }
      }
    }
  }
  
  /**
   * Generate a simple fallback sequence in case of errors
   */
  generateFallbackSequence(iterations) {
    const sequence = [];
    
    // Create a basic step sequence with a safe pattern
    for (let i = 0; i < iterations; i++) {
      const step = {
        step: i,
        time: i * 250,
        notes: []
      };
      
      // Add a few safe notes with rhythmic pattern
      if (i % 4 === 0) {
        // Bass note on the downbeat
        step.notes.push({
          pitch: 48 + (i % 12), // Simple ascending pattern
          velocity: 100,
          column: 0,
          row: 0,
          state: 'active'
        });
      }
      
      if (i % 2 === 0) {
        // Higher notes on even beats
        step.notes.push({
          pitch: 60 + (i % 7), // Simple scale pattern
          velocity: 80,
          column: 1,
          row: 1,
          state: 'active'
        });
      }
      
      sequence.push(step);
    }
    
    return sequence;
  }
  
  /**
   * Count the total number of active cells in a grid
   * @param {Array[][]} grid - The 2D grid to count cells in
   * @returns {Number} - Count of active cells
   */
  countCells(grid) {
    if (!grid || !Array.isArray(grid) || grid.length === 0) {
      return 0;
    }
    
    let count = 0;
    for (let y = 0; y < grid.length; y++) {
      if (!grid[y] || !Array.isArray(grid[y])) continue;
      
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 1) {
          count++;
        }
      }
    }
    
    return count;
  }
  
  /**
   * Creates a deep copy of a 2D grid
   * @param {Array[][]} grid - The grid to clone
   * @returns {Array[][]} - A new copy of the grid
   */
  cloneGrid(grid) {
    if (!grid || !Array.isArray(grid) || grid.length === 0) {
      // Return a safe default grid if input is invalid
      return [[0]];
    }
    
    try {
      // Use structured clone for deep copying
      return grid.map(row => Array.isArray(row) ? [...row] : [0]);
    } catch (error) {
      console.error('Error cloning grid:', error);
      // Fallback to manual copy
      const newGrid = [];
      for (let y = 0; y < grid.length; y++) {
        newGrid[y] = Array.isArray(grid[y]) ? [...grid[y]] : [0];
      }
      return newGrid;
    }
  }
  
  /**
   * Creates a basic safe grid for fallback
   * @param {Number} width - Grid width
   * @param {Number} height - Grid height
   * @returns {Array[][]} - A simple grid with a stable pattern
   */
  generateSafeGrid(width, height) {
    // Create an empty grid
    const grid = Array(height).fill().map(() => Array(width).fill(0));
    
    // Add a simple stable pattern (2x2 block)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Create a block pattern (2x2 square)
    if (centerX > 0 && centerY > 0 && centerX < width - 1 && centerY < height - 1) {
      grid[centerY][centerX] = 1;
      grid[centerY][centerX + 1] = 1;
      grid[centerY + 1][centerX] = 1;
      grid[centerY + 1][centerX + 1] = 1;
    }
    
    return grid;
  }
  
  /**
   * Initialize the active cell tracking queue for Game of Life optimization
   */
  initializeActiveQueue(grid) {
    this.activeQueueFront = [];
    this.activeQueueBack = [];
    
    // Add all initially active cells and their neighbors to the active queue
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === 1) {
          // Add the active cell
          this.addToActiveQueue(x, y);
          
          // Add all neighbors of the active cell to check on next generation
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx !== 0 || dy !== 0) {
                const nx = (x + dx + grid[0].length) % grid[0].length;
                const ny = (y + dy + grid.length) % grid.length;
                this.addToActiveQueue(nx, ny);
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Add a cell to the active queue (ensuring no duplicates)
   * Optimized with Set-based lookup for large grids
   */
  addToActiveQueue(x, y) {
    // Get key in string format for the active queue
    const key = `${x},${y}`;
    
    // We use this Set to track which cells have already been added
    // much faster lookup than array.includes() for large grids
    if (!this._activeQueueSet) {
      this._activeQueueSet = new Set();
    }
    
    // Only add if not already in the queue
    if (!this._activeQueueSet.has(key)) {
      this.activeQueueBack.push(key);
      this._activeQueueSet.add(key);
      
      // Reset the Set if it gets too large (memory management)
      if (this._activeQueueSet.size > 10000) {
        this._activeQueueSet = new Set(this.activeQueueBack);
      }
    }
  }
  
  /**
   * Generate the initial state for a 1D cellular automaton
   */
  generateInitialState1D(width, type) {
    const state = new Array(width).fill(0);
    
    switch (type) {
      case 'center':
        // Single cell in the center
        state[Math.floor(width / 2)] = 1;
        break;
        
      case 'random':
        // Random initial state
        for (let i = 0; i < width; i++) {
          state[i] = Math.random() < this.parameters.density ? 1 : 0;
        }
        break;
        
      case 'custom':
        // Two cells with some space between
        state[Math.floor(width / 3)] = 1;
        state[Math.floor(2 * width / 3)] = 1;
        break;
        
      case 'third':
        // Every third cell
        for (let i = 0; i < width; i += 3) {
          state[i] = 1;
        }
        break;
        
      case 'alternating':
        // Alternating cells
        for (let i = 0; i < width; i += 2) {
          state[i] = 1;
        }
        break;
        
      default:
        // Default to center
        state[Math.floor(width / 2)] = 1;
    }
    
    return state;
  }
  
  /**
   * Generate the initial state for Game of Life (2D)
   * Expanded with more patterns and Buchla-inspired structures
   */
  generateInitialState2D(width, height, pattern, density) {
    // Create an empty grid
    const grid = Array(height).fill().map(() => Array(width).fill(0));
    
    // Safety check for dimensions
    width = Math.min(width, 100);  // Prevent excessive grid sizes
    height = Math.min(height, 100);
    
    try {
      console.log(`Creating Game of Life pattern: ${pattern} with dimensions ${width}x${height}`);
      
      switch (pattern) {
        case 'random':
          // Random distribution of cells
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              grid[y][x] = Math.random() < density ? 1 : 0;
            }
          }
          break;
          
        case 'glider':
          // Add a glider in the top-left corner
          if (width >= 5 && height >= 5) {
            // Add multiple gliders to ensure visibility
            const positions = [
              // Top-left
              [1, 2, 2, 3, 3, 1, 3, 2, 3, 3],
              // Bottom-right
              [height-4, width-3, height-3, width-2, height-2, width-4, height-2, width-3, height-2, width-2],
              // Center
              [Math.floor(height/2), Math.floor(width/2)+1, 
               Math.floor(height/2)+1, Math.floor(width/2)+2, 
               Math.floor(height/2)+2, Math.floor(width/2), 
               Math.floor(height/2)+2, Math.floor(width/2)+1, 
               Math.floor(height/2)+2, Math.floor(width/2)+2]
            ];
            
            // Place each glider
            for (const pos of positions) {
              if (pos[0] < height && pos[1] < width && 
                  pos[2] < height && pos[3] < width && 
                  pos[4] < height && pos[5] < width && 
                  pos[6] < height && pos[7] < width && 
                  pos[8] < height && pos[9] < width) {
                grid[pos[0]][pos[1]] = 1;
                grid[pos[2]][pos[3]] = 1;
                grid[pos[4]][pos[5]] = 1;
                grid[pos[6]][pos[7]] = 1;
                grid[pos[8]][pos[9]] = 1;
              }
            }
          }
          break;
          
        case 'blinker':
          // Add multiple blinkers at different locations
          const centerX = Math.floor(width / 2);
          const centerY = Math.floor(height / 2);
          
          // Center blinker
          grid[centerY][centerX - 1] = 1;
          grid[centerY][centerX] = 1;
          grid[centerY][centerX + 1] = 1;
          
          // Top-left blinker
          if (centerY > 5 && centerX > 5) {
            grid[centerY - 5][centerX - 5] = 1;
            grid[centerY - 5][centerX - 4] = 1;
            grid[centerY - 5][centerX - 3] = 1;
          }
          
          // Bottom-right blinker
          if (centerY + 5 < height && centerX + 5 < width) {
            grid[centerY + 5][centerX + 3] = 1;
            grid[centerY + 5][centerX + 4] = 1;
            grid[centerY + 5][centerX + 5] = 1;
          }
          break;
          
        case 'pulsar':
          // Add a pulsar (larger oscillator)
          if (width >= 17 && height >= 17) {
            const px = Math.floor(width / 2) - 6;
            const py = Math.floor(height / 2) - 6;
            
            // Horizontal bars (top and bottom groups)
            for (let x = 2; x <= 4; x++) {
              // Top
              grid[py][px + x] = 1;
              grid[py][px + x + 6] = 1;
              // Bottom
              grid[py + 12][px + x] = 1;
              grid[py + 12][px + x + 6] = 1;
              
              // Middle top
              grid[py + 5][px + x] = 1;
              grid[py + 5][px + x + 6] = 1;
              // Middle bottom
              grid[py + 7][px + x] = 1;
              grid[py + 7][px + x + 6] = 1;
            }
            
            // Vertical bars (left and right groups)
            for (let y = 2; y <= 4; y++) {
              // Left
              grid[py + y][px] = 1;
              grid[py + y + 6][px] = 1;
              // Right
              grid[py + y][px + 12] = 1;
              grid[py + y + 6][px + 12] = 1;
              
              // Middle left
              grid[py + y][px + 5] = 1;
              grid[py + y + 6][px + 5] = 1;
              // Middle right
              grid[py + y][px + 7] = 1;
              grid[py + y + 6][px + 7] = 1;
            }
          }
          break;
          
        case 'gosperGliderGun':
          // Create a Gosper Glider Gun pattern
          if (width >= 38 && height >= 11) {
            const gx = 5;
            const gy = Math.floor(height / 2) - 5;
            
            // Left block
            grid[gy + 4][gx] = 1;
            grid[gy + 4][gx + 1] = 1;
            grid[gy + 5][gx] = 1;
            grid[gy + 5][gx + 1] = 1;
            
            // Right block
            grid[gy + 2][gx + 34] = 1;
            grid[gy + 2][gx + 35] = 1;
            grid[gy + 3][gx + 34] = 1;
            grid[gy + 3][gx + 35] = 1;
            
            // Left structure
            grid[gy + 2][gx + 10] = 1;
            grid[gy + 3][gx + 10] = 1;
            grid[gy + 4][gx + 10] = 1;
            grid[gy + 1][gx + 11] = 1;
            grid[gy + 5][gx + 11] = 1;
            grid[gy][gx + 12] = 1;
            grid[gy][gx + 13] = 1;
            grid[gy + 6][gx + 12] = 1;
            grid[gy + 6][gx + 13] = 1;
            grid[gy + 1][gx + 14] = 1;
            grid[gy + 5][gx + 14] = 1;
            grid[gy + 2][gx + 15] = 1;
            grid[gy + 3][gx + 15] = 1;
            grid[gy + 4][gx + 15] = 1;
            grid[gy + 2][gx + 16] = 1;
            grid[gy + 3][gx + 16] = 1;
            grid[gy + 4][gx + 16] = 1;
            grid[gy + 1][gx + 17] = 1;
            grid[gy + 5][gx + 17] = 1;
            grid[gy][gx + 18] = 1;
            grid[gy + 6][gx + 18] = 1;
            
            // Right structure
            grid[gy + 2][gx + 20] = 1;
            grid[gy + 3][gx + 20] = 1;
            grid[gy + 4][gx + 20] = 1;
            grid[gy + 1][gx + 21] = 1;
            grid[gy + 5][gx + 21] = 1;
            grid[gy][gx + 22] = 1;
            grid[gy][gx + 23] = 1;
            grid[gy + 6][gx + 22] = 1;
            grid[gy + 6][gx + 23] = 1;
            grid[gy + 3][gx + 24] = 1;
            grid[gy + 1][gx + 24] = 1;
            grid[gy + 5][gx + 24] = 1;
          }
          break;
          
        case 'acorn':
          // Add an acorn pattern (a small pattern that evolves into a complex mess)
          const ax = Math.floor(width / 2) - 3;
          const ay = Math.floor(height / 2);
          grid[ay][ax] = 1;
          grid[ay][ax + 1] = 0;
          grid[ay][ax + 2] = 1;
          grid[ay][ax + 3] = 1;
          grid[ay][ax + 4] = 1;
          grid[ay][ax + 5] = 1;
          grid[ay][ax + 6] = 1;
          grid[ay + 1][ax + 3] = 1;
          break;
          
        case 'exploder':
          // Add an exploder pattern
          const ex = Math.floor(width / 2) - 2;
          const ey = Math.floor(height / 2) - 2;
          grid[ey][ex] = 1;
          grid[ey][ex + 4] = 1;
          grid[ey + 1][ex] = 1;
          grid[ey + 1][ex + 4] = 1;
          grid[ey + 2][ex] = 1;
          grid[ey + 2][ex + 4] = 1;
          grid[ey + 3][ex] = 1;
          grid[ey + 3][ex + 4] = 1;
          grid[ey + 4][ex] = 1;
          grid[ey + 4][ex + 4] = 1;
          break;
          
        case 'buchla':
          // Buchla-inspired rhythm pattern - modified glider gun for interesting evolution
          // Creates patterns similar to those found in the Buchla 252e sequencer
          if (width >= 24 && height >= 16) {
            const bx = Math.floor(width / 2) - 8;
            const by = Math.floor(height / 2) - 4;
            
            // Create a circular pattern with multiple gliders
            this.createBuchlaPattern(grid, bx, by);
          } else {
            // Fallback for small grids
            this.createSimpleBuchlaPattern(grid, width, height);
          }
          break;
          
        case 'spaceships':
          // Multiple lightweight spaceships
          if (width >= 20 && height >= 20) {
            for (let i = 0; i < 3; i++) {
              const sx = 5 + (i * 6);
              const sy = 5 + (i * 4);
              
              // If coordinates are valid
              if (sx + 4 < width && sy + 3 < height) {
                // Add lightweight spaceship
                grid[sy][sx + 1] = 1;
                grid[sy][sx + 4] = 1;
                grid[sy + 1][sx] = 1;
                grid[sy + 2][sx] = 1;
                grid[sy + 3][sx] = 1;
                grid[sy + 3][sx + 1] = 1;
                grid[sy + 3][sx + 2] = 1;
                grid[sy + 3][sx + 3] = 1;
                grid[sy + 2][sx + 4] = 1;
              }
            }
          }
          break;
          
        case 'pentadecathlon':
          // Pentadecathlon (period 15 oscillator)
          const px = Math.floor(width / 2) - 4;
          const py = Math.floor(height / 2);
          
          if (px + 9 < width && py + 2 < height) {
            // Create the basic structure
            for (let i = 0; i < 10; i++) {
              grid[py][px + i] = 1;
            }
            
            // Add the stabilizing blocks
            grid[py - 1][px + 2] = 1;
            grid[py + 1][px + 2] = 1;
            grid[py - 1][px + 7] = 1;
            grid[py + 1][px + 7] = 1;
          }
          break;
          
        case 'cross':
        default:
          // Create a simple cross shape in the center
          const cx = Math.floor(width / 2);
          const cy = Math.floor(height / 2);
          
          // Make the cross larger and more visible
          grid[cy][cx] = 1;
          grid[cy-1][cx] = 1;
          grid[cy-2][cx] = 1;
          grid[cy+1][cx] = 1;
          grid[cy+2][cx] = 1;
          grid[cy][cx-1] = 1;
          grid[cy][cx-2] = 1;
          grid[cy][cx+1] = 1;
          grid[cy][cx+2] = 1;
          
          // Add a few more cells to make it more interesting
          grid[cy-1][cx-1] = 1;
          grid[cy+1][cx+1] = 1;
          grid[cy-1][cx+1] = 1;
          grid[cy+1][cx-1] = 1;
      }
      
      // Apply Buchla mode modifications if enabled
      if (this.parameters.buchlaMode && pattern !== 'buchla') {
        this.applyBuchlaModifications(grid, width, height);
      }
      
      // Check if grid is too empty and add more cells if needed
      const cellCount = this.countCells(grid);
      if (cellCount < 10) {
        console.log(`Adding more cells because pattern ${pattern} only has ${cellCount} cells`);
        // Add some random cells to ensure activity
        const additionalCells = Math.max(15, Math.floor(width * height * 0.05));
        for (let i = 0; i < additionalCells; i++) {
          const rx = Math.floor(Math.random() * width);
          const ry = Math.floor(Math.random() * height);
          grid[ry][rx] = 1;
        }
      }
      
      return grid;
    } catch (error) {
      console.error(`Error creating initial grid: ${error.message}`);
      // Return a simple stable pattern in case of error
      return this.generateSafeGrid(width, height);
    }
  }
  
  /**
   * Create a Buchla-inspired pattern optimized for musical sequencing
   * Based on the principles of the Buchla 252e sequencer
   */
  createBuchlaPattern(grid, x, y) {
    // Create a central structure to generate interesting patterns
    
    // Central cross
    grid[y][x + 5] = 1;
    grid[y + 1][x + 5] = 1;
    grid[y - 1][x + 5] = 1;
    grid[y][x + 4] = 1;
    grid[y][x + 6] = 1;
    
    // Oscillator elements for rhythm
    grid[y - 3][x + 2] = 1;
    grid[y - 3][x + 3] = 1;
    grid[y - 3][x + 4] = 1;
    
    grid[y + 3][x + 6] = 1;
    grid[y + 3][x + 7] = 1;
    grid[y + 3][x + 8] = 1;
    
    // Glider launchers for continuous evolution
    grid[y - 2][x + 12] = 1;
    grid[y - 1][x + 12] = 1;
    grid[y][x + 12] = 1;
    grid[y][x + 11] = 1;
    grid[y - 1][x + 10] = 1;
    
    // Stable block for grounding
    grid[y + 5][x + 1] = 1;
    grid[y + 5][x + 2] = 1;
    grid[y + 6][x + 1] = 1;
    grid[y + 6][x + 2] = 1;
    
    // Secondary rhythm elements
    grid[y - 5][x + 8] = 1;
    grid[y - 5][x + 9] = 1;
    grid[y - 5][x + 10] = 1;
    grid[y - 4][x + 9] = 1;
  }
  
  /**
   * Create a simplified Buchla pattern for smaller grids
   */
  createSimpleBuchlaPattern(grid, width, height) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    
    // Create a clock divider-like pattern
    for (let i = 0; i < Math.min(width - 2, 8); i++) {
      if (i % 2 === 0) {
        grid[cy][cx - 4 + i] = 1;
      }
    }
    
    // Create an accent pattern
    for (let i = 0; i < Math.min(height - 2, 5); i++) {
      if (i % 3 === 0) {
        grid[cy - 2 + i][cx + 2] = 1;
      }
    }
    
    // Create a trigger pattern
    grid[cy + 2][cx - 2] = 1;
    grid[cy + 2][cx - 1] = 1;
    grid[cy + 2][cx] = 1;
  }
  
  /**
   * Apply Buchla-inspired modifications to an existing pattern
   * Adds musical rhythmic elements
   */
  applyBuchlaModifications(grid, width, height) {
    // Create rhythm-like structures within the grid
    const pulseCount = this.buchlaPatterns.pulses[
      Math.floor(Math.random() * this.buchlaPatterns.pulses.length)
    ];
    
    const accentEvery = this.buchlaPatterns.accents[
      Math.floor(Math.random() * this.buchlaPatterns.accents.length)
    ];
    
    // Add a rhythmic pulse structure
    const rowIndex = Math.floor(height * 0.75);
    if (rowIndex < height) {
      for (let i = 0; i < Math.min(width, pulseCount * 2); i++) {
        if (i % 2 === 0 && i / 2 % accentEvery === 0) {
          // Accent pulse - larger structure
          grid[rowIndex][i] = 1;
          if (rowIndex + 1 < height) {
            grid[rowIndex + 1][i] = 1;
          }
        } else if (i % 2 === 0) {
          // Regular pulse
          grid[rowIndex][i] = 1;
        }
      }
    }
  }
  
  /**
   * Count the number of live neighbors for a cell
   */
  countNeighbors(grid, x, y, width, height) {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip the cell itself
        
        // Calculate neighbor coordinates with wrapping
        const nx = (x + dx + width) % width;
        const ny = (y + dy + height) % height;
        
        if (grid[ny][nx] === 1) {
          count++;
        }
      }
    }
    
    return count;
  }
  
  /**
   * Evolve a 1D cellular automaton one generation using the specified rule
   */
  evolve1DAutomaton(currentState, rule) {
    const width = currentState.length;
    const nextState = new Array(width).fill(0);
    
    // Convert rule to binary and pad to 8 bits
    const ruleBinary = rule.toString(2).padStart(8, '0');
    
    // Create a lookup table based on the rule
    const lookup = {};
    for (let i = 0; i < 8; i++) {
      const key = (7 - i).toString(2).padStart(3, '0');
      lookup[key] = parseInt(ruleBinary[i]);
    }
    
    // Apply the rule to each cell
    for (let i = 0; i < width; i++) {
      // Get the cell and its neighbors (with wrap-around)
      const left = currentState[(i - 1 + width) % width];
      const center = currentState[i];
      const right = currentState[(i + 1) % width];
      
      // Create the neighborhood pattern (3 bits)
      const neighborhood = `${left}${center}${right}`;
      
      // Look up the next state from the rule table
      nextState[i] = lookup[neighborhood];
    }
    
    return nextState;
  }
  
  /**
   * Evolve a Game of Life grid one generation
   * Optimized version with bounds checking and memory management
   */
  evolveGameOfLife(currentGrid, previousGrid) {
    const height = currentGrid.length;
    const width = currentGrid[0].length;
    
    // Memory management: limit grid size for performance
    const maxGridSize = 50 * 50; // Safety limit
    if (width * height > maxGridSize) {
      console.warn(`Grid size ${width}x${height} exceeds safety limit. Using reduced grid.`);
      // Return a small stable pattern instead of crashing
      return this.generateSafeGrid(width, height);
    }
    
    // Create a new grid for the next generation
    const nextGrid = Array(height).fill().map(() => Array(width).fill(0));
    
    // Track cell changes for visualization
    const changes = [];
    
    try {
      // FIXED: Check if we have active cells or not
      const hasActiveCells = this.countCells(currentGrid) > 0;
      
      // If no active cells and this isn't the first generation, add some to avoid empty state
      if (!hasActiveCells && this.currentGeneration > 0) {
        console.log('No active cells detected, adding some random cells to keep the simulation going');
        // Add some random cells to the center
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        // Add a small glider
        if (centerX > 1 && centerY > 1 && centerX < width - 2 && centerY < height - 2) {
          currentGrid[centerY][centerX+1] = 1;
          currentGrid[centerY+1][centerX+2] = 1;
          currentGrid[centerY+2][centerX] = 1;
          currentGrid[centerY+2][centerX+1] = 1;
          currentGrid[centerY+2][centerX+2] = 1;
          
          // Re-initialize active queue
          this.initializeActiveQueue(currentGrid);
        }
      }
      
      // Check if we should use the active queue optimization or the full grid scan
      const useActiveQueue = this.activeQueueFront.length > 0 && this.activeQueueFront.length < width * height / 2;
      
      if (useActiveQueue) {
        // Use a Map instead of array for active queue (better performance with large grids)
        const activeQueue = new Map();
        this.activeQueueFront.forEach(key => activeQueue.set(key, true));
        
        // Reset back queue with a more efficient structure
        this.activeQueueFront = [...this.activeQueueBack];
        this.activeQueueBack = [];
        
        // Apply Game of Life rules to cells in the active queue
        for (const coordKey of activeQueue.keys()) {
          // Parse coordinates safely with error handling
          const [xStr, yStr] = coordKey.split(',');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          
          // Skip invalid coordinates
          if (isNaN(x) || isNaN(y) || x < 0 || x >= width || y < 0 || y >= height) {
            continue;
          }
          
          // Count live neighbors with bounds checking
          const neighbors = this.countNeighbors(currentGrid, x, y, width, height);
          
          // Apply Conway's Game of Life rules
          const isAlive = currentGrid[y][x] === 1;
          let willBeAlive;
          
          if (isAlive) {
            // Live cell rules
            willBeAlive = (neighbors === 2 || neighbors === 3);
          } else {
            // Dead cell rules
            willBeAlive = (neighbors === 3);
          }
          
          // Update the next state
          nextGrid[y][x] = willBeAlive ? 1 : 0;
          
          // Force some cells to be alive along a musical scale pattern 
          // to ensure we have notes playing, especially in corners and center
          const forcePatternActivation = this.parameters.buchlaMode && 
                                      this.activeCount < 5 && 
                                      (x % 4 === 0 || y % 4 === 0) &&
                                      ((x === 0 || x === width - 1) || 
                                      (y === 0 || y === height - 1) ||
                                      (Math.abs(x - width/2) < 2 && Math.abs(y - height/2) < 2));
                                      
          if (forcePatternActivation) {
            nextGrid[y][x] = 1;
            // If we forced this cell to be active when it wasn't before, 
            // record the change
            if (!isAlive) {
              changes.push({ x, y, type: 'birth' });
            }
          }
          
          // Track cell changes for visualization
          if (isAlive !== willBeAlive) {
            changes.push({
              x, y, 
              type: willBeAlive ? 'birth' : 'death'
            });
          }
          
          // If this cell will be alive or has neighbors that will be alive
          // add it and its neighbors to the back queue for the next generation
          if (willBeAlive || neighbors > 0) {
            this.addToActiveQueue(x, y);
            
            // Add all neighbors with bounds checking
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx !== 0 || dy !== 0) {
                  // Calculate neighbor coordinates with wrapping
                  const nx = (x + dx + width) % width;
                  const ny = (y + dy + height) % height;
                  
                  // Verify coordinates are valid before adding
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    this.addToActiveQueue(nx, ny);
                  }
                }
              }
            }
          }
        }
      } else {
        // Fall back to full grid scan if active queue is too large or empty
        console.log('Using full grid scan instead of active queue optimization');
        
        // Check every cell in the grid (less efficient but more thorough)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Count live neighbors with bounds checking
            const neighbors = this.countNeighbors(currentGrid, x, y, width, height);
            
            // Apply Conway's Game of Life rules
            const isAlive = currentGrid[y][x] === 1;
            let willBeAlive;
            
            if (isAlive) {
              // Live cell rules
              willBeAlive = (neighbors === 2 || neighbors === 3);
            } else {
              // Dead cell rules
              willBeAlive = (neighbors === 3);
            }
            
            // Update the next state
            nextGrid[y][x] = willBeAlive ? 1 : 0;
            
            // Track cell changes for visualization
            if (isAlive !== willBeAlive) {
              changes.push({
                x, y, 
                type: willBeAlive ? 'birth' : 'death'
              });
            }
            
            // If will be alive, add to active queue for next generation
            if (willBeAlive) {
              this.addToActiveQueue(x, y);
              
              // Add neighbors to the queue
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx !== 0 || dy !== 0) {
                    const nx = (x + dx + width) % width;
                    const ny = (y + dy + height) % height;
                    this.addToActiveQueue(nx, ny);
                  }
                }
              }
            }
          }
        }
      }
      
      // Limit size of active queue to prevent memory issues
      if (this.activeQueueBack.length > width * height * 2) {
        console.warn(`Active queue size (${this.activeQueueBack.length}) exceeds grid size. Trimming.`);
        this.activeQueueBack = this.activeQueueBack.slice(0, width * height);
      }
      
      // Check if the grid has any active cells
      const hasActiveCell = this.countCells(nextGrid) > 0;
      
      // If no active cells, add a few to prevent empty grid
      if (!hasActiveCell) {
        // Add a glider in a random location
        const rx = Math.floor(Math.random() * (width - 4)) + 2;
        const ry = Math.floor(Math.random() * (height - 4)) + 2;
        
        nextGrid[ry][rx+1] = 1;
        nextGrid[ry+1][rx+2] = 1;
        nextGrid[ry+2][rx] = 1;
        nextGrid[ry+2][rx+1] = 1;
        nextGrid[ry+2][rx+2] = 1;
        
        // Also add a blinker in another location for more activity
        const bx = (rx + Math.floor(width / 2)) % (width - 4) + 2;
        const by = (ry + Math.floor(height / 2)) % (height - 4) + 2;
        
        nextGrid[by][bx-1] = 1;
        nextGrid[by][bx] = 1;
        nextGrid[by][bx+1] = 1;
        
        // Add a block in a third location
        const cx = (rx + bx) % (width - 3) + 2;
        const cy = (ry + by) % (height - 3) + 2;
        
        nextGrid[cy][cx] = 1;
        nextGrid[cy][cx+1] = 1;
        nextGrid[cy+1][cx] = 1;
        nextGrid[cy+1][cx+1] = 1;
        
        // Track all changes
        changes.push(
          // Glider
          { x: rx+1, y: ry, type: 'birth' },
          { x: rx+2, y: ry+1, type: 'birth' },
          { x: rx, y: ry+2, type: 'birth' },
          { x: rx+1, y: ry+2, type: 'birth' },
          { x: rx+2, y: ry+2, type: 'birth' },
          // Blinker
          { x: bx-1, y: by, type: 'birth' },
          { x: bx, y: by, type: 'birth' },
          { x: bx+1, y: by, type: 'birth' },
          // Block
          { x: cx, y: cy, type: 'birth' },
          { x: cx+1, y: cy, type: 'birth' },
          { x: cx, y: cy+1, type: 'birth' },
          { x: cx+1, y: cy+1, type: 'birth' }
        );
        
        // Reset active queue to include all the new cells
        this.initializeActiveQueue(nextGrid);
        
        console.log('Added multiple patterns to prevent empty grid');
      }
      
      // Store changes for this generation (for visualization)
      this.cellChanges.push(changes);
      
      return nextGrid;
    } catch (error) {
      console.error(`Error in Game of Life evolution: ${error.message}`);
      // Return previous grid on error to prevent crash
      return this.cloneGrid(currentGrid);
    }
  }
  
  /**
   * Generate a safe grid in case of performance issues
   * Returns a small stable pattern that won't cause crashes
   */
  generateSafeGrid(width, height) {
    const grid = Array(height).fill().map(() => Array(width).fill(0));
    
    // Add a few block patterns (2x2) which are stable
    const numBlocks = Math.min(5, Math.floor(width / 4), Math.floor(height / 4));
    
    for (let i = 0; i < numBlocks; i++) {
      const x = Math.floor(width / numBlocks * i) + 2;
      const y = Math.floor(height / 2);
      
      // Only add if within bounds
      if (x + 1 < width && y + 1 < height) {
        grid[y][x] = 1;
        grid[y][x+1] = 1;
        grid[y+1][x] = 1;
        grid[y+1][x+1] = 1;
      }
    }
    
    return grid;
  }
  
  /**
   * Create a deep copy of a 2D grid
   */
  cloneGrid(grid) {
    return grid.map(row => [...row]);
  }
  
  /**
   * Get the current grid for visualization
   */
  getGrid() {
    return this.grid;
  }
  
  /**
   * Get all generations for visualization
   */
  getGenerations() {
    return this.generations;
  }
  
  /**
   * Get cell change history for enhanced visualization
   */
  getCellChanges() {
    return this.cellChanges;
  }
  
  /**
   * Helper method to map pitch to a note name (for visualization)
   */
  getPitchName(pitch) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteName = noteNames[pitch % 12];
    return `${noteName}${octave}`;
  }
}

export default CellularGenerator;