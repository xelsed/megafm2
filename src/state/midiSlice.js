import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connected: false,
  output: null,
  input: null,
  availableOutputs: [],
  activeNotes: [],
  errorMessage: null,
};

export const midiSlice = createSlice({
  name: 'midi',
  initialState,
  reducers: {
    midiDevicesDetected: (state, action) => {
      state.availableOutputs = action.payload.outputs || [];
    },
    midiConnected: (state, action) => {
      state.connected = true;
      state.output = action.payload.output;
      state.input = action.payload.input;
      state.errorMessage = null;
    },
    midiDisconnected: (state) => {
      state.connected = false;
      state.output = null;
      state.input = null;
    },
    midiError: (state, action) => {
      state.errorMessage = action.payload;
    },
    selectMidiOutput: (state, action) => {
      state.output = action.payload.output;
      state.input = action.payload.input;
      state.connected = !!action.payload.output;
      state.errorMessage = null;
    },
    noteOn: (state, action) => {
      const { note, velocity, column, row, state: noteState } = action.payload;
      state.activeNotes.push({ 
        note, 
        velocity, 
        column, 
        row, 
        state: noteState || 'active',
        timestamp: Date.now() 
      });
    },
    noteOff: (state, action) => {
      const { note } = action.payload;
      state.activeNotes = state.activeNotes.filter(n => n.note !== note);
    },
    clearNotes: (state) => {
      state.activeNotes = [];
    },
  },
});

export const { 
  midiDevicesDetected,
  midiConnected, 
  midiDisconnected, 
  midiError,
  selectMidiOutput,
  noteOn, 
  noteOff, 
  clearNotes 
} = midiSlice.actions;

export default midiSlice.reducer;