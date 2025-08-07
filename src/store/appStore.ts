import { create } from 'zustand';
import { AnnotationData, RallyFolder, BoundingBox, IDAnalysisResult } from '@/types/electron';
import { parseAnnotations, annotationsToCSV } from '@/utils/annotationParser';
import { loadJsonBallAnnotations, exportAnnotationsToJson, BALL_TRACKLET_ID } from '@/utils/ballAnnotationParser';

interface AppState {
  // Directory and data management
  selectedDirectory: string | null;
  rallyFolders: RallyFolder[];
  currentRallyIndex: number;
  currentFrameIndex: number;
  annotations: AnnotationData[];
  
  // UI state
  selectedTrackletId: number | null;
  drawingMode: boolean;
  assignMode: boolean;
  selectedBoundingBox: string | null;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Canvas state
  boundingBoxes: BoundingBox[];
  isDeletingBox: boolean; // Flag to prevent recreation during deletion
  
  // Zoom state
  zoomLevel: number;
  panX: number;
  panY: number;
  
  // Event annotation state
  selectedEvent: string;
  
  // ID Analysis state
  idAnalysisResult: IDAnalysisResult | null;
  isAnalyzing: boolean;
  showAnalysis: boolean;
  
  // Tracklet label visibility
  showTrackletLabels: boolean;
  // Event label visibility
  showEventLabels: boolean;
  // Individual tracklet visibility
  visibleTrackletIds: Set<number>;
  setShowTrackletLabels: (show: boolean) => void;
  setShowEventLabels: (show: boolean) => void;
  setTrackletVisibility: (trackletId: number, visible: boolean) => void;
  showAllTracklets: () => void;
  hideAllTracklets: () => void;
  
  // Ball annotation state
  ballAnnotationMode: boolean;
  ballAnnotations: AnnotationData[];
  hasBallAnnotations: boolean;
  
  // Canvas dimensions for coordinate scaling
  canvasDimensions: { width: number; height: number };
  setCanvasDimensions: (dimensions: { width: number; height: number }) => void;
  
  // Force redraw timestamp for Windows compatibility
  forceRedrawTimestamp: number;
  
  // Actions
  setSelectedDirectory: (dir: string | null) => void;
  setRallyFolders: (folders: RallyFolder[]) => void;
  setCurrentRally: (index: number) => Promise<void>;
  setCurrentFrame: (index: number) => void;
  goToFrame: (frameNumber: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;
  setAnnotations: (annotations: AnnotationData[]) => void;
  setSelectedTrackletId: (id: number | null) => void;
  setDrawingMode: (enabled: boolean) => void;
  setAssignMode: (enabled: boolean) => void;
  setSelectedBoundingBox: (id: string | null) => void;
  addBoundingBox: (box: BoundingBox) => void;
  updateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void;
  removeBoundingBox: (id: string) => void;
  deleteSelectedBoundingBox: () => void;
  deleteAllAnnotationsWithTrackletId: (trackletId: number) => void;
  setBoundingBoxes: (boxes: BoundingBox[]) => void;
  setLoading: (loading: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  // Event annotation actions
  setSelectedEvent: (event: string) => void;
  assignEventToBoundingBox: (boxId: string, eventType: string) => Promise<void>;
  
  // Annotation editing
  updateAnnotationDetails: (boxId: string, details: Partial<Pick<AnnotationData, 'role' | 'jersey_number' | 'jersey_color' | 'team'>>) => void;
  saveAnnotationsToFile: () => Promise<void>;
  
  // Zoom actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (level: number) => void;
  setPan: (x: number, y: number) => void;
  
  // ID Analysis actions
  analyzeTrackletIDs: () => Promise<void>;
  setShowAnalysis: (show: boolean) => void;
  clearAnalysis: () => void;
  
  // Ball annotation actions
  setBallAnnotationMode: (enabled: boolean) => void;
  loadBallAnnotationsFromJson: () => Promise<void>;
  exportAnnotationsAsJson: (filePath?: string) => Promise<boolean>;
  addBallAnnotation: (x: number, y: number, frameNumber: number, event?: string) => void;
  removeBallAnnotation: (frameNumber: number) => void;
  clearBallAnnotations: () => void;
  updateBallAnnotationEvent: (frameNumber: number, event: string) => void;
  getCurrentFrameBallAnnotation: () => AnnotationData | null;
  removeCurrentFrameBallAnnotation: () => void;
  getCurrentFrameNumber: () => number | null;
  
  // Computed getters
  getCurrentRally: () => RallyFolder | null;
  getCurrentImagePath: () => string | null;
  getCurrentFrameAnnotations: () => AnnotationData[];
  getAvailableTrackletIds: () => number[];
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  selectedDirectory: null,
  rallyFolders: [],
  currentRallyIndex: 0,
  currentFrameIndex: 0,
  annotations: [],
  selectedTrackletId: null,
  drawingMode: false,
  assignMode: false,
  selectedBoundingBox: null,
  isLoading: false,
  saveStatus: 'idle',
  boundingBoxes: [],
  isDeletingBox: false,
  
  // Initial zoom state
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  
  // Initial event annotation state
  selectedEvent: '',
  
  // Initial ID analysis state
  idAnalysisResult: null,
  isAnalyzing: false,
  showAnalysis: false,
  
  // Initial tracklet label visibility
  showTrackletLabels: false,
  setShowTrackletLabels: (show) => set({ showTrackletLabels: show }),

  // Initial event label visibility
  showEventLabels: false,
  setShowEventLabels: (show) => set({ showEventLabels: show }),
  
  // Initial tracklet visibility (all visible by default)
  visibleTrackletIds: new Set(),
  setTrackletVisibility: (trackletId, visible) => {
    const { visibleTrackletIds } = get();
    const newVisibleIds = new Set(visibleTrackletIds);
    if (visible) {
      newVisibleIds.add(trackletId);
    } else {
      newVisibleIds.delete(trackletId);
    }
    set({ visibleTrackletIds: newVisibleIds });
  },
  showAllTracklets: () => {
    const { getAvailableTrackletIds } = get();
    const allIds = getAvailableTrackletIds();
    set({ visibleTrackletIds: new Set(allIds) });
  },
  hideAllTracklets: () => {
    set({ visibleTrackletIds: new Set() });
  },
  
  // Initial ball annotation state
  ballAnnotationMode: false,
  ballAnnotations: [],
  hasBallAnnotations: false,
  
  // Initial canvas dimensions (default 1920x1080)
  canvasDimensions: { width: 1920, height: 1080 },
  setCanvasDimensions: (dimensions) => set({ canvasDimensions: dimensions }),
  
  // Force redraw timestamp for Windows compatibility
  forceRedrawTimestamp: 0,
  
  // Actions
  setSelectedDirectory: (dir) => set({ selectedDirectory: dir }),
  
  setRallyFolders: (folders) => set({ 
    rallyFolders: folders,
    currentRallyIndex: 0,
    currentFrameIndex: 0,
    annotations: [],
    boundingBoxes: [],
    ballAnnotations: [],
    hasBallAnnotations: false
  }),
  
  setCurrentRally: async (index) => {
    const state = get();
    const rally = state.rallyFolders[index];
    
    if (!rally) {
      console.error('Rally not found at index:', index);
      return;
    }

    // Reset state first
    set({ 
      currentRallyIndex: index,
      currentFrameIndex: 0,
      annotations: [],
      boundingBoxes: [],
      ballAnnotations: [],
      hasBallAnnotations: false,
      visibleTrackletIds: new Set() // Reset visibility
    });

    // Load annotations if available and we're in an Electron environment
    if (rally.annotationFile && typeof window !== 'undefined' && window.electronAPI) {
      try {
        const csvContent = await window.electronAPI.loadAnnotationFile(rally.annotationFile);
        const annotations = parseAnnotations(csvContent);
        
        // Extract ball annotations from loaded annotations
        const ballAnnotations = annotations.filter(ann => ann.tracklet_id === BALL_TRACKLET_ID);
        
        set({ 
          annotations,
          ballAnnotations,
          hasBallAnnotations: ballAnnotations.length > 0
        });
        
        // Initialize visibility for all tracklet IDs
        const availableIds = [...new Set(annotations.map(ann => ann.tracklet_id))];
        set({ visibleTrackletIds: new Set(availableIds) });
        
        console.log(`Loaded ${annotations.length} total annotations, ${ballAnnotations.length} ball annotations`);
      } catch (error) {
        console.error('Error loading annotations:', error);
        // Continue without annotations - they can be created manually
      }
    }
  },
  
  setCurrentFrame: (index) => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally && index >= 0 && index < rally.imageFiles.length) {
      set({ currentFrameIndex: index });
    }
  },
  
  goToFrame: (frameNumber) => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally) {
      // Convert frame number to index (assuming frame numbers start from 1)
      const frameIndex = frameNumber - 1;
      if (frameIndex >= 0 && frameIndex < rally.imageFiles.length) {
        set({ currentFrameIndex: frameIndex });
      }
    }
  },
  
  nextFrame: () => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally && state.currentFrameIndex < rally.imageFiles.length - 1) {
      set({ currentFrameIndex: state.currentFrameIndex + 1 });
    }
  },
  
  previousFrame: () => {
    const state = get();
    if (state.currentFrameIndex > 0) {
      set({ currentFrameIndex: state.currentFrameIndex - 1 });
    }
  },
  
  setAnnotations: (annotations) => {
    // Extract ball annotations from the annotations array
    const ballAnnotations = annotations.filter(ann => ann.tracklet_id === BALL_TRACKLET_ID);
    
    set({ 
      annotations,
      ballAnnotations,
      hasBallAnnotations: ballAnnotations.length > 0
    });
  },
  setSelectedTrackletId: (id) => {
    const { ballAnnotationMode } = get();
    // Prevent selecting tracklet 99 when not in ball mode, and prevent selecting other tracklets in ball mode
    if (id === BALL_TRACKLET_ID && !ballAnnotationMode) {
      return; // Don't allow selecting ball tracklet when not in ball mode
    }
    if (id !== BALL_TRACKLET_ID && ballAnnotationMode) {
      return; // Don't allow selecting other tracklets when in ball mode
    }
    set({ selectedTrackletId: id });
  },
  setDrawingMode: (enabled) => set({ 
    drawingMode: enabled,
    assignMode: enabled ? false : get().assignMode,
    selectedEvent: enabled ? '' : get().selectedEvent // Clear event selection when entering drawing mode
  }),
  setAssignMode: (enabled) => set({ 
    assignMode: enabled,
    drawingMode: enabled ? false : get().drawingMode,
    selectedEvent: enabled ? '' : get().selectedEvent // Clear event selection when entering assign mode
  }),
  setSelectedBoundingBox: (id) => set({ selectedBoundingBox: id }),
  
  addBoundingBox: (box) => set((state) => ({
    boundingBoxes: [...state.boundingBoxes, box]
  })),
  
  updateBoundingBox: (id, updates) => set((state) => ({
    boundingBoxes: state.boundingBoxes.map(box => 
      box.id === id ? { ...box, ...updates } : box
    )
  })),
  
  removeBoundingBox: (id) => set((state) => ({
    boundingBoxes: state.boundingBoxes.filter(box => box.id !== id)
  })),
  
  deleteSelectedBoundingBox: () => {
    const state = get();
    
    if (state.selectedBoundingBox) {
      // Remove from bounding boxes
      const boxToDelete = state.boundingBoxes.find(box => box.id === state.selectedBoundingBox);
      if (boxToDelete) {
        // Get the actual frame number using the same logic as MainCanvas
        const getCurrentFrameNumber = async () => {
          try {
            const imagePath = state.getCurrentImagePath();
            if (!imagePath || typeof window === 'undefined' || !window.electronAPI) {
              console.error('Cannot get image path or electronAPI not available');
              return null;
            }

            const filename = imagePath.split('/').pop() || '';
            const frameNumber = await window.electronAPI.getFrameNumber(filename);
            return frameNumber;
          } catch (error) {
            console.error('Error getting frame number:', error);
            return null;
          }
        };

        getCurrentFrameNumber().then(frameNumber => {
          if (frameNumber === null) {
            console.error('Could not determine frame number');
            return;
          }
          
          const annotationsToDelete = state.annotations.filter(ann => {
            const matches = ann.frame === frameNumber && 
                           ann.tracklet_id === boxToDelete.tracklet_id &&
                           Math.abs(ann.x - boxToDelete.x) < 1.0 &&
                           Math.abs(ann.y - boxToDelete.y) < 1.0 &&
                           Math.abs(ann.w - boxToDelete.width) < 1.0 &&
                           Math.abs(ann.h - boxToDelete.height) < 1.0;
            return matches;
          });
          
          if (annotationsToDelete.length === 0) {
            console.warn('No matching annotations found for deletion');
          }
          
          const updatedAnnotations = state.annotations.filter(ann => {
            // Delete the annotation that matches frame, tracklet_id, and position (with tolerance)
            return !(ann.frame === frameNumber && 
                     ann.tracklet_id === boxToDelete.tracklet_id &&
                     Math.abs(ann.x - boxToDelete.x) < 1.0 &&
                     Math.abs(ann.y - boxToDelete.y) < 1.0 &&
                     Math.abs(ann.w - boxToDelete.width) < 1.0 &&
                     Math.abs(ann.h - boxToDelete.height) < 1.0);
          });
          
          const updatedBoundingBoxes = state.boundingBoxes.filter(box => box.id !== state.selectedBoundingBox);
          
          // Update state immediately with deletion flag
          set({
            boundingBoxes: updatedBoundingBoxes,
            annotations: updatedAnnotations,
            selectedBoundingBox: null,
            isDeletingBox: true // Prevent recreation during deletion
          });
          
          // Auto-save after deletion and clear the deletion flag
          setTimeout(() => {
            const newState = get();
            newState.saveAnnotationsToFile().then(() => {
              // Clear deletion flag after save completes
              set({ isDeletingBox: false });
            });
          }, 100);
        });
      } else {
        console.error('Box to delete not found');
      }
    } else {
      console.error('No bounding box selected for deletion');
    }
  },
  
  deleteAllAnnotationsWithTrackletId: (trackletId) => {
    const state = get();
    console.log('Deleting all annotations with tracklet ID:', trackletId);
    
    const updatedAnnotations = state.annotations.filter(ann => ann.tracklet_id !== trackletId);
    const updatedBoundingBoxes = state.boundingBoxes.filter(box => box.tracklet_id !== trackletId);
    
    console.log('Annotations before deletion:', state.annotations.length);
    console.log('Annotations after deletion:', updatedAnnotations.length);
    console.log('Bounding boxes before deletion:', state.boundingBoxes.length);
    console.log('Bounding boxes after deletion:', updatedBoundingBoxes.length);
    
    set({
      annotations: updatedAnnotations,
      boundingBoxes: updatedBoundingBoxes,
      selectedBoundingBox: null
    });
    
    // Auto-save after deletion - use get() to get the updated state
    get().saveAnnotationsToFile();
  },
  
  setBoundingBoxes: (boxes) => {
    const state = get();
    let newSelectedBoundingBox: string | null = null;
    let newSelectedTrackletId: number | null = state.selectedTrackletId;
    
    // Try to preserve unified selection based on tracklet ID
    if (state.selectedBoundingBox && state.selectedTrackletId !== null) {
      const currentSelectedBox = state.boundingBoxes.find(box => box.id === state.selectedBoundingBox);
      if (currentSelectedBox && currentSelectedBox.tracklet_id === state.selectedTrackletId) {
        // Find a box with the same tracklet ID in the new boxes
        const matchingBox = boxes.find(box => box.tracklet_id === state.selectedTrackletId);
        if (matchingBox) {
          newSelectedBoundingBox = matchingBox.id;
          console.log(`🎯 Unified selection persisted: Tracklet ID ${state.selectedTrackletId} (${currentSelectedBox.id} → ${matchingBox.id})`);
        } else {
          // Clear both selections if tracklet doesn't exist on new frame
          newSelectedTrackletId = null;
          console.log(`⚠️ Unified selection cleared: Tracklet ID ${state.selectedTrackletId} not found in new frame`);
        }
      }
    }
    
    set({ 
      boundingBoxes: boxes,
      selectedBoundingBox: newSelectedBoundingBox,
      selectedTrackletId: newSelectedTrackletId
    });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  
  // Event annotation actions
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  
  assignEventToBoundingBox: async (boxId, eventType) => {
    const state = get();
    
    if (!boxId || typeof window === 'undefined' || !window.electronAPI) return;

    try {
      // Find the bounding box
      const targetBox = state.boundingBoxes.find(box => box.id === boxId);
      if (!targetBox) return;

      // Get current frame number
      const imagePath = state.getCurrentImagePath();
      if (!imagePath) return;

      const filename = imagePath.split('/').pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

      // Update only the annotation for this specific frame and bounding box
      const updatedAnnotations = state.annotations.map(ann => {
        if (ann.frame === frameNumber && 
            ann.tracklet_id === targetBox.tracklet_id &&
            ann.x === targetBox.x && ann.y === targetBox.y && 
            ann.w === targetBox.width && ann.h === targetBox.height) {
          // Handle "no_event" by removing the event property
          if (eventType === 'no_event') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { event, ...annWithoutEvent } = ann;
            return annWithoutEvent;
          } else {
            return { ...ann, event: eventType };
          }
        }
        return ann;
      });

      set({ annotations: updatedAnnotations });
      
      // Save the changes
      await state.saveAnnotationsToFile();
      
      // Show feedback
      console.log(`Event "${eventType}" assigned to tracklet ID ${targetBox.tracklet_id} in frame ${frameNumber}`);
    } catch (error) {
      console.error('Error assigning event:', error);
    }
  },
  
  updateAnnotationDetails: (boxId, details) => {
    const state = get();
    
    // Find the bounding box to get tracklet info
    const targetBox = state.boundingBoxes.find(box => box.id === boxId);
    if (!targetBox) return;
    
    // Update ALL annotations that match this tracklet ID across all frames
    const updatedAnnotations = state.annotations.map(ann => {
      if (ann.tracklet_id === targetBox.tracklet_id) {
        return { ...ann, ...details };
      }
      return ann;
    });
    
    set({ annotations: updatedAnnotations });
    
    // Auto-save the changes
    get().saveAnnotationsToFile();
  },
  
  saveAnnotationsToFile: async () => {
    const state = get();
    const rally = state.rallyFolders[state.currentRallyIndex];
    
    if (!rally || typeof window === 'undefined' || !window.electronAPI) return;

    state.setSaveStatus('saving');
    
    try {
      // Use the annotation parser to convert to CSV format
      const csvContent = annotationsToCSV(state.annotations);

      await window.electronAPI.saveAnnotationFile(rally.annotationFile, csvContent);
      state.setSaveStatus('saved');
      
      // Clear saved status after 2 seconds
      setTimeout(() => state.setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving annotation file:', error);
      state.setSaveStatus('error');
      setTimeout(() => state.setSaveStatus('idle'), 3000);
    }
  },
  
  // Zoom actions
  zoomIn: () => {
    const state = get();
    const newZoom = Math.min(state.zoomLevel * 1.2, 5); // Max zoom 5x
    set({ zoomLevel: newZoom });
  },
  
  zoomOut: () => {
    const state = get();
    const newZoom = Math.max(state.zoomLevel / 1.2, 0.1); // Min zoom 0.1x
    set({ zoomLevel: newZoom });
  },
  
  resetZoom: () => set({ 
    zoomLevel: 1, 
    panX: 0, 
    panY: 0 
  }),
  
  setZoom: (level) => {
    const clampedLevel = Math.max(0.1, Math.min(5, level));
    set({ zoomLevel: clampedLevel });
  },
  
  setPan: (x, y) => set({ panX: x, panY: y }),
  
  // Computed getters
  getCurrentRally: () => {
    const state = get();
    return state.rallyFolders[state.currentRallyIndex] || null;
  },
  
  getCurrentImagePath: () => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally && rally.imageFiles[state.currentFrameIndex]) {
      return rally.imageFiles[state.currentFrameIndex];
    }
    return null;
  },
  
  getCurrentFrameAnnotations: () => {
    const state = get();
    return state.annotations.filter(ann => ann.frame === state.currentFrameIndex);
  },
  
  getAvailableTrackletIds: () => {
    const state = get();
    const trackletIds = new Set(state.annotations.map(ann => ann.tracklet_id));
    return Array.from(trackletIds).sort((a, b) => a - b);
  },

  // ID Analysis actions
  analyzeTrackletIDs: async () => {
    const state = get();
    const rally = state.rallyFolders[state.currentRallyIndex];
    
    if (!rally || state.annotations.length === 0) return;
    
    set({ isAnalyzing: true });
    
    try {
      const { analyzeTrackletIDs } = await import('@/utils/trackletAnalysis');
      const result = await analyzeTrackletIDs(state.annotations, rally.path);
      set({ idAnalysisResult: result, isAnalyzing: false });
    } catch (error) {
      console.error('Error analyzing tracklet IDs:', error);
      set({ isAnalyzing: false });
    }
  },

  setShowAnalysis: (show) => set({ showAnalysis: show }),

  clearAnalysis: () => set({ idAnalysisResult: null, showAnalysis: false }),
  
  // Ball annotation actions
  setBallAnnotationMode: (enabled: boolean) => {
    set({ 
      ballAnnotationMode: enabled,
      selectedEvent: enabled ? '' : get().selectedEvent // Clear event selection when entering ball mode
    });
    // When enabling ball mode, auto-select ball tracklet ID
    if (enabled) {
      set({ selectedTrackletId: BALL_TRACKLET_ID });
    } else {
      // When disabling ball mode, deselect tracklet 99 if it's selected
      const { selectedTrackletId } = get();
      if (selectedTrackletId === BALL_TRACKLET_ID) {
        set({ selectedTrackletId: null });
      }
    }
  },
  
  loadBallAnnotationsFromJson: async () => {
    const { selectedDirectory, canvasDimensions } = get();
    if (!selectedDirectory) return;
    
    set({ isLoading: true });
    
    // Windows-compatible loading with retry mechanism
    const loadWithRetry = async (retryCount = 0) => {
      try {
        const ballAnnotations = await loadJsonBallAnnotations(selectedDirectory, canvasDimensions.width, canvasDimensions.height);
        
        // Merge ball annotations with existing annotations, removing any existing ball annotations first
        const { annotations } = get();
        const mergedAnnotations = [...annotations.filter(ann => ann.tracklet_id !== BALL_TRACKLET_ID), ...ballAnnotations];
        
        set({ 
          annotations: mergedAnnotations,
          ballAnnotations,
          hasBallAnnotations: ballAnnotations.length > 0,
          // Force canvas redraw for Windows compatibility
          forceRedrawTimestamp: Date.now()
        });
        
        // Save to TXT file after importing with Windows-compatible delay
        const state = get();
        
        // Platform-specific save delay
        const saveDelay = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 200 : 100;
        setTimeout(async () => {
          try {
            await state.saveAnnotationsToFile();
            set({ saveStatus: 'saved' });
            setTimeout(() => {
              if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
            }, 2000);
          } catch (saveError) {
            console.error('Error saving after ball annotation import:', saveError);
            set({ saveStatus: 'error' });
            setTimeout(() => set({ saveStatus: 'idle' }), 3000);
          }
        }, saveDelay);
        
        console.log(`Loaded ${ballAnnotations.length} ball annotations from JSON files (coordinates scaled from 224x224 to ${canvasDimensions.width}x${canvasDimensions.height})`);
        
      } catch (error) {
        console.error(`Error loading ball annotations (attempt ${retryCount + 1}):`, error);
        
        // Windows-specific retry logic for file system issues
        const isWindows = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win');
        if (retryCount < 2 && isWindows) {
          setTimeout(() => loadWithRetry(retryCount + 1), 500 * (retryCount + 1));
        } else {
          throw error; // Re-throw if all retries failed
        }
      }
    };
    
    try {
      await loadWithRetry();
    } catch (error) {
      console.error('Failed to load ball annotations after retries:', error);
      set({ saveStatus: 'error' });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
    } finally {
      set({ isLoading: false });
    }
  },
  
  exportAnnotationsAsJson: async (filePath?: string) => {
    const { annotations, selectedDirectory, getCurrentRally, canvasDimensions } = get();
    if (!selectedDirectory) return false;
    
    const rally = getCurrentRally();
    if (!rally) return false;
    
    // Cross-platform path handling
    const sanitizedRallyName = rally.name.replace(/[<>:"/\\|?*]/g, '_'); // Remove invalid filename characters
    const outputPath = filePath || `${selectedDirectory}${typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? '\\' : '/'}${sanitizedRallyName}_export.json`;
    
    // Windows-compatible export with retry mechanism
    const exportWithRetry = async (retryCount = 0): Promise<boolean> => {
      try {
        set({ saveStatus: 'saving' });
        
        // Enhanced relative path handling for cross-platform compatibility
        const relativePath = `..${typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? '\\' : '/'}${sanitizedRallyName}`;
        const success = await exportAnnotationsToJson(annotations, outputPath, relativePath, canvasDimensions.width, canvasDimensions.height);
        
        if (success) {
          set({ saveStatus: 'saved' });
          setTimeout(() => {
            if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
          }, 2000);
          return true;
        } else {
          throw new Error('Export operation returned false');
        }
        
      } catch (error) {
        console.error(`Error exporting to JSON (attempt ${retryCount + 1}):`, error);
        
        // Windows-specific retry logic for file system issues
        const isWindows = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win');
        if (retryCount < 2 && isWindows) {
          // Progressive delay for Windows file system stability
          return new Promise((resolve) => {
            setTimeout(() => {
              exportWithRetry(retryCount + 1).then(resolve);
            }, 600 * (retryCount + 1));
          });
        } else {
          set({ saveStatus: 'error' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
          return false;
        }
      }
    };
    
    try {
      return await exportWithRetry();
    } catch (error) {
      console.error('Failed to export annotations after retries:', error);
      set({ saveStatus: 'error' });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
      return false;
    }
  },
  
  addBallAnnotation: (x: number, y: number, frameNumber: number, event?: string) => {
    const { annotations, ballAnnotations } = get();
    
    // Remove existing ball annotation for this frame
    const filteredAnnotations = annotations.filter(
      ann => !(ann.tracklet_id === BALL_TRACKLET_ID && ann.frame === frameNumber)
    );
    const filteredBallAnnotations = ballAnnotations.filter(ann => ann.frame !== frameNumber);
    
    // Create new ball annotation
    const newBallAnnotation: AnnotationData = {
      frame: frameNumber,
      tracklet_id: BALL_TRACKLET_ID,
      x: Math.round(x), // Ensure integer coordinates for cross-platform consistency
      y: Math.round(y),
      w: 8, // Small fixed size for ball point
      h: 8,
      score: 1.0,
      role: 'ball',
      jersey_number: '',
      jersey_color: '',
      team: '',
      event: event || 'no_event'
    };
    
    const updatedAnnotations = [...filteredAnnotations, newBallAnnotation];
    const updatedBallAnnotations = [...filteredBallAnnotations, newBallAnnotation];
    
    // Update state immediately for instant visual feedback with Windows compatibility
    set({ 
      annotations: updatedAnnotations,
      ballAnnotations: updatedBallAnnotations,
      hasBallAnnotations: true,
      // Force Windows canvas redraw by updating timestamp
      forceRedrawTimestamp: Date.now()
    });
    
    // Windows-compatible async save with proper error handling and retry logic
    const saveWithRetry = async (retryCount = 0) => {
      try {
        await get().saveAnnotationsToFile();
        set({ saveStatus: 'saved' });
      } catch (error) {
        console.error(`Error saving ball annotation (attempt ${retryCount + 1}):`, error);
        
        // Windows file system may need retry for file locking issues
        if (retryCount < 2 && typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win')) {
          setTimeout(() => saveWithRetry(retryCount + 1), 200 * (retryCount + 1));
        } else {
          set({ saveStatus: 'error' });
          // Optionally implement rollback for failed saves
        }
      }
    };
    
    // Delayed save with Windows-friendly timing
    setTimeout(() => saveWithRetry(), typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 100 : 50);
  },
  
  removeBallAnnotation: (frameNumber: number) => {
    const { annotations, ballAnnotations } = get();
    
    // Remove from both annotation arrays immediately
    const filteredAnnotations = annotations.filter(
      ann => !(ann.tracklet_id === BALL_TRACKLET_ID && ann.frame === frameNumber)
    );
    const filteredBallAnnotations = ballAnnotations.filter(ann => ann.frame !== frameNumber);
    
    // Update state immediately for instant UI feedback with Windows compatibility
    set({ 
      annotations: filteredAnnotations,
      ballAnnotations: filteredBallAnnotations,
      hasBallAnnotations: filteredBallAnnotations.length > 0,
      // Force canvas redraw timestamp for cross-platform compatibility
      forceRedrawTimestamp: Date.now()
    });
    
    console.log(`Removed ball annotation for frame ${frameNumber}. Remaining ball annotations:`, filteredBallAnnotations.length);
    
    // Windows-compatible async save with retry mechanism
    const saveWithRetry = async (retryCount = 0) => {
      try {
        await get().saveAnnotationsToFile();
        set({ saveStatus: 'saved' });
        // Clear status after Windows-friendly delay
        setTimeout(() => {
          if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
        }, 1500);
      } catch (error) {
        console.error(`Error saving after ball annotation removal (attempt ${retryCount + 1}):`, error);
        
        // Retry logic for Windows file system issues
        if (retryCount < 2 && typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win')) {
          setTimeout(() => saveWithRetry(retryCount + 1), 300 * (retryCount + 1));
        } else {
          set({ saveStatus: 'error' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        }
      }
    };
    
    // Platform-specific timing for save operation
    const saveDelay = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 150 : 100;
    setTimeout(() => saveWithRetry(), saveDelay);
  },
  
  updateBallAnnotationEvent: (frameNumber: number, event: string) => {
    const { annotations, ballAnnotations } = get();
    
    // Update the event in both annotation arrays
    const updatedAnnotations = annotations.map(ann => {
      if (ann.frame === frameNumber && ann.tracklet_id === BALL_TRACKLET_ID) {
        return { ...ann, event };
      }
      return ann;
    });
    
    const updatedBallAnnotations = ballAnnotations.map(ann => {
      if (ann.frame === frameNumber) {
        return { ...ann, event };
      }
      return ann;
    });
    
    // Update state immediately with Windows compatibility
    set({ 
      annotations: updatedAnnotations,
      ballAnnotations: updatedBallAnnotations,
      // Ensure canvas redraw on Windows
      forceRedrawTimestamp: Date.now()
    });
    
    // Cross-platform async save with retry mechanism
    const saveWithRetry = async (retryCount = 0) => {
      try {
        await get().saveAnnotationsToFile();
        set({ saveStatus: 'saved' });
        setTimeout(() => {
          if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
        }, 1500);
      } catch (error) {
        console.error(`Error saving ball annotation event (attempt ${retryCount + 1}):`, error);
        
        // Windows-specific retry logic for file system delays
        const isWindows = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win');
        if (retryCount < (isWindows ? 3 : 2) && isWindows) {
          setTimeout(() => saveWithRetry(retryCount + 1), 250 * (retryCount + 1));
        } else {
          set({ saveStatus: 'error' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        }
      }
    };
    
    // Platform-aware delay timing
    const saveDelay = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 75 : 50;
    setTimeout(() => saveWithRetry(), saveDelay);
  },
  
  clearBallAnnotations: () => {
    const { annotations } = get();
    
    // Remove all ball annotations (tracklet_id 99) from annotations
    const nonBallAnnotations = annotations.filter(ann => ann.tracklet_id !== BALL_TRACKLET_ID);
    
    // Update state immediately with cross-platform compatibility
    set({ 
      annotations: nonBallAnnotations,
      ballAnnotations: [],
      hasBallAnnotations: false,
      // Force canvas redraw for all platforms, especially Windows
      forceRedrawTimestamp: Date.now()
    });
    
    // Cross-platform async save with enhanced error handling
    const saveWithRetry = async (retryCount = 0) => {
      try {
        await get().saveAnnotationsToFile();
        set({ saveStatus: 'saved' });
        setTimeout(() => {
          if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
        }, 1500);
      } catch (error) {
        console.error(`Error saving after clearing ball annotations (attempt ${retryCount + 1}):`, error);
        
        // Enhanced retry logic for Windows file system issues
        const isWindows = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win');
        const maxRetries = isWindows ? 3 : 2;
        
        if (retryCount < maxRetries) {
          // Progressive delay for Windows stability
          const retryDelay = isWindows ? 400 * (retryCount + 1) : 200 * (retryCount + 1);
          setTimeout(() => saveWithRetry(retryCount + 1), retryDelay);
        } else {
          set({ saveStatus: 'error' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        }
      }
    };
    
    // Platform-specific initial delay
    const initialDelay = typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 100 : 50;
    setTimeout(() => saveWithRetry(), initialDelay);
  },
  
  getCurrentFrameBallAnnotation: () => {
    const { ballAnnotations, getCurrentRally, currentFrameIndex } = get();
    const rally = getCurrentRally();
    
    if (!rally || !rally.imageFiles[currentFrameIndex]) {
      return null;
    }
    
    const imageFileName = rally.imageFiles[currentFrameIndex];
    // Cross-platform path handling - handle both forward and back slashes
    const fileName = imageFileName.split(/[/\\]/).pop();
    const frameNumber = parseInt(fileName?.replace(/\.(jpg|jpeg|png)$/i, '') || '', 10);
    
    // Validate frame number for cross-platform safety
    if (isNaN(frameNumber)) {
      console.warn(`Invalid frame number extracted from: ${imageFileName}`);
      return null;
    }
    
    return ballAnnotations.find(ann => ann.frame === frameNumber) || null;
  },
  
  removeCurrentFrameBallAnnotation: () => {
    const { getCurrentRally, currentFrameIndex, ballAnnotations } = get();
    const rally = getCurrentRally();
    
    if (!rally || !rally.imageFiles[currentFrameIndex]) {
      return;
    }
    
    const imageFileName = rally.imageFiles[currentFrameIndex];
    // Cross-platform path handling - handle both forward and back slashes
    const fileName = imageFileName.split(/[/\\]/).pop();
    const frameNumber = parseInt(fileName?.replace(/\.(jpg|jpeg|png)$/i, '') || '', 10);
    
    // Validate frame number for cross-platform safety
    if (isNaN(frameNumber)) {
      console.warn(`Invalid frame number extracted from: ${imageFileName}`);
      return;
    }
    
    // Enhanced logging for debugging across platforms
    console.log(`Removing ball annotation for frame ${frameNumber} (from ${imageFileName}). Total ball annotations: ${ballAnnotations.length}`);
    
    get().removeBallAnnotation(frameNumber);
  },
  
  getCurrentFrameNumber: () => {
    const { getCurrentRally, currentFrameIndex } = get();
    const rally = getCurrentRally();
    
    if (!rally || !rally.imageFiles[currentFrameIndex]) {
      return null;
    }
    
    const imageFileName = rally.imageFiles[currentFrameIndex];
    // Cross-platform path handling - handle both forward and back slashes
    const fileName = imageFileName.split(/[/\\]/).pop();
    const frameNumber = parseInt(fileName?.replace(/\.(jpg|jpeg|png)$/i, '') || '', 10);
    
    // Validate frame number for cross-platform safety
    if (isNaN(frameNumber)) {
      console.warn(`Invalid frame number extracted from: ${imageFileName}`);
      return null;
    }
    
    return frameNumber;
  },
}));
