import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useSelector } from 'react-redux';
import * as THREE from 'three';

// Note name conversion utility
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const getNoteName = (note) => {
  const octave = Math.floor(note / 12) - 1;
  const noteName = NOTE_NAMES[note % 12];
  return `${noteName}${octave}`;
};

// Piano roll visualizer - renders notes as 3D bars in a piano-roll style layout
const PianoRollVisualizer = ({ activeNotes = [] }) => {
  const notesRef = useRef({});
  const pianoKeysRef = useRef();
  const gridRef = useRef();
  
  // Default visualization settings
  const defaultSettings = {
    showLabels: true,
    accessibilityMode: true,
    noteSize: 1.0,
    noteTrailLength: 2.0,
    viewRange: { minPitch: 36, maxPitch: 96, timeWindow: 8 },
    colorScheme: 'spectrum'
  };
  
  // Get visualization settings from Redux with fallbacks
  const visualizer = useSelector(state => state.visualizer || {});
  const showLabels = visualizer.showLabels ?? defaultSettings.showLabels;
  const accessibilityMode = visualizer.accessibilityMode ?? defaultSettings.accessibilityMode;
  const noteSize = visualizer.noteSize ?? defaultSettings.noteSize;
  const noteTrailLength = visualizer.noteTrailLength ?? defaultSettings.noteTrailLength;
  const viewRange = visualizer.viewRange ?? defaultSettings.viewRange;
  const colorScheme = visualizer.colorScheme ?? defaultSettings.colorScheme;
  
  // Define color schemes for notes
  const colorSchemes = useMemo(() => ({
    // Spectrum: maps pitch to color (red=low, violet=high)
    spectrum: (note) => {
      const normalizedPitch = (note - viewRange.minPitch) / (viewRange.maxPitch - viewRange.minPitch);
      return new THREE.Color().setHSL(normalizedPitch * 0.85, 0.8, 0.6);
    },
    // Harmony: color based on harmony role (root = red, third = green, fifth = blue, etc.)
    harmony: (note) => {
      const scalePosition = note % 12;
      switch (scalePosition) {
        case 0: return new THREE.Color(0xff3030); // C (root) - red
        case 4: case 3: return new THREE.Color(0x30ff30); // E/Eb (third) - green
        case 7: return new THREE.Color(0x3030ff); // G (fifth) - blue
        case 10: case 11: return new THREE.Color(0xff30ff); // Bb/B (seventh) - purple
        default: return new THREE.Color(0xffff30); // Other notes - yellow
      }
    },
    // Velocity: color based on velocity (brighter = harder)
    velocity: (note, velocity) => {
      const brightness = 0.3 + (velocity / 127) * 0.7;
      return new THREE.Color().setHSL(0.6, 0.8, brightness);
    },
    // Instrument: all notes same color for now, but could be mapped to MIDI channels
    instrument: () => new THREE.Color(0x30a0ff)
  }), [viewRange]);

  // Piano key layout information
  const keyboardLayout = useMemo(() => {
    const layout = [];
    const keyWidth = 0.8;
    const blackKeyWidth = keyWidth * 0.6;
    const blackKeyHeight = 0.6;
    
    for (let i = viewRange.minPitch; i <= viewRange.maxPitch; i++) {
      const isBlackKey = [1, 3, 6, 8, 10].includes(i % 12);
      const octave = Math.floor(i / 12) - 1;
      const keyNumber = i % 12;
      
      // Calculate x position based on key pattern
      // C C# D D# E F F# G G# A A# B
      // 0 1  2 3  4 5 6  7 8  9 10 11
      let position = 0;
      if (keyNumber === 0) position = octave * 7 * keyWidth;
      else if (keyNumber === 1) position = octave * 7 * keyWidth + keyWidth * 0.7;
      else if (keyNumber === 2) position = octave * 7 * keyWidth + keyWidth;
      else if (keyNumber === 3) position = octave * 7 * keyWidth + keyWidth * 1.7;
      else if (keyNumber === 4) position = octave * 7 * keyWidth + keyWidth * 2;
      else if (keyNumber === 5) position = octave * 7 * keyWidth + keyWidth * 3;
      else if (keyNumber === 6) position = octave * 7 * keyWidth + keyWidth * 3.7;
      else if (keyNumber === 7) position = octave * 7 * keyWidth + keyWidth * 4;
      else if (keyNumber === 8) position = octave * 7 * keyWidth + keyWidth * 4.7;
      else if (keyNumber === 9) position = octave * 7 * keyWidth + keyWidth * 5;
      else if (keyNumber === 10) position = octave * 7 * keyWidth + keyWidth * 5.7;
      else if (keyNumber === 11) position = octave * 7 * keyWidth + keyWidth * 6;
      
      layout.push({
        note: i,
        position,
        isBlackKey,
        width: isBlackKey ? blackKeyWidth : keyWidth,
        height: isBlackKey ? blackKeyHeight : 1,
        noteName: getNoteName(i)
      });
    }
    
    return layout;
  }, [viewRange]);
  
  // Create the piano keyboard visualization
  const pianoKeyboard = useMemo(() => {
    return keyboardLayout.map(key => {
      const color = key.isBlackKey ? 'black' : 'white';
      const depth = -1;
      
      return (
        <group key={`piano-key-${key.note}`} position={[key.position, -key.height / 2, depth]}>
          <mesh>
            <boxGeometry args={[key.width, key.height, 0.1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {showLabels && !key.isBlackKey && (
            <Text
              position={[0, -0.1, 0.06]}
              fontSize={0.2}
              color="black"
              anchorX="center"
              anchorY="bottom"
            >
              {key.noteName}
            </Text>
          )}
        </group>
      );
    });
  }, [keyboardLayout, showLabels]);
  
  // Create time grid lines
  const timeGrid = useMemo(() => {
    const grid = [];
    const gridDepth = viewRange.timeWindow;
    const gridLines = 16; // 4 bars with 4 beats each
    
    for (let i = 0; i <= gridLines; i++) {
      const position = (i / gridLines) * gridDepth;
      const isMeasure = i % 4 === 0;
      const color = isMeasure ? 'white' : 'gray';
      const opacity = isMeasure ? 0.5 : 0.2;
      
      grid.push(
        <line key={`grid-line-${i}`}>
          <bufferGeometry attach="geometry" args={[new Float32Array([
            -10, 0, position,
            10, 0, position
          ]), 3]} />
          <lineBasicMaterial attach="material" color={color} opacity={opacity} transparent />
        </line>
      );
    }
    
    return grid;
  }, [viewRange.timeWindow]);
  
  // Update the visualization on each frame
  useFrame((state, delta) => {
    // Update position and opacity of each active note
    Object.keys(notesRef.current).forEach(noteId => {
      const noteObject = notesRef.current[noteId];
      if (noteObject) {
        // Move the note along the time axis
        noteObject.position.z += delta * 2;
        
        // Fade out notes as they get older
        if (noteObject.userData.age !== undefined) {
          noteObject.userData.age += delta;
          
          // Fade out the note after it's reached the trail length
          if (noteObject.userData.age > noteTrailLength) {
            noteObject.material.opacity = Math.max(0, 1 - (noteObject.userData.age - noteTrailLength));
          }
          
          // Remove very old notes
          if (noteObject.userData.age > noteTrailLength + 2) {
            noteObject.removeFromParent();
            delete notesRef.current[noteId];
          }
        }
      }
    });
  });
  
  // Update active notes when they change
  useEffect(() => {
    if (!gridRef.current) return;
    
    // For each active note, create or update a visual element
    activeNotes.forEach(note => {
      const noteId = `note-${note.note}-${note.timestamp}`;
      
      // If we don't already have this note visualized, create a new one
      if (!notesRef.current[noteId]) {
        // Find the key position for this note
        const keyInfo = keyboardLayout.find(k => k.note === note.note);
        if (keyInfo) {
          // Create a new note object
          const colorFunction = colorSchemes[colorScheme] || colorSchemes.spectrum;
          const noteColor = colorFunction(note.note, note.velocity);
          
          const noteGeometry = new THREE.BoxGeometry(keyInfo.width * 0.9, 0.2, 0.5);
          const noteMaterial = new THREE.MeshStandardMaterial({
            color: noteColor,
            transparent: true,
            opacity: 1.0,
            emissive: noteColor,
            emissiveIntensity: 0.5
          });
          
          const noteMesh = new THREE.Mesh(noteGeometry, noteMaterial);
          noteMesh.position.set(keyInfo.position, 0, 0);
          noteMesh.userData = { age: 0, note: note.note, velocity: note.velocity };
          
          // Add the note to our scene
          gridRef.current.add(noteMesh);
          
          // Keep a reference to it for future updates
          notesRef.current[noteId] = noteMesh;
        }
      }
    });
  }, [activeNotes, keyboardLayout, colorScheme, colorSchemes]);
  
  return (
    <group>
      {/* Piano keyboard */}
      <group ref={pianoKeysRef} position={[-5, 0, 0]}>
        {pianoKeyboard}
      </group>
      
      {/* Time grid and note visualization */}
      <group ref={gridRef} position={[-5, 0, 0]}>
        {timeGrid}
      </group>
      
      {/* Title and instructions */}
      {accessibilityMode && (
        <Text
          position={[0, 2.5, -2]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="top"
        >
          MegaFM WebXR Music Generator
        </Text>
      )}
    </group>
  );
};

export default PianoRollVisualizer;