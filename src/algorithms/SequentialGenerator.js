/**
 * Sequential Pattern Generator
 * Generates music based on mathematical sequences like Fibonacci, Pi digits, and others
 * Inspired by the Buchla 252e Polyphonic Rhythm Generator
 */
class SequentialGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      sequence: 'fibonacci',   // Type of sequence: fibonacci, pi, prime, buchla
      length: 16,             // Number of steps to generate
      baseNote: 60,           // Base note (middle C)
      scale: 'pentatonic',    // Scale to use for note mapping
      octaveRange: 2,         // Number of octaves to span
      rhythmDensity: 0.7,     // Density of generated rhythms (0-1)
      accentPattern: '4/4'    // Rhythmic accent pattern (e.g. '4/4', '3/4', '5/8')
    };
    
    // Define musical scales
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
    
    // Buchla-inspired accent patterns
    this.accentPatterns = {
      '4/4': [1, 0, 0.5, 0, 0.7, 0, 0.5, 0, 1, 0, 0.5, 0, 0.7, 0, 0.5, 0],
      '3/4': [1, 0, 0.5, 1, 0, 0.5, 1, 0, 0.5, 1, 0, 0.5],
      '5/4': [1, 0, 0.7, 0, 0.5, 1, 0, 0.7, 0, 0.5, 1, 0, 0.7, 0, 0.5, 1, 0, 0.7, 0, 0.5],
      '7/8': [1, 0, 0.7, 1, 0, 1, 0.7, 0, 0.5, 1, 0, 0.7, 0.5],
      '5/8': [1, 0, 0.7, 0, 0.5, 1, 0, 0.7, 0, 0.5],
      'complex': [1, 0, 0.7, 0, 0.3, 0, 0.8, 0, 0.5, 0, 0.6, 0, 1, 0, 0.4, 0]
    };
    
    // Fibonacci sequence cache
    this.fibonacciCache = [0, 1];
    
    // Pi digits for musical mappings (first 100 digits)
    this.piDigits = [
      3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 
      4, 3, 3, 8, 3, 2, 7, 9, 5, 0, 2, 8, 8, 4, 1, 9, 7, 1, 6, 9, 3, 9, 9, 3, 7,
      5, 1, 0, 5, 8, 2, 0, 9, 7, 4, 9, 4, 4, 5, 9, 2, 3, 0, 7, 8, 1, 6, 4, 0, 6, 
      2, 8, 6, 2, 0, 8, 9, 9, 8, 6, 2, 8, 0, 3, 4, 8, 2, 5, 3, 4, 2, 1, 1, 7, 0
    ];
    
    // Prime numbers for musical mapping (first 40 primes)
    this.primes = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
      73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 
      163, 167, 173
    ];
    
    // Buchla-inspired rhythmic patterns (step durations)
    this.buchlaPatterns = {
      pulses: [2, 3, 4, 5, 7, 8, 16],
      stages: [1, 2, 3, 5, 8, 13, 21],
      offsets: [0, 1, 2, 3, 5, 8]  
    };
  }
  
  /**
   * Generate a sequence of notes based on mathematical sequences
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    const { sequence, length, baseNote, scale, octaveRange, 
            rhythmDensity, accentPattern } = this.parameters;
    
    // Choose the scale to use
    const scaleIntervals = this.scales[scale] || this.scales.pentatonic;
    
    // Generate the numerical sequence
    const sequenceValues = this.generateSequence(sequence, length);
    
    // Get the accent pattern
    const accents = this.accentPatterns[accentPattern] || this.accentPatterns['4/4'];
    
    // Generate steps for the sequence
    const result = [];
    
    // Convert sequence to musical notes
    for (let i = 0; i < length; i++) {
      const step = {
        step: i,
        time: i * 250, // milliseconds
        notes: []
      };
      
      // Determine if this step should have a note (based on rhythmDensity)
      if (Math.random() < this.getStepProbability(i, sequenceValues, rhythmDensity)) {
        // Map sequence value to a musical note
        const value = sequenceValues[i % sequenceValues.length];
        
        // Calculate pitch from sequence value
        const normalizedValue = this.normalizeValue(value, sequenceValues);
        
        // Map to scale degree
        const scaleDegree = Math.floor(normalizedValue * scaleIntervals.length);
        const interval = scaleIntervals[scaleDegree % scaleIntervals.length];
        
        // Calculate octave shift (sequence values can determine octave shifts)
        const octaveShift = Math.floor(normalizedValue * octaveRange) * 12;
        
        // Calculate final pitch
        const pitch = baseNote + interval + octaveShift;
        
        // Get velocity based on accent pattern
        const accentValue = accents[i % accents.length];
        let velocity;
        
        if (accentValue > 0.8) {
          // Strong accent
          velocity = 100 + Math.floor(Math.random() * 27); // 100-127
        } else if (accentValue > 0.4) {
          // Medium accent
          velocity = 80 + Math.floor(Math.random() * 20); // 80-100
        } else if (accentValue > 0) {
          // Light accent
          velocity = 60 + Math.floor(Math.random() * 20); // 60-80
        } else {
          // No accent (ghost note)
          velocity = 30 + Math.floor(Math.random() * 30); // 30-60
        }
        
        // Add the note to this step
        step.notes.push({
          pitch: pitch,
          velocity: velocity
        });
        
        // Sometimes add harmonized notes based on sequence patterns
        if (this.shouldAddHarmony(value, i, sequenceValues)) {
          // Add harmony based on sequence values
          const harmonyOffset = this.getHarmonyInterval(value, sequenceValues);
          step.notes.push({
            pitch: pitch + harmonyOffset,
            velocity: Math.max(40, velocity - 20) // Slightly quieter harmony
          });
        }
      }
      
      result.push(step);
    }
    
    return result;
  }
  
  /**
   * Generate mathematical sequence based on the selected type
   * @param {String} type - Type of sequence (fibonacci, pi, etc.)
   * @param {Number} length - Length of sequence to generate
   * @returns {Array} Array of sequence values
   */
  generateSequence(type, length) {
    switch (type) {
      case 'fibonacci':
        return this.generateFibonacci(length);
        
      case 'pi':
        return this.piDigits.slice(0, length);
        
      case 'prime':
        return this.generatePrimeSequence(length);
        
      case 'buchla':
        return this.generateBuchlaSequence(length);
        
      default:
        return this.generateFibonacci(length);
    }
  }
  
  /**
   * Generate Fibonacci sequence up to the required length
   * @param {Number} length - Number of Fibonacci numbers to generate
   * @returns {Array} Array of Fibonacci numbers
   */
  generateFibonacci(length) {
    // Use cached values if available
    if (this.fibonacciCache.length >= length) {
      return this.fibonacciCache.slice(0, length);
    }
    
    // Calculate remaining Fibonacci numbers
    while (this.fibonacciCache.length < length) {
      const next = this.fibonacciCache[this.fibonacciCache.length - 1] + 
                 this.fibonacciCache[this.fibonacciCache.length - 2];
      this.fibonacciCache.push(next);
    }
    
    return this.fibonacciCache.slice(0, length);
  }
  
  /**
   * Generate a sequence based on prime numbers
   * @param {Number} length - Length of sequence to generate
   * @returns {Array} Array of prime-based values
   */
  generatePrimeSequence(length) {
    // Use modulo to ensure we have enough values even for long sequences
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.primes[i % this.primes.length]);
    }
    return result;
  }
  
  /**
   * Generate a Buchla-inspired sequence with interesting mathematical properties
   * Similar to the Buchla 252e Polyphonic Rhythm Generator
   * @param {Number} length - Length of sequence to generate
   * @returns {Array} Array of values with Buchla-like rhythm patterns
   */
  generateBuchlaSequence(length) {
    const result = [];
    
    // Create a sequence with multiple superimposed patterns, inspired by Buchla 252e
    const pulseA = this.buchlaPatterns.pulses[Math.floor(Math.random() * this.buchlaPatterns.pulses.length)];
    const pulseB = this.buchlaPatterns.pulses[Math.floor(Math.random() * this.buchlaPatterns.pulses.length)];
    const stage = this.buchlaPatterns.stages[Math.floor(Math.random() * this.buchlaPatterns.stages.length)];
    
    // Generate the sequence
    for (let i = 0; i < length; i++) {
      // Combine multiple patterns to create complex rhythms
      const valueA = i % pulseA;
      const valueB = i % pulseB;
      const valueC = i % stage;
      
      // Combine in a way that creates interesting patterns
      const combinedValue = (valueA * valueB + valueC) % 12;
      result.push(combinedValue);
    }
    
    return result;
  }
  
  /**
   * Normalize a value within a sequence to the 0-1 range
   * @param {Number} value - Value to normalize
   * @param {Array} sequence - Full sequence for finding min/max
   * @returns {Number} Normalized value between 0-1
   */
  normalizeValue(value, sequence) {
    const min = Math.min(...sequence);
    const max = Math.max(...sequence);
    const range = max - min;
    
    // Avoid division by zero
    if (range === 0) return 0.5;
    
    return (value - min) / range;
  }
  
  /**
   * Calculate probability of a step having a note based on sequence values and position
   * @param {Number} step - Current step index
   * @param {Array} sequence - Sequence values
   * @param {Number} density - Base rhythm density
   * @returns {Number} Probability (0-1) of this step having a note
   */
  getStepProbability(step, sequence, density) {
    // Base probability from density parameter
    let probability = density;
    
    // Modulate probability based on sequence values
    const seqValue = sequence[step % sequence.length];
    const normalizedValue = this.normalizeValue(seqValue, sequence);
    
    // Increase probability for steps that align with the sequence pattern
    if (step % 4 === 0) {
      // Downbeats are more likely to have notes
      probability += 0.3;
    } else if (normalizedValue > 0.7) {
      // High sequence values also increase probability
      probability += 0.2;
    }
    
    // Ensure probability stays in 0-1 range
    return Math.min(1, Math.max(0, probability));
  }
  
  /**
   * Determine if a harmony note should be added
   * @param {Number} value - Current sequence value
   * @param {Number} step - Current step index
   * @param {Array} sequence - Full sequence
   * @returns {Boolean} True if harmony should be added
   */
  shouldAddHarmony(value, step, sequence) {
    // Calculate harmony probability based on sequence values and step position
    // Buchla-inspired approach where harmonies happen at specific pattern points
    
    const normalizedValue = this.normalizeValue(value, sequence);
    
    // More likely to add harmonies on strong beats and for high sequence values
    if (step % 4 === 0 && normalizedValue > 0.6) {
      return Math.random() < 0.8; // 80% chance on strong beats with high values
    } else if (normalizedValue > 0.8) {
      return Math.random() < 0.6; // 60% chance for very high sequence values
    } else {
      return Math.random() < 0.3; // 30% chance otherwise
    }
  }
  
  /**
   * Calculate harmony interval based on sequence value
   * @param {Number} value - Current sequence value
   * @param {Array} sequence - Full sequence
   * @returns {Number} Semitone interval for harmony note
   */
  getHarmonyInterval(value, sequence) {
    // Use sequence values to determine musical intervals
    const normalizedValue = this.normalizeValue(value, sequence);
    
    // Map to common harmony intervals (more musical than random intervals)
    if (normalizedValue < 0.2) {
      return 3; // Minor third
    } else if (normalizedValue < 0.4) {
      return 4; // Major third
    } else if (normalizedValue < 0.6) {
      return 7; // Perfect fifth
    } else if (normalizedValue < 0.8) {
      return 12; // Octave
    } else {
      return 5; // Perfect fourth
    }
  }
}

export default SequentialGenerator;