# 🎭 PuppetJSX - Modular Sprite Animation System

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Canvas-HTML5-E34F26?style=flat&logo=html5" alt="Canvas">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat" alt="License">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat" alt="Version">
</p>

<p align="center">
  <strong>A React-based skeletal animation system for 2D game character creation and animation.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-integration">Integration</a>
</p>

---

## 🎯 The Problem

Traditional 2D animation suffers from **exponential sprite complexity**:

| Animations | Frames | Equipment Variants | Total Sprites |
|------------|--------|-------------------|---------------|
| 7 cycles | × 4 frames | × 27 combinations | = **756 sprites** |

Managing hundreds of sprite sheets becomes unsustainable as your game grows.

## ✨ The Solution

**PuppetJSX** uses a **modular bone-based approach**:

- Characters are composed of **10-20 reusable body part images**
- Parts attach to an **animated skeleton** with only **4 keyframes**
- Equipment changes require swapping **only the affected parts**
- **70-90% reduction** in asset count while maintaining full customization

```
Traditional: 756 sprites → PuppetJSX: ~50 parts + 4 keyframes per animation
```

---

## 🚀 Quick Start

### Option 1: Try the Demo (No Installation)

**[Open `demo.html`](demo.html)** in your browser - that's it! The demo includes everything needed to start creating characters and animations immediately.

### Option 2: Add to Your React Project

```bash
# Install dependencies
npm install react react-dom lucide-react

# Copy PuppetJSX.jsx to your components folder
cp PuppetJSX.jsx src/components/
```

```jsx
import PuppetJSX from './components/PuppetJSX';

function App() {
  return <PuppetJSX />;
}
```

---

## 🎮 Features

### Character Builder Mode
- **Parts Library** - Browse and filter body parts by category
- **Drag & Drop Assembly** - Assign parts to skeleton bones
- **Live Preview** - See your character update in real-time
- **Procedural Generation** - Generate random characters instantly
- **Bone Hierarchy** - Visual tree view of skeleton structure

### Animation Editor Mode
- **4-Frame Keyframe System** - Simple but powerful animation
- **Transform Controls** - Adjust position, rotation, and scale per bone
- **Timeline Scrubbing** - Click any frame to preview
- **Playback Controls** - Play, pause, adjust speed (0.1x - 2x)
- **Frame Operations** - Copy, paste, mirror, and reset frames

### Export System
- **JSON Export** - Characters and animations as clean JSON
- **Copy to Clipboard** - Quick sharing and testing
- **File Download** - Save for game engine integration
- **Import Support** - Load previously exported data

### Canvas Viewport
- **Zoom & Pan** - Mouse wheel zoom, drag to pan
- **Grid Overlay** - Toggleable alignment grid
- **Bone Gizmos** - Visual bone indicators with selection highlighting
- **Z-Index Sorting** - Proper layering of overlapping parts

---

## 📺 Demo

The fastest way to experience PuppetJSX:

### **[→ Open demo.html](demo.html)**

The demo runs entirely in your browser with no build process required. It includes:

- ✅ Full Character Builder
- ✅ Full Animation Editor
- ✅ 17 Default Parts
- ✅ 3 Pre-made Animations (Idle, Walk, Attack)
- ✅ Export/Import functionality
- ✅ Random character generation

---

## 📖 Documentation

### Integration Guide

For detailed instructions on integrating PuppetJSX into your project:

### **[→ Read puppetjsx-integration.md](puppetjsx-integration.md)**

The integration guide covers:

- Prerequisites and installation
- Component architecture overview
- Customizing skeletons and adding bones
- Creating custom parts and animations
- Exporting for game engines
- Runtime integration examples
- API reference
- Performance optimization
- Troubleshooting common issues

---

## 🔧 Integration

### Basic Usage

```jsx
import PuppetJSX from './PuppetJSX';

function CharacterEditor() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PuppetJSX />
    </div>
  );
}
```

### Using Exported Data in Your Game

```javascript
// Load exported JSON files
const character = await fetch('character.json').then(r => r.json());
const animation = await fetch('walk.json').then(r => r.json());

// Create runtime instance
const hero = new PuppetCharacter(character, skeleton, animation);

// In your game loop
function update(deltaTime) {
  hero.update(deltaTime);
  hero.render(ctx, x, y);
}
```

### Exported Character Format

```json
{
  "version": "1.0",
  "type": "character",
  "data": {
    "id": "char_hero",
    "name": "Hero",
    "skeletonId": "humanoid_skeleton",
    "parts": {
      "head": "head_knight",
      "torso": "torso_armor",
      "hand_right": "weapon_sword"
    }
  }
}
```

### Exported Animation Format

```json
{
  "version": "1.0",
  "type": "animation",
  "data": {
    "id": "anim_walk",
    "name": "Walk Cycle",
    "loop": true,
    "frames": [
      {
        "index": 0,
        "duration": 100,
        "bones": {
          "arm_left": { "position": { "x": -15, "y": -10 }, "rotation": -20, "scale": { "x": 1, "y": 1 } }
        }
      }
    ]
  }
}
```

---

## 🏗️ Architecture

```
PuppetJSX/
├── Math Utilities          # lerp, angle normalization, transforms
├── Skeleton Engine         # World transform calculations
├── Animation Engine        # Frame interpolation & playback
├── Default Data            # Skeleton, parts, animations
├── React Context           # Global state management
├── UI Components
│   ├── Toolbar             # Mode toggle, import/export
│   ├── Character Builder
│   │   ├── PartsLibrary
│   │   ├── CanvasViewport
│   │   └── CharacterProperties
│   └── Animation Editor
│       ├── AnimationList
│       ├── AnimationTimeline
│       └── TransformEditor
└── Dialogs                 # Export/Import modals
```

---

## 🎨 Default Content

### Skeleton (Humanoid)
- 10 bones: root, torso, head, arms (L/R), hands (L/R), legs (L/R), feet (L/R)
- Hierarchical parent-child relationships
- Z-index layering for proper render order

### Parts Library (17 parts)
| Category | Parts |
|----------|-------|
| Head | Basic, Knight Helm, Mage Hood |
| Torso | Basic, Plate Armor, Mage Robe |
| Arm | Basic, Armored |
| Hand | Basic, Gloved |
| Leg | Basic, Armored |
| Foot | Basic, Leather Boot |
| Weapon | Iron Sword, Magic Staff |
| Accessory | Shield |

### Animations (3 included)
- **Idle** - Subtle breathing motion
- **Walk Cycle** - Alternating arm/leg swing
- **Attack** - Sword swing with anticipation

---

## ⚡ Performance

- **60 FPS** animation playback
- **Memoized transforms** prevent unnecessary recalculation
- **Batched canvas operations** for efficient rendering
- **No external animation libraries** - pure React + Canvas

---

## 🛠️ Requirements

- React 18.x or higher
- lucide-react (for icons)
- Modern browser with Canvas support

---

## 📁 Project Files

| File | Description |
|------|-------------|
| `PuppetJSX.jsx` | Main React component (2,400+ lines) |
| `demo.html` | Standalone demo (no build required) |
| `puppetjsx-integration.md` | Comprehensive integration guide |
| `README.md` | This file |

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] More skeleton templates (quadruped, flying, etc.)
- [ ] Extended frame count (8, 12, 16 frames)
- [ ] Bezier curve easing
- [ ] IK (Inverse Kinematics) support
- [ ] Sprite atlas export
- [ ] Onion skinning for animation preview

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{puppetjsx,
  title = {PuppetJSX: Modular Sprite Skeletal Animation System for React},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/ModularCharacters-JSX},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)

---

<p align="center">
  Made with 🎭 for game developers everywhere
</p>
