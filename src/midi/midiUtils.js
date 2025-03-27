// MIDI utility functions for communicating with the MegaFM

// MegaFM uses MIDI port 1 (vs 0) channel 1
export const MEGAFM_CHANNEL = 1;

// CC numbers from the MegaFM MIDI implementation (from the manual)
export const CC = {
  // GLOBAL
  ALGORITHM: 4,       // 1-8
  FEEDBACK: 3,        // 0-127
  FAT: 28,            // 0-127
  VOICE_MODE: 22,     // Custom CC for voice mode
  VOICE_DETUNE: 91,   // Custom CC for voice detune range
  VOICE_GLIDE: 92,    // Custom CC for glide/portamento
  FAT_MODE: 93,       // Custom CC for fat mode (semitone vs octave)
  MPE_MODE: 94,       // Custom CC for MPE mode
  NOTE_PRIORITY: 95,  // Custom CC for note priority in unison
  
  // OPERATOR 1
  OP1_TOTAL_LEVEL: 19,
  OP1_DETUNE: 18,
  OP1_MULTIPLIER: 27,
  OP1_ATTACK_RATE: 29,
  OP1_DECAY_RATE: 21,
  OP1_SUSTAIN_LEVEL: 25,
  OP1_SUSTAIN_RATE: 17,
  OP1_RELEASE_RATE: 30,
  OP1_RATE_SCALING: 70, // Not in original manual, using custom range
  
  // OPERATOR 2
  OP2_TOTAL_LEVEL: 40,
  OP2_DETUNE: 31,
  OP2_MULTIPLIER: 32,
  OP2_ATTACK_RATE: 36,
  OP2_DECAY_RATE: 44,
  OP2_SUSTAIN_LEVEL: 42,
  OP2_SUSTAIN_RATE: 34,
  OP2_RELEASE_RATE: 11,
  OP2_RATE_SCALING: 71, // Not in original manual, using custom range
  
  // OPERATOR 3
  OP3_TOTAL_LEVEL: 16,
  OP3_DETUNE: 20,
  OP3_MULTIPLIER: 24,
  OP3_ATTACK_RATE: 49,
  OP3_DECAY_RATE: 50,
  OP3_SUSTAIN_LEVEL: 51,
  OP3_SUSTAIN_RATE: 45,
  OP3_RELEASE_RATE: 37,
  OP3_RATE_SCALING: 72, // Not in original manual, using custom range
  
  // OPERATOR 4
  OP4_TOTAL_LEVEL: 38,
  OP4_DETUNE: 47,
  OP4_MULTIPLIER: 39,
  OP4_ATTACK_RATE: 46,
  OP4_DECAY_RATE: 33,
  OP4_SUSTAIN_LEVEL: 41,
  OP4_SUSTAIN_RATE: 43,
  OP4_RELEASE_RATE: 35,
  OP4_RATE_SCALING: 73, // Not in original manual, using custom range
  
  // LFO
  LFO1_RATE: 15,
  LFO1_DEPTH: 12,
  LFO2_RATE: 10,
  LFO2_DEPTH: 9,
  LFO3_RATE: 14,
  LFO3_DEPTH: 2,
  
  // LFO WAVEFORMS (custom CCs)
  LFO1_WAVEFORM: 74,
  LFO2_WAVEFORM: 75,
  LFO3_WAVEFORM: 76,
  
  // LFO FLAGS (custom CCs)
  LFO1_RETRIG: 77,
  LFO2_RETRIG: 78,
  LFO3_RETRIG: 79,
  
  LFO1_LOOP: 80,
  LFO2_LOOP: 81, 
  LFO3_LOOP: 82,
  
  // ENVELOPE LOOPING (custom CCs)
  OP1_ENV_LOOP: 83,
  OP2_ENV_LOOP: 84,
  OP3_ENV_LOOP: 85,
  OP4_ENV_LOOP: 86,
  
  OP1_ENV_LOOP_MODE: 87, // 0 = forward, 1 = ping-pong
  OP2_ENV_LOOP_MODE: 88,
  OP3_ENV_LOOP_MODE: 89,
  OP4_ENV_LOOP_MODE: 90,
  
  // ARP & VIBRATO
  ARP_RATE: 6,
  ARP_RANGE: 5,
  VIBRATO_RATE: 48,
  VIBRATO_DEPTH: 13,
};

/**
 * Sends a MIDI note on message to the MegaFM
 * @param {Object} output - WebMidi output device
 * @param {Number} note - MIDI note number (0-127)
 * @param {Number} velocity - Note velocity (0-127)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const sendNoteOn = (output, note, velocity = 100, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // WebMidi.js now expects attack to be 0-1 instead of 0-127
    const normalizedAttack = Math.min(1, Math.max(0, velocity / 127));
    
    output.channels[channel].sendNoteOn(note, { attack: normalizedAttack });
    // Reduce logging to prevent console spam
    if (note % 10 === 0) { // Only log occasionally
      console.log(`Note On: ${note}, Attack: ${normalizedAttack.toFixed(2)} (from velocity: ${velocity}), Channel: ${channel}`);
    }
  } catch (error) {
    console.error('Error sending Note On:', error);
  }
};

/**
 * Sends a MIDI note off message to the MegaFM
 * @param {Object} output - WebMidi output device
 * @param {Number} note - MIDI note number (0-127)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const sendNoteOff = (output, note, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    output.channels[channel].sendNoteOff(note);
    // Reduce logging to prevent console spam
    if (note % 10 === 0) { // Only log occasionally
      console.log(`Note Off: ${note}, Channel: ${channel}`);
    }
  } catch (error) {
    console.error('Error sending Note Off:', error);
  }
};

/**
 * Sends a MIDI control change message to the MegaFM and tracks parameter movement
 * @param {Object} output - WebMidi output device
 * @param {Number} cc - Control change number
 * @param {Number} value - Control change value (0-127)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 * @param {String} paramName - Optional name of the parameter (for display and tracking)
 */
export const sendCC = (output, cc, value, channel = MEGAFM_CHANNEL, paramName = null) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // Ensure value is in valid MIDI range
    const validValue = validateMidiValue(value);
    output.channels[channel].sendControlChange(cc, validValue);
    
    // Log only important CC messages to reduce console spam
    if (cc === CC.ALGORITHM || cc === CC.FEEDBACK || cc % 10 === 0) {
      console.log(`CC: ${cc}, Value: ${validValue}, Channel: ${channel}${paramName ? ' (' + paramName + ')' : ''}`);
    }
    
    // Import is done dynamically to avoid circular dependencies
    import('./modUtils.js').then(modUtils => {
      // Track this parameter movement for LFO modulation
      if (typeof modUtils.trackParameterMovement === 'function') {
        modUtils.trackParameterMovement(cc, validValue, paramName);
      }
    }).catch(err => {
      console.warn('Could not track parameter movement:', err);
    });
    
    return validValue;
  } catch (error) {
    console.error('Error sending Control Change:', error);
    return null;
  }
};

/**
 * Sends all notes off message to the MegaFM
 * @param {Object} output - WebMidi output device
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const sendAllNotesOff = (output, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // Check if output exists and has channels
    if (output && output.channels && output.channels[channel]) {
      output.channels[channel].sendAllNotesOff();
      console.log(`All Notes Off, Channel: ${channel}`);
    } else {
      console.log(`Cannot send All Notes Off - no valid MIDI output on channel ${channel}`);
    }
  } catch (error) {
    console.error('Error sending All Notes Off:', error);
  }
};

/**
 * Sends a program change message to select a preset on the MegaFM
 * @param {Object} output - WebMidi output device
 * @param {Number} presetNumber - Preset number (0-99)
 * @param {Number} bankNumber - Bank number (0-5)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const selectPreset = (output, presetNumber, bankNumber = 0, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // MegaFM uses bank select MSB to select the bank (0-5)
    // and program change for the preset within that bank (0-99)
    
    // Calculate the actual program number
    const validPresetNumber = Math.min(99, Math.max(0, Math.floor(presetNumber)));
    const validBankNumber = Math.min(5, Math.max(0, Math.floor(bankNumber)));
    
    // Send bank select
    output.channels[channel].sendControlChange(0, validBankNumber);
    
    // Send program change
    output.channels[channel].sendProgramChange(validPresetNumber);
    
    console.log(`Selected Preset: Bank ${validBankNumber}, Number ${validPresetNumber}, Channel: ${channel}`);
    return {
      bank: validBankNumber,
      preset: validPresetNumber
    };
  } catch (error) {
    console.error('Error selecting preset:', error);
    return null;
  }
};

/**
 * Toggles envelope looping for the specified operator
 * @param {Object} output - WebMidi output device 
 * @param {Number} operator - Operator number (1-4)
 * @param {Boolean} active - Whether looping is active
 * @param {Boolean} pingPong - Whether loop mode is ping-pong (true) or forward (false)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setEnvelopeLooping = (output, operator, active, pingPong = false, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // Determine which CC to use based on operator
    let loopCC, modeCC;
    
    switch(operator) {
      case 1:
        loopCC = CC.OP1_ENV_LOOP;
        modeCC = CC.OP1_ENV_LOOP_MODE;
        break;
      case 2:
        loopCC = CC.OP2_ENV_LOOP;
        modeCC = CC.OP2_ENV_LOOP_MODE;
        break;
      case 3:
        loopCC = CC.OP3_ENV_LOOP;
        modeCC = CC.OP3_ENV_LOOP_MODE;
        break;
      case 4:
        loopCC = CC.OP4_ENV_LOOP;
        modeCC = CC.OP4_ENV_LOOP_MODE;
        break;
      default:
        console.warn(`Invalid operator number: ${operator}, must be 1-4`);
        return;
    }
    
    // Send envelope loop state
    output.channels[channel].sendControlChange(loopCC, active ? 127 : 0);
    
    // Send envelope loop mode
    output.channels[channel].sendControlChange(modeCC, pingPong ? 127 : 0);
    
    console.log(`Set Operator ${operator} envelope loop: ${active ? 'ON' : 'OFF'}, Mode: ${pingPong ? 'Ping-Pong' : 'Forward'}`);
  } catch (error) {
    console.error(`Error setting envelope looping for operator ${operator}:`, error);
  }
};

/**
 * Maps a number from one range to another
 * @param {Number} value - Input value
 * @param {Number} inMin - Input minimum
 * @param {Number} inMax - Input maximum
 * @param {Number} outMin - Output minimum
 * @param {Number} outMax - Output maximum
 * @returns {Number} - Mapped value
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Validates a MIDI value (clamps to 0-127)
 * @param {Number} value - Value to validate
 * @returns {Number} - Clamped value
 */
export const validateMidiValue = (value) => {
  return Math.min(127, Math.max(0, Math.round(value)));
};

/**
 * Voice mode enum based on the MEGAfm manual
 */
export const VoiceMode = {
  POLY12: 0,
  WIDE6: 1,
  WIDE4: 2,
  WIDE3: 3,
  DUAL_CH3: 4,
  UNISON: 5,
  AUTO_CHORD: 6
};

/**
 * Note priority modes for unison mode
 */
export const NotePriority = {
  LOWEST: 0,  // Default
  HIGHEST: 1,
  LAST: 2
};

/**
 * Sets the voice mode of the MEGAfm
 * @param {Object} output - WebMidi output device
 * @param {Number} mode - Voice mode (see VoiceMode enum)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setVoiceMode = (output, mode, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    const validMode = Math.min(Object.keys(VoiceMode).length - 1, Math.max(0, Math.floor(mode)));
    output.channels[channel].sendControlChange(CC.VOICE_MODE, validMode);
    console.log(`Set Voice Mode: ${Object.keys(VoiceMode)[validMode]}`);
    return validMode;
  } catch (error) {
    console.error('Error setting voice mode:', error);
    return null;
  }
};

/**
 * Sets fat/detune parameter with range mode (semitone or octave)
 * @param {Object} output - WebMidi output device
 * @param {Number} value - Detune amount (0-127)
 * @param {Boolean} octaveMode - Whether to use octave range (true) or semitone range (false)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setFatDetune = (output, value, octaveMode = false, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // Set fat value
    const validValue = validateMidiValue(value);
    output.channels[channel].sendControlChange(CC.FAT, validValue);
    
    // Set fat mode (semitone vs octave)
    output.channels[channel].sendControlChange(CC.FAT_MODE, octaveMode ? 127 : 0);
    
    console.log(`Set Fat/Detune: ${validValue}/127, Mode: ${octaveMode ? 'Octave' : 'Semitone'}`);
  } catch (error) {
    console.error('Error setting fat/detune:', error);
  }
};

/**
 * Sets the glide time (portamento)
 * @param {Object} output - WebMidi output device
 * @param {Number} value - Glide amount (0-127)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setGlide = (output, value, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    const validValue = validateMidiValue(value);
    output.channels[channel].sendControlChange(CC.VOICE_GLIDE, validValue);
    console.log(`Set Glide: ${validValue}/127`);
  } catch (error) {
    console.error('Error setting glide:', error);
  }
};

/**
 * Toggles MPE (MIDI Polyphonic Expression) mode
 * @param {Object} output - WebMidi output device
 * @param {Boolean} active - Whether MPE mode is active
 * @param {Number} pitchBendRange - Pitch bend range in semitones (1-48)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setMPEMode = (output, active, pitchBendRange = 48, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    // Toggle MPE mode
    output.channels[channel].sendControlChange(CC.MPE_MODE, active ? 127 : 0);
    
    // If enabling MPE, force voice mode to Poly12 as per manual
    if (active) {
      output.channels[channel].sendControlChange(CC.VOICE_MODE, VoiceMode.POLY12);
      
      // Set pitch bend range (1-48 semitones)
      const validPitchBendRange = Math.min(48, Math.max(1, Math.floor(pitchBendRange)));
      // Implementation would need actual MIDI spec for pitch bend range
      
      console.log(`Enabled MPE mode with pitch bend range: ${validPitchBendRange} semitones`);
    } else {
      console.log('Disabled MPE mode');
    }
  } catch (error) {
    console.error('Error setting MPE mode:', error);
  }
};

/**
 * Sets note priority for unison mode
 * @param {Object} output - WebMidi output device
 * @param {Number} priority - Note priority (see NotePriority enum)
 * @param {Number} channel - MIDI channel (defaults to MEGAFM_CHANNEL)
 */
export const setNotePriority = (output, priority, channel = MEGAFM_CHANNEL) => {
  if (!output) {
    console.warn('No MIDI output device available');
    return;
  }
  
  try {
    const validPriority = Math.min(Object.keys(NotePriority).length - 1, Math.max(0, Math.floor(priority)));
    output.channels[channel].sendControlChange(CC.NOTE_PRIORITY, validPriority);
    console.log(`Set Note Priority: ${Object.keys(NotePriority)[validPriority]}`);
  } catch (error) {
    console.error('Error setting note priority:', error);
  }
};