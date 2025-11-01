/**
 * Application Constants
 * Central location for configuration values
 */

// Audio Configuration
export const AUDIO_CONFIG = {
  // Synthesis settings
  MAX_POLYPHONY: 12,
  MASTER_VOLUME: 0.5,
  SAMPLE_RATE: 44100,

  // MIDI settings
  MEGAFM_CHANNEL: 1,
  MIDI_VELOCITY_RANGE: 127,

  // Performance settings
  AUDIO_CONTEXT_LATENCY: 'interactive', // 'interactive', 'balanced', or 'playback'
};

// VR Configuration
export const VR_CONFIG = {
  // Controller settings
  RAYCAST_DISTANCE: 3,
  CONTROLLER_MODEL: 'default',

  // UI positioning
  PANEL_DISTANCE: 2,
  PANEL_HEIGHT: 1.5,
  PANEL_WIDTH: 2,

  // Interaction
  HAPTIC_INTENSITY: 0.5,
  HAPTIC_DURATION: 100,
};

// Visualization Configuration
export const VISUAL_CONFIG = {
  // Performance levels
  PERFORMANCE: {
    LOW: {
      particles: 500,
      objects: 50,
      shadows: false,
      dpr: 1
    },
    MEDIUM: {
      particles: 1500,
      objects: 150,
      shadows: true,
      dpr: 1.5
    },
    HIGH: {
      particles: 3000,
      objects: 300,
      shadows: true,
      dpr: 2
    }
  },

  // Color schemes
  COLOR_SCHEMES: {
    spectrum: 'Spectrum',
    harmony: 'Harmony',
    velocity: 'Velocity',
    instrument: 'Instrument'
  },

  // Timing
  NOTE_DISPLAY_DURATION: 8000, // ms
  FPS_TARGET: 60
};

// Algorithm Configuration
export const ALGORITHM_CONFIG = {
  // Available algorithms
  TYPES: [
    'fractal',
    'euclidean',
    'cellular',
    'sequential',
    'waveshaper',
    'ruleBasedHarmony'
  ],

  // Tempo settings
  MIN_TEMPO: 40,
  MAX_TEMPO: 240,
  DEFAULT_TEMPO: 120,

  // Sequence settings
  MIN_STEPS: 4,
  MAX_STEPS: 64,
  DEFAULT_STEPS: 16
};

// Musical Scale Configuration
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// MIDI Note Configuration
export const MIDI_CONFIG = {
  MIN_NOTE: 21,  // A0
  MAX_NOTE: 108, // C8
  MIDDLE_C: 60,
  A440: 69,

  // Note names
  NOTE_NAMES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
};

// FM Synthesis Algorithms
export const FM_ALGORITHMS = {
  1: 'Serial Chain (4→3→2→1)',
  2: 'Parallel (All Independent)',
  3: 'Dual Pairs (4→3, 2→1)',
  4: 'One Modulator (4→All)',
  5: 'Three Carriers + Mod',
  6: 'Dual Modulators',
  7: 'Single Mod + 3 Carriers',
  8: 'Feedback Chain'
};

// Platform Detection
export const PLATFORM = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: /Android/.test(navigator.userAgent),
  supportsWebMIDI: typeof navigator.requestMIDIAccess === 'function',
  supportsWebXR: 'xr' in navigator,
  supportsWebAudio: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
};

// Error Messages
export const ERROR_MESSAGES = {
  AUDIO: {
    NO_CONTEXT: 'Failed to create Audio Context. Your browser may not support Web Audio API.',
    INIT_FAILED: 'Audio initialization failed. Please reload the page.',
    NO_MIDI: 'MIDI is not supported on this platform. Using Web Audio fallback.',
    NO_OUTPUT: 'No MIDI output device found.',
  },
  VR: {
    NOT_SUPPORTED: 'WebXR is not supported on this device.',
    SESSION_FAILED: 'Failed to start VR session.',
  },
  GENERAL: {
    UNKNOWN: 'An unknown error occurred.',
  }
};

export default {
  AUDIO_CONFIG,
  VR_CONFIG,
  VISUAL_CONFIG,
  ALGORITHM_CONFIG,
  SCALES,
  MIDI_CONFIG,
  FM_ALGORITHMS,
  PLATFORM,
  ERROR_MESSAGES
};
