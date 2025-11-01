# MEGAfm New Features

This document describes the new features added to the MEGAfm generative music visualizer.

## VR Support

### Overview
MEGAfm now supports full VR immersion through WebXR, allowing you to experience generative music in 3D virtual reality.

### Supported VR Devices
- **Meta Quest** (Quest 2, Quest 3, Quest Pro) - via built-in browser
- **PC VR** (SteamVR) - via Chrome, Edge
- **PlayStation VR2** - when WebXR support is available
- **HoloLens** - via Edge browser
- Any WebXR-compatible VR headset

### How to Use VR Mode

1. **Enter VR**:
   - Click the "Enter VR" button at the bottom center of the screen
   - Put on your VR headset
   - The visualization will transition to stereoscopic 3D view

2. **VR Controls**:
   - **Controllers**: Point your VR controller at the UI panel
   - **Hand Tracking**: Use hand gestures (if supported by your device)
   - The VR control panel floats in front of you with these options:
     - **PLAY/PAUSE**: Start or stop music generation
     - **ALGORITHM**: Cycle through different generation algorithms
     - **Status Display**: Shows current algorithm and tempo

3. **Navigation**:
   - Move around in your VR space to view visualizations from different angles
   - Visualizations remain centered for optimal viewing

4. **Exit VR**:
   - Use your VR headset's system menu to exit VR mode
   - Or press the "Exit VR" button if available

### VR-Optimized Visualizations
All visualizer modes work in VR with proper stereoscopic 3D rendering:
- **Piano Roll**: See notes floating in 3D space
- **Particle Field**: Surround yourself with reactive particles
- **Geometric Objects**: Watch shapes dance in full 3D
- **Cymatic Patterns**: Experience wave patterns in immersive detail
- **Cellular Automata**: Observe life patterns evolving in space

---

## Android Audio Support (Web Audio Fallback)

### Overview
MEGAfm now works on Android devices **without requiring MIDI hardware**, using a built-in Web Audio API synthesizer.

### How It Works

The application automatically detects your platform and chooses the best audio method:

1. **Desktop with MIDI** → Uses MEGAfm hardware synthesizer (preferred)
2. **Android/iOS** → Uses built-in FM synthesis engine (Web Audio API)
3. **Desktop without MIDI** → Falls back to Web Audio API

### Audio Modes

#### MIDI Mode (Hardware)
- **Icon**: 🎹 MIDI Hardware
- **Requirements**: MEGAfm hardware synthesizer connected via USB
- **Advantages**: Professional FM synthesis, full control over MEGAfm parameters
- **Platforms**: Desktop Chrome, Firefox, Edge with Web MIDI API

#### Web Audio Mode (Software)
- **Icon**: 🔊 Web Audio
- **Requirements**: Modern browser with Web Audio API support
- **Advantages**: Works everywhere, no hardware needed
- **Platforms**: Android, iOS, desktop browsers without MIDI

### FM Synthesis Engine Features

The built-in synthesizer implements:

- **4-Operator FM Synthesis**: Similar to MEGAfm hardware
- **8 FM Algorithms**: Different operator routing configurations
- **ADSR Envelopes**: Per-operator attack, decay, sustain, release
- **12-Voice Polyphony**: Play up to 12 simultaneous notes
- **Dynamic Range Compression**: Prevents audio clipping
- **Low Latency**: Optimized for responsive playback

### Android-Specific Optimizations

- **Auto-Resume**: Audio context resumes on user interaction
- **Battery Efficient**: Optimized buffer sizes for mobile
- **Touch-Friendly**: All controls work with touch input
- **Landscape/Portrait**: Responsive UI for all orientations

---

## Code Quality Improvements

### New Utility Modules

#### `src/utils/audioUtils.js`
Comprehensive audio utility functions:
- MIDI note ↔ frequency conversion
- Velocity normalization
- ADSR envelope helpers
- Tempo ↔ millisecond conversion
- dB ↔ gain conversion
- Platform detection

#### `src/config/constants.js`
Centralized configuration:
- Audio settings (polyphony, sample rate, etc.)
- VR configuration (controller settings, panel positioning)
- Visualization settings (performance levels, color schemes)
- Musical scales and MIDI note mappings
- FM algorithm definitions
- Error messages

### Enhanced Audio System

#### `src/audio/FMSynthEngine.js`
4-operator FM synthesizer with:
- Better error handling
- Input validation
- Dynamic compression to prevent clipping
- Memory leak prevention
- Comprehensive logging

#### `src/audio/AudioManager.js`
Unified audio interface that:
- Auto-detects MIDI availability
- Falls back to Web Audio seamlessly
- Provides consistent API for both modes
- Handles mode switching gracefully

### Code Organization

```
src/
├── audio/                    # New audio system
│   ├── FMSynthEngine.js     # Web Audio FM synth
│   └── AudioManager.js      # Unified audio interface
├── components/
│   └── VRControls.jsx       # New VR UI panel
├── config/
│   └── constants.js         # Application constants
└── utils/
    └── audioUtils.js        # Audio utility functions
```

---

## Performance Improvements

### Web Audio Optimizations
- **Compressor Node**: Prevents distortion from multiple simultaneous notes
- **Voice Stealing**: Oldest voice removed when polyphony limit reached
- **Efficient Envelopes**: Optimized ADSR calculations
- **Proper Cleanup**: All audio nodes properly disconnected

### VR Performance
- **Adaptive Quality**: Adjusts based on device capabilities
- **Stereo Rendering**: Optimized for VR displays
- **Controller Tracking**: Low-latency hand/controller input
- **60 FPS Target**: Smooth VR experience

---

## Browser Compatibility

### Desktop
- ✅ Chrome 90+ (Full support: MIDI + VR)
- ✅ Firefox 90+ (Full support: MIDI + VR)
- ✅ Edge 90+ (Full support: MIDI + VR)
- ⚠️ Safari 14+ (Web Audio only, limited VR)

### Mobile
- ✅ Android Chrome 90+ (Web Audio + VR via Quest browser)
- ✅ iOS Safari 14+ (Web Audio, limited VR)
- ✅ Quest Browser (Full VR support)

### Required Browser APIs
- **Web Audio API**: ✅ All modern browsers
- **Web MIDI API**: Chrome, Edge, Firefox (desktop)
- **WebXR**: Chrome, Edge (desktop + mobile), Quest Browser

---

## Troubleshooting

### No Sound on Android
1. **Check Volume**: Ensure device volume is up
2. **User Interaction**: Press PLAY button (audio needs user gesture)
3. **Browser**: Use Chrome for best compatibility
4. **Permissions**: Grant audio permissions if prompted

### VR Not Working
1. **Browser Support**: Use Chrome or Edge for WebXR
2. **HTTPS Required**: VR requires secure connection (https://)
3. **Device Setup**: Ensure VR headset is properly connected
4. **Browser Flags**: Some browsers need WebXR flags enabled

### Audio Latency
1. **Web Audio Mode**: Expect 10-50ms latency (varies by device)
2. **MIDI Mode**: Lower latency with hardware synth
3. **Buffer Size**: Automatically optimized for platform
4. **Bluetooth**: Avoid Bluetooth audio (high latency)

### VR Performance Issues
1. **Lower Settings**: Reduce visualization complexity in settings
2. **Close Apps**: Free up device resources
3. **Device Limits**: Some devices may struggle with complex visuals
4. **Update Browser**: Use latest browser version

---

## Development Notes

### Adding New FM Algorithms

Edit `src/audio/FMSynthEngine.js` and add a new case to the `connectAlgorithm` method:

```javascript
case 9: // Your custom algorithm
  // Define operator connections
  op4.connect(voice.oscillators[1].frequency);
  // ... more connections
  break;
```

### Extending VR Controls

Edit `src/components/VRControls.jsx` to add new interactive elements:

```javascript
<Interactive onSelect={yourHandler}>
  <group position={[x, y, z]}>
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#color" />
    </mesh>
    <Text>Button Text</Text>
  </group>
</Interactive>
```

### Platform Detection

Use the `PLATFORM` constant from `src/config/constants.js`:

```javascript
import { PLATFORM } from './config/constants';

if (PLATFORM.isAndroid) {
  // Android-specific code
}
```

---

## Future Enhancements

- [ ] Spatial audio in VR (3D sound positioning)
- [ ] Hand gesture controls for parameter manipulation
- [ ] Multi-user VR collaboration
- [ ] Custom FM algorithm designer in VR
- [ ] iOS AudioUnit support for lower latency
- [ ] WebAssembly-based synthesis for better performance
- [ ] VR recording and sharing features

---

## Credits

- **FM Synthesis**: Based on Yamaha DX7 and OPL3 architecture
- **WebXR**: Using @react-three/xr library
- **Web Audio**: Native browser API
- **3D Rendering**: Three.js and React-Three-Fiber

---

**Last Updated**: 2025-11-01
**Version**: 2.0.0
