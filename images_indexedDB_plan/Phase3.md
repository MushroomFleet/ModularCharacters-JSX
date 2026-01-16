# Phase 3: Standardized Grid System

## Phase Overview
**Goal:** Implement and enforce standardized part dimensions with proper anchor points  
**Prerequisites:** Phase 1 (Storage), Phase 2 (Upload)  
**Estimated Duration:** 1-2 hours  
**Key Deliverables:**
- Visual dimension guide in upload dialog
- Anchor point visualization
- Scale-to-fit option for non-conforming images
- Grid overlay on preview

---

## Dimension Specification Reference

| Part Type | Dimensions | Anchor Point | Attachment Description |
|-----------|------------|--------------|------------------------|
| Head | 256 × 256 | Bottom center (0.5, 1.0) | Neck sits at bottom edge |
| Torso | 256 × 384 | Center (0.5, 0.5) | Body center pivot |
| Arm | 128 × 256 | Top center (0.5, 0.0) | Shoulder at top |
| Hand | 128 × 128 | Top center (0.5, 0.0) | Wrist at top |
| Leg | 128 × 256 | Top center (0.5, 0.0) | Hip at top |
| Foot | 128 × 128 | Top center (0.5, 0.0) | Ankle at top |
| Weapon | 128 × 384 | Lower center (0.5, 0.85) | Grip point near bottom |
| Accessory | 128 × 128 | Center (0.5, 0.5) | Flexible placement |

---

## Step-by-Step Implementation

### Step 1: Grid Reference Component

**Purpose:** Show visual guide for expected dimensions

```javascript
// ============================================================
// GRID REFERENCE COMPONENT
// ============================================================
function GridReference({ category }) {
  const config = PART_GRID_CONFIG[category];
  if (!config) return null;
  
  // Scale to fit in preview area (max 150px)
  const maxSize = 150;
  const scale = Math.min(maxSize / config.width, maxSize / config.height);
  const displayWidth = config.width * scale;
  const displayHeight = config.height * scale;
  
  // Anchor position
  const anchorX = displayWidth * config.anchorX;
  const anchorY = displayHeight * config.anchorY;
  
  return (
    <div style={styles.gridReference}>
      <div style={styles.gridRefTitle}>Expected Layout</div>
      <div style={styles.gridRefContainer}>
        <div 
          style={{
            ...styles.gridRefBox,
            width: displayWidth,
            height: displayHeight
          }}
        >
          {/* Grid lines */}
          <div style={styles.gridRefCenter} />
          
          {/* Anchor point indicator */}
          <div 
            style={{
              ...styles.anchorPoint,
              left: anchorX - 6,
              top: anchorY - 6
            }}
          />
          
          {/* Dimension labels */}
          <div style={styles.gridRefWidthLabel}>{config.width}px</div>
          <div style={styles.gridRefHeightLabel}>{config.height}px</div>
        </div>
      </div>
      <div style={styles.gridRefInfo}>
        <div>Anchor: {config.anchorX === 0.5 ? 'Center' : config.anchorX < 0.5 ? 'Left' : 'Right'} {config.anchorY === 0 ? 'Top' : config.anchorY === 1 ? 'Bottom' : 'Middle'}</div>
        <div style={styles.gridRefDesc}>{config.description}</div>
      </div>
    </div>
  );
}

// Styles:
gridReference: {
  backgroundColor: '#1E1E1E',
  borderRadius: 8,
  padding: 12,
  marginTop: 8
},
gridRefTitle: {
  fontSize: 11,
  color: '#888',
  textTransform: 'uppercase',
  marginBottom: 12,
  textAlign: 'center'
},
gridRefContainer: {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 12
},
gridRefBox: {
  position: 'relative',
  border: '2px dashed #4A90E2',
  borderRadius: 4,
  backgroundColor: 'rgba(74, 144, 226, 0.05)'
},
gridRefCenter: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100%',
  height: '100%',
  transform: 'translate(-50%, -50%)',
  borderTop: '1px dashed rgba(255,255,255,0.2)',
  borderLeft: '1px dashed rgba(255,255,255,0.2)'
},
anchorPoint: {
  position: 'absolute',
  width: 12,
  height: 12,
  backgroundColor: '#22C55E',
  borderRadius: '50%',
  border: '2px solid #FFF',
  boxShadow: '0 0 4px rgba(0,0,0,0.5)'
},
gridRefWidthLabel: {
  position: 'absolute',
  bottom: -20,
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 10,
  color: '#888'
},
gridRefHeightLabel: {
  position: 'absolute',
  right: -30,
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: 10,
  color: '#888'
},
gridRefInfo: {
  textAlign: 'center',
  fontSize: 11,
  color: '#888'
},
gridRefDesc: {
  marginTop: 4,
  fontStyle: 'italic',
  color: '#666'
}
```

### Step 2: Dimension Mismatch Handler

**Purpose:** Provide options when image doesn't match expected dimensions

```javascript
// Add to UploadDialog component:

const [scalingOption, setScalingOption] = useState('none'); // 'none', 'fit', 'crop'

// Calculate dimension match status
const dimensionStatus = useMemo(() => {
  if (!dimensions || !partCategory) return null;
  
  const expected = PART_GRID_CONFIG[partCategory];
  if (!expected) return { match: true };
  
  const matchesWidth = dimensions.width === expected.width;
  const matchesHeight = dimensions.height === expected.height;
  const matchesRatio = Math.abs((dimensions.width / dimensions.height) - (expected.width / expected.height)) < 0.01;
  
  return {
    match: matchesWidth && matchesHeight,
    matchesRatio,
    expected,
    actual: dimensions,
    widthDiff: dimensions.width - expected.width,
    heightDiff: dimensions.height - expected.height
  };
}, [dimensions, partCategory]);

// Render dimension status with options:
{dimensionStatus && !dimensionStatus.match && (
  <div style={styles.dimensionWarning}>
    <div style={styles.dimWarningHeader}>
      <span style={styles.warningIcon}>⚠️</span>
      <span>Dimension Mismatch</span>
    </div>
    <div style={styles.dimWarningBody}>
      <div>
        <strong>Expected:</strong> {dimensionStatus.expected.width} × {dimensionStatus.expected.height}
      </div>
      <div>
        <strong>Uploaded:</strong> {dimensionStatus.actual.width} × {dimensionStatus.actual.height}
      </div>
    </div>
    
    <div style={styles.scalingOptions}>
      <label style={styles.scalingOption}>
        <input
          type="radio"
          name="scaling"
          value="none"
          checked={scalingOption === 'none'}
          onChange={() => setScalingOption('none')}
        />
        <span>Keep original size</span>
      </label>
      
      {dimensionStatus.matchesRatio && (
        <label style={styles.scalingOption}>
          <input
            type="radio"
            name="scaling"
            value="fit"
            checked={scalingOption === 'fit'}
            onChange={() => setScalingOption('fit')}
          />
          <span>Scale to fit (maintains ratio)</span>
        </label>
      )}
    </div>
    
    <div style={styles.dimWarningNote}>
      Non-standard dimensions may affect alignment with other parts
    </div>
  </div>
)}

// Styles:
dimensionWarning: {
  backgroundColor: 'rgba(234, 179, 8, 0.1)',
  border: '1px solid #EAB308',
  borderRadius: 8,
  padding: 12,
  marginTop: 12
},
dimWarningHeader: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  fontWeight: 500,
  color: '#EAB308'
},
warningIcon: {
  fontSize: 16
},
dimWarningBody: {
  fontSize: 12,
  color: '#CCC',
  marginBottom: 12
},
scalingOptions: {
  display: 'flex',
  flexDirection: 'column',
  gap: 8
},
scalingOption: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  cursor: 'pointer',
  color: '#AAA'
},
dimWarningNote: {
  marginTop: 12,
  fontSize: 11,
  color: '#888',
  fontStyle: 'italic'
}
```

### Step 3: Update Save Logic for Scaling

**Purpose:** Apply scaling option when saving

```javascript
// Update handleSave in UploadDialog:

const handleSave = async () => {
  if (!selectedFile || !partName.trim()) return;
  
  setIsUploading(true);
  setUploadResult(null);
  
  try {
    // Prepare part data with scaling info
    const partData = {
      name: partName.trim(),
      category: partCategory,
      offset: { x: offsetX, y: offsetY },
      zIndexModifier: zIndexMod
    };
    
    // Calculate display scale if scaling option selected
    if (scalingOption === 'fit' && dimensionStatus && !dimensionStatus.match) {
      const scaleX = dimensionStatus.expected.width / dimensionStatus.actual.width;
      const scaleY = dimensionStatus.expected.height / dimensionStatus.actual.height;
      const scale = Math.min(scaleX, scaleY);
      
      partData.displayScale = scale;
      partData.displayWidth = Math.round(dimensionStatus.actual.width * scale);
      partData.displayHeight = Math.round(dimensionStatus.actual.height * scale);
    }
    
    const result = await savePart(partData, selectedFile);
    
    // ... rest of save logic ...
  } catch (e) {
    // ... error handling ...
  }
};
```

### Step 4: Update Canvas Rendering with Display Scale

**Purpose:** Respect displayScale when rendering parts

```javascript
// In CanvasViewport render loop:

if (item.part.imageDataUrl) {
  const img = imageCache.current.get(item.part.id);
  
  if (img && img.complete) {
    const gridConfig = PART_GRID_CONFIG[item.part.category] || { anchorX: 0.5, anchorY: 0.5 };
    
    // Use display dimensions if set, otherwise original
    const partWidth = item.part.displayWidth || item.part.width;
    const partHeight = item.part.displayHeight || item.part.height;
    
    // Scale for canvas display
    const displayScale = 0.5; // Overall canvas scale
    const w = partWidth * zoom * displayScale;
    const h = partHeight * zoom * displayScale;
    
    // Apply anchor offset
    const anchorOffsetX = (gridConfig.anchorX - 0.5) * w;
    const anchorOffsetY = (gridConfig.anchorY - 0.5) * h;
    
    ctx.drawImage(
      img, 
      -w / 2 + anchorOffsetX, 
      -h / 2 + anchorOffsetY, 
      w, 
      h
    );
  }
}
```

### Step 5: Add Grid Preview Overlay

**Purpose:** Show grid overlay on uploaded image preview

```javascript
// Add to upload dialog preview section:

{previewUrl && (
  <div style={styles.previewContainer}>
    <img 
      src={previewUrl} 
      alt="Preview" 
      style={styles.previewImage}
    />
    
    {/* Grid overlay showing expected dimensions */}
    {dimensionStatus && !dimensionStatus.match && (
      <div 
        style={{
          ...styles.gridOverlay,
          width: `${(dimensionStatus.expected.width / dimensionStatus.actual.width) * 100}%`,
          height: `${(dimensionStatus.expected.height / dimensionStatus.actual.height) * 100}%`
        }}
      >
        <span style={styles.gridOverlayLabel}>Expected Size</span>
      </div>
    )}
    
    <div style={styles.dimensionsBadge}>
      {dimensions?.width} × {dimensions?.height}
    </div>
  </div>
)}

// Styles:
gridOverlay: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  border: '2px dashed #4A90E2',
  borderRadius: 4,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
},
gridOverlayLabel: {
  backgroundColor: 'rgba(74, 144, 226, 0.8)',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  color: '#FFF'
}
```

---

## Testing Procedures

### Grid Reference Tests
- [ ] Grid reference shows for each category
- [ ] Anchor point visible at correct position
- [ ] Dimensions displayed correctly

### Dimension Matching Tests
- [ ] Exact match shows green check
- [ ] Mismatch shows warning
- [ ] Scaling options appear for wrong size
- [ ] "Keep original" option works
- [ ] "Scale to fit" option works

### Rendering Tests
- [ ] Parts render at correct size
- [ ] Anchor points align properly
- [ ] Head attaches at neck correctly
- [ ] Arms attach at shoulders
- [ ] Legs attach at hips

---

## Next Steps

Phase 3 is complete when:
- [ ] Grid reference component works
- [ ] Dimension warnings display
- [ ] Scaling options functional
- [ ] Canvas respects display scale
- [ ] Grid overlay on preview

**Proceed to Phase 4:** Parts Manager UI

---

*Phase 3 Complete - Standardized Grid System*
