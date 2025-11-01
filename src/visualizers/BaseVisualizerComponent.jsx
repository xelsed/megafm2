/**
 * BaseVisualizerComponent.jsx
 * Base class for all visualizer components with standard cleanup logic
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Custom hook to properly dispose of Three.js resources on unmounting
 * @param {Function} setupFn - Function that sets up resources and returns them
 * @param {Array} dependencies - React effect dependencies array
 */
export const useThreeResources = (setupFn, dependencies = []) => {
  const resourcesRef = useRef(null);
  
  useEffect(() => {
    // Call setup function to create resources
    resourcesRef.current = setupFn();
    
    // Return cleanup function
    return () => {
      const resources = resourcesRef.current;
      if (!resources) return;
      
      console.log('Cleaning up Three.js resources');
      
      // Dispose of geometries
      if (resources.geometries) {
        resources.geometries.forEach(geometry => {
          if (geometry && typeof geometry.dispose === 'function') {
            geometry.dispose();
            console.log('Disposed geometry');
          }
        });
      }
      
      // Dispose of materials
      if (resources.materials) {
        resources.materials.forEach(material => {
          if (material && typeof material.dispose === 'function') {
            // Dispose of any textures as well
            if (material.map) material.map.dispose();
            if (material.lightMap) material.lightMap.dispose();
            if (material.bumpMap) material.bumpMap.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.specularMap) material.specularMap.dispose();
            if (material.envMap) material.envMap.dispose();
            
            material.dispose();
            console.log('Disposed material');
          }
        });
      }
      
      // Dispose of textures
      if (resources.textures) {
        resources.textures.forEach(texture => {
          if (texture && typeof texture.dispose === 'function') {
            texture.dispose();
            console.log('Disposed texture');
          }
        });
      }
      
      // Dispose of render targets
      if (resources.renderTargets) {
        resources.renderTargets.forEach(target => {
          if (target && typeof target.dispose === 'function') {
            target.dispose();
            console.log('Disposed render target');
          }
        });
      }
      
      // Cancel any animation frame
      if (resources.animationFrameId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(resources.animationFrameId);
        console.log('Cancelled animation frame');
      }
      
      // Remove any event listeners
      if (resources.eventListeners) {
        resources.eventListeners.forEach(({ target, type, listener }) => {
          if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, listener);
            console.log(`Removed ${type} event listener`);
          }
        });
      }
      
      // Call any custom cleanup functions
      if (resources.cleanupFunctions) {
        resources.cleanupFunctions.forEach(fn => {
          if (typeof fn === 'function') {
            fn();
          }
        });
      }
      
      // Clear the resources reference
      resourcesRef.current = null;
    };
  }, dependencies);
  
  return resourcesRef;
};

/**
 * Helper function to track event listeners for cleanup
 * @param {Object} resourcesRef - Reference to resources object 
 * @param {Element} target - Event target
 * @param {String} type - Event type
 * @param {Function} listener - Event listener
 */
export const addTrackedEventListener = (resourcesRef, target, type, listener) => {
  if (!resourcesRef.current) return;
  
  if (!resourcesRef.current.eventListeners) {
    resourcesRef.current.eventListeners = [];
  }
  
  // Track the event listener for cleanup
  resourcesRef.current.eventListeners.push({ target, type, listener });
  
  // Add the actual event listener
  target.addEventListener(type, listener);
};

/**
 * Helper function to track animation frame IDs for cleanup
 * @param {Object} resourcesRef - Reference to resources object
 * @param {Number} animationFrameId - ID returned by requestAnimationFrame
 */
export const trackAnimationFrame = (resourcesRef, animationFrameId) => {
  if (!resourcesRef.current) return;
  
  resourcesRef.current.animationFrameId = animationFrameId;
};

/**
 * Helper function to add a custom cleanup function
 * @param {Object} resourcesRef - Reference to resources object
 * @param {Function} cleanupFn - Custom cleanup function
 */
export const addCleanupFunction = (resourcesRef, cleanupFn) => {
  if (!resourcesRef.current) return;
  
  if (!resourcesRef.current.cleanupFunctions) {
    resourcesRef.current.cleanupFunctions = [];
  }
  
  resourcesRef.current.cleanupFunctions.push(cleanupFn);
};

export default {
  useThreeResources,
  addTrackedEventListener,
  trackAnimationFrame,
  addCleanupFunction
};
