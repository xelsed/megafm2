import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentAlgorithm: 'fractal',
  algorithms: {
    fractal: {
      enabled: true,
      parameters: {
        seed: 42,
        complexity: 0.5,
        scale: 'major',
        rootNote: 60,
        octaveRange: 2,
      }
    },
    euclidean: {
      enabled: false,
      parameters: {
        steps: 16,
        fills: 4,
        rotation: 0,
        bpm: 120,
      }
    },
    cellular: {
      enabled: false,
      parameters: {
        rule: 30,                 // Cellular automaton rule (0-255) for 1D mode
        type: '1D',               // Type of cellular automaton: '1D' or 'gameOfLife'
        initialCondition: 'center', // Initial state: center, random, custom, glider, etc.
        width: 16,                // Width of the automaton grid
        height: 16,               // Height for 2D grid (Game of Life)
        threshold: 0.5,           // Threshold for converting cells to notes
        iterations: 32,           // Number of iterations to evolve the automaton
        density: 0.3,             // Initial cell density for random patterns
        velocityMap: 'linear',    // How to map cell position to velocity: linear, distance, random
        harmonies: true,          // Whether to generate harmony notes
        emphasizeBirths: true,    // Whether to emphasize newly born cells with higher velocity
        noteRange: 'mid',         // Pitch range: low, mid, high
        scale: 'pentatonic',      // Musical scale to use for mapping
        performanceMode: 'auto',  // Performance level: low, medium, high, auto
        buchlaMode: false,        // Buchla 252e-inspired sequencing mode
        preferredPatterns: ['buchla']  // Preferred patterns for initialization
      }
    },
    sequential: {
      enabled: false,
      parameters: {
        sequence: 'fibonacci',    // Type of sequence: fibonacci, pi, prime, buchla
        length: 16,               // Number of steps to generate
        baseNote: 60,             // Base note (middle C)
        scale: 'pentatonic',      // Scale to use for note mapping
        octaveRange: 2,           // Number of octaves to span
        rhythmDensity: 0.7,       // Density of generated rhythms (0-1)
        accentPattern: '4/4'      // Rhythmic accent pattern (e.g. '4/4', '3/4', '5/8')
      }
    },
    waveshaper: {
      enabled: false,
      parameters: {
        waveform: 'sine',         // Base waveform: sine, triangle, square, saw, noise
        frequency: 4,             // Base frequency for the waveform (cycles within pattern)
        harmonics: 3,             // Number of harmonic overtones to add
        folding: 0.3,             // Amount of wavefolding/distortion
        quantize: true,           // Whether to quantize to a scale
        scale: 'pentatonic',      // Musical scale for pitch mapping
        baseNote: 60,             // Starting note (middle C)
        octaveRange: 2,           // Number of octaves to span
        density: 0.8,             // Note density (probability of steps having notes)
        length: 16                // Number of steps in the sequence
      }
    },
    ruleBasedHarmony: {
      enabled: false,
      parameters: {
        progression: 'ii-V-I',
        keycenter: 'C',
        chord: 'maj7',
        voicing: 'drop2',
      }
    }
  },
  isPlaying: false,
  tempo: 120,
  noteInterval: 250, // ms between notes
  availablePatterns: [
    'random', 'blinker', 'glider', 'pulsar', 
    'gosperGliderGun', 'acorn', 'exploder', 
    'buchla', 'spaceships', 'pentadecathlon'
  ],
  availableScales: [
    'major', 'minor', 'pentatonic', 'blues', 'chromatic',
    'wholetone', 'diminished', 'harmonicminor', 'dorian'
  ]
};

export const algorithmSlice = createSlice({
  name: 'algorithm',
  initialState,
  reducers: {
    setCurrentAlgorithm: (state, action) => {
      state.currentAlgorithm = action.payload;
    },
    updateAlgorithmParameter: (state, action) => {
      const { algorithm, parameter, value } = action.payload;
      state.algorithms[algorithm].parameters[parameter] = value;
    },
    toggleAlgorithm: (state, action) => {
      const algorithm = action.payload;
      state.algorithms[algorithm].enabled = !state.algorithms[algorithm].enabled;
    },
    setTempo: (state, action) => {
      state.tempo = action.payload;
      state.noteInterval = 60000 / action.payload / 4; // 16th notes
    },
    setPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
  },
});

export const { 
  setCurrentAlgorithm, 
  updateAlgorithmParameter, 
  toggleAlgorithm, 
  setTempo,
  setPlaying,
} = algorithmSlice.actions;

export default algorithmSlice.reducer;