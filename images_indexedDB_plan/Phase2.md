# Phase 2: Image Upload System

## Phase Overview
**Goal:** Enable users to upload transparent PNG images as custom parts  
**Prerequisites:** Phase 1 (IndexedDB Storage Layer)  
**Estimated Duration:** 2-3 hours  
**Key Deliverables:**
- Upload dialog component
- Drag-and-drop file input
- Image validation and preview
- Part type dropdown selector
- Dimension checking with warnings
- Save to IndexedDB integration

---

## Step-by-Step Implementation

### Step 1: Upload Dialog Component Structure

**Purpose:** Create the modal dialog for uploading new parts

#### Code Implementation

Add this component after the existing dialog components:

```javascript
// ============================================================
// UPLOAD DIALOG
// ============================================================
function UploadDialog({ onClose }) {
  const { savePart, partsLibrary } = useProject();
  
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  
  // Form state
  const [partName, setPartName] = useState('');
  const [partCategory, setPartCategory] = useState('head');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zIndexMod, setZIndexMod] = useState(0);
  
  // Validation state
  const [validation, setValidation] = useState(null);
  const [gridCheck, setGridCheck] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef(null);
  
  // Handle file selection
  const handleFileSelect = async (file) => {
    if (!file) return;
    
    // Reset states
    setSelectedFile(file);
    setPreviewUrl(null);
    setDimensions(null);
    setValidation(null);
    setGridCheck(null);
    setUploadResult(null);
    
    // Auto-generate name from filename
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setPartName(nameWithoutExt);
    
    // Validate file
    const validationResult = await validateImageFile(file);
    setValidation(validationResult);
    
    if (validationResult.valid) {
      // Create preview
      const dataUrl = await readFileAsDataURL(file);
      setPreviewUrl(dataUrl);
      setDimensions(validationResult.dimensions);
      
      // Check grid dimensions
      const gridResult = checkGridDimensions(
        validationResult.dimensions.width,
        validationResult.dimensions.height,
        partCategory
      );
      setGridCheck(gridResult);
    }
  };
  
  // Update grid check when category changes
  useEffect(() => {
    if (dimensions) {
      const gridResult = checkGridDimensions(dimensions.width, dimensions.height, partCategory);
      setGridCheck(gridResult);
    }
  }, [partCategory, dimensions]);
  
  // Handle file input change
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };
  
  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };
  
  // Handle save
  const handleSave = async () => {
    if (!selectedFile || !partName.trim()) return;
    
    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const result = await savePart(
        {
          name: partName.trim(),
          category: partCategory,
          offset: { x: offsetX, y: offsetY },
          zIndexModifier: zIndexMod
        },
        selectedFile
      );
      
      if (result.success) {
        setUploadResult({ success: true, message: `Part "${partName}" saved successfully!` });
        // Clear form after short delay
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewUrl(null);
          setPartName('');
          setUploadResult(null);
        }, 1500);
      } else {
        setUploadResult({ success: false, message: result.error });
      }
    } catch (e) {
      setUploadResult({ success: false, message: e.message });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Get expected dimensions for current category
  const expectedDims = PART_GRID_CONFIG[partCategory];
  
  return (
    <div style={styles.dialogOverlay} onClick={onClose}>
      <div style={styles.uploadDialog} onClick={e => e.stopPropagation()}>
        <div style={styles.dialogHeader}>
          <span>Upload New Part</span>
          <button style={styles.closeButton} onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>
        
        <div style={styles.uploadDialogContent}>
          {/* Left side - File drop zone and preview */}
          <div style={styles.uploadLeftPanel}>
            <div 
              ref={dropZoneRef}
              style={{
                ...styles.dropZone,
                borderColor: isDragging ? '#4A90E2' : validation?.valid === false ? '#EF4444' : '#3A3A3A',
                backgroundColor: isDragging ? 'rgba(74, 144, 226, 0.1)' : '#1E1E1E'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div style={styles.previewContainer}>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={styles.previewImage}
                  />
                  <div style={styles.dimensionsBadge}>
                    {dimensions?.width} × {dimensions?.height}
                  </div>
                </div>
              ) : (
                <div style={styles.dropZoneContent}>
                  <UploadIcon size={48} />
                  <p style={styles.dropZoneText}>
                    Drag & drop a PNG image here
                  </p>
                  <p style={styles.dropZoneSubtext}>
                    or click to browse
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={handleInputChange}
                style={styles.hiddenFileInput}
              />
            </div>
            
            {/* Validation messages */}
            {validation && (
              <div style={styles.validationMessages}>
                {validation.errors.map((err, i) => (
                  <div key={i} style={styles.errorMessage}>⛔ {err}</div>
                ))}
                {validation.warnings.map((warn, i) => (
                  <div key={i} style={styles.warningMessage}>⚠️ {warn}</div>
                ))}
              </div>
            )}
            
            {/* Grid dimension check */}
            {gridCheck && (
              <div style={{
                ...styles.gridCheckMessage,
                backgroundColor: gridCheck.matches ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                borderColor: gridCheck.matches ? '#22C55E' : '#EAB308'
              }}>
                <span style={{ color: gridCheck.matches ? '#22C55E' : '#EAB308' }}>
                  {gridCheck.matches ? '✓' : '⚠'}
                </span>
                <span>{gridCheck.message}</span>
              </div>
            )}
          </div>
          
          {/* Right side - Form fields */}
          <div style={styles.uploadRightPanel}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Part Name *</label>
              <input
                type="text"
                style={styles.formInput}
                value={partName}
                onChange={e => setPartName(e.target.value)}
                placeholder="Enter part name"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Part Type *</label>
              <select
                style={styles.formSelect}
                value={partCategory}
                onChange={e => setPartCategory(e.target.value)}
              >
                {PART_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {expectedDims && (
                <div style={styles.expectedDims}>
                  Expected: {expectedDims.width} × {expectedDims.height} px
                  <br />
                  <span style={styles.expectedDimsNote}>{expectedDims.description}</span>
                </div>
              )}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Offset (optional)</label>
              <div style={styles.offsetInputs}>
                <div style={styles.offsetInput}>
                  <span>X:</span>
                  <input
                    type="number"
                    style={styles.numberInputSmall}
                    value={offsetX}
                    onChange={e => setOffsetX(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div style={styles.offsetInput}>
                  <span>Y:</span>
                  <input
                    type="number"
                    style={styles.numberInputSmall}
                    value={offsetY}
                    onChange={e => setOffsetY(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Z-Index Modifier</label>
              <input
                type="number"
                style={styles.formInput}
                value={zIndexMod}
                onChange={e => setZIndexMod(parseInt(e.target.value) || 0)}
              />
              <div style={styles.formHint}>
                Positive = render in front, Negative = render behind
              </div>
            </div>
            
            {/* Upload result message */}
            {uploadResult && (
              <div style={{
                ...styles.uploadResultMessage,
                backgroundColor: uploadResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: uploadResult.success ? '#22C55E' : '#EF4444'
              }}>
                {uploadResult.message}
              </div>
            )}
            
            {/* Action buttons */}
            <div style={styles.uploadActions}>
              <button 
                style={styles.cancelButton}
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.saveButton,
                  opacity: (!selectedFile || !partName.trim() || isUploading || validation?.valid === false) ? 0.5 : 1
                }}
                onClick={handleSave}
                disabled={!selectedFile || !partName.trim() || isUploading || validation?.valid === false}
              >
                {isUploading ? 'Saving...' : 'Save Part'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Styles to Add

```javascript
// Add to styles object:
uploadDialog: {
  backgroundColor: '#252525',
  borderRadius: 12,
  width: 700,
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
},
uploadDialogContent: {
  display: 'flex',
  gap: 24,
  padding: 24
},
uploadLeftPanel: {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
},
uploadRightPanel: {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 16
},
dropZone: {
  position: 'relative',
  border: '2px dashed #3A3A3A',
  borderRadius: 8,
  padding: 24,
  minHeight: 250,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s'
},
dropZoneContent: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  color: '#666'
},
dropZoneText: {
  fontSize: 14,
  margin: 0
},
dropZoneSubtext: {
  fontSize: 12,
  color: '#555',
  margin: 0
},
hiddenFileInput: {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer'
},
previewContainer: {
  position: 'relative',
  maxWidth: '100%',
  maxHeight: 200
},
previewImage: {
  maxWidth: '100%',
  maxHeight: 200,
  objectFit: 'contain',
  borderRadius: 4,
  backgroundColor: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 16px 16px'
},
dimensionsBadge: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  padding: '4px 8px',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderRadius: 4,
  fontSize: 11,
  color: '#FFF'
},
validationMessages: {
  display: 'flex',
  flexDirection: 'column',
  gap: 4
},
errorMessage: {
  padding: '8px 12px',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  borderRadius: 4,
  fontSize: 12,
  color: '#EF4444'
},
warningMessage: {
  padding: '8px 12px',
  backgroundColor: 'rgba(234, 179, 8, 0.1)',
  borderRadius: 4,
  fontSize: 12,
  color: '#EAB308'
},
gridCheckMessage: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 4,
  border: '1px solid',
  fontSize: 12
},
formGroup: {
  display: 'flex',
  flexDirection: 'column',
  gap: 6
},
formLabel: {
  fontSize: 12,
  color: '#AAAAAA',
  textTransform: 'uppercase'
},
formInput: {
  padding: '10px 12px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #3A3A3A',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 14,
  fontFamily: 'inherit'
},
formSelect: {
  padding: '10px 12px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #3A3A3A',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer'
},
formHint: {
  fontSize: 11,
  color: '#666'
},
expectedDims: {
  marginTop: 4,
  padding: '8px 12px',
  backgroundColor: '#1E1E1E',
  borderRadius: 4,
  fontSize: 11,
  color: '#888'
},
expectedDimsNote: {
  color: '#666',
  fontStyle: 'italic'
},
offsetInputs: {
  display: 'flex',
  gap: 16
},
offsetInput: {
  display: 'flex',
  alignItems: 'center',
  gap: 8
},
numberInputSmall: {
  width: 70,
  padding: '8px 10px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #3A3A3A',
  borderRadius: 4,
  color: '#FFFFFF',
  fontSize: 13,
  fontFamily: 'inherit',
  textAlign: 'center'
},
uploadResultMessage: {
  padding: '12px 16px',
  borderRadius: 6,
  fontSize: 13,
  textAlign: 'center'
},
uploadActions: {
  display: 'flex',
  gap: 12,
  marginTop: 'auto',
  paddingTop: 16
},
cancelButton: {
  flex: 1,
  padding: '12px 20px',
  backgroundColor: '#333',
  border: 'none',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit'
},
saveButton: {
  flex: 1,
  padding: '12px 20px',
  backgroundColor: '#4A90E2',
  border: 'none',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 500
}
```

#### Verification
- [ ] Dialog opens as modal overlay
- [ ] Drag-drop zone responds to file drops
- [ ] File input accepts PNG files
- [ ] Preview shows uploaded image
- [ ] Form fields capture all metadata

---

### Step 2: Add Upload Button to Toolbar

**Purpose:** Provide access to the upload dialog from the main UI

#### Code Implementation

Update the Toolbar component:

```javascript
function Toolbar() {
  const { mode, setMode, setShowExportDialog, setShowImportDialog } = useProject();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  return (
    <>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.logo}>🎭 PuppetJSX</span>
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
          {/* NEW: Upload button */}
          <button 
            style={styles.toolbarButton} 
            onClick={() => setShowUploadDialog(true)} 
            title="Upload Part"
          >
            <PlusIcon size={18} />
          </button>
          <button style={styles.toolbarButton} onClick={() => setShowImportDialog(true)} title="Import">
            <UploadIcon size={18} />
          </button>
          <button style={styles.toolbarButton} onClick={() => setShowExportDialog(true)} title="Export">
            <DownloadIcon size={18} />
          </button>
        </div>
      </div>
      
      {/* Upload dialog */}
      {showUploadDialog && <UploadDialog onClose={() => setShowUploadDialog(false)} />}
    </>
  );
}
```

#### Verification
- [ ] Plus button appears in toolbar
- [ ] Clicking opens upload dialog
- [ ] Dialog closes on cancel or overlay click

---

### Step 3: Update Parts Library to Show Uploaded Parts

**Purpose:** Display uploaded parts alongside default parts

#### Code Implementation

Update the `PartsLibrary` component:

```javascript
function PartsLibrary() {
  const { partsLibrary, selectedBoneId, assignPartToBone } = useProject();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showOnlyUploaded, setShowOnlyUploaded] = useState(false);
  
  const categories = ['all', 'head', 'torso', 'arm', 'hand', 'leg', 'foot', 'weapon', 'accessory'];
  
  const filteredParts = partsLibrary.filter(p => {
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesUploadFilter = !showOnlyUploaded || !p.isDefault;
    return matchesCategory && matchesSearch && matchesUploadFilter;
  });
  
  // Sort: uploaded first, then by name
  const sortedParts = [...filteredParts].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  
  return (
    <div style={styles.leftPanel}>
      <div style={styles.panelHeader}>
        Parts Library
        <span style={styles.partCount}>({filteredParts.length})</span>
      </div>
      <input 
        style={styles.searchInput}
        placeholder="Search parts..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      
      {/* Filter toggle */}
      <div style={styles.filterToggle}>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showOnlyUploaded}
            onChange={e => setShowOnlyUploaded(e.target.checked)}
          />
          Show only uploaded
        </label>
      </div>
      
      <div style={styles.categoryTabs}>
        {categories.map(cat => (
          <button 
            key={cat}
            style={{ ...styles.categoryTab, ...(category === cat ? styles.categoryTabActive : {}) }}
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      
      <div style={styles.partsGrid}>
        {sortedParts.map(part => (
          <div 
            key={part.id}
            style={{
              ...styles.partThumbnail,
              borderColor: !part.isDefault ? '#4A90E2' : 'transparent'
            }}
            onClick={() => selectedBoneId && assignPartToBone(selectedBoneId, part.id)}
            title={`${part.name}${!part.isDefault ? ' (Custom)' : ''} - Click to assign`}
          >
            {part.imageDataUrl ? (
              // Render actual image for uploaded parts
              <img 
                src={part.imageDataUrl} 
                alt={part.name}
                style={styles.partThumbnailImage}
              />
            ) : (
              // Render colored shape for default parts
              <div 
                style={{ 
                  ...styles.partPreview, 
                  backgroundColor: part.color, 
                  borderRadius: part.category === 'head' ? '50%' : 4 
                }} 
              />
            )}
            <span style={styles.partName}>{part.name}</span>
            {!part.isDefault && (
              <span style={styles.customBadge}>Custom</span>
            )}
          </div>
        ))}
        
        {sortedParts.length === 0 && (
          <div style={styles.emptyState}>
            No parts found
          </div>
        )}
      </div>
    </div>
  );
}
```

Add these styles:

```javascript
// Add to styles:
partCount: {
  fontSize: 12,
  color: '#666',
  marginLeft: 8,
  fontWeight: 'normal'
},
filterToggle: {
  padding: '8px 12px'
},
toggleLabel: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: '#888',
  cursor: 'pointer'
},
partThumbnailImage: {
  width: 48,
  height: 48,
  objectFit: 'contain',
  backgroundColor: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 8px 8px',
  borderRadius: 4
},
customBadge: {
  position: 'absolute',
  top: 4,
  right: 4,
  padding: '2px 6px',
  backgroundColor: '#4A90E2',
  borderRadius: 4,
  fontSize: 9,
  color: '#FFF',
  textTransform: 'uppercase'
},
emptyState: {
  gridColumn: '1 / -1',
  padding: 24,
  textAlign: 'center',
  color: '#666',
  fontSize: 13
}
```

Update partThumbnail to allow positioning:

```javascript
partThumbnail: {
  position: 'relative',  // Add this
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: 8,
  backgroundColor: '#2D2D2D',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '2px solid transparent'  // Add this
},
```

#### Verification
- [ ] Uploaded parts appear in library
- [ ] Custom badge shows on uploaded parts
- [ ] Images display instead of colored shapes
- [ ] Filter toggle works
- [ ] Parts sorted with uploaded first

---

### Step 4: Update Canvas Rendering for Images

**Purpose:** Render actual images on canvas instead of just shapes

#### Code Implementation

Update the rendering section in `CanvasViewport`:

```javascript
// In the CanvasViewport render loop, replace the part drawing section:

// Draw parts
for (const item of renderList) {
  ctx.save();
  
  const screenX = centerX + item.position.x * zoom;
  const screenY = centerY + item.position.y * zoom;
  
  ctx.translate(screenX, screenY);
  ctx.rotate(degToRad(item.rotation));
  ctx.scale(item.scale.x, item.scale.y);
  
  // Check if part has an actual image
  if (item.part.imageDataUrl) {
    // Render uploaded image
    const img = imageCache.current.get(item.part.id);
    
    if (img && img.complete) {
      // Get anchor point from grid config
      const gridConfig = PART_GRID_CONFIG[item.part.category] || { anchorX: 0.5, anchorY: 0.5 };
      
      // Calculate scaled dimensions
      const w = item.part.width * zoom * 0.5; // Scale down for display
      const h = item.part.height * zoom * 0.5;
      
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
    } else {
      // Image not loaded yet, draw placeholder
      const w = (item.part.width || 64) * zoom * 0.5;
      const h = (item.part.height || 64) * zoom * 0.5;
      ctx.fillStyle = '#4A90E2';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
    }
  } else {
    // Render default colored shape
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
  }
  
  ctx.restore();
}
```

Add image caching at the top of `CanvasViewport`:

```javascript
function CanvasViewport() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageCache = useRef(new Map());  // Add this line
  
  // ... rest of component ...
  
  // Add image loading effect
  useEffect(() => {
    // Load images for parts that have imageDataUrl
    for (const part of partsLibrary) {
      if (part.imageDataUrl && !imageCache.current.has(part.id)) {
        const img = new Image();
        img.onload = () => {
          // Trigger re-render when image loads
          setImageLoadCount(prev => prev + 1);
        };
        img.src = part.imageDataUrl;
        imageCache.current.set(part.id, img);
      }
    }
    
    // Cleanup: remove cached images for deleted parts
    const partIds = new Set(partsLibrary.map(p => p.id));
    for (const cachedId of imageCache.current.keys()) {
      if (!partIds.has(cachedId)) {
        imageCache.current.delete(cachedId);
      }
    }
  }, [partsLibrary]);
  
  // Add state to trigger re-render on image load
  const [imageLoadCount, setImageLoadCount] = useState(0);
```

#### Verification
- [ ] Uploaded images render on canvas
- [ ] Images scale correctly with zoom
- [ ] Anchor points apply correctly
- [ ] Default parts still render as shapes
- [ ] No memory leaks from image loading

---

### Step 5: Add to Context Provider

**Purpose:** Expose upload dialog state through context

#### Code Implementation

Update the main component state and context:

```javascript
export default function PuppetJSX() {
  // ... existing state ...
  
  // Add upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Add to context value
  const contextValue = {
    // ... existing values ...
    
    // Upload dialog
    showUploadDialog,
    setShowUploadDialog,
  };
  
  // ... rest of component ...
  
  return (
    <ProjectContext.Provider value={contextValue}>
      <div style={styles.app}>
        <Toolbar />
        <div style={styles.mainContent}>
          {mode === 'builder' ? <CharacterBuilder /> : <AnimationEditor />}
        </div>
        {showExportDialog && <ExportDialog onClose={() => setShowExportDialog(false)} />}
        {showImportDialog && <ImportDialog onClose={() => setShowImportDialog(false)} />}
        {showUploadDialog && <UploadDialog onClose={() => setShowUploadDialog(false)} />}
      </div>
    </ProjectContext.Provider>
  );
}
```

Update Toolbar to use context:

```javascript
function Toolbar() {
  const { 
    mode, setMode, 
    setShowExportDialog, setShowImportDialog, setShowUploadDialog 
  } = useProject();
  
  return (
    <div style={styles.toolbar}>
      {/* ... */}
      <div style={styles.toolbarRight}>
        <button 
          style={styles.toolbarButton} 
          onClick={() => setShowUploadDialog(true)} 
          title="Upload Part"
        >
          <PlusIcon size={18} />
        </button>
        {/* ... other buttons ... */}
      </div>
    </div>
  );
}
```

---

## Testing Procedures

### Manual Testing Checklist

1. **Open Upload Dialog**
   - [ ] Click "+" button in toolbar
   - [ ] Dialog appears centered on screen
   - [ ] Overlay dims background
   - [ ] Click outside closes dialog
   - [ ] X button closes dialog

2. **File Selection - Drag & Drop**
   - [ ] Drag PNG over drop zone
   - [ ] Zone highlights with blue border
   - [ ] Drop file loads preview
   - [ ] Name auto-populates from filename

3. **File Selection - Click**
   - [ ] Click drop zone opens file picker
   - [ ] Select PNG file
   - [ ] Preview appears
   - [ ] Dimensions badge shows size

4. **Validation**
   - [ ] Non-image file shows error
   - [ ] Large file (>5MB) shows error
   - [ ] Non-PNG shows warning
   - [ ] No transparency shows warning
   - [ ] Wrong dimensions shows grid warning

5. **Form Input**
   - [ ] Edit part name
   - [ ] Change category dropdown
   - [ ] Expected dimensions update
   - [ ] Grid check updates for new category
   - [ ] Offset fields accept numbers
   - [ ] Z-index field accepts numbers

6. **Save Part**
   - [ ] Save button disabled without file/name
   - [ ] Click Save shows "Saving..."
   - [ ] Success message appears
   - [ ] Form clears after success
   - [ ] Part appears in Parts Library

7. **Parts Library**
   - [ ] Uploaded parts show actual images
   - [ ] Custom badge appears
   - [ ] Filter shows only uploaded parts
   - [ ] Click assigns to selected bone

8. **Canvas Rendering**
   - [ ] Assigned uploaded part renders
   - [ ] Image respects rotation
   - [ ] Image respects scale
   - [ ] Zoom affects image size

9. **Persistence**
   - [ ] Refresh page
   - [ ] Uploaded parts still in library
   - [ ] Character still has custom parts assigned
   - [ ] Images still render

---

## Troubleshooting

### Common Issues

**"Image not loading in preview"**
- Check browser console for errors
- Verify file is valid PNG
- Try smaller file size

**"Part saves but doesn't appear"**
- Check IndexedDB in DevTools
- Verify part has unique ID
- Check `isDefault` is false

**"Image renders wrong size"**
- Verify dimensions in part data
- Check grid config for category
- Adjust anchor points

**"Part disappears after refresh"**
- IndexedDB may be disabled
- Check for storage errors
- Verify `loadUploadedParts` runs

---

## Next Steps

Phase 2 is complete when:
- [ ] Upload dialog fully functional
- [ ] Drag-drop and file picker work
- [ ] Validation shows errors/warnings
- [ ] Grid dimension check works
- [ ] Parts save to IndexedDB
- [ ] Parts appear in library with images
- [ ] Canvas renders uploaded images
- [ ] Parts persist across sessions

**Proceed to Phase 3:** Standardized Grid System

Phase 3 will:
- Refine anchor point calculations
- Add resize options for non-conforming images
- Implement grid overlay preview

---

*Phase 2 Complete - Image Upload System*
