/**
 * Modulation utility functions for the MEGAfm
 * 
 * The MEGAfm allows parameters to be modulated by LFOs.
 * To set up modulation, the user moves a parameter and then presses a chain button.
 * This file provides functions to handle that process.
 */

import { CC, sendCC } from './midiUtils';

// MIDI CC numbers for LFO modulation destinations
export const MOD_DEST = {
  LFO1_DEST_CC: 100,  // CC for setting LFO1 destination parameter
  LFO2_DEST_CC: 101,  // CC for setting LFO2 destination parameter
  LFO3_DEST_CC: 102   // CC for setting LFO3 destination parameter
};

// Storage for the last moved parameter
let lastMovedParameter = {
  cc: null,           // The CC number of the parameter
  value: null,        // The last value sent
  timestamp: 0,       // When it was moved
  name: null          // Human-readable name
};

/**
 * Track the last parameter that was moved
 * @param {Number} cc - CC number of the parameter
 * @param {Number} value - Value of the parameter
 * @param {String} name - Human-readable name of the parameter
 */
export const trackParameterMovement = (cc, value, name) => {
  lastMovedParameter = {
    cc,
    value,
    timestamp: Date.now(),
    name: name || `CC ${cc}`
  };
  
  console.log(`Last moved parameter: ${name || 'CC ' + cc} (${cc}) = ${value}`);
  return lastMovedParameter;
};

/**
 * Check if a parameter has been moved recently
 * @param {Number} timeWindowMs - Time window in milliseconds
 * @returns {Boolean} - Whether a parameter was moved within the time window
 */
export const hasRecentParameterMovement = (timeWindowMs = 5000) => {
  if (!lastMovedParameter.cc) return false;
  
  const timeSinceLastMove = Date.now() - lastMovedParameter.timestamp;
  return timeSinceLastMove <= timeWindowMs;
};

/**
 * Link the last moved parameter to an LFO
 * @param {Object} output - WebMidi output device
 * @param {Number} lfoNumber - LFO number (1-3)
 * @param {Number} channel - MIDI channel
 * @returns {Object|null} - Info about the linked parameter or null if no recent parameter
 */
export const linkParameterToLFO = (output, lfoNumber, channel = 1) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return null;
  }
  
  // Validate LFO number
  if (lfoNumber < 1 || lfoNumber > 3) {
    console.error(`Invalid LFO number: ${lfoNumber}, must be 1-3`);
    return null;
  }
  
  // Check if we have a recently moved parameter
  if (!hasRecentParameterMovement()) {
    console.warn('No parameter moved recently, cannot link to LFO');
    return null;
  }
  
  try {
    // Determine the appropriate CC for this LFO's destination
    let destCC;
    switch (lfoNumber) {
      case 1: destCC = MOD_DEST.LFO1_DEST_CC; break;
      case 2: destCC = MOD_DEST.LFO2_DEST_CC; break;
      case 3: destCC = MOD_DEST.LFO3_DEST_CC; break;
    }
    
    // Send the parameter CC number to the LFO destination CC
    sendCC(output, destCC, lastMovedParameter.cc, channel);
    
    console.log(`Linked parameter ${lastMovedParameter.name} (CC ${lastMovedParameter.cc}) to LFO${lfoNumber}`);
    
    return {
      lfo: lfoNumber,
      parameter: lastMovedParameter.name,
      cc: lastMovedParameter.cc
    };
  } catch (error) {
    console.error(`Error linking parameter to LFO${lfoNumber}:`, error);
    return null;
  }
};

/**
 * Unlink a parameter from an LFO
 * @param {Object} output - WebMidi output device
 * @param {Number} lfoNumber - LFO number (1-3)
 * @param {Number} channel - MIDI channel
 */
export const unlinkParameterFromLFO = (output, lfoNumber, channel = 1) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return null;
  }
  
  // Validate LFO number
  if (lfoNumber < 1 || lfoNumber > 3) {
    console.error(`Invalid LFO number: ${lfoNumber}, must be 1-3`);
    return null;
  }
  
  try {
    // Determine the appropriate CC for this LFO's destination
    let destCC;
    switch (lfoNumber) {
      case 1: destCC = MOD_DEST.LFO1_DEST_CC; break;
      case 2: destCC = MOD_DEST.LFO2_DEST_CC; break;
      case 3: destCC = MOD_DEST.LFO3_DEST_CC; break;
    }
    
    // Send a value of 127 to indicate unlink (MEGAfm specific value)
    sendCC(output, destCC, 127, channel);
    
    console.log(`Unlinked parameter from LFO${lfoNumber}`);
    return true;
  } catch (error) {
    console.error(`Error unlinking parameter from LFO${lfoNumber}:`, error);
    return null;
  }
};

/**
 * Get information about the last moved parameter
 * @returns {Object} - Last moved parameter info
 */
export const getLastMovedParameter = () => {
  return { ...lastMovedParameter };
};