# MEGAfm Music Generator

A browser-based 3D music generation tool that interfaces with the MEGAfm hardware synthesizer, offering algorithmic music generation with immersive visualization. **Now with VR support and Android compatibility!**

## 🆕 New Features (v2.0)

### 🥽 VR Support
- **Full WebXR Integration**: Experience generative music in virtual reality
- **VR Controllers**: Interact with controls using hand tracking or controllers
- **Immersive Visualizations**: All visualization modes work in stereoscopic 3D
- **Supported Devices**: Meta Quest, PC VR (SteamVR), and any WebXR-compatible headset

### 📱 Android Support (No MIDI Required)
- **Web Audio Fallback**: Built-in FM synthesizer for mobile devices
- **4-Operator FM Synthesis**: Professional sound without hardware
- **8 FM Algorithms**: Multiple operator routing configurations
- **12-Voice Polyphony**: Full multi-note support on Android/iOS
- **Automatic Detection**: Seamlessly switches between MIDI hardware and Web Audio

### 🎨 Code Quality Improvements
- Organized utility modules for audio functions
- Centralized configuration management
- Enhanced error handling and validation
- Better documentation and code comments
- Performance optimizations for mobile and VR

**See [FEATURES.md](./FEATURES.md) for detailed documentation of new features.**

---

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
- **NEW**: VR-ready with stereoscopic rendering

### MEGAfm Hardware Integration
- Comprehensive control of all MEGAfm synthesis parameters
- Advanced voice mode controls with visual feedback
- Envelope looping with forward and ping-pong modes
- Rate scaling for piano-like envelope response
- MPE (MIDI Polyphonic Expression) support
- Preset browsing and management
- Algorithm visualization with interactive diagrams
- **NEW**: Automatic fallback to Web Audio when hardware unavailable

## Getting Started

### Desktop with MEGAfm Hardware
1. Connect your MEGAfm synthesizer via USB MIDI
2. Open the application in Chrome, Firefox, or Edge
3. Grant MIDI permissions when prompted
4. Select an algorithm and adjust parameters
5. Use the visualization controls to customize the visual representation
6. Explore the MEGAfm tabs to access advanced synthesis features

### Mobile / Without MIDI Hardware
1. Open the application in your mobile browser (Chrome recommended)
2. The app will automatically use the built-in Web Audio synthesizer
3. Press the PLAY button to start generating music
4. All features work without hardware!

### VR Mode
1. Use a WebXR-compatible browser (Quest Browser, Chrome, Edge)
2. Click the "Enter VR" button at the bottom of the screen
3. Put on your VR headset
4. Use controllers or hand tracking to interact with the VR control panel
5. Enjoy immersive 3D visualizations!

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
│   ├── audio/ - Audio system (MIDI + Web Audio)
│   ├── components/ - UI components (including VR controls)
│   ├── config/ - Configuration constants
│   ├── midi/ - MIDI connection utilities
│   ├── state/ - Redux state management
│   ├── utils/ - Utility functions
│   └── visualizers/ - Visual representations
│       └── cellular/ - Cellular visualizer components
│           ├── CellMaterial.jsx - Cell appearance and transitions
│           ├── CellGrid.jsx - Grid layout and effects
│           ├── HoverTooltip.jsx - Interactive tooltips
│           └── CellularUtils.js - Helper functions
└── public/ - Static assets
```

## Future Improvements
- Spatial audio in VR (3D sound positioning)
- Hand gesture controls for VR parameter manipulation
- Complete visualizations for all 8 FM algorithms
- Real-time operator level visualization
- Spectrum analyzer for harmonic content
- MIDI SysEx for preset backup/restore
- Multi-user VR collaboration
- Enhanced mobile touch controls

## Technical Details
- **Frontend**: React 19, Redux Toolkit
- **3D Graphics**: Three.js, React-Three-Fiber, React-Three-Drei
- **VR**: React-Three/XR (WebXR API)
- **Audio**: Web MIDI API (hardware) + Web Audio API (software fallback)
- **Build**: Vite
- **Synthesis**: 4-operator FM synthesis (hardware or software)
- **Algorithms**: Cellular automata, fractal algorithms, Euclidean rhythms, and more
- **Rendering**: Customizable 3D visualizations with adaptive performance

## Accessibility

This application has been designed with accessibility in mind, particularly for deaf or hard-of-hearing users:
- Visual representations of all musical aspects
- Color coding for note types and patterns
- Motion and position to indicate timing and pitch
- Customizable visual intensity and complexity