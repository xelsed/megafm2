/**
 * MusicMapper.js
 * Maps cellular automata states to musical notes and patterns
 */
class MusicMapper {
  constructor() {
    // Different scales to map cells to notes
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 2, 4, 7, 9],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
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
    
    // Use mid-range notes by default
    this.currentNotes = this.baseNotes.mid;
    this.currentScale = this.scales.pentatonic;
  }
  
  /**
   * Set the current scale to use for note mapping
   * @param {string} scaleName - Name of the scale to use
   */
  setScale(scaleName) {
    if (this.scales[scaleName]) {
      this.currentScale = this.scales[scaleName];
    }
    return this.currentScale;
  }
  
  /**
   * Set the base note range to use
   * @param {string} rangeName - Range name ('high', 'mid', or 'low')
   */
  setNoteRange(rangeName) {
    if (this.baseNotes[rangeName]) {
      this.currentNotes = this.baseNotes[rangeName];
    }
    return this.currentNotes;
  }
  
  /**
   * Map a 1D cellular automaton generation to notes
   * @param {Array} generation - 1D array of cell states
   * @param {Object} params - Mapping parameters
   * @returns {Object} - Step object with notes
   */
  map1DGenerationToNotes(generation, params, stepIndex) {
    const step = {
      step: stepIndex,
      time: stepIndex * (params.noteInterval || 250), // milliseconds
      notes: []
    };
    
    // Convert cell states to notes
    generation.forEach((cell, cellIndex) => {
      if (cell === 1) {
        // Use selected scale for note mapping
        const scale = this.currentScale;
        // Ensure noteIndex is within bounds of the scale
        const noteIndex = Math.min(Math.floor(cellIndex % scale.length), scale.length - 1);
        const scaleDegree = scale[noteIndex];
        
        // Get base note with bounds checking
        const baseNote = this.currentNotes && this.currentNotes.length > 0 
          ? this.currentNotes[0] 
          : 48; // Default to C3
        
        // Calculate octave offset based on cell position
        const octaveOffset = Math.floor(cellIndex / scale.length) * 12;
        
        // Calculate the actual MIDI note value
        const noteValue = baseNote + scaleDegree + octaveOffset;
        
        // Calculate velocity based on chosen mapping mode
        let velocity = 80; // Default velocity
        
        switch (params.velocityMap) {
          case 'distance':
            // Map velocity based on distance from center
            const center = Math.floor(generation.length / 2);
            const distance = Math.abs(cellIndex - center);
            const maxDistance = Math.max(center, generation.length - center);
            velocity = 127 - Math.floor((distance / maxDistance) * 80);
            break;
            
          case 'random':
            // Random velocity between 60-127
            velocity = 60 + Math.floor(Math.random() * 68);
            break;
            
          case 'cellular':
            // Try to use neighbors for velocity (if available)
            const prev = cellIndex > 0 ? generation[cellIndex - 1] : 0;
            const next = cellIndex < generation.length - 1 ? generation[cellIndex + 1] : 0;
            velocity = 80 + (prev + next) * 23; // Scale to reasonable MIDI velocity
            break;
            
          case 'linear':
          default:
            // Linear mapping across the row
            velocity = 70 + Math.floor((cellIndex / generation.length) * 57);
            break;
        }
        
        // Create note object
        step.notes.push({
          pitch: noteValue,
          velocity: Math.min(127, Math.max(1, velocity)),
          duration: params.noteDuration || 100,
          column: cellIndex,
          row: stepIndex,
          state: 'active'
        });
      }
    });
    
    return step;
  }
  
  /**
   * Map a 2D cellular automaton grid to a sequence of notes
   * @param {Array} grid - 2D array of cell states
   * @param {Object} params - Mapping parameters
   * @param {Array} cellChanges - List of cell state changes for enhanced mapping
   * @returns {Array} - Array of step objects with notes
   */
  map2DGridToSequence(grid, params, cellChanges = []) {
    const sequence = [];
    const { width, height } = { width: grid[0].length, height: grid.length };
    
    for (let y = 0; y < height; y++) {
      const step = {
        step: y,
        time: y * (params.noteInterval || 250),
        notes: []
      };
      
      // Find cells that are active in this row
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === 1) {
          // Map cell position to note parameters
          const scale = this.currentScale;
          
          // Use cell's X position to determine note in scale
          const noteInScale = x % scale.length;
          const scaleDegree = scale[noteInScale];
          
          // Use row to determine octave
          const octave = Math.floor(y / 4);
          
          // Calculate MIDI note
          const baseNote = this.currentNotes[0] || 48;
          const noteValue = baseNote + scaleDegree + (octave * 12);
          
          // Determine if this cell just changed state (for emphasis)
          const cellChange = cellChanges.find(change => 
            change.x === x && change.y === y
          );
          
          // Set velocity based on cell change status
          let velocity = 80; // Default
          
          if (cellChange && params.emphasizeBirths) {
            if (cellChange.type === 'birth') {
              velocity = 110; // Emphasize new cells
            } else if (cellChange.type === 'death') {
              continue; // Skip dead cells if we're emphasizing births
            }
          } else {
            // Use mapping strategy for velocity
            switch (params.velocityMap) {
              case 'distance':
                // Distance from center for spatial expression
                const centerX = Math.floor(width / 2);
                const centerY = Math.floor(height / 2);
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
                velocity = 127 - Math.floor((distance / maxDistance) * 80);
                break;
                
              case 'random':
                velocity = 60 + Math.floor(Math.random() * 68);
                break;
                
              case 'linear':
              default:
                // Map velocity based on x position
                velocity = 70 + Math.floor((x / width) * 57);
                break;
            }
          }
          
          // Add note to the step
          step.notes.push({
            pitch: noteValue,
            velocity: Math.min(127, Math.max(1, velocity)),
            duration: params.noteDuration || 100,
            column: x,
            row: y,
            state: cellChange ? cellChange.type : 'active'
          });
        }
      }
      
      // Add the step to our sequence (only if it has notes)
      if (step.notes.length > 0) {
        sequence.push(step);
      }
    }
    
    return sequence;
  }
  
  /**
   * Map multiple generations of cellular automata to a musical sequence
   * @param {Array} generations - Array of grid states
   * @param {Object} params - Mapping parameters
   * @param {Array} cellChanges - List of cell changes for enhanced mapping
   * @returns {Array} - Array of step objects with notes
   */
  mapGenerationsToSequence(generations, params, cellChanges = []) {
    // For 1D automata
    if (generations[0].length === undefined || typeof generations[0][0] !== 'object') {
      return generations.map((gen, index) => 
        this.map1DGenerationToNotes(gen, params, index)
      );
    }
    
    // For 2D automata (Game of Life)
    // Use the final grid state and cell changes for mapping
    const finalGrid = generations[generations.length - 1];
    return this.map2DGridToSequence(finalGrid, params, cellChanges);
  }
}

export default MusicMapper;
