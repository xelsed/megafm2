# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run tests (placeholder, no actual tests yet)
- `npm run dev -- --host` - Start dev server accessible on local network

## Code Style Guidelines
- **Imports**: React/core imports first, Redux imports next, custom modules last
- **Components**: Use function declarations with PascalCase naming
- **Functions**: Use camelCase for functions and variables
- **Constants**: Use UPPER_SNAKE_CASE for constants
- **Types**: Use JSDoc comments for type documentation
- **Error Handling**: Use try/catch around MIDI operations with console.error
- **State Management**: Use Redux Toolkit slices organized by feature
- **Cleanup**: Always clean up event listeners, timers, and animation frames in useEffect returns
- **MIDI**: Explicitly stop MIDI notes when components unmount
- **JSX**: Format with proper indentation, align props when spanning multiple lines
- **Performance**: Use React.memo for complex components that render frequently

## Project Structure
- `/algorithms` - Music generation algorithms
- `/components` - UI components
- `/midi` - MIDI connection utilities 
- `/state` - Redux state management (slices organized by feature)
- `/visualizers` - Visual representations
  - `/visualizers/cellular` - Modular components for cellular visualizer

## Component Guidelines
- Use modular structure for complex visualizers
- Split large components into smaller, focused ones
- Extract utility functions to separate files
- Maintain performance optimizations for different device capabilities
- ThreeJS components should follow react-three/fiber patterns

## Visualizer Architecture
- Base visualizer components handle core 3D setup and rendering
- Specialized visualizers (like CellularVisualizer) handle specific visualization modes
- Shared utilities in `/visualizers/cellular` folder:
  - `CellMaterial.jsx` - Cell appearance and transitions
  - `CellGrid.jsx` - Grid layout and floor/glow effects
  - `HoverTooltip.jsx` - Interactive information tooltips
  - `CellularUtils.js` - Helper functions for cellular automata