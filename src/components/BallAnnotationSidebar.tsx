'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { 
  CircleStackIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  StopIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BallAnnotationSidebar() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {
    ballAnnotationMode,
    setBallAnnotationMode,
    loadBallAnnotationsFromJson,
    exportAnnotationsAsJson,
    hasBallAnnotations,
    ballAnnotations,
    selectedDirectory,
    getCurrentRally,
    saveStatus,
    annotations,
    clearBallAnnotations,
    getCurrentFrameBallAnnotation,
    removeCurrentFrameBallAnnotation
  } = useAppStore();

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

  const totalAnnotations = annotations.length;
  const ballAnnotationsCount = ballAnnotations.length;
  const playerAnnotationsCount = totalAnnotations - ballAnnotationsCount;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4 text-white flex items-center gap-2">
        <CircleStackIcon className="w-6 h-6 text-orange-400" />
        {t('ball.title')}
      </h3>

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
              {t('ball.stopMode')}
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5" />
              {t('ball.startMode')}
            </>
          )}
        </button>
        
        {ballAnnotationMode && (
          <div className="mt-2 text-xs text-orange-300 bg-orange-900/30 p-2 rounded">
            {t('ball.modeInstructions')}
          </div>
        )}
      </div>

      {/* Annotation Statistics */}
      <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between items-center">
            <span>Total Annotations:</span>
            <span className="text-blue-400 font-medium">{totalAnnotations}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Player Annotations:</span>
            <span className="text-green-400 font-medium">{playerAnnotationsCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Ball Annotations:</span>
            <span className="text-orange-400 font-medium">{ballAnnotationsCount}</span>
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
          {isImporting ? t('ball.importing') : t('ball.importJson')}
        </button>

        <button
          onClick={handleExportAllAnnotations}
          disabled={isExporting || !getCurrentRally() || totalAnnotations === 0}
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
              Clear Ball Annotations
            </button>
          </>
        )}
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className="mb-4 text-center">
          <div className={`text-xs px-2 py-1 rounded ${
            saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
            saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Saved'}
            {saveStatus === 'error' && '❌ Error'}
          </div>
        </div>
      )}

      {/* Import Status */}
      {hasBallAnnotations && (
        <div className="mb-4 text-xs text-green-300 bg-green-900/30 p-2 rounded">
          ✅ Ball annotations loaded. Use import to overwrite if needed.
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-400 space-y-2">
        <div className="mb-2 p-2 bg-gray-800 border border-gray-600 rounded">
          <p className="font-medium text-gray-300 mb-1">Instructions:</p>
          <p>• Import: Load ball annotations from JSON files</p>
          <p>• Ball Mode: Toggle ball annotation mode OR select tracklet ID 99</p>
          <p>• Click Canvas: Once ball mode is active, click to annotate ball positions</p>
          <p>• Delete Frame: Remove ball annotation for current frame</p>
          <p>• Export: Save ALL annotations to JSON format</p>
          <p>• Y-coordinates are automatically corrected for canvas</p>
        </div>
      </div>
    </div>
  );
}
