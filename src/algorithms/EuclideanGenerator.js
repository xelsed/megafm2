/**
 * Euclidean Rhythm Generator
 * Generates rhythmic patterns based on the Euclidean algorithm,
 * which evenly distributes beats across a sequence length
 * 
 * Popularized by Godfried Toussaint in his paper 
 * "The Euclidean Algorithm Generates Traditional Musical Rhythms"
 */
class EuclideanGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      steps: 16,      // Total steps in the pattern
      fills: 4,       // Number of active beats to distribute
      rotation: 0,    // Pattern rotation
      bpm: 120,       // Tempo in beats per minute
    };
    
    // Drum kit note mapping (General MIDI drum map)
    this.drumNotes = {
      kick: 36,       // Bass drum
      snare: 38,      // Snare drum
      hihat: 42,      // Closed hi-hat
      openHat: 46,    // Open hi-hat
      ride: 51,       // Ride cymbal
      clap: 39,       // Hand clap
      tom1: 48,       // High tom
      tom2: 45,       // Low tom
    };
    
    // Set of percussion instruments to generate patterns for
    this.instruments = [
      { name: 'kick', note: this.drumNotes.kick, velocity: 100 },
      { name: 'snare', note: this.drumNotes.snare, velocity: 90 },
      { name: 'hihat', note: this.drumNotes.hihat, velocity: 80 },
      { name: 'clap', note: this.drumNotes.clap, velocity: 85 },
    ];
  }
  
  /**
   * Generate a rhythmic sequence using the Euclidean algorithm
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    const { steps, fills, rotation } = this.parameters;
    
    // Generate Euclidean patterns for each instrument with different fill values
    const patterns = {
      kick: this.generateEuclideanPattern(steps, Math.ceil(fills * 0.75), rotation),
      snare: this.generateEuclideanPattern(steps, Math.ceil(fills * 0.5), (rotation + steps / 2) % steps),
      hihat: this.generateEuclideanPattern(steps, fills * 2, rotation),
      clap: this.generateEuclideanPattern(steps, Math.ceil(fills * 0.25), (rotation + steps / 4) % steps),
    };
    
    // Convert patterns to a sequence of steps with notes
    const sequence = [];
    for (let i = 0; i < steps; i++) {
      const step = {
        step: i,
        time: i * 250, // milliseconds
        notes: []
      };
      
      // Add notes for each instrument if the pattern has a beat at this step
      this.instruments.forEach(instrument => {
        if (patterns[instrument.name][i]) {
          step.notes.push({
            pitch: instrument.note,
            velocity: instrument.velocity + Math.floor(Math.random() * 20) - 10 // Add slight velocity variation
          });
        }
      });
      
      sequence.push(step);
    }
    
    return sequence;
  }
  
  /**
   * Generate an Euclidean rhythm pattern
   * @param {Number} steps - Total number of steps
   * @param {Number} fills - Number of active beats to distribute
   * @param {Number} rotation - Pattern rotation
   * @returns {Array} Binary array where 1 represents a beat and 0 represents a rest
   */
  generateEuclideanPattern(steps, fills, rotation) {
    if (steps <= 0 || fills <= 0) return [];
    
    // Ensure fills doesn't exceed steps
    fills = Math.min(fills, steps);
    
    // Initialize pattern array
    let pattern = new Array(steps).fill(0);
    
    // Calculate the positions of the beats
    const positions = [];
    for (let i = 0; i < fills; i++) {
      positions.push(Math.floor(i * steps / fills));
    }
    
    // Set the beats in the pattern
    positions.forEach(pos => {
      pattern[pos] = 1;
    });
    
    // Apply rotation if specified
    if (rotation > 0) {
      rotation = rotation % steps;
      pattern = [...pattern.slice(rotation), ...pattern.slice(0, rotation)];
    }
    
    return pattern;
  }
  
  /**
   * Bjorklund's algorithm for Euclidean distribution
   * More accurate than the naive approach above, but more complex
   */
  bjorklundAlgorithm(steps, fills) {
    // Edge cases
    if (fills === 0) return new Array(steps).fill(0);
    if (fills >= steps) return new Array(steps).fill(1);
    
    const pattern = [];
    const counts = [];
    const remainders = [];
    
    remainders.push(fills);
    let level = 0;
    
    // Perform Euclidean division
    while (true) {
      counts.push(Math.floor((steps - remainders[level]) / remainders[level]));
      remainders.push((steps - remainders[level]) % remainders[level]);
      
      if (remainders[level + 1] <= 1) break;
      level++;
    }
    
    counts.push(steps - remainders[level]);
    
    // Build the pattern
    let i = level;
    pattern.push(new Array(remainders[level + 1]).fill([1]));
    pattern.push(new Array(counts[level + 1] - (remainders[level + 1] === 0 ? 0 : 1)).fill([0]));
    
    // Combine sequences
    while (i > 0) {
      pattern[0] = pattern[0].concat(pattern[1]);
      pattern.splice(1, 1);
      i--;
    }
    
    // Flatten the pattern
    return pattern[0].flat();
  }
}

export default EuclideanGenerator;