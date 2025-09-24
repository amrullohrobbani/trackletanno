'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { XMarkIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { AnnotationData } from '@/types/electron';
import { ConfirmDialog, AlertDialog } from '@/components/ui/CustomDialogs';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdvancedTrackletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrackletPreview {
  trackletId: number;
  frameNumber: number;
  imagePath: string;
  annotation: AnnotationData;
  croppedImageUrl?: string;
}

interface LoadingProgress {
  loaded: number;
  total: number;
  isComplete: boolean;
}

type OperationType = 'merge' | 'switch' | 'duplicate';

export default function AdvancedTrackletModal({ isOpen, onClose }: AdvancedTrackletModalProps) {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [operationType, setOperationType] = useState<OperationType>('merge');
  const [trackletId1, setTrackletId1] = useState<string>('');
  const [trackletId2, setTrackletId2] = useState<string>('');
  const [frameRange1, setFrameRange1] = useState<string>('');
  
  // Duplicate operation states
  const [duplicateTrackletId, setDuplicateTrackletId] = useState<string>('');
  const [duplicateSourceFrame, setDuplicateSourceFrame] = useState<string>('');
  const [duplicateFrameRange, setDuplicateFrameRange] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true); // Default to true for convenience
  
  // Dialog states
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }>({ isOpen: false, title: '', description: '' });
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
  
  // Preview states
  const [previews, setPreviews] = useState<TrackletPreview[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ loaded: 0, total: 0, isComplete: true });
  const [showPreviews, setShowPreviews] = useState(false);
  
  // Cached images
  const [croppedImages, setCroppedImages] = useState<Map<string, string>>(new Map());
  const croppedImagesRef = useRef<Map<string, string>>(new Map());

  const {
    annotations,
    getCurrentRally,
    getAvailableTrackletIds,
    setAnnotations,
    saveAnnotationsToFile,
    getCurrentFrameNumber
  } = useAppStore();

  // Helper functions for dialogs
  const showAlert = (message: string, variant: 'default' | 'destructive' = 'default') => {
    const lines = message.split('\n');
    setAlertDialog({
      isOpen: true,
      title: lines[0] || 'Alert',
      description: lines.slice(1).join('\n') || lines[0],
      variant
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    const lines = message.split('\n');
    console.log('🔔 showConfirm called with:', { title: lines[0], variant, onConfirm: onConfirm.toString() });
    
    setConfirmDialog({
      isOpen: true,
      title: lines[0] || 'Confirm',
      description: lines.slice(1).join('\n') || lines[0],
      variant,
      onConfirm: () => {
        console.log('🔔 Confirm dialog callback executed');
        onConfirm();
      }
    });
  };

  // Sync ref with state
  useEffect(() => {
    croppedImagesRef.current = croppedImages;
  }, [croppedImages]);

  // Cleanup cached images when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCroppedImages(prev => {
        prev.forEach((url) => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return new Map();
      });
      croppedImagesRef.current.clear();
      setPreviews([]);
      setShowPreviews(false);
      // Reset form
      setTrackletId1('');
      setTrackletId2('');
      setFrameRange1('');
      setDuplicateTrackletId('');
      setDuplicateFrameRange('');
      setOverwriteExisting(true);
      setDuplicateTrackletId('');
      setDuplicateFrameRange('');
    }
  }, [isOpen]);

  // Initialize duplicate form defaults when operation changes (only once)
  useEffect(() => {
    // Removed auto-fill logic - let inputs start empty
    // Users can manually enter the values they want
  }, [operationType]);

  // Convert single frame index (1-based) to actual frame number
  const convertFrameIndexToNumber = useCallback((frameIndex: number): number | null => {
    const rally = getCurrentRally();
    if (!rally || frameIndex < 1) return null;
    
    // Create mapping from frame index to frame number
    const frameIndexToNumber: { [index: number]: number } = {};
    rally.imageFiles.forEach((imagePath, index) => {
      const filename = imagePath.split(/[/\\]/).pop() || '';
      // Extract digits from filename (handles 000000.jpg, 000001.jpg, etc.)
      const digitsOnly = filename.replace(/\D/g, '');
      const frameNumber = parseInt(digitsOnly, 10);
      
      // Accept all valid frame numbers, including 0 (for 000000.jpg format)
      if (!isNaN(frameNumber) && digitsOnly.length > 0) {
        const idx = index + 1; // 1-based index
        frameIndexToNumber[idx] = frameNumber;
      } else {
        console.warn(`🔢 Could not extract frame number from filename: ${filename}`);
      }
    });
    console.log(`🔢 convertFrameIndexToNumber - frameIndex ${frameIndex}:`, frameIndexToNumber[frameIndex]);
    const result = frameIndexToNumber[frameIndex];
    console.log(`🔢 convertFrameIndexToNumber result: frameIndex ${frameIndex} -> frameNumber ${result}`);
    return result;
  }, [getCurrentRally]);

  // Parse frame range string with enhanced syntax
  // Examples: "1-10", "1,3,5", "15", "-20" (start to index 20), "200-" (index 200 to end), "" (all frames)
  // Works with frame indices (1-based): 1, 2, 3, 4... instead of actual frame numbers
  const parseFrameRange = useCallback((rangeStr: string): number[] => {
    console.log('📝 parseFrameRange called with:', rangeStr);
    
    if (!rangeStr.trim()) {
      console.log('📝 Empty range string, returning empty array');
      return [];
    }
    
    // Get rally to determine actual frame index range
    const rally = getCurrentRally();
    if (!rally) {
      console.log('📝 No rally found');
      return [];
    }
    
    // Create array of frame indices (1-based) and their corresponding frame numbers
    const frameIndexToNumber: { [index: number]: number } = {};
    const allFrameIndices: number[] = [];
    
    rally.imageFiles.forEach((imagePath, index) => {
      const filename = imagePath.split(/[/\\]/).pop() || '';
      // Extract digits from filename (handles 000000.jpg, 000001.jpg, etc.)
      const digitsOnly = filename.replace(/\D/g, '');
      const frameNumber = parseInt(digitsOnly, 10);
      
      // Accept all valid frame numbers, including 0 (for 000000.jpg format)
      if (!isNaN(frameNumber) && digitsOnly.length > 0) {
        const frameIndex = index + 1; // 1-based index
        frameIndexToNumber[frameIndex] = frameNumber;
        allFrameIndices.push(frameIndex);
      }
    });
    
    console.log('📝 Frame mapping created:', { 
      totalImages: rally.imageFiles.length, 
      validFrames: allFrameIndices.length,
      sampleMapping: Object.entries(frameIndexToNumber).slice(0, 5) 
    });
    
    if (allFrameIndices.length === 0) return [];
    
    const maxIndex = Math.max(...allFrameIndices);
    const frameNumbers: number[] = [];
    const parts = rangeStr.split(',');
    
    console.log('📝 Processing parts:', parts);
    
    for (const part of parts) {
      const trimmed = part.trim();
      console.log('📝 Processing part:', trimmed);
      
      if (trimmed.startsWith('-')) {
        // Format: "-20" means from start to frame index 20
        const endIndex = parseInt(trimmed.substring(1));
        console.log('📝 Start-to-index format, endIndex:', endIndex);
        if (!isNaN(endIndex) && endIndex > 0) {
          for (let i = 1; i <= Math.min(endIndex, maxIndex); i++) {
            if (frameIndexToNumber[i]) {
              frameNumbers.push(frameIndexToNumber[i]);
            }
          }
        }
      } else if (trimmed.endsWith('-')) {
        // Format: "200-" means from frame index 200 to end
        const startIndex = parseInt(trimmed.slice(0, -1));
        console.log('📝 Index-to-end format, startIndex:', startIndex);
        if (!isNaN(startIndex) && startIndex > 0) {
          for (let i = startIndex; i <= maxIndex; i++) {
            if (frameIndexToNumber[i]) {
              frameNumbers.push(frameIndexToNumber[i]);
            }
          }
        }
      } else if (trimmed.includes('-')) {
        // Format: "1-10" means range from index 1 to 10
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        console.log('📝 Range format, start:', start, 'end:', end);
        if (!isNaN(start) && !isNaN(end) && start <= end && start > 0) {
          for (let i = start; i <= Math.min(end, maxIndex); i++) {
            if (frameIndexToNumber[i]) {
              frameNumbers.push(frameIndexToNumber[i]);
            }
          }
        }
      } else {
        // Format: "15" means single frame index
        const frameIndex = parseInt(trimmed);
        console.log('📝 Single frame format, frameIndex:', frameIndex);
        if (!isNaN(frameIndex) && frameIndex > 0 && frameIndexToNumber[frameIndex]) {
          frameNumbers.push(frameIndexToNumber[frameIndex]);
        }
      }
    }
    
    const result = [...new Set(frameNumbers)].sort((a, b) => a - b);
    console.log('📝 parseFrameRange result:', result);
    return result;
  }, [getCurrentRally]);

  // Generate cropped image for annotation
  const generateCroppedImage = useCallback(async (preview: TrackletPreview): Promise<string | null> => {
    if (!preview.annotation || typeof window === 'undefined' || !window.electronAPI) {
      return null;
    }

    const cacheKey = `${preview.frameNumber}-${preview.trackletId}`;
    
    // Check cache using ref
    const cachedImage = croppedImagesRef.current.get(cacheKey);
    if (cachedImage) {
      return cachedImage;
    }

    try {
      const imageDataUrl = await window.electronAPI.getImageData(preview.imagePath);
      
      if (!imageDataUrl || imageDataUrl.length === 0) {
        console.warn('Empty or invalid image data received');
        return null;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const img = new Image();
      img.src = imageDataUrl;
      
      return new Promise((resolve) => {
        img.onload = () => {
          try {
            const { x, y, w, h } = preview.annotation;
            
            // Validate coordinates
            if (x < 0 || y < 0 || w <= 0 || h <= 0 || x >= img.width || y >= img.height) {
              resolve(null);
              return;
            }
            
            // Add padding
            const padding = 20;
            const cropX = Math.max(0, x - padding);
            const cropY = Math.max(0, y - padding);
            const cropW = Math.min(img.width - cropX, w + 2 * padding);
            const cropH = Math.min(img.height - cropY, h + 2 * padding);
            
            if (cropW <= 0 || cropH <= 0) {
              resolve(null);
              return;
            }
            
            canvas.width = cropW;
            canvas.height = cropH;
            
            // Draw cropped image
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            
            // Draw bounding box
            ctx.strokeStyle = operationType === 'merge' ? '#10b981' : preview.trackletId === parseInt(trackletId1) ? '#3b82f6' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - cropX, y - cropY, w, h);
            
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCroppedImages(prev => new Map(prev.set(cacheKey, croppedDataUrl)));
            resolve(croppedDataUrl);
          } catch (error) {
            console.error('Canvas drawing error:', error);
            resolve(null);
          }
        };
        
        img.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Error generating cropped image:', error);
      return null;
    }
  }, [operationType, trackletId1]);

  // Generate preview data
  const generatePreview = useCallback(async () => {
    if (operationType === 'duplicate') {
      // Duplicate operation validation and preview
      const trackletId = parseInt(duplicateTrackletId);
      
      if (isNaN(trackletId)) {
        showAlert(t('dialogs.pleaseEnterValidTrackletId'));
        return;
      }
      
      if (!duplicateFrameRange.trim()) {
        showAlert(t('advancedTracklet.pleaseEnterTargetFrameRange'));
        return;
      }
      
      const rally = getCurrentRally();
      if (!rally) {
        showAlert(t('advancedTracklet.noRallySelected'));
        return;
      }
      
      // Find source annotation for the tracklet
      const currentFrame = getCurrentFrameNumber();
      let sourceAnnotation: AnnotationData | undefined;
      
      // Use specific source frame if provided
      if (duplicateSourceFrame.trim()) {
        const sourceFrameIndex = parseInt(duplicateSourceFrame);
        if (!isNaN(sourceFrameIndex)) {
          const actualFrameNumber = convertFrameIndexToNumber(sourceFrameIndex);
          if (actualFrameNumber === null) {
            showAlert(t('dialogs.invalidFrameIndex', { frameIndex: sourceFrameIndex }));
            return;
          }
          sourceAnnotation = annotations.find(ann => 
            ann.tracklet_id === trackletId && ann.frame === actualFrameNumber
          );
          if (!sourceAnnotation) {
            showAlert(t('dialogs.noAnnotationFoundForTrackletInFrame', { trackletId, frame: actualFrameNumber }));
            return;
          }
        }
      }
      
      // If no source frame specified or not found, use auto-detection
      if (!sourceAnnotation) {
        // Try current frame first
        sourceAnnotation = annotations.find(ann => 
          ann.tracklet_id === trackletId && ann.frame === currentFrame
        );
        
        // If not found in current frame, find from any frame
        if (!sourceAnnotation) {
          sourceAnnotation = annotations.find(ann => ann.tracklet_id === trackletId);
        }
      }
      
      if (!sourceAnnotation) {
        showAlert(t('dialogs.noAnnotationFoundForTrackletInAnyFrame', { trackletId }));
        return;
      }
      
      setIsLoadingPreviews(true);
      setShowPreviews(true);
      
      try {
        const previewData: TrackletPreview[] = [];
        
        // Show source annotation from current frame
        const imagePath = rally.imageFiles.find(file => {
          const filename = file.split(/[/\\]/).pop() || '';
          const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
          return frameNumber === currentFrame;
        });
        
        if (imagePath) {
          previewData.push({
            trackletId: sourceAnnotation.tracklet_id,
            frameNumber: sourceAnnotation.frame,
            imagePath,
            annotation: sourceAnnotation
          });
        }
        
        setPreviews(previewData);
        
        // Load images with progress
        if (previewData.length > 0) {
          setLoadingProgress({ loaded: 0, total: previewData.length, isComplete: false });
          
          let loaded = 0;
          for (const preview of previewData) {
            await generateCroppedImage(preview);
            loaded++;
            setLoadingProgress({ loaded, total: previewData.length, isComplete: loaded === previewData.length });
          }
        } else {
          setLoadingProgress({ loaded: 0, total: 0, isComplete: true });
          showAlert(t('dialogs.noSourceAnnotationFound'));
        }
        
      } catch (error) {
        console.error('Error generating preview:', error);
        showAlert(t('ui.errorGeneratingPreview'), 'destructive');
      } finally {
        setIsLoadingPreviews(false);
      }
      
      return;
    }
    
    // Original logic for merge and switch operations
    const id1 = parseInt(trackletId1);
    const id2 = parseInt(trackletId2);
    
    if (isNaN(id1) || isNaN(id2) || id1 === id2) {
      showAlert(t('advancedTracklet.pleaseEnterTwoIds'));
      return;
    }

    const rally = getCurrentRally();
    if (!rally) {
      showAlert(t('advancedTracklet.noRallySelected'));
      return;
    }

    // For switch operation, frame range is optional (empty means all frames)
    // We allow switching even if tracklets don't exist in the specified range

    // Check if tracklets exist in annotations
    const hasId1 = annotations.some(ann => ann.tracklet_id === id1);
    const hasId2 = annotations.some(ann => ann.tracklet_id === id2);
    
    if (!hasId1 && !hasId2) {
      showAlert(t('dialogs.neitherTrackletFound', { id1, id2 }));
      return;
    }
    
    // For switch operations, we allow switching even if only one tracklet has annotations
    // This is useful for correcting annotation errors where IDs were swapped

    setIsLoadingPreviews(true);
    setShowPreviews(true);
    
    try {
      const previewData: TrackletPreview[] = [];
      
      if (operationType === 'merge') {
        // For merge: show all annotations from both tracklets
        const tracklet1Annotations = annotations.filter(ann => ann.tracklet_id === id1);
        const tracklet2Annotations = annotations.filter(ann => ann.tracklet_id === id2);
        
        [...tracklet1Annotations, ...tracklet2Annotations].forEach(ann => {
          const imagePath = rally.imageFiles.find(file => {
            const filename = file.split(/[/\\]/).pop() || '';
            const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
            return frameNumber === ann.frame;
          });
          
          if (imagePath) {
            previewData.push({
              trackletId: ann.tracklet_id,
              frameNumber: ann.frame,
              imagePath,
              annotation: ann
            });
          }
        });
        
      } else {
        // For switch: show annotations in specified frame range for both tracklets
        const frames = parseFrameRange(frameRange1);
        
        // If no frame range specified, get all frames that have annotations for either tracklet
        const targetFrames = frames.length > 0 ? frames : 
          [...new Set(annotations
            .filter(a => a.tracklet_id === id1 || a.tracklet_id === id2)
            .map(a => a.frame)
          )].sort((a, b) => a - b);
        
        // Get annotations for both tracklets in the target frames
        targetFrames.forEach(frameNum => {
          // Check for tracklet 1 annotation
          const ann1 = annotations.find(a => a.tracklet_id === id1 && a.frame === frameNum);
          if (ann1) {
            const imagePath = rally.imageFiles.find(file => {
              const filename = file.split(/[/\\]/).pop() || '';
              const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
              return frameNumber === frameNum;
            });
            
            if (imagePath) {
              previewData.push({
                trackletId: id1,
                frameNumber: frameNum,
                imagePath,
                annotation: ann1
              });
            }
          }
          
          // Check for tracklet 2 annotation
          const ann2 = annotations.find(a => a.tracklet_id === id2 && a.frame === frameNum);
          if (ann2) {
            const imagePath = rally.imageFiles.find(file => {
              const filename = file.split(/[/\\]/).pop() || '';
              const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
              return frameNumber === frameNum;
            });
            
            if (imagePath) {
              previewData.push({
                trackletId: id2,
                frameNumber: frameNum,
                imagePath,
                annotation: ann2
              });
            }
          }
        });
      }
      
      // Sort by frame number
      previewData.sort((a, b) => a.frameNumber - b.frameNumber);
      setPreviews(previewData);
      
      // Load images with progress
      if (previewData.length > 0) {
        setLoadingProgress({ loaded: 0, total: previewData.length, isComplete: false });
        
        let loaded = 0;
        for (const preview of previewData) {
          await generateCroppedImage(preview);
          loaded++;
          setLoadingProgress({ loaded, total: previewData.length, isComplete: loaded === previewData.length });
        }
      } else {
        setLoadingProgress({ loaded: 0, total: 0, isComplete: true });
        showAlert(t('advancedTracklet.noAnnotationsFound'));
      }
      
    } catch (error) {
      console.error('Error generating preview:', error);
      showAlert(t('ui.errorGeneratingPreview'), 'destructive');
    } finally {
      setIsLoadingPreviews(false);
    }
  }, [trackletId1, trackletId2, frameRange1, operationType, annotations, getCurrentRally, parseFrameRange, generateCroppedImage, t, duplicateTrackletId, duplicateSourceFrame, duplicateFrameRange, getCurrentFrameNumber, convertFrameIndexToNumber]);

  // Perform the actual operation
  const performOperation = useCallback(async (id1?: number, id2?: number) => {
    console.log('🔧 Starting performOperation:', { operationType, id1, id2, frameRange1 });
    
    try {
      let newAnnotations = [...annotations];
      
      if (operationType === 'merge') {
        // Merge: change all id2 annotations to id1
        if (id1 === undefined || id2 === undefined) {
          throw new Error('Both tracklet IDs are required for merge operation');
        }
        newAnnotations = newAnnotations.map(ann => 
          ann.tracklet_id === id2 ? { ...ann, tracklet_id: id1 } : ann
        );
        
      } else if (operationType === 'duplicate') {
        // Duplicate: copy annotation from source tracklet to target frames with same tracklet ID
        const trackletId = parseInt(duplicateTrackletId);
        const targetFrames = parseFrameRange(duplicateFrameRange);
        
        console.log('🔧 Duplicate operation:', { trackletId, targetFrames, overwriteExisting, sourceFrame: duplicateSourceFrame });
        
        // Find source annotation based on source frame input or auto-detection
        let sourceAnnotation: AnnotationData | undefined;
        
        // Use specific source frame if provided
        if (duplicateSourceFrame.trim()) {
          const sourceFrameIndex = parseInt(duplicateSourceFrame);
          if (!isNaN(sourceFrameIndex)) {
            const actualFrameNumber = convertFrameIndexToNumber(sourceFrameIndex);
            if (actualFrameNumber === null) {
              throw new Error(`Invalid frame index: ${sourceFrameIndex}`);
            }
            sourceAnnotation = annotations.find(ann => 
              ann.tracklet_id === trackletId && ann.frame === actualFrameNumber
            );
            if (!sourceAnnotation) {
              throw new Error(`No annotation found for tracklet ID ${trackletId} in frame ${actualFrameNumber}`);
            }
          }
        }
        
        // If no source frame specified or not found, use auto-detection
        if (!sourceAnnotation) {
          const currentFrame = getCurrentFrameNumber();
          
          // Try current frame first
          sourceAnnotation = annotations.find(ann => 
            ann.tracklet_id === trackletId && ann.frame === currentFrame
          );
          
          // If not found in current frame, find from any frame
          if (!sourceAnnotation) {
            sourceAnnotation = annotations.find(ann => ann.tracklet_id === trackletId);
          }
        }
        
        if (!sourceAnnotation) {
          throw new Error(`No annotation found for tracklet ID ${trackletId} in any frame`);
        }
        
        // Create duplicates for each target frame with same tracklet ID
        for (const targetFrame of targetFrames) {
          // Check if annotation already exists for the tracklet in target frame
          const existingIndex = newAnnotations.findIndex(ann => 
            ann.tracklet_id === trackletId && ann.frame === targetFrame
          );
          
          if (existingIndex >= 0 && !overwriteExisting) {
            console.log(`🔧 Skipped frame ${targetFrame} - annotation exists and overwrite is disabled`);
            continue;
          }
          
          const newAnnotation = {
            ...sourceAnnotation,
            frame: targetFrame
          };
          
          if (existingIndex >= 0) {
            // Overwrite existing annotation
            newAnnotations[existingIndex] = newAnnotation;
            console.log(`🔧 Overwritten annotation for tracklet ${trackletId} in frame ${targetFrame}`);
          } else {
            // Add new annotation
            newAnnotations.push(newAnnotation);
            console.log(`🔧 Added new annotation for tracklet ${trackletId} in frame ${targetFrame}`);
          }
        }
        
      } else {
        // Switch: swap IDs in specified frame range
        if (id1 === undefined || id2 === undefined) {
          throw new Error('Both tracklet IDs are required for switch operation');
        }
        
        const frames = parseFrameRange(frameRange1);
        console.log('🔧 Parsed frames:', frames);
        
        // If no frame range specified, switch all frames
        const targetFrames = frames.length > 0 ? frames : 
          [...new Set(annotations
            .filter(a => a.tracklet_id === id1 || a.tracklet_id === id2)
            .map(a => a.frame)
          )];
        
        console.log('🔧 Target frames for switch:', targetFrames);
        console.log('🔧 Before switch - annotations count:', annotations.length);
        
        const beforeSwitchCount = {
          id1: annotations.filter(a => a.tracklet_id === id1).length,
          id2: annotations.filter(a => a.tracklet_id === id2).length
        };
        console.log('🔧 Before switch counts:', beforeSwitchCount);
        
        newAnnotations = newAnnotations.map(ann => {
          if (targetFrames.includes(ann.frame)) {
            if (ann.tracklet_id === id1) {
              console.log(`🔧 Switching annotation frame ${ann.frame}: ${id1} -> ${id2}`);
              return { ...ann, tracklet_id: id2 };
            } else if (ann.tracklet_id === id2) {
              console.log(`🔧 Switching annotation frame ${ann.frame}: ${id2} -> ${id1}`);
              return { ...ann, tracklet_id: id1 };
            }
          }
          return ann;
        });
        
        const afterSwitchCount = {
          id1: newAnnotations.filter(a => a.tracklet_id === id1).length,
          id2: newAnnotations.filter(a => a.tracklet_id === id2).length
        };
        console.log('🔧 After switch counts:', afterSwitchCount);
      }
      
      console.log('🔧 Setting new annotations, count:', newAnnotations.length);
      
      // Update annotations
      setAnnotations(newAnnotations);
      
      // Save to file
      await saveAnnotationsToFile();
      
      showAlert(t('advancedTracklet.operationCompletedSuccessfully', { 
        operation: operationType === 'merge' ? t('advancedTracklet.mergeButton') : t('advancedTracklet.switchButton') 
      }));
      onClose();
      
    } catch (error) {
      console.error('Error applying operation:', error);
      showAlert(t('ui.errorApplyingOperation'), 'destructive');
    }
  }, [frameRange1, operationType, annotations, parseFrameRange, setAnnotations, saveAnnotationsToFile, onClose, t, duplicateTrackletId, duplicateSourceFrame, duplicateFrameRange, overwriteExisting, getCurrentFrameNumber, convertFrameIndexToNumber]);

  // Apply the operation - first validation step
  const validateAndStartOperation = useCallback(() => {
    console.log('🚀 validateAndStartOperation called');
    
    if (operationType === 'duplicate') {
      // Validate duplicate operation
      const trackletId = parseInt(duplicateTrackletId);
      
      if (isNaN(trackletId)) {
        showAlert(t('dialogs.pleaseEnterValidTrackletId'));
        return;
      }
      
      if (!duplicateFrameRange.trim()) {
        showAlert(t('advancedTracklet.pleaseEnterTargetFrameRange'));
        return;
      }
      
      const targetFrames = parseFrameRange(duplicateFrameRange);
      if (targetFrames.length === 0) {
        showAlert(t('advancedTracklet.invalidTargetFrameRange'));
        return;
      }
      
      // Check if source annotation exists based on source frame input or auto-detection
      let sourceAnnotation: AnnotationData | undefined;
      
      // Use specific source frame if provided
      if (duplicateSourceFrame.trim()) {
        const sourceFrameIndex = parseInt(duplicateSourceFrame);
        if (isNaN(sourceFrameIndex)) {
          showAlert(t('dialogs.pleaseEnterValidSourceFrame'));
          return;
        }
        
        const actualFrameNumber = convertFrameIndexToNumber(sourceFrameIndex);
        if (actualFrameNumber === null) {
          showAlert(t('dialogs.invalidFrameIndex', { frameIndex: sourceFrameIndex }));
          return;
        }
        
        sourceAnnotation = annotations.find(ann => 
          ann.tracklet_id === trackletId && ann.frame === actualFrameNumber
        );
        
        if (!sourceAnnotation) {
          showAlert(t('dialogs.noAnnotationFoundForTrackletInFrame', { trackletId, frame: actualFrameNumber }));
          return;
        }
      } else {
        // If no source frame specified, use auto-detection
        const currentFrame = getCurrentFrameNumber();
        sourceAnnotation = annotations.find(ann => 
          ann.tracklet_id === trackletId && ann.frame === currentFrame
        );
        
        // If not found in current frame, find from any frame
        if (!sourceAnnotation) {
          sourceAnnotation = annotations.find(ann => ann.tracklet_id === trackletId);
        }
        
        if (!sourceAnnotation) {
          showAlert(t('dialogs.noAnnotationFoundForTrackletInAnyFrame', { trackletId }));
          return;
        }
      }
      
      // Count how many annotations will be created/affected
      let duplicateCount = 0;
      let conflictCount = 0;
      
      for (const targetFrame of targetFrames) {
        const existingAnnotation = annotations.find(ann => 
          ann.tracklet_id === trackletId && ann.frame === targetFrame
        );
        
        if (existingAnnotation) {
          conflictCount++;
        } else {
          duplicateCount++;
        }
      }
      
      let confirmMessage = `Duplicate annotation from tracklet ${trackletId} (frame ${sourceAnnotation.frame}) to frames: ${targetFrames.join(', ')}\n` +
        `Will create ${duplicateCount} new annotations`;
      
      if (conflictCount > 0) {
        confirmMessage += '\n\n' + `${conflictCount} conflicting annotations found. ` +
          (overwriteExisting ? 'Will overwrite existing annotations.' : 'Will skip conflicting frames.');
      }
      
      showConfirm(confirmMessage, () => {
        performOperation();
      });
      
      return;
    }
    
    // Original validation for merge and switch operations
    const id1 = parseInt(trackletId1);
    const id2 = parseInt(trackletId2);
    
    console.log('🚀 Parsed IDs:', { id1, id2, operationType, frameRange1 });
    
    if (isNaN(id1) || isNaN(id2) || id1 === id2) {
      console.log('🚀 Invalid IDs - showing alert');
      showAlert(t('dialogs.enterTwoDifferentIds'));
      return;
    }

    // Count affected annotations for confirmation
    let affectedCount = 0;
    if (operationType === 'merge') {
      affectedCount = annotations.filter(ann => ann.tracklet_id === id2).length;
    } else {
      const frames = parseFrameRange(frameRange1);
      console.log('🚀 Parsed frames for validation:', frames);
      
      // If no frame range specified, switch all frames
      const targetFrames = frames.length > 0 ? frames : 
        [...new Set(annotations
          .filter(a => a.tracklet_id === id1 || a.tracklet_id === id2)
          .map(a => a.frame)
        )];
      
      console.log('🚀 Target frames for validation:', targetFrames);
      
      affectedCount = annotations.filter(ann => 
        (ann.tracklet_id === id1 || ann.tracklet_id === id2) && 
        targetFrames.includes(ann.frame)
      ).length;
    }

    console.log('🚀 Affected count:', affectedCount);

    if (affectedCount === 0) {
      console.log('🚀 No annotations affected - showing alert');
      showAlert(t('dialogs.noAnnotationsAffected'));
      return;
    }

    const confirmMessage = operationType === 'merge' 
      ? `${t('dialogs.mergeConfirmationTitle')}\n\n` +
        t('dialogs.mergeConfirmationMessage', { 
          sourceId: id2, 
          targetId: id1, 
          count: affectedCount 
        })
      : `${t('dialogs.switchConfirmationTitle')}\n\n` +
        t('dialogs.switchConfirmationMessage', { 
          id1, 
          id2, 
          count: affectedCount, 
          frames: frameRange1 || t('dialogs.allFrames')
        });
      
    console.log('🚀 Showing first confirmation dialog');
    showConfirm(confirmMessage, () => {
      console.log('🚀 First confirmation accepted, showing second confirmation');
      
      // Close the first dialog and immediately show the second one
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      
      setTimeout(() => {
        // Second confirmation for destructive operations
        const secondConfirm = operationType === 'merge'
          ? t('dialogs.finalMergeConfirmation', { count: affectedCount, sourceId: id2, targetId: id1 })
          : t('dialogs.finalSwitchConfirmation', { count: affectedCount });
          
        showConfirm(secondConfirm, () => {
          console.log('🚀 Second confirmation accepted, calling performOperation');
          performOperation(id1, id2);
        }, 'destructive');
      }, 100);
    }, 'destructive');
  }, [trackletId1, trackletId2, frameRange1, operationType, annotations, parseFrameRange, performOperation, t, duplicateTrackletId, duplicateSourceFrame, duplicateFrameRange, overwriteExisting, getCurrentFrameNumber, convertFrameIndexToNumber]);

  if (!isOpen) return null;

  const availableIds = getAvailableTrackletIds();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 h-5/6 flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">
            {t('advancedTracklet.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors duration-200 hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
            {/* Operation Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('ui.operationType')}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOperationType('merge')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    operationType === 'merge'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🔗 {t('advancedTracklet.mergeButton')}
                </button>
                <button
                  onClick={() => setOperationType('switch')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    operationType === 'switch'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <ArrowsRightLeftIcon className="w-4 h-4 inline mr-1" />
                  {t('advancedTracklet.switchButton')}
                </button>
                <button
                  onClick={() => setOperationType('duplicate')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    operationType === 'duplicate'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📋 Duplicate
                </button>
              </div>
            </div>

            {/* Tracklet IDs */}
            {(operationType == 'switch' || operationType == 'merge') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('ui.trackletIds')}</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {operationType === 'merge' ? t('ui.targetTrackletId') : t('ui.trackletId1')}
                    </label>
                    <input
                      type="number"
                      value={trackletId1}
                      onChange={(e) => setTrackletId1(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder={t('ui.enterTrackletId')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {operationType === 'merge' ? t('ui.sourceTrackletId') : t('ui.trackletId2')}
                    </label>
                    <input
                      type="number"
                      value={trackletId2}
                      onChange={(e) => setTrackletId2(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder={t('ui.enterTrackletId')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Frame Range (only for switch) */}
            {operationType === 'switch' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('ui.frameRangeToSwitch')}</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t('ui.framesWhereSwitchIds')}
                    </label>
                    <input
                      type="text"
                      value={frameRange1}
                      onChange={(e) => setFrameRange1(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder={t('ui.frameRangeExample')}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('advancedTracklet.formatHelp')}
                </p>
                <p className="text-xs text-orange-400 mt-1">
                  {t('ui.switchIdsBothTracklets')}
                </p>
              </div>
            )}

            {/* Duplicate Operation Inputs */}
            {operationType === 'duplicate' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Duplicate Settings</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Tracklet ID
                    </label>
                    <input
                      type="number"
                      value={duplicateTrackletId}
                      onChange={(e) => setDuplicateTrackletId(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Enter tracklet ID to duplicate"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Source Frame Index (leave empty for auto-detection)
                    </label>
                    <input
                      type="number"
                      value={duplicateSourceFrame}
                      onChange={(e) => setDuplicateSourceFrame(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="e.g., 5 (frame index 5, not literal frame number)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Target Frame Index(es)
                    </label>
                    <input
                      type="text"
                      value={duplicateFrameRange}
                      onChange={(e) => setDuplicateFrameRange(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="e.g., 10, 15-20, 25 (frame indices, not literal frame numbers)"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="overwriteExisting"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="overwriteExisting" className="text-xs text-gray-400">
                      Overwrite existing annotations (if unchecked, will skip conflicting frames)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Available Tracklets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('ui.availableTrackletIds')}</label>
              <div className="bg-gray-700 rounded p-3 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {availableIds.map(id => (
                    <span
                      key={id}
                      className="px-2 py-1 bg-gray-600 text-white text-xs rounded cursor-pointer hover:bg-gray-500"
                      onClick={() => {
                        if (!trackletId1) setTrackletId1(id.toString());
                        else if (!trackletId2) setTrackletId2(id.toString());
                      }}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={generatePreview}
                disabled={isLoadingPreviews || (operationType === 'duplicate' ? (!duplicateTrackletId || !duplicateFrameRange) : (!trackletId1 || !trackletId2))}
                className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-medium"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                {isLoadingPreviews ? t('ui.generating') : t('ui.generatePreview')}
              </button>
              
              <button
                onClick={() => {
                  console.log('🎯 Apply Operation button clicked');
                  validateAndStartOperation();
                }}
                disabled={isLoadingPreviews || (operationType === 'duplicate' ? (!duplicateTrackletId || !duplicateFrameRange) : (!trackletId1 || !trackletId2))}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-medium"
              >
                {operationType === 'merge' ? '🔗' : operationType === 'duplicate' ? '📋' : <ArrowsRightLeftIcon className="w-4 h-4" />}
                {operationType === 'duplicate' ? 'Apply Duplicate' : t('ui.applyOperation', { operation: operationType === 'merge' ? t('ui.merge') : t('ui.switch') })}
              </button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col">
            {!showPreviews ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <EyeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('ui.noPreviewGenerated')}</p>
                  <p className="text-sm">{t('ui.configureAndGenerate')}</p>
                </div>
              </div>
            ) : isLoadingPreviews || !loadingProgress.isComplete ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="text-white text-lg">{t('ui.loadingPreview')}</div>
                  {loadingProgress.total > 0 && (
                    <div className="mt-4 w-64 mx-auto">
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>Loading images</span>
                        <span>{loadingProgress.loaded} / {loadingProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 p-4 flex flex-col overflow-hidden">
                <div className="mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t('ui.preview')}: {operationType === 'merge' ? t('ui.previewMergedTracklet') : t('ui.previewIdSwitch')}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {operationType === 'merge' 
                      ? t('dialogs.showingCombinedTracklet', { count: previews.length })
                      : t('ui.showingAnnotationsSwitch', { count: previews.length })
                    }
                  </p>
                </div>
                
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 p-2 bg-gray-900 rounded min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar"
                  style={{ maxHeight: 'calc(100vh - 300px)' }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    // Enable keyboard scrolling
                    if (e.key === 'ArrowDown') {
                      e.currentTarget.scrollTop += 50;
                      e.preventDefault();
                    } else if (e.key === 'ArrowUp') {
                      e.currentTarget.scrollTop -= 50;
                      e.preventDefault();
                    } else if (e.key === 'ArrowRight') {
                      e.currentTarget.scrollLeft += 50;
                      e.preventDefault();
                    } else if (e.key === 'ArrowLeft') {
                      e.currentTarget.scrollLeft -= 50;
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex flex-wrap gap-2 min-w-fit p-1">
                    {previews.map((preview) => (
                      <TrackletPreviewCard
                        key={`${preview.trackletId}-${preview.frameNumber}`}
                        preview={preview}
                        operationType={operationType}
                        targetId1={parseInt(trackletId1)}
                        generateCroppedImage={generateCroppedImage}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        description={alertDialog.description}
        variant={alertDialog.variant}
      />
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />
    </div>
  );
}

// Preview card component
interface TrackletPreviewCardProps {
  preview: TrackletPreview;
  operationType: OperationType;
  targetId1: number;
  generateCroppedImage: (preview: TrackletPreview) => Promise<string | null>;
}

function TrackletPreviewCard({ 
  preview, 
  operationType,
  targetId1,
  generateCroppedImage 
}: TrackletPreviewCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        const url = await generateCroppedImage(preview);
        setImageUrl(url);
      } catch (error) {
        console.error('Error loading preview image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [preview, generateCroppedImage]);

  const getBorderColor = () => {
    if (operationType === 'merge') return 'border-green-500';
    if (operationType === 'duplicate') return 'border-purple-500';
    return preview.trackletId === targetId1 ? 'border-blue-500' : 'border-red-500';
  };

  const getIdDisplay = () => {
    if (operationType === 'merge') return `ID ${targetId1}`;
    return `ID ${preview.trackletId}`;
  };

  return (
    <div className={`bg-gray-700 rounded-lg overflow-hidden border-2 ${getBorderColor()} flex-shrink-0 min-w-[140px]`}>
      <div className="w-32 h-32 flex items-center justify-center bg-gray-800 mx-auto">
        {isLoading ? (
          <div className="text-gray-400 text-xs">Loading...</div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Preview ${preview.frameNumber}`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-red-400 text-xs">Error</div>
        )}
      </div>
      
      <div className="p-2 text-center">
        <div className="text-white text-sm font-medium">
          Frame {preview.frameNumber}
        </div>
        <div className="text-xs text-gray-400">
          {getIdDisplay()}
        </div>
      </div>
    </div>
  );
}
