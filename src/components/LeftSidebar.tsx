'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { 
  FolderIcon, 
  DocumentIcon, 
  PencilIcon, 
  CursorArrowRaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  CircleStackIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LeftSidebar() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const {
    selectedDirectory,
    rallyFolders,
    currentRallyIndex,
    currentFrameIndex,
    setCurrentRally,
    nextFrame,
    previousFrame,
    goToFrame,
    drawingMode,
    assignMode,
    setDrawingMode,
    setAssignMode,
    selectedTrackletId,
    setSelectedDirectory,
    setRallyFolders,
    deleteSelectedBoundingBox,
    selectedBoundingBox,
    getCurrentRally,
    ballAnnotationMode,
    setBallAnnotationMode,
    loadBallAnnotationsFromJson,
    exportAnnotationsAsJson,
    hasBallAnnotations,
    ballAnnotations,
    annotations,
    clearBallAnnotations,
    getCurrentFrameBallAnnotation,
    removeCurrentFrameBallAnnotation
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Ball annotation handlers
  const handleToggleBallMode = () => {
    setBallAnnotationMode(!ballAnnotationMode);
  };

  const handleImportJson = async () => {
    if (!selectedDirectory) {
      alert('Please select a directory first.');
      return;
    }

    // Check if ball annotations already exist and prompt for overwrite
    if (hasBallAnnotations) {
      const shouldOverwrite = window.confirm(
        'Ball annotations already exist. Do you want to overwrite them with imported data?\n\n' +
        'This will replace all current ball annotations (tracklet ID 99).'
      );
      
      if (!shouldOverwrite) {
        return; // User cancelled
      }
    }

    setIsImporting(true);
    try {
      await loadBallAnnotationsFromJson();
      alert(`Successfully imported ball annotations with Y-coordinate correction!`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing ball annotations from JSON files.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportAllAnnotations = async () => {
    const rally = getCurrentRally();
    if (!rally) {
      alert('No rally selected.');
      return;
    }

    setIsExporting(true);
    try {
      const success = await exportAnnotationsAsJson();
      if (success) {
        alert(`Successfully exported ALL annotations (players + ball) to JSON!`);
      } else {
        alert('Error exporting annotations to JSON.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting annotations.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearBallAnnotations = () => {
    if (window.confirm('Are you sure you want to clear all ball annotations?')) {
      clearBallAnnotations();
    }
  };

  const handleDeleteCurrentBallAnnotation = () => {
    const currentBallAnnotation = getCurrentFrameBallAnnotation();
    
    if (currentBallAnnotation) {
      if (window.confirm('Delete ball annotation for current frame?')) {
        removeCurrentFrameBallAnnotation();
      }
    } else {
      alert('No ball annotation found for current frame.');
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDrawMode = () => {
    if (!selectedTrackletId) {
      alert('Please select a tracklet ID first.');
      return;
    }
    setDrawingMode(!drawingMode);
    setAssignMode(false);
  };

  const handleAssignMode = () => {
    if (!selectedTrackletId) {
      alert('Please select a tracklet ID first.');
      return;
    }
    setAssignMode(!assignMode);
    setDrawingMode(false);
  };

  const handleChangeDirectory = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      alert('This feature is only available in the desktop application.');
      return;
    }

    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      
      if (selectedPath) {
        setSelectedDirectory(selectedPath);
        
        // Look for rally folders in the selected directory
        const rallyFolders = await window.electronAPI.getRallyFolders(selectedPath);
        
        if (rallyFolders.length === 0) {
          alert('No rally folders with annotation data found in the selected directory.');
        } else {
          setRallyFolders(rallyFolders);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('Error accessing the selected directory.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Frame Navigation - Moved to top for priority */}
        {getCurrentRally() && (
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            🎬 Frame Navigation
          </h2>
          
          <div className="space-y-4">
            {/* Current Frame Display */}
            <div className="text-center bg-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {currentFrameIndex + 1}
              </div>
              <div className="text-sm text-gray-400">
                of {getCurrentRally()?.imageFiles.length || 0} frames
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={previousFrame}
                disabled={currentFrameIndex === 0}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                  currentFrameIndex === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Previous
              </button>
              
              <button
                onClick={nextFrame}
                disabled={currentFrameIndex === (getCurrentRally()?.imageFiles.length || 0) - 1}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                  currentFrameIndex === (getCurrentRally()?.imageFiles.length || 0) - 1
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Next
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Go to Frame */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300 font-medium">Jump to frame:</label>
              <input
                type="number"
                min="1"
                max={getCurrentRally()?.imageFiles.length || 0}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                placeholder="Enter frame number"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const frameNumber = parseInt((e.target as HTMLInputElement).value);
                    if (frameNumber >= 1 && frameNumber <= (getCurrentRally()?.imageFiles.length || 0)) {
                      goToFrame(frameNumber);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Annotation Controls - Simplified */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
          ✏️ Annotation Tools
        </h2>
        
        <div className="space-y-3">
          <button
            onClick={handleDrawMode}
            disabled={!selectedTrackletId || ballAnnotationMode || selectedTrackletId === 99}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${
              drawingMode
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${(!selectedTrackletId || ballAnnotationMode || selectedTrackletId === 99) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <PencilIcon className="w-5 h-5" />
            Draw Bounding Box
          </button>
          
          <button
            onClick={handleAssignMode}
            disabled={!selectedTrackletId || ballAnnotationMode || selectedTrackletId === 99}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${
              assignMode
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${(!selectedTrackletId || ballAnnotationMode || selectedTrackletId === 99) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CursorArrowRaysIcon className="w-5 h-5" />
            Assign ID to Box
          </button>

          {/* Quick Delete Actions */}
          <div className="pt-2 border-t border-gray-600">
            <button
              onClick={deleteSelectedBoundingBox}
              disabled={!selectedBoundingBox}
              className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${
                selectedBoundingBox
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <TrashIcon className="w-5 h-5" />
              Delete Selected
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {!selectedTrackletId && !ballAnnotationMode && (
          <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-400">
              💡 Select a tracklet ID from the right panel to enable tools
            </p>
          </div>
        )}
        
        {(ballAnnotationMode || selectedTrackletId === 99) && (
          <div className="mt-3 p-3 bg-orange-900/30 border border-orange-600/30 rounded-lg">
            <p className="text-xs text-orange-400">
              🎯 Ball annotation mode active. Click canvas to place ball markers.
            </p>
          </div>
        )}
      </div>

      {/* Ball Annotation Controls */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gradient-to-r from-orange-900/20 to-orange-800/20 border-orange-600/30">
        <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
          <CircleStackIcon className="w-6 h-6 text-orange-400" />
          {t('ball.title') || 'Ball Annotations'}
        </h2>

        {/* Ball Mode Toggle */}
        <div className="mb-4">
          <button
            onClick={handleToggleBallMode}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-medium transition-all duration-200 ${
              ballAnnotationMode
                ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          >
            {ballAnnotationMode ? (
              <>
                <StopIcon className="w-5 h-5" />
                {t('ball.stopMode') || 'Stop Ball Mode'}
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5" />
                {t('ball.startMode') || 'Start Ball Mode'}
              </>
            )}
          </button>
          
          {ballAnnotationMode && (
            <div className="mt-2 text-xs text-orange-300 bg-orange-900/30 p-2 rounded">
              {t('ball.modeInstructions') || 'Click on the canvas to place ball markers'}
            </div>
          )}
        </div>

        {/* Annotation Statistics */}
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="text-sm text-gray-300 space-y-1">
            <div className="flex justify-between items-center">
              <span>Total Annotations:</span>
              <span className="text-blue-400 font-medium">{annotations.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Player Annotations:</span>
              <span className="text-green-400 font-medium">{annotations.length - ballAnnotations.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Ball Annotations:</span>
              <span className="text-orange-400 font-medium">{ballAnnotations.length}</span>
            </div>
            {hasBallAnnotations && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600">
                <span>Ball Tracklet ID:</span>
                <span className="text-orange-400 font-medium">99</span>
              </div>
            )}
          </div>
        </div>

        {/* Import/Export Controls */}
        <div className="space-y-2 mb-4">
          <button
            onClick={handleImportJson}
            disabled={isImporting || !selectedDirectory}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isImporting ? (t('ball.importing') || 'Importing...') : (t('ball.importJson') || 'Import from JSON')}
          </button>

          <button
            onClick={handleExportAllAnnotations}
            disabled={isExporting || !getCurrentRally() || annotations.length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {isExporting ? 'Exporting All...' : 'Export All to JSON'}
          </button>

          {hasBallAnnotations && (
            <>
              <button
                onClick={handleDeleteCurrentBallAnnotation}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                Delete Current Frame
              </button>
              
              <button
                onClick={handleClearBallAnnotations}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                Clear All Ball Annotations
              </button>
            </>
          )}
        </div>
      </div>

      {/* Directory Tree - Improved */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-yellow-400" />
            Rally Datasets
          </h2>
          <button
            onClick={handleChangeDirectory}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 bg-blue-900/30 rounded-lg"
          >
            Browse
          </button>
        </div>
        
        {/* Directory content */}
        <div className="space-y-2">
          {selectedDirectory ? (
            <div className="space-y-2">
              {/* Root directory */}
              <div
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors border border-gray-600"
                onClick={() => toggleFolder(selectedDirectory)}
              >
                <FolderIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-sm font-medium truncate text-white flex-1" title={selectedDirectory}>
                  {selectedDirectory.split('/').pop() || selectedDirectory}
                </span>
                <ChevronRightIcon 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedFolders.has(selectedDirectory) ? 'rotate-90' : ''
                  }`} 
                />
              </div>

              {/* Rally folders */}
              {expandedFolders.has(selectedDirectory) && (
                <div className="ml-4 space-y-1 border-l-2 border-gray-600 pl-4">
                  {rallyFolders.length > 0 ? (
                    rallyFolders.map((rally, index) => (
                      <div key={rally.path}>
                        <div
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            index === currentRallyIndex
                              ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
                              : 'hover:bg-gray-700 text-gray-300 border border-transparent'
                          }`}
                          onClick={() => setCurrentRally(index)}
                        >
                          <FolderIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{rally.name}</span>
                            <span className="text-xs text-gray-400">
                              {rally.imageFiles.length} frames
                            </span>
                          </div>
                          {index === currentRallyIndex && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        
                        {/* Show files when rally is selected */}
                        {index === currentRallyIndex && (
                          <div className="ml-6 mt-2 space-y-1 border-l border-gray-500 pl-3">
                            <div className="flex items-center gap-2 p-2 text-xs text-gray-400 bg-gray-800 rounded border border-gray-700">
                              <DocumentIcon className="w-3 h-3" />
                              <span>📄 annotations.txt</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 text-xs text-gray-400 bg-gray-800 rounded border border-gray-700">
                              <DocumentIcon className="w-3 h-3" />
                              <span>🖼️ {rally.imageFiles.length} image files</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-6 bg-gray-800 rounded-lg border border-gray-700">
                      <FolderIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No rally datasets found</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Make sure the directory contains folders with both images and .txt files
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 bg-gray-800 rounded-lg border border-gray-700">
              <FolderIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="space-y-3">
                <p className="text-sm font-medium">No directory selected</p>
                <button
                  onClick={handleChangeDirectory}
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg border border-blue-600/30"
                >
                  <FolderIcon className="w-4 h-4" />
                  Select Directory
                </button>
                <p className="text-xs text-gray-600">
                  Choose a directory containing rally folders with annotation data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* End of scrollable content container */}
      </div>
    </div>
  );
}
