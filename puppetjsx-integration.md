# PuppetJSX Integration Guide

A comprehensive guide for integrating the PuppetJSX skeletal animation system into your React projects.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Component Architecture](#component-architecture)
5. [Customizing the Skeleton](#customizing-the-skeleton)
6. [Adding Custom Parts](#adding-custom-parts)
7. [Creating Custom Animations](#creating-custom-animations)
8. [Exporting for Game Engines](#exporting-for-game-engines)
9. [Runtime Integration](#runtime-integration)
10. [API Reference](#api-reference)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before integrating PuppetJSX, ensure you have:

- **Node.js** 16.x or higher
- **React** 18.x or higher
- **npm** or **yarn** package manager
- Basic understanding of React hooks and context

### Required Dependencies

```bash
npm install react react-dom lucide-react
```

Or with yarn:

```bash
yarn add react react-dom lucide-react
```

---

## Installation

### Option 1: Direct File Copy

1. Copy `PuppetJSX.jsx` into your project's components directory:

```
src/
├── components/
│   └── PuppetJSX/
│       └── PuppetJSX.jsx
```

2. Import and use in your application:

```jsx
import PuppetJSX from './components/PuppetJSX/PuppetJSX';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PuppetJSX />
    </div>
  );
}
```

### Option 2: As a Standalone Tool

Use the provided `demo.html` file to run PuppetJSX without any build process:

```bash
# Simply open demo.html in your browser
open demo.html
```

---

## Basic Integration

### Minimal Setup

```jsx
import React from 'react';
import PuppetJSX from './PuppetJSX';

function CharacterEditor() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PuppetJSX />
    </div>
  );
}

export default CharacterEditor;
```

### With Custom Initial Data

To start with pre-configured characters or animations, modify the default data constants at the top of the component:

```jsx
// In PuppetJSX.jsx, find and modify:

const defaultCharacter = {
  id: 'char_custom',
  name: 'My Custom Character',
  skeletonId: 'humanoid_skeleton',
  parts: {
    head: 'head_knight',      // Use knight helmet
    torso: 'torso_armor',     // Use plate armor
    arm_left: 'arm_armor',
    arm_right: 'arm_armor',
    hand_left: 'hand_glove',
    hand_right: 'weapon_sword',
    leg_left: 'leg_armor',
    leg_right: 'leg_armor',
    foot_left: 'foot_boot',
    foot_right: 'foot_boot'
  }
};
```

---

## Component Architecture

PuppetJSX is organized into several logical sections:

### Core Engines

| Module | Purpose |
|--------|---------|
| **Math Utilities** | Linear interpolation, angle normalization, degree/radian conversion |
| **Skeleton Engine** | Transform calculations, world space computation, hierarchy traversal |
| **Animation Engine** | Frame interpolation, timing, playback control |

### UI Components

```
PuppetJSX (Main)
├── Toolbar
├── CharacterBuilder
│   ├── PartsLibrary
│   ├── CanvasViewport
│   └── CharacterProperties
├── AnimationEditor
│   ├── AnimationList
│   ├── CanvasViewport
│   ├── AnimationTimeline
│   └── TransformEditor
├── ExportDialog
└── ImportDialog
```

### State Management

All state is managed via React Context (`ProjectContext`):

```jsx
const contextValue = {
  // Data
  skeleton,           // Bone hierarchy definition
  partsLibrary,       // Available body parts
  characters,         // All saved characters
  currentCharacter,   // Active character being edited
  animations,         // All saved animations
  currentAnimation,   // Active animation being edited
  
  // UI State
  mode,               // 'builder' or 'animator'
  selectedBoneId,     // Currently selected bone
  currentFrame,       // Active keyframe (0-3)
  isPlaying,          // Animation playback state
  playbackSpeed,      // Playback multiplier (0.1 - 2.0)
  
  // Canvas State
  zoom,               // Canvas zoom level
  pan,                // Canvas pan offset { x, y }
  showGrid,           // Grid visibility toggle
  showBones,          // Bone gizmo visibility
  
  // Actions (functions)
  assignPartToBone,
  removePartFromBone,
  updateBoneTransform,
  generateRandomCharacter,
  exportCharacter,
  exportAnimation,
  importData,
  // ... and more
};
```

---

## Customizing the Skeleton

### Default Humanoid Skeleton

The default skeleton provides a standard humanoid structure:

```
root (origin)
└── torso
    ├── head
    ├── arm_left
    │   └── hand_left
    ├── arm_right
    │   └── hand_right
    ├── leg_left
    │   └── foot_left
    └── leg_right
        └── foot_right
```

### Adding New Bones

To add additional bones (e.g., a tail or wings):

```javascript
const customSkeleton = {
  id: 'winged_humanoid',
  name: 'Winged Humanoid',
  bones: {
    // ... existing bones ...
    
    wing_left: {
      id: 'wing_left',
      parent: 'torso',
      localTransform: { 
        position: { x: -20, y: -15 }, 
        rotation: -30, 
        scale: { x: 1, y: 1 } 
      },
      zIndex: 1,  // Behind body
      children: []
    },
    wing_right: {
      id: 'wing_right',
      parent: 'torso',
      localTransform: { 
        position: { x: 20, y: -15 }, 
        rotation: 30, 
        scale: { x: 1, y: 1 } 
      },
      zIndex: 9,  // In front of body
      children: []
    }
  }
};
```

### Creating a Quadruped Skeleton

```javascript
const quadrupedSkeleton = {
  id: 'quadruped_skeleton',
  name: 'Quadruped',
  bones: {
    root: {
      id: 'root',
      parent: null,
      localTransform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 0,
      children: ['body']
    },
    body: {
      id: 'body',
      parent: 'root',
      localTransform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 5,
      children: ['head', 'front_leg_left', 'front_leg_right', 'back_leg_left', 'back_leg_right', 'tail']
    },
    head: {
      id: 'head',
      parent: 'body',
      localTransform: { position: { x: -30, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 10,
      children: []
    },
    // ... additional legs, tail, etc.
  }
};
```

---

## Adding Custom Parts

### Part Data Structure

Each part requires these properties:

```javascript
{
  id: 'unique_part_id',        // Unique identifier
  name: 'Display Name',         // Human-readable name
  category: 'head',            // Category for filtering
  width: 24,                   // Base width in pixels
  height: 24,                  // Base height in pixels
  color: '#FFD4B8',            // Render color (for placeholder)
  offset: { x: 0, y: 0 },      // Offset from bone position
  zIndexModifier: 0            // Added to bone's z-index
}
```

### Adding Parts to the Library

```javascript
const customParts = [
  ...defaultParts,
  
  // Add custom dragon head
  {
    id: 'head_dragon',
    name: 'Dragon Head',
    category: 'head',
    width: 32,
    height: 28,
    color: '#2D5A3D',
    offset: { x: 0, y: -4 },
    zIndexModifier: 0
  },
  
  // Add flame weapon
  {
    id: 'weapon_flame',
    name: 'Flame Sword',
    category: 'weapon',
    width: 10,
    height: 40,
    color: '#FF6B35',
    offset: { x: 0, y: -12 },
    zIndexModifier: 3
  }
];
```

### Using Image Assets Instead of Colors

To render actual images instead of colored shapes, modify the `CanvasViewport` rendering logic:

```javascript
// In the render loop, replace the shape drawing with:
const img = new Image();
img.src = item.part.imageUrl;  // Add imageUrl to part data

if (img.complete) {
  ctx.drawImage(img, -w/2, -h/2, w, h);
} else {
  // Fallback to color rectangle while loading
  ctx.fillStyle = item.part.color;
  ctx.fillRect(-w/2, -h/2, w, h);
}
```

---

## Creating Custom Animations

### Animation Data Structure

```javascript
{
  id: 'anim_jump',
  name: 'Jump',
  skeletonId: 'humanoid_skeleton',
  loop: false,  // Don't loop jump animation
  frames: [
    {
      index: 0,
      duration: 80,  // Anticipation (crouch)
      bones: {
        torso: { position: { x: 0, y: -15 }, rotation: 0, scale: { x: 1, y: 0.9 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: 20, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: 20, scale: { x: 1, y: 1 } }
      }
    },
    {
      index: 1,
      duration: 100,  // Launch
      bones: {
        torso: { position: { x: 0, y: -40 }, rotation: 0, scale: { x: 1, y: 1.1 } },
        arm_left: { position: { x: -15, y: -10 }, rotation: -45, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: -45, scale: { x: 1, y: 1 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: -15, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: -15, scale: { x: 1, y: 1 } }
      }
    },
    {
      index: 2,
      duration: 120,  // Peak
      bones: {
        torso: { position: { x: 0, y: -50 }, rotation: 0, scale: { x: 1, y: 1 } },
        arm_left: { position: { x: -15, y: -10 }, rotation: -60, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: -60, scale: { x: 1, y: 1 } }
      }
    },
    {
      index: 3,
      duration: 100,  // Landing
      bones: {
        torso: { position: { x: 0, y: -18 }, rotation: 0, scale: { x: 1, y: 0.95 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: 15, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: 15, scale: { x: 1, y: 1 } }
      }
    }
  ]
}
```

### Animation Timing Guidelines

| Animation Type | Frame Duration | Notes |
|---------------|----------------|-------|
| Idle breathing | 150-200ms | Slow, subtle movement |
| Walk cycle | 80-120ms | Medium pace |
| Run cycle | 60-80ms | Fast, dynamic |
| Attack | 60-100ms | Fast windup, slower follow-through |
| Death | 100-200ms | Dramatic timing |

---

## Exporting for Game Engines

### Exported Character JSON

```json
{
  "version": "1.0",
  "type": "character",
  "data": {
    "id": "char_hero",
    "name": "Hero",
    "skeletonId": "humanoid_skeleton",
    "parts": {
      "head": "head_basic",
      "torso": "torso_basic",
      "arm_left": "arm_basic",
      "arm_right": "arm_basic",
      "hand_left": "hand_basic",
      "hand_right": "weapon_sword",
      "leg_left": "leg_basic",
      "leg_right": "leg_basic",
      "foot_left": "foot_basic",
      "foot_right": "foot_basic"
    }
  }
}
```

### Exported Animation JSON

```json
{
  "version": "1.0",
  "type": "animation",
  "data": {
    "id": "anim_walk",
    "name": "Walk Cycle",
    "skeletonId": "humanoid_skeleton",
    "loop": true,
    "frames": [
      {
        "index": 0,
        "duration": 100,
        "bones": {
          "torso": { "position": { "x": 0, "y": -20 }, "rotation": 0, "scale": { "x": 1, "y": 1 } },
          "arm_left": { "position": { "x": -15, "y": -10 }, "rotation": -20, "scale": { "x": 1, "y": 1 } }
        }
      }
    ]
  }
}
```

---

## Runtime Integration

### Standalone Runtime Class

Use this class in your game engine to play exported animations:

```javascript
class PuppetCharacter {
  constructor(characterJSON, skeletonJSON, animationJSON, partsImages) {
    this.character = characterJSON.data;
    this.skeleton = skeletonJSON;
    this.animation = animationJSON.data;
    this.parts = partsImages;  // { partId: HTMLImageElement }
    this.currentTime = 0;
    this.isPlaying = true;
  }
  
  update(deltaTime) {
    if (!this.isPlaying) return;
    
    this.currentTime += deltaTime;
    
    const totalDuration = this.animation.frames.reduce((sum, f) => sum + f.duration, 0);
    
    if (this.currentTime >= totalDuration) {
      if (this.animation.loop) {
        this.currentTime = this.currentTime % totalDuration;
      } else {
        this.currentTime = totalDuration;
        this.isPlaying = false;
      }
    }
  }
  
  getCurrentFrameData() {
    let accumulatedTime = 0;
    
    for (let i = 0; i < this.animation.frames.length; i++) {
      const frame = this.animation.frames[i];
      const frameEndTime = accumulatedTime + frame.duration;
      
      if (this.currentTime < frameEndTime) {
        const nextIndex = (i + 1) % this.animation.frames.length;
        const progress = (this.currentTime - accumulatedTime) / frame.duration;
        
        return {
          currentFrame: frame,
          nextFrame: this.animation.frames[nextIndex],
          progress
        };
      }
      
      accumulatedTime = frameEndTime;
    }
    
    return {
      currentFrame: this.animation.frames[0],
      nextFrame: this.animation.frames[1] || this.animation.frames[0],
      progress: 0
    };
  }
  
  render(ctx, x, y, scale = 1) {
    const frameData = this.getCurrentFrameData();
    const transforms = this.interpolateAndCalculateTransforms(frameData);
    
    // Build render list sorted by z-index
    const renderList = [];
    
    for (const [boneId, partId] of Object.entries(this.character.parts)) {
      const part = this.parts[partId];
      if (!part) continue;
      
      const bone = this.skeleton.bones[boneId];
      const worldTransform = transforms[boneId];
      
      renderList.push({
        image: part.image,
        x: worldTransform.position.x + part.offset.x,
        y: worldTransform.position.y + part.offset.y,
        rotation: worldTransform.rotation,
        scale: worldTransform.scale,
        zIndex: bone.zIndex + part.zIndexModifier
      });
    }
    
    renderList.sort((a, b) => a.zIndex - b.zIndex);
    
    // Render
    for (const item of renderList) {
      ctx.save();
      ctx.translate(x + item.x * scale, y + item.y * scale);
      ctx.rotate(item.rotation * Math.PI / 180);
      ctx.scale(item.scale.x, item.scale.y);
      ctx.drawImage(item.image, -item.image.width/2, -item.image.height/2);
      ctx.restore();
    }
  }
  
  playAnimation(animationJSON) {
    this.animation = animationJSON.data;
    this.currentTime = 0;
    this.isPlaying = true;
  }
  
  stop() {
    this.isPlaying = false;
  }
}
```

### Usage in Game Loop

```javascript
// Initialize
const hero = new PuppetCharacter(characterJSON, skeletonJSON, walkAnimJSON, loadedParts);

// Game loop
function gameLoop(deltaTime) {
  // Update
  hero.update(deltaTime);
  
  // Render
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hero.render(ctx, canvas.width/2, canvas.height/2, 2);
  
  requestAnimationFrame(() => gameLoop(performance.now() - lastTime));
}
```

---

## API Reference

### Context Values

| Property | Type | Description |
|----------|------|-------------|
| `skeleton` | Object | Current skeleton definition |
| `partsLibrary` | Array | All available parts |
| `currentCharacter` | Object | Currently edited character |
| `currentAnimation` | Object | Currently edited animation |
| `selectedBoneId` | String | ID of selected bone |
| `currentFrame` | Number | Active keyframe index (0-3) |
| `isPlaying` | Boolean | Animation playback state |
| `zoom` | Number | Canvas zoom level |

### Context Actions

| Function | Parameters | Description |
|----------|------------|-------------|
| `assignPartToBone` | (boneId, partId) | Assign a part to a bone |
| `removePartFromBone` | (boneId) | Remove part from bone |
| `updateBoneTransform` | (boneId, transform) | Update bone transform in current frame |
| `goToFrame` | (frameIndex) | Jump to specific keyframe |
| `createNewAnimation` | (name) | Create new animation |
| `deleteAnimation` | (animId) | Delete animation |
| `copyFrame` | () | Copy current frame data |
| `pasteFrame` | (copiedData) | Paste frame data |
| `mirrorFrame` | () | Mirror left/right bones |
| `resetBone` | (boneId) | Reset bone to default |
| `resetAllBones` | () | Reset all bones in frame |
| `generateRandomCharacter` | () | Generate random character |
| `exportCharacter` | () | Export character JSON |
| `exportAnimation` | () | Export animation JSON |
| `importData` | (jsonString) | Import character or animation |

---

## Performance Optimization

### Canvas Rendering

1. **Batch operations**: The render loop already batches all draw calls
2. **Transform caching**: World transforms are memoized with `useMemo`
3. **Avoid re-renders**: Use `useCallback` for all action handlers

### For Multiple Characters

```javascript
// Cache world transforms
const transformCache = new Map();

function getWorldTransforms(skeleton, animation, time) {
  const key = `${skeleton.id}-${animation.id}-${Math.floor(time / 16)}`;
  
  if (transformCache.has(key)) {
    return transformCache.get(key);
  }
  
  const transforms = calculateAllWorldTransforms(skeleton, animation, time);
  transformCache.set(key, transforms);
  
  // Clear old entries
  if (transformCache.size > 100) {
    const firstKey = transformCache.keys().next().value;
    transformCache.delete(firstKey);
  }
  
  return transforms;
}
```

### Image Loading

```javascript
// Preload all part images
async function preloadParts(partsLibrary) {
  const loadPromises = partsLibrary.map(part => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ id: part.id, image: img });
      img.onerror = reject;
      img.src = part.imageUrl;
    });
  });
  
  const loaded = await Promise.all(loadPromises);
  return Object.fromEntries(loaded.map(p => [p.id, p.image]));
}
```

---

## Troubleshooting

### Common Issues

**Parts not appearing:**
- Check that `partId` in character matches `id` in parts library
- Verify z-index values (lower renders behind higher)
- Ensure bone exists in skeleton

**Animation not playing:**
- Verify `loop` is `true` for continuous animations
- Check frame durations are not zero
- Ensure animation `skeletonId` matches skeleton

**Transform issues:**
- World transforms cascade from parent to child
- Rotation is in degrees (-180 to 180)
- Scale of 0 will make parts invisible

**Canvas blank:**
- Check container has explicit width/height
- Verify zoom is not 0
- Ensure parts have non-zero dimensions

### Debug Mode

Add this to your component for debugging:

```javascript
useEffect(() => {
  console.log('Current Character:', currentCharacter);
  console.log('World Transforms:', worldTransforms);
  console.log('Render List:', renderList);
}, [currentCharacter, worldTransforms]);
```

---

## Next Steps

1. **Add more skeletons**: Create quadruped, flying, or mechanical skeletons
2. **Extend frame count**: Modify to support 8, 12, or 16 frames
3. **Add easing**: Implement bezier curve interpolation
4. **IK support**: Add inverse kinematics for natural posing
5. **Sprite atlas export**: Generate optimized sprite sheets

---

For questions or contributions, visit the [GitHub repository](https://github.com/MushroomFleet/ModularCharacters-JSX).
