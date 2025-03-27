/**
 * Rule-Based Harmony Generator
 * Creates chord progressions and harmonies based on music theory rules
 * Supports different progressions, chord types, and voicings
 */
class HarmonyGenerator {
  constructor(parameters) {
    this.parameters = parameters || {
      progression: 'ii-V-I',  // Chord progression type
      keycenter: 'C',         // Key center
      chord: 'maj7',          // Chord type
      voicing: 'drop2',       // Chord voicing
    };

    // Define root notes for each key center (C = 60 = middle C)
    this.keyRoots = {
      'C': 60,
      'C#': 61, 'Db': 61,
      'D': 62,
      'D#': 63, 'Eb': 63,
      'E': 64,
      'F': 65,
      'F#': 66, 'Gb': 66,
      'G': 67,
      'G#': 68, 'Ab': 68,
      'A': 69,
      'A#': 70, 'Bb': 70,
      'B': 71
    };
    
    // Define scale degrees for major and minor keys
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11], // Ionian
      minor: [0, 2, 3, 5, 7, 8, 10]  // Natural Minor / Aeolian
    };
    
    // Define chord types as intervals from root
    this.chordTypes = {
      'maj': [0, 4, 7],           // Major triad
      'min': [0, 3, 7],           // Minor triad
      'dim': [0, 3, 6],           // Diminished triad
      'aug': [0, 4, 8],           // Augmented triad
      'maj7': [0, 4, 7, 11],      // Major 7th
      'min7': [0, 3, 7, 10],      // Minor 7th
      'dom7': [0, 4, 7, 10],      // Dominant 7th
      'dim7': [0, 3, 6, 9],       // Diminished 7th
      'half-dim7': [0, 3, 6, 10], // Half-diminished 7th
      'sus4': [0, 5, 7],          // Suspended 4th
      'sus2': [0, 2, 7],          // Suspended 2nd
      'add9': [0, 4, 7, 14],      // Add 9
      '6': [0, 4, 7, 9],          // Major 6th
      'm6': [0, 3, 7, 9],         // Minor 6th
      '9': [0, 4, 7, 10, 14]      // Dominant 9th
    };
    
    // Define common chord progressions (roman numeral notation)
    this.progressions = {
      'ii-V-I': ['ii', 'V', 'I'],
      'I-IV-V': ['I', 'IV', 'V'],
      'I-V-vi-IV': ['I', 'V', 'vi', 'IV'],
      'vi-IV-I-V': ['vi', 'IV', 'I', 'V'],
      'I-vi-IV-V': ['I', 'vi', 'IV', 'V'],
      'Circle': ['I', 'IV', 'vii', 'iii', 'vi', 'ii', 'V', 'I'],
      'Canon': ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V']
    };
    
    // Roman numeral to scale degree mapping
    this.romanNumerals = {
      'I': 0,
      'ii': 1,
      'iii': 2,
      'IV': 3,
      'V': 4,
      'vi': 5,
      'vii': 6
    };
    
    // Chord qualities for different scale degrees in major
    this.degreeMajorQualities = {
      0: 'maj7',  // I
      1: 'min7',  // ii
      2: 'min7',  // iii
      3: 'maj7',  // IV
      4: 'dom7',  // V
      5: 'min7',  // vi
      6: 'half-dim7'  // vii
    };
    
    // Chord qualities for different scale degrees in minor
    this.degreeMinorQualities = {
      0: 'min7',  // i
      1: 'half-dim7', // ii
      2: 'maj7',  // III
      3: 'min7',  // iv
      4: 'min7',  // v
      5: 'maj7',  // VI
      6: 'dom7'   // VII
    };
  }
  
  /**
   * Generate a harmonic sequence based on a chord progression
   * @returns {Array} Array of step objects with notes
   */
  generate() {
    const { progression, keycenter, chord, voicing } = this.parameters;
    
    // Get the progression pattern
    const progressionPattern = this.progressions[progression] || this.progressions['ii-V-I'];
    
    // Determine if we're in a major or minor key
    const isMinor = keycenter.toLowerCase().includes('m');
    const scale = isMinor ? this.scales.minor : this.scales.major;
    const degreeQualities = isMinor ? this.degreeMinorQualities : this.degreeMajorQualities;
    
    // Get the root note for the key
    const keyRoot = this.keyRoots[keycenter.replace('m', '')] || this.keyRoots['C'];
    
    // Generate a sequence of chords based on the progression
    const sequence = [];
    const beatsPerChord = 4; // How many beats to hold each chord
    
    progressionPattern.forEach((romanNumeral, progressionIndex) => {
      // Get the scale degree from the roman numeral
      const degree = this.romanNumerals[romanNumeral];
      
      // Calculate the root note of this chord based on scale degree
      const chordRoot = keyRoot + scale[degree];
      
      // Determine the chord quality (use the parameter or the default for the degree)
      const chordQuality = this.parameters.chord === 'auto' ? 
        degreeQualities[degree] : this.parameters.chord;
      
      // Get the intervals for this chord type
      const chordIntervals = this.chordTypes[chordQuality] || this.chordTypes['maj7'];
      
      // Generate the chord notes in the specified voicing
      const chordNotes = this.voiceChord(chordRoot, chordIntervals, voicing);
      
      // Create a step for each beat within this chord
      for (let beat = 0; beat < beatsPerChord; beat++) {
        const step = {
          step: progressionIndex * beatsPerChord + beat,
          time: (progressionIndex * beatsPerChord + beat) * 250, // milliseconds
          notes: []
        };
        
        // On the first beat, play the full chord
        if (beat === 0) {
          chordNotes.forEach(note => {
            step.notes.push({
              pitch: note,
              velocity: 90 // Fixed velocity for all chord notes
            });
          });
        } 
        // On other beats, maybe add some arpeggiation or movement
        else if (beat === 2) {
          // Just play the root and fifth
          step.notes.push({
            pitch: chordNotes[0],
            velocity: 80
          });
          
          if (chordNotes.length > 2) {
            step.notes.push({
              pitch: chordNotes[2],
              velocity: 70
            });
          }
        }
        
        sequence.push(step);
      }
    });
    
    return sequence;
  }
  
  /**
   * Voice a chord in a specific voicing style
   * @param {Number} root - Root note MIDI number
   * @param {Array} intervals - Array of intervals from the root
   * @param {String} voicingType - Type of voicing to apply
   * @returns {Array} MIDI note numbers for the voiced chord
   */
  voiceChord(root, intervals, voicingType) {
    let notes = intervals.map(interval => root + interval);
    
    // Apply different voicing transformations
    switch (voicingType) {
      case 'drop2':
        // Drop 2 voicing: take the second note from the top and drop it an octave
        if (notes.length >= 4) {
          const secondFromTop = notes[notes.length - 2];
          notes.splice(notes.length - 2, 1); // Remove it
          notes.unshift(secondFromTop - 12); // Add it an octave lower at the beginning
        }
        break;
        
      case 'drop3':
        // Drop 3 voicing: take the third note from the top and drop it an octave
        if (notes.length >= 4) {
          const thirdFromTop = notes[notes.length - 3];
          notes.splice(notes.length - 3, 1); // Remove it
          notes.unshift(thirdFromTop - 12); // Add it an octave lower at the beginning
        }
        break;
        
      case 'spread':
        // Spread voicing: Adjust octaves to spread the chord wider
        if (notes.length >= 3) {
          notes[0] = notes[0]; // Root stays
          notes[1] = notes[1] + 12; // Third up an octave
          if (notes.length >= 4) {
            notes[3] = notes[3] + 12; // Seventh up an octave if present
          }
        }
        break;
        
      case 'shell':
        // Shell voicing: Just root, 3rd, and 7th (no 5th)
        if (notes.length >= 4) {
          notes = [notes[0], notes[1], notes[3]]; // Root, 3rd, 7th
        }
        break;
        
      case 'close':
      default:
        // Close voicing: notes already in close position, no change needed
        break;
    }
    
    return notes;
  }
}

export default HarmonyGenerator;