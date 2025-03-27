/**
 * Waveshaper Music Generator
 * Creates musical patterns by applying waveshaping functions to create unique patterns
 * Inspired by the Buchla 259 Complex Waveform Generator and 252e Polyphonic Rhythm Generator
 */
class WaveshaperGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      waveform: 'sine',          // Base waveform: sine, triangle, square, saw, noise
      frequency: 4,              // Base frequency for the waveform (cycles within pattern)
      harmonics: 3,              // Number of harmonic overtones to add
      folding: 0.3,              // Amount of wavefolding/distortion
      quantize: true,            // Whether to quantize to a scale
      scale: 'pentatonic',       // Musical scale for pitch mapping
      baseNote: 60,              // Starting note (middle C)
      octaveRange: 2,            // Number of octaves to span
      density: 0.8,              // Note density (probability of steps having notes)
      length: 16                 // Number of steps in the sequence
    };
    
    // Define musical scales for note mapping
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
    
    // Cache for computed waveforms
    this.waveformCache = {};
    
    // Buchla-inspired waveshaping functions
    this.waveShapers = {
      fold: (x, amount) => this.waveFolder(x, amount),
      asymFold: (x, amount) => this.asymmetricFolder(x, amount),
      rectify: (x, amount) => this.rectifier(x, amount),
      saturate: (x, amount) => this.saturator(x, amount),
      chebyshev: (x, harmonics) => this.chebyshevWaveshaper(x, harmonics),
      buchla: (x, amount) => this.buchlaWaveFolder(x, amount)
    };
    
    // Probability curves for generative patterns
    this.probabilityCurves = {
      linear: t => t,
      ease: t => t * t * (3 - 2 * t),
      step: t => Math.floor(t * 4) / 3,
      sine: t => (Math.sin(t * Math.PI * 2 - Math.PI/2) + 1) / 2,
      buchla: t => {
        // Buchla-like probability curve with interesting steps
        const steps = [0, 0.25, 0.4, 0.8, 1];
        const index = Math.min(Math.floor(t * steps.length), steps.length - 1);
        const nextIndex = Math.min(index + 1, steps.length - 1);
        const frac = (t * steps.length) - index;
        return steps[index] * (1 - frac) + steps[nextIndex] * frac;
      }
    };
  }
  
  /**
   * Generate a sequence of notes based on waveshaping functions
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    const { waveform, frequency, harmonics, folding, quantize, scale, 
            baseNote, octaveRange, density, length } = this.parameters;
            
    // Generate waveform values for this sequence
    const waveValues = this.generateWaveValues(waveform, frequency, harmonics, folding, length);
    
    // Choose the scale to use for pitch quantization
    const scaleIntervals = this.scales[scale] || this.scales.pentatonic;
    
    // Generate steps from the waveform
    const sequence = [];
    
    for (let i = 0; i < length; i++) {
      const step = {
        step: i,
        time: i * 250, // milliseconds
        notes: []
      };
      
      // Get the waveform value at this step
      const value = waveValues[i];
      
      // Determine whether this step should have a note based on density
      if (this.shouldAddNote(i, value, density)) {
        // Map the waveform value to pitch
        let mappedValue;
        
        if (quantize) {
          // Quantize to the selected scale
          const scaleIndex = Math.floor(value * scaleIntervals.length);
          const interval = scaleIntervals[scaleIndex % scaleIntervals.length];
          
          // Map to octaves based on the value range
          const octaveOffset = Math.floor(value * octaveRange) * 12;
          mappedValue = baseNote + interval + octaveOffset;
        } else {
          // Continuous mapping (unquantized)
          mappedValue = baseNote + Math.floor(value * octaveRange * 12);
        }
        
        // Calculate velocity based on the waveform value
        const velocity = this.calculateVelocity(value, i, length);
        
        // Add the note to this step
        step.notes.push({
          pitch: mappedValue,
          velocity: velocity
        });
        
        // Add Buchla-inspired waveshaper harmonics
        if (this.shouldAddHarmonics(value, i)) {
          const harmonicIntervals = this.getHarmonicIntervals(value);
          
          // Add harmonic notes at calculated intervals
          harmonicIntervals.forEach(interval => {
            step.notes.push({
              pitch: mappedValue + interval,
              velocity: Math.max(1, velocity - 20) // Harmonics are quieter
            });
          });
        }
      }
      
      sequence.push(step);
    }
    
    return sequence;
  }
  
  /**
   * Generate values from a waveshaping function
   * @param {String} waveform - Type of base waveform
   * @param {Number} frequency - Frequency of the waveform
   * @param {Number} harmonics - Number of harmonics to add
   * @param {Number} folding - Amount of wavefold distortion
   * @param {Number} length - Number of steps to generate
   * @returns {Array} Array of waveform values in the 0-1 range
   */
  generateWaveValues(waveform, frequency, harmonics, folding, length) {
    // Check if we have cached this waveform configuration
    const cacheKey = `${waveform}-${frequency}-${harmonics}-${folding}-${length}`;
    if (this.waveformCache[cacheKey]) {
      return this.waveformCache[cacheKey];
    }
    
    const values = [];
    
    for (let i = 0; i < length; i++) {
      // Calculate the phase (0-1) for this step
      const phase = (i / length) * frequency;
      
      // Generate the base waveform value (-1 to 1 range)
      let value = this.generateBaseWaveform(waveform, phase);
      
      // Add harmonic overtones
      for (let h = 2; h <= harmonics; h++) {
        // Calculate harmonic value with decreasing amplitude by harmonic number
        const harmonicPhase = (phase * h) % 1;
        const harmonicValue = this.generateBaseWaveform(waveform, harmonicPhase) / h;
        value += harmonicValue;
      }
      
      // Normalize to -1 to 1 range after adding harmonics
      value = Math.max(-1, Math.min(1, value));
      
      // Apply waveshaping/folding
      if (folding > 0) {
        value = this.waveShapers.buchla(value, folding);
      }
      
      // Normalize to 0-1 range for final output
      value = (value + 1) / 2;
      
      values.push(value);
    }
    
    // Cache for future use
    this.waveformCache[cacheKey] = values;
    
    return values;
  }
  
  /**
   * Generate a basic waveform value for a given phase
   * @param {String} waveform - Type of waveform
   * @param {Number} phase - Phase (0-1)
   * @returns {Number} Waveform value (-1 to 1 range)
   */
  generateBaseWaveform(waveform, phase) {
    switch (waveform) {
      case 'sine':
        return Math.sin(phase * Math.PI * 2);
        
      case 'triangle':
        // Triangle wave formula
        return 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
        
      case 'square':
        return phase % 1 < 0.5 ? 1 : -1;
        
      case 'saw':
        // Sawtooth wave
        return 2 * (phase - Math.floor(phase + 0.5));
        
      case 'noise':
        // Random value, but consistent for same phase
        return Math.sin(phase * 100000) * 2 - 1;
        
      default:
        return Math.sin(phase * Math.PI * 2);
    }
  }
  
  /**
   * Wave folder function (Buchla-inspired)
   * Folds the waveform when it exceeds a threshold
   * @param {Number} value - Input value (-1 to 1)
   * @param {Number} amount - Amount of folding (0-1)
   * @returns {Number} Folded value (-1 to 1)
   */
  waveFolder(value, amount) {
    // Calculate threshold based on amount (smaller amount = more folding)
    const threshold = 1 - amount * 0.8;
    
    // Apply folding when value exceeds threshold
    if (value > threshold) {
      return threshold - (value - threshold);
    } else if (value < -threshold) {
      return -threshold + (-threshold - value);
    }
    
    return value;
  }
  
  /**
   * Asymmetric wave folder (more complex Buchla-like behavior)
   * @param {Number} value - Input value (-1 to 1)
   * @param {Number} amount - Amount of folding (0-1)
   * @returns {Number} Folded value (-1 to 1)
   */
  asymmetricFolder(value, amount) {
    // Different thresholds for positive and negative portions
    const posThreshold = 1 - amount * 0.8;
    const negThreshold = -0.7 + amount * 0.3;
    
    if (value > posThreshold) {
      return posThreshold - (value - posThreshold) * (1 + amount);
    } else if (value < negThreshold) {
      return negThreshold + (negThreshold - value) * (0.8 + amount * 0.4);
    }
    
    return value;
  }
  
  /**
   * Buchla wavefolder with complex transfer function
   * Based on the Buchla 259 wavefolder circuit
   * @param {Number} value - Input value (-1 to 1) 
   * @param {Number} amount - Amount of folding (0-1)
   * @returns {Number} Processed value (-1 to 1)
   */
  buchlaWaveFolder(value, amount) {
    // Calculate multiple fold points with increasing distortion
    const gain = 1 + amount * 3; // Higher gain = more folding
    value = value * gain;
    
    // Multiple fold algorithm with Buchla-like response
    // Approximating the complex Buchla transfer curve
    if (Math.abs(value) > 1) {
      const sign = Math.sign(value);
      const foldedValue = 2 - Math.abs(value % 2);
      value = sign * foldedValue;
      
      // Add subtle asymmetry like the original Buchla
      if (value > 0) {
        value *= 0.9 + amount * 0.1;
      }
    }
    
    // Apply soft saturation for analog-like character
    value = Math.tanh(value);
    
    return value;
  }
  
  /**
   * Rectifier function
   * @param {Number} value - Input value (-1 to 1)
   * @param {Number} amount - Amount of rectification (0-1) 
   * @returns {Number} Rectified value (-1 to 1)
   */
  rectifier(value, amount) {
    // Blend between full signal and half-wave rectified signal
    return value * (1 - amount) + Math.max(0, value) * amount;
  }
  
  /**
   * Saturator/distortion function
   * @param {Number} value - Input value (-1 to 1)
   * @param {Number} amount - Amount of saturation (0-1)
   * @returns {Number} Saturated value (-1 to 1)
   */
  saturator(value, amount) {
    // Apply graduated soft-clipping using tanh function
    return Math.tanh(value * (1 + amount * 5)) / (1 + amount * 0.5);
  }
  
  /**
   * Chebyshev waveshaper for harmonic generation
   * @param {Number} value - Input value (-1 to 1)
   * @param {Number} harmonics - Number of harmonics to generate
   * @returns {Number} Processed value (-1 to 1)
   */
  chebyshevWaveshaper(value, harmonics) {
    // Start with the input and first harmonic
    let result = value;
    
    // Add Chebyshev polynomial terms for harmonic generation
    // T_n(x) generates the nth harmonic when applied to a sine wave
    for (let n = 2; n <= harmonics; n++) {
      // Recursive definition of Chebyshev polynomials
      // T_n(x) = 2x * T_(n-1)(x) - T_(n-2)(x)
      const amplitude = 1 / n; // Decreasing amplitude for higher harmonics
      
      // For simplicity, approximate with the appropriate power
      // (not exactly Chebyshev but creates harmonics in a similar way)
      result += amplitude * Math.pow(value, n) * (n % 2 === 0 ? 1 : -1);
    }
    
    // Normalize the result to stay within -1 to 1
    return Math.max(-1, Math.min(1, result));
  }
  
  /**
   * Determine if a step should have a note based on value and density
   * @param {Number} step - Current step index
   * @param {Number} value - Waveform value at this step
   * @param {Number} density - Base note density (0-1)
   * @returns {Boolean} Whether this step should have a note
   */
  shouldAddNote(step, value, density) {
    // Use a probability curve that creates musically interesting patterns
    const probabilityCurve = this.probabilityCurves.buchla;
    
    // Base probability from the density parameter
    let probability = density;
    
    // Increase probability for steps that align with musical rhythm
    if (step % 4 === 0) {
      // Strong beats (every 4 steps) are more likely to have notes
      probability += 0.3;
    } else if (step % 2 === 0) {
      // Medium beats (every 2 steps) get a medium boost
      probability += 0.15;
    }
    
    // Modulate probability based on waveform value
    // High waveform values are more likely to trigger notes
    probability += probabilityCurve(value) * 0.2;
    
    // Ensure probability stays in 0-1 range
    probability = Math.min(1, Math.max(0, probability));
    
    // Determine if this step has a note
    return Math.random() < probability;
  }
  
  /**
   * Calculate velocity based on waveform value and step position
   * @param {Number} value - Waveform value at this step
   * @param {Number} step - Current step index
   * @param {Number} length - Total sequence length
   * @returns {Number} Velocity value (1-127)
   */
  calculateVelocity(value, step, length) {
    // Base velocity on waveform value (higher value = higher velocity)
    let velocity = 60 + Math.floor(value * 60); // 60-120 range
    
    // Apply groove template (subtle velocity variation by step)
    if (step % 4 === 0) {
      // Accents on downbeats
      velocity += 7;
    } else if (step % 2 === 0) {
      // Smaller accents on even beats
      velocity += 3;
    } else {
      // Slightly lower velocity on weak beats
      velocity -= 5;
    }
    
    // Ensure velocity is in valid MIDI range (1-127)
    return Math.max(1, Math.min(127, velocity));
  }
  
  /**
   * Determine if harmonics should be added to this step
   * @param {Number} value - Waveform value
   * @param {Number} step - Current step index
   * @returns {Boolean} Whether to add harmonic notes
   */
  shouldAddHarmonics(value, step) {
    // More likely to add harmonics on strong beats and high values
    let probability = 0.2; // Base probability
    
    // Increase for strong beats
    if (step % 4 === 0) {
      probability += 0.3;
    }
    
    // Increase for high waveform values
    if (value > 0.7) {
      probability += 0.3;
    }
    
    return Math.random() < probability;
  }
  
  /**
   * Calculate harmonic intervals based on waveform value
   * @param {Number} value - Waveform value at this step
   * @returns {Array} Array of semitone intervals for harmonics
   */
  getHarmonicIntervals(value) {
    const intervals = [];
    
    // Higher values can have more complex harmonies
    if (value > 0.8) {
      // Major chord with 7th
      intervals.push(4, 7, 11);
    } else if (value > 0.6) {
      // Major chord
      intervals.push(4, 7);
    } else if (value > 0.4) {
      // Minor chord
      intervals.push(3, 7);
    } else if (value > 0.2) {
      // Perfect fifth
      intervals.push(7);
    } else {
      // Octave
      intervals.push(12);
    }
    
    return intervals;
  }
}

export default WaveshaperGenerator;