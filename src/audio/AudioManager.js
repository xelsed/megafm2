/**
 * Audio Manager - Unified interface for MIDI and Web Audio
 * Automatically detects platform capabilities and uses appropriate audio backend
 */

import FMSynthEngine from './FMSynthEngine';
import { sendNoteOn, sendNoteOff, sendAllNotesOff, sendCC } from '../midi/midiUtils';

class AudioManager {
  constructor() {
    this.audioMode = null; // 'midi' or 'webaudio'
    this.isMidiAvailable = false;
    this.isWebAudioReady = false;
    this.midiOutput = null;
  }

  /**
   * Initialize audio system
   * Detects MIDI support and falls back to Web Audio if not available
   */
  async initialize(midiOutput = null) {
    console.log('AudioManager: Initializing...');

    // Check for MIDI support
    this.isMidiAvailable = this.checkMidiSupport(midiOutput);

    if (this.isMidiAvailable && midiOutput) {
      this.audioMode = 'midi';
      this.midiOutput = midiOutput;
      console.log('AudioManager: Using MIDI mode with hardware synthesizer');
      return { mode: 'midi', success: true };
    }

    // Fall back to Web Audio
    console.log('AudioManager: MIDI not available, initializing Web Audio API fallback...');
    const initialized = await FMSynthEngine.initialize();

    if (initialized) {
      this.audioMode = 'webaudio';
      this.isWebAudioReady = true;
      console.log('AudioManager: Using Web Audio mode');
      return { mode: 'webaudio', success: true };
    }

    console.error('AudioManager: Failed to initialize any audio backend');
    return { mode: null, success: false };
  }

  /**
   * Check if MIDI is supported and available
   */
  checkMidiSupport(midiOutput) {
    // Check if Web MIDI API is available
    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI API not supported on this platform');
      return false;
    }

    // Check if we have a valid MIDI output device
    if (!midiOutput || !midiOutput.send) {
      console.log('No MIDI output device available');
      return false;
    }

    return true;
  }

  /**
   * Update MIDI output device
   */
  setMidiOutput(midiOutput) {
    if (midiOutput && midiOutput.send) {
      this.midiOutput = midiOutput;
      this.isMidiAvailable = true;

      // Switch to MIDI if we were using Web Audio
      if (this.audioMode === 'webaudio') {
        console.log('AudioManager: Switching from Web Audio to MIDI');
        FMSynthEngine.allNotesOff();
        this.audioMode = 'midi';
      }

      return true;
    }

    return false;
  }

  /**
   * Play a note (unified interface)
   */
  noteOn(noteNumber, velocity = 0.8, channel = 1) {
    // Normalize velocity to 0-1 range if needed
    if (velocity > 1) {
      velocity = velocity / 127;
    }

    if (this.audioMode === 'midi' && this.midiOutput) {
      // Use MIDI hardware
      sendNoteOn(noteNumber, velocity, this.midiOutput, channel);
    } else if (this.audioMode === 'webaudio') {
      // Use Web Audio synthesis
      FMSynthEngine.noteOn(noteNumber, velocity);
    } else {
      console.warn('AudioManager: No audio backend available');
    }
  }

  /**
   * Stop a note (unified interface)
   */
  noteOff(noteNumber, channel = 1) {
    if (this.audioMode === 'midi' && this.midiOutput) {
      sendNoteOff(noteNumber, this.midiOutput, channel);
    } else if (this.audioMode === 'webaudio') {
      FMSynthEngine.noteOff(noteNumber);
    }
  }

  /**
   * Stop all notes (panic button)
   */
  allNotesOff() {
    if (this.audioMode === 'midi' && this.midiOutput) {
      sendAllNotesOff(this.midiOutput);
    } else if (this.audioMode === 'webaudio') {
      FMSynthEngine.allNotesOff();
    }
  }

  /**
   * Send control change (MIDI mode only)
   * In Web Audio mode, this updates synthesis parameters
   */
  sendCC(ccNumber, value, channel = 1) {
    if (this.audioMode === 'midi' && this.midiOutput) {
      sendCC(ccNumber, value, this.midiOutput, channel);
    } else if (this.audioMode === 'webaudio') {
      // Map common CC parameters to Web Audio synthesis
      this.mapCCToWebAudio(ccNumber, value);
    }
  }

  /**
   * Map MIDI CC parameters to Web Audio synthesis parameters
   */
  mapCCToWebAudio(ccNumber, value) {
    // Normalize 0-127 to 0-1
    const normalized = value / 127;

    // Map common MIDI CC to synthesis parameters
    switch(ccNumber) {
      case 7: // Volume
        FMSynthEngine.updateParams({ masterVolume: normalized });
        break;

      case 1: // Modulation wheel -> FM algorithm
        const algorithm = Math.floor(normalized * 7) + 1;
        FMSynthEngine.updateParams({ algorithm });
        break;

      case 74: // Brightness -> Operator 1 level
        FMSynthEngine.updateParams({
          operators: [{ level: normalized }]
        });
        break;

      case 71: // Resonance -> Operator 2 level
        FMSynthEngine.updateParams({
          operators: [undefined, { level: normalized }]
        });
        break;

      // Add more CC mappings as needed
      default:
        // Ignore unmapped CCs
        break;
    }
  }

  /**
   * Update synthesis parameters (Web Audio mode)
   */
  updateSynthParams(params) {
    if (this.audioMode === 'webaudio') {
      FMSynthEngine.updateParams(params);
    }
  }

  /**
   * Get current audio mode
   */
  getMode() {
    return this.audioMode;
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      mode: this.audioMode,
      midiAvailable: this.isMidiAvailable,
      webAudioReady: this.isWebAudioReady,
      ...(this.audioMode === 'webaudio' ? FMSynthEngine.getState() : {})
    };
  }

  /**
   * Check if audio is ready
   */
  isReady() {
    return this.audioMode !== null;
  }

  /**
   * Dispose and clean up resources
   */
  dispose() {
    if (this.audioMode === 'webaudio') {
      FMSynthEngine.dispose();
    }

    this.audioMode = null;
    this.midiOutput = null;
    this.isMidiAvailable = false;
    this.isWebAudioReady = false;
  }
}

// Export singleton instance
export default new AudioManager();
