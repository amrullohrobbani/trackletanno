'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { AnnotationData } from '@/types/electron';
import { useLanguage } from '@/contexts/LanguageContext';

interface TrackletTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackletId: number;
}

interface FrameData {
  frameNumber: number;
  imagePath: string;
  annotation: AnnotationData | null;
  hasPlaceholder: boolean;
}

export default function TrackletTimelineModal({ isOpen, onClose, trackletId }: TrackletTimelineModalProps) {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [frameData, setFrameData] = useState<FrameData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [croppedImages, setCroppedImages] = useState<Map<string, string>>(new Map());

  const {
    annotations,
    getCurrentRally,
    currentFrameIndex: globalFrameIndex,
    goToFrame
  } = useAppStore();

  // Cleanup cached images when modal closes to prevent memory leaks
  useEffect(() => {
    if (!isOpen) {
      // Revoke all blob URLs to free memory
      setCroppedImages(prev => {
        prev.forEach((url) => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return new Map();
      });
    }
  }, [isOpen]); // Removed croppedImages from dependencies to prevent infinite loop

  // Generate cropped image for a frame
  const generateCroppedImage = useCallback(async (frame: FrameData): Promise<string | null> => {
    if (!frame.annotation || typeof window === 'undefined' || !window.electronAPI) {
      return null;
    }

    const cacheKey = `${frame.frameNumber}-${trackletId}`;
    if (croppedImages.has(cacheKey)) {
      return croppedImages.get(cacheKey)!;
    }

    try {
      // Load the full image with enhanced error handling
      let imageDataUrl: string;
      try {
        imageDataUrl = await window.electronAPI.getImageData(frame.imagePath);
      } catch (fileError) {
        console.error('File system error loading image:', {
          path: frame.imagePath,
          frame: frame.frameNumber,
          error: fileError
        });
        return null;
      }
      
      if (!imageDataUrl || imageDataUrl.length === 0) {
        console.warn('Empty or invalid image data received');
        return null;
      }
      
      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2D context from canvas');
        return null;
      }

      const img = new Image();
      img.src = imageDataUrl;
      
      return new Promise((resolve) => {
        img.onload = () => {
          try {
            const { x, y, w, h } = frame.annotation!;
            
            // Validate bounding box coordinates
            if (x < 0 || y < 0 || w <= 0 || h <= 0 || x >= img.width || y >= img.height) {
              console.warn('Invalid bounding box coordinates:', { x, y, w, h, imgWidth: img.width, imgHeight: img.height });
              resolve(null);
              return;
            }
            
            // Add padding around the bounding box
            const padding = 20;
            const cropX = Math.max(0, x - padding);
            const cropY = Math.max(0, y - padding);
            const cropW = Math.min(img.width - cropX, w + 2 * padding);
            const cropH = Math.min(img.height - cropY, h + 2 * padding);
            
            // Validate crop dimensions
            if (cropW <= 0 || cropH <= 0) {
              console.warn('Invalid crop dimensions:', { cropX, cropY, cropW, cropH });
              resolve(null);
              return;
            }
            
            canvas.width = cropW;
            canvas.height = cropH;
            
            // Draw the cropped image
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            
            // Draw bounding box overlay
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - cropX, y - cropY, w, h);
            
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with compression
            setCroppedImages(prev => new Map(prev.set(cacheKey, croppedDataUrl)));
            resolve(croppedDataUrl);
          } catch (canvasError) {
            console.error('Canvas drawing error:', canvasError);
            resolve(null);
          }
        };
        
        img.onerror = (imgError) => {
          console.error('Image loading error:', imgError);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error generating cropped image:', error);
      return null;
    }
  }, [trackletId, croppedImages]);

  // Load frame data when modal opens or tracklet changes
  useEffect(() => {
    if (!isOpen || !trackletId) return;

    const loadFrameData = async () => {
      setIsLoading(true);
      const rally = getCurrentRally();
      if (!rally) {
        setIsLoading(false);
        return;
      }

      try {
        const frames: FrameData[] = [];
        
        // Get all annotations for this tracklet
        const trackletAnnotations = annotations.filter(ann => ann.tracklet_id === trackletId);
        
        // Create frame data for all frames in the rally
        for (let i = 0; i < rally.imageFiles.length; i++) {
          const imagePath = rally.imageFiles[i];
          
          // Extract frame number from image filename (cross-platform compatible)
          // Handle both forward slashes (Linux) and backslashes (Windows)
          const filename = imagePath.split(/[/\\]/).pop() || '';
          const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
          
          const annotation = trackletAnnotations.find(ann => ann.frame === frameNumber) || null;
          
          frames.push({
            frameNumber,
            imagePath,
            annotation,
            hasPlaceholder: !annotation
          });
        }

        setFrameData(frames);
        
        // Set current frame index to the global frame index
        setCurrentFrameIndex(globalFrameIndex);
        
        // Load all images immediately after loading frame data
        setTimeout(() => {
          frames.forEach(async (frame) => {
            if (frame.annotation) {
              await generateCroppedImage(frame);
            }
          });
        }, 100);
        
      } catch (error) {
        console.error('Error loading frame data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFrameData();
  }, [isOpen, trackletId, annotations, getCurrentRally, globalFrameIndex, generateCroppedImage]);

  // Generate placeholder image
  const generatePlaceholderImage = useCallback((frameNumber: number): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 120;
    canvas.height = 120;
    
    // Fill with gray background
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw dashed border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Add text
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No annotation', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`Frame ${frameNumber}`, canvas.width / 2, canvas.height / 2 + 10);
    
    return canvas.toDataURL();
  }, []);

  // Navigate to frame in main canvas
  const navigateToFrame = useCallback((frameNumber: number) => {
    // Find the index of this frame number in the rally
    const rally = getCurrentRally();
    if (!rally) return;
    
    // Find the index by matching the frame number
    const frameIndex = frameData.findIndex(f => f.frameNumber === frameNumber);
    if (frameIndex !== -1) {
      // Use the index to navigate (goToFrame expects 1-based frame number for the rally)
      goToFrame(frameIndex + 1);
      setCurrentFrameIndex(frameIndex);
    }
  }, [goToFrame, frameData, getCurrentRally]);

  // Scroll to current frame
  const scrollToCurrentFrame = useCallback(() => {
    if (scrollContainerRef.current && frameData.length > 0) {
      const currentFrame = frameData[currentFrameIndex];
      if (currentFrame) {
        const frameElement = scrollContainerRef.current.querySelector(`[data-frame="${currentFrame.frameNumber}"]`);
        if (frameElement) {
          frameElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    }
  }, [currentFrameIndex, frameData]);

  // Sync with global frame changes
  useEffect(() => {
    setCurrentFrameIndex(globalFrameIndex);
  }, [globalFrameIndex]);

  // Auto-scroll to current frame when it changes
  useEffect(() => {
    if (isOpen && frameData.length > 0) {
      const timeoutId = setTimeout(scrollToCurrentFrame, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentFrameIndex, isOpen, frameData.length, scrollToCurrentFrame]);

  // Handle keyboard navigation in modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentFrameIndex > 0) {
            const prevFrame = frameData[currentFrameIndex - 1];
            if (prevFrame) navigateToFrame(prevFrame.frameNumber);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentFrameIndex < frameData.length - 1) {
            const nextFrame = frameData[currentFrameIndex + 1];
            if (nextFrame) navigateToFrame(nextFrame.frameNumber);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Home':
          e.preventDefault();
          if (frameData.length > 0) {
            navigateToFrame(frameData[0].frameNumber);
          }
          break;
        case 'End':
          e.preventDefault();
          if (frameData.length > 0) {
            navigateToFrame(frameData[frameData.length - 1].frameNumber);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentFrameIndex, frameData, navigateToFrame, onClose]);

  if (!isOpen) return null;

  const filteredFrames = showPlaceholders ? frameData : frameData.filter(frame => !frame.hasPlaceholder);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 h-5/6 flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">
              {t('tracklet.timeline')} - ID {trackletId}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-all duration-200 ${
                  showPlaceholders 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {showPlaceholders ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                {t('tracklet.showPlaceholders')}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors duration-200 hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Statistics and Progress */}
        <div className="p-4 bg-gray-700 border-b border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-6 text-sm text-gray-300">
              <span>Total Frames: {frameData.length}</span>
              <span>Annotated: {frameData.filter(f => !f.hasPlaceholder).length}</span>
              <span>Missing: {frameData.filter(f => f.hasPlaceholder).length}</span>
              <span>Current Frame: {currentFrameIndex + 1} / {frameData.length}</span>
            </div>
            <div className="text-sm text-gray-300">
              Coverage: {frameData.length > 0 ? Math.round((frameData.filter(f => !f.hasPlaceholder).length / frameData.length) * 100) : 0}%
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: frameData.length > 0 ? `${(frameData.filter(f => !f.hasPlaceholder).length / frameData.length) * 100}%` : '0%'
              }}
            />
          </div>
        </div>

        {/* Timeline Container */}
        <div className="flex-1 overflow-hidden bg-gray-850">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-white text-lg">Loading timeline...</div>
                <div className="text-gray-400 text-sm">Analyzing {trackletId} annotations</div>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="h-full overflow-x-auto overflow-y-hidden p-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
            >
              <div className="flex gap-3 h-full items-center min-w-max">
                {filteredFrames.map((frame) => (
                  <TrackletFrameCard
                    key={frame.frameNumber}
                    frame={frame}
                    isActive={frame.frameNumber === (frameData[currentFrameIndex]?.frameNumber)}
                    globalFrameIndex={globalFrameIndex}
                    onNavigate={navigateToFrame}
                    generateCroppedImage={generateCroppedImage}
                    generatePlaceholderImage={generatePlaceholderImage}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentFrameIndex > 0) {
                    const prevFrame = frameData[currentFrameIndex - 1];
                    if (prevFrame) navigateToFrame(prevFrame.frameNumber);
                  }
                }}
                disabled={currentFrameIndex === 0}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => {
                  if (currentFrameIndex < frameData.length - 1) {
                    const nextFrame = frameData[currentFrameIndex + 1];
                    if (nextFrame) navigateToFrame(nextFrame.frameNumber);
                  }
                }}
                disabled={currentFrameIndex >= frameData.length - 1}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={scrollToCurrentFrame}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
            >
              Scroll to Current
            </button>
          </div>
          <div className="text-xs text-gray-400 text-center">
            Use ← → arrow keys to navigate • ESC to close • Home/End to jump to first/last frame
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual frame card component
interface TrackletFrameCardProps {
  frame: FrameData;
  isActive: boolean;
  globalFrameIndex: number;
  onNavigate: (frameNumber: number) => void;
  generateCroppedImage: (frame: FrameData) => Promise<string | null>;
  generatePlaceholderImage: (frameNumber: number) => string;
}

function TrackletFrameCard({ 
  frame, 
  isActive, 
  globalFrameIndex,
  onNavigate, 
  generateCroppedImage, 
  generatePlaceholderImage
}: TrackletFrameCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        if (frame.hasPlaceholder) {
          const placeholderUrl = generatePlaceholderImage(frame.frameNumber);
          setImageUrl(placeholderUrl);
        } else {
          const croppedUrl = await generateCroppedImage(frame);
          if (croppedUrl) {
            setImageUrl(croppedUrl);
          } else {
            const placeholderUrl = generatePlaceholderImage(frame.frameNumber);
            setImageUrl(placeholderUrl);
          }
        }
      } catch (error) {
        console.error('Error loading frame image:', error);
        const placeholderUrl = generatePlaceholderImage(frame.frameNumber);
        setImageUrl(placeholderUrl);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [frame, generateCroppedImage, generatePlaceholderImage]);

  return (
    <div
      data-frame={frame.frameNumber}
      className={`flex-shrink-0 cursor-pointer transition-all duration-300 ease-out ${
        isActive 
          ? 'transform scale-110 ring-4 ring-blue-500 ring-opacity-75 shadow-xl' 
          : 'hover:transform hover:scale-105 hover:shadow-lg'
      }`}
      onClick={() => onNavigate(frame.frameNumber)}
    >
      <div className={`bg-gray-700 rounded-lg overflow-hidden ${
        frame.hasPlaceholder ? 'border-2 border-dashed border-gray-500' : 'border-2 border-gray-600'
      }`}>
        {/* Image */}
        <div className="w-32 h-32 flex items-center justify-center bg-gray-800">
          {isLoading ? (
            <div className="text-gray-400 text-xs">Loading...</div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Frame ${frame.frameNumber}`}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="text-red-400 text-xs">Error</div>
          )}
        </div>
        
        {/* Frame Info */}
        <div className="p-2 text-center">
          <div className="text-white text-sm font-medium">
            {isActive ? `Frame ${globalFrameIndex + 1} - ${frame.frameNumber}` : `Frame ${frame.frameNumber}`}
          </div>
          {frame.annotation && (
            <div className="text-gray-400 text-xs mt-1">
              {Math.round(frame.annotation.x)}, {Math.round(frame.annotation.y)}
            </div>
          )}
          {frame.hasPlaceholder && (
            <div className="text-yellow-400 text-xs mt-1">No annotation</div>
          )}
        </div>
      </div>
    </div>
  );
}
