'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useAppStore } from '@/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import DirectorySelector from '@/components/DirectorySelector';
import LeftSidebar from '@/components/LeftSidebar';
import MainCanvas from '@/components/MainCanvas';
import RightSidebar from '@/components/RightSidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import SaveIndicator from '@/components/SaveIndicator';

export default function Home() {
  const { t } = useLanguage();
  const { 
    selectedDirectory, 
    isLoading, 
    nextFrame, 
    previousFrame,
    setDrawingMode,
    setAssignMode,
    drawingMode,
    assignMode,
    ballAnnotationMode,
    setBallAnnotationMode,
    setSelectedTrackletId,
    zoomIn,
    zoomOut,
    resetZoom,
    deleteSelectedBoundingBox,
    deleteAllAnnotationsWithTrackletId,
    selectedBoundingBox,
    selectedTrackletId
  } = useAppStore();

  // Keyboard shortcuts - with options to prevent interference with input fields
  const hotkeyOptions = {
    enableOnFormTags: false, // Disable hotkeys when focus is on form elements
    enableOnContentEditable: false, // Disable on contenteditable elements
    ignoreModifiers: false
  };

  useHotkeys('z', () => previousFrame(), hotkeyOptions, [previousFrame]);
  useHotkeys('x', () => nextFrame(), hotkeyOptions, [nextFrame]);
  useHotkeys('arrowleft', () => previousFrame(), hotkeyOptions, [previousFrame]);
  useHotkeys('arrowright', () => nextFrame(), hotkeyOptions, [nextFrame]);
  useHotkeys('d', () => {
    setDrawingMode(!drawingMode);
    setAssignMode(false);
  }, hotkeyOptions, [drawingMode, setDrawingMode, setAssignMode]);
  useHotkeys('a', () => {
    setAssignMode(!assignMode);
    setDrawingMode(false);
  }, hotkeyOptions, [assignMode, setAssignMode, setDrawingMode]);
  useHotkeys('b', () => {
    console.log('B key pressed - Current ball mode:', ballAnnotationMode);
    if (!ballAnnotationMode) {
      // Entering ball mode - select tracklet ID 99 and enable ball mode
      setBallAnnotationMode(true);
      setSelectedTrackletId(99);
      console.log('B pressed - Ball annotation mode enabled');
    } else {
      // Exiting ball mode - disable ball mode and clear tracklet selection
      setBallAnnotationMode(false);
      setSelectedTrackletId(null);
      console.log('B pressed - Ball annotation mode disabled');
    }
  }, hotkeyOptions, [ballAnnotationMode, setBallAnnotationMode, setSelectedTrackletId]);
  useHotkeys('equal', () => zoomIn(), hotkeyOptions, [zoomIn]); // + key (without shift)
  useHotkeys('shift+equal', () => zoomIn(), hotkeyOptions, [zoomIn]); // + key (with shift)
  useHotkeys('minus', () => zoomOut(), hotkeyOptions, [zoomOut]); // - key
  useHotkeys('0', () => resetZoom(), hotkeyOptions, [resetZoom]); // Reset zoom with 0 key
  
  // Delete shortcuts
  useHotkeys('delete', () => {
    if (selectedBoundingBox) {
      deleteSelectedBoundingBox();
    }
  }, hotkeyOptions, [selectedBoundingBox, deleteSelectedBoundingBox]);
  useHotkeys('backspace', () => {
    if (selectedBoundingBox) {
      deleteSelectedBoundingBox();
    }
  }, hotkeyOptions, [selectedBoundingBox, deleteSelectedBoundingBox]);
  useHotkeys('shift+delete', () => {
    if (selectedTrackletId) {
      deleteAllAnnotationsWithTrackletId(selectedTrackletId);
    }
  }, hotkeyOptions, [selectedTrackletId, deleteAllAnnotationsWithTrackletId]);

  if (!selectedDirectory) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <DirectorySelector />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex overflow-hidden">
      {isLoading && <LoadingSpinner />}
      
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
        <LeftSidebar />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{t('app.title')}</h1>
            <div className="flex items-center gap-4">
              <SaveIndicator />
              <div className="text-sm text-gray-400">
                Z/←: Previous | X/→: Next | D: Draw | A: Assign | +/-: Zoom | 0: Reset | Del/Backspace: Delete | Shift+Del: Delete All | Middle/Right-drag: Pan | B: Ball Mode | Home/End: Select First/ Last Tracklet
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 min-h-0">
          <MainCanvas />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
        <RightSidebar />
      </div>
    </div>
  );
}
