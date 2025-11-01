/**
 * MarkovGenerator.js
 * Implements a Markov chain-based generator for probabilistic musical sequences
 */
class MarkovGenerator {
  constructor(parameters = {}) {
    // Create a copy of the parameters to avoid modifying the original
    this.parameters = {
      // Default parameters
      order: 1,               // Markov chain order (context length)
      length: 16,             // Sequence length
      baseNote: 60,           // Middle C
      scale: 'major',         // Scale to quantize notes to
      density: 0.8,           // Note density
      octaveRange: 2,         // Range in octaves
      patternType: 'melody',  // melody, rhythm, harmony
      learningPattern: 'ascendDescend', // Training pattern
      randomness: 0.3,        // Amount of randomness to inject
      
      // Override defaults with provided parameters
      ...parameters
    };
    
    // Markov transition matrix - stores probabilities of moving from one note to another
    this.transitionMatrix = this.buildTransitionMatrix();
    
    // Sequence state
    this.currentState = [];
    for (let i = 0; i < this.parameters.order; i++) {
      this.currentState.push(this.parameters.baseNote);
    }
  }
  
  /**
   * Build the transition matrix based on learning patterns
   */
  buildTransitionMatrix() {
    const matrix = new Map();
    const learningSequence = this.createLearningSequence();
    
    // Build transition matrix from the learning sequence
    for (let i = 0; i < learningSequence.length - this.parameters.order; i++) {
      // Create a context key from the current sequence window
      const context = [];
      for (let j = 0; j < this.parameters.order; j++) {
        context.push(learningSequence[i + j]);
      }
      
      const contextKey = context.join(',');
      const nextNote = learningSequence[i + this.parameters.order];
      
      // Initialize or update the transition map for this context
      if (!matrix.has(contextKey)) {
        matrix.set(contextKey, new Map());
      }
      
      const transitions = matrix.get(contextKey);
      transitions.set(nextNote, (transitions.get(nextNote) || 0) + 1);
    }
    
    // Convert counts to probabilities
    for (const [context, transitions] of matrix.entries()) {
      let total = 0;
      for (const count of transitions.values()) {
        total += count;
      }
      
      for (const [note, count] of transitions.entries()) {
        transitions.set(note, count / total);
      }
    }
    
    return matrix;
  }
  
  /**
   * Create a sequence to learn from based on the learningPattern parameter
   */
  createLearningSequence() {
    const { learningPattern, baseNote, octaveRange } = this.parameters;
    let sequence = [];
    
    switch (learningPattern) {
      case 'ascendDescend': {
        // Create an ascending/descending pattern
        const notesPerOctave = 12;
        const range = octaveRange * notesPerOctave;
        
        // Ascending
        for (let i = 0; i < range; i++) {
          sequence.push(baseNote + i);
        }
        
        // Descending
        for (let i = range - 1; i >= 0; i--) {
          sequence.push(baseNote + i);
        }
        break;
      }
      
      case 'jazzChords': {
        // Jazz chord progression (ii-V-I in different inversions)
        const jazzProgression = [
          // ii minor 7th
          [baseNote + 2, baseNote + 5, baseNote + 9, baseNote + 12],
          // V dominant 7th
          [baseNote + 7, baseNote + 11, baseNote + 14, baseNote + 17],
          // I major 7th
          [baseNote, baseNote + 4, baseNote + 7, baseNote + 11],
          // Different inversions and variations
          [baseNote + 5, baseNote + 9, baseNote + 12, baseNote + 14],
          [baseNote + 11, baseNote + 14, baseNote + 17, baseNote + 21],
          [baseNote + 4, baseNote + 7, baseNote + 11, baseNote + 14]
        ];
        
        // Flatten the chord progression into a sequence
        jazzProgression.forEach(chord => {
          // Add the chord tones and some passing tones
          sequence.push(...chord);
          // Add some chromatic approach notes
          sequence.push(chord[0] - 1, chord[1] + 1, chord[2] - 2, chord[3] + 2);
        });
        break;
      }
      
      case 'pentatonic': {
        // Pentatonic scale patterns (using 0, 2, 4, 7, 9 pattern in major pentatonic)
        const pentatonicOffsets = [0, 2, 4, 7, 9];
        
        // Create variations across octaves
        for (let octave = 0; octave < octaveRange; octave++) {
          // Ascending pattern
          pentatonicOffsets.forEach(offset => {
            sequence.push(baseNote + octave * 12 + offset);
          });
          
          // Descending pattern
          for (let i = pentatonicOffsets.length - 1; i >= 0; i--) {
            sequence.push(baseNote + octave * 12 + pentatonicOffsets[i]);
          }
          
          // Skip pattern
          sequence.push(
            baseNote + octave * 12 + pentatonicOffsets[0],
            baseNote + octave * 12 + pentatonicOffsets[2],
            baseNote + octave * 12 + pentatonicOffsets[1],
            baseNote + octave * 12 + pentatonicOffsets[3],
            baseNote + octave * 12 + pentatonicOffsets[4],
            baseNote + octave * 12 + pentatonicOffsets[2]
          );
        }
        break;
      }
      
      case 'fibonacci': {
        // Use Fibonacci numbers as intervals
        const fibIntervals = [1, 1, 2, 3, 5, 8, 13];
        let currentNote = baseNote;
        
        // Generate sequence using Fibonacci intervals
        for (let i = 0; i < 24; i++) {
          sequence.push(currentNote);
          // Use modulo to keep within a reasonable range
          const interval = fibIntervals[i % fibIntervals.length];
          // Alternate ascending and descending
          if (i % 2 === 0) {
            currentNote += interval;
          } else {
            currentNote -= interval;
          }
          
          // Keep within octave range
          if (currentNote > baseNote + octaveRange * 12) {
            currentNote = baseNote + octaveRange * 12;
          } else if (currentNote < baseNote - 12) {
            currentNote = baseNote - 12;
          }
        }
        break;
      }
      
      default: {
        // Default simple pattern
        const notesPerOctave = 12;
        for (let i = 0; i < octaveRange * notesPerOctave; i++) {
          sequence.push(baseNote + i);
        }
      }
    }
    
    return sequence;
  }
  
  /**
   * Get the next note based on current state and transition matrix
   */
  getNextNote() {
    const contextKey = this.currentState.join(',');
    
    // Handle case where context is not in the matrix
    if (!this.transitionMatrix.has(contextKey)) {
      // Fall back to a random note in our scale
      return this.getRandomNoteInScale();
    }
    
    const transitions = this.transitionMatrix.get(contextKey);
    
    // Apply randomness factor - sometimes choose random note instead of following matrix
    if (Math.random() < this.parameters.randomness) {
      return this.getRandomNoteInScale();
    }
    
    // Choose next note based on transition probabilities
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (const [note, probability] of transitions.entries()) {
      cumulativeProbability += probability;
      if (rand < cumulativeProbability) {
        return parseInt(note);
      }
    }
    
    // Fallback to first note in transitions if something goes wrong
    return parseInt(Array.from(transitions.keys())[0]);
  }
  
  /**
   * Get a random note quantized to the current scale
   */
  getRandomNoteInScale() {
    const { baseNote, octaveRange, scale } = this.parameters;
    const scaleOffsets = this.getScaleOffsets(scale);
    
    // Random octave in range
    const octave = Math.floor(Math.random() * (octaveRange + 1));
    
    // Random note from scale
    const scaleIndex = Math.floor(Math.random() * scaleOffsets.length);
    const note = baseNote + (octave * 12) + scaleOffsets[scaleIndex];
    
    return note;
  }
  
  /**
   * Get note offsets for the specified scale
   */
  getScaleOffsets(scale) {
    const scales = {
      'major': [0, 2, 4, 5, 7, 9, 11],
      'minor': [0, 2, 3, 5, 7, 8, 10],
      'pentatonic': [0, 2, 4, 7, 9],
      'blues': [0, 3, 5, 6, 7, 10],
      'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'wholetone': [0, 2, 4, 6, 8, 10],
      'diminished': [0, 2, 3, 5, 6, 8, 9, 11],
      'harmonicminor': [0, 2, 3, 5, 7, 8, 11],
      'dorian': [0, 2, 3, 5, 7, 9, 10]
    };
    
    return scales[scale] || scales.major;
  }
  
  /**
   * Generate a sequence of notes based on the Markov model
   */
  generate() {
    const sequence = [];
    const { length, density, patternType } = this.parameters;
    
    // Initialize sequence for different pattern types
    for (let step = 0; step < length; step++) {
      // Determine if this step should have a note based on density
      const hasNote = Math.random() < density;
      
      if (hasNote) {
        const nextNote = this.getNextNote();
        
        // Update current state (remove oldest, add newest)
        this.currentState.shift();
        this.currentState.push(nextNote);
        
        // Store the note with metadata
        const velocity = Math.floor(70 + Math.random() * 40); // Random velocity between 70-110
        
        // Pattern-specific behavior
        switch (patternType) {
          case 'melody': {
            // Single notes with varying velocity
            sequence.push({
              notes: [{ pitch: nextNote, velocity, column: step, row: nextNote % 12 }]
            });
            break;
          }
          
          case 'harmony': {
            // Generate harmonized chords based on the current note
            const chordNotes = this.generateChord(nextNote);
            sequence.push({
              notes: chordNotes.map((pitch, idx) => ({
                pitch,
                velocity: idx === 0 ? velocity : velocity - 20, // Lower velocity for harmony notes
                column: step,
                row: idx,
                state: idx === 0 ? 'active' : 'harmony'
              }))
            });
            break;
          }
          
          case 'rhythm': {
            // Rhythmic patterns with accent on certain beats
            const isAccent = step % 4 === 0; // Accent on beats 0, 4, 8, 12
            const rhythmVelocity = isAccent ? velocity + 20 : velocity - 10;
            
            sequence.push({
              notes: [{
                pitch: nextNote,
                velocity: Math.min(127, Math.max(1, rhythmVelocity)),
                column: step,
                row: 0,
                state: isAccent ? 'birth' : 'active'
              }]
            });
            break;
          }
          
          default:
            // Default behavior - single notes
            sequence.push({
              notes: [{ pitch: nextNote, velocity, column: step, row: 0 }]
            });
        }
      } else {
        // Rest - no notes for this step
        sequence.push({ notes: [] });
      }
    }
    
    return sequence;
  }
  
  /**
   * Generate a chord based on the given root note
   */
  generateChord(rootNote) {
    const { scale } = this.parameters;
    const scaleOffsets = this.getScaleOffsets(scale);
    const rootIndex = rootNote % 12;
    
    // Find index of root in scale
    const positionInScale = scaleOffsets.indexOf(rootIndex % 12);
    
    // If root isn't in scale, adjust to nearest scale tone
    const adjustedRoot = positionInScale >= 0 
      ? rootNote 
      : rootNote - (rootIndex % 12) + scaleOffsets[0];
    
    // Different chord types based on scale degree
    const chordTypes = {
      'major': [0, 4, 7], // Major triad
      'minor': [0, 3, 7], // Minor triad
      'dominant7': [0, 4, 7, 10], // Dominant 7th
      'major7': [0, 4, 7, 11], // Major 7th
      'minor7': [0, 3, 7, 10], // Minor 7th
      'diminished': [0, 3, 6], // Diminished triad
      'augmented': [0, 4, 8] // Augmented triad
    };
    
    // Determine chord type based on root position in scale
    let chordType;
    if (scale === 'major') {
      // Chord qualities in major key by degree
      const chordQualities = ['major', 'minor', 'minor', 'major', 'dominant7', 'minor', 'diminished'];
      chordType = chordQualities[positionInScale >= 0 ? positionInScale % chordQualities.length : 0];
    } else if (scale === 'minor') {
      // Chord qualities in minor key by degree
      const chordQualities = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'dominant7'];
      chordType = chordQualities[positionInScale >= 0 ? positionInScale % chordQualities.length : 0];
    } else {
      // Default to major or minor based on scale
      chordType = scale.includes('minor') ? 'minor' : 'major';
    }
    
    // Generate chord from root note and intervals
    return chordTypes[chordType].map(interval => adjustedRoot + interval);
  }
}

export default MarkovGenerator;