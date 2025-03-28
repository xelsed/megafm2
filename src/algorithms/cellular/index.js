/**
 * Refactored Cellular Automata Generator
 * Using modular architecture for better maintainability
 */
import AutomatonGrid from './AutomatonGrid';
import RuleEngine from './RuleEngine';
import MusicMapper from './MusicMapper';
import PatternDetector from './PatternDetector';

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
      scale: 'pentatonic',      // Musical scale to use
      noteRange: 'mid',         // Range of notes (low, mid, high)
      preferredPatterns: []     // Patterns to prioritize when in Buchla mode
    };
    
    // Initialize component objects
    this.grid = new AutomatonGrid(this.parameters.width, this.parameters.height);
    this.ruleEngine = new RuleEngine();
    this.musicMapper = new MusicMapper();
    this.patternDetector = new PatternDetector();
    
    // Set musical parameters
    this.musicMapper.setScale(this.parameters.scale || 'pentatonic');
    this.musicMapper.setNoteRange(this.parameters.noteRange || 'mid');
    
    // Buchla 252e-inspired rhythm & accent patterns
    this.buchlaPatterns = {
      // Classic clock division patterns from Buchla 252e
      pulses: [2, 3, 4, 5, 7, 8, 16],  // Number of pulses
      accents: [1, 2, 3],              // Accent every nth pulse
      // Stage offset patterns
      offsets: [0, 1, 2, 3]            // Stage offset amounts
    };
    
    // Tracking variables for performance monitoring
    this.cellChanges = [];
    this.performanceLevel = this.parameters.performanceMode;
    
    // Set optimal parameters based on grid size
    this.setPerformanceParameters();
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
    
    // Set the note range and scale if specified
    if (noteRange) {
      this.musicMapper.setNoteRange(noteRange);
    }
    
    if (scale) {
      this.musicMapper.setScale(scale);
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
    // Initialize 1D grid
    const initialState = this.grid.initialize1D(width, initialCondition);
    
    // Evolve the automaton for the specified number of generations
    const caGenerations = this.ruleEngine.evolve1D(this.grid, rule, generations);
    
    // Convert the CA generations to a musical sequence
    return this.musicMapper.mapGenerationsToSequence(caGenerations, this.parameters);
  }
  
  /**
   * Generate a sequence using Conway's Game of Life
   */
  generateGameOfLife(width, height, initialCondition, iterations, density) {
    // Initialize the grid
    this.grid = new AutomatonGrid(width, height);
    this.grid.initialize(initialCondition, density);
    
    // Evolve the automaton and track cell changes
    this.cellChanges = this.ruleEngine.evolveGrid(this.grid, iterations);
    
    // Analyze pattern complexity for musical interest
    const analysis = this.patternDetector.analyzeComplexity(this.grid.getGenerations());
    
    // Generate sequence based on final grid state and changes
    const sequence = this.musicMapper.map2DGridToSequence(
      this.grid.getGrid(), 
      this.parameters,
      this.cellChanges
    );
    
    // If in Buchla mode, adapt the sequence for more musical output
    if (this.parameters.buchlaMode) {
      return this.applyBuchlaPatterns(sequence, analysis);
    }
    
    return sequence;
  }
  
  /**
   * Apply Buchla-inspired patterns for more musical output
   * @param {Array} sequence - Raw sequence from cellular automaton
   * @param {Object} analysis - Pattern analysis results
   * @returns {Array} - Modified sequence with musical patterns
   */
  applyBuchlaPatterns(sequence, analysis) {
    // Avoid processing empty sequences
    if (!sequence || sequence.length === 0) return sequence;
    
    // Select a pulse division based on complexity
    const pulseIndex = Math.floor(analysis.complexity * this.buchlaPatterns.pulses.length);
    const pulses = this.buchlaPatterns.pulses[
      Math.min(pulseIndex, this.buchlaPatterns.pulses.length - 1)
    ];
    
    // Select accent pattern based on entropy
    const accentIndex = Math.floor(analysis.entropy * this.buchlaPatterns.accents.length);
    const accentEvery = this.buchlaPatterns.accents[
      Math.min(accentIndex, this.buchlaPatterns.accents.length - 1)
    ];
    
    // Apply rhythmic and accent patterns
    for (let i = 0; i < sequence.length; i++) {
      // Apply pulse division (only play on pulse beats)
      if (i % pulses !== 0) {
        sequence[i].notes = [];
        continue;
      }
      
      // Apply accents
      if (i % (pulses * accentEvery) === 0) {
        // Accent notes
        sequence[i].notes.forEach(note => {
          note.velocity = Math.min(127, note.velocity * 1.3);
        });
      }
    }
    
    return sequence.filter(step => step.notes.length > 0);
  }
  
  /**
   * Get the cell changes for visualization purposes
   * @returns {Array} - Array of cell changes
   */
  getCellChanges() {
    return this.cellChanges;
  }
  
  /**
   * Get the current grid state
   * @returns {Array} - Current grid state
   */
  getCurrentGrid() {
    return this.grid.getGrid();
  }
  
  /**
   * Get all generations of the cellular automaton
   * @returns {Array} - Array of grid states
   */
  getGenerations() {
    return this.grid.getGenerations();
  }
}

export default CellularGenerator;
