'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { 
  FolderIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  PencilIcon,
  CursorArrowRaysIcon,
  TrashIcon,
  CogIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import AdvancedTrackletModal from './AdvancedTrackletModal';
import BallAnnotationSidebar from './BallAnnotationSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { showAlert, showError } from '@/utils/dialogUtils';

export default function LeftSidebar() {
  const { t } = useLanguage();
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  
  const {
    selectedDirectory,
    rallyFolders,
    currentRallyIndex,
    currentFrameIndex,
    setCurrentRally,
    nextFrame,
    previousFrame,
    goToFrameByIndex,
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
    ballAnnotationMode
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

  const handleDrawMode = async () => {
    if (!selectedTrackletId) {
      await showAlert(t('dialogs.selectTrackletFirst'));
      return;
    }
    setDrawingMode(!drawingMode);
    setAssignMode(false);
  };

  const handleAssignMode = async () => {
    if (!selectedTrackletId) {
      await showAlert(t('dialogs.selectTrackletFirst'));
      return;
    }
    setAssignMode(!assignMode);
    setDrawingMode(false);
  };

  const handleChangeDirectory = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      await showAlert(t('dialogs.featureDesktopOnly'));
      return;
    }

    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      
      if (selectedPath) {
        setSelectedDirectory(selectedPath);
        
        // Look for rally folders in the selected directory
        const rallyFolders = await window.electronAPI.getRallyFolders(selectedPath);
        
        if (rallyFolders.length === 0) {
          await showAlert(t('dialogs.noRallyFoldersFound'));
        } else {
          await setRallyFolders(rallyFolders);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      await showError(t('dialogs.errorAccessingDirectory'));
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
            🎬 {t('ui.frameNavigation')}
          </h2>
          
          <div className="space-y-4">
            {/* Current Frame Display */}
            <div className="text-center bg-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {currentFrameIndex}
              </div>
              <div className="text-sm text-gray-400">
                of {getCurrentRally()?.imageFiles.length || 0} frames
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={previousFrame}
                disabled={currentFrameIndex === 1}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                  currentFrameIndex === 1
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
                {t('ui.previous')}
              </button>
              
              <button
                onClick={nextFrame}
                disabled={currentFrameIndex === (getCurrentRally()?.imageFiles.length || 0)}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                  currentFrameIndex === (getCurrentRally()?.imageFiles.length || 0)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {t('ui.next')}
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Go to Frame */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300 font-medium">{t('ui.jumpToFrame')}:</label>
              <input
                type="number"
                min="0"
                max={(getCurrentRally()?.imageFiles.length || 1) - 1}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                placeholder={t('ui.enterFrameNumber')}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const frameIndex = parseInt((e.target as HTMLInputElement).value);
                    if (frameIndex >= 0 && frameIndex < (getCurrentRally()?.imageFiles.length || 0)) {
                      goToFrameByIndex(frameIndex);
                      (e.target as HTMLInputElement).value = '';
                      (e.target as HTMLInputElement).blur();
                    } else {
                      await showAlert(t('dialogs.enterFrameNumber', { max: (getCurrentRally()?.imageFiles.length || 1) - 1 }));
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
          ✏️ {t('ui.annotationTools')}
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
            {t('ui.drawBoundingBox')}
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
            {t('ui.assignIdToBox')}
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
              {t('ui.deleteSelected')}
            </button>
          </div>

          {/* Advanced Operations */}
          <div className="pt-2 border-t border-gray-600">
            <button
              onClick={() => setShowAdvancedModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CogIcon className="w-5 h-5" />
              {t('ui.advancedModifications')}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {!selectedTrackletId && !ballAnnotationMode && (
          <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-400">
              {t('ui.selectTrackletToEnable')}
            </p>
          </div>
        )}
        
        {(ballAnnotationMode || selectedTrackletId === 99) && (
          <div className="mt-3 p-3 bg-orange-900/30 border border-orange-600/30 rounded-lg">
            <p className="text-xs text-orange-400">
              {t('ui.ballAnnotationModeActive')}
            </p>
          </div>
        )}
      </div>

      {/* Ball Annotation Sidebar */}
      <BallAnnotationSidebar />

      {/* Directory Tree with sticky header */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Sticky Directory Header */}
        <div className="sticky top-0 z-10 bg-gray-900 p-4 pb-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-yellow-400" />
              {t('ui.rallyDatasets')}
            </h2>
            <button
              onClick={handleChangeDirectory}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 bg-blue-900/30 rounded-lg"
            >
              {t('ui.browse')}
            </button>
          </div>
        </div>
        
        {/* Directory content with full remaining space scrolling */}
        <div className="flex-1 overflow-y-auto pr-2 pl-4 pb-4 directory-scrollbar min-h-0 max-h-screen">
          <div className="space-y-2 pt-2">{selectedDirectory ? (
            <div className="space-y-2">
              {/* Root directory */}
              <div
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors border border-gray-600"
                onClick={() => toggleFolder(selectedDirectory)}
              >
                <FolderIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-sm font-medium truncate text-white flex-1" title={selectedDirectory}>
                  {selectedDirectory.split(/[/\\]/).pop() || selectedDirectory}
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
                              {rally.imageFiles.length} {t('ui.framesCount')}
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
                              <span>{t('ui.annotationsFile')}</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 text-xs text-gray-400 bg-gray-800 rounded border border-gray-700">
                              <DocumentIcon className="w-3 h-3" />
                              <span>🖼️ {rally.imageFiles.length} {t('ui.imageFiles')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-6 bg-gray-800 rounded-lg border border-gray-700">
                      <FolderIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">{t('ui.noRallyDatasets')}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('ui.makeSureDirectory')}
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
                <p className="text-sm font-medium">{t('ui.noDirectorySelected')}</p>
                <button
                  onClick={handleChangeDirectory}
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg border border-blue-600/30"
                >
                  <FolderIcon className="w-4 h-4" />
                  {t('ui.selectDirectory')}
                </button>
                <p className="text-xs text-gray-600">
                  {t('ui.chooseDirectory')}
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      {/* End of scrollable content container */}
      </div>

      {/* Advanced Tracklet Modal */}
      <AdvancedTrackletModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
      />
    </div>
  );
}
