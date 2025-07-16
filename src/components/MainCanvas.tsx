'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
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
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1920, height: 1080 });
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
    isDeletingBox
  } = useAppStore();

  const imagePath = getCurrentImagePath();

  // Generate consistent color based on tracklet ID
  const getTrackletColor = useCallback((trackletId: number, isSelected: boolean = false) => {
    // Predefined colors for tracklet IDs (20 colors for better variety)
    const predefinedColors = [
      { normal: '#EF4444', selected: '#DC2626', dark: '#7F1D1D' }, // Red
      { normal: '#3B82F6', selected: '#2563EB', dark: '#1E3A8A' }, // Blue
      { normal: '#10B981', selected: '#059669', dark: '#064E3B' }, // Green
      { normal: '#F59E0B', selected: '#D97706', dark: '#78350F' }, // Orange
      { normal: '#8B5CF6', selected: '#7C3AED', dark: '#581C87' }, // Purple
      { normal: '#EC4899', selected: '#DB2777', dark: '#831843' }, // Pink
      { normal: '#06B6D4', selected: '#0891B2', dark: '#164E63' }, // Cyan
      { normal: '#84CC16', selected: '#65A30D', dark: '#365314' }, // Lime
      { normal: '#F97316', selected: '#EA580C', dark: '#7C2D12' }, // Orange-Red
      { normal: '#6366F1', selected: '#4F46E5', dark: '#312E81' }, // Indigo
      { normal: '#14B8A6', selected: '#0F766E', dark: '#134E4A' }, // Teal
      { normal: '#F59E0B', selected: '#D97706', dark: '#78350F' }, // Amber
      { normal: '#EF4444', selected: '#B91C1C', dark: '#7F1D1D' }, // Red (variant)
      { normal: '#8B5CF6', selected: '#6D28D9', dark: '#581C87' }, // Violet
      { normal: '#06B6D4', selected: '#0E7490', dark: '#164E63' }, // Sky
      { normal: '#10B981', selected: '#047857', dark: '#064E3B' }, // Emerald
      { normal: '#F97316', selected: '#C2410C', dark: '#7C2D12' }, // Orange (variant)
      { normal: '#EC4899', selected: '#BE185D', dark: '#831843' }, // Rose
      { normal: '#6366F1', selected: '#3730A3', dark: '#312E81' }, // Indigo (variant)
      { normal: '#84CC16', selected: '#4D7C0F', dark: '#365314' }, // Green (variant)
    ];
    
    // Use tracklet ID to select color consistently (repeats every 20)
    const colorIndex = (trackletId - 1) % predefinedColors.length;
    const colors = predefinedColors[colorIndex];
    
    return isSelected ? colors.selected : colors.normal;
  }, []);

  // Get the dark version of the tracklet color for backgrounds
  const getTrackletDarkColor = useCallback((trackletId: number) => {
    const predefinedColors = [
      { dark: '#7F1D1D' }, // Red
      { dark: '#1E3A8A' }, // Blue
      { dark: '#064E3B' }, // Green
      { dark: '#78350F' }, // Orange
      { dark: '#581C87' }, // Purple
      { dark: '#831843' }, // Pink
      { dark: '#164E63' }, // Cyan
      { dark: '#365314' }, // Lime
      { dark: '#7C2D12' }, // Orange-Red
      { dark: '#312E81' }, // Indigo
      { dark: '#134E4A' }, // Teal
      { dark: '#78350F' }, // Amber
      { dark: '#7F1D1D' }, // Red (variant)
      { dark: '#581C87' }, // Violet
      { dark: '#164E63' }, // Sky
      { dark: '#064E3B' }, // Emerald
      { dark: '#7C2D12' }, // Orange (variant)
      { dark: '#831843' }, // Rose
      { dark: '#312E81' }, // Indigo (variant)
      { dark: '#365314' }, // Green (variant)
    ];
    
    const colorIndex = (trackletId - 1) % predefinedColors.length;
    return predefinedColors[colorIndex].dark;
  }, []);

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
  }, [imagePath]);

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
        
        const boxes: BoundingBox[] = currentFrameAnnotations.map((ann, index) => ({
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
      const isSelected = selectedBoundingBox === box.id;
      const boxColor = getTrackletColor(box.tracklet_id, isSelected);
      
      ctx.strokeStyle = boxColor;
      // Keep line width constant regardless of zoom for better visibility
      ctx.lineWidth = (isSelected ? 3 : 2) / zoomLevel;
      // Use solid lines for all bounding boxes
      ctx.setLineDash([]);
      
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw tracklet ID and team label background at the bottom
      const labelWidth = box.team ? 90 : 70;
      const labelHeight = 30;
      
      // Draw background using the darkest color of the bounding box color
      const darkColor = getTrackletDarkColor(box.tracklet_id);
      ctx.fillStyle = darkColor;
      ctx.fillRect(box.x, box.y + box.height, labelWidth, labelHeight);
      
      // Draw colored border on the label
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2 / zoomLevel;
      ctx.strokeRect(box.x, box.y + box.height, labelWidth, labelHeight);
      
      // Draw tracklet ID and team text at the bottom
      const fontSize = Math.max(14, 14 / zoomLevel); // Minimum 14px font size
      ctx.font = `bold ${fontSize}px Arial`;
      const textY = box.y + box.height + 20; // Position text inside the bottom label
      
      // Draw text with white fill and black stroke for maximum contrast
      ctx.lineWidth = 3 / zoomLevel;
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'white';
      
      const text = box.team && box.team.trim() !== '' 
        ? `ID: ${box.tracklet_id} | ${box.team}` 
        : `ID: ${box.tracklet_id}`;
      
      // Draw text stroke (outline) first
      ctx.strokeText(text, box.x + 5, textY);
      // Then draw text fill
      ctx.fillText(text, box.x + 5, textY);
      
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
    });

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.strokeStyle = '#10B981'; // Green for new drawing
      ctx.lineWidth = 2 / zoomLevel;
      ctx.setLineDash([]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }

    // Restore the context state
    ctx.restore();
  }, [boundingBoxes, selectedBoundingBox, currentRect, zoomLevel, panX, panY, getTrackletColor, getTrackletDarkColor, canvasDimensions, currentFrameNumber, getBoxEventAnnotation]);

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
    } else if (drawingMode && selectedTrackletId !== null) {
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
          className="block border border-gray-600 cursor-crosshair"
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
          {drawingMode && selectedTrackletId && `${t('modes.drawing')} - ID: ${selectedTrackletId}`}
          {assignMode && selectedTrackletId && `${t('modes.assign')} - ID: ${selectedTrackletId}`}
          {!drawingMode && !assignMode && t('modes.selection')}
        </div>

        {/* Frame info */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {t('common.frame')} {currentFrameIndex + 1} • {boundingBoxes.length} boxes • {t('common.zoom')}: {Math.round(zoomLevel * 100)}%
        </div>
      </div>
    </div>
  );
}
