'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { AnnotationData, BoundingBox } from '@/types/electron';
import { annotationsToCSV } from '@/utils/annotationParser';

export default function MainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1920, height: 1080 });

  const {
    getCurrentImagePath,
    drawingMode,
    assignMode,
    selectedTrackletId,
    boundingBoxes,
    setBoundingBoxes,
    addBoundingBox,
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
    setPan
  } = useAppStore();

  const imagePath = getCurrentImagePath();

  // Team color mapping function
  const getTeamColor = useCallback((team: string | undefined, isSelected: boolean = false) => {
    if (!team || team.trim() === '') {
      // Default color for no team or empty team
      return isSelected ? '#3B82F6' : '#6B7280'; // Blue if selected, gray otherwise
    }
    
    const teamColors: { [key: string]: { normal: string; selected: string } } = {
      '0': { normal: '#3B82F6', selected: '#2563EB' },     // Blue for home team (0)
      '1': { normal: '#EF4444', selected: '#DC2626' },     // Red for away team (1)
      '-1': { normal: '#6B7280', selected: '#4B5563' },    // Gray for others (-1)
      // Legacy support for text-based teams
      'home': { normal: '#3B82F6', selected: '#2563EB' },   // Blue
      'away': { normal: '#EF4444', selected: '#DC2626' },   // Red
      'team_a': { normal: '#3B82F6', selected: '#2563EB' }, // Blue
      'team_b': { normal: '#EF4444', selected: '#DC2626' }, // Red
      'team_1': { normal: '#3B82F6', selected: '#2563EB' }, // Blue
      'team_2': { normal: '#EF4444', selected: '#DC2626' }, // Red
      'red': { normal: '#EF4444', selected: '#DC2626' },    // Red
      'blue': { normal: '#3B82F6', selected: '#2563EB' },   // Blue
      'green': { normal: '#10B981', selected: '#059669' },  // Green
      'yellow': { normal: '#F59E0B', selected: '#D97706' }, // Orange/Yellow
      'purple': { normal: '#8B5CF6', selected: '#7C3AED' }, // Purple
      'pink': { normal: '#EC4899', selected: '#DB2777' },   // Pink
    };
    
    const teamValue = team.trim(); // Don't lowercase for numeric values
    const colors = teamColors[teamValue];
    
    if (colors) {
      return isSelected ? colors.selected : colors.normal;
    }
    
    // Fallback: generate a consistent color based on team name hash
    let hash = 0;
    for (let i = 0; i < teamValue.length; i++) {
      hash = teamValue.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const saturation = isSelected ? 70 : 60;
    const lightness = isSelected ? 45 : 55;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, []);

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
        
        console.log('Bounding boxes created:', boxes.length);
        setBoundingBoxes(boxes);
      } catch (error) {
        console.error('Error getting frame number:', error);
        setBoundingBoxes([]);
      }
    };

    getCurrentFrameNumber();
  }, [getCurrentImagePath, annotations, setBoundingBoxes, currentFrameIndex]);

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
      const boxColor = getTeamColor(box.team, isSelected);
      
      ctx.strokeStyle = boxColor;
      // Keep line width constant regardless of zoom for better visibility
      ctx.lineWidth = (isSelected ? 3 : 2) / zoomLevel;
      // Keep dash pattern consistent
      const dashSize = 5 / zoomLevel;
      ctx.setLineDash(isSelected ? [] : [dashSize, dashSize]);
      
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw tracklet ID and team label background at the bottom
      const labelWidth = box.team ? 80 : 60;
      const labelHeight = 25;
      ctx.fillStyle = boxColor;
      ctx.fillRect(box.x, box.y + box.height, labelWidth, labelHeight);
      
      // Draw tracklet ID and team text at the bottom
      ctx.fillStyle = 'white';
      // Keep font size readable regardless of zoom
      ctx.font = `${12 / zoomLevel}px Arial`;
      const textY = box.y + box.height + 16; // Position text inside the bottom label
      if (box.team && box.team.trim() !== '') {
        ctx.fillText(`ID: ${box.tracklet_id} | ${box.team}`, box.x + 3, textY);
      } else {
        ctx.fillText(`ID: ${box.tracklet_id}`, box.x + 5, textY);
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
  }, [boundingBoxes, selectedBoundingBox, currentRect, zoomLevel, panX, panY, getTeamColor, canvasDimensions]);

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

      setSelectedBoundingBox(clickedBox ? clickedBox.id : null);
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

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (isDrawing && currentRect && selectedTrackletId !== null && startPoint) {
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

      addBoundingBox(newBox);
      
      // Add to annotation data
      addAnnotationData(newBox);
      
      setCurrentRect(null);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Handle wheel events for zoom
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

  const addAnnotationData = async (box: BoundingBox) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      const imagePath = getCurrentImagePath();
      if (!imagePath) return;

      const filename = imagePath.split('/').pop() || '';
      const frameNumber = await window.electronAPI.getFrameNumber(filename);

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
        team: ''
      };

      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      saveAnnotationFile(updatedAnnotations);
    } catch (error) {
      console.error('Error adding annotation data:', error);
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
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        />
        
        {/* Mode indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {drawingMode && selectedTrackletId && `Drawing Mode - ID: ${selectedTrackletId}`}
          {assignMode && selectedTrackletId && `Assign Mode - ID: ${selectedTrackletId}`}
          {!drawingMode && !assignMode && 'Selection Mode'}
        </div>

        {/* Frame info */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          Frame {currentFrameIndex + 1} • {boundingBoxes.length} boxes • Zoom: {Math.round(zoomLevel * 100)}%
        </div>
      </div>
    </div>
  );
}
