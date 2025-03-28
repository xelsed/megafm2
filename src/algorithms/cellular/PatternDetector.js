/**
 * PatternDetector.js
 * Identifies patterns and oscillators in cellular automata generations
 */
class PatternDetector {
  constructor() {
    this.stableCells = new Set();
    this.oscillatorPatterns = [];
    this.detectedMetaPatterns = [];
  }
  
  /**
   * Detect oscillators in cellular automaton generations
   * @param {Array} generations - Array of grid states
   * @returns {Object} - Detected patterns
   */
  detectOscillators(generations) {
    // Need at least 5 generations to detect patterns
    if (!generations || generations.length < 5) {
      return { stableCells: new Set(), oscillators: [] };
    }
    
    const height = generations[0].length;
    const width = height > 0 ? generations[0][0].length : 0;
    
    // Reset detection state
    this.stableCells = new Set();
    this.oscillatorPatterns = [];
    
    // Detect still life patterns (stable cells)
    this.detectStillLifes(generations, width, height);
    
    // Detect oscillators (period 2-3)
    this.detectPeriodOscillators(generations, width, height);
    
    return {
      stableCells: this.stableCells,
      oscillators: this.oscillatorPatterns
    };
  }
  
  /**
   * Detect still life patterns (cells that don't change)
   * @param {Array} generations - Array of grid states
   * @param {Number} width - Grid width
   * @param {Number} height - Grid height
   */
  detectStillLifes(generations, width, height) {
    const minGenerations = Math.min(generations.length, 4);
    
    // Look for cells that remain stable for at least 3 generations
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let stable = true;
        
        // Check if cell state remains constant across generations
        const initialState = generations[generations.length - minGenerations][y][x];
        
        for (let g = generations.length - minGenerations + 1; g < generations.length; g++) {
          if (generations[g][y][x] !== initialState) {
            stable = false;
            break;
          }
        }
        
        // If cell is stable and alive, mark it
        if (stable && initialState === 1) {
          this.stableCells.add(`${x},${y}`);
        }
      }
    }
  }
  
  /**
   * Detect oscillating patterns with period 2-3
   * @param {Array} generations - Array of grid states
   * @param {Number} width - Grid width
   * @param {Number} height - Grid height
   */
  detectPeriodOscillators(generations, width, height) {
    // Need at least 6 generations to detect period-3 oscillators
    if (generations.length < 6) return;
    
    // Check for period-2 oscillators
    this.detectPeriodNOscillators(generations, width, height, 2);
    
    // Check for period-3 oscillators
    this.detectPeriodNOscillators(generations, width, height, 3);
  }
  
  /**
   * Detect oscillators with specific period
   * @param {Array} generations - Array of grid states
   * @param {Number} width - Grid width
   * @param {Number} height - Grid height
   * @param {Number} period - Oscillator period to detect
   */
  detectPeriodNOscillators(generations, width, height, period) {
    const len = generations.length;
    
    // We need at least 2*period generations to confirm an oscillator
    if (len < 2 * period) return;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip stable cells
        if (this.stableCells.has(`${x},${y}`)) continue;
        
        let isOscillator = true;
        const states = [];
        
        // Collect states for this cell over last 'period' generations
        for (let g = len - period; g < len; g++) {
          states.push(generations[g][y][x]);
        }
        
        // Check if the pattern repeats exactly with period 'period'
        for (let p = 0; p < period; p++) {
          // Compare with state 'period' generations ago
          if (generations[len - period - period + p][y][x] !== states[p]) {
            isOscillator = false;
            break;
          }
        }
        
        // If this is an oscillator and changes state (not just stable)
        if (isOscillator && !states.every(state => state === states[0])) {
          // Add to oscillator list
          this.oscillatorPatterns.push({
            x, y, period, states
          });
        }
      }
    }
  }
  
  /**
   * Analyze pattern complexity for musical interest
   * @param {Array} generations - Array of grid states
   * @returns {Object} - Analysis results
   */
  analyzeComplexity(generations) {
    if (!generations || generations.length === 0) {
      return { complexity: 0, entropy: 0, patterns: [] };
    }
    
    const lastGen = generations[generations.length - 1];
    const height = lastGen.length;
    const width = height > 0 ? lastGen[0].length : 0;
    
    // Count active cells
    let activeCells = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (lastGen[y][x] === 1) {
          activeCells++;
        }
      }
    }
    
    // Calculate cell entropy (randomness)
    const densityRatio = activeCells / (width * height);
    let entropy = 0;
    
    // Perfect entropy is at 50% density (maximum unpredictability)
    entropy = 1 - Math.abs(0.5 - densityRatio) * 2;
    
    // Detect pattern type (clusters, lines, oscillators)
    const { stableCells, oscillators } = this.detectOscillators(generations);
    
    // Calculate overall complexity score
    const oscillatorRatio = oscillators.length / (width * height);
    const stableRatio = stableCells.size / (width * height);
    
    // Higher complexity with moderate density and mix of oscillators and stable patterns
    const complexity = 
      (entropy * 0.5) + 
      (oscillatorRatio * 0.3) + 
      (stableRatio * 0.2);
    
    return {
      complexity: complexity,
      entropy: entropy,
      activeCellRatio: densityRatio,
      patterns: {
        stableCount: stableCells.size,
        oscillatorCount: oscillators.length
      }
    };
  }
}

export default PatternDetector;
