# Phase 1: IndexedDB Storage Layer

## Phase Overview
**Goal:** Create a persistent storage system using IndexedDB for parts, characters, and animations  
**Prerequisites:** None (foundation phase)  
**Estimated Duration:** 2-3 hours  
**Key Deliverables:**
- Database initialization and versioning
- Object stores for parts, characters, animations
- CRUD operations with async/await wrapper
- React hook for database access
- Image blob storage and retrieval

---

## Step-by-Step Implementation

### Step 1: Database Constants and Configuration

**Purpose:** Define database schema and configuration constants

#### Code Implementation

Add these constants at the top of `PuppetJSX.jsx`, after the imports:

```javascript
// ============================================================
// DATABASE CONFIGURATION
// ============================================================
const DB_NAME = 'PuppetJSX_DB';
const DB_VERSION = 1;

const STORE_NAMES = {
  PARTS: 'parts',
  CHARACTERS: 'characters',
  ANIMATIONS: 'animations'
};

// Part grid configuration for standardized dimensions
const PART_GRID_CONFIG = {
  head: { 
    width: 256, 
    height: 256, 
    anchorX: 0.5,
    anchorY: 1.0,
    label: 'Head (256×256)',
    description: 'Square, anchored at bottom edge for neck attachment'
  },
  torso: { 
    width: 256, 
    height: 384, 
    anchorX: 0.5, 
    anchorY: 0.5,
    label: 'Torso (256×384)',
    description: 'Large rectangle, center anchored'
  },
  arm: { 
    width: 128, 
    height: 256, 
    anchorX: 0.5, 
    anchorY: 0.0,
    label: 'Arm (128×256)',
    description: 'Vertical rectangle, anchored at top for shoulder'
  },
  hand: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.0,
    label: 'Hand (128×128)',
    description: 'Small square, anchored at top for wrist'
  },
  leg: { 
    width: 128, 
    height: 256, 
    anchorX: 0.5, 
    anchorY: 0.0,
    label: 'Leg (128×256)',
    description: 'Vertical rectangle, anchored at top for hip'
  },
  foot: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.0,
    label: 'Foot (128×128)',
    description: 'Small square, anchored at top for ankle'
  },
  weapon: { 
    width: 128, 
    height: 384, 
    anchorX: 0.5, 
    anchorY: 0.85,
    label: 'Weapon (128×384)',
    description: 'Long vertical, anchored near bottom for grip'
  },
  accessory: { 
    width: 128, 
    height: 128, 
    anchorX: 0.5, 
    anchorY: 0.5,
    label: 'Accessory (128×128)',
    description: 'Small square, center anchored'
  }
};

// Part categories for dropdown
const PART_CATEGORIES = [
  { value: 'head', label: 'Head' },
  { value: 'torso', label: 'Torso / Body' },
  { value: 'arm', label: 'Arm' },
  { value: 'hand', label: 'Hand' },
  { value: 'leg', label: 'Leg' },
  { value: 'foot', label: 'Foot' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'accessory', label: 'Accessory / Shield' }
];
```

#### Verification
- [ ] Constants are defined at module scope
- [ ] All body part categories have grid configurations
- [ ] Anchor points match the specification

---

### Step 2: IndexedDB Utility Functions

**Purpose:** Create low-level database operations wrapped in Promises

#### Code Implementation

Add this section after the constants:

```javascript
// ============================================================
// INDEXEDDB UTILITIES
// ============================================================

/**
 * Opens the IndexedDB database, creating object stores if needed
 * @returns {Promise<IDBDatabase>}
 */
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database: ' + request.error?.message));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create parts store
      if (!db.objectStoreNames.contains(STORE_NAMES.PARTS)) {
        const partsStore = db.createObjectStore(STORE_NAMES.PARTS, { keyPath: 'id' });
        partsStore.createIndex('category', 'category', { unique: false });
        partsStore.createIndex('name', 'name', { unique: false });
        partsStore.createIndex('isDefault', 'isDefault', { unique: false });
        partsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create characters store
      if (!db.objectStoreNames.contains(STORE_NAMES.CHARACTERS)) {
        const charactersStore = db.createObjectStore(STORE_NAMES.CHARACTERS, { keyPath: 'id' });
        charactersStore.createIndex('name', 'name', { unique: false });
        charactersStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create animations store
      if (!db.objectStoreNames.contains(STORE_NAMES.ANIMATIONS)) {
        const animationsStore = db.createObjectStore(STORE_NAMES.ANIMATIONS, { keyPath: 'id' });
        animationsStore.createIndex('name', 'name', { unique: false });
        animationsStore.createIndex('skeletonId', 'skeletonId', { unique: false });
        animationsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

/**
 * Generic function to add or update a record in a store
 * @param {string} storeName - Name of the object store
 * @param {Object} data - Data to store
 * @returns {Promise<string>} - ID of the stored record
 */
const dbPut = async (storeName, data) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.put(data);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to save to ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get a single record by ID
 * @param {string} storeName - Name of the object store
 * @param {string} id - Record ID
 * @returns {Promise<Object|null>}
 */
const dbGet = async (storeName, id) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to get from ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get all records from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<Array>}
 */
const dbGetAll = async (storeName) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to get all from ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get records by index
 * @param {string} storeName - Name of the object store
 * @param {string} indexName - Name of the index
 * @param {*} value - Value to match
 * @returns {Promise<Array>}
 */
const dbGetByIndex = async (storeName, indexName, value) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    const request = index.getAll(value);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to query ${storeName} by ${indexName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Delete a record by ID
 * @param {string} storeName - Name of the object store
 * @param {string} id - Record ID
 * @returns {Promise<void>}
 */
const dbDelete = async (storeName, id) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to delete from ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Clear all records from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<void>}
 */
const dbClear = async (storeName) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.clear();
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to clear ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Count records in a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<number>}
 */
const dbCount = async (storeName) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.count();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to count ${storeName}: ${request.error?.message}`));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};
```

#### Verification
- [ ] `openDatabase()` creates all three object stores
- [ ] Each store has appropriate indexes
- [ ] All CRUD operations return Promises
- [ ] Database connections are properly closed

---

### Step 3: Image Processing Utilities

**Purpose:** Handle image file reading, validation, and conversion

#### Code Implementation

```javascript
// ============================================================
// IMAGE PROCESSING UTILITIES
// ============================================================

/**
 * Read a File as ArrayBuffer (for blob storage)
 * @param {File} file 
 * @returns {Promise<ArrayBuffer>}
 */
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Read a File as Data URL (for preview/rendering)
 * @param {File} file 
 * @returns {Promise<string>}
 */
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert ArrayBuffer to Data URL
 * @param {ArrayBuffer} buffer 
 * @param {string} mimeType 
 * @returns {string}
 */
const arrayBufferToDataURL = (buffer, mimeType = 'image/png') => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
};

/**
 * Get image dimensions from a File
 * @param {File} file 
 * @returns {Promise<{width: number, height: number}>}
 */
const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Check if image has transparency (alpha channel)
 * @param {File} file 
 * @returns {Promise<boolean>}
 */
const checkImageTransparency = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Create canvas to analyze pixels
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Sample pixels for transparency
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Check if any pixel has alpha < 255
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      
      resolve(false);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to analyze image'));
    };
    
    img.src = url;
  });
};

/**
 * Validate an uploaded image file
 * @param {File} file 
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[], dimensions: {width, height}}>}
 */
const validateImageFile = async (file) => {
  const errors = [];
  const warnings = [];
  let dimensions = { width: 0, height: 0 };
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
    return { valid: false, errors, warnings, dimensions };
  }
  
  // Prefer PNG for transparency
  if (file.type !== 'image/png') {
    warnings.push('PNG format recommended for transparency support');
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB`);
    return { valid: false, errors, warnings, dimensions };
  }
  
  try {
    // Get dimensions
    dimensions = await getImageDimensions(file);
    
    // Check minimum dimensions
    if (dimensions.width < 64 || dimensions.height < 64) {
      warnings.push('Image is very small. Minimum recommended size is 128×128');
    }
    
    // Check maximum dimensions
    if (dimensions.width > 1024 || dimensions.height > 1024) {
      warnings.push('Image is very large. Consider resizing for better performance');
    }
    
    // Check for transparency (only for PNG)
    if (file.type === 'image/png') {
      const hasTransparency = await checkImageTransparency(file);
      if (!hasTransparency) {
        warnings.push('Image has no transparent pixels. Consider using transparency for better results');
      }
    }
    
  } catch (e) {
    errors.push('Failed to analyze image: ' + e.message);
    return { valid: false, errors, warnings, dimensions };
  }
  
  return { valid: errors.length === 0, errors, warnings, dimensions };
};

/**
 * Check if dimensions match the expected grid size for a category
 * @param {number} width 
 * @param {number} height 
 * @param {string} category 
 * @returns {{matches: boolean, expected: {width, height}, message: string}}
 */
const checkGridDimensions = (width, height, category) => {
  const config = PART_GRID_CONFIG[category];
  
  if (!config) {
    return { 
      matches: true, 
      expected: { width: 128, height: 128 },
      message: 'Unknown category, any size accepted'
    };
  }
  
  const matches = width === config.width && height === config.height;
  
  return {
    matches,
    expected: { width: config.width, height: config.height },
    message: matches 
      ? `Dimensions match ${config.label}` 
      : `Expected ${config.width}×${config.height} for ${category}, got ${width}×${height}`
  };
};
```

#### Verification
- [ ] File reading works with async/await
- [ ] Image dimensions are correctly detected
- [ ] Transparency check works on PNG files
- [ ] Validation returns proper error/warning structure
- [ ] Grid dimension checking matches specification

---

### Step 4: Part Storage Operations

**Purpose:** High-level functions for saving and managing parts

#### Code Implementation

```javascript
// ============================================================
// PART STORAGE OPERATIONS
// ============================================================

/**
 * Save a new uploaded part to IndexedDB
 * @param {Object} partData - Part metadata
 * @param {File} imageFile - Image file
 * @returns {Promise<Object>} - Saved part object
 */
const saveUploadedPart = async (partData, imageFile) => {
  // Read file data
  const [arrayBuffer, dataUrl] = await Promise.all([
    readFileAsArrayBuffer(imageFile),
    readFileAsDataURL(imageFile)
  ]);
  
  // Get dimensions
  const dimensions = await getImageDimensions(imageFile);
  
  // Create part record
  const part = {
    id: `custom_${Date.now()}_${partData.name.replace(/\s+/g, '_').toLowerCase()}`,
    name: partData.name,
    category: partData.category,
    imageBlob: arrayBuffer,
    imageDataUrl: dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    offset: partData.offset || { x: 0, y: 0 },
    zIndexModifier: partData.zIndexModifier || 0,
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // Save to IndexedDB
  await dbPut(STORE_NAMES.PARTS, part);
  
  return part;
};

/**
 * Load all custom (non-default) parts from IndexedDB
 * @returns {Promise<Array>}
 */
const loadUploadedParts = async () => {
  try {
    const parts = await dbGetAll(STORE_NAMES.PARTS);
    return parts.filter(p => !p.isDefault);
  } catch (e) {
    console.error('Failed to load uploaded parts:', e);
    return [];
  }
};

/**
 * Update an existing part
 * @param {string} partId 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
const updatePart = async (partId, updates) => {
  const existing = await dbGet(STORE_NAMES.PARTS, partId);
  if (!existing) {
    throw new Error('Part not found');
  }
  
  const updated = {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  };
  
  await dbPut(STORE_NAMES.PARTS, updated);
  return updated;
};

/**
 * Delete a part
 * @param {string} partId 
 * @returns {Promise<void>}
 */
const deletePart = async (partId) => {
  await dbDelete(STORE_NAMES.PARTS, partId);
};

/**
 * Get parts by category
 * @param {string} category 
 * @returns {Promise<Array>}
 */
const getPartsByCategory = async (category) => {
  return dbGetByIndex(STORE_NAMES.PARTS, 'category', category);
};

/**
 * Convert a default part (in-memory) to database format for consistency
 * @param {Object} defaultPart 
 * @returns {Object}
 */
const normalizeDefaultPart = (defaultPart) => ({
  ...defaultPart,
  imageBlob: null,
  imageDataUrl: null,
  isDefault: true,
  createdAt: 0,
  updatedAt: 0
});
```

#### Verification
- [ ] Parts are saved with unique IDs
- [ ] Image data is stored as both ArrayBuffer and DataURL
- [ ] Parts can be retrieved by category
- [ ] Default parts are properly normalized

---

### Step 5: useIndexedDB React Hook

**Purpose:** React hook to manage database state and operations

#### Code Implementation

```javascript
// ============================================================
// REACT HOOK: useIndexedDB
// ============================================================

/**
 * Custom hook for IndexedDB operations in React
 * @returns {Object} Database state and operations
 */
const useIndexedDB = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedParts, setUploadedParts] = useState([]);
  const [savedCharacters, setSavedCharacters] = useState([]);
  const [savedAnimations, setSavedAnimations] = useState([]);
  
  // Initialize database and load data
  useEffect(() => {
    const init = async () => {
      try {
        // Test database connection
        await openDatabase();
        
        // Load existing data
        const [parts, characters, animations] = await Promise.all([
          loadUploadedParts(),
          dbGetAll(STORE_NAMES.CHARACTERS),
          dbGetAll(STORE_NAMES.ANIMATIONS)
        ]);
        
        setUploadedParts(parts);
        setSavedCharacters(characters);
        setSavedAnimations(animations);
        setIsReady(true);
        
      } catch (e) {
        console.error('IndexedDB initialization failed:', e);
        setError(e.message);
        // Still mark as ready so app can work without persistence
        setIsReady(true);
      }
    };
    
    init();
  }, []);
  
  // Save a new part
  const savePart = useCallback(async (partData, imageFile) => {
    try {
      const savedPart = await saveUploadedPart(partData, imageFile);
      setUploadedParts(prev => [...prev, savedPart]);
      return { success: true, part: savedPart };
    } catch (e) {
      console.error('Failed to save part:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Update a part
  const updatePartData = useCallback(async (partId, updates) => {
    try {
      const updated = await updatePart(partId, updates);
      setUploadedParts(prev => prev.map(p => p.id === partId ? updated : p));
      return { success: true, part: updated };
    } catch (e) {
      console.error('Failed to update part:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Delete a part
  const removePart = useCallback(async (partId) => {
    try {
      await deletePart(partId);
      setUploadedParts(prev => prev.filter(p => p.id !== partId));
      return { success: true };
    } catch (e) {
      console.error('Failed to delete part:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Save a character
  const saveCharacter = useCallback(async (character) => {
    try {
      const toSave = {
        ...character,
        createdAt: character.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await dbPut(STORE_NAMES.CHARACTERS, toSave);
      setSavedCharacters(prev => {
        const existing = prev.findIndex(c => c.id === character.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = toSave;
          return updated;
        }
        return [...prev, toSave];
      });
      return { success: true, character: toSave };
    } catch (e) {
      console.error('Failed to save character:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Delete a character
  const removeCharacter = useCallback(async (characterId) => {
    try {
      await dbDelete(STORE_NAMES.CHARACTERS, characterId);
      setSavedCharacters(prev => prev.filter(c => c.id !== characterId));
      return { success: true };
    } catch (e) {
      console.error('Failed to delete character:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Save an animation
  const saveAnimation = useCallback(async (animation) => {
    try {
      const toSave = {
        ...animation,
        createdAt: animation.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await dbPut(STORE_NAMES.ANIMATIONS, toSave);
      setSavedAnimations(prev => {
        const existing = prev.findIndex(a => a.id === animation.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = toSave;
          return updated;
        }
        return [...prev, toSave];
      });
      return { success: true, animation: toSave };
    } catch (e) {
      console.error('Failed to save animation:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Delete an animation
  const removeAnimation = useCallback(async (animationId) => {
    try {
      await dbDelete(STORE_NAMES.ANIMATIONS, animationId);
      setSavedAnimations(prev => prev.filter(a => a.id !== animationId));
      return { success: true };
    } catch (e) {
      console.error('Failed to delete animation:', e);
      return { success: false, error: e.message };
    }
  }, []);
  
  // Get storage statistics
  const getStorageStats = useCallback(async () => {
    try {
      const [partsCount, charactersCount, animationsCount] = await Promise.all([
        dbCount(STORE_NAMES.PARTS),
        dbCount(STORE_NAMES.CHARACTERS),
        dbCount(STORE_NAMES.ANIMATIONS)
      ]);
      
      // Estimate storage used
      let totalSize = 0;
      for (const part of uploadedParts) {
        if (part.imageBlob) {
          totalSize += part.imageBlob.byteLength || 0;
        }
      }
      
      return {
        parts: partsCount,
        characters: charactersCount,
        animations: animationsCount,
        estimatedSize: totalSize,
        estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2)
      };
    } catch (e) {
      console.error('Failed to get storage stats:', e);
      return null;
    }
  }, [uploadedParts]);
  
  return {
    // State
    isReady,
    error,
    uploadedParts,
    savedCharacters,
    savedAnimations,
    
    // Part operations
    savePart,
    updatePartData,
    removePart,
    
    // Character operations
    saveCharacter,
    removeCharacter,
    
    // Animation operations
    saveAnimation,
    removeAnimation,
    
    // Utilities
    getStorageStats
  };
};
```

#### Verification
- [ ] Hook initializes database on mount
- [ ] State is populated from IndexedDB
- [ ] CRUD operations update local state
- [ ] Errors are handled gracefully
- [ ] Hook works even if IndexedDB is unavailable

---

### Step 6: Integrate with Main Component

**Purpose:** Connect the IndexedDB hook to the main PuppetJSX component

#### Code Implementation

Modify the main `PuppetJSX` function to use the hook:

```javascript
export default function PuppetJSX() {
  // IndexedDB integration
  const {
    isReady: dbReady,
    error: dbError,
    uploadedParts,
    savedCharacters,
    savedAnimations,
    savePart,
    updatePartData,
    removePart,
    saveCharacter,
    removeCharacter,
    saveAnimation,
    removeAnimation,
    getStorageStats
  } = useIndexedDB();
  
  // Combine default parts with uploaded parts
  const allParts = useMemo(() => {
    const defaults = defaultParts.map(normalizeDefaultPart);
    return [...defaults, ...uploadedParts];
  }, [uploadedParts]);
  
  // Core data (now using combined parts)
  const [skeleton] = useState(defaultSkeleton);
  const [partsLibrary, setPartsLibrary] = useState(allParts);
  
  // Update parts library when uploaded parts change
  useEffect(() => {
    setPartsLibrary(allParts);
  }, [allParts]);
  
  // ... rest of existing state ...
  
  // Add to context value:
  const contextValue = {
    // ... existing values ...
    
    // Database state
    dbReady,
    dbError,
    uploadedParts,
    
    // Database operations
    savePart,
    updatePartData,
    removePart,
    saveCharacter,
    removeCharacter,
    saveAnimation,
    removeAnimation,
    getStorageStats,
    
    // Combined parts library
    partsLibrary,
  };
  
  // Show loading indicator while database initializes
  if (!dbReady) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }
  
  // ... rest of render ...
}
```

Add loading styles:

```javascript
// Add to styles object:
loadingContainer: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  backgroundColor: '#1E1E1E',
  color: '#FFFFFF'
},
loadingSpinner: {
  fontSize: 18,
  fontFamily: "'JetBrains Mono', monospace"
}
```

#### Verification
- [ ] Component waits for database to be ready
- [ ] Default parts and uploaded parts are combined
- [ ] Context provides database operations
- [ ] Parts library updates when uploads change

---

## Testing Procedures

### Manual Testing

1. **Database Initialization**
   - Open browser DevTools → Application → IndexedDB
   - Verify `PuppetJSX_DB` database is created
   - Verify all three object stores exist

2. **Part Storage** (requires Phase 2 upload UI)
   - Upload a test image
   - Verify part appears in IndexedDB
   - Refresh page, verify part persists

3. **Error Handling**
   - Test in private/incognito mode
   - Verify app still works without persistence

### Console Testing

```javascript
// Run in browser console to test database operations

// Test opening database
const db = await openDatabase();
console.log('Database opened:', db.name, db.version);
db.close();

// Test counting records
const count = await dbCount('parts');
console.log('Parts count:', count);

// Test saving a mock part (without image)
const testPart = {
  id: 'test_' + Date.now(),
  name: 'Test Part',
  category: 'head',
  imageBlob: null,
  imageDataUrl: null,
  width: 256,
  height: 256,
  offset: { x: 0, y: 0 },
  zIndexModifier: 0,
  isDefault: false,
  createdAt: Date.now()
};
await dbPut('parts', testPart);
console.log('Part saved');

// Test retrieving
const retrieved = await dbGet('parts', testPart.id);
console.log('Retrieved:', retrieved);

// Test deleting
await dbDelete('parts', testPart.id);
console.log('Part deleted');
```

---

## Troubleshooting

### Common Issues

**"IndexedDB is not supported"**
- User is in private browsing mode
- Very old browser version
- Solution: App falls back to in-memory only

**"QuotaExceededError"**
- Storage limit reached
- Solution: Delete old parts, implement storage indicator

**"Database version mismatch"**
- DB_VERSION changed but schema wasn't updated
- Solution: Clear IndexedDB in DevTools, reload

**Data not persisting**
- Transaction not completing before close
- Solution: Ensure all operations complete before db.close()

---

## Next Steps

Phase 1 is complete when:
- [ ] Database initializes without errors
- [ ] All CRUD operations work correctly
- [ ] Hook provides state and operations
- [ ] Main component integrates with database
- [ ] Parts library combines default + uploaded

**Proceed to Phase 2:** Image Upload System

The upload system will use:
- `validateImageFile()` for validation
- `checkGridDimensions()` for size checking
- `savePart()` from the hook for storage

---

*Phase 1 Complete - IndexedDB Storage Layer*
