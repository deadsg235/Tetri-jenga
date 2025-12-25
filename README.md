# Tetri-Jenga

A groundbreaking 3D game that combines the strategic stacking of Jenga with the fast-paced puzzle mechanics of Tetris.

## Game Mechanics

- **3D Tetris Pieces**: Classic Tetris shapes fall in 3D space
- **Jenga Physics**: Unstable towers collapse realistically
- **Line Clearing**: Complete layers disappear like Tetris
- **Stability System**: Poor stacking leads to tower collapse

## Controls

- **WASD**: Move falling piece
- **Q/E**: Rotate piece
- **Space**: Hard drop
- **R**: Restart (when game over)

## Features

- Real-time 3D physics simulation
- Dynamic lighting and shadows
- Progressive difficulty
- Score system with line clearing bonuses
- Responsive design for all devices

## Deployment

### Local Development
```bash
python -m http.server 3000
```

### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`

Or connect your GitHub repo to Vercel for automatic deployments.

## Technology Stack

- **Three.js**: 3D graphics and physics
- **HTML5 Canvas**: Rendering
- **Vanilla JavaScript**: Game logic
- **Vercel**: Hosting and deployment

## Game Innovation

Tetri-Jenga introduces a unique stability mechanic where:
- Pieces must be carefully balanced
- Overhanging blocks increase instability
- Complete layers clear like Tetris
- Tower collapse ends the game

This creates a perfect blend of strategic planning (Jenga) and quick reflexes (Tetris).