/**
 * AutomatonGrid.js
 * Manages the grid structure for cellular automata
 */
class AutomatonGrid {
  constructor(width, height) {
    this.width = width || 16;
    this.height = height || 16;
    this.grid = [];
    this.generations = [];
    this.currentGeneration = 0;
  }

  /**
   * Initialize the grid with a specific pattern
   * @param {string} initialCondition - Type of initial pattern ('center', 'random', etc.)
   * @param {number} density - Cell density for random patterns
   */
  initialize(initialCondition, density = 0.3) {
    // Reset state
    this.generations = [];
    this.currentGeneration = 0;

    if (initialCondition === 'center') {
      this.initializeCenterCell();
    } else if (initialCondition === 'random') {
      this.initializeRandom(density);
    } else if (initialCondition === 'glider') {
      this.initializeGlider();
    } else {
      // Default to center cell
      this.initializeCenterCell();
    }

    // Store initial state
    this.generations.push(this.grid.map(row => [...row]));
    return this.grid;
  }

  /**
   * Initialize with a single active cell in the center
   */
  initializeCenterCell() {
    this.grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    this.grid[centerY][centerX] = 1;
  }

  /**
   * Initialize with random active cells based on density
   */
  initializeRandom(density) {
    this.grid = Array(this.height).fill().map(() => 
      Array(this.width).fill().map(() => Math.random() < density ? 1 : 0)
    );
  }

  /**
   * Initialize with a glider pattern (for Game of Life)
   */
  initializeGlider() {
    this.grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
    
    // Place a glider in the top-left
    const startX = Math.floor(this.width / 4);
    const startY = Math.floor(this.height / 4);
    
    // Glider pattern
    if (startY + 2 < this.height && startX + 2 < this.width) {
      this.grid[startY][startX+1] = 1;
      this.grid[startY+1][startX+2] = 1;
      this.grid[startY+2][startX] = 1;
      this.grid[startY+2][startX+1] = 1;
      this.grid[startY+2][startX+2] = 1;
    }
  }

  /**
   * Initialize a 1D array of cells for 1D cellular automata
   */
  initialize1D(width, initialCondition) {
    let state = new Array(width).fill(0);
    
    if (initialCondition === 'center') {
      state[Math.floor(width / 2)] = 1;
    } else if (initialCondition === 'random') {
      state = state.map(() => Math.random() < 0.3 ? 1 : 0);
    } else if (initialCondition === 'single') {
      state[0] = 1;
    } else {
      state[Math.floor(width / 2)] = 1;
    }
    
    this.grid = [state];
    this.generations = [state];
    return state;
  }

  /**
   * Get the current generation number
   */
  getCurrentGeneration() {
    return this.currentGeneration;
  }

  /**
   * Get the full history of generations
   */
  getGenerations() {
    return this.generations;
  }

  /**
   * Get the latest grid state
   */
  getGrid() {
    return this.grid;
  }

  /**
   * Add a new generation to the history and update current grid
   */
  addGeneration(newGrid) {
    this.grid = newGrid;
    this.generations.push(newGrid.map(row => [...row]));
    this.currentGeneration++;
    
    // Limit memory usage by keeping only recent generations
    if (this.generations.length > 20) {
      this.generations.shift();
    }
  }

  /**
   * Get cell value at specific coordinates
   */
  getCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[y][x];
    }
    return 0; // Default to 0 for out-of-bounds
  }
}

export default AutomatonGrid;
