/**
 * Audio Utility Functions
 * Common audio-related helper functions
 */

import { MIDI_CONFIG } from '../config/constants';

/**
 * Convert MIDI note number to frequency in Hz
 * @param {number} noteNumber - MIDI note number (0-127)
 * @returns {number} Frequency in Hz
 */
export function midiToFrequency(noteNumber) {
  return 440 * Math.pow(2, (noteNumber - MIDI_CONFIG.A440) / 12);
}

/**
 * Convert frequency to MIDI note number
 * @param {number} frequency - Frequency in Hz
 * @returns {number} MIDI note number
 */
export function frequencyToMidi(frequency) {
  return Math.round(12 * Math.log2(frequency / 440) + MIDI_CONFIG.A440);
}

/**
 * Get note name from MIDI note number
 * @param {number} noteNumber - MIDI note number (0-127)
 * @returns {string} Note name with octave (e.g., "C4", "F#5")
 */
export function midiToNoteName(noteNumber) {
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = MIDI_CONFIG.NOTE_NAMES[noteNumber % 12];
  return `${noteName}${octave}`;
}

/**
 * Normalize MIDI velocity (0-127) to audio gain (0-1)
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} Normalized gain (0-1)
 */
export function normalizeVelocity(velocity) {
  return Math.max(0, Math.min(1, velocity / 127));
}

/**
 * Convert audio gain (0-1) to MIDI velocity (0-127)
 * @param {number} gain - Audio gain (0-1)
 * @returns {number} MIDI velocity (0-127)
 */
export function gainToVelocity(gain) {
  return Math.round(Math.max(0, Math.min(127, gain * 127)));
}

/**
 * Apply velocity curve for more natural dynamics
 * @param {number} velocity - Input velocity (0-1)
 * @param {number} curve - Curve amount (-1 to 1, 0 = linear)
 * @returns {number} Curved velocity (0-1)
 */
export function applyVelocityCurve(velocity, curve = 0) {
  if (curve === 0) return velocity;

  if (curve > 0) {
    // Exponential curve (harder playing feels more dynamic)
    return Math.pow(velocity, 1 - curve);
  } else {
    // Logarithmic curve (softer playing more controlled)
    return 1 - Math.pow(1 - velocity, 1 + curve);
  }
}

/**
 * Convert tempo (BPM) to note interval (ms)
 * @param {number} bpm - Beats per minute
 * @param {number} subdivision - Note subdivision (1 = quarter, 2 = eighth, 4 = sixteenth)
 * @returns {number} Interval in milliseconds
 */
export function bpmToMs(bpm, subdivision = 1) {
  return (60000 / bpm) / subdivision;
}

/**
 * Convert note interval (ms) to tempo (BPM)
 * @param {number} ms - Interval in milliseconds
 * @param {number} subdivision - Note subdivision
 * @returns {number} Beats per minute
 */
export function msToBpm(ms, subdivision = 1) {
  return (60000 / ms) * subdivision;
}

/**
 * Create ADSR envelope gain curve
 * @param {AudioParam} param - Audio parameter to modulate
 * @param {number} startTime - Start time in audio context time
 * @param {object} envelope - ADSR values {attack, decay, sustain, release}
 * @param {number} peakValue - Peak gain value
 */
export function applyADSR(param, startTime, envelope, peakValue = 1) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.3 } = envelope;

  // Attack
  param.setValueAtTime(0, startTime);
  param.linearRampToValueAtTime(peakValue, startTime + attack);

  // Decay to Sustain
  param.linearRampToValueAtTime(
    peakValue * sustain,
    startTime + attack + decay
  );

  return {
    sustainLevel: peakValue * sustain,
    releaseTime: release
  };
}

/**
 * Release ADSR envelope
 * @param {AudioParam} param - Audio parameter to modulate
 * @param {number} releaseStartTime - Time to start release
 * @param {number} releaseTime - Release duration
 */
export function releaseADSR(param, releaseStartTime, releaseTime) {
  param.cancelScheduledValues(releaseStartTime);
  param.setValueAtTime(param.value, releaseStartTime);
  param.linearRampToValueAtTime(0, releaseStartTime + releaseTime);
}

/**
 * Check if browser supports Web Audio API
 * @returns {boolean} True if supported
 */
export function supportsWebAudio() {
  return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
}

/**
 * Check if browser supports Web MIDI API
 * @returns {boolean} True if supported
 */
export function supportsWebMIDI() {
  return typeof navigator.requestMIDIAccess === 'function';
}

/**
 * Create an audio context with proper compatibility
 * @returns {AudioContext|null} Audio context or null if not supported
 */
export function createAudioContext() {
  if (!supportsWebAudio()) {
    console.error('Web Audio API not supported');
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass();
}

/**
 * Resume audio context if suspended (required for iOS/Android)
 * @param {AudioContext} audioContext - Audio context to resume
 * @returns {Promise<void>}
 */
export async function resumeAudioContext(audioContext) {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
    console.log('Audio context resumed');
  }
}

/**
 * Detect optimal audio buffer size for platform
 * @returns {number} Buffer size in samples
 */
export function getOptimalBufferSize() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile ? 4096 : 2048;
}

/**
 * Convert linear gain to decibels
 * @param {number} gain - Linear gain (0-1)
 * @returns {number} Decibels
 */
export function gainToDb(gain) {
  return 20 * Math.log10(Math.max(0.0001, gain));
}

/**
 * Convert decibels to linear gain
 * @param {number} db - Decibels
 * @returns {number} Linear gain
 */
export function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation amount (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export default {
  midiToFrequency,
  frequencyToMidi,
  midiToNoteName,
  normalizeVelocity,
  gainToVelocity,
  applyVelocityCurve,
  bpmToMs,
  msToBpm,
  applyADSR,
  releaseADSR,
  supportsWebAudio,
  supportsWebMIDI,
  createAudioContext,
  resumeAudioContext,
  getOptimalBufferSize,
  gainToDb,
  dbToGain,
  clamp,
  lerp
};
