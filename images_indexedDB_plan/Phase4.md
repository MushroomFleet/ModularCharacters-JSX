# Phase 4: Parts Manager UI

## Phase Overview
**Goal:** Create a full management interface for uploaded parts  
**Prerequisites:** Phases 1-3  
**Estimated Duration:** 2-3 hours  
**Key Deliverables:**
- Parts Manager panel/dialog
- Delete part functionality
- Edit part metadata
- Bulk operations
- Storage usage indicator

---

## Step-by-Step Implementation

### Step 1: Parts Manager Dialog Component

**Purpose:** Full-featured interface for managing uploaded parts

```javascript
// ============================================================
// PARTS MANAGER DIALOG
// ============================================================
function PartsManagerDialog({ onClose }) {
  const { 
    uploadedParts, 
    removePart, 
    updatePartData,
    getStorageStats,
    setShowUploadDialog
  } = useProject();
  
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [editingPart, setEditingPart] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, category
  const [storageStats, setStorageStats] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'selected' or part id
  
  // Load storage stats
  useEffect(() => {
    getStorageStats().then(setStorageStats);
  }, [uploadedParts, getStorageStats]);
  
  // Filter and sort parts
  const filteredParts = useMemo(() => {
    let parts = [...uploadedParts];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      parts = parts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      parts = parts.filter(p => p.category === filterCategory);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        parts.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        parts.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'name':
        parts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        parts.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }
    
    return parts;
  }, [uploadedParts, searchQuery, filterCategory, sortBy]);
  
  // Toggle selection
  const toggleSelection = (partId) => {
    setSelectedParts(prev => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  };
  
  // Select all visible
  const selectAll = () => {
    setSelectedParts(new Set(filteredParts.map(p => p.id)));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedParts(new Set());
  };
  
  // Handle delete
  const handleDelete = async () => {
    const idsToDelete = deleteTarget === 'selected' 
      ? Array.from(selectedParts)
      : [deleteTarget];
    
    for (const id of idsToDelete) {
      await removePart(id);
    }
    
    setSelectedParts(new Set());
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };
  
  // Confirm delete dialog
  const confirmDelete = (target) => {
    setDeleteTarget(target);
    setShowDeleteConfirm(true);
  };
  
  return (
    <div style={styles.dialogOverlay} onClick={onClose}>
      <div style={styles.partsManagerDialog} onClick={e => e.stopPropagation()}>
        <div style={styles.dialogHeader}>
          <span>Parts Manager</span>
          <div style={styles.headerActions}>
            <button 
              style={styles.headerButton}
              onClick={() => {
                setShowUploadDialog(true);
                onClose();
              }}
            >
              <PlusIcon size={16} /> Upload New
            </button>
            <button style={styles.closeButton} onClick={onClose}>
              <XIcon size={20} />
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div style={styles.managerToolbar}>
          <input
            type="text"
            placeholder="Search parts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.managerSearch}
          />
          
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            style={styles.managerSelect}
          >
            <option value="all">All Categories</option>
            {PART_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={styles.managerSelect}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="category">Category</option>
          </select>
        </div>
        
        {/* Selection toolbar */}
        {selectedParts.size > 0 && (
          <div style={styles.selectionBar}>
            <span>{selectedParts.size} selected</span>
            <button style={styles.selectionButton} onClick={clearSelection}>
              Clear
            </button>
            <button 
              style={{...styles.selectionButton, ...styles.deleteButton}}
              onClick={() => confirmDelete('selected')}
            >
              <TrashIcon size={14} /> Delete Selected
            </button>
          </div>
        )}
        
        {/* Parts list */}
        <div style={styles.partsListContainer}>
          {filteredParts.length === 0 ? (
            <div style={styles.emptyManager}>
              {uploadedParts.length === 0 ? (
                <>
                  <p>No custom parts uploaded yet</p>
                  <button 
                    style={styles.uploadPromptButton}
                    onClick={() => {
                      setShowUploadDialog(true);
                      onClose();
                    }}
                  >
                    Upload Your First Part
                  </button>
                </>
              ) : (
                <p>No parts match your search</p>
              )}
            </div>
          ) : (
            <div style={styles.partsList}>
              {/* Header row */}
              <div style={styles.partsListHeader}>
                <div style={styles.selectAllCell}>
                  <input
                    type="checkbox"
                    checked={selectedParts.size === filteredParts.length && filteredParts.length > 0}
                    onChange={() => selectedParts.size === filteredParts.length ? clearSelection() : selectAll()}
                  />
                </div>
                <div style={styles.thumbnailCell}>Image</div>
                <div style={styles.nameCell}>Name</div>
                <div style={styles.categoryCell}>Category</div>
                <div style={styles.dimensionsCell}>Dimensions</div>
                <div style={styles.dateCell}>Added</div>
                <div style={styles.actionsCell}>Actions</div>
              </div>
              
              {/* Part rows */}
              {filteredParts.map(part => (
                <div 
                  key={part.id} 
                  style={{
                    ...styles.partRow,
                    backgroundColor: selectedParts.has(part.id) ? 'rgba(74, 144, 226, 0.1)' : 'transparent'
                  }}
                >
                  <div style={styles.selectAllCell}>
                    <input
                      type="checkbox"
                      checked={selectedParts.has(part.id)}
                      onChange={() => toggleSelection(part.id)}
                    />
                  </div>
                  
                  <div style={styles.thumbnailCell}>
                    {part.imageDataUrl && (
                      <img 
                        src={part.imageDataUrl} 
                        alt={part.name}
                        style={styles.rowThumbnail}
                      />
                    )}
                  </div>
                  
                  <div style={styles.nameCell}>
                    <span style={styles.partNameText}>{part.name}</span>
                  </div>
                  
                  <div style={styles.categoryCell}>
                    <span style={styles.categoryBadge}>{part.category}</span>
                  </div>
                  
                  <div style={styles.dimensionsCell}>
                    {part.width} × {part.height}
                  </div>
                  
                  <div style={styles.dateCell}>
                    {new Date(part.createdAt).toLocaleDateString()}
                  </div>
                  
                  <div style={styles.actionsCell}>
                    <button 
                      style={styles.actionIconButton}
                      onClick={() => setEditingPart(part)}
                      title="Edit"
                    >
                      <SettingsIcon size={14} />
                    </button>
                    <button 
                      style={{...styles.actionIconButton, color: '#EF4444'}}
                      onClick={() => confirmDelete(part.id)}
                      title="Delete"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with stats */}
        <div style={styles.managerFooter}>
          <div style={styles.storageStats}>
            {storageStats && (
              <>
                <span>{storageStats.parts} parts</span>
                <span>•</span>
                <span>{storageStats.estimatedSizeMB} MB used</span>
              </>
            )}
          </div>
        </div>
        
        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div style={styles.confirmOverlay}>
            <div style={styles.confirmDialog}>
              <h3 style={styles.confirmTitle}>Confirm Delete</h3>
              <p style={styles.confirmText}>
                {deleteTarget === 'selected' 
                  ? `Delete ${selectedParts.size} selected parts?`
                  : 'Delete this part?'
                }
              </p>
              <p style={styles.confirmWarning}>
                This action cannot be undone. Characters using these parts will show missing assets.
              </p>
              <div style={styles.confirmButtons}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  style={{...styles.saveButton, backgroundColor: '#EF4444'}}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit dialog */}
        {editingPart && (
          <PartEditDialog 
            part={editingPart} 
            onClose={() => setEditingPart(null)}
            onSave={async (updates) => {
              await updatePartData(editingPart.id, updates);
              setEditingPart(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
```

### Step 2: Part Edit Dialog

**Purpose:** Edit metadata for existing parts

```javascript
function PartEditDialog({ part, onClose, onSave }) {
  const [name, setName] = useState(part.name);
  const [category, setCategory] = useState(part.category);
  const [offsetX, setOffsetX] = useState(part.offset?.x || 0);
  const [offsetY, setOffsetY] = useState(part.offset?.y || 0);
  const [zIndexMod, setZIndexMod] = useState(part.zIndexModifier || 0);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      name: name.trim(),
      category,
      offset: { x: offsetX, y: offsetY },
      zIndexModifier: zIndexMod
    });
    setIsSaving(false);
  };
  
  return (
    <div style={styles.confirmOverlay} onClick={onClose}>
      <div style={styles.editDialog} onClick={e => e.stopPropagation()}>
        <h3 style={styles.editTitle}>Edit Part</h3>
        
        <div style={styles.editPreview}>
          {part.imageDataUrl && (
            <img src={part.imageDataUrl} alt={part.name} style={styles.editPreviewImage} />
          )}
          <div style={styles.editDimensions}>
            {part.width} × {part.height} px
          </div>
        </div>
        
        <div style={styles.editForm}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Name</label>
            <input
              type="text"
              style={styles.formInput}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Category</label>
            <select
              style={styles.formSelect}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {PART_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Offset</label>
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
          </div>
        </div>
        
        <div style={styles.editActions}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            style={styles.saveButton} 
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Add Parts Manager Button to Toolbar

```javascript
// Update Toolbar component:
function Toolbar() {
  const { 
    mode, setMode, 
    setShowExportDialog, setShowImportDialog, setShowUploadDialog 
  } = useProject();
  
  const [showPartsManager, setShowPartsManager] = useState(false);
  
  return (
    <>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.logo}>🎭 PuppetJSX</span>
          <div style={styles.modeToggle}>
            {/* ... mode buttons ... */}
          </div>
        </div>
        <div style={styles.toolbarRight}>
          <button 
            style={styles.toolbarButton} 
            onClick={() => setShowUploadDialog(true)} 
            title="Upload Part"
          >
            <PlusIcon size={18} />
          </button>
          <button 
            style={styles.toolbarButton} 
            onClick={() => setShowPartsManager(true)} 
            title="Manage Parts"
          >
            <LayersIcon size={18} />
          </button>
          <button style={styles.toolbarButton} onClick={() => setShowImportDialog(true)} title="Import">
            <UploadIcon size={18} />
          </button>
          <button style={styles.toolbarButton} onClick={() => setShowExportDialog(true)} title="Export">
            <DownloadIcon size={18} />
          </button>
        </div>
      </div>
      
      {showPartsManager && (
        <PartsManagerDialog onClose={() => setShowPartsManager(false)} />
      )}
    </>
  );
}
```

### Step 4: Styles for Parts Manager

```javascript
// Add to styles object:
partsManagerDialog: {
  backgroundColor: '#252525',
  borderRadius: 12,
  width: 900,
  maxWidth: '95vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
},
headerActions: {
  display: 'flex',
  alignItems: 'center',
  gap: 12
},
headerButton: {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: '#4A90E2',
  border: 'none',
  borderRadius: 6,
  color: '#FFF',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit'
},
managerToolbar: {
  display: 'flex',
  gap: 12,
  padding: '12px 20px',
  borderBottom: '1px solid #3A3A3A'
},
managerSearch: {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #3A3A3A',
  borderRadius: 6,
  color: '#FFF',
  fontSize: 13,
  fontFamily: 'inherit'
},
managerSelect: {
  padding: '8px 12px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #3A3A3A',
  borderRadius: 6,
  color: '#FFF',
  fontSize: 13,
  fontFamily: 'inherit',
  cursor: 'pointer'
},
selectionBar: {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 20px',
  backgroundColor: 'rgba(74, 144, 226, 0.1)',
  borderBottom: '1px solid #3A3A3A'
},
selectionButton: {
  padding: '6px 12px',
  backgroundColor: '#333',
  border: 'none',
  borderRadius: 4,
  color: '#FFF',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit'
},
deleteButton: {
  backgroundColor: '#7F1D1D',
  color: '#FCA5A5',
  display: 'flex',
  alignItems: 'center',
  gap: 6
},
partsListContainer: {
  flex: 1,
  overflow: 'auto'
},
partsList: {
  minWidth: 700
},
partsListHeader: {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
  backgroundColor: '#1E1E1E',
  borderBottom: '1px solid #3A3A3A',
  fontSize: 11,
  color: '#888',
  textTransform: 'uppercase',
  position: 'sticky',
  top: 0
},
partRow: {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
  borderBottom: '1px solid #2D2D2D',
  transition: 'background-color 0.2s'
},
selectAllCell: { width: 40 },
thumbnailCell: { width: 60 },
nameCell: { flex: 1, minWidth: 150 },
categoryCell: { width: 100 },
dimensionsCell: { width: 100 },
dateCell: { width: 100 },
actionsCell: { width: 80, display: 'flex', gap: 8, justifyContent: 'flex-end' },
rowThumbnail: {
  width: 40,
  height: 40,
  objectFit: 'contain',
  backgroundColor: '#1E1E1E',
  borderRadius: 4
},
partNameText: {
  fontWeight: 500
},
categoryBadge: {
  padding: '4px 8px',
  backgroundColor: '#333',
  borderRadius: 4,
  fontSize: 11,
  textTransform: 'capitalize'
},
actionIconButton: {
  padding: 6,
  backgroundColor: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
},
emptyManager: {
  padding: 48,
  textAlign: 'center',
  color: '#666'
},
uploadPromptButton: {
  marginTop: 16,
  padding: '12px 24px',
  backgroundColor: '#4A90E2',
  border: 'none',
  borderRadius: 6,
  color: '#FFF',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit'
},
managerFooter: {
  padding: '12px 20px',
  borderTop: '1px solid #3A3A3A',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
},
storageStats: {
  display: 'flex',
  gap: 12,
  fontSize: 12,
  color: '#888'
},
confirmOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
},
confirmDialog: {
  backgroundColor: '#2D2D2D',
  borderRadius: 8,
  padding: 24,
  width: 400,
  maxWidth: '90%'
},
confirmTitle: {
  margin: '0 0 12px 0',
  fontSize: 18
},
confirmText: {
  margin: '0 0 8px 0',
  color: '#CCC'
},
confirmWarning: {
  margin: '0 0 20px 0',
  fontSize: 12,
  color: '#EAB308'
},
confirmButtons: {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end'
},
editDialog: {
  backgroundColor: '#2D2D2D',
  borderRadius: 8,
  padding: 24,
  width: 400,
  maxWidth: '90%'
},
editTitle: {
  margin: '0 0 16px 0',
  fontSize: 18
},
editPreview: {
  textAlign: 'center',
  marginBottom: 20
},
editPreviewImage: {
  maxWidth: 120,
  maxHeight: 120,
  objectFit: 'contain',
  backgroundColor: '#1E1E1E',
  borderRadius: 4
},
editDimensions: {
  marginTop: 8,
  fontSize: 12,
  color: '#888'
},
editForm: {
  display: 'flex',
  flexDirection: 'column',
  gap: 16
},
editActions: {
  display: 'flex',
  gap: 12,
  marginTop: 20,
  justifyContent: 'flex-end'
}
```

---

## Testing Procedures

- [ ] Parts Manager opens from toolbar
- [ ] All uploaded parts display in list
- [ ] Search filters parts by name
- [ ] Category filter works
- [ ] Sorting options work
- [ ] Single part selection works
- [ ] Multi-select with checkbox works
- [ ] Select all works
- [ ] Delete single part works
- [ ] Delete selected parts works
- [ ] Confirmation dialog shows before delete
- [ ] Edit dialog opens with current values
- [ ] Saving edit updates the part
- [ ] Storage stats show accurate values

---

## Next Steps

Phase 4 is complete when:
- [ ] Parts Manager fully functional
- [ ] Delete with confirmation works
- [ ] Edit metadata works
- [ ] Bulk operations work
- [ ] Storage stats display

**Proceed to Phase 5:** Demo Update

---

*Phase 4 Complete - Parts Manager UI*
