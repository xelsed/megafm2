import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentAlgorithm, toggleAlgorithm, updateAlgorithmParameter, setTempo, setPlaying } from '../state/algorithmSlice';
import { setVisualizationMode, setColorScheme, toggleLabels, toggleAccessibilityMode, setNoteSize, togglePulseEffect, toggleAutoRotate, setRenderQuality } from '../state/visualizerSlice';
import { 
  sendCC, CC, sendAllNotesOff, selectPreset, setEnvelopeLooping,
  VoiceMode, NotePriority, setVoiceMode, setFatDetune, setGlide, setMPEMode, setNotePriority,
  MEGAFM_CHANNEL
} from '../midi/midiUtils';
import { 
  linkParameterToLFO, unlinkParameterFromLFO, hasRecentParameterMovement, getLastMovedParameter
} from '../midi/modUtils';

// Add reactive styling with glow effects
const glowStyles = {
  button: {
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 0 10px rgba(142, 45, 226, 0.5)',
    transition: 'all 0.3s ease',
    margin: '5px'
  },
  activeButton: {
    background: 'linear-gradient(to right, #8e2de2, #4a00e0)',
    boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)',
  },
  slider: {
    width: '100%',
    accentColor: '#8e2de2',
    cursor: 'pointer'
  },
  controlGroup: {
    background: 'rgba(20, 20, 30, 0.8)',
    borderRadius: '8px',
    padding: '10px 15px',
    margin: '5px 0',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(100, 100, 255, 0.2)',
  },
  controlRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    margin: '8px 0',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#bbb',
  },
  value: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    minWidth: '40px',
    textAlign: 'center',
  }
};

const ControlPanel = () => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const midiOutput = useSelector(state => state.midi.output);
  const midiConnected = useSelector(state => state.midi.connected);
  const currentAlgorithm = useSelector(state => state.algorithm.currentAlgorithm);
  const algorithms = useSelector(state => state.algorithm.algorithms);
  const isPlaying = useSelector(state => state.algorithm.isPlaying);
  const tempo = useSelector(state => state.algorithm.tempo);
  const visualizationMode = useSelector(state => state.visualizer.visualizationMode);
  const colorScheme = useSelector(state => state.visualizer.colorScheme);
  const availableModes = useSelector(state => state.visualizer.availableModes);
  const availableColorSchemes = useSelector(state => state.visualizer.availableColorSchemes);
  const showLabels = useSelector(state => state.visualizer.showLabels);
  const accessibilityMode = useSelector(state => state.visualizer.accessibilityMode);
  const noteSize = useSelector(state => state.visualizer.noteSize);
  const pulseEffect = useSelector(state => state.visualizer.pulseEffect);
  const autoRotate = useSelector(state => state.visualizer.autoRotate);
  const renderQuality = useSelector(state => state.visualizer?.renderQuality || 'medium');
  
  // State for MegaFM controls
  const [activeFMTab, setActiveFMTab] = useState('global');
  const [activeOperator, setActiveOperator] = useState(1);
  const [activeLFO, setActiveLFO] = useState(1);
  const [lfoWaveform, setLFOWaveform] = useState('sine');
  const [lfoRetrig, setLFORetrig] = useState(false);
  const [lfoLoop, setLFOLoop] = useState(true);
  
  // LFO modulation chain state
  const [lfoChainStatus, setLfoChainStatus] = useState({
    lfo1: { active: false, linkedParam: null },
    lfo2: { active: false, linkedParam: null },
    lfo3: { active: false, linkedParam: null },
  });
  const [lastModParameterInfo, setLastModParameterInfo] = useState(null);
  const [modLinkActive, setModLinkActive] = useState(false);
  
  // Envelope loop state
  const [envelopeLoopActive, setEnvelopeLoopActive] = useState(false);
  const [envelopeLoopPingpong, setEnvelopeLoopPingpong] = useState(false);
  const [lastEnvelopeFaderTimestamp, setLastEnvelopeFaderTimestamp] = useState(0);
  
  // Voice mode controls
  const [currentVoiceMode, setCurrentVoiceMode] = useState(0); // Default to POLY12
  const [fatValue, setFatValue] = useState(0);
  const [fatOctaveMode, setFatOctaveMode] = useState(false); 
  const [glideValue, setGlideValue] = useState(0);
  const [notePriority, setNotePriority] = useState(0); // Default to LOWEST
  const [mpeMode, setMpeMode] = useState(false);
  const [pitchBendRange, setPitchBendRange] = useState(48); // Default to max
  
  // This section was removed to fix duplicate declaration
  
  // FM synthesis controls
  const [currentFmAlgorithm, setCurrentFmAlgorithm] = useState('algo1'); // Default to algorithm 1
  
  // Preset browser state
  const [currentBank, setCurrentBank] = useState(0);
  const [currentPreset, setCurrentPreset] = useState(0);
  
  // Handle play/stop button
  const togglePlayback = () => {
    dispatch(setPlaying(!isPlaying));
  };
  
  // Handle algorithm selection
  const handleAlgorithmChange = (e) => {
    dispatch(setCurrentAlgorithm(e.target.value));
  };
  
  // Handle parameter changes
  const handleParameterChange = (algorithm, parameter, value) => {
    dispatch(updateAlgorithmParameter({ algorithm, parameter, value }));
  };
  
  // Handle tempo changes
  const handleTempoChange = (e) => {
    dispatch(setTempo(parseInt(e.target.value, 10)));
  };
  
  // Handle visualization mode changes
  const handleVisualizationModeChange = (e) => {
    dispatch(setVisualizationMode(e.target.value));
  };
  
  // Handle color scheme changes
  const handleColorSchemeChange = (e) => {
    dispatch(setColorScheme(e.target.value));
  };
  
  // Handle MegaFM param changes
  const handleMegaFMParamChange = (cc, value, paramName = null) => {
    if (midiConnected && midiOutput) {
      // Send parameter change and track it for modulation purposes
      // The enhanced sendCC function will handle parameter tracking with modUtils.js
      // The paramName is essential for LFO chain linking functionality
      // so that users can see which parameter is linked to which LFO
      sendCC(midiOutput, cc, value, MEGAFM_CHANNEL, paramName);
    }
  };
  
  // Handle voice mode change
  const handleVoiceModeChange = (mode) => {
    if (midiConnected && midiOutput) {
      setVoiceMode(midiOutput, mode);
      setCurrentVoiceMode(mode);
    }
  };
  
  // Handle fat/detune change
  const handleFatChange = (value) => {
    setFatValue(value);
    if (midiConnected && midiOutput) {
      setFatDetune(midiOutput, value, fatOctaveMode);
    }
  };
  
  // Handle fat mode toggle (semitone vs octave)
  const handleFatModeToggle = () => {
    const newMode = !fatOctaveMode;
    setFatOctaveMode(newMode);
    if (midiConnected && midiOutput) {
      setFatDetune(midiOutput, fatValue, newMode);
    }
  };
  
  // Handle glide/portamento change
  const handleGlideChange = (value) => {
    setGlideValue(value);
    if (midiConnected && midiOutput) {
      setGlide(midiOutput, value);
    }
  };
  
  // Handle note priority change (for unison mode)
  const handleNotePriorityChange = (priority) => {
    setNotePriority(priority);
    if (midiConnected && midiOutput) {
      setNotePriority(midiOutput, priority);
    }
  };
  
  // Handle MPE mode toggle
  const handleMPEModeToggle = () => {
    const newMpeMode = !mpeMode;
    setMpeMode(newMpeMode);
    if (midiConnected && midiOutput) {
      setMPEMode(midiOutput, newMpeMode, pitchBendRange);
      // MPE mode forces Poly12 voice mode as per manual
      if (newMpeMode) {
        setCurrentVoiceMode(VoiceMode.POLY12);
      }
    }
  };
  
  // Handle LFO chain button click for parameter linking
  const handleLfoChainButtonClick = (lfoNumber) => {
    if (!midiConnected || !midiOutput) {
      console.warn('Cannot link parameters - MIDI not connected');
      return;
    }
    
    // Update UI state
    const lfoKey = `lfo${lfoNumber}`;
    const currentStatus = lfoChainStatus[lfoKey];
    
    // Check if we already have this LFO linked
    if (currentStatus.active) {
      // Unlink the parameter
      unlinkParameterFromLFO(midiOutput, lfoNumber, MEGAFM_CHANNEL);
      
      // Update state to reflect unlinking
      setLfoChainStatus({
        ...lfoChainStatus,
        [lfoKey]: { active: false, linkedParam: null }
      });
      
      console.log(`Unlinked parameter from LFO ${lfoNumber}`);
      return;
    }
    
    // Check if a parameter was recently moved
    if (hasRecentParameterMovement()) {
      // Get info about the last parameter moved
      const paramInfo = getLastMovedParameter();
      
      // Try to link the parameter
      const result = linkParameterToLFO(midiOutput, lfoNumber, MEGAFM_CHANNEL);
      
      if (result) {
        // Update status to show linked
        setLfoChainStatus({
          ...lfoChainStatus,
          [lfoKey]: { 
            active: true, 
            linkedParam: {
              name: paramInfo.name || `CC ${paramInfo.cc}`,
              cc: paramInfo.cc,
              value: paramInfo.value
            }
          }
        });
        
        // Store the linked parameter info
        setLastModParameterInfo(paramInfo);
        
        console.log(`Linked ${paramInfo.name || 'parameter'} to LFO ${lfoNumber}`);
      }
    } else {
      console.warn('No recent parameter movement detected - move a parameter first');
      // You could add a visual indicator here to show the user they need to move a parameter
      setModLinkActive(true);
      
      // Auto-disable after 5 seconds
      setTimeout(() => {
        setModLinkActive(false);
      }, 5000);
    }
  };
  
  // Handle pitch bend range change (for MPE mode)
  const handlePitchBendRangeChange = (value) => {
    setPitchBendRange(value);
    if (midiConnected && midiOutput && mpeMode) {
      setMPEMode(midiOutput, true, value);
    }
  };
  
  // Effect to sync MegaFM parameters with the current algorithm
  useEffect(() => {
    if (midiConnected && midiOutput) {
      // Only apply these settings when algorithm changes
      if (currentAlgorithm === 'fractal') {
        // Set MegaFM parameters for fractal algorithm
        sendCC(midiOutput, CC.ALGORITHM, 4); // Algorithm 4 works well with fractal melodies
        sendCC(midiOutput, CC.FEEDBACK, 90); // High feedback for resonant tones
        sendCC(midiOutput, CC.OP1_ATTACK_RATE, 20);
        sendCC(midiOutput, CC.OP1_DECAY_RATE, 80);
      } 
      else if (currentAlgorithm === 'euclidean') {
        // Set MegaFM parameters for percussion-oriented rhythm
        sendCC(midiOutput, CC.ALGORITHM, 6); // Algorithm 6 for percussive sounds
        sendCC(midiOutput, CC.FEEDBACK, 110); // Higher feedback for sharper attacks
        sendCC(midiOutput, CC.OP1_ATTACK_RATE, 0); // Fast attack for percussion
        sendCC(midiOutput, CC.OP1_DECAY_RATE, 100);
      }
      else if (currentAlgorithm === 'cellular') {
        // Set MegaFM parameters for experimental sounds
        sendCC(midiOutput, CC.ALGORITHM, 1); // Algorithm 1 for complex timbres
        sendCC(midiOutput, CC.FEEDBACK, 100);
        sendCC(midiOutput, CC.OP1_ATTACK_RATE, 50);
        sendCC(midiOutput, CC.OP1_DECAY_RATE, 50);
      }
      else if (currentAlgorithm === 'ruleBasedHarmony') {
        // Set MegaFM parameters for pad-like sounds
        sendCC(midiOutput, CC.ALGORITHM, 2); // Algorithm 2 for harmonic richness
        sendCC(midiOutput, CC.FEEDBACK, 40); // Lower feedback for smoother sound
        sendCC(midiOutput, CC.OP1_ATTACK_RATE, 80); // Slow attack for pads
        sendCC(midiOutput, CC.OP1_DECAY_RATE, 30);
      }
    }
  }, [currentAlgorithm, midiConnected, midiOutput]);

  // Get current BPM from MIDI clock
  useEffect(() => {
    if (midiConnected && midiOutput) {
      // Set initial sync parameters for MIDI clock
      sendCC(midiOutput, CC.LFO1_RATE, Math.floor(tempo / 2));
    }
  }, [tempo, midiConnected, midiOutput]);

  // State for panel collapse
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Render the control panel with all our controls
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(20, 20, 30, 0.9)',
      color: 'white',
      padding: isCollapsed ? '10px' : '15px',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: isCollapsed ? '60px' : '60vh',
      height: isCollapsed ? 'auto' : 'auto',
      overflowY: isCollapsed ? 'hidden' : 'auto',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 -5px 25px rgba(0, 0, 0, 0.5)',
      borderTop: '1px solid rgba(100, 100, 255, 0.3)',
      zIndex: 1000,
      transition: 'all 0.3s ease-in-out',
    }}>
      {/* Main Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: isCollapsed ? 'none' : '1px solid rgba(100, 100, 255, 0.2)',
        paddingBottom: isCollapsed ? '0' : '10px',
        marginBottom: isCollapsed ? '0' : '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={toggleCollapse}
            style={{
              ...glowStyles.button,
              fontSize: '14px',
              padding: '6px 12px',
              marginRight: '10px',
              minWidth: '30px',
              background: 'linear-gradient(to right, #333, #555)',
            }}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
          
          <h3 style={{ 
            margin: 0, 
            fontSize: '24px',
            background: 'linear-gradient(to right, #9ef, #f9f)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 10px rgba(100, 100, 255, 0.5)',
          }}>
            MegaFM Music Generator
          </h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={togglePlayback}
            style={{
              ...glowStyles.button,
              ...(isPlaying ? { 
                background: 'linear-gradient(to right, #f00, #f50)',
                boxShadow: '0 0 15px rgba(255, 50, 50, 0.7)'
              } : {
                background: 'linear-gradient(to right, #0a0, #5c0)',
                boxShadow: '0 0 15px rgba(50, 200, 50, 0.7)'
              }),
              fontSize: '16px',
              padding: '10px 20px',
            }}
          >
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>
          
          <div style={{ 
            marginLeft: '20px',
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(0,0,0,0.3)',
            padding: '5px 15px',
            borderRadius: '20px',
          }}>
            <span style={glowStyles.label}>Tempo:</span>
            <span style={{...glowStyles.value, fontSize: '18px', marginLeft: '5px'}}>{tempo}</span>
            <span style={glowStyles.label}>BPM</span>
            <input
              type="range"
              min="60"
              max="200"
              value={tempo}
              onChange={handleTempoChange}
              style={{ 
                ...glowStyles.slider, 
                marginLeft: '10px', 
                width: '120px',
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Collapsed view doesn't show controls */}
      {!isCollapsed && (
      
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left Column */}
        <div style={{ flex: '1' }}>
          {/* Algorithm Selection */}
          <div style={glowStyles.controlGroup}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              color: '#aaf',
              textShadow: '0 0 5px rgba(100, 100, 255, 0.5)',
            }}>
              Algorithm
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              {['fractal', 'euclidean', 'cellular', 'markov', 'sequential', 'waveshaper', 'ruleBasedHarmony'].map(algo => (
                <button
                  key={algo}
                  onClick={() => dispatch(setCurrentAlgorithm(algo))}
                  style={{
                    ...glowStyles.button,
                    ...(currentAlgorithm === algo ? glowStyles.activeButton : {}),
                    flex: '1',
                    minWidth: '110px',
                  }}
                >
                  {algo === 'fractal' && '🌀 Fractal'}
                  {algo === 'euclidean' && '⚙️ Euclidean'}
                  {algo === 'cellular' && '🧬 Cellular'}
                  {algo === 'markov' && '🎲 Markov'}
                  {algo === 'sequential' && '📊 Sequential'}
                  {algo === 'waveshaper' && '〰️ Waveshaper'}
                  {algo === 'ruleBasedHarmony' && '🎹 Harmony'}
                </button>
              ))}
            </div>
            
            {/* Algorithm-specific controls */}
            <div style={{ padding: '5px' }}>
              {currentAlgorithm === 'fractal' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Complexity:</span>
                    <span style={glowStyles.value}>
                      {Math.round(algorithms.fractal.parameters.complexity * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={algorithms.fractal.parameters.complexity}
                      onChange={(e) => handleParameterChange('fractal', 'complexity', parseFloat(e.target.value))}
                      style={glowStyles.slider}
                    />
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Scale:</span>
                    <select
                      value={algorithms.fractal.parameters.scale}
                      onChange={(e) => handleParameterChange('fractal', 'scale', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="pentatonic">Pentatonic</option>
                      <option value="blues">Blues</option>
                      <option value="chromatic">Chromatic</option>
                    </select>
                    
                    <span style={{...glowStyles.label, marginLeft: '15px'}}>Octaves:</span>
                    <select
                      value={algorithms.fractal.parameters.octaveRange}
                      onChange={(e) => handleParameterChange('fractal', 'octaveRange', parseInt(e.target.value, 10))}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="1">1 Octave</option>
                      <option value="2">2 Octaves</option>
                      <option value="3">3 Octaves</option>
                      <option value="4">4 Octaves</option>
                    </select>
                  </div>
                </>
              )}
              
              {currentAlgorithm === 'euclidean' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Steps:</span>
                    <select
                      value={algorithms.euclidean.parameters.steps}
                      onChange={(e) => handleParameterChange('euclidean', 'steps', parseInt(e.target.value, 10))}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="8">8 Steps</option>
                      <option value="12">12 Steps</option>
                      <option value="16">16 Steps</option>
                      <option value="24">24 Steps</option>
                      <option value="32">32 Steps</option>
                    </select>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Fills:</span>
                    <span style={glowStyles.value}>{algorithms.euclidean.parameters.fills}</span>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={algorithms.euclidean.parameters.fills}
                      onChange={(e) => handleParameterChange('euclidean', 'fills', parseInt(e.target.value, 10))}
                      style={glowStyles.slider}
                    />
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Rotation:</span>
                    <span style={glowStyles.value}>{algorithms.euclidean.parameters.rotation}</span>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={algorithms.euclidean.parameters.rotation}
                      onChange={(e) => handleParameterChange('euclidean', 'rotation', parseInt(e.target.value, 10))}
                      style={glowStyles.slider}
                    />
                  </div>
                </>
              )}
              
              {currentAlgorithm === 'cellular' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Type:</span>
                    <select
                      value={algorithms.cellular.parameters.type}
                      onChange={(e) => handleParameterChange('cellular', 'type', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        flex: '1'
                      }}
                    >
                      <option value="1D">1D Cellular Automaton</option>
                      <option value="gameOfLife">Game of Life (2D)</option>
                    </select>
                  </div>
                  
                  {algorithms.cellular.parameters.type === '1D' && (
                    <>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Rule:</span>
                        <select
                          value={algorithms.cellular.parameters.rule}
                          onChange={(e) => handleParameterChange('cellular', 'rule', parseInt(e.target.value, 10))}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            flex: '1'
                          }}
                        >
                          <option value="30">Rule 30 (Chaotic)</option>
                          <option value="90">Rule 90 (Sierpinski)</option>
                          <option value="110">Rule 110 (Complex)</option>
                          <option value="184">Rule 184 (Traffic flow)</option>
                          <option value="60">Rule 60 (Balanced)</option>
                          <option value="102">Rule 102 (Symmetric)</option>
                          <option value="150">Rule 150 (Mesh)</option>
                          <option value="225">Rule 225 (Majority)</option>
                        </select>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Pattern:</span>
                        <select
                          value={algorithms.cellular.parameters.initialCondition}
                          onChange={(e) => handleParameterChange('cellular', 'initialCondition', e.target.value)}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="center">Single cell</option>
                          <option value="random">Random</option>
                          <option value="custom">Two cells</option>
                          <option value="alternating">Alternating</option>
                          <option value="third">Every third</option>
                        </select>
                        
                        <span style={{...glowStyles.label, marginLeft: '15px'}}>Width:</span>
                        <select
                          value={algorithms.cellular.parameters.width}
                          onChange={(e) => handleParameterChange('cellular', 'width', parseInt(e.target.value, 10))}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="8">8 cells</option>
                          <option value="16">16 cells</option>
                          <option value="32">32 cells</option>
                          <option value="64">64 cells</option>
                        </select>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Velocity Mapping:</span>
                        <select
                          value={algorithms.cellular.parameters.velocityMap || 'linear'}
                          onChange={(e) => handleParameterChange('cellular', 'velocityMap', e.target.value)}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="linear">Linear (left to right)</option>
                          <option value="distance">Distance from center</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {algorithms.cellular.parameters.type === 'gameOfLife' && (
                    <>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Pattern:</span>
                        <select
                          value={algorithms.cellular.parameters.initialCondition}
                          onChange={(e) => handleParameterChange('cellular', 'initialCondition', e.target.value)}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            flex: '1'
                          }}
                        >
                          <option value="random">Random</option>
                          <option value="glider">Glider</option>
                          <option value="blinker">Blinker (oscillator)</option>
                          <option value="pulsar">Pulsar (larger oscillator)</option>
                          <option value="gosperGliderGun">Gosper Glider Gun</option>
                          <option value="acorn">Acorn (Methuselah)</option>
                          <option value="exploder">Exploder</option>
                          <option value="cross">Simple Cross</option>
                        </select>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Grid Size:</span>
                        <select
                          value={algorithms.cellular.parameters.width}
                          onChange={(e) => {
                            const size = parseInt(e.target.value, 10);
                            handleParameterChange('cellular', 'width', size);
                            handleParameterChange('cellular', 'height', size);
                          }}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="16">16×16</option>
                          <option value="24">24×24</option>
                          <option value="32">32×32</option>
                          <option value="48">48×48</option>
                        </select>
                        
                        <span style={{...glowStyles.label, marginLeft: '15px'}}>Density:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="0.6"
                          step="0.05"
                          value={algorithms.cellular.parameters.density}
                          onChange={(e) => handleParameterChange('cellular', 'density', parseFloat(e.target.value))}
                          style={{...glowStyles.slider, width: '120px'}}
                        />
                        <span style={glowStyles.value}>
                          {Math.round(algorithms.cellular.parameters.density * 100)}%
                        </span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Velocity Mapping:</span>
                        <select
                          value={algorithms.cellular.parameters.velocityMap || 'linear'}
                          onChange={(e) => handleParameterChange('cellular', 'velocityMap', e.target.value)}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="linear">Linear (position-based)</option>
                          <option value="distance">Distance from center</option>
                          <option value="random">Random</option>
                        </select>
                        
                        <span style={{...glowStyles.label, marginLeft: '15px'}}>Note Scale:</span>
                        <select
                          value={algorithms.cellular.parameters.scale || 'pentatonic'}
                          onChange={(e) => handleParameterChange('cellular', 'scale', e.target.value)}
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px'
                          }}
                        >
                          <option value="pentatonic">Pentatonic (smooth)</option>
                          <option value="major">Major</option>
                          <option value="minor">Minor</option>
                          <option value="blues">Blues</option>
                          <option value="chromatic">Chromatic (all notes)</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Iterations:</span>
                    <input
                      type="range"
                      min="16"
                      max="64"
                      step="8"
                      value={algorithms.cellular.parameters.iterations}
                      onChange={(e) => handleParameterChange('cellular', 'iterations', parseInt(e.target.value, 10))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>{algorithms.cellular.parameters.iterations}</span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Melodic Controls:</span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      marginRight: '15px',
                    }}>
                      <input
                        type="checkbox"
                        checked={algorithms.cellular.parameters.harmonies !== false}
                        onChange={(e) => handleParameterChange('cellular', 'harmonies', e.target.checked)}
                        style={{ marginRight: '5px' }}
                      />
                      <span style={glowStyles.label}>Generate Harmonies</span>
                    </label>
                    
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={algorithms.cellular.parameters.emphasizeBirths !== false}
                        onChange={(e) => handleParameterChange('cellular', 'emphasizeBirths', e.target.checked)}
                        style={{ marginRight: '5px' }}
                      />
                      <span style={glowStyles.label}>Emphasize New Cells</span>
                    </label>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Note Range:</span>
                    <select
                      value={algorithms.cellular.parameters.noteRange || 'mid'}
                      onChange={(e) => handleParameterChange('cellular', 'noteRange', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="high">High (C4-C6)</option>
                      <option value="mid">Mid (C3-C5)</option>
                      <option value="low">Low (C2-C4)</option>
                    </select>
                    
                    <span style={{...glowStyles.label, marginLeft: '15px'}}>Threshold:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={algorithms.cellular.parameters.threshold || 0.5}
                      onChange={(e) => handleParameterChange('cellular', 'threshold', parseFloat(e.target.value))}
                      style={{...glowStyles.slider, width: '120px'}}
                    />
                    <span style={glowStyles.value}>
                      {Math.round((algorithms.cellular.parameters.threshold || 0.5) * 100)}%
                    </span>
                  </div>
                </>
              )}
              
              {currentAlgorithm === 'sequential' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Sequence Type:</span>
                    <select
                      value={algorithms.sequential.parameters.sequence}
                      onChange={(e) => handleParameterChange('sequential', 'sequence', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="fibonacci">Fibonacci</option>
                      <option value="pi">Pi Digits</option>
                      <option value="prime">Prime Numbers</option>
                      <option value="buchla">Buchla</option>
                    </select>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Rhythm Density:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={algorithms.sequential.parameters.rhythmDensity}
                      onChange={(e) => handleParameterChange('sequential', 'rhythmDensity', parseFloat(e.target.value))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>
                      {Math.round(algorithms.sequential.parameters.rhythmDensity * 100)}%
                    </span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Scale:</span>
                    <select
                      value={algorithms.sequential.parameters.scale}
                      onChange={(e) => handleParameterChange('sequential', 'scale', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="pentatonic">Pentatonic</option>
                      <option value="blues">Blues</option>
                      <option value="chromatic">Chromatic</option>
                      <option value="wholetone">Whole Tone</option>
                      <option value="diminished">Diminished</option>
                      <option value="harmonicminor">Harmonic Minor</option>
                      <option value="dorian">Dorian</option>
                    </select>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Accent Pattern:</span>
                    <select
                      value={algorithms.sequential.parameters.accentPattern}
                      onChange={(e) => handleParameterChange('sequential', 'accentPattern', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="4/4">4/4</option>
                      <option value="3/4">3/4</option>
                      <option value="5/4">5/4</option>
                      <option value="7/8">7/8</option>
                      <option value="5/8">5/8</option>
                      <option value="complex">Complex</option>
                    </select>
                  </div>
                </>
              )}

              {currentAlgorithm === 'markov' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Pattern Type:</span>
                    <select
                      value={algorithms.markov.parameters.patternType}
                      onChange={(e) => handleParameterChange('markov', 'patternType', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="melody">Melody</option>
                      <option value="harmony">Harmony</option>
                      <option value="rhythm">Rhythm</option>
                    </select>
                  </div>

                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Learning Pattern:</span>
                    <select
                      value={algorithms.markov.parameters.learningPattern}
                      onChange={(e) => handleParameterChange('markov', 'learningPattern', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="ascendDescend">Ascend/Descend</option>
                      <option value="jazzChords">Jazz Chords</option>
                      <option value="pentatonic">Pentatonic</option>
                      <option value="fibonacci">Fibonacci</option>
                    </select>
                  </div>

                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Order:</span>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={algorithms.markov.parameters.order}
                      onChange={(e) => handleParameterChange('markov', 'order', parseInt(e.target.value, 10))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>{algorithms.markov.parameters.order}</span>
                  </div>

                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Randomness:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={algorithms.markov.parameters.randomness}
                      onChange={(e) => handleParameterChange('markov', 'randomness', parseFloat(e.target.value))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>
                      {Math.round(algorithms.markov.parameters.randomness * 100)}%
                    </span>
                  </div>

                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Density:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={algorithms.markov.parameters.density}
                      onChange={(e) => handleParameterChange('markov', 'density', parseFloat(e.target.value))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>
                      {Math.round(algorithms.markov.parameters.density * 100)}%
                    </span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Scale:</span>
                    <select
                      value={algorithms.markov.parameters.scale}
                      onChange={(e) => handleParameterChange('markov', 'scale', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="pentatonic">Pentatonic</option>
                      <option value="blues">Blues</option>
                      <option value="chromatic">Chromatic</option>
                      <option value="dorian">Dorian</option>
                      <option value="harmonicminor">Harmonic Minor</option>
                    </select>
                  </div>
                </>
              )}
              
              {currentAlgorithm === 'waveshaper' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Waveform:</span>
                    <select
                      value={algorithms.waveshaper.parameters.waveform}
                      onChange={(e) => handleParameterChange('waveshaper', 'waveform', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid #8e2de2',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="sine">Sine</option>
                      <option value="triangle">Triangle</option>
                      <option value="square">Square</option>
                      <option value="saw">Sawtooth</option>
                      <option value="noise">Noise</option>
                    </select>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Harmonics:</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={algorithms.waveshaper.parameters.harmonics}
                      onChange={(e) => handleParameterChange('waveshaper', 'harmonics', parseInt(e.target.value))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>
                      {algorithms.waveshaper.parameters.harmonics}
                    </span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Folding:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={algorithms.waveshaper.parameters.folding}
                      onChange={(e) => handleParameterChange('waveshaper', 'folding', parseFloat(e.target.value))}
                      style={glowStyles.slider}
                    />
                    <span style={glowStyles.value}>
                      {Math.round(algorithms.waveshaper.parameters.folding * 100)}%
                    </span>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Quantize:</span>
                    <input
                      type="checkbox"
                      checked={algorithms.waveshaper.parameters.quantize}
                      onChange={(e) => handleParameterChange('waveshaper', 'quantize', e.target.checked)}
                      style={{
                        accentColor: '#8e2de2',
                        width: '20px',
                        height: '20px'
                      }}
                    />
                  </div>
                </>
              )}
              
              {currentAlgorithm === 'ruleBasedHarmony' && (
                <>
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Progression:</span>
                    <select
                      value={algorithms.ruleBasedHarmony.parameters.progression}
                      onChange={(e) => handleParameterChange('ruleBasedHarmony', 'progression', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        flex: '1'
                      }}
                    >
                      <option value="ii-V-I">ii-V-I (Jazz)</option>
                      <option value="I-IV-V">I-IV-V (Blues/Rock)</option>
                      <option value="I-V-vi-IV">I-V-vi-IV (Pop)</option>
                      <option value="vi-IV-I-V">vi-IV-I-V (Pop Alt)</option>
                      <option value="Canon">Canon (Pachelbel)</option>
                      <option value="Circle">Circle of Fifths</option>
                    </select>
                  </div>
                  
                  <div style={glowStyles.controlRow}>
                    <span style={glowStyles.label}>Key:</span>
                    <select
                      value={algorithms.ruleBasedHarmony.parameters.keycenter}
                      onChange={(e) => handleParameterChange('ruleBasedHarmony', 'keycenter', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="C">C</option>
                      <option value="G">G</option>
                      <option value="D">D</option>
                      <option value="A">A</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="Bb">Bb</option>
                      <option value="Eb">Eb</option>
                      <option value="Cm">C minor</option>
                      <option value="Gm">G minor</option>
                    </select>
                    
                    <span style={{...glowStyles.label, marginLeft: '15px'}}>Voicing:</span>
                    <select
                      value={algorithms.ruleBasedHarmony.parameters.voicing}
                      onChange={(e) => handleParameterChange('ruleBasedHarmony', 'voicing', e.target.value)}
                      style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(100, 100, 255, 0.3)',
                        borderRadius: '4px',
                        padding: '5px 10px'
                      }}
                    >
                      <option value="close">Close</option>
                      <option value="drop2">Drop 2</option>
                      <option value="drop3">Drop 3</option>
                      <option value="spread">Spread</option>
                      <option value="shell">Shell voicing</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div style={{ flex: '1' }}>
          {/* Visualization Controls */}
          <div style={glowStyles.controlGroup}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              color: '#aaf',
              textShadow: '0 0 5px rgba(100, 100, 255, 0.5)',
            }}>
              Visualization
            </div>
            
            <div style={glowStyles.controlRow}>
              <span style={glowStyles.label}>Mode:</span>
              <select 
                value={visualizationMode} 
                onChange={handleVisualizationModeChange}
                style={{
                  background: 'rgba(30, 30, 50, 0.8)',
                  color: 'white',
                  border: '1px solid rgba(100, 100, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '5px 10px'
                }}
              >
                {availableModes.map(mode => (
                  <option key={mode} value={mode}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </option>
                ))}
              </select>
              
              <span style={{...glowStyles.label, marginLeft: '15px'}}>Colors:</span>
              <select 
                value={colorScheme} 
                onChange={handleColorSchemeChange}
                style={{
                  background: 'rgba(30, 30, 50, 0.8)',
                  color: 'white',
                  border: '1px solid rgba(100, 100, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '5px 10px'
                }}
              >
                {availableColorSchemes.map(scheme => (
                  <option key={scheme} value={scheme}>
                    {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={glowStyles.controlRow}>
              <span style={glowStyles.label}>Note Size:</span>
              <span style={glowStyles.value}>{noteSize.toFixed(1)}</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={noteSize}
                onChange={(e) => dispatch(setNoteSize(parseFloat(e.target.value)))}
                style={glowStyles.slider}
              />
            </div>
            
            <div style={glowStyles.controlRow}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                marginRight: '15px',
              }}>
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => dispatch(toggleLabels())}
                  style={{ marginRight: '5px' }}
                />
                <span style={glowStyles.label}>Show Labels</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                marginRight: '15px',
              }}>
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={() => dispatch(toggleAutoRotate())}
                  style={{ marginRight: '5px' }}
                />
                <span style={glowStyles.label}>Auto Rotate</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={pulseEffect}
                  onChange={() => dispatch(togglePulseEffect())}
                  style={{ marginRight: '5px' }}
                />
                <span style={glowStyles.label}>Pulse Effect</span>
              </label>
            </div>
            
            {/* Performance Settings */}
            <div style={glowStyles.controlRow}>
              <span style={glowStyles.label}>Performance:</span>
              <select 
                value={renderQuality}
                onChange={(e) => dispatch(setRenderQuality(e.target.value))}
                style={{
                  background: 'rgba(30, 30, 50, 0.8)',
                  color: 'white',
                  border: '1px solid rgba(100, 100, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  marginLeft: '10px'
                }}
              >
                <option value="low">Low (faster)</option>
                <option value="medium">Medium</option>
                <option value="high">High (better quality)</option>
              </select>
            </div>
          </div>
          
          {/* MegaFM Synth Controls */}
          {midiConnected && (
            <div style={{...glowStyles.controlGroup, marginTop: '15px'}}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                color: '#aaf',
                textShadow: '0 0 5px rgba(100, 100, 255, 0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>MegaFM Synth Controls</span>
                <select 
                  onChange={(e) => {
                    // Apply presets based on selection
                    const presetType = e.target.value;
                    
                    switch(presetType) {
                      case 'bass':
                        handleMegaFMParamChange(CC.ALGORITHM, 5);
                        handleMegaFMParamChange(CC.FEEDBACK, 90);
                        handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 0);
                        handleMegaFMParamChange(CC.OP1_DECAY_RATE, 60);
                        handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 40);
                        handleMegaFMParamChange(CC.OP1_RELEASE_RATE, 20);
                        handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 70);
                        handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 90);
                        handleMegaFMParamChange(CC.LFO1_RATE, 20);
                        handleMegaFMParamChange(CC.LFO1_DEPTH, 10);
                        break;
                        
                      case 'pad':
                        handleMegaFMParamChange(CC.ALGORITHM, 2);
                        handleMegaFMParamChange(CC.FEEDBACK, 50);
                        handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 70);
                        handleMegaFMParamChange(CC.OP1_DECAY_RATE, 30);
                        handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 80);
                        handleMegaFMParamChange(CC.OP1_RELEASE_RATE, 60);
                        handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 60);
                        handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 70);
                        handleMegaFMParamChange(CC.LFO1_RATE, 40);
                        handleMegaFMParamChange(CC.LFO1_DEPTH, 30);
                        break;
                        
                      case 'lead':
                        handleMegaFMParamChange(CC.ALGORITHM, 1);
                        handleMegaFMParamChange(CC.FEEDBACK, 100);
                        handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 20);
                        handleMegaFMParamChange(CC.OP1_DECAY_RATE, 50);
                        handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 60);
                        handleMegaFMParamChange(CC.OP1_RELEASE_RATE, 30);
                        handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 80);
                        handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 60);
                        handleMegaFMParamChange(CC.LFO1_RATE, 60);
                        handleMegaFMParamChange(CC.LFO1_DEPTH, 40);
                        handleMegaFMParamChange(CC.VIBRATO_RATE, 50);
                        handleMegaFMParamChange(CC.VIBRATO_DEPTH, 20);
                        break;
                        
                      case 'perc':
                        handleMegaFMParamChange(CC.ALGORITHM, 8);
                        handleMegaFMParamChange(CC.FEEDBACK, 110);
                        handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 0);
                        handleMegaFMParamChange(CC.OP1_DECAY_RATE, 100);
                        handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 0);
                        handleMegaFMParamChange(CC.OP1_RELEASE_RATE, 20);
                        handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 100);
                        handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 100);
                        handleMegaFMParamChange(CC.OP2_ATTACK_RATE, 0);
                        handleMegaFMParamChange(CC.OP2_DECAY_RATE, 90);
                        handleMegaFMParamChange(CC.LFO1_RATE, 0);
                        handleMegaFMParamChange(CC.LFO1_DEPTH, 0);
                        break;
                        
                      case 'fx':
                        handleMegaFMParamChange(CC.ALGORITHM, 3);
                        handleMegaFMParamChange(CC.FEEDBACK, 120);
                        handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 30);
                        handleMegaFMParamChange(CC.OP1_DECAY_RATE, 40);
                        handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 50);
                        handleMegaFMParamChange(CC.OP1_RELEASE_RATE, 40);
                        handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 90);
                        handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 80);
                        handleMegaFMParamChange(CC.LFO1_RATE, 100);
                        handleMegaFMParamChange(CC.LFO1_DEPTH, 80);
                        handleMegaFMParamChange(CC.LFO2_RATE, 70);
                        handleMegaFMParamChange(CC.LFO2_DEPTH, 60);
                        break;
                    }
                  }}
                  style={{
                    background: 'rgba(60, 50, 100, 0.8)',
                    color: 'white',
                    border: '1px solid rgba(100, 100, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '5px 10px'
                  }}
                >
                  <option value="">Sound Presets</option>
                  <option value="bass">Bass</option>
                  <option value="pad">Pad</option>
                  <option value="lead">Lead</option>
                  <option value="perc">Percussion</option>
                  <option value="fx">FX</option>
                </select>
              </div>
              
              {/* MegaFM parameter tabs */}
              <div>
                {/* Tab buttons */}
                <div style={{
                  display: 'flex',
                  marginBottom: '10px',
                  borderBottom: '1px solid rgba(100, 100, 255, 0.3)'
                }}>
                  {['Global', 'Operators', 'Envelopes', 'Voicing', 'LFO', 'Presets'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveFMTab(tab.toLowerCase())}
                      style={{
                        ...glowStyles.button,
                        ...(activeFMTab === tab.toLowerCase() ? {
                          background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                          boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                        } : {
                          background: 'rgba(40, 40, 60, 0.6)',
                          boxShadow: 'none'
                        }),
                        borderRadius: '4px 4px 0 0',
                        margin: '0 2px 0 0',
                        fontSize: '14px',
                        flex: '1'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                {/* Tab content */}
                {activeFMTab === 'global' && (
                  <div>
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Algorithm:</span>
                      <select 
                        value={currentFmAlgorithm ? currentFmAlgorithm.replace('algo', '') : '1'}
                        onChange={(e) => {
                          const algoValue = parseInt(e.target.value, 10);
                          
                          // MEGAfm algorithms are 1-8 range (not 0-7)
                          // Debug logs to help troubleshoot
                          console.log(`Setting MEGAfm algorithm to: ${algoValue} using CC: ${CC.ALGORITHM}`);
                          
                          // Verify MIDI is connected
                          if (midiConnected && midiOutput) {
                            // Send the MIDI CC for algorithm
                            handleMegaFMParamChange(CC.ALGORITHM, algoValue);
                            
                            // Update current algorithm for visualization
                            setCurrentFmAlgorithm(`algo${algoValue}`);
                            
                            // Additional logging to help with troubleshooting
                            console.log(`Algorithm updated to: algo${algoValue}`);
                          } else {
                            console.warn("MIDI not connected, cannot change algorithm");
                          }
                        }}
                        style={{
                          background: 'rgba(30, 30, 50, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(100, 100, 255, 0.3)',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          flex: '1'
                        }}
                      >
                        <option value="1">Algorithm 1 (Stacked carriers)</option>
                        <option value="2">Algorithm 2 (Parallel modulation)</option>
                        <option value="3">Algorithm 3 (Complex)</option>
                        <option value="4">Algorithm 4 (Series+parallel)</option>
                        <option value="5">Algorithm 5 (Bass)</option>
                        <option value="6">Algorithm 6 (Percussion)</option>
                        <option value="7">Algorithm 7 (Simple stack)</option>
                        <option value="8">Algorithm 8 (Independent)</option>
                      </select>
                    </div>
                    
                    {/* Debug indicator for current algorithm */}
                    <div style={{
                      fontSize: '12px',
                      color: '#aaf',
                      textAlign: 'center',
                      marginTop: '2px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '3px',
                      borderRadius: '3px'
                    }}>
                      Current algorithm: {currentFmAlgorithm ? currentFmAlgorithm.replace('algo', '') : '1'} (CC: {CC.ALGORITHM})
                    </div>
                    
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Feedback:</span>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        defaultValue="64"
                        onChange={(e) => {
                          const feedbackValue = parseInt(e.target.value, 10);
                          
                          // Debug logs
                          console.log(`Setting Feedback to: ${feedbackValue} using CC: ${CC.FEEDBACK}`);
                          
                          if (midiConnected && midiOutput) {
                            // Send feedback value
                            handleMegaFMParamChange(CC.FEEDBACK, feedbackValue);
                          } else {
                            console.warn("MIDI not connected, cannot change feedback");
                          }
                        }}
                        style={{...glowStyles.slider, flex: '1'}}
                      />
                      <span style={glowStyles.value}>{Math.round((64/127) * 100)}%</span>
                    </div>
                    
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>FAT:</span>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        defaultValue="20"
                        onChange={(e) => {
                          const fatValue = parseInt(e.target.value, 10);
                          
                          // Debug logs
                          console.log(`Setting FAT to: ${fatValue} using CC: ${CC.FAT}`);
                          
                          if (midiConnected && midiOutput) {
                            // Send FAT value and update local state
                            handleMegaFMParamChange(CC.FAT, fatValue);
                            setFatValue(fatValue); // Update state for the voicing tab
                          } else {
                            console.warn("MIDI not connected, cannot change FAT parameter");
                          }
                        }}
                        style={{...glowStyles.slider, flex: '1'}}
                      />
                      <span style={glowStyles.value}>{Math.round((20/127) * 100)}%</span>
                    </div>
                    
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Voice Mode:</span>
                      <select 
                        value={Object.keys(VoiceMode)[currentVoiceMode] ? Object.keys(VoiceMode)[currentVoiceMode].toLowerCase() : "poly12"}
                        onChange={(e) => {
                          // Get the actual value for the given Voice Mode
                          const mode = e.target.value;
                          let voiceModeEnum;
                          
                          switch(mode) {
                            case 'poly12':
                              voiceModeEnum = VoiceMode.POLY12;
                              break;
                            case 'wide6':
                              voiceModeEnum = VoiceMode.WIDE6;
                              break;
                            case 'wide4':
                              voiceModeEnum = VoiceMode.WIDE4;
                              break;
                            case 'wide3':
                              voiceModeEnum = VoiceMode.WIDE3;
                              break;
                            case 'dual_ch3':
                              voiceModeEnum = VoiceMode.DUAL_CH3;
                              break;
                            case 'unison':
                              voiceModeEnum = VoiceMode.UNISON;
                              break;
                            case 'auto_chord':
                              voiceModeEnum = VoiceMode.AUTO_CHORD;
                              break;
                            default:
                              voiceModeEnum = VoiceMode.POLY12;
                          }
                          
                          // Debug logs
                          console.log(`Setting Voice Mode to: ${mode} (enum value: ${voiceModeEnum}) using CC: ${CC.VOICE_MODE}`);
                          
                          if (midiConnected && midiOutput) {
                            // Use the proper voice mode setting function
                            setVoiceMode(midiOutput, voiceModeEnum);
                            setCurrentVoiceMode(voiceModeEnum);
                            
                            // Apply additional settings based on mode
                            switch(mode) {
                              case 'wide6':
                              case 'wide4':
                              case 'wide3':
                                // Wide detune between chips - set FAT appropriately
                                handleMegaFMParamChange(CC.FAT, 60);
                                break;
                              case 'dual_ch3':
                                // Special Ch3 mode needs specific operator settings
                                handleMegaFMParamChange(CC.OP1_MULTIPLIER, 3);
                                handleMegaFMParamChange(CC.OP2_MULTIPLIER, 2);
                                handleMegaFMParamChange(CC.OP3_MULTIPLIER, 4);
                                handleMegaFMParamChange(CC.OP4_MULTIPLIER, 1);
                                break;
                              case 'unison':
                                // All voices in unison mode
                                handleMegaFMParamChange(CC.FAT, 100);
                                break;
                            }
                            
                            console.log(`Voice mode updated to: ${mode}`);
                          } else {
                            console.warn("MIDI not connected, cannot change voice mode");
                          }
                        }}
                        style={{
                          background: 'rgba(30, 30, 50, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(100, 100, 255, 0.3)',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          flex: '1'
                        }}
                      >
                        <option value="poly12">Poly12 (12-voice polyphony)</option>
                        <option value="wide6">Wide6 (6-voice detuned)</option>
                        <option value="wide4">Wide4 (4-voice detuned)</option>
                        <option value="wide3">Wide3 (3-voice detuned)</option>
                        <option value="dual_ch3">Dual Ch3 (Special mode)</option>
                        <option value="unison">Unison (All voices)</option>
                        <option value="auto_chord">Auto Chord</option>
                      </select>
                    </div>
                    
                    {/* Debug indicator for voice mode */}
                    <div style={{
                      fontSize: '12px',
                      color: '#aaf',
                      textAlign: 'center',
                      marginTop: '2px', 
                      marginBottom: '5px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '3px',
                      borderRadius: '3px'
                    }}>
                      Current voice mode: {Object.keys(VoiceMode)[currentVoiceMode]} (CC: {CC.VOICE_MODE})
                    </div>
                    
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Vibrato Rate:</span>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        defaultValue="40"
                        onChange={(e) => handleMegaFMParamChange(CC.VIBRATO_RATE, parseInt(e.target.value, 10))}
                        style={{...glowStyles.slider, flex: '1'}}
                      />
                      <span style={glowStyles.value}>{Math.round((40/127) * 100)}%</span>
                    </div>
                    
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Vibrato Depth:</span>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        defaultValue="20"
                        onChange={(e) => handleMegaFMParamChange(CC.VIBRATO_DEPTH, parseInt(e.target.value, 10))}
                        style={{...glowStyles.slider, flex: '1'}}
                      />
                      <span style={glowStyles.value}>{Math.round((20/127) * 100)}%</span>
                    </div>
                    
                    {/* Algorithm Visualization */}
                    <div style={{
                      marginTop: '15px',
                      height: '150px',
                      background: 'rgba(10, 10, 20, 0.5)',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(100, 100, 255, 0.2)',
                      padding: '10px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        color: '#aaf',
                      }}>
                        FM Algorithm Visualization
                      </div>
                      
                      <svg width="100%" height="100%" viewBox="0 0 240 100" preserveAspectRatio="xMidYMid meet">
                        {/* Algorithm 1 */}
                        {currentFmAlgorithm === 'algo1' && (
                          <>
                            {/* Operator boxes */}
                            <rect x="10" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="30" y="24" textAnchor="middle" fill="white" fontSize="12">OP1</text>
                            
                            <rect x="70" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="90" y="24" textAnchor="middle" fill="white" fontSize="12">OP2</text>
                            
                            <rect x="130" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="150" y="24" textAnchor="middle" fill="white" fontSize="12">OP3</text>
                            
                            <rect x="190" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="210" y="24" textAnchor="middle" fill="white" fontSize="12">OP4</text>
                            
                            {/* Connection arrows */}
                            <line x1="30" y1="30" x2="30" y2="70" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="90" y1="30" x2="90" y2="70" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="150" y1="30" x2="150" y2="70" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="210" y1="30" x2="210" y2="70" stroke="#8e2de2" strokeWidth="2" />
                            
                            {/* Output text */}
                            <text x="30" y="85" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            <text x="90" y="85" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            <text x="150" y="85" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            <text x="210" y="85" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            
                            {/* Feedback loop */}
                            <path d="M10,15 C0,15 0,5 10,5 L50,5 C60,5 60,15 50,15" fill="none" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="3,2" />
                            <text x="30" y="2" textAnchor="middle" fill="#ff5500" fontSize="8">FEEDBACK</text>
                          </>
                        )}
                        
                        {/* Algorithm 2 */}
                        {currentFmAlgorithm === 'algo2' && (
                          <>
                            {/* Operator boxes */}
                            <rect x="10" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="30" y="24" textAnchor="middle" fill="white" fontSize="12">OP1</text>
                            
                            <rect x="10" y="50" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="30" y="64" textAnchor="middle" fill="white" fontSize="12">OP2</text>
                            
                            <rect x="130" y="30" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="150" y="44" textAnchor="middle" fill="white" fontSize="12">OP3</text>
                            
                            <rect x="190" y="30" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="210" y="44" textAnchor="middle" fill="white" fontSize="12">OP4</text>
                            
                            {/* Connection arrows */}
                            <line x1="50" y1="20" x2="130" y2="40" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="50" y1="60" x2="130" y2="40" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="170" y1="40" x2="190" y2="40" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="210" y1="50" x2="210" y2="70" stroke="#8e2de2" strokeWidth="2" />
                            
                            {/* Output text */}
                            <text x="210" y="85" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            
                            {/* Feedback loop */}
                            <path d="M10,15 C0,15 0,5 10,5 L50,5 C60,5 60,15 50,15" fill="none" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="3,2" />
                            <text x="30" y="2" textAnchor="middle" fill="#ff5500" fontSize="8">FEEDBACK</text>
                          </>
                        )}
                        
                        {/* Add other algorithms 3-8 with different visualizations */}
                        {/* This is a simplified visualization - each algorithm would have its own unique layout */}
                        {!(currentFmAlgorithm === 'algo1' || currentFmAlgorithm === 'algo2') && (
                          <>
                            {/* Default visualization for algorithms 3-8 */}
                            <rect x="20" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="40" y="24" textAnchor="middle" fill="white" fontSize="12">OP1</text>
                            
                            <rect x="80" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="100" y="24" textAnchor="middle" fill="white" fontSize="12">OP2</text>
                            
                            <rect x="140" y="10" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="160" y="24" textAnchor="middle" fill="white" fontSize="12">OP3</text>
                            
                            <rect x="80" y="50" width="40" height="20" rx="5" fill="#4a00e0" stroke="#8e2de2" strokeWidth="2" />
                            <text x="100" y="64" textAnchor="middle" fill="white" fontSize="12">OP4</text>
                            
                            {/* Connection arrows - generic layout */}
                            <line x1="40" y1="30" x2="40" y2="80" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="60" y1="20" x2="80" y2="20" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="120" y1="20" x2="140" y2="20" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="100" y1="30" x2="100" y2="50" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="160" y1="30" x2="160" y2="80" stroke="#8e2de2" strokeWidth="2" />
                            <line x1="100" y1="70" x2="100" y2="80" stroke="#8e2de2" strokeWidth="2" />
                            
                            {/* Generic output indicators */}
                            <text x="40" y="95" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            <text x="100" y="95" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            <text x="160" y="95" textAnchor="middle" fill="#aaf" fontSize="10">OUT</text>
                            
                            {/* Feedback loop */}
                            <path d="M20,15 C10,15 10,5 20,5 L60,5 C70,5 70,15 60,15" fill="none" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="3,2" />
                            <text x="40" y="2" textAnchor="middle" fill="#ff5500" fontSize="8">FEEDBACK</text>
                            
                            {/* Algorithm number for reference */}
                            <text x="200" y="50" textAnchor="middle" fill="#ffffff" fontSize="12">
                              Algorithm {currentFmAlgorithm.replace('algo', '')}
                            </text>
                            <text x="200" y="65" textAnchor="middle" fill="#aaaaff" fontSize="10">
                              See manual for details
                            </text>
                          </>
                        )}
                      </svg>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'operators' && (
                  <div>
                    {/* Operator selector tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '10px'
                    }}>
                      {[1, 2, 3, 4].map(op => (
                        <button
                          key={op}
                          onClick={() => setActiveOperator(op)}
                          style={{
                            ...glowStyles.button,
                            ...(activeOperator === op ? {
                              background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                              boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                            } : {
                              background: 'rgba(40, 40, 60, 0.6)',
                              boxShadow: 'none'
                            }),
                            margin: '0 2px',
                            fontSize: '14px',
                            flex: '1'
                          }}
                        >
                          OP {op}
                        </button>
                      ))}
                    </div>
                    
                    {/* Operator parameters - dynamically selects CC based on active operator */}
                    <div>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Total Level:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="100"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_TOTAL_LEVEL :
                                      activeOperator === 2 ? CC.OP2_TOTAL_LEVEL :
                                      activeOperator === 3 ? CC.OP3_TOTAL_LEVEL :
                                      CC.OP4_TOTAL_LEVEL;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>{Math.round((100/127) * 100)}%</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Multiplier:</span>
                        <select
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_MULTIPLIER :
                                      activeOperator === 2 ? CC.OP2_MULTIPLIER :
                                      activeOperator === 3 ? CC.OP3_MULTIPLIER :
                                      CC.OP4_MULTIPLIER;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          defaultValue="1"
                          style={{
                            background: 'rgba(30, 30, 50, 0.8)',
                            color: 'white',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            width: '80px'
                          }}
                        >
                          <option value="0">0.5×</option>
                          <option value="1">1×</option>
                          <option value="2">2×</option>
                          <option value="3">3×</option>
                          <option value="4">4×</option>
                          <option value="5">5×</option>
                          <option value="6">6×</option>
                          <option value="7">7×</option>
                        </select>
                        
                        <span style={{...glowStyles.label, marginLeft: '10px'}}>Detune:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="64"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_DETUNE :
                                      activeOperator === 2 ? CC.OP2_DETUNE :
                                      activeOperator === 3 ? CC.OP3_DETUNE :
                                      CC.OP4_DETUNE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>0</span>
                      </div>
                      
                      <div style={{
                        margin: '15px 0 10px',
                        fontSize: '13px',
                        color: '#aaf',
                        textAlign: 'center',
                        padding: '5px',
                        background: 'rgba(20, 20, 50, 0.4)',
                        borderRadius: '4px'
                      }}>
                        <span>Tip: Use the Envelopes tab to configure ADSR for Operator {activeOperator}</span>
                      </div>
                      
                      {/* Rate Scaling with detailed control based on MEGAfm Manual */}
                      <div style={{
                        marginTop: '10px',
                        padding: '8px',
                        background: 'rgba(20, 20, 40, 0.4)',
                        borderRadius: '4px'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#aaf',
                          marginBottom: '5px',
                          fontWeight: 'bold'
                        }}>
                          Rate Scaling
                        </div>
                        
                        <div style={glowStyles.controlRow}>
                          <span style={glowStyles.label}>Amount:</span>
                          <input
                            type="range"
                            min="0"
                            max="3"
                            step="1"
                            defaultValue="0"
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              const cc = activeOperator === 1 ? CC.OP1_RATE_SCALING :
                                        activeOperator === 2 ? CC.OP2_RATE_SCALING :
                                        activeOperator === 3 ? CC.OP3_RATE_SCALING :
                                        CC.OP4_RATE_SCALING;
                              handleMegaFMParamChange(cc, value);
                              console.log(`Rate scaling for OP${activeOperator}: ${value}`);
                            }}
                            style={{...glowStyles.slider, flex: '1'}}
                          />
                          <span style={{...glowStyles.value, minWidth: '30px'}}>0</span>
                        </div>
                        
                        <div style={{
                          fontSize: '11px', 
                          color: '#aaf',
                          marginTop: '5px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '5px',
                          borderRadius: '3px',
                          lineHeight: '1.4'
                        }}>
                          <p style={{margin: '0 0 3px 0'}}>
                            This feature speeds up envelopes at higher note frequencies, creating a piano-like effect.
                          </p>
                          <p style={{margin: '0'}}>
                            Range: 0-3 (0 = no scaling, 3 = maximum scaling). Particularly effective with looping envelopes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'envelopes' && (
                  <div>
                    {/* Envelope operator selector tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '10px'
                    }}>
                      {[1, 2, 3, 4].map(op => (
                        <button
                          key={op}
                          onClick={() => setActiveOperator(op)}
                          style={{
                            ...glowStyles.button,
                            ...(activeOperator === op ? {
                              background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                              boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                            } : {
                              background: 'rgba(40, 40, 60, 0.6)',
                              boxShadow: 'none'
                            }),
                            margin: '0 2px',
                            fontSize: '14px',
                            flex: '1'
                          }}
                        >
                          OP {op}
                        </button>
                      ))}
                    </div>
                    
                    {/* Enhanced envelope visualization with loop indicators */}
                    <div style={{
                      height: '100px',
                      background: 'rgba(10, 10, 20, 0.5)',
                      margin: '0 0 10px 0',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: envelopeLoopActive ? '1px solid rgba(0, 255, 200, 0.5)' : '1px solid rgba(100, 100, 255, 0.2)'
                    }}>
                      {/* Simple SVG visualization of ADSR envelope */}
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Background grid */}
                        <g opacity="0.3">
                          {Array.from({length: 5}).map((_, i) => (
                            <line 
                              key={`v-${i}`}
                              x1={20 * (i + 1)} 
                              y1="0" 
                              x2={20 * (i + 1)} 
                              y2="100" 
                              stroke="rgba(100, 100, 255, 0.3)" 
                              strokeWidth="1"
                            />
                          ))}
                          {Array.from({length: 4}).map((_, i) => (
                            <line 
                              key={`h-${i}`}
                              x1="0" 
                              y1={25 * (i + 1)} 
                              x2="100" 
                              y2={25 * (i + 1)} 
                              stroke="rgba(100, 100, 255, 0.3)" 
                              strokeWidth="1"
                            />
                          ))}
                        </g>
                        
                        {/* Main envelope shape */}
                        <polyline
                          points="0,100 10,20 30,50 80,50 100,100"
                          fill="none"
                          stroke="rgba(142, 45, 226, 0.8)"
                          strokeWidth="2"
                        />
                        
                        {/* Envelope phase markings */}
                        <circle cx="10" cy="20" r="3" fill="rgba(142, 45, 226, 0.8)" /> {/* A peak */}
                        <circle cx="30" cy="50" r="3" fill="rgba(142, 45, 226, 0.8)" /> {/* D/S transition */}
                        <circle cx="80" cy="50" r="3" fill="rgba(142, 45, 226, 0.8)" /> {/* S/R transition */}
                        
                        {/* Envelope loop indicators */}
                        {envelopeLoopActive && (
                          <>
                            {/* Loop indicator arrow */}
                            <path
                              d={envelopeLoopPingpong 
                                ? "M30,35 C50,20 60,80 80,35 M30,35 L35,30 M30,35 L35,40 M80,35 L75,30 M80,35 L75,40" // Ping-pong bidirectional
                                : "M30,35 C45,20 65,20 80,35 M80,35 L75,30 M80,35 L75,40" // Forward only
                              }
                              fill="none"
                              stroke="rgba(0, 255, 200, 0.8)"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            
                            {/* Loop region highlight */}
                            <rect 
                              x="30" 
                              y="0" 
                              width="50" 
                              height="100" 
                              fill="rgba(0, 255, 200, 0.1)" 
                              stroke="none" 
                            />
                            
                            {/* Loop label */}
                            <text 
                              x="50" 
                              y="85" 
                              textAnchor="middle" 
                              fill="rgba(0, 255, 200, 0.8)"
                              fontSize="8"
                              fontWeight="bold"
                            >
                              {envelopeLoopPingpong ? 'PING-PONG LOOP' : 'FORWARD LOOP'}
                            </text>
                          </>
                        )}
                      </svg>
                      
                      {/* Envelope phase labels */}
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '0',
                        right: '0',
                        display: 'flex',
                        justifyContent: 'space-around',
                        fontSize: '12px',
                        color: '#aaa',
                        fontWeight: 'bold'
                      }}>
                        <span style={{marginLeft: '5px'}}>A</span>
                        <span>D</span>
                        <span style={{marginLeft: '10px'}}>S</span>
                        <span style={{marginRight: '5px'}}>R</span>
                      </div>
                      
                      {/* Operator number indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '5px',
                        background: 'rgba(142, 45, 226, 0.8)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {activeOperator}
                      </div>
                    </div>
                    
                    {/* ADSR controls for the selected operator */}
                    <div>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Attack:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="20"
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            const cc = activeOperator === 1 ? CC.OP1_ATTACK_RATE :
                                      activeOperator === 2 ? CC.OP2_ATTACK_RATE :
                                      activeOperator === 3 ? CC.OP3_ATTACK_RATE :
                                      CC.OP4_ATTACK_RATE;
                            handleMegaFMParamChange(cc, value);
                            // Store timestamp for last fader movement to detect double-activation
                            setLastEnvelopeFaderTimestamp(Date.now());
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>20</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Decay:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="80"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_DECAY_RATE :
                                      activeOperator === 2 ? CC.OP2_DECAY_RATE :
                                      activeOperator === 3 ? CC.OP3_DECAY_RATE :
                                      CC.OP4_DECAY_RATE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                            setLastEnvelopeFaderTimestamp(Date.now());
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>80</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Sustain Level:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="60"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_SUSTAIN_LEVEL :
                                      activeOperator === 2 ? CC.OP2_SUSTAIN_LEVEL :
                                      activeOperator === 3 ? CC.OP3_SUSTAIN_LEVEL :
                                      CC.OP4_SUSTAIN_LEVEL;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                            setLastEnvelopeFaderTimestamp(Date.now());
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>60</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Sustain Rate:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="40"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_SUSTAIN_RATE :
                                      activeOperator === 2 ? CC.OP2_SUSTAIN_RATE :
                                      activeOperator === 3 ? CC.OP3_SUSTAIN_RATE :
                                      CC.OP4_SUSTAIN_RATE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                            setLastEnvelopeFaderTimestamp(Date.now());
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>40</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Release:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="40"
                          onChange={(e) => {
                            const cc = activeOperator === 1 ? CC.OP1_RELEASE_RATE :
                                      activeOperator === 2 ? CC.OP2_RELEASE_RATE :
                                      activeOperator === 3 ? CC.OP3_RELEASE_RATE :
                                      CC.OP4_RELEASE_RATE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                            setLastEnvelopeFaderTimestamp(Date.now());
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>40</span>
                      </div>
                      
                      {/* Envelope looping controls - Implementation according to MEGAfm Manual */}
                      <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(20, 20, 40, 0.5)',
                        borderRadius: '6px',
                        border: '1px solid rgba(100, 100, 255, 0.2)'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#aaf',
                          marginBottom: '8px',
                          textAlign: 'center'
                        }}>
                          Envelope Looping Controls for Operator {activeOperator}
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '10px',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={() => {
                              // Detect if we're within the window of a recent fader movement (brief timeframe from manual)
                              const now = Date.now();
                              if (now - lastEnvelopeFaderTimestamp < 1500) { // 1.5 second window
                                // Toggle envelope looping for this operator
                                const newLoopState = !envelopeLoopActive;
                                setEnvelopeLoopActive(newLoopState);
                                
                                // Actually send the MIDI command to toggle envelope looping
                                if (midiConnected && midiOutput) {
                                  setEnvelopeLooping(
                                    midiOutput, 
                                    activeOperator, 
                                    newLoopState, 
                                    envelopeLoopPingpong
                                  );
                                }
                                
                                console.log(`Toggled envelope loop for operator ${activeOperator}: ${newLoopState ? 'ON' : 'OFF'}`);
                              } else {
                                // Show a notification
                                alert("Move one of the envelope faders first to select the envelope to loop (within 1.5 seconds)");
                                console.log("Move a fader first to select the envelope to loop");
                              }
                            }}
                            style={{
                              ...glowStyles.button,
                              ...(envelopeLoopActive ? {
                                background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                                boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                              } : {}),
                              fontSize: '13px',
                              padding: '8px 14px'
                            }}
                          >
                            {envelopeLoopActive ? 'Loop ON' : 'Activate Loop'}
                          </button>
                          
                          <div style={{width: '10px'}}></div>
                          
                          <button
                            onClick={() => {
                              // SAW waveform in manual = forward loop
                              if (envelopeLoopActive) {
                                setEnvelopeLoopPingpong(false);
                                
                                if (midiConnected && midiOutput) {
                                  setEnvelopeLooping(
                                    midiOutput, 
                                    activeOperator, 
                                    true, // Keep looping active 
                                    false // Forward mode
                                  );
                                }
                                
                                console.log(`Set envelope loop direction to forward (saw)`);
                              }
                            }}
                            disabled={!envelopeLoopActive}
                            style={{
                              ...glowStyles.button,
                              ...(envelopeLoopActive && !envelopeLoopPingpong ? {
                                background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                                boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                              } : {}),
                              ...(envelopeLoopActive ? {} : {
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              }),
                              fontSize: '13px',
                              padding: '8px 14px'
                            }}
                          >
                            <span role="img" aria-label="Forward">→</span> Forward
                          </button>
                          
                          <button
                            onClick={() => {
                              // TRIANGLE waveform in manual = ping-pong loop
                              if (envelopeLoopActive) {
                                setEnvelopeLoopPingpong(true);
                                
                                if (midiConnected && midiOutput) {
                                  setEnvelopeLooping(
                                    midiOutput, 
                                    activeOperator, 
                                    true, // Keep looping active
                                    true // Ping-pong mode
                                  );
                                }
                                
                                console.log(`Set envelope loop direction to ping-pong (triangle)`);
                              }
                            }}
                            disabled={!envelopeLoopActive}
                            style={{
                              ...glowStyles.button,
                              ...(envelopeLoopActive && envelopeLoopPingpong ? {
                                background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                                boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                              } : {}),
                              ...(envelopeLoopActive ? {} : {
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              }),
                              fontSize: '13px',
                              padding: '8px 14px'
                            }}
                          >
                            <span role="img" aria-label="Ping-Pong">↔</span> Ping-Pong
                          </button>
                        </div>
                        
                        <div style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#999',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          Move any envelope fader, then quickly press Loop to activate
                        </div>
                      </div>
                      
                      {/* Advanced ADSR Information */}
                      <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        background: 'rgba(20, 20, 40, 0.5)',
                        borderRadius: '6px',
                        border: '1px solid rgba(100, 100, 255, 0.2)'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#aaf',
                          marginBottom: '8px',
                          textAlign: 'center'
                        }}>
                          MEGAfm Envelope Information
                        </div>
                        
                        <div style={{
                          marginTop: '5px',
                          fontSize: '12px',
                          color: '#aaa',
                          padding: '5px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '4px',
                          lineHeight: '1.4'
                        }}>
                          <p style={{margin: '0 0 5px 0'}}>
                            <b>How envelope controls work on the MEGAfm:</b>
                          </p>
                          <p style={{margin: '0 0 5px 0'}}>
                            • <b>Attack Rate (AR):</b> Higher values = faster attack
                          </p>
                          <p style={{margin: '0 0 5px 0'}}>
                            • <b>Decay Rate (DR):</b> Higher values = faster decay to sustain level
                          </p>
                          <p style={{margin: '0 0 5px 0'}}>
                            • <b>Sustain Level (SL):</b> Volume level during sustain phase
                          </p>
                          <p style={{margin: '0 0 5px 0'}}>
                            • <b>Sustain Rate (SR):</b> How quickly level falls during sustain phase
                          </p>
                          <p style={{margin: '0'}}>
                            • <b>Release Rate (RR):</b> How quickly sound fades after key release
                          </p>
                        </div>
                        
                        <div style={{
                          marginTop: '10px',
                          fontSize: '12px',
                          color: '#aaf',
                          fontStyle: 'italic',
                          textAlign: 'center'
                        }}>
                          Note: Rate Scaling control is available in the Operators tab
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'voicing' && (
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#aaf',
                      marginBottom: '10px',
                      textAlign: 'center'
                    }}>
                      Advanced Voice Mode Controls
                    </div>
                    
                    {/* Voice Mode Selection */}
                    <div style={glowStyles.controlGroup}>
                      <div style={{
                        fontSize: '13px',
                        color: '#aaf',
                        marginBottom: '8px'
                      }}>
                        Voice Mode
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '5px',
                        marginBottom: '10px'
                      }}>
                        {Object.entries(VoiceMode).map(([name, value]) => (
                          <button
                            key={name}
                            onClick={() => handleVoiceModeChange(value)}
                            disabled={mpeMode && value !== VoiceMode.POLY12}
                            style={{
                              ...glowStyles.button,
                              ...(currentVoiceMode === value ? {
                                background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                                boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                              } : {}),
                              ...(mpeMode && value !== VoiceMode.POLY12 ? {
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              } : {}),
                              fontSize: '12px',
                              padding: '6px 4px'
                            }}
                          >
                            {name.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      
                      {/* Mode description */}
                      <div style={{
                        fontSize: '12px',
                        color: '#ccc',
                        margin: '0 0 10px 0',
                        padding: '5px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px'
                      }}>
                        {currentVoiceMode === VoiceMode.POLY12 && "12-voice polyphony distributed across both chips in alternating left/right configuration."}
                        {currentVoiceMode === VoiceMode.WIDE6 && "Up to 6 notes per chip, can be detuned with the Fat knob."}
                        {currentVoiceMode === VoiceMode.WIDE4 && "Limited to 4 voices, always staggered between chips."}
                        {currentVoiceMode === VoiceMode.WIDE3 && "Limited to 3 voices, always staggered between chips."}
                        {currentVoiceMode === VoiceMode.DUAL_CH3 && "Special mode where channel 3's operators can be individually detuned. Great for experimental/percussive sounds."}
                        {currentVoiceMode === VoiceMode.UNISON && "All voices play at once in unison, detuned using the Fat knob."}
                        {currentVoiceMode === VoiceMode.AUTO_CHORD && "Automatically generates chords from single notes based on a stored chord shape."}
                      </div>
                    </div>
                    
                    {/* Fat/Detune + Glide Controls */}
                    <div style={glowStyles.controlGroup}>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Fat/Detune:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          value={fatValue}
                          onChange={(e) => handleFatChange(parseInt(e.target.value, 10))}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>{fatValue}</span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <span style={glowStyles.label}>Fat Mode:</span>
                        <button
                          onClick={handleFatModeToggle}
                          style={{
                            ...glowStyles.button,
                            fontSize: '12px',
                            padding: '5px 10px',
                            marginLeft: '10px',
                            background: fatOctaveMode ? 
                              'linear-gradient(to right, #00a0e0, #00e0a0)' : 
                              'linear-gradient(to right, #e000a0, #a000e0)'
                          }}
                        >
                          {fatOctaveMode ? '1 Octave Range' : '1 Semitone Range'}
                        </button>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Glide/Portamento:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          value={glideValue}
                          onChange={(e) => handleGlideChange(parseInt(e.target.value, 10))}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>{glideValue}</span>
                      </div>
                    </div>
                    
                    {/* Unison Settings (only shown when in unison mode) */}
                    {currentVoiceMode === VoiceMode.UNISON && (
                      <div style={glowStyles.controlGroup}>
                        <div style={{
                          fontSize: '13px',
                          color: '#aaf',
                          marginBottom: '8px'
                        }}>
                          Unison Mode Settings
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '10px'
                        }}>
                          <span style={glowStyles.label}>Note Priority:</span>
                          <div style={{
                            display: 'flex',
                            gap: '5px'
                          }}>
                            {Object.entries(NotePriority).map(([name, value]) => (
                              <button
                                key={name}
                                onClick={() => handleNotePriorityChange(value)}
                                style={{
                                  ...glowStyles.button,
                                  ...(notePriority === value ? {
                                    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                                    boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                                  } : {
                                    background: 'rgba(40, 40, 60, 0.6)',
                                  }),
                                  fontSize: '12px',
                                  padding: '5px 10px'
                                }}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: '#ccc',
                          padding: '5px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '4px'
                        }}>
                          {notePriority === NotePriority.LOWEST && "Lowest Note Priority: When multiple keys are pressed, the lowest note takes precedence. Great for bass parts."}
                          {notePriority === NotePriority.HIGHEST && "Highest Note Priority: When multiple keys are pressed, the highest note takes precedence. Good for lead/melody parts."}
                          {notePriority === NotePriority.LAST && "Last Note Priority: The most recently pressed key takes precedence, regardless of pitch."}
                        </div>
                      </div>
                    )}
                    
                    {/* MPE Mode Controls */}
                    <div style={glowStyles.controlGroup}>
                      <div style={{
                        fontSize: '13px',
                        color: '#aaf',
                        marginBottom: '8px'
                      }}>
                        MPE (MIDI Polyphonic Expression) Mode
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <button
                          onClick={handleMPEModeToggle}
                          style={{
                            ...glowStyles.button,
                            background: mpeMode ? 
                              'linear-gradient(to right, #00a0e0, #00e0a0)' : 
                              'rgba(40, 40, 60, 0.8)',
                            boxShadow: mpeMode ? '0 0 15px rgba(0, 200, 200, 0.6)' : 'none',
                            fontSize: '13px',
                            padding: '8px 15px',
                            marginRight: '15px'
                          }}
                        >
                          {mpeMode ? 'MPE Mode: ON' : 'MPE Mode: OFF'}
                        </button>
                        
                        <span style={{...glowStyles.label, marginLeft: 'auto'}}>
                          {mpeMode ? 'Voice Mode forced to POLY12' : ''}
                        </span>
                      </div>
                      
                      {mpeMode && (
                        <div style={glowStyles.controlRow}>
                          <span style={glowStyles.label}>Pitch Bend Range:</span>
                          <input
                            type="range"
                            min="1"
                            max="48"
                            value={pitchBendRange}
                            onChange={(e) => handlePitchBendRangeChange(parseInt(e.target.value, 10))}
                            style={{...glowStyles.slider, flex: '1'}}
                          />
                          <span style={glowStyles.value}>{pitchBendRange} semitones</span>
                        </div>
                      )}
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#ccc',
                        padding: '5px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px'
                      }}>
                        MPE allows continuous per-note pitch bends and expression. Works with MPE controllers like ROLI Seaboard, Linnstrument, or Expressive E Osmose.
                      </div>
                    </div>
                    
                    {/* Voice Visualization */}
                    <div style={{
                      marginTop: '15px',
                      height: '120px',
                      background: 'rgba(10, 10, 20, 0.5)',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(100, 100, 255, 0.2)',
                      padding: '10px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        color: '#aaf',
                      }}>
                        Voice Allocation Visualization
                      </div>
                      
                      <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none">
                        {/* Channel divider line */}
                        <line 
                          x1="100" y1="0" 
                          x2="100" y2="100" 
                          stroke="rgba(100, 100, 255, 0.5)" 
                          strokeWidth="1" 
                          strokeDasharray="4,2"
                        />
                        
                        {/* Channel labels */}
                        <text x="50" y="15" textAnchor="middle" fill="#aaf" fontSize="8">Chip 1 (Left)</text>
                        <text x="150" y="15" textAnchor="middle" fill="#aaf" fontSize="8">Chip 2 (Right)</text>
                        
                        {/* Voice representation based on mode */}
                        {currentVoiceMode === VoiceMode.POLY12 && (
                          <>
                            {Array.from({length: 6}).map((_, i) => (
                              <circle
                                key={`left-${i}`}
                                cx={30 + (i * 12)}
                                cy={50 + (i % 2 === 0 ? -10 : 10)}
                                r="5"
                                fill="rgba(142, 45, 226, 0.8)"
                              />
                            ))}
                            {Array.from({length: 6}).map((_, i) => (
                              <circle
                                key={`right-${i}`}
                                cx={130 + (i * 12)}
                                cy={50 + (i % 2 === 0 ? -10 : 10)}
                                r="5"
                                fill="rgba(142, 45, 226, 0.8)"
                              />
                            ))}
                          </>
                        )}
                        
                        {currentVoiceMode === VoiceMode.UNISON && (
                          <>
                            {Array.from({length: 12}).map((_, i) => (
                              <circle
                                key={`unison-${i}`}
                                cx={i < 6 ? 50 : 150}
                                cy={60 - (fatValue / 6) * (i % 6)}
                                r="5"
                                fill={`hsl(${280 - (fatValue / 127) * 40 * (i % 6)}, 80%, 60%)`}
                              />
                            ))}
                          </>
                        )}
                        
                        {(currentVoiceMode === VoiceMode.WIDE6 || 
                          currentVoiceMode === VoiceMode.WIDE4 || 
                          currentVoiceMode === VoiceMode.WIDE3) && (
                          <>
                            {Array.from({length: currentVoiceMode === VoiceMode.WIDE6 ? 6 : 
                                          currentVoiceMode === VoiceMode.WIDE4 ? 4 : 3}).map((_, i) => (
                              <circle
                                key={`left-wide-${i}`}
                                cx={40 + (i * fatValue / 20)}
                                cy={50}
                                r="5"
                                fill="rgba(142, 45, 226, 0.8)"
                              />
                            ))}
                            {Array.from({length: currentVoiceMode === VoiceMode.WIDE6 ? 6 : 
                                          currentVoiceMode === VoiceMode.WIDE4 ? 4 : 3}).map((_, i) => (
                              <circle
                                key={`right-wide-${i}`}
                                cx={150 - (i * fatValue / 20)}
                                cy={50}
                                r="5"
                                fill="rgba(142, 45, 226, 0.8)"
                              />
                            ))}
                          </>
                        )}
                        
                        {currentVoiceMode === VoiceMode.DUAL_CH3 && (
                          <>
                            <text x="50" y="85" textAnchor="middle" fill="#aaf" fontSize="8">Channel 3 Special Mode</text>
                            <text x="150" y="85" textAnchor="middle" fill="#aaf" fontSize="8">Channel 3 Special Mode</text>
                            
                            {Array.from({length: 4}).map((_, i) => (
                              <circle
                                key={`left-ch3-${i}`}
                                cx={30 + (i * 15)}
                                cy={50}
                                r="5"
                                fill={`hsl(${280 - i * 30}, 80%, 60%)`}
                              />
                            ))}
                            
                            {Array.from({length: 4}).map((_, i) => (
                              <circle
                                key={`right-ch3-${i}`}
                                cx={130 + (i * 15)}
                                cy={50}
                                r="5"
                                fill={`hsl(${280 - i * 30}, 80%, 60%)`}
                              />
                            ))}
                          </>
                        )}
                      </svg>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'lfo' && (
                  <div>
                    {/* LFO selector tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '10px'
                    }}>
                      {[1, 2, 3].map(lfo => (
                        <button
                          key={lfo}
                          onClick={() => setActiveLFO(lfo)}
                          style={{
                            ...glowStyles.button,
                            ...(activeLFO === lfo ? {
                              background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                              boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                            } : {
                              background: 'rgba(40, 40, 60, 0.6)',
                              boxShadow: 'none'
                            }),
                            margin: '0 2px',
                            fontSize: '14px',
                            flex: '1'
                          }}
                        >
                          LFO {lfo}
                        </button>
                      ))}
                    </div>
                    
                    {/* LFO Parameters */}
                    <div style={glowStyles.controlGroup}>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Rate:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue={50}
                          onChange={(e) => {
                            const cc = activeLFO === 1 ? CC.LFO1_RATE :
                                      activeLFO === 2 ? CC.LFO2_RATE :
                                      CC.LFO3_RATE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                          disabled={(activeLFO === 1 && lfoWaveform === 'velocity') || 
                                   (activeLFO === 3 && lfoWaveform === 'aftertouch')}
                        />
                        <span style={{
                          ...glowStyles.value,
                          opacity: (activeLFO === 1 && lfoWaveform === 'velocity') || 
                                   (activeLFO === 3 && lfoWaveform === 'aftertouch') ? 0.5 : 1
                        }}>
                          {(activeLFO === 1 && lfoWaveform === 'velocity') ? 'Ve' : 
                           (activeLFO === 3 && lfoWaveform === 'aftertouch') ? 'At' : '50'}
                        </span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Depth:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue={70}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            const cc = activeLFO === 1 ? CC.LFO1_DEPTH :
                                      activeLFO === 2 ? CC.LFO2_DEPTH :
                                      CC.LFO3_DEPTH;
                            handleMegaFMParamChange(cc, value);
                            
                            // Check for special modes when depth > 50%
                            if (activeLFO === 1 && value > 63) {
                              setLFOWaveform('velocity');
                            } else if (activeLFO === 3 && value > 63) {
                              setLFOWaveform('aftertouch');
                            }
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>70</span>
                      </div>
                    </div>
                    
                    {/* Waveform Selection */}
                    <div style={glowStyles.controlGroup}>
                      <div style={{
                        fontSize: '13px',
                        color: '#aaf',
                        marginBottom: '8px'
                      }}>
                        Waveform
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '5px',
                        marginBottom: '10px'
                      }}>
                        {['sine', 'triangle', 'saw', 'square', 'noise'].map(wave => (
                          <button
                            key={wave}
                            onClick={() => {
                              setLFOWaveform(wave);
                              // Send MIDI CC for waveform
                              const cc = activeLFO === 1 ? CC.LFO1_WAVEFORM :
                                        activeLFO === 2 ? CC.LFO2_WAVEFORM :
                                        CC.LFO3_WAVEFORM;
                              const waveValue = 
                                wave === 'sine' ? 0 :
                                wave === 'triangle' ? 25 :
                                wave === 'saw' ? 50 :
                                wave === 'square' ? 75 :
                                wave === 'noise' ? 100 : 0;
                              
                              handleMegaFMParamChange(cc, waveValue);
                            }}
                            disabled={(activeLFO === 1 && lfoWaveform === 'velocity') ||
                                     (activeLFO === 3 && lfoWaveform === 'aftertouch')}
                            style={{
                              ...glowStyles.button,
                              ...(lfoWaveform === wave ? {
                                background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                                boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                              } : {}),
                              ...((activeLFO === 1 && lfoWaveform === 'velocity') ||
                                 (activeLFO === 3 && lfoWaveform === 'aftertouch') ? {
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              } : {}),
                              fontSize: '12px',
                              padding: '6px 4px'
                            }}
                          >
                            {wave.charAt(0).toUpperCase() + wave.slice(1)}
                          </button>
                        ))}
                      </div>
                      
                      {/* Special modes for LFO1 and LFO3 */}
                      {activeLFO === 1 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <button
                            onClick={() => {
                              const newMode = lfoWaveform !== 'velocity';
                              setLFOWaveform(newMode ? 'velocity' : 'sine');
                              // Set depth value above 63 to activate special mode
                              if (newMode) {
                                handleMegaFMParamChange(CC.LFO1_DEPTH, 100);
                              } else {
                                handleMegaFMParamChange(CC.LFO1_DEPTH, 50);
                              }
                            }}
                            style={{
                              ...glowStyles.button,
                              background: lfoWaveform === 'velocity' ? 
                                'linear-gradient(to right, #00a0e0, #00e0a0)' : 
                                'rgba(40, 40, 60, 0.8)',
                              boxShadow: lfoWaveform === 'velocity' ? '0 0 15px rgba(0, 200, 200, 0.6)' : 'none',
                              fontSize: '13px',
                              padding: '6px 12px',
                              marginRight: '10px'
                            }}
                          >
                            {lfoWaveform === 'velocity' ? 'Velocity Mode: ON' : 'Velocity Mode: OFF'}
                          </button>
                          
                          <div style={{
                            fontSize: '12px',
                            color: '#aaa',
                            flex: '1'
                          }}>
                            {lfoWaveform === 'velocity' && "Velocity controls modulation amount per note"}
                          </div>
                        </div>
                      )}
                      
                      {activeLFO === 3 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <button
                            onClick={() => {
                              const newMode = lfoWaveform !== 'aftertouch';
                              setLFOWaveform(newMode ? 'aftertouch' : 'sine');
                              // Set depth value above 63 to activate special mode
                              if (newMode) {
                                handleMegaFMParamChange(CC.LFO3_DEPTH, 100);
                              } else {
                                handleMegaFMParamChange(CC.LFO3_DEPTH, 50);
                              }
                            }}
                            style={{
                              ...glowStyles.button,
                              background: lfoWaveform === 'aftertouch' ? 
                                'linear-gradient(to right, #00a0e0, #00e0a0)' : 
                                'rgba(40, 40, 60, 0.8)',
                              boxShadow: lfoWaveform === 'aftertouch' ? '0 0 15px rgba(0, 200, 200, 0.6)' : 'none',
                              fontSize: '13px',
                              padding: '6px 12px',
                              marginRight: '10px'
                            }}
                          >
                            {lfoWaveform === 'aftertouch' ? 'Aftertouch Mode: ON' : 'Aftertouch Mode: OFF'}
                          </button>
                          
                          <div style={{
                            fontSize: '12px',
                            color: '#aaa',
                            flex: '1'
                          }}>
                            {lfoWaveform === 'aftertouch' && "Aftertouch controls modulation amount per note"}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* LFO Mode Controls */}
                    <div style={glowStyles.controlGroup}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <button
                          onClick={() => {
                            setLFORetrig(!lfoRetrig);
                            // Send MIDI CC for retrig
                            const cc = activeLFO === 1 ? CC.LFO1_RETRIG :
                                      activeLFO === 2 ? CC.LFO2_RETRIG :
                                      CC.LFO3_RETRIG;
                            handleMegaFMParamChange(cc, lfoRetrig ? 0 : 127);
                          }}
                          disabled={(activeLFO === 1 && lfoWaveform === 'velocity') ||
                                   (activeLFO === 3 && lfoWaveform === 'aftertouch')}
                          style={{
                            ...glowStyles.button,
                            ...(lfoRetrig ? {
                              background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                              boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                            } : {}),
                            ...((activeLFO === 1 && lfoWaveform === 'velocity') ||
                               (activeLFO === 3 && lfoWaveform === 'aftertouch') ? {
                              opacity: 0.5,
                              cursor: 'not-allowed'
                            } : {}),
                            flex: '1',
                            marginRight: '5px'
                          }}
                        >
                          Retrig
                        </button>
                        
                        <button
                          onClick={() => {
                            setLFOLoop(!lfoLoop);
                            // Send MIDI CC for loop
                            const cc = activeLFO === 1 ? CC.LFO1_LOOP :
                                      activeLFO === 2 ? CC.LFO2_LOOP :
                                      CC.LFO3_LOOP;
                            handleMegaFMParamChange(cc, lfoLoop ? 0 : 127);
                          }}
                          disabled={(activeLFO === 1 && lfoWaveform === 'velocity') ||
                                   (activeLFO === 3 && lfoWaveform === 'aftertouch')}
                          style={{
                            ...glowStyles.button,
                            ...(lfoLoop ? {
                              background: 'linear-gradient(to right, #00a0e0, #00e0a0)',
                              boxShadow: '0 0 15px rgba(0, 200, 200, 0.8)'
                            } : {}),
                            ...((activeLFO === 1 && lfoWaveform === 'velocity') ||
                               (activeLFO === 3 && lfoWaveform === 'aftertouch') ? {
                              opacity: 0.5,
                              cursor: 'not-allowed'
                            } : {}),
                            flex: '1',
                            marginLeft: '5px'
                          }}
                        >
                          Loop
                        </button>
                      </div>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#aaa',
                        padding: '5px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px'
                      }}>
                        {lfoRetrig ? "Each keypress will retrigger the LFO from the beginning" : "LFO will only trigger on the first key"}
                        <br />
                        {lfoLoop ? "LFO will loop endlessly" : "LFO will play in one-shot mode"}
                      </div>
                    </div>
                    
                    {/* LFO Visualization */}
                    <div style={{
                      marginTop: '15px',
                      height: '100px',
                      background: 'rgba(10, 10, 20, 0.5)',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(100, 100, 255, 0.2)',
                      padding: '10px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        color: '#aaf',
                      }}>
                        LFO {activeLFO} Waveform
                      </div>
                      
                      <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none">
                        {/* Center line */}
                        <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(100, 100, 255, 0.3)" strokeWidth="1" />
                        
                        {/* Waveform visualization */}
                        {lfoWaveform === 'sine' && (
                          <path 
                            d="M0,50 C20,20 60,20 80,50 C100,80 140,80 160,50 C180,20 220,20 240,50" 
                            fill="none" 
                            stroke="rgba(0, 200, 200, 0.8)" 
                            strokeWidth="2" 
                          />
                        )}
                        
                        {lfoWaveform === 'triangle' && (
                          <polyline 
                            points="0,50 50,20 100,80 150,20 200,50" 
                            fill="none" 
                            stroke="rgba(0, 200, 200, 0.8)" 
                            strokeWidth="2" 
                          />
                        )}
                        
                        {lfoWaveform === 'saw' && (
                          <polyline 
                            points="0,50 0,20 100,80 100,20 200,80" 
                            fill="none" 
                            stroke="rgba(0, 200, 200, 0.8)" 
                            strokeWidth="2" 
                          />
                        )}
                        
                        {lfoWaveform === 'square' && (
                          <polyline 
                            points="0,50 0,20 100,20 100,80 200,80" 
                            fill="none" 
                            stroke="rgba(0, 200, 200, 0.8)" 
                            strokeWidth="2" 
                          />
                        )}
                        
                        {lfoWaveform === 'noise' && (
                          <polyline 
                            points="0,50 10,30 20,70 30,40 40,60 50,20 60,80 70,35 80,65 90,45 100,55 110,25 120,75 130,50 140,60 150,40 160,70 170,30 180,50 190,65 200,35" 
                            fill="none" 
                            stroke="rgba(0, 200, 200, 0.8)" 
                            strokeWidth="2" 
                          />
                        )}
                        
                        {lfoWaveform === 'velocity' && (
                          <>
                            <text x="100" y="50" textAnchor="middle" fill="#00e0a0" fontSize="14">Velocity Mode</text>
                            <text x="100" y="70" textAnchor="middle" fill="#aaf" fontSize="10">MIDI velocity → modulation depth</text>
                          </>
                        )}
                        
                        {lfoWaveform === 'aftertouch' && (
                          <>
                            <text x="100" y="50" textAnchor="middle" fill="#00e0a0" fontSize="14">Aftertouch Mode</text>
                            <text x="100" y="70" textAnchor="middle" fill="#aaf" fontSize="10">MIDI aftertouch → modulation depth</text>
                          </>
                        )}
                      </svg>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'presets' && (
                  <div>
                    {/* Preset Browser */}
                    <div style={{
                      padding: '10px',
                      borderRadius: '5px',
                    }}>
                      {/* Bank Selection */}
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Bank:</span>
                        <div style={{
                          display: 'flex',
                          flex: '1',
                          gap: '2px'
                        }}>
                          {[0, 1, 2, 3, 4, 5].map(bank => (
                            <button
                              key={bank}
                              onClick={() => {
                                setCurrentBank(bank);
                                if (midiConnected && midiOutput) {
                                  selectPreset(midiOutput, currentPreset, bank);
                                }
                              }}
                              style={{
                                ...glowStyles.button,
                                ...(currentBank === bank ? {
                                  background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                                  boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                                } : {
                                  background: 'rgba(40, 40, 60, 0.6)',
                                  boxShadow: 'none'
                                }),
                                fontSize: '12px',
                                padding: '4px 0',
                                flex: '1'
                              }}
                            >
                              {bank+1}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Preset Selection */}
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Preset:</span>
                        <input
                          type="range"
                          min="0"
                          max="99"
                          value={currentPreset}
                          onChange={(e) => {
                            const newPreset = parseInt(e.target.value, 10);
                            setCurrentPreset(newPreset);
                            if (midiConnected && midiOutput) {
                              selectPreset(midiOutput, newPreset, currentBank);
                            }
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={{...glowStyles.value, minWidth: '30px'}}>{currentPreset}</span>
                      </div>
                      
                      {/* Preset Navigation Buttons */}
                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                        <button
                          onClick={() => {
                            if (currentPreset > 0) {
                              const newPreset = currentPreset - 1;
                              setCurrentPreset(newPreset);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, newPreset, currentBank);
                              }
                            } else if (currentBank > 0) {
                              // Wrap to previous bank
                              const newBank = currentBank - 1;
                              const newPreset = 99;
                              setCurrentBank(newBank);
                              setCurrentPreset(newPreset);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, newPreset, newBank);
                              }
                            }
                          }}
                          style={{
                            ...glowStyles.button,
                            flex: '1',
                            fontSize: '14px',
                            background: 'rgba(40, 40, 60, 0.8)'
                          }}
                        >
                          ◀ Prev
                        </button>
                        
                        <button
                          onClick={() => {
                            if (currentPreset < 99) {
                              const newPreset = currentPreset + 1;
                              setCurrentPreset(newPreset);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, newPreset, currentBank);
                              }
                            } else if (currentBank < 5) {
                              // Wrap to next bank
                              const newBank = currentBank + 1;
                              const newPreset = 0;
                              setCurrentBank(newBank);
                              setCurrentPreset(newPreset);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, newPreset, newBank);
                              }
                            }
                          }}
                          style={{
                            ...glowStyles.button,
                            flex: '1',
                            fontSize: '14px',
                            background: 'rgba(40, 40, 60, 0.8)'
                          }}
                        >
                          Next ▶
                        </button>
                      </div>
                      
                      {/* Preset Categories */}
                      <div style={{
                        marginTop: '20px',
                        padding: '10px',
                        background: 'rgba(30, 30, 50, 0.4)',
                        borderRadius: '5px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#aaf',
                          marginBottom: '10px'
                        }}>
                          Factory Preset Categories
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                          <button 
                            onClick={() => {
                              // Misc Presets (0-9)
                              setCurrentBank(0);
                              setCurrentPreset(0);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 0, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(60, 80, 150, 0.6)'}}
                          >
                            Misc (0-9)
                          </button>
                          
                          <button 
                            onClick={() => {
                              // Bass Presets (10-19)
                              setCurrentBank(0);
                              setCurrentPreset(10);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 10, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(60, 120, 100, 0.6)'}}
                          >
                            Bass (10-19)
                          </button>
                          
                          <button 
                            onClick={() => {
                              // Lead Presets (20-29)
                              setCurrentBank(0);
                              setCurrentPreset(20);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 20, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(140, 60, 100, 0.6)'}}
                          >
                            Lead (20-29)
                          </button>
                          
                          <button 
                            onClick={() => {
                              // Pad Presets (30-38)
                              setCurrentBank(0);
                              setCurrentPreset(30);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 30, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(100, 100, 180, 0.6)'}}
                          >
                            Pads (30-38)
                          </button>
                          
                          <button 
                            onClick={() => {
                              // Rhythmic Presets (39-44)
                              setCurrentBank(0);
                              setCurrentPreset(39);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 39, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(160, 90, 50, 0.6)'}}
                          >
                            Rhythmic (39-44)
                          </button>
                          
                          <button 
                            onClick={() => {
                              // SFX Presets (45-49)
                              setCurrentBank(0);
                              setCurrentPreset(45);
                              if (midiConnected && midiOutput) {
                                selectPreset(midiOutput, 45, 0);
                              }
                            }}
                            style={{...glowStyles.button, background: 'rgba(180, 50, 80, 0.6)'}}
                          >
                            SFX (45-49)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeFMTab === 'lfo' && (
                  <div>
                    {/* LFO selector tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '10px'
                    }}>
                      {[1, 2, 3].map(lfo => (
                        <button
                          key={lfo}
                          onClick={() => setActiveLFO(lfo)}
                          style={{
                            ...glowStyles.button,
                            ...(activeLFO === lfo ? {
                              background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                              boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                            } : {
                              background: 'rgba(40, 40, 60, 0.6)',
                              boxShadow: 'none'
                            }),
                            margin: '0 2px',
                            fontSize: '14px',
                            flex: '1'
                          }}
                        >
                          LFO {lfo}
                        </button>
                      ))}
                    </div>
                    
                    {/* Chain/Link buttons for parameter modulation */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '15px'
                    }}>
                      {[1, 2, 3].map(lfo => {
                        const lfoKey = `lfo${lfo}`;
                        const isLinked = lfoChainStatus[lfoKey]?.active;
                        const linkedParam = lfoChainStatus[lfoKey]?.linkedParam;
                        
                        return (
                          <button
                            key={`chain-${lfo}`}
                            onClick={() => handleLfoChainButtonClick(lfo)}
                            style={{
                              ...glowStyles.button,
                              background: isLinked 
                                ? 'linear-gradient(to right, #00e042, #2de28e)' 
                                : modLinkActive 
                                  ? 'linear-gradient(to right, #e07700, #e2952d)'
                                  : 'rgba(40, 40, 60, 0.6)',
                              boxShadow: isLinked 
                                ? '0 0 15px rgba(45, 226, 142, 0.8)'
                                : modLinkActive
                                  ? '0 0 15px rgba(226, 149, 45, 0.8)'
                                  : 'none',
                              margin: '0 2px',
                              fontSize: '12px',
                              flex: '1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '5px 8px'
                            }}
                          >
                            <span style={{ marginBottom: '2px' }}>
                              {isLinked ? '🔗 Linked' : '⛓️ Link'}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              opacity: isLinked ? 1 : 0.7,
                              height: '12px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}>
                              {isLinked && linkedParam 
                                ? (linkedParam.name || `CC ${linkedParam.cc}`)
                                : modLinkActive 
                                  ? 'Move param, then click'
                                  : 'LFO ' + lfo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Waveform selector */}
                    <div style={glowStyles.controlRow}>
                      <span style={glowStyles.label}>Waveform:</span>
                      <div style={{
                        display: 'flex',
                        flex: '1',
                        gap: '5px'
                      }}>
                        {['Sine', 'Triangle', 'Saw', 'Square', 'Noise'].map(wave => (
                          <button
                            key={wave}
                            onClick={() => {
                              setLFOWaveform(wave.toLowerCase());
                              
                              // Send the appropriate MIDI CC for waveform
                              if (midiConnected && midiOutput) {
                                const waveformCC = activeLFO === 1 ? CC.LFO1_WAVEFORM :
                                                  activeLFO === 2 ? CC.LFO2_WAVEFORM :
                                                  CC.LFO3_WAVEFORM;
                                                  
                                // Convert waveform to MIDI value (0 = sine, 1 = triangle, 2 = saw, 3 = square, 4 = noise)
                                const waveformValue = ['sine', 'triangle', 'saw', 'square', 'noise'].indexOf(wave.toLowerCase());
                                handleMegaFMParamChange(waveformCC, waveformValue * 25); // Scale to 0-127 range
                                
                                console.log(`Set LFO${activeLFO} waveform to ${wave} (${waveformValue})`);
                              }
                            }}
                            style={{
                              ...glowStyles.button,
                              ...(lfoWaveform === wave.toLowerCase() ? {
                                background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
                                boxShadow: '0 0 15px rgba(142, 45, 226, 0.8)'
                              } : {
                                background: 'rgba(40, 40, 60, 0.6)',
                                boxShadow: 'none'
                              }),
                              fontSize: '12px',
                              padding: '4px 8px',
                              flex: '1'
                            }}
                          >
                            {wave === 'Sine' && '∿'}
                            {wave === 'Triangle' && '△'}
                            {wave === 'Saw' && '⍀'}
                            {wave === 'Square' && '⏹'}
                            {wave === 'Noise' && '🔀'}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* LFO Waveform Visualization */}
                    <div style={{
                      height: '80px',
                      background: 'rgba(10, 10, 20, 0.5)',
                      margin: '10px 0',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(100, 100, 255, 0.2)'
                    }}>
                      {/* SVG visualization of current LFO waveform */}
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Background grid */}
                        <g opacity="0.3">
                          {Array.from({length: 5}).map((_, i) => (
                            <line 
                              key={`v-${i}`}
                              x1={20 * (i + 1)} 
                              y1="0" 
                              x2={20 * (i + 1)} 
                              y2="100" 
                              stroke="rgba(100, 100, 255, 0.3)" 
                              strokeWidth="1"
                            />
                          ))}
                          <line 
                            x1="0" 
                            y1="50" 
                            x2="100" 
                            y2="50" 
                            stroke="rgba(100, 100, 255, 0.3)" 
                            strokeWidth="1"
                          />
                        </g>
                        
                        {/* Waveform path */}
                        {lfoWaveform === 'sine' && (
                          <path
                            d="M0,50 C10,20 40,20 50,50 C60,80 90,80 100,50"
                            fill="none"
                            stroke="rgba(0, 200, 255, 0.8)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {lfoWaveform === 'triangle' && (
                          <path
                            d="M0,50 L25,20 L75,80 L100,50"
                            fill="none"
                            stroke="rgba(0, 255, 100, 0.8)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {lfoWaveform === 'saw' && (
                          <path
                            d="M0,50 L50,20 L50,80 L100,50"
                            fill="none"
                            stroke="rgba(255, 100, 0, 0.8)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {lfoWaveform === 'square' && (
                          <path
                            d="M0,50 L0,20 L50,20 L50,80 L100,80 L100,50"
                            fill="none"
                            stroke="rgba(255, 50, 50, 0.8)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {lfoWaveform === 'noise' && (
                          // Random jagged line for noise
                          <path
                            d={`M0,50 ${Array.from({length: 20}).map((_, i) => 
                              `L${i * 5},${Math.random() * 60 + 20}`).join(' ')} L100,50`}
                            fill="none"
                            stroke="rgba(200, 200, 0, 0.8)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {/* LFO number indicator */}
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="rgba(142, 45, 226, 0.8)"
                        />
                        <text
                          x="10"
                          y="14"
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {activeLFO}
                        </text>
                      </svg>
                      
                      {/* Special mode indicators and controls */}
                      {activeLFO === 1 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '5px',
                          right: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}>
                          <button
                            onClick={() => {
                              // Toggle LFO1 velocity mode
                              if (midiConnected && midiOutput) {
                                // In the actual MEGAfm this is done in setup mode by turning
                                // the LFO1 depth knob beyond 50%
                                // Here we'll use a direct toggle for simplicity
                                const velocityModeActive = true; // In actual implementation, this would be a state variable
                                
                                // MIDI implementation would depend on the specific MEGAfm setup instructions
                                // This is a placeholder for the actual implementation
                                console.log(`Toggled LFO1 Velocity mode to ON`);
                              }
                            }}
                            style={{
                              background: 'linear-gradient(to right, #00c, #80c)',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              marginRight: '5px',
                              color: 'white',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Enable
                          </button>
                          <span style={{color: '#aaf'}}>Velocity Mode</span>
                        </div>
                      )}
                      
                      {activeLFO === 3 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '5px',
                          right: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}>
                          <button
                            onClick={() => {
                              // Toggle LFO3 aftertouch mode
                              if (midiConnected && midiOutput) {
                                // In the actual MEGAfm this is done in setup mode by turning
                                // the LFO3 depth knob beyond 50%
                                // Here we'll use a direct toggle for simplicity
                                const aftertouchModeActive = true; // In actual implementation, this would be a state variable
                                
                                // MIDI implementation would depend on the specific MEGAfm setup instructions
                                // This is a placeholder for the actual implementation
                                console.log(`Toggled LFO3 Aftertouch mode to ON`);
                              }
                            }}
                            style={{
                              background: 'linear-gradient(to right, #00c, #80c)',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              marginRight: '5px',
                              color: 'white',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Enable
                          </button>
                          <span style={{color: '#aaf'}}>Aftertouch Mode</span>
                        </div>
                      )}
                    </div>
                    
                    {/* LFO parameters - uses the appropriate CC for each LFO */}
                    <div>
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Rate:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="50"
                          onChange={(e) => {
                            const cc = activeLFO === 1 ? CC.LFO1_RATE :
                                      activeLFO === 2 ? CC.LFO2_RATE :
                                      CC.LFO3_RATE;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>50</span>
                      </div>
                      
                      <div style={glowStyles.controlRow}>
                        <span style={glowStyles.label}>Depth:</span>
                        <input
                          type="range"
                          min="0"
                          max="127"
                          defaultValue="30"
                          onChange={(e) => {
                            const cc = activeLFO === 1 ? CC.LFO1_DEPTH :
                                      activeLFO === 2 ? CC.LFO2_DEPTH :
                                      CC.LFO3_DEPTH;
                            handleMegaFMParamChange(cc, parseInt(e.target.value, 10));
                          }}
                          style={{...glowStyles.slider, flex: '1'}}
                        />
                        <span style={glowStyles.value}>30</span>
                      </div>
                      
                      {/* LFO special modes */}
                      <div style={{
                        display: 'flex',
                        marginTop: '10px',
                        gap: '10px'
                      }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          background: 'rgba(30, 30, 50, 0.5)',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          flex: '1'
                        }}>
                          <input
                            type="checkbox"
                            checked={lfoRetrig}
                            onChange={() => {
                              const newValue = !lfoRetrig;
                              setLFORetrig(newValue);
                              
                              // Send MIDI CC for retrig
                              if (midiConnected && midiOutput) {
                                const retrigCC = activeLFO === 1 ? CC.LFO1_RETRIG :
                                               activeLFO === 2 ? CC.LFO2_RETRIG :
                                               CC.LFO3_RETRIG;
                                               
                                handleMegaFMParamChange(retrigCC, newValue ? 127 : 0);
                                console.log(`Set LFO${activeLFO} retrig to ${newValue ? 'ON' : 'OFF'}`);
                              }
                            }}
                            style={{ marginRight: '5px' }}
                          />
                          <span style={glowStyles.label}>Retrig</span>
                        </label>
                        
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          background: 'rgba(30, 30, 50, 0.5)',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          flex: '1'
                        }}>
                          <input
                            type="checkbox"
                            checked={lfoLoop}
                            onChange={() => {
                              const newValue = !lfoLoop;
                              setLFOLoop(newValue);
                              
                              // Send MIDI CC for loop
                              if (midiConnected && midiOutput) {
                                const loopCC = activeLFO === 1 ? CC.LFO1_LOOP :
                                             activeLFO === 2 ? CC.LFO2_LOOP :
                                             CC.LFO3_LOOP;
                                             
                                handleMegaFMParamChange(loopCC, newValue ? 127 : 0);
                                console.log(`Set LFO${activeLFO} loop to ${newValue ? 'ON' : 'OFF'}`);
                              }
                            }}
                            style={{ marginRight: '5px' }}
                          />
                          <span style={glowStyles.label}>Loop</span>
                        </label>
                      </div>
                      
                      {/* Parameter linking section */}
                      <div style={{
                        marginTop: '15px',
                        padding: '8px',
                        background: 'rgba(20, 20, 40, 0.6)',
                        borderRadius: '4px'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#aaf',
                          marginBottom: '8px'
                        }}>
                          Parameter Linking
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: modLinkActive ? '#ff9' : '#ccc',
                          fontStyle: 'italic',
                          marginBottom: '8px',
                          padding: '4px',
                          background: modLinkActive ? 'rgba(100, 100, 0, 0.3)' : 'transparent',
                          borderRadius: '4px',
                          transition: 'all 0.3s ease'
                        }}>
                          {modLinkActive ? '⚠️ Please move a parameter first, then try again' : 'Move a parameter control, then click to link LFO ' + activeLFO}
                        </div>
                        
                        <button
                          onClick={() => handleLfoChainButtonClick(activeLFO)}
                          style={{
                            ...glowStyles.button,
                            width: '100%',
                            background: lfoChainStatus[`lfo${activeLFO}`]?.active 
                              ? 'linear-gradient(to right, #00c0a0, #00a0c0)'
                              : 'linear-gradient(to right, #50c, #70a)',
                            boxShadow: lfoChainStatus[`lfo${activeLFO}`]?.active
                              ? '0 0 15px rgba(0, 200, 200, 0.8)'
                              : '0 0 10px rgba(100, 0, 200, 0.5)',
                            fontSize: '13px'
                          }}
                        >
                          {lfoChainStatus[`lfo${activeLFO}`]?.active 
                            ? `Unlink Parameter from LFO ${activeLFO}`
                            : `Link Parameter to LFO ${activeLFO}`}
                        </button>
                        
                        {/* Linked parameters display */}
                        <div style={{
                          marginTop: '10px',
                          background: 'rgba(10, 10, 20, 0.5)',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(80, 80, 120, 0.3)'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: '#aaf',
                            marginBottom: '4px',
                            fontWeight: 'bold'
                          }}>
                            Linked Parameters:
                          </div>
                          
                          {/* Generated dynamically based on actual LFO chain status */}
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            {lfoChainStatus[`lfo${activeLFO}`]?.active && lfoChainStatus[`lfo${activeLFO}`]?.linkedParam ? (
                              <span style={{
                                fontSize: '11px',
                                background: 'rgba(60, 0, 100, 0.6)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                color: 'white'
                              }}>
                                {lfoChainStatus[`lfo${activeLFO}`].linkedParam.name}
                                <button 
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 100, 100, 0.8)',
                                    fontSize: '9px',
                                    cursor: 'pointer',
                                    marginLeft: '4px'
                                  }}
                                  onClick={() => handleLfoChainButtonClick(activeLFO)}
                                >
                                  ×
                                </button>
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '11px',
                                color: '#999',
                                fontStyle: 'italic'
                              }}>
                                No parameters linked to LFO {activeLFO}
                              </span>
                            )}
                          </div>
                          
                          {/* Clear all links button */}
                          <button
                            onClick={() => {
                              if (!midiConnected || !midiOutput) {
                                console.warn('Cannot clear links - MIDI not connected');
                                return;
                              }
                              
                              // Clear all links for this LFO
                              unlinkParameterFromLFO(midiOutput, activeLFO, MEGAFM_CHANNEL);
                              
                              // Update the UI state
                              const lfoKey = `lfo${activeLFO}`;
                              setLfoChainStatus({
                                ...lfoChainStatus,
                                [lfoKey]: { active: false, linkedParam: null }
                              });
                              
                              console.log(`Cleared all parameter links for LFO ${activeLFO}`);
                            }}
                            style={{
                              background: 'rgba(100, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 100, 100, 0.3)',
                              borderRadius: '3px',
                              color: '#fcc',
                              fontSize: '10px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              marginTop: '6px',
                              width: '100%'
                            }}
                          >
                            Clear All Links
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                borderTop: '1px solid rgba(100, 100, 255, 0.2)',
                margin: '10px 0',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                {/* Advanced controls - Algorithmic Patch */}
                <button
                  onClick={() => {
                    // Only proceed if MIDI is connected
                    if (!midiConnected || !midiOutput) {
                      alert("MIDI not connected! Please connect to MEGAfm first.");
                      return;
                    }
                    
                    console.log(`Applying algorithmic patch for ${currentAlgorithm} algorithm`);
                    
                    // Apply algorithmic patching based on current algorithm
                    if (currentAlgorithm === 'fractal') {
                      // Fractal algorithm works well with complex FM modulation paths
                      const algorithmNum = 3;
                      handleMegaFMParamChange(CC.ALGORITHM, algorithmNum);
                      // Set current algorithm display to match what was sent to the hardware
                      setCurrentFmAlgorithm(`algo${algorithmNum}`);
                      
                      // Apply fractal-appropriate FM settings
                      handleMegaFMParamChange(CC.OP1_MULTIPLIER, Math.floor(Math.random() * 5) + 1);
                      handleMegaFMParamChange(CC.OP2_MULTIPLIER, Math.floor(Math.random() * 6) + 1);
                      handleMegaFMParamChange(CC.OP2_DETUNE, 64 + Math.floor(Math.random() * 20));
                      handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 10 + Math.floor(Math.random() * 40));
                      handleMegaFMParamChange(CC.FEEDBACK, 70 + Math.floor(Math.random() * 50));
                      
                      // Fractal algorithm also works well with some LFO modulation
                      handleMegaFMParamChange(CC.LFO1_RATE, 20 + Math.floor(Math.random() * 40));
                      handleMegaFMParamChange(CC.LFO1_DEPTH, 30 + Math.floor(Math.random() * 50));
                      // Set waveform to sine
                      handleMegaFMParamChange(CC.LFO1_WAVEFORM, 0);
                      setLFOWaveform('sine');
                      
                    } else if (currentAlgorithm === 'cellular') {
                      // Conway's Game of Life works well with percussive timbres
                      const algorithmNum = 6;
                      handleMegaFMParamChange(CC.ALGORITHM, algorithmNum);
                      setCurrentFmAlgorithm(`algo${algorithmNum}`);
                      
                      // Apply cellular-appropriate FM settings
                      handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 0);
                      handleMegaFMParamChange(CC.OP1_DECAY_RATE, 100);
                      handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 0);
                      handleMegaFMParamChange(CC.FEEDBACK, 110);
                      handleMegaFMParamChange(CC.OP1_MULTIPLIER, 4);
                      
                      // Cellular patterns work well with noise LFO
                      handleMegaFMParamChange(CC.LFO2_RATE, 60 + Math.floor(Math.random() * 60));
                      handleMegaFMParamChange(CC.LFO2_DEPTH, 40 + Math.floor(Math.random() * 30));
                      // Set waveform to noise
                      handleMegaFMParamChange(CC.LFO2_WAVEFORM, 4 * 25); // 4 = noise
                      setLFOWaveform('noise');
                      
                    } else if (currentAlgorithm === 'euclidean') {
                      // Rhythmic patterns work well with sharp attacks
                      const algorithmNum = Math.min(8, 5 + Math.floor(Math.random() * 4));
                      handleMegaFMParamChange(CC.ALGORITHM, algorithmNum);
                      setCurrentFmAlgorithm(`algo${algorithmNum}`);
                      
                      // Apply euclidean-appropriate FM settings
                      handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 0);
                      handleMegaFMParamChange(CC.OP1_DECAY_RATE, 60 + Math.floor(Math.random() * 40));
                      handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 20);
                      
                      // Euclidean patterns work well with square LFO
                      handleMegaFMParamChange(CC.LFO3_RATE, 80 + Math.floor(Math.random() * 40));
                      handleMegaFMParamChange(CC.LFO3_DEPTH, 50 + Math.floor(Math.random() * 40));
                      // Set waveform to square
                      handleMegaFMParamChange(CC.LFO3_WAVEFORM, 3 * 25); // 3 = square
                      setLFOWaveform('square');
                      
                    } else {
                      // Default to a classic FM bass sound
                      const algorithmNum = 5;
                      handleMegaFMParamChange(CC.ALGORITHM, algorithmNum);
                      setCurrentFmAlgorithm(`algo${algorithmNum}`);
                      
                      // Apply harmony-appropriate FM settings
                      handleMegaFMParamChange(CC.FEEDBACK, 80);
                      handleMegaFMParamChange(CC.OP1_ATTACK_RATE, 0);
                      handleMegaFMParamChange(CC.OP1_DECAY_RATE, 60);
                      handleMegaFMParamChange(CC.OP1_SUSTAIN_LEVEL, 40);
                      
                      // Harmony patterns work well with triangle LFO
                      handleMegaFMParamChange(CC.LFO1_RATE, 40);
                      handleMegaFMParamChange(CC.LFO1_DEPTH, 30);
                      // Set waveform to triangle
                      handleMegaFMParamChange(CC.LFO1_WAVEFORM, 1 * 25); // 1 = triangle
                      setLFOWaveform('triangle');
                    }
                    
                    // Confirmation to the user
                    console.log(`Applied algorithmic patch for ${currentAlgorithm}`);
                  }}
                  style={{
                    ...glowStyles.button,
                    background: 'linear-gradient(to right, #50a, #a05)',
                    boxShadow: '0 0 10px rgba(150, 50, 200, 0.5)',
                    fontSize: '12px',
                    padding: '8px 14px',
                    fontWeight: 'bold'
                  }}
                >
                  🔀 Algorithmic Patch
                </button>
                
                <button
                  onClick={() => {
                    // Check if MIDI is connected
                    if (!midiConnected || !midiOutput) {
                      alert("MIDI not connected! Please connect to MEGAfm first.");
                      return;
                    }
                    
                    // Send all notes off command
                    sendAllNotesOff(midiOutput);
                    console.log("Sent All Notes Off command to MEGAfm");
                    
                    // Also update UI state if needed
                    // If you have any state tracking active notes, reset it here
                  }}
                  style={{
                    ...glowStyles.button,
                    background: 'linear-gradient(to right, #f44, #f84)',
                    boxShadow: '0 0 10px rgba(255, 80, 80, 0.7)',
                    fontSize: '12px',
                    padding: '8px 12px',
                    fontWeight: 'bold'
                  }}
                >
                  🛑 Panic (All Notes Off)
                </button>
                
                <select
                  onChange={(e) => {
                    // This would load different operator configurations
                    const operatorPreset = parseInt(e.target.value, 10);
                    
                    if (operatorPreset === 1) {
                      // All operators on full
                      handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP3_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP4_TOTAL_LEVEL, 100);
                    } else if (operatorPreset === 2) {
                      // Just carriers
                      handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 0);
                      handleMegaFMParamChange(CC.OP3_TOTAL_LEVEL, 0);
                      handleMegaFMParamChange(CC.OP4_TOTAL_LEVEL, 100);
                    } else if (operatorPreset === 3) {
                      // Just modulators
                      handleMegaFMParamChange(CC.OP1_TOTAL_LEVEL, 0);
                      handleMegaFMParamChange(CC.OP2_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP3_TOTAL_LEVEL, 100);
                      handleMegaFMParamChange(CC.OP4_TOTAL_LEVEL, 0);
                    }
                  }}
                  style={{
                    background: 'rgba(30, 30, 50, 0.8)',
                    color: 'white',
                    border: '1px solid rgba(100, 100, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px'
                  }}
                >
                  <option value="">Operator Config</option>
                  <option value="1">All On</option>
                  <option value="2">Carriers Only</option>
                  <option value="3">Modulators Only</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default ControlPanel;