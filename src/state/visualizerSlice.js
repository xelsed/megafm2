import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  visualizationMode: 'pianoRoll',
  availableModes: ['pianoRoll', 'particleField', 'geometricObjects', 'cymatic', 'cellular'],
  colorScheme: 'spectrum',
  availableColorSchemes: ['spectrum', 'instrument', 'velocity', 'harmony', 'cellular'],
  cameraPosition: { x: 0, y: 0, z: 10 },
  playbackPosition: 0,
  historyLength: 10, // seconds of visual history to show
  showLabels: true,
  accessibilityMode: true,
  viewRange: {
    minPitch: 36, // C2
    maxPitch: 96, // C7
    timeWindow: 8 // seconds of future notes to display
  },
  noteSize: 1.0,
  noteTrailLength: 2.0,
  pulseEffect: true,
  autoRotate: false,
  enableBloom: true,
  cellVisibility: {
    birth: true,
    death: true,
    stable: true
  },
  gridStyle: 'wireframe',
  renderQuality: 'high',
};

// Map algorithms to preferred visualization modes
export const algorithmVisualizationMap = {
  fractal: 'pianoRoll',
  euclidean: 'particleField',
  cellular: 'cellular',
  ruleBasedHarmony: 'geometricObjects'
};

export const visualizerSlice = createSlice({
  name: 'visualizer',
  initialState,
  reducers: {
    setVisualizationMode: (state, action) => {
      state.visualizationMode = action.payload;
    },
    setColorScheme: (state, action) => {
      state.colorScheme = action.payload;
    },
    setCameraPosition: (state, action) => {
      state.cameraPosition = action.payload;
    },
    setPlaybackPosition: (state, action) => {
      state.playbackPosition = action.payload;
    },
    setHistoryLength: (state, action) => {
      state.historyLength = action.payload;
    },
    toggleLabels: (state) => {
      state.showLabels = !state.showLabels;
    },
    toggleAccessibilityMode: (state) => {
      state.accessibilityMode = !state.accessibilityMode;
    },
    setViewRange: (state, action) => {
      state.viewRange = { ...state.viewRange, ...action.payload };
    },
    setNoteSize: (state, action) => {
      state.noteSize = action.payload;
    },
    setNoteTrailLength: (state, action) => {
      state.noteTrailLength = action.payload;
    },
    togglePulseEffect: (state) => {
      state.pulseEffect = !state.pulseEffect;
    },
    toggleAutoRotate: (state) => {
      state.autoRotate = !state.autoRotate;
    },
    toggleBloom: (state) => {
      state.enableBloom = !state.enableBloom;
    },
    setCellVisibility: (state, action) => {
      state.cellVisibility = { ...state.cellVisibility, ...action.payload };
    },
    setGridStyle: (state, action) => {
      state.gridStyle = action.payload;
    },
    setRenderQuality: (state, action) => {
      state.renderQuality = action.payload;
    },
    // Helper function to automatically set visualization based on algorithm
    setVisualizationForAlgorithm: (state, action) => {
      const algorithm = action.payload;
      const recommendedMode = algorithmVisualizationMap[algorithm];
      if (recommendedMode) {
        state.visualizationMode = recommendedMode;
        
        // Also set appropriate color scheme based on algorithm
        if (algorithm === 'cellular') {
          state.colorScheme = 'cellular';
        } else if (algorithm === 'fractal') {
          state.colorScheme = 'spectrum';
        } else if (algorithm === 'ruleBasedHarmony') {
          state.colorScheme = 'harmony';
        }
      }
    }
  },
});

export const { 
  setVisualizationMode,
  setColorScheme,
  setCameraPosition,
  setPlaybackPosition,
  setHistoryLength,
  toggleLabels,
  toggleAccessibilityMode,
  setViewRange,
  setNoteSize,
  setNoteTrailLength,
  togglePulseEffect,
  toggleAutoRotate,
  toggleBloom,
  setCellVisibility,
  setGridStyle,
  setRenderQuality,
  setVisualizationForAlgorithm
} = visualizerSlice.actions;

export default visualizerSlice.reducer;