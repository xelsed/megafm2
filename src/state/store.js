import { configureStore } from '@reduxjs/toolkit';
import midiReducer from './midiSlice';
import algorithmReducer from './algorithmSlice';
import visualizerReducer from './visualizerSlice';

// Create empty reducers if they don't exist yet
const emptyReducer = (state = {}, action) => state;

export const store = configureStore({
  reducer: {
    midi: midiReducer || emptyReducer,
    algorithm: algorithmReducer || emptyReducer,
    visualizer: visualizerReducer || emptyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});