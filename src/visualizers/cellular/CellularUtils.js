/**
 * Utility functions for cellular automata visualizations
 */

/**
 * Maps MIDI pitch to note name (e.g., 60 -> "C4")
 * @param {number} pitch - MIDI pitch number
 * @returns {string} Note name with octave
 */
export function getPitchName(pitch) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  const noteName = noteNames[pitch % 12];
  return `${noteName}${octave}`;
}

/**
 * Calculates cell index from column and row in a grid
 * @param {number} column - Column (x) position
 * @param {number} row - Row (y) position
 * @param {number} gridWidth - Width of the grid in cells
 * @param {boolean} is2D - Whether the grid is 2D or 1D with history
 * @returns {number} The index of the cell in a flat array
 */
export function getCellIndex(column, row, gridWidth, is2D = true) {
  if (is2D) {
    // 2D grid: cells are stored in row-major order [0,0], [1,0], [2,0], ..., [0,1], [1,1], ...
    return row * gridWidth + column;
  } else {
    // 1D mode with history also uses row-major order
    return row * gridWidth + column;
  }
}

/**
 * Creates a placeholder pattern for testing visualization
 * @param {number} gridWidth - Width of the grid
 * @param {number} gridHeight - Height of the grid
 * @returns {Array} Array of cells with positions and states
 */
export function createTestPattern(gridWidth, gridHeight) {
  const cells = [];
  
  // Center cross pattern
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  
  cells.push(
    { column: centerX, row: centerY, state: 'active', velocity: 100 },
    { column: centerX - 1, row: centerY, state: 'active', velocity: 100 },
    { column: centerX + 1, row: centerY, state: 'active', velocity: 100 },
    { column: centerX, row: centerY - 1, state: 'active', velocity: 100 },
    { column: centerX, row: centerY + 1, state: 'active', velocity: 100 }
  );
  
  // Add corners
  cells.push(
    { column: 0, row: 0, state: 'active', velocity: 100 },
    { column: gridWidth-1, row: 0, state: 'active', velocity: 100 },
    { column: 0, row: gridHeight-1, state: 'active', velocity: 100 },
    { column: gridWidth-1, row: gridHeight-1, state: 'active', velocity: 100 }
  );
  
  // Add some diagonal cells
  for (let i = 0; i < Math.max(gridWidth, gridHeight); i += 2) {
    if (i < gridWidth && i < gridHeight) {
      cells.push({ column: i, row: i, state: 'birth', velocity: 127 });
    }
    if (i < gridWidth && (gridHeight-1-i) >= 0) {
      cells.push({ column: i, row: gridHeight-1-i, state: 'harmony', velocity: 100 });
    }
  }
  
  return cells;
}

/**
 * Detects oscillator patterns in cell history
 * @param {Array} history - Array of 0s and 1s representing cell activity
 * @returns {Object} Information about detected patterns
 */
export function detectOscillator(history) {
  // Only check for oscillation if we have enough history
  if (!history || history.length < 3) {
    return { isOscillator: false, period: 0 };
  }
  
  // Simple detection of period-2 oscillator (blinker)
  const pattern2 = JSON.stringify([0, 1, 0]);
  const pattern2Alt = JSON.stringify([1, 0, 1]);
  const historyString = JSON.stringify(history);
  
  if (historyString === pattern2 || historyString === pattern2Alt) {
    return { isOscillator: true, period: 2 };
  }
  
  // Could add more oscillator pattern detection here
  
  return { isOscillator: false, period: 0 };
}

/**
 * Calculate grid dimensions and offsets for visualization
 * @param {number} size - Grid width (columns)
 * @param {number} height - Grid height (rows) 
 * @param {number} spacing - Space between cells
 * @param {boolean} is2D - Whether grid is 2D or 1D with history
 * @returns {Object} Grid dimensions and offsets
 */
export function calculateGridDimensions(size, height, spacing, is2D = true) {
  if (is2D) {
    const gridWidth = size * spacing;
    const gridHeight = height * spacing;
    const offsetX = -gridWidth / 2 + spacing / 2;
    const offsetZ = -gridHeight / 2 + spacing / 2;
    
    return { gridWidth, gridHeight, offsetX, offsetZ };
  } else {
    // 1D mode with history
    const gridWidth = size * spacing;
    const gridDepth = 32 * spacing; // Show 32 generations for 1D automaton
    const offsetX = -gridWidth / 2 + spacing / 2;
    const offsetZ = -gridDepth / 2 + spacing / 2;
    
    return { gridWidth, gridHeight: gridDepth, offsetX, offsetZ };
  }
}