import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { useDispatch, useSelector } from 'react-redux';
import MidiConnector from './midi/MidiConnector';
import ControlPanel from './components/ControlPanel';
import VRControls from './components/VRControls';
import Visualizer from './visualizers/Visualizer';
import AlgorithmEngine from './algorithms/AlgorithmEngine';
import AudioManager from './audio/AudioManager';

// Create XR store
const xrStore = createXRStore();

// MIDI Device Selector component
function MidiDeviceSelector() {
  const availableOutputs = useSelector(state => state.midi.availableOutputs);
  const currentOutput = useSelector(state => state.midi.output);
  
  const handleDeviceChange = (e) => {
    const selectedDeviceId = e.target.value;
    if (selectedDeviceId && window.selectMidiOutput) {
      window.selectMidiOutput(selectedDeviceId);
    }
  };
  
  if (!availableOutputs || availableOutputs.length === 0) {
    return null;
  }
  
  return (
    <select 
      value={currentOutput?.id || ''}
      onChange={handleDeviceChange}
      style={{
        marginLeft: '10px',
        background: '#222',
        color: 'white',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '2px 4px'
      }}
    >
      {availableOutputs.map(device => (
        <option key={device.id} value={device.id}>
          {device.name}
        </option>
      ))}
    </select>
  );
}

function App() {
  const [showControls, setShowControls] = useState(true);
  const midiConnected = useSelector(state => state.midi.connected);
  const midiOutput = useSelector(state => state.midi.output);
  const midiError = useSelector(state => state.midi.errorMessage);
  const currentAlgorithm = useSelector(state => state.algorithm.currentAlgorithm);
  const isPlaying = useSelector(state => state.algorithm.isPlaying);

  const toggleControls = () => setShowControls(!showControls);

  // Get audio status
  const audioStatus = AudioManager.getStatus();
  const audioMode = audioStatus.mode || 'initializing';

  // Track VR mode
  const [vrMode, setVrMode] = useState(false);
  useEffect(() => {
    return xrStore.subscribe((state) => {
      setVrMode(state !== null);
    });
  }, []);

  return (
    <>
      <MidiConnector />
      <AlgorithmEngine />
      
      {/* VR Button */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <button
          onClick={() => xrStore.enterVR()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          {vrMode ? 'Exit VR' : 'Enter VR'}
        </button>
      </div>

      {/* Status bar at the top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        fontSize: '14px'
      }}>
        <div>
          Audio: {audioMode === 'midi' ? '🎹 MIDI Hardware' : '🔊 Web Audio'} |
          {midiConnected ? ' ✅ Connected' : ' ❌ Disconnected'}
          <MidiDeviceSelector />
        </div>
        <div>
          Algorithm: {currentAlgorithm} {isPlaying ? '▶️ Playing' : '⏹️ Stopped'}
        </div>
        <div>
          {vrMode ? '🥽 VR Mode' : '🖥️ Desktop'}
        </div>
        <button
          onClick={toggleControls}
          style={{
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>
      
      {/* Error message display */}
      {midiError && (
        <div style={{
          position: 'absolute',
          top: '40px',
          left: 0,
          right: 0,
          background: 'rgba(255,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          zIndex: 100
        }}>
          Error: {midiError}
        </div>
      )}
      
      {/* Main 3D canvas with VR support */}
      <Canvas style={{ width: '100%', height: '100%' }}>
        <XR store={xrStore}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <directionalLight position={[-10, 10, -10]} intensity={0.3} />

          {/* VR UI Controls */}
          <VRControls />

          <Visualizer />
        </XR>
      </Canvas>
      
      {/* Control panel */}
      {showControls && <ControlPanel />}
    </>
  );
}

export default App;