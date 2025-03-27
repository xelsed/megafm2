import React, { useEffect, useRef, useState } from 'react';
import { WebMidi } from 'webmidi';
import { useDispatch, useSelector } from 'react-redux';
import { midiConnected, midiDisconnected, midiError } from '../state/midiSlice';

// MegaFM uses MIDI port 1 (vs 0) channel 1
const MEGAFM_CHANNEL = 1;

// Debounce time for device connection events (ms)
const RECONNECT_DEBOUNCE_TIME = 500;

const MidiConnector = () => {
  const dispatch = useDispatch();
  const isConnected = useSelector(state => state.midi.connected);
  const connectedOutput = useSelector(state => state.midi.output);
  const connectionAttemptedRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const [deviceState, setDeviceState] = useState({
    inputs: new Set(),
    outputs: new Set()
  });
  
  useEffect(() => {
    // Only enable WebMidi once
    if (WebMidi.enabled) {
      console.log('WebMidi already enabled');
      if (!connectionAttemptedRef.current) {
        connectToMegaFM();
        connectionAttemptedRef.current = true;
      }
      return;
    }
    
    // Initialize WebMidi
    WebMidi.enable({ sysex: true })
      .then(() => {
        console.log('WebMidi enabled!');
        // Capture initial device state
        updateDeviceState();
        connectToMegaFM();
        connectionAttemptedRef.current = true;
        
        // Set up event listeners for device connections/disconnections with debouncing
        WebMidi.addListener("connected", handleDeviceConnection);
        WebMidi.addListener("disconnected", handleDeviceDisconnection);
      })
      .catch(err => {
        console.error('WebMidi could not be enabled:', err);
        dispatch(midiError(`WebMidi could not be enabled: ${err.message}`));
      });

    // Cleanup listeners and disable WebMidi on component unmount
    return () => {
      if (WebMidi.enabled) {
        try {
          // Remove listeners with proper handler references to prevent memory leaks
          WebMidi.removeListener("connected", handleDeviceConnection);
          WebMidi.removeListener("disconnected", handleDeviceDisconnection);
          
          // Clear any pending timeouts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          // Optionally disable WebMidi on unmount
          WebMidi.disable();
          console.log('WebMidi disabled.');
        } catch (err) {
          console.warn('Error cleaning up WebMidi:', err);
        }
      }
    };
  }, [dispatch]);

  // Update our tracked device state
  const updateDeviceState = () => {
    const currentInputs = new Set(WebMidi.inputs.map(input => input.id));
    const currentOutputs = new Set(WebMidi.outputs.map(output => output.id));
    
    setDeviceState({
      inputs: currentInputs,
      outputs: currentOutputs
    });
    
    return {
      inputs: currentInputs,
      outputs: currentOutputs
    };
  };

  // Check if device list has actually changed
  const hasDeviceListChanged = () => {
    const currentState = updateDeviceState();
    
    // Compare current and previous device states
    if (currentState.inputs.size !== deviceState.inputs.size || 
        currentState.outputs.size !== deviceState.outputs.size) {
      return true;
    }
    
    // Check if any input devices are different
    for (const inputId of currentState.inputs) {
      if (!deviceState.inputs.has(inputId)) {
        return true;
      }
    }
    
    // Check if any output devices are different
    for (const outputId of currentState.outputs) {
      if (!deviceState.outputs.has(outputId)) {
        return true;
      }
    }
    
    return false;
  };

  const connectToMegaFM = () => {
    // If already connected to a device, don't reconnect
    if (isConnected && connectedOutput) {
      console.log(`Already connected to: ${connectedOutput.name}`);
      return;
    }
    
    try {
      // Look for the MegaFM output device
      const outputsList = WebMidi.outputs.map(o => o.name).join(', ');
      console.log('Available MIDI outputs:', outputsList);
      
      // Ensure we have outputs
      if (WebMidi.outputs.length === 0) {
        dispatch(midiError('No MIDI output devices found. Please connect your MegaFM.'));
        return;
      }
      
      // Look for a MIDI device that might be the MegaFM
      // First try to find a device with "MegaFM" or "MEGA" in the name
      let outputDevice = WebMidi.outputs.find(output => 
        output.name.toLowerCase().includes('megafm') ||
        output.name.toLowerCase().includes('mega')
      );
      
      // Then try to find any device with "MIDI" in the name 
      // (for MegaFM connected via USB MIDI adapter)
      if (!outputDevice) {
        outputDevice = WebMidi.outputs.find(output => 
          output.name.toLowerCase().includes('midi') && 
          !output.name.toLowerCase().includes('through')
        );
      }
      
      // If no MIDI device found, fall back to the first non-through device
      if (!outputDevice) {
        outputDevice = WebMidi.outputs.find(output => 
          !output.name.toLowerCase().includes('through')
        );
      }
      
      // If still no appropriate device, use the first available
      if (!outputDevice && WebMidi.outputs.length > 0) {
        outputDevice = WebMidi.outputs[0];
      }
      
      if (!outputDevice) {
        dispatch(midiError('No suitable MIDI output device found.'));
        return;
      }
      
      console.log(`Connected to output device: ${outputDevice.name}`);
      
      // Get the input device too (if available)
      // First, try to find a matching input for our selected output
      let inputDevice = WebMidi.inputs.find(input => 
        input.name === outputDevice.name
      );
      
      // If no matching input, try to find any MIDI input
      if (!inputDevice) {
        inputDevice = WebMidi.inputs.find(input => 
          input.name.toLowerCase().includes('midi') && 
          !input.name.toLowerCase().includes('through')
        );
      }
      
      // If still no appropriate device, use the first available
      if (!inputDevice && WebMidi.inputs.length > 0) {
        inputDevice = WebMidi.inputs[0];
      }
      
      if (inputDevice) {
        console.log(`Connected to input device: ${inputDevice.name}`);
      }
      
      // Store the MIDI output and input in the Redux store
      dispatch(midiConnected({
        output: outputDevice,
        input: inputDevice
      }));
    } catch (error) {
      console.error('Error connecting to MegaFM:', error);
      dispatch(midiError(`Error connecting to MegaFM: ${error.message}`));
    }
  };

  // Debounced connection handler
  const debouncedReconnect = () => {
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Set a new timeout
    reconnectTimeoutRef.current = setTimeout(() => {
      // Only reconnect if the device list has actually changed
      if (hasDeviceListChanged()) {
        console.log('Device list has changed, attempting to reconnect...');
        
        // If not connected or connected to a "through" device, try to find a better device
        if (!isConnected || 
            (connectedOutput && connectedOutput.name.toLowerCase().includes('through')) ||
            // Also reconnect if the current device is no longer in the device list
            (connectedOutput && !WebMidi.outputs.some(output => output.id === connectedOutput.id))) {
          connectToMegaFM();
        }
      } else {
        console.log('Device state event fired but no actual changes detected');
      }
    }, RECONNECT_DEBOUNCE_TIME);
  };

  // Handle device connection events more intelligently with debounce
  const handleDeviceConnection = (e) => {
    console.log(`Device connected event: ${e.port.name}`);
    
    // Use debounced reconnect for all connection events
    debouncedReconnect();
  };

  // Handle device disconnection events more intelligently with debounce
  const handleDeviceDisconnection = (e) => {
    console.log(`Device disconnected event: ${e.port.name}`);
    
    // Check if the disconnected device is our current MIDI device
    if (isConnected && connectedOutput && 
        e.port.type === 'output' && 
        e.port.id === connectedOutput.id) {
      
      console.log('Our connected MIDI device was disconnected');
      dispatch(midiDisconnected());
    }
    
    // Use debounced reconnect
    debouncedReconnect();
  };

  // This component doesn't render anything, it just manages the MIDI connection
  return null;
};

export default MidiConnector;