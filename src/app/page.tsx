'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useAppStore } from '@/store/appStore';
import DirectorySelector from '@/components/DirectorySelector';
import LeftSidebar from '@/components/LeftSidebar';
import MainCanvas from '@/components/MainCanvas';
import RightSidebar from '@/components/RightSidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import SaveIndicator from '@/components/SaveIndicator';

export default function Home() {
  const { 
    selectedDirectory, 
    isLoading, 
    nextFrame, 
    previousFrame,
    setDrawingMode,
    setAssignMode,
    drawingMode,
    assignMode,
    zoomIn,
    zoomOut,
    resetZoom
  } = useAppStore();

  // Keyboard shortcuts
  useHotkeys('z', () => previousFrame(), [previousFrame]);
  useHotkeys('x', () => nextFrame(), [nextFrame]);
  useHotkeys('arrowleft', () => previousFrame(), [previousFrame]);
  useHotkeys('arrowright', () => nextFrame(), [nextFrame]);
  useHotkeys('d', () => {
    setDrawingMode(!drawingMode);
    setAssignMode(false);
  }, [drawingMode, setDrawingMode, setAssignMode]);
  useHotkeys('a', () => {
    setAssignMode(!assignMode);
    setDrawingMode(false);
  }, [assignMode, setAssignMode, setDrawingMode]);
  useHotkeys('equal', () => zoomIn(), [zoomIn]); // + key (without shift)
  useHotkeys('shift+equal', () => zoomIn(), [zoomIn]); // + key (with shift)
  useHotkeys('minus', () => zoomOut(), [zoomOut]); // - key
  useHotkeys('0', () => resetZoom(), [resetZoom]); // Reset zoom with 0 key

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
            <h1 className="text-xl font-bold">Tracklet Annotation Tool</h1>
            <div className="flex items-center gap-4">
              <SaveIndicator />
              <div className="text-sm text-gray-400">
                Z/←: Previous | X/→: Next | D: Draw | A: Assign | +/-: Zoom | 0: Reset | Middle/Right-drag: Pan
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
