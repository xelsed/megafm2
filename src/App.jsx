import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useDispatch, useSelector } from 'react-redux';
import MidiConnector from './midi/MidiConnector';
import ControlPanel from './components/ControlPanel';
import Visualizer from './visualizers/Visualizer';
import AlgorithmEngine from './algorithms/AlgorithmEngine';

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

  return (
    <>
      <MidiConnector />
      <AlgorithmEngine />
      
      {/* Status bar at the top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 100
      }}>
        <div>
          MegaFM Connection: {midiConnected ? '✅ Connected' : '❌ Disconnected'} 
          <MidiDeviceSelector />
        </div>
        <div>
          Algorithm: {currentAlgorithm} {isPlaying ? '▶️ Playing' : '⏹️ Stopped'}
        </div>
        <button onClick={toggleControls}>
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
      
      {/* Main 3D canvas */}
      <Canvas style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Visualizer />
      </Canvas>
      
      {/* Control panel */}
      {showControls && <ControlPanel />}
    </>
  );
}

export default App;