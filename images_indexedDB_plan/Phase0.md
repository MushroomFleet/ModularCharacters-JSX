# PuppetJSX v2 - Phase 0: Overview

## Project Summary

PuppetJSX v2 upgrades the existing skeletal animation system to support **custom image uploads** with **persistent IndexedDB storage**. Art teams can create transparent PNG body parts using standardized grid dimensions, upload them directly into the application, and use them for character assembly and animation.

### Version 2 Goals
1. **Persistent Storage** - Images stored in IndexedDB survive browser sessions
2. **Image Upload System** - Drag-drop or file picker for transparent PNGs
3. **Part Type Mapping** - Dropdown to assign images to bone categories
4. **Standardized Grid Sizes** - Enforced dimensions per body part type
5. **Backward Compatibility** - Default placeholder parts still work

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PuppetJSX v2                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐  │
│  │   UI Layer      │    │   State Layer   │    │   Storage Layer     │  │
│  │                 │    │                 │    │                     │  │
│  │ • Upload Dialog │◄──►│ • React Context │◄──►│ • IndexedDB         │  │
│  │ • Parts Manager │    │ • Parts Library │    │ • Image Blobs       │  │
│  │ • Canvas        │    │ • Characters    │    │ • Part Metadata     │  │
│  │ • Toolbars      │    │ • Animations    │    │ • Export/Import     │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     IndexedDB Schema                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  parts_store:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ id: string (primary key)                                         │    │
│  │ name: string                                                     │    │
│  │ category: 'head'|'torso'|'arm'|'hand'|'leg'|'foot'|'weapon'|... │    │
│  │ imageBlob: Blob (PNG data)                                       │    │
│  │ imageDataUrl: string (for quick rendering)                       │    │
│  │ width: number                                                    │    │
│  │ height: number                                                   │    │
│  │ offset: { x: number, y: number }                                 │    │
│  │ zIndexModifier: number                                           │    │
│  │ isDefault: boolean (built-in vs uploaded)                        │    │
│  │ createdAt: timestamp                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  characters_store:                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ id: string (primary key)                                         │    │
│  │ name: string                                                     │    │
│  │ skeletonId: string                                               │    │
│  │ parts: { [boneId]: partId }                                      │    │
│  │ createdAt: timestamp                                             │    │
│  │ updatedAt: timestamp                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  animations_store:                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ id: string (primary key)                                         │    │
│  │ name: string                                                     │    │
│  │ skeletonId: string                                               │    │
│  │ loop: boolean                                                    │    │
│  │ frames: Frame[]                                                  │    │
│  │ createdAt: timestamp                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Standardized Grid Dimensions

The art team will create assets using these **exact pixel dimensions** for uniform texel density:

| Part Type | Dimensions | Aspect Ratio | Alignment | Notes |
|-----------|------------|--------------|-----------|-------|
| **Hand** | 128 × 128 | 1:1 | Center | Small square |
| **Foot** | 128 × 128 | 1:1 | Center | Small square |
| **Arm** | 128 × 256 | 1:2 | Center | Vertical rectangle |
| **Leg** | 128 × 256 | 1:2 | Center | Vertical rectangle |
| **Torso** | 256 × 384 | 2:3 | Center | Large body piece |
| **Head** | 256 × 256 | 1:1 | Bottom edge | Anchored at neck |
| **Weapon** | 128 × 384 | 1:3 | Top (handle) | Long vertical |
| **Accessory** | 128 × 128 | 1:1 | Center | Shields, items |

### Grid Configuration Object

```javascript
const PART_GRID_CONFIG = {
  head: { 
    width: 256, 
    height: 256, 
    anchorX: 0.5,    // Center horizontal
    anchorY: 1.0,    // Bottom edge (neck attachment)
    label: 'Head (256×256)'
  },
  torso: { 
    width: 256, 
    height: 384, 
    anchorX: 0.5, 
    anchorY: 0.5,    // Center
    label: 'Torso (256×384)'
  },
  arm: { 
    width: 128, 
    height: 256, 
    anchorX: 0.5, 
    anchorY: 0.0,    // Top (shoulder attachment)
    label: 'Arm (128×256)'
  },
  hand: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.0,    // Top (wrist attachment)
    label: 'Hand (128×128)'
  },
  leg: { 
    width: 128, 
    height: 256, 
    anchorX: 0.5, 
    anchorY: 0.0,    // Top (hip attachment)
    label: 'Leg (128×256)'
  },
  foot: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.0,    // Top (ankle attachment)
    label: 'Foot (128×128)'
  },
  weapon: { 
    width: 128, 
    height: 384, 
    anchorX: 0.5, 
    anchorY: 0.85,   // Near bottom (handle grip point)
    label: 'Weapon (128×384)'
  },
  accessory: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.5,
    label: 'Accessory (128×128)'
  }
};
```

---

## Phase Breakdown

### Phase 1: IndexedDB Storage Layer
**Goal:** Create persistent storage system for parts, characters, and animations  
**Duration:** 2-3 hours  
**Dependencies:** None  
**Deliverables:**
- IndexedDB initialization and schema
- CRUD operations for parts (create, read, update, delete)
- Image blob storage and retrieval
- Database migration system
- Storage hooks (`useIndexedDB`)

### Phase 2: Image Upload System
**Goal:** Enable users to upload transparent PNG images as parts  
**Duration:** 2-3 hours  
**Dependencies:** Phase 1  
**Deliverables:**
- Upload dialog component
- File input with drag-drop support
- Image validation (format, transparency, dimensions)
- Part type dropdown selector
- Preview before save
- Automatic dimension detection and warnings

### Phase 3: Standardized Grid System
**Goal:** Implement and enforce standardized part dimensions  
**Duration:** 1-2 hours  
**Dependencies:** Phase 2  
**Deliverables:**
- Grid configuration constants
- Dimension validation on upload
- Canvas rendering updates for actual images
- Anchor point calculations
- Resize/scale handling

### Phase 4: Parts Manager UI
**Goal:** Full management interface for uploaded parts  
**Duration:** 2-3 hours  
**Dependencies:** Phase 3  
**Deliverables:**
- Parts Manager panel (view all uploaded parts)
- Delete part functionality with confirmation
- Edit part metadata (name, category, offset)
- Search and filter by category
- Bulk operations (delete selected)
- Default vs uploaded part distinction

### Phase 5: Demo Update
**Goal:** Update demo.html with all v2 features  
**Duration:** 1-2 hours  
**Dependencies:** Phase 4  
**Deliverables:**
- Self-contained demo with IndexedDB
- Upload demonstration
- Sample workflow documentation
- Browser compatibility notes

---

## Success Criteria

### Functional Requirements
- [ ] Images persist across browser sessions
- [ ] Upload accepts only transparent PNGs
- [ ] Part type dropdown maps to bone categories
- [ ] Uploaded parts appear in Parts Library
- [ ] Uploaded parts render correctly on canvas
- [ ] Character export includes part references (not embedded images)
- [ ] Parts can be deleted without breaking existing characters

### Non-Functional Requirements
- [ ] IndexedDB operations complete in < 100ms
- [ ] Image upload with preview in < 500ms
- [ ] No memory leaks from image blob URLs
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Graceful degradation if IndexedDB unavailable

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 | UI components and state |
| Storage | IndexedDB | Persistent browser storage |
| Images | Blob + Data URL | Image storage and rendering |
| Icons | lucide-react | UI icons |
| Styling | Inline styles | Self-contained component |

### Key APIs Used
- `indexedDB.open()` - Database initialization
- `IDBObjectStore.put()` - Insert/update records
- `IDBObjectStore.delete()` - Remove records
- `IDBObjectStore.getAll()` - Retrieve all records
- `FileReader.readAsDataURL()` - Convert blob to data URL
- `URL.createObjectURL()` - Temporary blob URLs
- `URL.revokeObjectURL()` - Cleanup blob URLs

---

## Data Flow

### Upload Flow
```
User selects PNG file
       │
       ▼
Validate file type (PNG only)
       │
       ▼
Read as ArrayBuffer + DataURL
       │
       ▼
Detect dimensions (width × height)
       │
       ▼
Check against PART_GRID_CONFIG
       │
       ├── Exact match → Show green checkmark
       │
       └── Mismatch → Show warning, allow anyway
       │
       ▼
User selects part type from dropdown
       │
       ▼
User enters part name
       │
       ▼
Save to IndexedDB (parts_store)
       │
       ▼
Update React state (partsLibrary)
       │
       ▼
Part appears in Parts Library panel
```

### Render Flow
```
Character has part assignment
       │
       ▼
Look up part in partsLibrary
       │
       ▼
Check if part has imageDataUrl
       │
       ├── Yes → Draw image on canvas
       │
       └── No → Draw colored placeholder shape
       │
       ▼
Apply transform (position, rotation, scale)
       │
       ▼
Apply anchor point offset
       │
       ▼
Render at correct z-index
```

---

## File Changes Summary

### PuppetJSX.jsx Modifications

| Section | Changes |
|---------|---------|
| Constants | Add `PART_GRID_CONFIG`, `DB_NAME`, `DB_VERSION` |
| Utilities | Add IndexedDB helper functions |
| Hooks | Add `useIndexedDB` hook |
| State | Add `uploadedParts`, `dbReady` |
| Context | Expose storage actions |
| Components | Add `UploadDialog`, `PartsManager` |
| Canvas | Update render to handle real images |
| Styles | Add new dialog and manager styles |

### New Components

```
PuppetJSX (updated)
├── Toolbar (updated - add Parts Manager button)
├── UploadDialog (NEW)
│   ├── FileDropZone
│   ├── DimensionValidator
│   ├── PartTypeSelector
│   └── PreviewPanel
├── PartsManager (NEW)
│   ├── PartsList
│   ├── PartEditor
│   └── DeleteConfirmation
├── CharacterBuilder (updated)
│   └── PartsLibrary (updated - show uploaded parts)
└── CanvasViewport (updated - render real images)
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB quota exceeded | High | Implement storage usage indicator, warn at 80% |
| Browser doesn't support IndexedDB | Medium | Fallback to in-memory only with warning |
| Large images slow rendering | Medium | Recommend max dimensions, lazy load thumbnails |
| Data loss on DB corruption | High | Export/import functionality, version backups |
| Memory leaks from blob URLs | Medium | Proper cleanup with `revokeObjectURL` |

---

## Migration Path

### From v1 to v2

1. **Existing default parts** remain as JavaScript objects (no migration needed)
2. **New uploaded parts** go into IndexedDB
3. **Part IDs** use prefix convention:
   - Default: `head_basic`, `torso_armor` (no prefix)
   - Uploaded: `custom_[timestamp]_[name]`
4. **Character data** stores part IDs, works with both types
5. **Export format** unchanged (part references, not embedded images)

---

## Testing Strategy

### Unit Tests
- IndexedDB CRUD operations
- Image validation functions
- Dimension checking logic
- Anchor point calculations

### Integration Tests
- Upload → Save → Retrieve → Render cycle
- Character creation with custom parts
- Export/Import with custom parts
- Delete part with active usage

### Manual Tests
- Drag-drop upload
- Multiple file upload
- Invalid file type rejection
- Dimension mismatch warning
- Cross-browser compatibility
- Storage persistence across sessions

---

## Next Steps

After reviewing this Phase 0 overview:

1. **Proceed to Phase 1** for IndexedDB implementation
2. **Create substages** if any phase needs further breakdown
3. **Begin implementation** following phase documents sequentially

---

## Document Index

| Document | Status | Description |
|----------|--------|-------------|
| Phase0.md | ✅ Complete | This overview document |
| Phase1.md | 📝 Pending | IndexedDB Storage Layer |
| Phase2.md | 📝 Pending | Image Upload System |
| Phase3.md | 📝 Pending | Standardized Grid System |
| Phase4.md | 📝 Pending | Parts Manager UI |
| Phase5.md | 📝 Pending | Demo Update |

---

*PuppetJSX v2 - Enabling custom art assets for modular character animation*
