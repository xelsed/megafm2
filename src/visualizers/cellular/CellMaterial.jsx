import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Creates a material for cellular automata cells with animation and state-based coloring
 * @param {object} props - Component properties
 * @param {string} props.state - Cell state (active, birth, harmony, death, etc)
 * @param {object} props.colors - Color scheme object
 * @param {number} props.age - Cell age in generations
 * @param {string} props.perfLevel - Performance level (high, medium, low)
 * @param {number} props.intensity - Emission intensity
 */
export function CellMaterial({ 
  state = 'inactive', 
  colors, 
  age = 0, 
  perfLevel = 'medium',
  intensity = 0.5,
  position = [0, 0, 0],
  index,
  onUpdate
}) {
  // Base color keyed by state
  const getBaseColor = () => {
    return colors[state] || colors.inactive;
  };

  // Age-based color calculation  
  const getAgeColor = () => {
    const baseColor = getBaseColor();
    const color = new THREE.Color();
    
    if (age <= 1) {
      // New cells get the standard color
      color.copy(baseColor);
      return color;
    }
    
    // Map generations alive (1-10) to a color gradient
    const hueShift = (age - 1) / 9; // 0-1 range for generations 1-10
    
    if (perfLevel === 'high') {
      // More complex coloring for high performance mode
      switch (state) {
        case 'birth':
          // Birth cells shift from green to yellow to red
          color.setHSL(0.35 - (hueShift * 0.35), 0.8, 0.6);
          break;
        case 'harmony':
          // Harmony cells shift from purple to pink to orange
          color.setHSL(0.75 - (hueShift * 0.25), 0.7, 0.6);
          break;
        case 'stable':
          // Stable cells shift from teal to blue to purple
          color.setHSL(0.5 - (hueShift * 0.25), 0.7, 0.5);
          break;
        default: // 'active'
          // Active cells shift from blue to cyan to lime
          color.setHSL(0.6 - (hueShift * 0.3), 0.7, 0.5 + (hueShift * 0.2));
      }
    } else {
      // Simpler version for medium/low performance
      const baseHue = {
        birth: 0.3, // Green
        harmony: 0.8, // Purple
        stable: 0.5, // Teal
        active: 0.6,  // Blue
        inactive: 0.2 // Dark blue
      }[state] || 0.6;
      
      const resultHue = baseHue - (hueShift * 0.3);
      color.setHSL(resultHue, 0.7, 0.5 + (hueShift * 0.2));
    }
    
    return color;
  };
  
  // Calculate emission intensity based on age
  const getEmissionIntensity = () => {
    return intensity + (Math.min(1, age / 10) * 0.3);
  };
  
  return (
    <meshStandardMaterial
      key={`cell-mat-${index}-${perfLevel}`}
      color={getBaseColor()}
      metalness={0.5}
      roughness={0.2}
      emissive={getBaseColor()}
      emissiveIntensity={getEmissionIntensity()}
      transparent
      opacity={0.9}
      onUpdate={onUpdate}
    />
  );
}