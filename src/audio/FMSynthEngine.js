/**
 * FM Synthesis Engine using Web Audio API
 * Fallback for platforms without MIDI support (e.g., Android, iOS)
 * Implements 4-operator FM synthesis similar to MEGAfm hardware
 */

import {
  midiToFrequency,
  createAudioContext,
  resumeAudioContext,
  clamp
} from '../utils/audioUtils';
import { AUDIO_CONFIG, ERROR_MESSAGES } from '../config/constants';

class FMSynthEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.activeVoices = new Map();
    this.maxPolyphony = AUDIO_CONFIG.MAX_POLYPHONY;
    this.isInitialized = false;

    // FM synthesis parameters (matching MEGAfm structure)
    this.params = {
      algorithm: 1, // FM algorithm (1-8)
      feedback: 0,

      // 4 operators
      operators: [
        { level: 1.0, detune: 0, multiplier: 1.0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        { level: 0.8, detune: 0, multiplier: 2.0, attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
        { level: 0.6, detune: 0, multiplier: 3.0, attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 },
        { level: 0.4, detune: 0, multiplier: 4.0, attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
      ],

      // Global parameters
      vibrato: { rate: 5, depth: 0 },
      glide: 0,
      masterVolume: 0.5
    };
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Create audio context with compatibility for WebKit
      this.audioContext = createAudioContext();

      if (!this.audioContext) {
        throw new Error(ERROR_MESSAGES.AUDIO.NO_CONTEXT);
      }

      // Create compressor for output limiting (prevents clipping)
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.params.masterVolume;

      // Connect: masterGain -> compressor -> destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioContext.destination);

      // Resume context if suspended (required for iOS/Android)
      await resumeAudioContext(this.audioContext);

      this.isInitialized = true;
      console.log(`FM Synthesis Engine initialized (Sample Rate: ${this.audioContext.sampleRate}Hz)`);
      return true;
    } catch (error) {
      console.error('Failed to initialize FM Synthesis Engine:', error);
      return false;
    }
  }

  /**
   * Create FM voice with 4-operator synthesis
   */
  createVoice(noteNumber, velocity) {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('FM Synth not initialized');
      return null;
    }

    const now = this.audioContext.currentTime;
    const frequency = midiToFrequency(noteNumber);
    const velocityGain = clamp(velocity, 0, 1);

    // Voice object to hold all nodes
    const voice = {
      noteNumber,
      frequency,
      oscillators: [],
      gains: [],
      envelopes: []
    };

    // Create 4 operators
    for (let i = 0; i < 4; i++) {
      const op = this.params.operators[i];

      // Create oscillator
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine'; // FM synthesis uses sine waves
      osc.frequency.value = frequency * op.multiplier + op.detune;

      // Create gain for this operator
      const gain = this.audioContext.createGain();
      gain.gain.value = 0; // Start silent, envelope will open it

      // Connect oscillator to gain
      osc.connect(gain);

      voice.oscillators.push(osc);
      voice.gains.push(gain);
    }

    // Connect operators based on algorithm
    this.connectAlgorithm(voice, this.params.algorithm);

    // Apply ADSR envelopes
    this.applyEnvelopes(voice, velocityGain, now);

    // Start all oscillators
    voice.oscillators.forEach(osc => osc.start(now));

    return voice;
  }

  /**
   * Connect operators based on FM algorithm
   * Algorithm 1: Classic FM (Op4 -> Op3 -> Op2 -> Op1 -> Output)
   * Algorithm 2: Parallel (All ops -> Output)
   * Algorithm 3: Layered (Op4 -> Op3, Op2 -> Op1, both -> Output)
   */
  connectAlgorithm(voice, algorithm) {
    const [op1, op2, op3, op4] = voice.gains;

    switch(algorithm) {
      case 1: // Serial FM chain
        op4.connect(voice.oscillators[2].frequency); // Op4 modulates Op3
        op3.connect(voice.oscillators[1].frequency); // Op3 modulates Op2
        op2.connect(voice.oscillators[0].frequency); // Op2 modulates Op1
        op1.connect(this.masterGain); // Op1 to output
        break;

      case 2: // Parallel
        op1.connect(this.masterGain);
        op2.connect(this.masterGain);
        op3.connect(this.masterGain);
        op4.connect(this.masterGain);
        break;

      case 3: // Two serial chains
        op4.connect(voice.oscillators[2].frequency);
        op3.connect(this.masterGain);
        op2.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
        break;

      case 4: // Op4 modulates all
        op4.connect(voice.oscillators[2].frequency);
        op4.connect(voice.oscillators[1].frequency);
        op4.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
        op2.connect(this.masterGain);
        op3.connect(this.masterGain);
        break;

      case 5: // Three parallel + one modulator
        op4.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
        op2.connect(this.masterGain);
        op3.connect(this.masterGain);
        break;

      case 6: // Two modulators, two carriers
        op4.connect(voice.oscillators[1].frequency);
        op3.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
        op2.connect(this.masterGain);
        break;

      case 7: // Single modulator + three carriers
        op4.connect(voice.oscillators[2].frequency);
        op1.connect(this.masterGain);
        op2.connect(this.masterGain);
        op3.connect(this.masterGain);
        break;

      case 8: // Feedback configuration
        op4.connect(voice.oscillators[2].frequency);
        op3.connect(voice.oscillators[1].frequency);
        op2.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
        // Note: True feedback requires delay node, simplified here
        break;

      default:
        // Default to algorithm 1
        op4.connect(voice.oscillators[2].frequency);
        op3.connect(voice.oscillators[1].frequency);
        op2.connect(voice.oscillators[0].frequency);
        op1.connect(this.masterGain);
    }
  }

  /**
   * Apply ADSR envelope to all operators
   */
  applyEnvelopes(voice, velocity, startTime) {
    for (let i = 0; i < 4; i++) {
      const op = this.params.operators[i];
      const gain = voice.gains[i].gain;
      const level = op.level * velocity;

      // Attack
      gain.setValueAtTime(0, startTime);
      gain.linearRampToValueAtTime(level, startTime + op.attack);

      // Decay to Sustain
      gain.linearRampToValueAtTime(level * op.sustain, startTime + op.attack + op.decay);

      // Store envelope parameters for release
      voice.envelopes.push({
        sustainLevel: level * op.sustain,
        releaseTime: op.release
      });
    }
  }

  /**
   * Release voice (apply release envelope)
   */
  releaseVoice(voice) {
    if (!voice || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    for (let i = 0; i < 4; i++) {
      const gain = voice.gains[i].gain;
      const envelope = voice.envelopes[i];

      // Cancel scheduled values and apply release
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0, now + envelope.releaseTime);
    }

    // Stop oscillators after release time
    const maxRelease = Math.max(...voice.envelopes.map(e => e.releaseTime));
    voice.oscillators.forEach(osc => {
      try {
        osc.stop(now + maxRelease);
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
  }

  /**
   * Play a note
   */
  noteOn(noteNumber, velocity = 0.8) {
    if (!this.isInitialized) {
      console.warn('FM Synth not initialized, attempting to initialize...');
      this.initialize();
      return;
    }

    // Validate note number
    if (noteNumber < 0 || noteNumber > 127) {
      console.warn(`Invalid MIDI note number: ${noteNumber}`);
      return;
    }

    // Ensure velocity is in 0-1 range
    velocity = clamp(velocity, 0, 1);

    // Stop existing voice on this note (mono behavior per note)
    this.noteOff(noteNumber);

    // Handle polyphony limit
    if (this.activeVoices.size >= this.maxPolyphony) {
      // Stop oldest voice
      const firstKey = this.activeVoices.keys().next().value;
      this.noteOff(firstKey);
    }

    // Create and store new voice
    const voice = this.createVoice(noteNumber, velocity);
    if (voice) {
      this.activeVoices.set(noteNumber, voice);
    }
  }

  /**
   * Stop a note
   */
  noteOff(noteNumber) {
    const voice = this.activeVoices.get(noteNumber);
    if (voice) {
      this.releaseVoice(voice);
      this.activeVoices.delete(noteNumber);
    }
  }

  /**
   * Stop all notes
   */
  allNotesOff() {
    this.activeVoices.forEach((voice, noteNumber) => {
      this.releaseVoice(voice);
    });
    this.activeVoices.clear();
  }

  /**
   * Update synthesis parameters
   */
  updateParams(params) {
    if (params.algorithm !== undefined) {
      this.params.algorithm = clamp(params.algorithm, 1, 8);
    }

    if (params.operators) {
      params.operators.forEach((op, i) => {
        if (this.params.operators[i]) {
          Object.assign(this.params.operators[i], op);
        }
      });
    }

    if (params.masterVolume !== undefined && this.masterGain && this.audioContext) {
      this.params.masterVolume = clamp(params.masterVolume, 0, 1);
      this.masterGain.gain.setTargetAtTime(
        this.params.masterVolume,
        this.audioContext.currentTime,
        0.01
      );
    }

    if (params.feedback !== undefined) {
      this.params.feedback = clamp(params.feedback, 0, 1);
    }
  }

  /**
   * Get audio context state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      contextState: this.audioContext?.state || 'not created',
      activeVoices: this.activeVoices.size,
      maxPolyphony: this.maxPolyphony
    };
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    this.updateParams({ masterVolume: volume });
  }

  /**
   * Get master volume
   */
  getVolume() {
    return this.params.masterVolume;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.allNotesOff();

    if (this.compressor) {
      this.compressor.disconnect();
      this.compressor = null;
    }

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    console.log('FM Synthesis Engine disposed');
  }
}

// Export singleton instance
export default new FMSynthEngine();
