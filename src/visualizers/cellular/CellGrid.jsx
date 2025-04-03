import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Trail } from '@react-three/drei';

/**
 * Renders the grid, glow effect, and floor for cellular automata
 * @param {object} props - Component properties
 * @param {object} props.dimensions - Grid dimensions {size, spacing, etc}
 * @param {object} props.colors - Color scheme
 * @param {string} props.perfLevel - Performance level (high, medium, low)
 * @param {function} props.onHover - Hover event handler
 */
export function CellGrid({ 
  dimensions,
  gridRef, 
  glowRef,
  colors,
  perfLevel,
  onHover = () => {} 
}) {
  const { size, spacing } = dimensions;
  
  return (
    <group ref={gridRef} rotation={[Math.PI / 2, 0, 0]}>
      {/* Glow effect */}
      <mesh 
        ref={glowRef}
        position={[0, 0, 0]}
        rotation={[Math.PI/2, 0, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover({
            type: 'Glow Effect',
            object: e.object.type || 'Mesh',
            material: e.object.material.type || 'MeshBasicMaterial',
            size: `${(size * spacing * 2).toFixed(1)} x ${(size * spacing * 2).toFixed(1)}`
          });
        }}
        onPointerLeave={() => onHover(null)}
      >
        <planeGeometry args={[size * spacing * 2, size * spacing * 2]} />
        <meshBasicMaterial 
          color={0x224466} 
          transparent={true} 
          opacity={0.3} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Floor plane */}
      <mesh 
        position={[0, 0, -0.005]}
        rotation={[Math.PI/2, 0, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover({
            type: 'Floor Plane',
            object: e.object.type || 'Mesh',
            material: e.object.material.type || 'MeshBasicMaterial',
            size: `${(size * spacing * 1.5).toFixed(1)} x ${(size * spacing * 1.5).toFixed(1)}`
          });
        }}
        onPointerLeave={() => onHover(null)}
      >
        <planeGeometry args={[size * spacing * 1.5, size * spacing * 1.5]} />
        <meshBasicMaterial 
          color={colors.background || "#142440"}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

/**
 * Renders a single cellular automaton cell
 * @param {object} props - Component properties
 * @param {object} props.cell - Cell data
 * @param {string} props.perfLevel - Performance level
 * @param {object} props.colors - Color scheme
 * @param {function} props.onHover - Hover handler
 * @param {function} props.onClick - Click handler
 */
export function Cell({
  cell,
  index,
  cellGeometry,
  perfLevel,
  colors,
  cellRef,
  trailRef,
  onHover,
  onClick,
  state = 'inactive',
  isActive = false,
  showTrail = false
}) {
  return (
    <group key={`cell-container-${index}`}>
      {/* Main cell cube */}
      <mesh
        key={`cell-${index}`}
        ref={cellRef}
        position={[...cell.position]}
        userData={{
          active: isActive,
          generationsAlive: cell.generationsAlive || 0,
          birthTimestamp: cell.birthTimestamp || 0,
          lastActiveTimestamp: cell.lastActiveTimestamp || 0,
          perfLevel,
          cellIndex: index,
          coords: cell.coords
        }}
        onClick={() => onClick && onClick(cell, index)}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover && onHover({
            type: 'Cell',
            coords: `[${cell.coords[0]}, ${cell.coords[1]}]`,
            state: state || 'inactive',
            index: index,
            object: e.object.type || 'Mesh'
          });
        }}
        onPointerLeave={() => onHover && onHover(null)}
      >
        <primitive object={cellGeometry} />
        <meshStandardMaterial
          key={`mat-${index}-${perfLevel}`}
          color={colors.inactive}
          metalness={0.5}
          roughness={0.2}
          emissive={colors.inactive}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
          onUpdate={(self) => {
            // Force visibility on material creation
            if (self && self.parent) {
              // Force visibility
              self.parent.visible = true;
              
              // Set appropriate height 
              const minHeight = 0.3;
              self.parent.scale.y = Math.max(minHeight, self.parent.scale.y || 0);
              self.parent.position.y = self.parent.scale.y / 2;
              
              // Set initial color based on position
              if (typeof index === 'number' && index >= 0 && cell.coords) {
                const [x, y] = cell.coords;
                const hue = ((x * 3 + y * 7) % 20) / 60;
                const color = new THREE.Color().setHSL(hue, 0.3, 0.3);
                
                self.color.copy(color);
                self.emissive.copy(color).multiplyScalar(0.3);
              }
            }
          }}
        />
      </mesh>
      
      {/* Optional trail effect */}
      {perfLevel === 'high' && (
        <Trail
          ref={trailRef}
          width={0.2}
          length={8}
          color={colors.birth.getHex()}
          attenuation={(t) => t * t}
          visible={showTrail}
        >
          <mesh
            position={[
              cell.position[0], 
              cell.position[1] + 0.2, 
              cell.position[2]
            ]}
            scale={0.1}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onHover && onHover({
                type: 'Trail Particle',
                coords: `[${cell.coords[0]}, ${cell.coords[1]}]`,
                cellIndex: index,
                object: e.object.type || 'Mesh',
                geometry: 'SphereGeometry'
              });
            }}
            onPointerLeave={() => onHover && onHover(null)}
          >
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial color={colors.birth.getHex()} transparent opacity={0.6} />
          </mesh>
        </Trail>
      )}
    </group>
  );
}