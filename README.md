# MEGAfm Music Generator

A browser-based 3D music generation tool that interfaces with the MEGAfm hardware synthesizer, offering algorithmic music generation with immersive visualization.

## Features

### Algorithmic Music Generation
- Multiple algorithmic techniques (Cellular Automata, Fractal, Euclidean Rhythms, Rule-based Harmony)
- Real-time parameter control and evolution
- Music theory-aware generation with scale/chord constraints

### 3D Visualization
- Interactive 3D representation of musical structures
- Multiple visualization modes for different algorithms
- Customizable color schemes and visual parameters
- Accessibility features for deaf/hard-of-hearing users
- Modular visualization architecture for extensibility

### MEGAfm Hardware Integration
- Comprehensive control of all MEGAfm synthesis parameters
- Advanced voice mode controls with visual feedback
- Envelope looping with forward and ping-pong modes
- Rate scaling for piano-like envelope response
- MPE (MIDI Polyphonic Expression) support
- Preset browsing and management
- Algorithm visualization with interactive diagrams

## Getting Started

1. Connect your MEGAfm synthesizer via MIDI
2. Start the application
3. Select an algorithm and adjust parameters
4. Use the visualization controls to customize the visual representation
5. Explore the MEGAfm tabs to access advanced synthesis features

## Architecture

The application uses:
- React and Vite for UI
- Redux for state management
- Three.js with React Three Fiber for 3D visualization
- Web MIDI API for MIDI connectivity

The visualizers follow a modular architecture:
- Main visualizer components (CellularVisualizer, PianoRollVisualizer, etc.)
- Shared utility components in subdirectories (e.g., /visualizers/cellular/)
- Performance optimization for different devices

## MEGAfm Controls

### Global Controls
- Algorithm selection with interactive visualization
- Feedback control
- Voice mode selection
- Vibrato rate and depth

### Operator Controls
- Individual control over 4 FM operators
- Total level, multiplier, and detune settings
- Rate scaling for frequency-dependent envelopes

### Envelope Controls
- Full ADSR parameter control
- Envelope looping with forward and ping-pong modes
- Rate scaling for piano-like envelope response
- Visual representation of envelope shapes and loop regions

### Voice Mode Controls
- Poly12: 12-voice polyphony with alternating stereo allocation
- Wide modes: 6, 4, or 3 voice modes with detuning
- Dual Ch3: Special mode for experimental sounds
- Unison: All voices in unison with detuning
- Auto Chord: Automatic chord generation from single notes
- MPE support for expressive continuous control
- Fat/detune control with semitone/octave range selection
- Glide/portamento control
- Visual representation of voice allocation

### LFO Controls
- 3 independent LFOs with rate and depth control
- Multiple waveform options
- Retrigger and loop settings
- Modulation routing to any parameter

### Preset Management
- Browse and select from 600 presets across 6 banks
- Save and recall your own preset creations

## Project Structure

```
/
├── src/
│   ├── algorithms/ - Music generation algorithms
│   ├── components/ - UI components
│   ├── midi/ - MIDI connection utilities
│   ├── state/ - Redux state management
│   └── visualizers/ - Visual representations
│       └── cellular/ - Cellular visualizer components
│           ├── CellMaterial.jsx - Cell appearance and transitions
│           ├── CellGrid.jsx - Grid layout and effects
│           ├── HoverTooltip.jsx - Interactive tooltips
│           └── CellularUtils.js - Helper functions
└── public/ - Static assets
```

## Technical Details
- Built with React, Redux, and Three.js
- Uses Web MIDI API for hardware communication
- Implements cellular automata, fractal algorithms, and other generative techniques
- 3D rendering with customizable visual elements for each musical parameter

## Accessibility

This application has been designed with accessibility in mind, particularly for deaf or hard-of-hearing users:
- Visual representations of all musical aspects
- Color coding for note types and patterns
- Motion and position to indicate timing and pitch
- Customizable visual intensity and complexity