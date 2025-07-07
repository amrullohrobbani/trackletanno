'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { FolderIcon, DocumentIcon, PencilIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';

export default function LeftSidebar() {
  const {
    selectedDirectory,
    rallyFolders,
    currentRallyIndex,
    setCurrentRally,
    drawingMode,
    assignMode,
    setDrawingMode,
    setAssignMode,
    selectedTrackletId,
    setSelectedDirectory,
    setRallyFolders
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
      {/* Annotation Controls */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4">Annotation Controls</h2>
        
        <div className="space-y-2">
          <button
            onClick={handleDrawMode}
            disabled={!selectedTrackletId}
            className={`w-full flex items-center gap-2 p-3 rounded-lg font-medium transition-colors ${
              drawingMode
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${!selectedTrackletId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <PencilIcon className="w-5 h-5" />
            Draw New Bounding Box
          </button>
          
          <button
            onClick={handleAssignMode}
            disabled={!selectedTrackletId}
            className={`w-full flex items-center gap-2 p-3 rounded-lg font-medium transition-colors ${
              assignMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${!selectedTrackletId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CursorArrowRaysIcon className="w-5 h-5" />
            Assign Tracklet ID
          </button>
        </div>

        {!selectedTrackletId && (
          <p className="text-xs text-yellow-400 mt-2">
            Select a tracklet ID from the right panel to enable annotation controls.
          </p>
        )}
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Directory Tree</h2>
            <button
              onClick={handleChangeDirectory}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Change Directory
            </button>
          </div>

        {selectedDirectory && (
          <div className="space-y-1">
            {/* Root directory */}
            <div
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
              onClick={() => toggleFolder(selectedDirectory)}
            >
              <FolderIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium truncate" title={selectedDirectory}>
                {selectedDirectory.split('/').pop() || selectedDirectory}
              </span>
            </div>

            {/* Rally folders */}
            {expandedFolders.has(selectedDirectory) && (
              <div className="ml-4 space-y-1">
                {rallyFolders.map((rally, index) => (
                  <div key={rally.path}>
                    <div
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        index === currentRallyIndex
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-700'
                      }`}
                      onClick={() => setCurrentRally(index)}
                    >
                      <FolderIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm">{rally.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {rally.imageFiles.length} frames
                      </span>
                    </div>
                    
                    {/* Show files when rally is selected */}
                    {index === currentRallyIndex && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        <div className="flex items-center gap-2 p-1 text-xs text-gray-400">
                          <DocumentIcon className="w-3 h-3" />
                          <span>annotations.txt</span>
                        </div>
                        <div className="flex items-center gap-2 p-1 text-xs text-gray-400">
                          <DocumentIcon className="w-3 h-3" />
                          <span>{rally.imageFiles.length} image files</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {rallyFolders.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <FolderIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No rally folders found
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
