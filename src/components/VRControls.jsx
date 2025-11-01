/**
 * VR Controls Component
 * Interactive 3D UI panel for controlling the music generator in VR
 */

import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Text } from '@react-three/drei';
import { useXRStore } from '@react-three/xr';
import { setPlaying, setCurrentAlgorithm } from '../state/algorithmSlice';

const VRControls = () => {
  const dispatch = useDispatch();
  const isPresenting = useXRStore((state) => state !== null);

  const currentAlgorithm = useSelector(state => state.algorithm.currentAlgorithm);
  const isPlaying = useSelector(state => state.algorithm.isPlaying);
  const tempo = useSelector(state => state.algorithm.tempo);

  // Don't render in non-VR mode
  if (!isPresenting) return null;

  const algorithms = [
    'fractal',
    'euclidean',
    'cellular',
    'sequential',
    'waveshaper',
    'ruleBasedHarmony'
  ];

  const handlePlayPause = () => {
    dispatch(setPlaying(!isPlaying));
  };

  const handleAlgorithmChange = () => {
    const currentIndex = algorithms.indexOf(currentAlgorithm);
    const nextIndex = (currentIndex + 1) % algorithms.length;
    dispatch(setCurrentAlgorithm(algorithms[nextIndex]));
  };

  return (
    <group position={[0, 1.5, -2]}>
      {/* Background panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2, 1.5]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        MEGAfm VR Controls
      </Text>

      {/* Play/Pause Button */}
      <group position={[-0.5, 0.2, 0]} onClick={handlePlayPause}>
        <mesh>
          <boxGeometry args={[0.3, 0.15, 0.05]} />
          <meshStandardMaterial
            color={isPlaying ? '#4CAF50' : '#f44336'}
          />
        </mesh>
        <Text
          position={[0, 0, 0.03]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </Text>
      </group>

      {/* Algorithm Selector Button */}
      <group position={[0.5, 0.2, 0]} onClick={handleAlgorithmChange}>
        <mesh>
          <boxGeometry args={[0.5, 0.15, 0.05]} />
          <meshStandardMaterial color="#2196F3" />
        </mesh>
        <Text
          position={[0, 0, 0.03]}
          fontSize={0.05}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ALGORITHM
        </Text>
      </group>

      {/* Current Algorithm Display */}
      <Text
        position={[0, -0.1, 0]}
        fontSize={0.07}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
      >
        {currentAlgorithm}
      </Text>

      {/* Tempo Display */}
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.06}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Tempo: {tempo} BPM
      </Text>

      {/* Instructions */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.04}
        color="#aaaaaa"
        anchorX="center"
        anchorY="middle"
      >
        Point and trigger to interact
      </Text>
    </group>
  );
};

export default VRControls;
