import React from 'react';
import { Billboard, Text } from '@react-three/drei';

/**
 * Tooltip component that follows the camera and displays object info
 * @param {object} props - Component properties
 * @param {object} props.info - Information to display (key-value pairs)
 * @param {Array} props.position - 3D position [x, y, z]
 */
export function HoverTooltip({ info, position = [0, 3, 0] }) {
  if (!info) return null;
  
  return (
    <Billboard follow={true} position={position}>
      <group>
        {/* Background panel */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[3.5, 1.5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        </mesh>
        
        {/* Title */}
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
          maxWidth={3}
        >
          {info.type}
        </Text>
        
        {/* Properties */}
        <Text
          position={[0, 0, 0]}
          fontSize={0.15}
          color="#aaffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
        >
          {Object.entries(info)
            .filter(([key]) => key !== 'type')
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')}
        </Text>
      </group>
    </Billboard>
  );
}