import { create } from 'zustand';
import { AnnotationData, RallyFolder, BoundingBox } from '@/types/electron';
import { parseAnnotations } from '@/utils/annotationParser';

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
  
  // Zoom state
  zoomLevel: number;
  panX: number;
  panY: number;
  
  // Actions
  setSelectedDirectory: (dir: string | null) => void;
  setRallyFolders: (folders: RallyFolder[]) => void;
  setCurrentRally: (index: number) => Promise<void>;
  setCurrentFrame: (index: number) => void;
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
  setBoundingBoxes: (boxes: BoundingBox[]) => void;
  setLoading: (loading: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  // Zoom actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (level: number) => void;
  setPan: (x: number, y: number) => void;
  
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
  
  // Initial zoom state
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  
  // Actions
  setSelectedDirectory: (dir) => set({ selectedDirectory: dir }),
  
  setRallyFolders: (folders) => set({ 
    rallyFolders: folders,
    currentRallyIndex: 0,
    currentFrameIndex: 0,
    annotations: [],
    boundingBoxes: []
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
      boundingBoxes: []
    });

    // Load annotations if available and we're in an Electron environment
    if (rally.annotationFile && typeof window !== 'undefined' && window.electronAPI) {
      try {
        console.log('Loading annotations from:', rally.annotationFile);
        const csvContent = await window.electronAPI.loadAnnotationFile(rally.annotationFile);
        const annotations = parseAnnotations(csvContent);
        
        console.log(`Loaded ${annotations.length} annotations for rally: ${rally.name}`);
        set({ annotations });
      } catch (error) {
        console.error('Error loading annotations:', error);
        // Continue without annotations - they can be created manually
      }
    } else {
      console.log('No annotation file found for rally:', rally.name);
    }
  },
  
  setCurrentFrame: (index) => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally && index >= 0 && index < rally.imageFiles.length) {
      set({ currentFrameIndex: index });
    }
  },
  
  nextFrame: () => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally) {
      const nextIndex = (state.currentFrameIndex + 1) % rally.imageFiles.length;
      set({ currentFrameIndex: nextIndex });
    }
  },
  
  previousFrame: () => {
    const state = get();
    const rally = state.getCurrentRally();
    if (rally) {
      const prevIndex = state.currentFrameIndex === 0 
        ? rally.imageFiles.length - 1 
        : state.currentFrameIndex - 1;
      set({ currentFrameIndex: prevIndex });
    }
  },
  
  setAnnotations: (annotations) => set({ annotations }),
  setSelectedTrackletId: (id) => set({ selectedTrackletId: id }),
  setDrawingMode: (enabled) => set({ 
    drawingMode: enabled,
    assignMode: enabled ? false : get().assignMode
  }),
  setAssignMode: (enabled) => set({ 
    assignMode: enabled,
    drawingMode: enabled ? false : get().drawingMode
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
  
  setBoundingBoxes: (boxes) => set({ boundingBoxes: boxes }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  
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
  }
}));
