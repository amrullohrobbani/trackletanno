'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { getTrackletColor, getTrackletDarkColor } from '@/utils/trackletColors';
import { AnnotationData, BoundingBox } from '@/types/electron';
import { annotationsToCSV } from '@/utils/annotationParser';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MainCanvas() {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastBoundingBoxesRef = useRef<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [currentFrameNumber, setCurrentFrameNumber] = useState<number>(1);

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
    ballAnnotations,
    removeBallAnnotation,
    canvasDimensions,
    setCanvasDimensions,
    getCurrentFrameNumber,
    visibleTrackletIds
  } = useAppStore();

  const imagePath = getCurrentImagePath();

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

  // Load and display image securely
  const loadImage = useCallback(async () => {
    if (!imagePath || !imageRef.current || typeof window === 'undefined' || !window.electronAPI) {
      return;
    }

    try {
      // Use the secure image loading method
      const imageDataUrl = await window.electronAPI.getImageData(imagePath);
      if (imageRef.current) {
        imageRef.current.src = imageDataUrl;
        
        // Update canvas dimensions when image loads
        imageRef.current.onload = () => {
          if (imageRef.current) {
            const { naturalWidth, naturalHeight } = imageRef.current;
            console.log(`Image dimensions: ${naturalWidth}x${naturalHeight}`);
            setCanvasDimensions({ width: naturalWidth, height: naturalHeight });
          }
        };
      }
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }, [imagePath, setCanvasDimensions]);

  // Load image when path changes
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
      const imagePath = getCurrentImagePath();
      if (!imagePath || typeof window === 'undefined' || !window.electronAPI) {
        return;
      }

      try {
        // Extract filename from path
        const filename = imagePath.split('/').pop() || '';
        const frameNumber = await window.electronAPI.getFrameNumber(filename);
        
        console.log('=== Frame Change Debug ===');
        console.log('Image:', filename);
        console.log('Frame index:', currentFrameIndex, '→ Frame number:', frameNumber);
        console.log('Total annotations:', annotations.length);
        
        // Filter annotations for this specific frame number
        const currentFrameAnnotations = annotations.filter(ann => ann.frame === frameNumber);
        console.log('Bounding boxes for frame', frameNumber, ':', currentFrameAnnotations.length);
        
        if (currentFrameAnnotations.length > 0) {
          console.log('First annotation:', currentFrameAnnotations[0]);
          console.log('All annotations for this frame:', currentFrameAnnotations);
        } else {
          // Show available frames for debugging
          const uniqueFrames = [...new Set(annotations.map(ann => ann.frame))].sort();
          console.log('Available annotation frames:', uniqueFrames.slice(0, 5), '...');
        }
        
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
            selected: false
          }));
        
        console.log('Bounding boxes created from annotations:', boxes.length);
        console.log('Bounding boxes details:', boxes);
        console.log('About to call setBoundingBoxes...');
        
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
          console.log('Bounding boxes changed, updating...');
          setBoundingBoxes(boxes);
          lastBoundingBoxesRef.current = boxes;
        } else {
          console.log('Bounding boxes unchanged, skipping update...');
        }
        
        console.log('setBoundingBoxes processing completed');
        
        // Store the current frame number for event annotation lookups
        setCurrentFrameNumber(frameNumber);
      } catch (error) {
        console.error('Error getting frame number:', error);
        setBoundingBoxes([]);
      }
    };

    getCurrentFrameNumber();
  }, [getCurrentImagePath, annotations, setBoundingBoxes, currentFrameIndex, isDeletingBox]);

  // Update ref when boundingBoxes change from store
  useEffect(() => {
    lastBoundingBoxesRef.current = boundingBoxes;
  }, [boundingBoxes]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current context state
    ctx.save();

    // Apply pan (translation) first, then zoom (scale)
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    // Draw image at original size - the transformations will handle zoom/pan
    ctx.drawImage(image, 0, 0, canvasDimensions.width, canvasDimensions.height);

    // Draw existing bounding boxes
    boundingBoxes.forEach((box) => {
      // Skip if this tracklet is hidden
      if (!visibleTrackletIds.has(box.tracklet_id)) {
        return;
      }
      
      const isSelected = selectedBoundingBox === box.id;
      const isSelectedTracklet = selectedTrackletId === box.tracklet_id;
      const boxColor = getTrackletColor(box.tracklet_id, isSelected || isSelectedTracklet);
      
      ctx.strokeStyle = boxColor;
      // Keep line width constant regardless of zoom for better visibility
      // Make selected tracklet bounding boxes thicker
      ctx.lineWidth = (isSelected ? 4 : isSelectedTracklet ? 3 : 2) / zoomLevel;
      // Use solid lines for all bounding boxes
      ctx.setLineDash([]);
      
      // Add glow effect for selected tracklet
      if (isSelectedTracklet && !isSelected) {
        ctx.shadowColor = boxColor;
        ctx.shadowBlur = 10 / zoomLevel;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.shadowBlur = 0; // Reset shadow
      } else {
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
      
      // Draw tracklet ID and team label background at the bottom
      // Skip labels for ball annotations (tracklet_id === 99)
      if (showTrackletLabels && box.tracklet_id !== 99) {
        const labelWidth = box.team ? 90 : 70;
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
        const text = box.team && box.team.trim() !== '' 
          ? `ID: ${box.tracklet_id} | ${box.team}` 
          : `ID: ${box.tracklet_id}`;
        ctx.strokeText(text, box.x + 5, textY);
        ctx.fillText(text, box.x + 5, textY);
      }
      // Draw event label indicator if enabled
      if (showEventLabels) {
        // Check if this bounding box has an event annotation and draw indicator
        const eventAnnotation = getBoxEventAnnotation(box, currentFrameNumber);
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
        if (ballAnnotation.frame === currentFrameNumber) {
          const ballCenterX = ballAnnotation.x;
          const ballCenterY = ballAnnotation.y;
          
          // Smaller, more distinct ball indicator
          const ballRadius = Math.max(6, 6 / zoomLevel); // Reduced from 12 to 6
          const borderWidth = Math.max(2, 2 / zoomLevel);
          
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
          
          // Draw center crosshair for precise positioning
          const crosshairSize = Math.max(1, 1 / zoomLevel);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = crosshairSize;
          ctx.beginPath();
          // Horizontal line
          ctx.moveTo(ballCenterX - 2, ballCenterY);
          ctx.lineTo(ballCenterX + 2, ballCenterY);
          // Vertical line
          ctx.moveTo(ballCenterX, ballCenterY - 2);
          ctx.lineTo(ballCenterX, ballCenterY + 2);
          ctx.stroke();
          
          // Draw tracklet ID label for ball (always 99) - Position above the ball
          if (showTrackletLabels) {
            const labelWidth = 50;
            const labelHeight = 25;
            const labelX = ballAnnotation.x - labelWidth / 2;
            const labelY = ballAnnotation.y - ballRadius - labelHeight - 10; // Moved up more to avoid overlap
            
            // Draw label background
            ctx.fillStyle = 'rgba(255, 107, 53, 0.9)'; // Semi-transparent orange
            ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label border
            ctx.strokeStyle = '#FF4500'; // Use the same orange as the ball
            ctx.lineWidth = 2 / zoomLevel;
            ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label text
            const fontSize = Math.max(12, 12 / zoomLevel);
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add text stroke for better visibility
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / zoomLevel;
            ctx.strokeText('Ball 99', labelX + labelWidth / 2, labelY + labelHeight / 2);
            ctx.fillText('Ball 99', labelX + labelWidth / 2, labelY + labelHeight / 2);
            
            // Reset text alignment
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          }
          
          // Draw event label for ball if enabled and event exists - Position above the ball label
          if (showEventLabels && ballAnnotation.event && ballAnnotation.event.trim() !== '' && ballAnnotation.event !== 'no_event') {
            const eventText = ballAnnotation.event.toUpperCase();
            const indicatorHeight = Math.max(20, 20 / zoomLevel);
            const padding = 4 / zoomLevel;
            
            // Measure text to determine indicator width
            ctx.font = `bold ${Math.max(12, 12 / zoomLevel)}px Arial`;
            const textWidth = ctx.measureText(eventText).width;
            const indicatorWidth = textWidth + (padding * 2);
            
            // Position indicator above the ball label (or above ball if no label)
            const indicatorX = ballAnnotation.x - indicatorWidth / 2;
            const indicatorY = showTrackletLabels 
              ? ballAnnotation.y - ballRadius - 25 - indicatorHeight - 15 // Above the tracklet label
              : ballAnnotation.y - ballRadius - indicatorHeight - 10; // Above the ball if no tracklet label
            
            // Draw background rectangle
            ctx.fillStyle = '#FFD700'; // Gold for ball events
            ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            // Draw border
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2 / zoomLevel;
            ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            // Draw event text
            ctx.fillStyle = 'black';
            ctx.font = `bold ${Math.max(11, 11 / zoomLevel)}px Arial`;
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

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.strokeStyle = '#10B981'; // Green for new drawing
      ctx.lineWidth = 2 / zoomLevel;
      ctx.setLineDash([]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }

    // Restore the context state
    ctx.restore();
  }, [boundingBoxes, selectedBoundingBox, selectedTrackletId, currentRect, zoomLevel, panX, panY, canvasDimensions, currentFrameNumber, getBoxEventAnnotation, showTrackletLabels, showEventLabels, ballAnnotations, visibleTrackletIds]);

  // Redraw canvas when image loads or data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get mouse coordinates relative to canvas
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    // Account for zoom and pan transformations
    const canvasX = (mouseX - panX) / zoomLevel;
    const canvasY = (mouseY - panY) / zoomLevel;

    return {
      x: canvasX,
      y: canvasY
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
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
      if (rally && rally.imageFiles[currentFrameIndex]) {
        const frameNumber = getCurrentFrameNumber();
        if (frameNumber !== null) {
          // Check if clicking on an existing ball annotation first
          const ballRadius = 6;
          const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
            if (ballAnnotation.frame === frameNumber) {
              const distance = Math.sqrt(
                Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
              );
              return distance <= ballRadius;
            }
            return false;
          });
          
          if (clickedBallAnnotation && selectedEvent) {
            // Update the event for the existing ball annotation
            const updatedAnnotations = annotations.map(ann => {
              if (ann.frame === frameNumber && ann.tracklet_id === 99) {
                return { ...ann, event: selectedEvent };
              }
              return ann;
            });
            
            const updatedBallAnnotations = ballAnnotations.map(ann => {
              if (ann.frame === frameNumber) {
                return { ...ann, event: selectedEvent };
              }
              return ann;
            });
            
            setAnnotations(updatedAnnotations);
            useAppStore.setState({ ballAnnotations: updatedBallAnnotations });
            
            // Save the changes
            setTimeout(async () => {
              try {
                await useAppStore.getState().saveAnnotationsToFile();
              } catch (error) {
                console.error('Error saving ball annotation event:', error);
              }
            }, 50);
            
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
      if (rally && rally.imageFiles[currentFrameIndex]) {
        const frameNumber = getCurrentFrameNumber();
        if (frameNumber !== null) {
          // Check if clicking on an existing ball annotation
          const ballRadius = 6;
          const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
            if (ballAnnotation.frame === frameNumber) {
              const distance = Math.sqrt(
                Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
              );
              return distance <= ballRadius;
            }
            return false;
          });
          
          if (clickedBallAnnotation && selectedEvent) {
            // Update the event for the existing ball annotation
            const updatedAnnotations = annotations.map(ann => {
              if (ann.frame === frameNumber && ann.tracklet_id === 99) {
                return { ...ann, event: selectedEvent };
              }
              return ann;
            });
            
            const updatedBallAnnotations = ballAnnotations.map(ann => {
              if (ann.frame === frameNumber) {
                return { ...ann, event: selectedEvent };
              }
              return ann;
            });
            
            setAnnotations(updatedAnnotations);
            useAppStore.setState({ ballAnnotations: updatedBallAnnotations });
            
            // Save the changes
            setTimeout(async () => {
              try {
                await useAppStore.getState().saveAnnotationsToFile();
              } catch (error) {
                console.error('Error saving ball annotation event:', error);
              }
            }, 50);
            
            return; // Exit early after updating event
          }
        }
      }
    }

    if (assignMode) {
      // Check if clicking on an existing bounding box
      const clickedBox = boundingBoxes.find(box =>
        coords.x >= box.x &&
        coords.x <= box.x + box.width &&
        coords.y >= box.y &&
        coords.y <= box.y + box.height
      );

      if (clickedBox && selectedTrackletId !== null) {
        // Update the tracklet ID of the clicked box
        updateBoundingBox(clickedBox.id, { tracklet_id: selectedTrackletId });
        setSelectedBoundingBox(clickedBox.id);
        
        // Update the annotation data
        updateAnnotationData(clickedBox, selectedTrackletId);
        
        // If an event is also selected, assign it to the box
        if (selectedEvent) {
          assignEventToBoundingBox(clickedBox.id, selectedEvent);
        }
      }
    } else if (drawingMode && selectedTrackletId !== null && selectedTrackletId !== 99) {
      // Start drawing new bounding box
      setIsDrawing(true);
      setStartPoint(coords);
      setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else {
      // Selection mode - select existing bounding box
      const clickedBox = boundingBoxes.find(box =>
        coords.x >= box.x &&
        coords.x <= box.x + box.width &&
        coords.y >= box.y &&
        coords.y <= box.y + box.height
      );

      if (clickedBox) {
        setSelectedBoundingBox(clickedBox.id);
        
        // If an event is selected, assign it to the clicked bounding box
        if (selectedEvent) {
          assignEventToBoundingBox(clickedBox.id, selectedEvent);
        }
      } else {
        setSelectedBoundingBox(null);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && lastPanPoint) {
      // Handle panning
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      
      setPan(panX + deltaX, panY + deltaY);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    if (!isDrawing || !startPoint) return;

    const coords = getCanvasCoordinates(event);
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;

    setCurrentRect({
      x: width < 0 ? coords.x : startPoint.x,
      y: height < 0 ? coords.y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const addAnnotationData = useCallback(async (box: BoundingBox) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      const imagePath = getCurrentImagePath();
      if (!imagePath) return;

      const filename = imagePath.split('/').pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

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
        role: '',
        jersey_number: '',
        jersey_color: '',
        team: '',
        event: ''
      };

      const updatedAnnotations = [...filteredAnnotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      saveAnnotationFile(updatedAnnotations);
    } catch (error) {
      console.error('Error adding annotation data:', error);
    }
  }, [annotations, setAnnotations, getCurrentImagePath]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Remove any existing bounding box with the same tracklet ID on the current frame
      const currentFrameBoundingBoxes = boundingBoxes.filter(box => 
        box.tracklet_id !== selectedTrackletId
      );

      // Add the new bounding box
      const newBox: BoundingBox = {
        id: `new-${Date.now()}`,
        tracklet_id: selectedTrackletId,
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
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
  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    // Check if right-clicking on a ball annotation for deletion
    const coords = getCanvasCoordinates(event);
    const rally = getCurrentRally();
    if (!rally || !rally.imageFiles[currentFrameIndex]) return;
    
    const currentFrameNumber = getCurrentFrameNumber();
    if (currentFrameNumber === null) return;
    
    // Check if clicked on a ball annotation (within radius)
    const ballRadius = 6; // Same as used in drawing
    const clickedBallAnnotation = ballAnnotations.find(ballAnnotation => {
      if (ballAnnotation.frame === currentFrameNumber) {
        const distance = Math.sqrt(
          Math.pow(coords.x - ballAnnotation.x, 2) + Math.pow(coords.y - ballAnnotation.y, 2)
        );
        return distance <= ballRadius;
      }
      return false;
    });
    
    if (clickedBallAnnotation) {
      if (window.confirm('Delete this ball annotation?')) {
        removeBallAnnotation(currentFrameNumber);
      }
    }
  };

  const updateAnnotationData = async (box: BoundingBox, newTrackletId: number) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      const imagePath = getCurrentImagePath();
      if (!imagePath) return;

      const filename = imagePath.split('/').pop() || '';
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

  const saveAnnotationFile = async (annotationData: AnnotationData[]) => {
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
  };

  // Add global mouse listeners when drawing to handle cursor outside canvas
  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMouseMove = (event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !startPoint) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // Get mouse coordinates relative to canvas with proper scaling
      const mouseX = (event.clientX - rect.left) * scaleX;
      const mouseY = (event.clientY - rect.top) * scaleY;

      // Convert screen coordinates to canvas coordinates with zoom and pan
      const canvasX = (mouseX - panX) / zoomLevel;
      const canvasY = (mouseY - panY) / zoomLevel;

      // Clamp coordinates to canvas bounds
      const coords = {
        x: Math.max(0, Math.min(canvasDimensions.width, canvasX)),
        y: Math.max(0, Math.min(canvasDimensions.height, canvasY))
      };

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
      handleMouseUp();
    };

    // Add event listeners to document for global mouse tracking
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup listeners when drawing stops or component unmounts
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDrawing, startPoint, panX, panY, zoomLevel, canvasDimensions.width, canvasDimensions.height, handleMouseUp]);

  // Add keyboard shortcut for zoom reset
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the focus is on an input element to avoid conflicts
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            activeElement?.tagName === 'SELECT';
      
      if (isInputFocused) return;

      // Reset zoom to 100% with "0" key or "Ctrl+0"
      if (event.key === '0' && (event.ctrlKey || event.metaKey || !event.ctrlKey)) {
        event.preventDefault();
        useAppStore.setState({ 
          zoomLevel: 1.0, 
          panX: 0, 
          panY: 0 
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!imagePath) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold mb-2">No Frame Selected</h3>
          <p className="text-gray-400">Select a rally from the left sidebar to start annotating</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg overflow-hidden">
      <div className="relative max-w-full max-h-full flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          alt="Frame"
          className="hidden"
          onLoad={drawCanvas}
          onError={(e) => {
            console.error('Error loading image:', e);
          }}
        />
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
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
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
          {(ballAnnotationMode || selectedTrackletId === 99) && `🎯 Ball Annotation Mode - Click center point`}
          {drawingMode && selectedTrackletId && selectedTrackletId !== 99 && `${t('modes.drawing')} - ID: ${selectedTrackletId}`}
          {assignMode && selectedTrackletId && selectedTrackletId !== 99 && `${t('modes.assign')} - ID: ${selectedTrackletId}`}
          {!drawingMode && !assignMode && !ballAnnotationMode && selectedTrackletId !== 99 && t('modes.selection')}
        </div>

        {/* Frame info */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {t('common.frame')} {currentFrameIndex + 1} • {boundingBoxes.length} boxes • 
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
            title="Click to reset zoom to 100%"
          >
            {t('common.zoom')}: {Math.round(zoomLevel * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
