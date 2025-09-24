'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store/appStore';
import { getTrackletColor, getTrackletDarkColor } from '@/utils/trackletColors';
import { AnnotationData, BoundingBox } from '@/types/electron';
import { annotationsToCSV } from '@/utils/annotationParser';
import { debugAnnotationFrameConnection } from '@/utils/debugHelpers';
import { useLanguage } from '@/contexts/LanguageContext';
import { showConfirm } from '@/utils/dialogUtils';

const HIGH_QUALITY = 95;
const LOW_QUALITY = 10;

export default function MainCanvas() {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastBoundingBoxesRef = useRef<BoundingBox[]>([]);
  const currentFrameNumberRef = useRef<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use two image states to prevent blinking during transitions
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);
  const [nextImageSrc, setNextImageSrc] = useState<string | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const {
    getCurrentImagePath,
    drawingMode,
    assignMode,
    selectedTrackletId,
    boundingBoxes,
    setBoundingBoxes,
    updateBoundingBox,
    selectedBoundingBox,
    setSelectedBoundingBox,
    currentFrameIndex,
    annotations,
    getCurrentRally,
    setAnnotations,
    setSaveStatus,
    zoomLevel,
    panX,
    panY,
    setPan,
    selectedEvent,
    assignEventToBoundingBox,
    isDeletingBox,
    showTrackletLabels,
    showEventLabels,
    ballAnnotationMode,
    addBallAnnotation,
    updateBallAnnotationEvent,
    ballAnnotations,
    removeBallAnnotation,
    canvasDimensions,
    setCanvasDimensions,
    getCurrentFrameNumber,
    visibleTrackletIds,
    setDrawingMode,
    setAssignMode,
    setBallAnnotationMode,
    setSelectedTrackletId,
    forceRedrawTimestamp,
    ballAnnotationRadius,
    getCurrentFrameBallAnnotation,
    removeCurrentFrameBallAnnotation,
    highQualityMode,
    setHighQualityMode
  } = useAppStore();

  const imagePath = getCurrentImagePath();

  // Preload adjacent frames to reduce blinking during navigation
  // Disabled in Electron environment to prevent 404 errors
  // All images are loaded securely via IPC when needed
  useEffect(() => {
    // No preloading in Electron environment
  }, [currentFrameIndex, getCurrentRally]);

  // Track image loading state changes
  useEffect(() => {
    if (imagePath) {
      // Only show loading if we don't have a current image to display
      if (!currentImageSrc) {
        setImageLoading(true);
      }
      setImageError(false);
    }
  }, [imagePath, currentImageSrc]);

  // Helper function to determine which bounding box would be selected at given coordinates
  const getClickedBox = useCallback((coords: { x: number; y: number }) => {
    // Only consider visible tracklets - completely exclude hidden ones
    const overlappingBoxes = boundingBoxes.filter(box =>
      visibleTrackletIds.has(box.tracklet_id) &&
      coords.x >= box.x &&
      coords.x <= box.x + box.width &&
      coords.y >= box.y &&
      coords.y <= box.y + box.height
    );

    if (overlappingBoxes.length === 0) return null;

    // Smart selection priority among visible boxes:
    // 1. If a tracklet is selected, prefer boxes with that tracklet ID
    let prioritizedBoxes = overlappingBoxes;
    if (selectedTrackletId !== null) {
      const matchingTrackletBoxes = overlappingBoxes.filter(box => box.tracklet_id === selectedTrackletId);
      if (matchingTrackletBoxes.length > 0) {
        prioritizedBoxes = matchingTrackletBoxes;
      }
    }
    
    // 2. If multiple boxes still remain, prefer smaller ones (more precise selection)
    const sortBySize = (boxes: typeof overlappingBoxes) => 
      boxes.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    
    return sortBySize(prioritizedBoxes)[0];
  }, [boundingBoxes, visibleTrackletIds, selectedTrackletId]);

  // Check if a bounding box has an event annotation (synchronous)
  const getBoxEventAnnotation = useCallback((box: BoundingBox, frameNumber: number) => {
    // Find the annotation that matches this bounding box
    const annotation = annotations.find(ann => 
      ann.frame === frameNumber && 
      ann.tracklet_id === box.tracklet_id &&
      ann.x === box.x && ann.y === box.y && 
      ann.w === box.width && ann.h === box.height
    );
    
    return annotation?.event || null;
  }, [annotations]);

  // Load and display image securely using buffer system

  const loadImage = useCallback(async () => {
    if (!imagePath || typeof window === 'undefined' || !window.electronAPI) {
      return;
    }

    try {
      setIsLoadingNext(true);
      // Use the secure image loading method
      const imageDataUrl = await window.electronAPI.getImageData(imagePath);
      setNextImageSrc(imageDataUrl);
      
    } catch (error) {
      console.error('Error loading image:', error);
      setIsLoadingNext(false);
      setImageError(true);
    }
  }, [imagePath]);

  // Load image immediately when path changes
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Convert annotations to bounding boxes for current frame
  useEffect(() => {
    // Skip recreation if we're in the middle of deleting a box
    if (isDeletingBox) {
      console.log('Skipping bounding box recreation - deletion in progress');
      return;
    }

    const getCurrentFrameNumber = async () => {
      if (!imagePath || typeof window === 'undefined' || !window.electronAPI) {
        return;
      }

      try {
        // Extract filename from path (handle both Windows and Unix path separators)
        const filename = imagePath.split(/[/\\]/).pop() || '';
        const frameNumber = await window.electronAPI.getFrameNumber(filename);
        
        // Update the frame number ref immediately to ensure consistency
        currentFrameNumberRef.current = frameNumber;
        
        // Filter annotations for this specific frame number
        const currentFrameAnnotations = annotations.filter(ann => ann.frame === frameNumber);
        
        const boxes: BoundingBox[] = currentFrameAnnotations
          .filter(ann => ann.tracklet_id !== 99) // Exclude ball annotations (ID 99) from bounding boxes
          .map((ann, index) => ({
            id: `annotation-${ann.frame}-${ann.tracklet_id}-${index}`,
            tracklet_id: ann.tracklet_id,
            x: ann.x,
            y: ann.y,
            width: ann.w,
            height: ann.h,
            team: ann.team,
            jersey_number: ann.jersey_number,
            selected: false
          }));
        
        // Use requestAnimationFrame to batch updates and reduce blinking
        requestAnimationFrame(() => {
          // Only update bounding boxes if they are actually different
          // This prevents unnecessary re-renders and potential conflicts with deletion
          const currentBoxes = lastBoundingBoxesRef.current;
          const boxesChanged = currentBoxes.length !== boxes.length || 
            !currentBoxes.every((box, index) => {
              const newBox = boxes[index];
              return newBox && box.tracklet_id === newBox.tracklet_id && 
                     box.x === newBox.x && box.y === newBox.y && 
                     box.width === newBox.width && box.height === newBox.height;
            });
          
          if (boxesChanged) {
            setBoundingBoxes(boxes);
            lastBoundingBoxesRef.current = boxes;
          }
        });
        
        // Debug annotation-frame connection when no annotations are found
        if (process.env.NODE_ENV === 'development' && currentFrameAnnotations.length === 0) {
          debugAnnotationFrameConnection(imagePath, annotations, frameNumber);
        }
      } catch (error) {
        console.error('Error getting frame number:', error);
        setBoundingBoxes([]);
        currentFrameNumberRef.current = 1;
      }
    };

    getCurrentFrameNumber();
  }, [imagePath, annotations, setBoundingBoxes, currentFrameIndex, isDeletingBox]);

  // Update ref when boundingBoxes change from store
  useEffect(() => {
    lastBoundingBoxesRef.current = boundingBoxes;
  }, [boundingBoxes]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || imageLoading) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use try-catch to handle any drawing errors gracefully
    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save the current context state
      ctx.save();

      // Apply pan (translation) first, then zoom (scale)
      ctx.translate(panX, panY);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw image at original size - the transformations will handle zoom/pan
      ctx.drawImage(image, 0, 0, canvasDimensions.width, canvasDimensions.height);

    // Draw current drawing rectangle AFTER transformations (in canvas coordinates)
    if (currentRect) {
      ctx.save();
      ctx.strokeStyle = '#10B981'; // Green for new drawing
      ctx.lineWidth = 2 / zoomLevel; // Keep line width constant regardless of zoom
      ctx.setLineDash([]);
      
      // Draw rectangle directly in canvas coordinates (no conversion needed)
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      
      // Add corner indicators for precise cursor alignment feedback
      const cornerSize = 4 / zoomLevel;
      ctx.fillStyle = '#10B981';
      // Top-left corner (most important - should match start point exactly)
      ctx.fillRect(currentRect.x - cornerSize/2, currentRect.y - cornerSize/2, cornerSize, cornerSize);
      // Top-right corner
      ctx.fillRect(currentRect.x + currentRect.width - cornerSize/2, currentRect.y - cornerSize/2, cornerSize, cornerSize);
      // Bottom-left corner
      ctx.fillRect(currentRect.x - cornerSize/2, currentRect.y + currentRect.height - cornerSize/2, cornerSize, cornerSize);
      // Bottom-right corner
      ctx.fillRect(currentRect.x + currentRect.width - cornerSize/2, currentRect.y + currentRect.height - cornerSize/2, cornerSize, cornerSize);
      
      // Debug: Verify that the rectangle's top-left corner matches the start point
      if (startPoint && isDrawing) {
        const topLeftMatches = Math.abs(currentRect.x - startPoint.x) < 0.01 && Math.abs(currentRect.y - startPoint.y) < 0.01;
        if (!topLeftMatches) {
          console.warn('⚠️ Rectangle top-left does not match start point!', {
            rectTopLeft: { x: currentRect.x, y: currentRect.y },
            startPoint: startPoint,
            xDiff: Math.abs(currentRect.x - startPoint.x),
            yDiff: Math.abs(currentRect.y - startPoint.y)
          });
        }
      }
      
      ctx.restore();
    }

    // Draw cursor position indicator when actively drawing (for precise cursor feedback)
    if (drawingMode && cursorPosition && isDrawing) {
      ctx.save();
      ctx.strokeStyle = '#FF4444'; // Subtle red cursor indicator
      ctx.lineWidth = 1 / zoomLevel;
      ctx.setLineDash([2 / zoomLevel, 2 / zoomLevel]); // Dashed line
      
      const crosshairSize = 8 / zoomLevel; // Slightly larger for better visibility during debugging
      // Draw small crosshair at cursor position
      ctx.beginPath();
      // Horizontal line
      ctx.moveTo(cursorPosition.x - crosshairSize, cursorPosition.y);
      ctx.lineTo(cursorPosition.x + crosshairSize, cursorPosition.y);
      // Vertical line
      ctx.moveTo(cursorPosition.x, cursorPosition.y - crosshairSize);
      ctx.lineTo(cursorPosition.x, cursorPosition.y + crosshairSize);
      ctx.stroke();
      
      // Add a center dot for precise positioning
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(cursorPosition.x, cursorPosition.y, 1 / zoomLevel, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.restore();
    }

    // Draw start point indicator when drawing (blue circle to show exact start position)
    if (drawingMode && startPoint && isDrawing) {
      ctx.save();
      ctx.strokeStyle = '#0066FF'; // Blue for start point
      ctx.fillStyle = '#0066FF';
      ctx.lineWidth = 2 / zoomLevel;
      
      // Draw a small blue circle at the exact start point
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 3 / zoomLevel, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      
      // Add a white center dot for contrast
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 1 / zoomLevel, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw horizontal and vertical lines through the start point for precise alignment
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 1 / zoomLevel;
      ctx.setLineDash([2 / zoomLevel, 2 / zoomLevel]);
      
      // Horizontal line through start point
      ctx.beginPath();
      ctx.moveTo(startPoint.x - 20 / zoomLevel, startPoint.y);
      ctx.lineTo(startPoint.x + 20 / zoomLevel, startPoint.y);
      ctx.stroke();
      
      // Vertical line through start point
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y - 20 / zoomLevel);
      ctx.lineTo(startPoint.x, startPoint.y + 20 / zoomLevel);
      ctx.stroke();
      
      ctx.restore();
    }

    // Draw existing bounding boxes
    boundingBoxes.forEach((box) => {
      // Skip if this tracklet is hidden
      if (!visibleTrackletIds.has(box.tracklet_id)) {
        return;
      }
      
      const isSelected = selectedBoundingBox === box.id;
      const isSelectedTracklet = selectedTrackletId === box.tracklet_id;
      const isHovered = hoveredBoxId === box.id;
      const boxColor = getTrackletColor(box.tracklet_id, isSelected || isSelectedTracklet);
      
      ctx.strokeStyle = boxColor;
      // Keep line width constant regardless of zoom for better visibility
      // Make selected tracklet bounding boxes thicker, hovered boxes slightly thicker
      ctx.lineWidth = (isSelected ? 4 : isSelectedTracklet ? 3 : isHovered ? 2.5 : 2) / zoomLevel;
      // Use solid lines for all bounding boxes
      ctx.setLineDash([]);
      
      // Add glow effect for selected tracklet or hovered box
      if ((isSelectedTracklet && !isSelected) || isHovered) {
        ctx.shadowColor = boxColor;
        ctx.shadowBlur = isHovered ? 5 / zoomLevel : 10 / zoomLevel;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.shadowBlur = 0; // Reset shadow
      } else {
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
      
      // Draw tracklet ID and team label background at the bottom
      // Skip labels for ball annotations (tracklet_id === 99)
      if (showTrackletLabels && box.tracklet_id !== 99) {
        const labelWidth = box.team ? 120 : 70;
        const labelHeight = 30;
        const darkColor = getTrackletDarkColor(box.tracklet_id);
        ctx.fillStyle = darkColor;
        ctx.fillRect(box.x, box.y + box.height, labelWidth, labelHeight);
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2 / zoomLevel;
        ctx.strokeRect(box.x, box.y + box.height, labelWidth, labelHeight);
        const fontSize = Math.max(14, 14 / zoomLevel);
        ctx.font = `bold ${fontSize}px Arial`;
        const textY = box.y + box.height + 20;
        ctx.lineWidth = 3 / zoomLevel;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';
        console.log(box)
        const text = box.team && box.team.trim() !== '' 
          ? `ID: ${box.tracklet_id} | ${box.team === '0' ? 'Home' : 'Away'} | ${box.jersey_number || ''}` 
          : `ID: ${box.tracklet_id}`;
        ctx.strokeText(text, box.x + 5, textY);
        ctx.fillText(text, box.x + 5, textY);
      }
      // Draw event label indicator if enabled
      if (showEventLabels) {
        // Check if this bounding box has an event annotation and draw indicator
        const eventAnnotation = getBoxEventAnnotation(box, currentFrameNumberRef.current);
        if (eventAnnotation && eventAnnotation.trim() !== '') {
          // Draw event indicator - show the actual event type
          const indicatorHeight = Math.max(20, 20 / zoomLevel);
          const padding = 4 / zoomLevel;
          
          // Determine display text and background color based on event type
          const displayText = eventAnnotation.toUpperCase();
          let backgroundColor = '#FFD700'; // Default gold
          let borderColor = '#FFA500'; // Default orange
          
          // Customize colors for different event types
          switch (eventAnnotation.toLowerCase()) {
            case 'serve':
              backgroundColor = '#EF4444'; // Red
              borderColor = '#DC2626';
              break;
            case 'receive':
              backgroundColor = '#3B82F6'; // Blue
              borderColor = '#2563EB';
              break;
            case 'dig':
              backgroundColor = '#10B981'; // Green
              borderColor = '#059669';
              break;
            case 'pass':
              backgroundColor = '#F59E0B'; // Yellow
              borderColor = '#D97706';
              break;
            case 'set':
              backgroundColor = '#8B5CF6'; // Purple
              borderColor = '#7C3AED';
              break;
            case 'spike':
              backgroundColor = '#F97316'; // Orange
              borderColor = '#EA580C';
              break;
            case 'block':
              backgroundColor = '#64748B'; // Gray
              borderColor = '#475569';
              break;
            case 'kill':
              backgroundColor = '#DC2626'; // Dark red
              borderColor = '#B91C1C';
              break;
          }
          
          // Measure text to determine indicator width
          ctx.font = `bold ${Math.max(12, 12 / zoomLevel)}px Arial`;
          const textWidth = ctx.measureText(displayText).width;
          const indicatorWidth = textWidth + (padding * 2);
          
          // Position indicator in top-right corner
          const indicatorX = box.x + box.width - indicatorWidth;
          const indicatorY = box.y;
          
          // Draw background rectangle
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
          
          // Draw border
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2 / zoomLevel;
          ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
          
          // Draw event text
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.max(11, 11 / zoomLevel)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Add text stroke for better visibility
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1 / zoomLevel;
          ctx.strokeText(displayText, indicatorX + indicatorWidth / 2, indicatorY + indicatorHeight / 2);
          ctx.fillText(displayText, indicatorX + indicatorWidth / 2, indicatorY + indicatorHeight / 2);
          
          // Reset text alignment for other text
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    });

    // Draw ball annotations as points
    if (ballAnnotations && ballAnnotations.length > 0 && visibleTrackletIds.has(99)) {
      
      ballAnnotations.forEach((ballAnnotation) => {
        // Only draw ball annotations for the current frame
        if (ballAnnotation.frame === currentFrameNumberRef.current) {
          const ballCenterX = ballAnnotation.x;
          const ballCenterY = ballAnnotation.y;
          
          // Smaller, more distinct ball indicator - absolute visual size (scaled inversely to zoom)
          const ballRadius = ballAnnotationRadius / zoomLevel; // Scale inversely to zoom for absolute visual size
          const borderWidth = 2 / zoomLevel; // Scale border inversely to zoom
          
          // Draw outer white border circle for better visibility
          ctx.beginPath();
          ctx.arc(ballCenterX, ballCenterY, ballRadius + borderWidth, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          
          // Draw main ball circle (bright orange)
          ctx.beginPath();
          ctx.arc(ballCenterX, ballCenterY, ballRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF4500'; // More vibrant orange
          ctx.fill();
          
          // Draw inner highlight for 3D effect
          ctx.beginPath();
          ctx.arc(ballCenterX - ballRadius * 0.3, ballCenterY - ballRadius * 0.3, ballRadius * 0.4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFB347'; // Light orange highlight
          ctx.fill();
          
          // Draw center crosshair for precise positioning - maintain size relative to zoom for visibility
          const crosshairSize = 1 / zoomLevel; // Adjust for zoom to maintain visual size
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = crosshairSize;
          ctx.beginPath();
          // Horizontal line
          ctx.moveTo(ballCenterX - 2 / zoomLevel, ballCenterY);
          ctx.lineTo(ballCenterX + 2 / zoomLevel, ballCenterY);
          // Vertical line
          ctx.moveTo(ballCenterX, ballCenterY - 2 / zoomLevel);
          ctx.lineTo(ballCenterX, ballCenterY + 2 / zoomLevel);
          ctx.stroke();
          
          // Draw tracklet ID label for ball (always 99) - Position above the ball
          if (showTrackletLabels) {
            const labelWidth = 50 / zoomLevel; // Scale width inversely to zoom
            const labelHeight = 25 / zoomLevel; // Scale height inversely to zoom
            const labelX = ballAnnotation.x - labelWidth / 2;
            const labelY = ballAnnotation.y - ballRadius - labelHeight - (10 / zoomLevel); // Scale spacing inversely to zoom
            
            // Draw label background
            ctx.fillStyle = 'rgba(255, 107, 53, 0.9)'; // Semi-transparent orange
            ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label border
            ctx.strokeStyle = '#FF4500'; // Use the same orange as the ball
            ctx.lineWidth = 2 / zoomLevel; // Scale line width inversely to zoom
            ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label text - scale font size inversely to zoom for absolute visual size
            const fontSize = 12 / zoomLevel; // Scale font size inversely to zoom
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add text stroke for better visibility - scale stroke width inversely to zoom
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / zoomLevel; // Scale stroke width inversely to zoom
            ctx.strokeText('Ball 99', labelX + labelWidth / 2, labelY + labelHeight / 2);
            ctx.fillText('Ball 99', labelX + labelWidth / 2, labelY + labelHeight / 2);
            
            // Reset text alignment
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          }
          
          // Draw event label for ball if enabled and event exists - Position above the ball label
          if (showEventLabels && ballAnnotation.event && ballAnnotation.event.trim() !== '') {
            const eventText = ballAnnotation.event.toUpperCase();
            const indicatorHeight = 20 / zoomLevel; // Scale height inversely to zoom for absolute visual size
            const padding = 4 / zoomLevel; // Scale padding inversely to zoom
            
            // Measure text to determine indicator width - scale font size inversely to zoom
            ctx.font = `bold ${12 / zoomLevel}px Arial`; // Scale font size inversely to zoom
            const textWidth = ctx.measureText(eventText).width;
            const indicatorWidth = textWidth + (padding * 2);
            
            // Position indicator above the ball label (or above ball if no label)
            const indicatorX = ballAnnotation.x - indicatorWidth / 2;
            const indicatorY = showTrackletLabels 
              ? ballAnnotation.y - ballRadius - (25 / zoomLevel) - indicatorHeight - (15 / zoomLevel) // Above the tracklet label (scale spacing)
              : ballAnnotation.y - ballRadius - indicatorHeight - (10 / zoomLevel); // Above the ball if no tracklet label (scale spacing)
            
            // Draw background rectangle
            ctx.fillStyle = '#FFD700'; // Gold for ball events
            ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            // Draw border - scale line width inversely to zoom
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2 / zoomLevel; // Scale line width inversely to zoom
            ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            // Draw event text - scale font size inversely to zoom for absolute visual size
            ctx.fillStyle = 'black';
            ctx.font = `bold ${11 / zoomLevel}px Arial`; // Scale font size inversely to zoom
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(eventText, indicatorX + indicatorWidth / 2, indicatorY + indicatorHeight / 2);
            
            // Reset text alignment
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          }
        }
      });
    }

    // Draw crosshair lines when in drawing mode and cursor is over canvas
    if (drawingMode && cursorPosition && !isDrawing) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white
      ctx.lineWidth = 1 / zoomLevel;
      ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]); // Dashed lines for subtle effect
      
      // Get the actual canvas bounds considering zoom and pan
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        // Draw full-width horizontal crosshair line
        ctx.beginPath();
        ctx.moveTo(-panX / zoomLevel, cursorPosition.y);
        ctx.lineTo((canvasDimensions.width - panX) / zoomLevel, cursorPosition.y);
        ctx.stroke();
        
        // Draw full-height vertical crosshair line  
        ctx.beginPath();
        ctx.moveTo(cursorPosition.x, -panY / zoomLevel);
        ctx.lineTo(cursorPosition.x, (canvasDimensions.height - panY) / zoomLevel);
        ctx.stroke();
      }
      
      ctx.restore();
    }

    // Restore the context state
    ctx.restore();
    } catch (error) {
      console.error('Error drawing canvas:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundingBoxes, selectedBoundingBox, selectedTrackletId, hoveredBoxId, currentRect, zoomLevel, panX, panY, canvasDimensions, getBoxEventAnnotation, showTrackletLabels, showEventLabels, ballAnnotations, visibleTrackletIds, drawingMode, cursorPosition, isDrawing, startPoint, forceRedrawTimestamp, ballAnnotationRadius, imageLoading]);

  // Redraw canvas when image loads or data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Clear cursor position when leaving drawing mode
  useEffect(() => {
    if (!drawingMode) {
      setCursorPosition(null);
    }
  }, [drawingMode]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // STEP 1: Get basic mouse position relative to canvas element
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // STEP 2: The key insight - we need to account for the CSS object-fit: contain behavior
    // The canvas element might be letterboxed/pillarboxed to maintain aspect ratio
    
    // Calculate the actual displayed image area within the canvas element
    const canvasAspectRatio = canvasDimensions.width / canvasDimensions.height;
    const displayAspectRatio = rect.width / rect.height;
    
    let actualImageWidth, actualImageHeight, offsetX, offsetY;
    
    if (canvasAspectRatio > displayAspectRatio) {
      // Image is wider - letterboxed (black bars on top/bottom)
      actualImageWidth = rect.width;
      actualImageHeight = rect.width / canvasAspectRatio;
      offsetX = 0;
      offsetY = (rect.height - actualImageHeight) / 2;
    } else {
      // Image is taller - pillarboxed (black bars on left/right)
      actualImageWidth = rect.height * canvasAspectRatio;
      actualImageHeight = rect.height;
      offsetX = (rect.width - actualImageWidth) / 2;
      offsetY = 0;
    }
    
    // STEP 3: Convert mouse coordinates to the actual image area
    const imageRelativeX = mouseX - offsetX;
    const imageRelativeY = mouseY - offsetY;
    
    // STEP 4: Scale to canvas internal coordinates
    let canvasX = (imageRelativeX / actualImageWidth) * canvasDimensions.width;
    let canvasY = (imageRelativeY / actualImageHeight) * canvasDimensions.height;
    
    // STEP 5: Apply zoom/pan transformations if they're not at defaults
    if (zoomLevel !== 1.0 || panX !== 0 || panY !== 0) {
      // Apply inverse transformations
      canvasX = (canvasX - panX) / zoomLevel;
      canvasY = (canvasY - panY) / zoomLevel;
    }
    
    // STEP 6: Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(canvasDimensions.width, canvasX));
    const clampedY = Math.max(0, Math.min(canvasDimensions.height, canvasY));
    
    return {
      x: Math.round(clampedX * 100) / 100,
      y: Math.round(clampedY * 100) / 100
    };
  };

  const handleMouseDown = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    // For selection/assignment modes, we still need canvas coordinates immediately
    const coords = getCanvasCoordinates(event);

    // Check for middle mouse button or right mouse button for panning
    if (event.button === 1 || event.button === 2) { // Middle mouse button (1) or right mouse button (2)
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    // Ball annotation mode - handle first to prevent other modes from interfering
    if (ballAnnotationMode || selectedTrackletId === 99) {
      const rally = getCurrentRally();
      // Convert 1-based currentFrameIndex to 0-based array index
      const arrayIndex = currentFrameIndex - 1;
      if (rally && arrayIndex >= 0 && arrayIndex < rally.imageFiles.length) {
        const frameNumber = getCurrentFrameNumber();
        if (frameNumber !== null) {
          console.log('Ball annotation mode - frameNumber:', frameNumber, 'coords:', coords, 'selectedEvent:', selectedEvent);
          // Check if clicking on an existing ball annotation first
          const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
            if (ballAnnotation.frame === frameNumber) {
              const distance = Math.sqrt(
                Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
              );
              return distance <= ballAnnotationRadius;
            }
            return false;
          });

          if (clickedBallAnnotation && selectedEvent !== null) {
            // Update the event for the existing ball annotation using store action
            updateBallAnnotationEvent(frameNumber, selectedEvent);
            return; // Exit early after updating event
          } else {
            // Add new ball annotation at the clicked point (always use tracklet ID 99)
            addBallAnnotation(coords.x, coords.y, frameNumber, selectedEvent || undefined);
          }
        }
      }
      return; // Exit early to prevent other handlers
    }

    // Handle clicking on ball annotation indicator for event annotation (when not in ball annotation mode)
    if (!ballAnnotationMode && selectedTrackletId !== 99) {
      const rally = getCurrentRally();
      // Convert 1-based currentFrameIndex to 0-based array index
      const arrayIndex = currentFrameIndex - 1;
      if (rally && arrayIndex >= 0 && arrayIndex < rally.imageFiles.length) {
        const frameNumber = getCurrentFrameNumber();
        if (frameNumber !== null) {
          // Check if clicking on an existing ball annotation
          const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
            if (ballAnnotation.frame === frameNumber) {
              const distance = Math.sqrt(
                Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
              );
              return distance <= ballAnnotationRadius;
            }
            return false;
          });

          if (clickedBallAnnotation && selectedEvent !== null) {
            // Update the event for the existing ball annotation using store action
            updateBallAnnotationEvent(frameNumber, selectedEvent);
            return; // Exit early after updating event
          }
        }
      }
    }

    if (assignMode) {
      // Use smart selection logic for assignment
      const clickedBox = getClickedBox(coords);

      if (clickedBox && selectedTrackletId !== null) {
        // Smart ID switching: If the target ID already exists in the current frame, swap the IDs
        const existingBoxWithTargetId = boundingBoxes.find(box => 
          box.tracklet_id === selectedTrackletId && box.id !== clickedBox.id
        );
        
        if (existingBoxWithTargetId) {
          // Swap the tracklet IDs between the two boxes
          const clickedBoxOriginalId = clickedBox.tracklet_id;
          
          console.log(`🔄 Smart ID swap: Box "${clickedBox.id}" (ID ${clickedBoxOriginalId}) ↔ Box "${existingBoxWithTargetId.id}" (ID ${selectedTrackletId})`);
          
          // Update both bounding boxes immediately for visual feedback
          updateBoundingBox(clickedBox.id, { tracklet_id: selectedTrackletId });
          updateBoundingBox(existingBoxWithTargetId.id, { tracklet_id: clickedBoxOriginalId });
          
          // Update annotation data for both boxes in a single operation
          try {
            await swapAnnotationIds(clickedBox, existingBoxWithTargetId, selectedTrackletId, clickedBoxOriginalId);
            console.log(`✅ ID swap completed successfully`);
          } catch (error) {
            console.error('Error during ID swap annotation update:', error);
          }
          
          // Select the clicked box
          setSelectedBoundingBox(clickedBox.id);
        } else {
          // Normal assignment - no existing box with target ID
          updateBoundingBox(clickedBox.id, { tracklet_id: selectedTrackletId });
          setSelectedBoundingBox(clickedBox.id);
          
          // Update the annotation data
          try {
            await updateAnnotationData(clickedBox, selectedTrackletId);
            console.log(`✅ Assigned tracklet ID ${selectedTrackletId} to box "${clickedBox.id}"`);
          } catch (error) {
            console.error('Error updating annotation data:', error);
          }
        }
        
        // If an event is also selected, assign it to the clicked box
        if (selectedEvent !== null) {
          assignEventToBoundingBox(clickedBox.id, selectedEvent);
        }
      }
    } else if (drawingMode && selectedTrackletId !== null && selectedTrackletId !== 99) {
      // Start drawing new bounding box using CANVAS coordinates (consistent with final result)
      // Force clear any lingering state from previous drawing session FIRST
      if (isDrawing || startPoint || currentRect) {
        // Previous drawing state detected, force clearing
      }
      
      // Set new drawing state - this should override any previous state
      setIsDrawing(true);
      setStartPoint(coords); // Store canvas coordinates during drawing
      setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else {
      // Selection mode - use smart selection logic
      const clickedBox = getClickedBox(coords);

      if (clickedBox) {
        // If an event is selected, assign it AND keep the selection
        if (selectedEvent !== null) {
          assignEventToBoundingBox(clickedBox.id, selectedEvent);
          // Also select the tracklet and bounding box to maintain selection persistence
          setSelectedTrackletId(clickedBox.tracklet_id);
          setSelectedBoundingBox(clickedBox.id);
          console.log(`Assigned event "${selectedEvent}" to tracklet ID ${clickedBox.tracklet_id} and maintained selection`);
        } else {
          // Normal selection mode when no event is selected
          setSelectedTrackletId(clickedBox.tracklet_id);
          setSelectedBoundingBox(clickedBox.id);
          console.log(`Selected tracklet ID ${clickedBox.tracklet_id} via bounding box`);
        }
      } else {
        // Clear both selections when clicking empty space
        setSelectedTrackletId(null);
        setSelectedBoundingBox(null);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // For hover effects, we need canvas coordinates
    const coords = getCanvasCoordinates(event);
    
    // Track cursor position only when in drawing mode for performance
    if (drawingMode) {
      setCursorPosition(coords);
    }
    
    // Update hovered box for visual feedback
    const hoveredBox = getClickedBox(coords);
    setHoveredBoxId(hoveredBox?.id || null);

    if (isPanning && lastPanPoint) {
      // Handle panning
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      
      setPan(panX + deltaX, panY + deltaY);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    if (!isDrawing || !startPoint) return;

    // During drawing, use CANVAS coordinates for consistent behavior
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;

    const newRect = {
      x: width < 0 ? coords.x : startPoint.x,
      y: height < 0 ? coords.y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height)
    };

    setCurrentRect(newRect);
  };

  const saveAnnotationFile = useCallback(async (annotationData: AnnotationData[]) => {
    const rally = getCurrentRally();
    if (!rally || typeof window === 'undefined' || !window.electronAPI) return;

    setSaveStatus('saving');
    
    try {
      // Use the annotation parser to convert to CSV format
      const csvContent = annotationsToCSV(annotationData);

      await window.electronAPI.saveAnnotationFile(rally.annotationFile, csvContent);
      setSaveStatus('saved');
      
      // Clear saved status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving annotation file:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [getCurrentRally, setSaveStatus]);

  const addAnnotationData = useCallback(async (box: BoundingBox) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      if (!imagePath) return;

      const filename = imagePath.split(/[/\\]/).pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

      // Find existing annotation for this frame and tracklet to preserve its fields
      const existingAnnotation = annotations.find(
        ann => ann.frame === frameNumber && ann.tracklet_id === box.tracklet_id
      );

      // Remove any existing annotation with the same tracklet ID and frame number
      const filteredAnnotations = annotations.filter(ann => 
        !(ann.frame === frameNumber && ann.tracklet_id === box.tracklet_id)
      );

      const newAnnotation: AnnotationData = {
        frame: frameNumber,
        tracklet_id: box.tracklet_id,
        x: box.x,
        y: box.y,
        w: box.width,
        h: box.height,
        score: 1.0,
        // Preserve existing fields if updating, use defaults if creating new
        role: existingAnnotation?.role || '',
        jersey_number: existingAnnotation?.jersey_number || '',
        jersey_color: existingAnnotation?.jersey_color || '',
        team: existingAnnotation?.team || '',
        event: existingAnnotation?.event || ''
      };

      const updatedAnnotations = [...filteredAnnotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      saveAnnotationFile(updatedAnnotations);
    } catch (error) {
      console.error('Error adding annotation data:', error);
    }
  }, [imagePath, annotations, setAnnotations, saveAnnotationFile]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (isDrawing && currentRect && selectedTrackletId !== null && startPoint) {
      // Check if the drawn rectangle is large enough (minimum 5x5 pixels to avoid single dots)
      const minSize = 5;
      if (currentRect.width < minSize || currentRect.height < minSize) {
        // Don't create a bounding box for very small rectangles (single dots)
        setCurrentRect(null);
        setIsDrawing(false);
        setStartPoint(null);
        return;
      }

      // Canvas coordinates are already stored in currentRect, no conversion needed
      const canvasRect = {
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height
      };

      // Remove any existing bounding box with the same tracklet ID on the current frame
      const currentFrameBoundingBoxes = boundingBoxes.filter(box => 
        box.tracklet_id !== selectedTrackletId
      );

      // Add the new bounding box with CANVAS coordinates
      const newBox: BoundingBox = {
        id: `new-${Date.now()}`,
        tracklet_id: selectedTrackletId,
        x: canvasRect.x,
        y: canvasRect.y,
        width: canvasRect.width,
        height: canvasRect.height,
        team: '' // Start with empty team, can be assigned later
      };

      // Update bounding boxes to replace any existing box with same tracklet ID
      setBoundingBoxes([...currentFrameBoundingBoxes, newBox]);
      
      // Add to annotation data (this will also handle removing existing annotations with same tracklet ID)
      addAnnotationData(newBox);
      
      setCurrentRect(null);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  }, [isPanning, isDrawing, currentRect, selectedTrackletId, startPoint, boundingBoxes, setBoundingBoxes, addAnnotationData]);

  const handleMouseLeave = () => {
    // Clear hover state when mouse leaves canvas
    setHoveredBoxId(null);
    setCursorPosition(null); // Clear cursor position indicator
    
    // Only cancel panning when cursor leaves canvas, but keep drawing active
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
    }
    
    // Note: We intentionally do NOT cancel drawing here.
    // This allows users to continue drawing even if their cursor briefly leaves the canvas.
    // The drawing will complete when they release the mouse button (handleMouseUp).
  };
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Zoom in/out based on wheel direction
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));

    // Calculate new pan to zoom towards mouse position
    const zoomRatio = newZoom / zoomLevel;
    const newPanX = mouseX - (mouseX - panX) * zoomRatio;
    const newPanY = mouseY - (mouseY - panY) * zoomRatio;

    // Update zoom and pan
    useAppStore.setState({ 
      zoomLevel: newZoom, 
      panX: newPanX, 
      panY: newPanY 
    });
  }, [zoomLevel, panX, panY]);

  // Prevent context menu on right-click to allow right-click panning
  const handleContextMenu = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    // Check if right-clicking on a ball annotation for deletion
    const coords = getCanvasCoordinates(event);
    const rally = getCurrentRally();
    // Convert 1-based currentFrameIndex to 0-based array index
    const arrayIndex = currentFrameIndex - 1;
    if (!rally || arrayIndex < 0 || arrayIndex >= rally.imageFiles.length) return;
    
    const currentFrameNumber = getCurrentFrameNumber();
    if (currentFrameNumber === null) return;
    
    // Check if clicked on a ball annotation (within radius)
    const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
      if (ballAnnotation.frame === currentFrameNumber) {
        const distance = Math.sqrt(
          Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
        );
        return distance <= ballAnnotationRadius;
      }
      return false;
    });
    
    if (clickedBallAnnotation) {
      const shouldDelete = await showConfirm(t('dialogs.deleteBallAnnotation'));
      if (shouldDelete) {
        removeBallAnnotation(currentFrameNumber);
      }
    }
  };

  const updateAnnotationData = async (box: BoundingBox, newTrackletId: number) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      if (!imagePath) return;

      const filename = imagePath.split(/[/\\]/).pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

      const updatedAnnotations = annotations.map(ann => {
        if (ann.frame === frameNumber && 
            ann.x === box.x && ann.y === box.y && 
            ann.w === box.width && ann.h === box.height) {
          return { ...ann, tracklet_id: newTrackletId };
        }
        return ann;
      });
      
      setAnnotations(updatedAnnotations);
      saveAnnotationFile(updatedAnnotations);
    } catch (error) {
      console.error('Error updating annotation data:', error);
    }
  };

  // Specialized function for swapping tracklet IDs between two boxes in a single operation
  const swapAnnotationIds = async (box1: BoundingBox, box2: BoundingBox, newId1: number, newId2: number) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      if (!imagePath) return;

      const filename = imagePath.split(/[/\\]/).pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

      const updatedAnnotations = annotations.map(ann => {
        if (ann.frame === frameNumber) {
          // Update annotation for box1
          if (ann.x === box1.x && ann.y === box1.y && 
              ann.w === box1.width && ann.h === box1.height) {
            return { ...ann, tracklet_id: newId1 };
          }
          // Update annotation for box2
          if (ann.x === box2.x && ann.y === box2.y && 
              ann.w === box2.width && ann.h === box2.height) {
            return { ...ann, tracklet_id: newId2 };
          }
        }
        return ann;
      });
      
      setAnnotations(updatedAnnotations);
      saveAnnotationFile(updatedAnnotations);
    } catch (error) {
      console.error('Error swapping annotation IDs:', error);
    }
  };

  // Add global mouse listeners when drawing to handle cursor outside canvas
  useEffect(() => {
    // Only set up listeners when we START drawing, not on every state change
    if (!isDrawing || !startPoint) {
      return; // Don't set up listeners if not actively drawing with a start point
    }

    const handleGlobalMouseMove = (event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !startPoint) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      
      // Use the same coordinate calculation as getCanvasCoordinates
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Account for CSS object-fit: contain behavior
      const canvasAspectRatio = canvasDimensions.width / canvasDimensions.height;
      const displayAspectRatio = rect.width / rect.height;
      
      let actualImageWidth, actualImageHeight, offsetX, offsetY;
      
      if (canvasAspectRatio > displayAspectRatio) {
        // Image is wider - letterboxed
        actualImageWidth = rect.width;
        actualImageHeight = rect.width / canvasAspectRatio;
        offsetX = 0;
        offsetY = (rect.height - actualImageHeight) / 2;
      } else {
        // Image is taller - pillarboxed
        actualImageWidth = rect.height * canvasAspectRatio;
        actualImageHeight = rect.height;
        offsetX = (rect.width - actualImageWidth) / 2;
        offsetY = 0;
      }
      
      // Convert to image-relative coordinates
      const imageRelativeX = mouseX - offsetX;
      const imageRelativeY = mouseY - offsetY;
      
      // Scale to canvas internal coordinates
      let canvasX = (imageRelativeX / actualImageWidth) * canvasDimensions.width;
      let canvasY = (imageRelativeY / actualImageHeight) * canvasDimensions.height;
      
      // Apply zoom/pan if they're not at defaults
      if (zoomLevel !== 1.0 || panX !== 0 || panY !== 0) {
        canvasX = (canvasX - panX) / zoomLevel;
        canvasY = (canvasY - panY) / zoomLevel;
      }

      // Clamp coordinates to canvas bounds
      const coords = {
        x: Math.max(0, Math.min(canvasDimensions.width, canvasX)),
        y: Math.max(0, Math.min(canvasDimensions.height, canvasY))
      };

      // Calculate rectangle from canvas coordinates
      const width = coords.x - startPoint.x;
      const height = coords.y - startPoint.y;

      setCurrentRect({
        x: width < 0 ? coords.x : startPoint.x,
        y: height < 0 ? coords.y : startPoint.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    };

    const handleGlobalMouseUp = () => {
      console.log('🖊️ Global mouse up triggered');
      handleMouseUp();
    };

    // Add event listeners to document for global mouse tracking
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup listeners when drawing stops or component unmounts
    return () => {
      console.log('🖊️ Cleaning up global mouse listeners');
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDrawing, startPoint, panX, panY, zoomLevel, canvasDimensions.width, canvasDimensions.height, handleMouseUp]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the focus is on an input element to avoid conflicts
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            activeElement?.tagName === 'SELECT';
      
      if (isInputFocused) return;

      // ESC key to deselect all modes and selections
      if (event.key === 'Escape') {
        event.preventDefault();
        // Deselect all modes
        setDrawingMode(false);
        setAssignMode(false);
        setBallAnnotationMode(false);
        // Clear selections (both tracklet and bounding box)
        setSelectedTrackletId(null);
        setSelectedBoundingBox(null);
        // Clear any current drawing state
        setIsDrawing(false);
        setCurrentRect(null);
        setStartPoint(null);
        setHoveredBoxId(null);
        console.log('ESC pressed - All modes and selections cleared');
      }

      // Home key to go to first frame (instant)
      if (event.key === 'Home') {
        event.preventDefault();
        const { getCurrentRally, goToFrame } = useAppStore.getState();
        const rally = getCurrentRally();
        if (rally && rally.imageFiles.length > 0) {
          goToFrame(1); // Instant jump to first frame
        }
      }

      // End key to go to last frame (instant)
      if (event.key === 'End') {
        event.preventDefault();
        const { getCurrentRally, goToFrame } = useAppStore.getState();
        const rally = getCurrentRally();
        if (rally && rally.imageFiles.length > 0) {
          goToFrame(rally.imageFiles.length); // Instant jump to last frame
        }
      }

      // Reset zoom to 100% with "0" key or "Ctrl+0"
      if (event.key === '0' && (event.ctrlKey || event.metaKey || !event.ctrlKey)) {
        event.preventDefault();
        useAppStore.setState({ 
          zoomLevel: 1.0, 
          panX: 0, 
          panY: 0 
        });
      }

      // Delete ball annotation on current frame with Delete or Backspace key
      if ((event.key === 'Delete' || event.key === 'Backspace') && ballAnnotationMode) {
        event.preventDefault();
        const currentBallAnnotation = getCurrentFrameBallAnnotation();

        if (currentBallAnnotation) {
          removeCurrentFrameBallAnnotation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setDrawingMode, setAssignMode, setBallAnnotationMode, setSelectedTrackletId, setSelectedBoundingBox, ballAnnotationMode, ballAnnotations, currentFrameIndex, removeBallAnnotation, t, getCurrentFrameBallAnnotation, removeCurrentFrameBallAnnotation, getCurrentRally]);

  if (!imagePath) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold mb-2">{t('ui.noFrameSelected')}</h3>
          <p className="text-gray-400">{t('ui.selectRallyToStart')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Loading indicator - only show if no current image */}
        {imageLoading && !currentImageSrc && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
              <div className="text-sm">Loading frame...</div>
            </div>
          </div>
        )}
        
        {/* Subtle loading indicator when transitioning between images */}
        {isLoadingNext && currentImageSrc && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full z-10">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
              <span className="text-xs">Loading...</span>
            </div>
          </div>
        )}
        
        {/* Error indicator */}
        {imageError && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-red-400 text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="text-sm">Error loading frame</div>
            </div>
          </div>
        )}
        
        {/* Current image - visible on canvas */}
        {currentImageSrc && (
          <img
            ref={imageRef}
            src={currentImageSrc}
            alt="Frame"
            style={{ display: 'none' }}
          />
        )}
        
        {/* Next image - preloaded invisibly */}
        {nextImageSrc && (
          <img
            key={`${imagePath}-${highQualityMode}`}
            src={nextImageSrc}
            alt="Next Frame"
            style={{ display: 'none' }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              
              // Update canvas dimensions if needed
              setCanvasDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight
              });
              
              // Seamlessly switch to the new image
              setCurrentImageSrc(nextImageSrc);
              setNextImageSrc(null);
              setIsLoadingNext(false);
              setImageLoading(false);
              setImageError(false);
              
              // Update the ref to point to the current image
              if (imageRef.current) {
                imageRef.current.src = nextImageSrc;
              }
              
              // Redraw canvas with new image
              requestAnimationFrame(() => {
                drawCanvas();
              });
            }}
            onError={(e) => {
              console.error('Error loading next image:', e);
              setNextImageSrc(null);
              setIsLoadingNext(false);
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className={`block border border-gray-600 ${
            ballAnnotationMode || selectedTrackletId === 99
              ? 'cursor-crosshair' // Use crosshair for more precise targeting
              : drawingMode || assignMode 
                ? 'cursor-crosshair' 
                : 'cursor-default'
          }`}
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        />
        
        {/* Mode indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {(ballAnnotationMode || selectedTrackletId === 99) && `🎯 Ball Annotation Mode - Click center point (B/ESC to exit)`}
          {drawingMode && selectedTrackletId && selectedTrackletId !== 99 && `${t('modes.drawing')} - ID: ${selectedTrackletId} (ESC to exit)`}
          {assignMode && selectedTrackletId && selectedTrackletId !== 99 && `${t('modes.assign')} - ID: ${selectedTrackletId} 🔄 Smart Swap (ESC to exit)`}
          {!drawingMode && !assignMode && !ballAnnotationMode && selectedTrackletId !== 99 && `${t('modes.selection')} (ESC to clear)`}
        </div>

        {/* High Quality Toggle Switch */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs">HQ</span>
            <button
              onClick={() => setHighQualityMode(!highQualityMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                highQualityMode ? 'bg-blue-600' : 'bg-gray-400'
              }`}
              title={highQualityMode ? "Switch to normal quality" : "Switch to high quality"}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                  highQualityMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs">{highQualityMode ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* Frame info */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {t('common.frame')} {currentFrameIndex} • {boundingBoxes.length} boxes • 
          <button
            onClick={() => {
              // Reset zoom to 100% and center the image
              useAppStore.setState({ 
                zoomLevel: 1.0, 
                panX: 0, 
                panY: 0 
              });
            }}
            className={`ml-1 hover:bg-gray-600 px-1 rounded transition-colors ${
              Math.abs(zoomLevel - 1.0) < 0.01 ? 'text-green-400' : 'text-white hover:text-green-300'
            }`}
            title={t('ui.clickToResetZoom')}
          >
            {t('common.zoom')}: {Math.round(zoomLevel * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
