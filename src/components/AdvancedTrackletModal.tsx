'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { XMarkIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { AnnotationData } from '@/types/electron';

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

type OperationType = 'merge' | 'switch';

export default function AdvancedTrackletModal({ isOpen, onClose }: AdvancedTrackletModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [operationType, setOperationType] = useState<OperationType>('merge');
  const [trackletId1, setTrackletId1] = useState<string>('');
  const [trackletId2, setTrackletId2] = useState<string>('');
  const [frameRange1, setFrameRange1] = useState<string>('');
  const [frameRange2, setFrameRange2] = useState<string>('');
  
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
    saveAnnotationsToFile
  } = useAppStore();

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
      setFrameRange2('');
    }
  }, [isOpen]);

  // Parse frame range string (e.g., "1-10" or "1,3,5" or "1")
  const parseFrameRange = useCallback((rangeStr: string): number[] => {
    if (!rangeStr.trim()) return [];
    
    const frames: number[] = [];
    const parts = rangeStr.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            frames.push(i);
          }
        }
      } else {
        const frame = parseInt(trimmed);
        if (!isNaN(frame)) {
          frames.push(frame);
        }
      }
    }
    
    return [...new Set(frames)].sort((a, b) => a - b);
  }, []);

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
    const id1 = parseInt(trackletId1);
    const id2 = parseInt(trackletId2);
    
    if (isNaN(id1) || isNaN(id2) || id1 === id2) {
      alert('Please enter two different valid tracklet IDs');
      return;
    }

    const rally = getCurrentRally();
    if (!rally) {
      alert('No rally selected');
      return;
    }

    // Validate switch operation has frame ranges
    if (operationType === 'switch') {
      const frames1 = parseFrameRange(frameRange1);
      const frames2 = parseFrameRange(frameRange2);
      
      if (frames1.length === 0 && frames2.length === 0) {
        alert('Please specify frame ranges for switching operation');
        return;
      }
    }

    // Check if tracklets exist in annotations
    const hasId1 = annotations.some(ann => ann.tracklet_id === id1);
    const hasId2 = annotations.some(ann => ann.tracklet_id === id2);
    
    if (!hasId1 && !hasId2) {
      alert(`Neither tracklet ${id1} nor tracklet ${id2} found in annotations`);
      return;
    }
    
    if (!hasId1) {
      alert(`Tracklet ${id1} not found in annotations`);
      return;
    }
    
    if (!hasId2) {
      alert(`Tracklet ${id2} not found in annotations`);
      return;
    }

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
        // For switch: show annotations in specified frame ranges
        const frames1 = parseFrameRange(frameRange1);
        const frames2 = parseFrameRange(frameRange2);
        
        // Get annotations for tracklet 1 in range 1
        frames1.forEach(frameNum => {
          const ann = annotations.find(a => a.tracklet_id === id1 && a.frame === frameNum);
          if (ann) {
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
                annotation: ann
              });
            }
          }
        });
        
        // Get annotations for tracklet 2 in range 2
        frames2.forEach(frameNum => {
          const ann = annotations.find(a => a.tracklet_id === id2 && a.frame === frameNum);
          if (ann) {
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
                annotation: ann
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
        alert('No annotations found for the specified criteria');
      }
      
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview');
    } finally {
      setIsLoadingPreviews(false);
    }
  }, [trackletId1, trackletId2, frameRange1, frameRange2, operationType, annotations, getCurrentRally, parseFrameRange, generateCroppedImage]);

  // Apply the operation
  const applyOperation = useCallback(async () => {
    const id1 = parseInt(trackletId1);
    const id2 = parseInt(trackletId2);
    
    if (isNaN(id1) || isNaN(id2) || id1 === id2) {
      alert('Please enter two different valid tracklet IDs');
      return;
    }

    // Count affected annotations for confirmation
    let affectedCount = 0;
    if (operationType === 'merge') {
      affectedCount = annotations.filter(ann => ann.tracklet_id === id2).length;
    } else {
      const frames1 = parseFrameRange(frameRange1);
      const frames2 = parseFrameRange(frameRange2);
      affectedCount = annotations.filter(ann => 
        (ann.tracklet_id === id1 && frames1.includes(ann.frame)) ||
        (ann.tracklet_id === id2 && frames2.includes(ann.frame))
      ).length;
    }

    if (affectedCount === 0) {
      alert('No annotations will be affected by this operation. Please check your settings.');
      return;
    }

    const confirmMessage = operationType === 'merge' 
      ? `⚠️ MERGE OPERATION CONFIRMATION ⚠️\n\n` +
        `This will merge tracklet ${id2} into tracklet ${id1}.\n` +
        `${affectedCount} annotations with ID ${id2} will be changed to ID ${id1}.\n\n` +
        `This action cannot be undone automatically. Continue?`
      : `⚠️ SWITCH OPERATION CONFIRMATION ⚠️\n\n` +
        `This will switch IDs between tracklet ${id1} and tracklet ${id2} in the specified frame ranges.\n` +
        `${affectedCount} annotations will be affected.\n\n` +
        `Frame ranges:\n` +
        `- Tracklet ${id1}: ${frameRange1 || 'None specified'}\n` +
        `- Tracklet ${id2}: ${frameRange2 || 'None specified'}\n\n` +
        `This action cannot be undone automatically. Continue?`;
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Second confirmation for destructive operations
    const secondConfirm = operationType === 'merge'
      ? `Final confirmation: Merge ${affectedCount} annotations from tracklet ${id2} into tracklet ${id1}?`
      : `Final confirmation: Switch IDs for ${affectedCount} annotations?`;
      
    if (!window.confirm(secondConfirm)) {
      return;
    }

    try {
      let newAnnotations = [...annotations];
      
      if (operationType === 'merge') {
        // Merge: change all id2 annotations to id1
        newAnnotations = newAnnotations.map(ann => 
          ann.tracklet_id === id2 ? { ...ann, tracklet_id: id1 } : ann
        );
        
      } else {
        // Switch: swap IDs in specified ranges
        const frames1 = parseFrameRange(frameRange1);
        const frames2 = parseFrameRange(frameRange2);
        
        newAnnotations = newAnnotations.map(ann => {
          if (ann.tracklet_id === id1 && frames1.includes(ann.frame)) {
            return { ...ann, tracklet_id: id2 };
          } else if (ann.tracklet_id === id2 && frames2.includes(ann.frame)) {
            return { ...ann, tracklet_id: id1 };
          }
          return ann;
        });
      }
      
      // Update annotations
      setAnnotations(newAnnotations);
      
      // Save to file
      await saveAnnotationsToFile();
      
      alert(`${operationType === 'merge' ? 'Merge' : 'Switch'} operation completed successfully!`);
      onClose();
      
    } catch (error) {
      console.error('Error applying operation:', error);
      alert('Error applying operation');
    }
  }, [trackletId1, trackletId2, frameRange1, frameRange2, operationType, annotations, parseFrameRange, setAnnotations, saveAnnotationsToFile, onClose]);

  if (!isOpen) return null;

  const availableIds = getAvailableTrackletIds();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 h-5/6 flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">
            Advanced Tracklet Modification
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Operation Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOperationType('merge')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    operationType === 'merge'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🔗 Merge
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
                  Switch
                </button>
              </div>
            </div>

            {/* Tracklet IDs */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Tracklet IDs</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {operationType === 'merge' ? 'Target Tracklet ID' : 'Tracklet ID 1'}
                  </label>
                  <input
                    type="number"
                    value={trackletId1}
                    onChange={(e) => setTrackletId1(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Enter tracklet ID"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {operationType === 'merge' ? 'Source Tracklet ID (will be merged)' : 'Tracklet ID 2'}
                  </label>
                  <input
                    type="number"
                    value={trackletId2}
                    onChange={(e) => setTrackletId2(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Enter tracklet ID"
                  />
                </div>
              </div>
            </div>

            {/* Frame Ranges (only for switch) */}
            {operationType === 'switch' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Frame Ranges</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Frames for Tracklet {trackletId1 || '1'}
                    </label>
                    <input
                      type="text"
                      value={frameRange1}
                      onChange={(e) => setFrameRange1(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="e.g., 1-10 or 1,3,5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Frames for Tracklet {trackletId2 || '2'}
                    </label>
                    <input
                      type="text"
                      value={frameRange2}
                      onChange={(e) => setFrameRange2(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="e.g., 11-20 or 2,4,6"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Format: Single frame (5), Range (1-10), or List (1,3,5)
                </p>
              </div>
            )}

            {/* Available Tracklets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Available Tracklet IDs</label>
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
                disabled={isLoadingPreviews || !trackletId1 || !trackletId2}
                className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-medium"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                {isLoadingPreviews ? 'Generating...' : 'Generate Preview'}
              </button>
              
              <button
                onClick={applyOperation}
                disabled={isLoadingPreviews || !trackletId1 || !trackletId2 || !showPreviews}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-medium"
              >
                {operationType === 'merge' ? '🔗' : <ArrowsRightLeftIcon className="w-4 h-4" />}
                Apply {operationType === 'merge' ? 'Merge' : 'Switch'}
              </button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col">
            {!showPreviews ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <EyeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Preview Generated</p>
                  <p className="text-sm">Configure settings and click &quot;Generate Preview&quot;</p>
                </div>
              </div>
            ) : isLoadingPreviews || !loadingProgress.isComplete ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="text-white text-lg">Loading Preview...</div>
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
                    Preview: {operationType === 'merge' ? 'Merged Tracklet' : 'ID Switch'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {operationType === 'merge' 
                      ? `Showing combined tracklet (${previews.length} annotations)`
                      : `Showing annotations that will switch IDs (${previews.length} annotations)`
                    }
                  </p>
                </div>
                
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 p-2 bg-gray-850 rounded min-h-0 overflow-auto scrollbar-none"
                >
                  <div className="flex flex-wrap gap-2">
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
    return preview.trackletId === targetId1 ? 'border-blue-500' : 'border-red-500';
  };

  const getIdDisplay = () => {
    if (operationType === 'merge') return `ID ${targetId1}`;
    return `ID ${preview.trackletId}`;
  };

  return (
    <div className={`bg-gray-700 rounded-lg overflow-hidden border-2 ${getBorderColor()} flex-shrink-0`}>
      <div className="w-32 h-32 flex items-center justify-center bg-gray-800">
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
