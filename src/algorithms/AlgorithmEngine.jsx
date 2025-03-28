import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { noteOn, noteOff, clearNotes } from '../state/midiSlice';
import { sendNoteOn, sendNoteOff, sendAllNotesOff, MEGAFM_CHANNEL } from '../midi/midiUtils';
import FractalGenerator from './FractalGenerator';
import EuclideanGenerator from './EuclideanGenerator';
import CellularGenerator from './CellularGenerator';
import HarmonyGenerator from './HarmonyGenerator';
import SequentialGenerator from './SequentialGenerator';
import WaveshaperGenerator from './WaveshaperGenerator';

const AlgorithmEngine = () => {
  const dispatch = useDispatch();
  const midiOutput = useSelector(state => state.midi.output);
  const currentAlgorithm = useSelector(state => state.algorithm.currentAlgorithm);
  const algorithms = useSelector(state => state.algorithm.algorithms);
  const isPlaying = useSelector(state => state.algorithm.isPlaying);
  const tempo = useSelector(state => state.algorithm.tempo);
  const noteInterval = useSelector(state => state.algorithm.noteInterval);
  
  // References to keep track of timers and sequences
  const timerRef = useRef(null);
  const sequenceRef = useRef([]);
  const stepIndexRef = useRef(0);
  const activeNotesRef = useRef(new Set());
  
  // Load the appropriate generator based on the algorithm
  const getGenerator = () => {
    switch (currentAlgorithm) {
      case 'fractal':
        return new FractalGenerator(algorithms.fractal.parameters);
      case 'euclidean':
        return new EuclideanGenerator(algorithms.euclidean.parameters);
      case 'cellular':
        return new CellularGenerator(algorithms.cellular.parameters);
      case 'sequential':
        return new SequentialGenerator(algorithms.sequential.parameters);
      case 'waveshaper':
        return new WaveshaperGenerator(algorithms.waveshaper.parameters);
      case 'ruleBasedHarmony':
        return new HarmonyGenerator(algorithms.ruleBasedHarmony.parameters);
      default:
        return new FractalGenerator(algorithms.fractal.parameters);
    }
  };
  
  // Generate a new sequence of notes
  const generateSequence = () => {
    const generator = getGenerator();
    const sequence = generator.generate();
    sequenceRef.current = sequence;
    stepIndexRef.current = 0;
    return sequence;
  };
  
  // Play the next step in the sequence
  const playNextStep = () => {
    if (!midiOutput || !isPlaying || sequenceRef.current.length === 0) return;
    
    const sequence = sequenceRef.current;
    const stepIndex = stepIndexRef.current;
    const step = sequence[stepIndex];
    
    // Stop any currently playing notes
    activeNotesRef.current.forEach(note => {
      sendNoteOff(midiOutput, note);
      dispatch(noteOff({ note }));
    });
    activeNotesRef.current.clear();
    
    // Play the notes for this step
    if (step && step.notes) {
      step.notes.forEach(note => {
        const velocity = note.velocity || 100;
        
        try {
          // Send note on with properly normalized attack value (0-1 instead of 0-127)
          // MegaFM requires attack value in range 0-1 for WebMidi
          const normalizedAttack = Math.min(1, Math.max(0, velocity / 127));
          
          // Set the appropriate MIDI channel (MegaFM uses channel 1)
          const midiChannel = MEGAFM_CHANNEL; // From midiUtils.js
          
          // Send the normalized MIDI note to the MegaFM
          midiOutput.channels[midiChannel].sendNoteOn(note.pitch, { attack: normalizedAttack });
          
          // Track note state in Redux
          dispatch(noteOn({ 
            note: note.pitch, 
            velocity,
            column: note.column,
            row: note.row,
            state: note.state || 'active' 
          }));
          
          // Track active notes for release later
          activeNotesRef.current.add(note.pitch);
          
          // Only log occasionally to reduce console spam
          if (note.pitch % 10 === 0 || note.state === 'birth') {
            console.log(`Note On: ${note.pitch}, Attack: ${normalizedAttack.toFixed(2)}, Velocity: ${velocity}, State: ${note.state || 'active'}, Channel: ${midiChannel}`);
          }
        } catch (error) {
          console.error(`Failed to send Note On for pitch ${note.pitch}:`, error.message);
        }
      });
    }
    
    // Advance to the next step or loop back
    stepIndexRef.current = (stepIndexRef.current + 1) % sequence.length;
  };
  
  // Start or stop the playback
  useEffect(() => {
    if (isPlaying) {
      // Generate a new sequence if needed
      if (sequenceRef.current.length === 0) {
        generateSequence();
      }
      
      // Clear any existing timer before starting a new one
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Use requestAnimationFrame for more precise timing instead of setInterval
      let lastTime = performance.now();
      let accumulatedTime = 0;
      
      const animationCallback = (time) => {
        // Cancel animation if we're no longer playing
        if (!isPlaying) {
          // Clear the timer reference
          if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        
        // Calculate elapsed time since last frame
        const deltaTime = time - lastTime;
        lastTime = time;
        
        // Protect against browser tab switching which can cause huge deltaTime
        // Cap the max delta to prevent large jumps
        const cappedDelta = Math.min(deltaTime, 100);
        
        accumulatedTime += cappedDelta;
        
        // If enough time has passed for a step
        while (accumulatedTime >= noteInterval) {
          playNextStep();
          accumulatedTime -= noteInterval; // Subtract full interval for accurate timing
        }
        
        // Continue the animation loop
        timerRef.current = requestAnimationFrame(animationCallback);
      };
      
      // Start the animation loop
      timerRef.current = requestAnimationFrame(animationCallback);
      console.log(`Starting playback with timing interval: ${noteInterval}ms`);
    } else {
      // Stop the animation frame and all notes
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
        console.log('Stopping playback');
      }
      
      // Turn off any active notes
      if (midiOutput) {
        try {
          sendAllNotesOff(midiOutput);
          activeNotesRef.current.clear();
          dispatch(clearNotes());
        } catch (error) {
          console.warn("Error stopping playback:", error.message);
        }
      }
    }
    
    // Cleanup the animation frame when component unmounts or dependencies change
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
        console.log('Cleaning up playback timer');
      }
    };
  }, [isPlaying, midiOutput, noteInterval, dispatch]);
  
  // Update the timing when the tempo changes
  useEffect(() => {
    // No need to explicitly handle tempo changes with requestAnimationFrame
    // The next animation frame will use the updated noteInterval value
    if (isPlaying) {
      console.log(`Updated playback timing to: ${noteInterval}ms (tempo: ${tempo}bpm)`);
      
      // When tempo changes, regenerate sequence for better sync
      if (midiOutput) {
        console.log("Regenerating sequence to match new tempo");
        generateSequence();
        stepIndexRef.current = 0;
      }
    }
  }, [tempo, noteInterval, isPlaying, midiOutput, generateSequence]);
  
  // Regenerate the sequence when algorithm or parameters change
  useEffect(() => {
    generateSequence();
    
    // Dispatch action to set visualization mode based on algorithm
    if (currentAlgorithm) {
      dispatch({ type: 'visualizer/setVisualizationForAlgorithm', payload: currentAlgorithm });
    }
  }, [currentAlgorithm, algorithms, dispatch]);
  
  // Clean up function to stop notes and timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      
      if (midiOutput) {
        try {
          sendAllNotesOff(midiOutput);
          
          // Clear the active notes reference to ensure no orphaned notes
          if (activeNotesRef.current.size > 0) {
            activeNotesRef.current.clear();
            dispatch(clearNotes());
          }
        } catch (error) {
          console.warn("Error cleaning up MIDI notes:", error.message);
        }
      }
    };
  }, [midiOutput, dispatch]);
  
  // This component doesn't render anything visible
  return null;
};

export default AlgorithmEngine;