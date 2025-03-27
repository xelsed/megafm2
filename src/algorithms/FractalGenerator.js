/**
 * Fractal-based melody generator
 * Uses self-similar fractal patterns to create melodies with natural, recursive structures
 */
class FractalGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      seed: 42,
      complexity: 0.5,
      scale: 'major',
      rootNote: 60, // Middle C
      octaveRange: 2
    };
    
    // Define musical scales (as semitone intervals from root)
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 2, 4, 7, 9],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };
  }
  
  /**
   * Generate a sequence of notes using fractal algorithms
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    // Initialize random number generator with seed
    const seededRandom = this.seededRandom(this.parameters.seed);
    
    // Choose the scale to use
    const scaleIntervals = this.scales[this.parameters.scale] || this.scales.major;
    
    // Number of steps in the sequence (based on complexity)
    const sequenceLength = Math.floor(8 + this.parameters.complexity * 24);
    
    // Generate the Fractal Melody using Midpoint Displacement algorithm
    const fractalPoints = this.generateMidpointDisplacement(
      0.5, // Start normalized pitch
      0.5, // End normalized pitch
      sequenceLength, 
      this.parameters.complexity, 
      seededRandom
    );
    
    // Convert the fractal points to a musical sequence
    const sequence = fractalPoints.map((point, index) => {
      // Map the normalized point (0-1) to a scale degree
      // Ensure the index is within bounds of the scale array
      const scaleDegreeIndex = Math.min(Math.floor(point * scaleIntervals.length), scaleIntervals.length - 1);
      const scaleInterval = scaleIntervals[scaleDegreeIndex];
      
      // Calculate octave offset (-octaveRange/2 to +octaveRange/2)
      const octaveOffset = Math.floor(
        (point * this.parameters.octaveRange) - (this.parameters.octaveRange / 2)
      ) * 12;
      
      // Calculate the final MIDI note and ensure it's within MIDI note range (0-127)
      let pitch = this.parameters.rootNote + scaleInterval + octaveOffset;
      pitch = Math.min(127, Math.max(0, pitch)); // Clamp to valid MIDI range
      
      // Occasionally add a second note to create harmonies
      const hasHarmony = seededRandom() < 0.2 * this.parameters.complexity;
      let harmonyNotes = [];
      
      if (hasHarmony) {
        const harmonyIndex = (scaleDegreeIndex + 2) % scaleIntervals.length;
        const harmonyInterval = scaleIntervals[harmonyIndex];
        const harmonyPitch = this.parameters.rootNote + harmonyInterval + octaveOffset;
        harmonyNotes.push({ pitch: harmonyPitch, velocity: 80 + Math.floor(seededRandom() * 40) });
      }
      
      // Add some velocity variation
      const velocity = 80 + Math.floor(seededRandom() * 40);
      
      // Create the step with the notes
      return {
        step: index,
        time: index * 250, // milliseconds
        notes: [
          { pitch, velocity },
          ...harmonyNotes
        ]
      };
    });
    
    return sequence;
  }
  
  /**
   * Generate fractal curve using midpoint displacement
   * This creates a self-similar melody pattern with natural variation
   */
  generateMidpointDisplacement(startY, endY, steps, complexity, random) {
    if (steps <= 1) return [startY];
    
    const result = new Array(steps);
    result[0] = startY;
    result[steps - 1] = endY;
    
    // Recursively fill in points using midpoint displacement
    this.divideAndDisplace(result, 0, steps - 1, complexity, random);
    
    return result;
  }
  
  /**
   * Recursive function to implement midpoint displacement algorithm
   */
  divideAndDisplace(array, start, end, complexity, random) {
    if (end - start <= 1) return;
    
    const midpoint = Math.floor((start + end) / 2);
    const displacement = (random() - 0.5) * complexity * (end - start) / array.length;
    array[midpoint] = (array[start] + array[end]) / 2 + displacement;
    
    // Keep the value within bounds
    array[midpoint] = Math.max(0, Math.min(1, array[midpoint]));
    
    // Recursively process the sub-segments
    this.divideAndDisplace(array, start, midpoint, complexity, random);
    this.divideAndDisplace(array, midpoint, end, complexity, random);
  }
  
  /**
   * Improved seeded random number generator using Park-Miller algorithm
   * This provides better distribution properties than the simple LCG
   * @param {Number} seed - Random seed
   * @returns {Function} Function that returns a random number 0-1
   */
  seededRandom(seed) {
    // Ensure valid initial seed (non-zero)
    seed = seed || 1;
    const a = 16807;      // Multiplier
    const m = 2147483647; // Modulus (2^31 - 1, a prime number)
    
    return function() {
      // Calculate next value using Park-Miller algorithm
      seed = (a * seed) % m;
      
      // Normalize to 0-1 range with improved precision
      return seed / m;
    };
  }
}

export default FractalGenerator;