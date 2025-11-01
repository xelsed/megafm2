/**
 * RuleEngine.js
 * Implements cellular automaton rule application logic
 */
class RuleEngine {
  /**
   * Apply a 1D cellular automaton rule to the current state
   * @param {Array} currentState - Current 1D array of cell states
   * @param {Number} rule - Rule number (0-255)
   * @returns {Array} - New state after applying the rule
   */
  apply1DRule(currentState, rule) {
    const width = currentState.length;
    const newState = new Array(width).fill(0);
    
    // Convert rule to binary representation for lookup
    const ruleBin = rule.toString(2).padStart(8, '0');
    
    for (let i = 0; i < width; i++) {
      // Get the cell and its neighbors, handling edge cases
      const left = i === 0 ? 0 : currentState[i - 1];
      const center = currentState[i];
      const right = i === width - 1 ? 0 : currentState[i + 1];
      
      // Calculate the rule index (0-7) based on the 3-cell neighborhood
      const idx = (left << 2) | (center << 1) | right;
      
      // Apply the rule
      newState[i] = parseInt(ruleBin[7 - idx], 10);
    }
    
    return newState;
  }
  
  /**
   * Apply Game of Life rules to a 2D grid
   * @param {AutomatonGrid} grid - Grid object containing current state
   * @returns {Array} - New 2D grid after applying Game of Life rules
   */
  applyGameOfLifeRules(grid) {
    const currentGrid = grid.getGrid();
    const height = currentGrid.length;
    const width = currentGrid[0].length;
    
    // Create a new grid for the next generation
    const newGrid = Array(height).fill().map(() => Array(width).fill(0));
    const cellChanges = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Count live neighbors
        let neighbors = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue; // Skip the cell itself
            
            const nx = x + dx;
            const ny = y + dy;
            
            // Check bounds and count live neighbors
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && currentGrid[ny][nx] === 1) {
              neighbors++;
            }
          }
        }
        
        // Apply Conway's Game of Life rules
        if (currentGrid[y][x] === 1) {
          // Live cell
          if (neighbors < 2 || neighbors > 3) {
            // Cell dies (underpopulation or overpopulation)
            newGrid[y][x] = 0;
            cellChanges.push({ x, y, type: 'death' });
          } else {
            // Cell survives
            newGrid[y][x] = 1;
          }
        } else {
          // Dead cell
          if (neighbors === 3) {
            // Cell becomes alive (reproduction)
            newGrid[y][x] = 1;
            cellChanges.push({ x, y, type: 'birth' });
          } else {
            // Cell stays dead
            newGrid[y][x] = 0;
          }
        }
      }
    }
    
    return { newGrid, cellChanges };
  }
  
  /**
   * Evolve a grid for a specified number of generations
   * @param {AutomatonGrid} grid - Grid object to evolve
   * @param {Number} generations - Number of generations to evolve
   * @returns {Array} - Array of cell changes during evolution
   */
  evolveGrid(grid, generations) {
    let allChanges = [];
    
    for (let i = 0; i < generations; i++) {
      const { newGrid, cellChanges } = this.applyGameOfLifeRules(grid);
      grid.addGeneration(newGrid);
      allChanges = [...allChanges, ...cellChanges];
    }
    
    return allChanges;
  }
  
  /**
   * Evolve a 1D automaton for a specified number of generations
   * @param {AutomatonGrid} grid - Grid object containing 1D states
   * @param {Number} rule - Rule number (0-255)
   * @param {Number} generations - Number of generations to evolve
   */
  evolve1D(grid, rule, generations) {
    let currentState = grid.getGrid()[0];
    
    for (let i = 0; i < generations; i++) {
      const newState = this.apply1DRule(currentState, rule);
      grid.addGeneration([newState]);
      currentState = newState;
    }
    
    return grid.getGenerations();
  }
}

export default RuleEngine;
