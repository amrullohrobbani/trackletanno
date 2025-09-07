'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RallyEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: Array<{
    key: string;
    name: string;
    label: string;
    color: string;
  }>;
}

export default function RallyEventsModal({ isOpen, onClose, eventTypes }: RallyEventsModalProps) {
  const {
    annotations,
    goToFrame,
    setSelectedTrackletId,
    setSelectedBoundingBox,
    boundingBoxes,
    currentFrameIndex,
    getCurrentRally
  } = useAppStore();

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group events by frame and tracklet
  const eventsInRally = annotations
    .filter(ann => ann.event && ann.event.trim() !== '')
    .sort((a, b) => a.frame - b.frame);

  const handleEventClick = (annotation: typeof annotations[0]) => {
    console.log('🎯 Jumping to frame:', annotation.frame, 'tracklet:', annotation.tracklet_id);
    console.log('📊 Current frame index before:', currentFrameIndex);
    
    // Get current rally to find the frame index
    const rally = getCurrentRally();
    if (rally && rally.imageFiles.length > 0) {
      // Create frame data like in TrackletTimelineModal
      const frameData = rally.imageFiles.map((imagePath, index) => {
        // Extract frame number from image filename (cross-platform compatible)
        const filename = imagePath.split(/[/\\]/).pop() || '';
        const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
        return { frameNumber, index };
      });
      
      // Find the index by matching the frame number
      const targetFrame = frameData.find(f => f.frameNumber === annotation.frame);
      
      console.log('📊 Frame data sample:', frameData.slice(0, 3)); // Show first 3
      console.log('📊 Looking for frame:', annotation.frame);
      console.log('📊 Found target frame:', targetFrame);
      
      if (targetFrame) {
        // Use 1-based indexing directly - frame index is now the same as array index + 1
        const frameIndex = targetFrame.index + 1;
        console.log('📊 Converting array index', targetFrame.index, 'to 1-based frame index:', frameIndex);
        
        // Jump to frame using the calculated frame index
        goToFrame(frameIndex);
        
        // Wait a bit for the frame to load, then select the tracklet and bounding box
        setTimeout(() => {
          console.log('📊 Current frame index in setTimeout:', currentFrameIndex);
          setSelectedTrackletId(annotation.tracklet_id);
          
          // Find and select the corresponding bounding box
          const targetBox = boundingBoxes.find(box => 
            box.tracklet_id === annotation.tracklet_id
          );
          
          if (targetBox) {
            setSelectedBoundingBox(targetBox.id);
            console.log('✅ Selected bounding box:', targetBox.id);
          } else {
            console.log('❌ No bounding box found for tracklet:', annotation.tracklet_id);
          }
        }, 100);
      } else {
        console.log('❌ Frame not found in image files:', annotation.frame);
      }
    } else {
      console.log('❌ No rally found or no image files');
    }
    
    // Close modal after navigation
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Rally Events List</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {eventsInRally.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-lg font-medium mb-2">No events found in this rally</p>
              <p className="text-sm">Annotate some events first to see them here</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-400">
                Found {eventsInRally.length} events in this rally. Click any event to jump to that frame.
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {eventsInRally.map((annotation, index) => {
                  const eventType = eventTypes.find(e => e.name === annotation.event);
                  
                  // Calculate current frame number from the current image file
                  const rally = getCurrentRally();
                  let currentFrameNumber = 1; // fallback
                  // Convert 1-based currentFrameIndex to 0-based array index
                  const arrayIndex = currentFrameIndex - 1;
                  if (rally && arrayIndex >= 0 && arrayIndex < rally.imageFiles.length) {
                    const currentImageName = rally.imageFiles[arrayIndex];
                    currentFrameNumber = parseInt(currentImageName.replace(/\D/g, ''), 10);
                  }
                  
                  const isCurrentFrame = annotation.frame === currentFrameNumber;
                  
                  return (
                    <div
                      key={`${annotation.frame}-${annotation.tracklet_id}-${index}`}
                      className={`flex items-center justify-between p-3 rounded border transition-all cursor-pointer ${
                        isCurrentFrame 
                          ? 'bg-blue-900 border-blue-600 ring-1 ring-blue-500' 
                          : 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-750'
                      }`}
                      onClick={() => handleEventClick(annotation)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${eventType?.color || 'bg-gray-500'}`}></div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {eventType?.label || annotation.event}
                            {isCurrentFrame && <span className="ml-2 text-xs text-blue-300">(Current)</span>}
                          </div>
                          <div className="text-xs text-gray-400">
                            Frame {annotation.frame} • Tracklet {annotation.tracklet_id}
                            {annotation.tracklet_id === 99 ? ' (Ball)' : ' (Player)'}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg">
                        {annotation.tracklet_id === 99 ? '⚽' : '👤'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
