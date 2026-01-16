import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { Play, Pause, SkipBack, SkipForward, Save, Upload, Download, Layers, Grid3X3, Eye, EyeOff, Plus, Trash2, Copy, ClipboardPaste, FlipHorizontal, RotateCcw, ChevronRight, ChevronDown, Shuffle, Settings, X } from 'lucide-react';

// ============================================================
// MATH UTILITIES
// ============================================================
const lerp = (a, b, t) => a + (b - a) * t;

const lerpAngle = (a, b, t) => {
  let delta = b - a;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return a + delta * t;
};

const normalizeAngle = (angle) => {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

const degToRad = (deg) => deg * Math.PI / 180;

// ============================================================
// SKELETON ENGINE
// ============================================================
const calculateWorldTransform = (bone, parentWorldTransform = null) => {
  const local = bone.localTransform;
  
  if (!parentWorldTransform) {
    return {
      position: { ...local.position },
      rotation: local.rotation,
      scale: { ...local.scale }
    };
  }
  
  const rad = degToRad(parentWorldTransform.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotatedX = local.position.x * cos - local.position.y * sin;
  const rotatedY = local.position.x * sin + local.position.y * cos;
  
  const scaledX = rotatedX * parentWorldTransform.scale.x;
  const scaledY = rotatedY * parentWorldTransform.scale.y;
  
  return {
    position: {
      x: parentWorldTransform.position.x + scaledX,
      y: parentWorldTransform.position.y + scaledY
    },
    rotation: normalizeAngle(parentWorldTransform.rotation + local.rotation),
    scale: {
      x: parentWorldTransform.scale.x * local.scale.x,
      y: parentWorldTransform.scale.y * local.scale.y
    }
  };
};

const calculateAllWorldTransforms = (skeleton, frameTransforms = {}) => {
  const worldTransforms = {};
  
  const traverse = (boneId, parentWorldTransform) => {
    const bone = skeleton.bones[boneId];
    if (!bone) return;
    
    const localTransform = frameTransforms[boneId] || bone.localTransform;
    const tempBone = { ...bone, localTransform };
    const worldTransform = calculateWorldTransform(tempBone, parentWorldTransform);
    
    worldTransforms[boneId] = worldTransform;
    
    for (const childId of bone.children) {
      traverse(childId, worldTransform);
    }
  };
  
  const rootBone = Object.values(skeleton.bones).find(b => b.parent === null);
  if (rootBone) traverse(rootBone.id, null);
  
  return worldTransforms;
};

// ============================================================
// ANIMATION ENGINE
// ============================================================
const getCurrentFrameData = (animation, currentTime) => {
  if (!animation || !animation.frames || animation.frames.length === 0) {
    return { currentFrameIndex: 0, nextFrameIndex: 0, progress: 0, currentFrame: null, nextFrame: null };
  }
  
  let accumulatedTime = 0;
  
  for (let i = 0; i < animation.frames.length; i++) {
    const frame = animation.frames[i];
    const frameEndTime = accumulatedTime + frame.duration;
    
    if (currentTime < frameEndTime) {
      const nextIndex = (i + 1) % animation.frames.length;
      const frameProgress = (currentTime - accumulatedTime) / frame.duration;
      
      return {
        currentFrameIndex: i,
        nextFrameIndex: nextIndex,
        progress: frameProgress,
        currentFrame: frame,
        nextFrame: animation.frames[nextIndex]
      };
    }
    
    accumulatedTime = frameEndTime;
  }
  
  return {
    currentFrameIndex: 0,
    nextFrameIndex: 1,
    progress: 0,
    currentFrame: animation.frames[0],
    nextFrame: animation.frames[1] || animation.frames[0]
  };
};

const interpolateFrames = (frame1, frame2, t, skeleton) => {
  const interpolated = {};
  
  for (const boneId in skeleton.bones) {
    const t1 = frame1?.bones?.[boneId] || skeleton.bones[boneId].localTransform;
    const t2 = frame2?.bones?.[boneId] || skeleton.bones[boneId].localTransform;
    
    interpolated[boneId] = {
      position: {
        x: lerp(t1.position.x, t2.position.x, t),
        y: lerp(t1.position.y, t2.position.y, t)
      },
      rotation: lerpAngle(t1.rotation, t2.rotation, t),
      scale: {
        x: lerp(t1.scale.x, t2.scale.x, t),
        y: lerp(t1.scale.y, t2.scale.y, t)
      }
    };
  }
  
  return interpolated;
};

const getTotalDuration = (animation) => {
  if (!animation?.frames) return 400;
  return animation.frames.reduce((sum, f) => sum + f.duration, 0);
};

// ============================================================
// DEFAULT DATA
// ============================================================
const defaultSkeleton = {
  id: 'humanoid_skeleton',
  name: 'Humanoid',
  bones: {
    root: {
      id: 'root',
      parent: null,
      children: ['torso'],
      localTransform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 0
    },
    torso: {
      id: 'torso',
      parent: 'root',
      children: ['head', 'arm_left', 'arm_right', 'leg_left', 'leg_right'],
      localTransform: { position: { x: 0, y: -20 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 5
    },
    head: {
      id: 'head',
      parent: 'torso',
      children: [],
      localTransform: { position: { x: 0, y: -30 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 10
    },
    arm_left: {
      id: 'arm_left',
      parent: 'torso',
      children: ['hand_left'],
      localTransform: { position: { x: -15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 3
    },
    hand_left: {
      id: 'hand_left',
      parent: 'arm_left',
      children: [],
      localTransform: { position: { x: 0, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 3
    },
    arm_right: {
      id: 'arm_right',
      parent: 'torso',
      children: ['hand_right'],
      localTransform: { position: { x: 15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 7
    },
    hand_right: {
      id: 'hand_right',
      parent: 'arm_right',
      children: [],
      localTransform: { position: { x: 0, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 7
    },
    leg_left: {
      id: 'leg_left',
      parent: 'torso',
      children: ['foot_left'],
      localTransform: { position: { x: -8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 4
    },
    foot_left: {
      id: 'foot_left',
      parent: 'leg_left',
      children: [],
      localTransform: { position: { x: 0, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 4
    },
    leg_right: {
      id: 'leg_right',
      parent: 'torso',
      children: ['foot_right'],
      localTransform: { position: { x: 8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 6
    },
    foot_right: {
      id: 'foot_right',
      parent: 'leg_right',
      children: [],
      localTransform: { position: { x: 0, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      zIndex: 6
    }
  }
};

const defaultParts = [
  { id: 'head_basic', name: 'Basic Head', category: 'head', color: '#FFD93D', attachPoint: 'head', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 32, height: 32 },
  { id: 'head_helmet', name: 'Knight Helmet', category: 'head', color: '#6B7280', attachPoint: 'head', offset: { x: 0, y: 0 }, zIndexModifier: 1, width: 36, height: 36 },
  { id: 'head_wizard', name: 'Wizard Hat', category: 'head', color: '#8B5CF6', attachPoint: 'head', offset: { x: 0, y: -8 }, zIndexModifier: 2, width: 40, height: 48 },
  { id: 'torso_basic', name: 'Basic Torso', category: 'torso', color: '#60A5FA', attachPoint: 'torso', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 40, height: 48 },
  { id: 'torso_armor', name: 'Plate Armor', category: 'torso', color: '#9CA3AF', attachPoint: 'torso', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 44, height: 52 },
  { id: 'torso_robe', name: 'Wizard Robe', category: 'torso', color: '#7C3AED', attachPoint: 'torso', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 42, height: 56 },
  { id: 'arm_basic', name: 'Basic Arm', category: 'arm', color: '#FFD93D', attachPoint: 'arm_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 12, height: 24 },
  { id: 'arm_armored', name: 'Armored Arm', category: 'arm', color: '#9CA3AF', attachPoint: 'arm_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 14, height: 26 },
  { id: 'hand_basic', name: 'Basic Hand', category: 'hand', color: '#FFD93D', attachPoint: 'hand_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 10, height: 12 },
  { id: 'hand_glove', name: 'Gauntlet', category: 'hand', color: '#6B7280', attachPoint: 'hand_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 12, height: 14 },
  { id: 'weapon_sword', name: 'Iron Sword', category: 'weapon', color: '#D1D5DB', attachPoint: 'hand_right', offset: { x: 8, y: -10 }, zIndexModifier: 2, width: 12, height: 48 },
  { id: 'weapon_staff', name: 'Magic Staff', category: 'weapon', color: '#8B5CF6', attachPoint: 'hand_right', offset: { x: 6, y: -20 }, zIndexModifier: 2, width: 8, height: 64 },
  { id: 'leg_basic', name: 'Basic Leg', category: 'leg', color: '#60A5FA', attachPoint: 'leg_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 14, height: 28 },
  { id: 'leg_armored', name: 'Armored Leg', category: 'leg', color: '#9CA3AF', attachPoint: 'leg_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 16, height: 30 },
  { id: 'foot_basic', name: 'Basic Foot', category: 'foot', color: '#374151', attachPoint: 'foot_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 14, height: 10 },
  { id: 'foot_boot', name: 'Steel Boot', category: 'foot', color: '#6B7280', attachPoint: 'foot_left', offset: { x: 0, y: 0 }, zIndexModifier: 0, width: 16, height: 12 },
  { id: 'shield', name: 'Round Shield', category: 'accessory', color: '#B45309', attachPoint: 'hand_left', offset: { x: -10, y: -5 }, zIndexModifier: 3, width: 28, height: 32 },
];

const createDefaultAnimation = (name = 'Idle') => ({
  id: `anim_${Date.now()}`,
  name,
  skeletonId: 'humanoid_skeleton',
  loop: true,
  frames: [
    { index: 0, duration: 150, bones: {} },
    { index: 1, duration: 150, bones: {} },
    { index: 2, duration: 150, bones: {} },
    { index: 3, duration: 150, bones: {} }
  ]
});

const defaultAnimations = [
  {
    id: 'anim_idle_001',
    name: 'Idle',
    skeletonId: 'humanoid_skeleton',
    loop: true,
    frames: [
      { index: 0, duration: 200, bones: { torso: { position: { x: 0, y: -20 }, rotation: 0, scale: { x: 1, y: 1 } } } },
      { index: 1, duration: 200, bones: { torso: { position: { x: 0, y: -22 }, rotation: 0, scale: { x: 1, y: 1 } } } },
      { index: 2, duration: 200, bones: { torso: { position: { x: 0, y: -20 }, rotation: 0, scale: { x: 1, y: 1 } } } },
      { index: 3, duration: 200, bones: { torso: { position: { x: 0, y: -22 }, rotation: 0, scale: { x: 1, y: 1 } } } }
    ]
  },
  {
    id: 'anim_walk_001',
    name: 'Walk Cycle',
    skeletonId: 'humanoid_skeleton',
    loop: true,
    frames: [
      { index: 0, duration: 100, bones: {
        arm_left: { position: { x: -15, y: -10 }, rotation: -20, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: 20, scale: { x: 1, y: 1 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: -30, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: 30, scale: { x: 1, y: 1 } }
      }},
      { index: 1, duration: 100, bones: {
        torso: { position: { x: 0, y: -22 }, rotation: 0, scale: { x: 1, y: 1 } },
        arm_left: { position: { x: -15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } }
      }},
      { index: 2, duration: 100, bones: {
        arm_left: { position: { x: -15, y: -10 }, rotation: 20, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: -20, scale: { x: 1, y: 1 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: 30, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: -30, scale: { x: 1, y: 1 } }
      }},
      { index: 3, duration: 100, bones: {
        torso: { position: { x: 0, y: -22 }, rotation: 0, scale: { x: 1, y: 1 } },
        arm_left: { position: { x: -15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } },
        leg_left: { position: { x: -8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } },
        leg_right: { position: { x: 8, y: 15 }, rotation: 0, scale: { x: 1, y: 1 } }
      }}
    ]
  },
  {
    id: 'anim_attack_001',
    name: 'Attack',
    skeletonId: 'humanoid_skeleton',
    loop: false,
    frames: [
      { index: 0, duration: 80, bones: {
        arm_right: { position: { x: 15, y: -10 }, rotation: -90, scale: { x: 1, y: 1 } }
      }},
      { index: 1, duration: 60, bones: {
        torso: { position: { x: 0, y: -20 }, rotation: 5, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: -45, scale: { x: 1, y: 1 } }
      }},
      { index: 2, duration: 50, bones: {
        torso: { position: { x: 0, y: -20 }, rotation: -10, scale: { x: 1, y: 1 } },
        arm_right: { position: { x: 15, y: -10 }, rotation: 60, scale: { x: 1, y: 1 } }
      }},
      { index: 3, duration: 150, bones: {
        arm_right: { position: { x: 15, y: -10 }, rotation: 0, scale: { x: 1, y: 1 } }
      }}
    ]
  }
];

const defaultCharacter = {
  id: 'char_default_001',
  name: 'Hero',
  skeletonId: 'humanoid_skeleton',
  parts: {
    head: 'head_basic',
    torso: 'torso_basic',
    arm_left: 'arm_basic',
    arm_right: 'arm_basic',
    hand_left: 'hand_basic',
    hand_right: 'hand_basic',
    leg_left: 'leg_basic',
    leg_right: 'leg_basic',
    foot_left: 'foot_basic',
    foot_right: 'foot_basic'
  }
};

// ============================================================
// CONTEXT
// ============================================================
const ProjectContext = createContext(null);

const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function PuppetJSX() {
  // Core data
  const [skeleton] = useState(defaultSkeleton);
  const [partsLibrary] = useState(defaultParts);
  const [characters, setCharacters] = useState([defaultCharacter]);
  const [currentCharacter, setCurrentCharacter] = useState(defaultCharacter);
  const [animations, setAnimations] = useState(defaultAnimations);
  const [currentAnimation, setCurrentAnimation] = useState(defaultAnimations[0]);
  
  // Editor state
  const [mode, setMode] = useState('builder');
  const [selectedBoneId, setSelectedBoneId] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Canvas state
  const [zoom, setZoom] = useState(2.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showBones, setShowBones] = useState(true);
  
  // Dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Animation loop
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    
    const animate = (timestamp) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      setCurrentTime(prev => {
        const totalDuration = getTotalDuration(currentAnimation);
        let newTime = prev + deltaTime * playbackSpeed;
        
        if (newTime >= totalDuration) {
          if (currentAnimation?.loop) {
            newTime = newTime % totalDuration;
          } else {
            setIsPlaying(false);
            return totalDuration;
          }
        }
        
        return newTime;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playbackSpeed, currentAnimation]);
  
  // Update current frame based on time
  useEffect(() => {
    if (currentAnimation) {
      const frameData = getCurrentFrameData(currentAnimation, currentTime);
      if (frameData.currentFrameIndex !== currentFrame && !isPlaying) {
        // Only auto-update frame if not playing
      }
    }
  }, [currentTime, currentAnimation]);
  
  // Actions
  const assignPartToBone = useCallback((boneId, partId) => {
    setCurrentCharacter(prev => ({
      ...prev,
      parts: { ...prev.parts, [boneId]: partId }
    }));
  }, []);
  
  const removePartFromBone = useCallback((boneId) => {
    setCurrentCharacter(prev => {
      const newParts = { ...prev.parts };
      delete newParts[boneId];
      return { ...prev, parts: newParts };
    });
  }, []);
  
  const updateBoneTransform = useCallback((boneId, transform) => {
    setCurrentAnimation(prev => {
      if (!prev) return prev;
      const newFrames = [...prev.frames];
      newFrames[currentFrame] = {
        ...newFrames[currentFrame],
        bones: {
          ...newFrames[currentFrame].bones,
          [boneId]: transform
        }
      };
      return { ...prev, frames: newFrames };
    });
  }, [currentFrame]);
  
  const updateFrameDuration = useCallback((frameIndex, duration) => {
    setCurrentAnimation(prev => {
      if (!prev) return prev;
      const newFrames = [...prev.frames];
      newFrames[frameIndex] = { ...newFrames[frameIndex], duration };
      return { ...prev, frames: newFrames };
    });
  }, []);
  
  const goToFrame = useCallback((frameIndex) => {
    setCurrentFrame(frameIndex);
    setIsPlaying(false);
    
    if (currentAnimation) {
      let time = 0;
      for (let i = 0; i < frameIndex; i++) {
        time += currentAnimation.frames[i]?.duration || 100;
      }
      setCurrentTime(time);
    }
  }, [currentAnimation]);
  
  const createNewAnimation = useCallback((name) => {
    const newAnim = createDefaultAnimation(name);
    setAnimations(prev => [...prev, newAnim]);
    setCurrentAnimation(newAnim);
    setCurrentFrame(0);
    setCurrentTime(0);
  }, []);
  
  const deleteAnimation = useCallback((animId) => {
    setAnimations(prev => prev.filter(a => a.id !== animId));
    if (currentAnimation?.id === animId) {
      setCurrentAnimation(animations[0] || null);
    }
  }, [currentAnimation, animations]);
  
  const copyFrame = useCallback(() => {
    if (!currentAnimation) return null;
    return JSON.parse(JSON.stringify(currentAnimation.frames[currentFrame]?.bones || {}));
  }, [currentAnimation, currentFrame]);
  
  const pasteFrame = useCallback((copiedData) => {
    if (!copiedData) return;
    setCurrentAnimation(prev => {
      if (!prev) return prev;
      const newFrames = [...prev.frames];
      newFrames[currentFrame] = {
        ...newFrames[currentFrame],
        bones: { ...copiedData }
      };
      return { ...prev, frames: newFrames };
    });
  }, [currentFrame]);
  
  const mirrorFrame = useCallback(() => {
    setCurrentAnimation(prev => {
      if (!prev) return prev;
      const newFrames = [...prev.frames];
      const currentBones = newFrames[currentFrame].bones || {};
      const mirrored = {};
      
      const mirrorPairs = {
        arm_left: 'arm_right',
        arm_right: 'arm_left',
        hand_left: 'hand_right',
        hand_right: 'hand_left',
        leg_left: 'leg_right',
        leg_right: 'leg_left',
        foot_left: 'foot_right',
        foot_right: 'foot_left'
      };
      
      for (const [boneId, transform] of Object.entries(currentBones)) {
        const targetBone = mirrorPairs[boneId] || boneId;
        mirrored[targetBone] = {
          ...transform,
          position: { x: -transform.position.x, y: transform.position.y },
          rotation: -transform.rotation
        };
      }
      
      newFrames[currentFrame] = { ...newFrames[currentFrame], bones: mirrored };
      return { ...prev, frames: newFrames };
    });
  }, [currentFrame]);
  
  const resetBone = useCallback((boneId) => {
    const defaultTransform = skeleton.bones[boneId]?.localTransform;
    if (defaultTransform) {
      updateBoneTransform(boneId, { ...defaultTransform });
    }
  }, [skeleton, updateBoneTransform]);
  
  const resetAllBones = useCallback(() => {
    setCurrentAnimation(prev => {
      if (!prev) return prev;
      const newFrames = [...prev.frames];
      newFrames[currentFrame] = { ...newFrames[currentFrame], bones: {} };
      return { ...prev, frames: newFrames };
    });
  }, [currentFrame]);
  
  const generateRandomCharacter = useCallback(() => {
    const randomParts = {};
    const boneCategories = {
      head: 'head',
      torso: 'torso',
      arm_left: 'arm',
      arm_right: 'arm',
      hand_left: 'hand',
      hand_right: 'hand',
      leg_left: 'leg',
      leg_right: 'leg',
      foot_left: 'foot',
      foot_right: 'foot'
    };
    
    for (const [boneId, category] of Object.entries(boneCategories)) {
      const matchingParts = partsLibrary.filter(p => p.category === category);
      if (matchingParts.length > 0 && Math.random() > 0.2) {
        const randomPart = matchingParts[Math.floor(Math.random() * matchingParts.length)];
        randomParts[boneId] = randomPart.id;
      }
    }
    
    // Sometimes add weapon
    if (Math.random() > 0.5) {
      const weapons = partsLibrary.filter(p => p.category === 'weapon');
      if (weapons.length > 0) {
        randomParts.hand_right = weapons[Math.floor(Math.random() * weapons.length)].id;
      }
    }
    
    const newChar = {
      id: `char_gen_${Date.now()}`,
      name: `Generated_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      skeletonId: 'humanoid_skeleton',
      parts: randomParts
    };
    
    setCurrentCharacter(newChar);
    setCharacters(prev => [...prev, newChar]);
  }, [partsLibrary]);
  
  const exportCharacter = useCallback(() => {
    return JSON.stringify({
      version: '1.0',
      type: 'character',
      data: currentCharacter
    }, null, 2);
  }, [currentCharacter]);
  
  const exportAnimation = useCallback(() => {
    return JSON.stringify({
      version: '1.0',
      type: 'animation',
      data: currentAnimation
    }, null, 2);
  }, [currentAnimation]);
  
  const importData = useCallback((jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.type === 'character' && data.data) {
        setCurrentCharacter(data.data);
        setCharacters(prev => [...prev.filter(c => c.id !== data.data.id), data.data]);
        return { success: true, message: 'Character imported successfully' };
      }
      if (data.type === 'animation' && data.data) {
        setCurrentAnimation(data.data);
        setAnimations(prev => [...prev.filter(a => a.id !== data.data.id), data.data]);
        return { success: true, message: 'Animation imported successfully' };
      }
      return { success: false, message: 'Unknown data type' };
    } catch (e) {
      return { success: false, message: `Import failed: ${e.message}` };
    }
  }, []);
  
  const contextValue = useMemo(() => ({
    skeleton, partsLibrary, characters, currentCharacter, animations, currentAnimation,
    mode, selectedBoneId, currentFrame, isPlaying, playbackSpeed, currentTime,
    zoom, pan, showGrid, showBones,
    setMode, setSelectedBoneId, setCurrentFrame: goToFrame, setIsPlaying, setPlaybackSpeed,
    setZoom, setPan, setShowGrid, setShowBones,
    assignPartToBone, removePartFromBone, updateBoneTransform, updateFrameDuration,
    createNewAnimation, deleteAnimation, setCurrentAnimation, setCurrentCharacter,
    copyFrame, pasteFrame, mirrorFrame, resetBone, resetAllBones, generateRandomCharacter,
    exportCharacter, exportAnimation, importData
  }), [
    skeleton, partsLibrary, characters, currentCharacter, animations, currentAnimation,
    mode, selectedBoneId, currentFrame, isPlaying, playbackSpeed, currentTime,
    zoom, pan, showGrid, showBones, goToFrame,
    assignPartToBone, removePartFromBone, updateBoneTransform, updateFrameDuration,
    createNewAnimation, deleteAnimation, copyFrame, pasteFrame, mirrorFrame,
    resetBone, resetAllBones, generateRandomCharacter, exportCharacter, exportAnimation, importData
  ]);
  
  return (
    <ProjectContext.Provider value={contextValue}>
      <div style={styles.app}>
        <Toolbar 
          onExport={() => setShowExportDialog(true)} 
          onImport={() => setShowImportDialog(true)} 
        />
        <div style={styles.mainContent}>
          {mode === 'builder' ? <CharacterBuilder /> : <AnimationEditor />}
        </div>
        {showExportDialog && <ExportDialog onClose={() => setShowExportDialog(false)} />}
        {showImportDialog && <ImportDialog onClose={() => setShowImportDialog(false)} />}
      </div>
    </ProjectContext.Provider>
  );
}

// ============================================================
// TOOLBAR
// ============================================================
function Toolbar({ onExport, onImport }) {
  const { mode, setMode } = useProject();
  
  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarLeft}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎭</span>
          <span style={styles.logoText}>PuppetJSX</span>
        </div>
        <div style={styles.modeToggle}>
          <button
            style={{ ...styles.modeButton, ...(mode === 'builder' ? styles.modeButtonActive : {}) }}
            onClick={() => setMode('builder')}
          >
            Character Builder
          </button>
          <button
            style={{ ...styles.modeButton, ...(mode === 'animator' ? styles.modeButtonActive : {}) }}
            onClick={() => setMode('animator')}
          >
            Animation Editor
          </button>
        </div>
      </div>
      <div style={styles.toolbarRight}>
        <button style={styles.toolbarButton} onClick={onImport}>
          <Upload size={16} />
          Import
        </button>
        <button style={styles.toolbarButton} onClick={onExport}>
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CHARACTER BUILDER
// ============================================================
function CharacterBuilder() {
  return (
    <div style={styles.editorLayout}>
      <PartsLibrary />
      <CanvasViewport />
      <CharacterProperties />
    </div>
  );
}

// ============================================================
// ANIMATION EDITOR
// ============================================================
function AnimationEditor() {
  return (
    <div style={styles.editorLayout}>
      <AnimationList />
      <div style={styles.centerPanel}>
        <CanvasViewport />
        <AnimationTimeline />
      </div>
      <TransformEditor />
    </div>
  );
}

// ============================================================
// PARTS LIBRARY
// ============================================================
function PartsLibrary() {
  const { partsLibrary, selectedBoneId, assignPartToBone } = useProject();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const categories = ['all', 'head', 'torso', 'arm', 'hand', 'leg', 'foot', 'weapon', 'accessory'];
  
  const filteredParts = useMemo(() => {
    return partsLibrary.filter(part => {
      const matchesCategory = filter === 'all' || part.category === filter;
      const matchesSearch = part.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [partsLibrary, filter, search]);
  
  const handlePartClick = (part) => {
    if (selectedBoneId) {
      assignPartToBone(selectedBoneId, part.id);
    }
  };
  
  return (
    <div style={styles.leftPanel}>
      <h3 style={styles.panelTitle}>Parts Library</h3>
      <input
        type="text"
        placeholder="Search parts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.searchInput}
      />
      <div style={styles.categoryTabs}>
        {categories.map(cat => (
          <button
            key={cat}
            style={{ ...styles.categoryTab, ...(filter === cat ? styles.categoryTabActive : {}) }}
            onClick={() => setFilter(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div style={styles.partsGrid}>
        {filteredParts.map(part => (
          <PartThumbnail key={part.id} part={part} onClick={() => handlePartClick(part)} />
        ))}
      </div>
      {!selectedBoneId && (
        <div style={styles.hint}>Select a bone to assign parts</div>
      )}
    </div>
  );
}

function PartThumbnail({ part, onClick }) {
  return (
    <div style={styles.partThumbnail} onClick={onClick} title={part.name}>
      <div style={{ ...styles.partPreview, backgroundColor: part.color }}>
        <div style={{ width: part.width * 0.8, height: part.height * 0.8, backgroundColor: part.color, borderRadius: 4 }} />
      </div>
      <span style={styles.partName}>{part.name}</span>
    </div>
  );
}

// ============================================================
// CHARACTER PROPERTIES
// ============================================================
function CharacterProperties() {
  const { 
    skeleton, currentCharacter, setCurrentCharacter, selectedBoneId, setSelectedBoneId,
    partsLibrary, assignPartToBone, removePartFromBone, generateRandomCharacter
  } = useProject();
  
  const [expandedBones, setExpandedBones] = useState({ root: true, torso: true });
  
  const toggleExpand = (boneId) => {
    setExpandedBones(prev => ({ ...prev, [boneId]: !prev[boneId] }));
  };
  
  const renderBoneTree = (boneId, depth = 0) => {
    const bone = skeleton.bones[boneId];
    if (!bone) return null;
    
    const hasChildren = bone.children.length > 0;
    const isExpanded = expandedBones[boneId];
    const isSelected = selectedBoneId === boneId;
    const assignedPartId = currentCharacter.parts[boneId];
    const assignedPart = partsLibrary.find(p => p.id === assignedPartId);
    
    return (
      <div key={boneId}>
        <div
          style={{
            ...styles.boneItem,
            paddingLeft: 12 + depth * 16,
            backgroundColor: isSelected ? '#4A90E2' : 'transparent'
          }}
          onClick={() => setSelectedBoneId(boneId)}
        >
          {hasChildren && (
            <span style={styles.expandIcon} onClick={(e) => { e.stopPropagation(); toggleExpand(boneId); }}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!hasChildren && <span style={{ width: 14 }} />}
          <span style={styles.boneName}>{boneId}</span>
          {assignedPart && (
            <span style={{ ...styles.assignedPartBadge, backgroundColor: assignedPart.color }}>
              {assignedPart.name.slice(0, 8)}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && bone.children.map(childId => renderBoneTree(childId, depth + 1))}
      </div>
    );
  };
  
  const selectedBone = selectedBoneId ? skeleton.bones[selectedBoneId] : null;
  const compatibleParts = selectedBone ? partsLibrary.filter(p => {
    const boneCategory = selectedBoneId.replace(/_left|_right/g, '');
    return p.category === boneCategory || p.attachPoint === selectedBoneId || p.attachPoint?.replace(/_left|_right/g, '') === boneCategory;
  }) : [];
  
  return (
    <div style={styles.rightPanel}>
      <h3 style={styles.panelTitle}>Character</h3>
      <input
        type="text"
        value={currentCharacter.name}
        onChange={(e) => setCurrentCharacter(prev => ({ ...prev, name: e.target.value }))}
        style={styles.textInput}
        placeholder="Character Name"
      />
      
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Skeleton</h4>
        <div style={styles.boneTree}>
          {renderBoneTree('root')}
        </div>
      </div>
      
      {selectedBone && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Bone: {selectedBoneId}</h4>
          <label style={styles.label}>Assigned Part</label>
          <select
            style={styles.select}
            value={currentCharacter.parts[selectedBoneId] || ''}
            onChange={(e) => e.target.value ? assignPartToBone(selectedBoneId, e.target.value) : removePartFromBone(selectedBoneId)}
          >
            <option value="">None</option>
            {compatibleParts.map(part => (
              <option key={part.id} value={part.id}>{part.name}</option>
            ))}
          </select>
          {currentCharacter.parts[selectedBoneId] && (
            <button style={styles.dangerButton} onClick={() => removePartFromBone(selectedBoneId)}>
              <Trash2 size={14} /> Remove Part
            </button>
          )}
        </div>
      )}
      
      <div style={styles.actionButtons}>
        <button style={styles.primaryButton} onClick={generateRandomCharacter}>
          <Shuffle size={14} /> Generate Random
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ANIMATION LIST
// ============================================================
function AnimationList() {
  const { animations, currentAnimation, setCurrentAnimation, createNewAnimation, deleteAnimation } = useProject();
  const [newAnimName, setNewAnimName] = useState('');
  
  const handleCreate = () => {
    if (newAnimName.trim()) {
      createNewAnimation(newAnimName.trim());
      setNewAnimName('');
    }
  };
  
  return (
    <div style={styles.leftPanel}>
      <h3 style={styles.panelTitle}>Animations</h3>
      <div style={styles.animationInputRow}>
        <input
          type="text"
          value={newAnimName}
          onChange={(e) => setNewAnimName(e.target.value)}
          placeholder="New animation..."
          style={{ ...styles.textInput, flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button style={styles.iconButton} onClick={handleCreate}>
          <Plus size={16} />
        </button>
      </div>
      <div style={styles.animationList}>
        {animations.map(anim => (
          <div
            key={anim.id}
            style={{
              ...styles.animationItem,
              backgroundColor: currentAnimation?.id === anim.id ? '#4A90E2' : 'transparent'
            }}
            onClick={() => setCurrentAnimation(anim)}
          >
            <span style={styles.animationName}>{anim.name}</span>
            <span style={styles.animationDuration}>{getTotalDuration(anim)}ms</span>
            <button
              style={styles.deleteButton}
              onClick={(e) => { e.stopPropagation(); deleteAnimation(anim.id); }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      {currentAnimation && (
        <div style={styles.section}>
          <label style={styles.label}>Animation Name</label>
          <input
            type="text"
            value={currentAnimation.name}
            onChange={(e) => setCurrentAnimation(prev => ({ ...prev, name: e.target.value }))}
            style={styles.textInput}
          />
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={currentAnimation.loop}
              onChange={(e) => setCurrentAnimation(prev => ({ ...prev, loop: e.target.checked }))}
            />
            Loop Animation
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ANIMATION TIMELINE
// ============================================================
function AnimationTimeline() {
  const { 
    currentAnimation, currentFrame, setCurrentFrame, isPlaying, setIsPlaying,
    playbackSpeed, setPlaybackSpeed, updateFrameDuration
  } = useProject();
  
  if (!currentAnimation) return null;
  
  return (
    <div style={styles.timeline}>
      <div style={styles.playbackControls}>
        <button style={styles.playButton} onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}>
          <SkipBack size={16} />
        </button>
        <button style={styles.playButton} onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button style={styles.playButton} onClick={() => setCurrentFrame(Math.min(3, currentFrame + 1))}>
          <SkipForward size={16} />
        </button>
        <div style={styles.speedControl}>
          <span style={styles.speedLabel}>Speed: {playbackSpeed.toFixed(1)}x</span>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            style={styles.speedSlider}
          />
        </div>
      </div>
      <div style={styles.frameThumbnails}>
        {currentAnimation.frames.map((frame, index) => (
          <div
            key={index}
            style={{
              ...styles.frameThumbnail,
              borderColor: currentFrame === index ? '#4A90E2' : '#3A3A3A'
            }}
            onClick={() => setCurrentFrame(index)}
          >
            <div style={styles.frameNumber}>F{index + 1}</div>
            <input
              type="number"
              value={frame.duration}
              onChange={(e) => updateFrameDuration(index, parseInt(e.target.value) || 100)}
              style={styles.durationInput}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={styles.msLabel}>ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRANSFORM EDITOR
// ============================================================
function TransformEditor() {
  const { 
    skeleton, currentAnimation, currentFrame, selectedBoneId, setSelectedBoneId,
    updateBoneTransform, copyFrame, pasteFrame, mirrorFrame, resetBone, resetAllBones
  } = useProject();
  
  const [copiedFrame, setCopiedFrame] = useState(null);
  
  const currentTransform = useMemo(() => {
    if (!selectedBoneId || !currentAnimation) return null;
    const frameData = currentAnimation.frames[currentFrame]?.bones?.[selectedBoneId];
    return frameData || skeleton.bones[selectedBoneId]?.localTransform;
  }, [selectedBoneId, currentAnimation, currentFrame, skeleton]);
  
  const handleTransformChange = (field, subfield, value) => {
    if (!selectedBoneId || !currentTransform) return;
    
    const newTransform = { ...currentTransform };
    if (subfield) {
      newTransform[field] = { ...newTransform[field], [subfield]: parseFloat(value) || 0 };
    } else {
      newTransform[field] = parseFloat(value) || 0;
    }
    updateBoneTransform(selectedBoneId, newTransform);
  };
  
  const handleCopy = () => {
    const data = copyFrame();
    setCopiedFrame(data);
  };
  
  return (
    <div style={styles.rightPanel}>
      <h3 style={styles.panelTitle}>Transform Editor</h3>
      <div style={styles.frameInfo}>
        <span style={styles.frameLabel}>Frame {currentFrame + 1} of 4</span>
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Bones</h4>
        <div style={styles.boneButtons}>
          {Object.keys(skeleton.bones).filter(id => id !== 'root').map(boneId => (
            <button
              key={boneId}
              style={{
                ...styles.boneButton,
                backgroundColor: selectedBoneId === boneId ? '#4A90E2' : '#333'
              }}
              onClick={() => setSelectedBoneId(boneId)}
            >
              {boneId.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      
      {currentTransform && selectedBoneId && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Transform: {selectedBoneId}</h4>
          
          <div style={styles.transformGroup}>
            <label style={styles.transformLabel}>Position</label>
            <div style={styles.transformInputs}>
              <div style={styles.inputGroup}>
                <span style={styles.inputLabel}>X</span>
                <input
                  type="number"
                  value={currentTransform.position.x}
                  onChange={(e) => handleTransformChange('position', 'x', e.target.value)}
                  style={styles.numberInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputLabel}>Y</span>
                <input
                  type="number"
                  value={currentTransform.position.y}
                  onChange={(e) => handleTransformChange('position', 'y', e.target.value)}
                  style={styles.numberInput}
                />
              </div>
            </div>
          </div>
          
          <div style={styles.transformGroup}>
            <label style={styles.transformLabel}>Rotation</label>
            <div style={styles.transformInputs}>
              <input
                type="number"
                value={currentTransform.rotation}
                onChange={(e) => handleTransformChange('rotation', null, e.target.value)}
                style={{ ...styles.numberInput, width: 80 }}
                min={-180}
                max={180}
              />
              <span style={styles.unitLabel}>°</span>
              <input
                type="range"
                min={-180}
                max={180}
                value={currentTransform.rotation}
                onChange={(e) => handleTransformChange('rotation', null, e.target.value)}
                style={styles.rotationSlider}
              />
            </div>
          </div>
          
          <div style={styles.transformGroup}>
            <label style={styles.transformLabel}>Scale</label>
            <div style={styles.transformInputs}>
              <div style={styles.inputGroup}>
                <span style={styles.inputLabel}>X</span>
                <input
                  type="number"
                  value={currentTransform.scale.x}
                  onChange={(e) => handleTransformChange('scale', 'x', e.target.value)}
                  style={styles.numberInput}
                  step={0.1}
                />
              </div>
              <div style={styles.inputGroup}>
                <span style={styles.inputLabel}>Y</span>
                <input
                  type="number"
                  value={currentTransform.scale.y}
                  onChange={(e) => handleTransformChange('scale', 'y', e.target.value)}
                  style={styles.numberInput}
                  step={0.1}
                />
              </div>
            </div>
          </div>
          
          <button style={styles.secondaryButton} onClick={() => resetBone(selectedBoneId)}>
            <RotateCcw size={14} /> Reset Bone
          </button>
        </div>
      )}
      
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Frame Operations</h4>
        <div style={styles.frameOperations}>
          <button style={styles.secondaryButton} onClick={handleCopy}>
            <Copy size={14} /> Copy Frame
          </button>
          <button 
            style={{ ...styles.secondaryButton, opacity: copiedFrame ? 1 : 0.5 }} 
            onClick={() => pasteFrame(copiedFrame)}
            disabled={!copiedFrame}
          >
            <ClipboardPaste size={14} /> Paste Frame
          </button>
          <button style={styles.secondaryButton} onClick={mirrorFrame}>
            <FlipHorizontal size={14} /> Mirror Frame
          </button>
          <button style={styles.dangerButton} onClick={resetAllBones}>
            <RotateCcw size={14} /> Reset All
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CANVAS VIEWPORT
// ============================================================
function CanvasViewport() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { 
    skeleton, partsLibrary, currentCharacter, currentAnimation, currentFrame, currentTime,
    selectedBoneId, setSelectedBoneId, zoom, setZoom, pan, setPan, showGrid, setShowGrid,
    showBones, setShowBones, isPlaying, mode
  } = useProject();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Calculate current transforms
  const worldTransforms = useMemo(() => {
    let frameTransforms = {};
    
    if (mode === 'animator' && currentAnimation) {
      if (isPlaying) {
        const frameData = getCurrentFrameData(currentAnimation, currentTime);
        if (frameData.currentFrame && frameData.nextFrame) {
          frameTransforms = interpolateFrames(
            frameData.currentFrame,
            frameData.nextFrame,
            frameData.progress,
            skeleton
          );
        }
      } else {
        frameTransforms = currentAnimation.frames[currentFrame]?.bones || {};
      }
    }
    
    return calculateAllWorldTransforms(skeleton, frameTransforms);
  }, [skeleton, currentAnimation, currentFrame, currentTime, isPlaying, mode]);
  
  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    
    // Clear
    ctx.fillStyle = '#2D2D2D';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      const gridSize = 32 * zoom;
      const startX = (centerX % gridSize) - gridSize;
      const startY = (centerY % gridSize) - gridSize;
      
      for (let x = startX; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = startY; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Major gridlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      const majorGridSize = 128 * zoom;
      const majorStartX = (centerX % majorGridSize) - majorGridSize;
      const majorStartY = (centerY % majorGridSize) - majorGridSize;
      
      for (let x = majorStartX; x < width + majorGridSize; x += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = majorStartY; y < height + majorGridSize; y += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Build render list
    const renderList = [];
    
    for (const [boneId, partId] of Object.entries(currentCharacter.parts)) {
      const part = partsLibrary.find(p => p.id === partId);
      if (!part) continue;
      
      const bone = skeleton.bones[boneId];
      const worldTransform = worldTransforms[boneId];
      if (!worldTransform) continue;
      
      renderList.push({
        part,
        boneId,
        position: {
          x: worldTransform.position.x + part.offset.x,
          y: worldTransform.position.y + part.offset.y
        },
        rotation: worldTransform.rotation,
        scale: worldTransform.scale,
        zIndex: bone.zIndex + part.zIndexModifier
      });
    }
    
    renderList.sort((a, b) => a.zIndex - b.zIndex);
    
    // Draw parts
    for (const item of renderList) {
      ctx.save();
      
      const screenX = centerX + item.position.x * zoom;
      const screenY = centerY + item.position.y * zoom;
      
      ctx.translate(screenX, screenY);
      ctx.rotate(degToRad(item.rotation));
      ctx.scale(item.scale.x, item.scale.y);
      
      // Draw part as colored shape
      const w = item.part.width * zoom;
      const h = item.part.height * zoom;
      
      ctx.fillStyle = item.part.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      if (item.part.category === 'head') {
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.part.category === 'weapon') {
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-w / 4, -h / 2, w / 2, h / 6);
      } else {
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Draw bone gizmos
    if (showBones) {
      // Draw bone connections
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      
      for (const bone of Object.values(skeleton.bones)) {
        if (bone.parent === null) continue;
        
        const parentTransform = worldTransforms[bone.parent];
        const boneTransform = worldTransforms[bone.id];
        if (!parentTransform || !boneTransform) continue;
        
        const x1 = centerX + parentTransform.position.x * zoom;
        const y1 = centerY + parentTransform.position.y * zoom;
        const x2 = centerX + boneTransform.position.x * zoom;
        const y2 = centerY + boneTransform.position.y * zoom;
        
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw bone circles
      for (const [boneId, worldTransform] of Object.entries(worldTransforms)) {
        const x = centerX + worldTransform.position.x * zoom;
        const y = centerY + worldTransform.position.y * zoom;
        
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        
        if (boneId === selectedBoneId) {
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 3;
        } else {
          const bone = skeleton.bones[boneId];
          const isChildOfSelected = selectedBoneId && bone?.parent === selectedBoneId;
          ctx.fillStyle = isChildOfSelected ? '#4AE24A' : '#FFFFFF';
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = 2;
        }
        
        ctx.fill();
        ctx.stroke();
      }
    }
    
  }, [skeleton, partsLibrary, currentCharacter, worldTransforms, zoom, pan, showGrid, showBones, selectedBoneId]);
  
  // Mouse handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2 + pan.x;
    const centerY = rect.height / 2 + pan.y;
    
    // Check if clicked on a bone
    for (const [boneId, worldTransform] of Object.entries(worldTransforms)) {
      const boneX = centerX + worldTransform.position.x * zoom;
      const boneY = centerY + worldTransform.position.y * zoom;
      
      const dist = Math.sqrt((x - boneX) ** 2 + (y - boneY) ** 2);
      if (dist < 12) {
        setSelectedBoneId(boneId);
        return;
      }
    }
    
    // Start panning
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
  };
  
  return (
    <div style={styles.canvasContainer} ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div style={styles.canvasControls}>
        <button 
          style={{ ...styles.canvasButton, backgroundColor: showGrid ? '#4A90E2' : '#333' }} 
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
        >
          <Grid3X3 size={16} />
        </button>
        <button 
          style={{ ...styles.canvasButton, backgroundColor: showBones ? '#4A90E2' : '#333' }} 
          onClick={() => setShowBones(!showBones)}
          title="Toggle Bones"
        >
          {showBones ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT DIALOG
// ============================================================
function ExportDialog({ onClose }) {
  const { exportCharacter, exportAnimation, currentCharacter, currentAnimation } = useProject();
  const [exportType, setExportType] = useState('character');
  const [exportedData, setExportedData] = useState('');
  
  useEffect(() => {
    if (exportType === 'character') {
      setExportedData(exportCharacter());
    } else {
      setExportedData(exportAnimation());
    }
  }, [exportType, exportCharacter, exportAnimation]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(exportedData);
  };
  
  const handleDownload = () => {
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportType}_${exportType === 'character' ? currentCharacter?.name : currentAnimation?.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={styles.dialogBackdrop} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.dialogHeader}>
          <h2 style={styles.dialogTitle}>Export</h2>
          <button style={styles.closeButton} onClick={onClose}><X size={20} /></button>
        </div>
        <div style={styles.dialogContent}>
          <div style={styles.exportOptions}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="exportType"
                value="character"
                checked={exportType === 'character'}
                onChange={() => setExportType('character')}
              />
              Export Character
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="exportType"
                value="animation"
                checked={exportType === 'animation'}
                onChange={() => setExportType('animation')}
              />
              Export Animation
            </label>
          </div>
          <textarea
            style={styles.exportTextarea}
            value={exportedData}
            readOnly
          />
          <div style={styles.dialogButtons}>
            <button style={styles.primaryButton} onClick={handleCopy}>
              <Copy size={14} /> Copy to Clipboard
            </button>
            <button style={styles.primaryButton} onClick={handleDownload}>
              <Download size={14} /> Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IMPORT DIALOG
// ============================================================
function ImportDialog({ onClose }) {
  const { importData } = useProject();
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState(null);
  
  const handleImport = () => {
    const result = importData(importText);
    setMessage(result);
    if (result.success) {
      setTimeout(onClose, 1500);
    }
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImportText(e.target.result);
      reader.readAsText(file);
    }
  };
  
  return (
    <div style={styles.dialogBackdrop} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.dialogHeader}>
          <h2 style={styles.dialogTitle}>Import</h2>
          <button style={styles.closeButton} onClick={onClose}><X size={20} /></button>
        </div>
        <div style={styles.dialogContent}>
          <div style={styles.importOptions}>
            <label style={styles.fileLabel}>
              <Upload size={16} />
              Upload JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={styles.fileInput}
              />
            </label>
          </div>
          <textarea
            style={styles.exportTextarea}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Or paste JSON here..."
          />
          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.success ? '#4AE24A33' : '#E24A4A33',
              color: message.success ? '#4AE24A' : '#E24A4A'
            }}>
              {message.message}
            </div>
          )}
          <div style={styles.dialogButtons}>
            <button style={styles.primaryButton} onClick={handleImport} disabled={!importText}>
              <Upload size={14} /> Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    overflow: 'hidden'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#252525',
    borderBottom: '1px solid #3A3A3A',
    minHeight: 52
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 24
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  logoIcon: {
    fontSize: 24
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #4A90E2, #8B5CF6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  modeToggle: {
    display: 'flex',
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    padding: 2
  },
  modeButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  modeButtonActive: {
    backgroundColor: '#4A90E2',
    color: '#FFFFFF'
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    border: '1px solid #3A3A3A',
    backgroundColor: '#333',
    color: '#FFFFFF',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 4,
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  mainContent: {
    flex: 1,
    overflow: 'hidden'
  },
  editorLayout: {
    display: 'flex',
    height: '100%'
  },
  leftPanel: {
    width: 280,
    backgroundColor: '#1E1E1E',
    borderRight: '1px solid #3A3A3A',
    padding: 16,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  rightPanel: {
    width: 300,
    backgroundColor: '#1E1E1E',
    borderLeft: '1px solid #3A3A3A',
    padding: 16,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  panelTitle: {
    margin: '0 0 8px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  section: {
    backgroundColor: '#252525',
    borderRadius: 6,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  textInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4
  },
  categoryTab: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#AAAAAA',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
    color: '#FFFFFF'
  },
  partsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    flex: 1,
    overflowY: 'auto'
  },
  partThumbnail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: '#252525',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent'
  },
  partPreview: {
    width: 60,
    height: 60,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  partName: {
    fontSize: 10,
    color: '#AAAAAA',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%'
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 6
  },
  boneTree: {
    maxHeight: 200,
    overflowY: 'auto'
  },
  boneItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    cursor: 'pointer',
    borderRadius: 4,
    fontSize: 12
  },
  expandIcon: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  boneName: {
    flex: 1
  },
  assignedPartBadge: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer'
  },
  label: {
    fontSize: 11,
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    backgroundColor: '#4A90E2',
    border: 'none',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  dangerButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: '#E24A4A33',
    border: '1px solid #E24A4A',
    borderRadius: 4,
    color: '#E24A4A',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    backgroundColor: '#4A90E2',
    border: 'none',
    borderRadius: 4,
    color: '#FFFFFF',
    cursor: 'pointer'
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 'auto'
  },
  animationInputRow: {
    display: 'flex',
    gap: 8
  },
  animationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 200,
    overflowY: 'auto'
  },
  animationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  animationName: {
    flex: 1,
    fontSize: 13
  },
  animationDuration: {
    fontSize: 11,
    color: '#AAAAAA'
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#E24A4A',
    cursor: 'pointer',
    borderRadius: 4
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    cursor: 'pointer'
  },
  timeline: {
    backgroundColor: '#252525',
    borderTop: '1px solid #3A3A3A',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  playbackControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  playButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    cursor: 'pointer'
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16
  },
  speedLabel: {
    fontSize: 12,
    color: '#AAAAAA',
    minWidth: 70
  },
  speedSlider: {
    width: 100
  },
  frameThumbnails: {
    display: 'flex',
    gap: 8
  },
  frameThumbnail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    border: '2px solid #3A3A3A',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  frameNumber: {
    fontSize: 14,
    fontWeight: 600
  },
  durationInput: {
    width: 60,
    padding: '4px 8px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'inherit'
  },
  msLabel: {
    fontSize: 10,
    color: '#666'
  },
  frameInfo: {
    backgroundColor: '#333',
    padding: '8px 12px',
    borderRadius: 4
  },
  frameLabel: {
    fontSize: 12,
    color: '#AAAAAA'
  },
  boneButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4
  },
  boneButton: {
    padding: '6px 10px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textTransform: 'capitalize'
  },
  transformGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  transformLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    textTransform: 'uppercase'
  },
  transformInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  inputLabel: {
    fontSize: 11,
    color: '#666',
    width: 12
  },
  numberInput: {
    width: 60,
    padding: '6px 8px',
    backgroundColor: '#333',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'inherit'
  },
  unitLabel: {
    fontSize: 12,
    color: '#666'
  },
  rotationSlider: {
    flex: 1
  },
  frameOperations: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#2D2D2D',
    overflow: 'hidden'
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair'
  },
  canvasControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#252525',
    padding: '6px 10px',
    borderRadius: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  canvasButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: '#333',
    border: 'none',
    borderRadius: 4,
    color: '#FFFFFF',
    cursor: 'pointer'
  },
  zoomLabel: {
    fontSize: 12,
    color: '#AAAAAA',
    minWidth: 40,
    textAlign: 'center'
  },
  dialogBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  dialog: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    width: 500,
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
  },
  dialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3A3A3A'
  },
  dialogTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#AAAAAA',
    cursor: 'pointer',
    borderRadius: 4
  },
  dialogContent: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  exportOptions: {
    display: 'flex',
    gap: 20
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    cursor: 'pointer'
  },
  exportTextarea: {
    width: '100%',
    height: 200,
    padding: 12,
    backgroundColor: '#1E1E1E',
    border: '1px solid #3A3A3A',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    resize: 'none',
    boxSizing: 'border-box'
  },
  dialogButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end'
  },
  importOptions: {
    display: 'flex',
    justifyContent: 'center'
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    backgroundColor: '#333',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  fileInput: {
    display: 'none'
  },
  message: {
    padding: 12,
    borderRadius: 4,
    fontSize: 13,
    textAlign: 'center'
  }
};
