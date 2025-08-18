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
import { showAlert, showConfirm, showSuccess, showError } from '@/utils/dialogUtils';

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
    removeCurrentFrameBallAnnotation,
    ballAnnotationRadius,
    setBallAnnotationRadius
  } = useAppStore();

  const handleToggleBallMode = () => {
    setBallAnnotationMode(!ballAnnotationMode);
  };

  const handleImportJson = async () => {
    if (!selectedDirectory) {
      await showAlert(t('dialogs.selectDirectoryFirst'));
      return;
    }

    // Check if ball annotations already exist and prompt for overwrite
    if (hasBallAnnotations) {
      const shouldOverwrite = await showConfirm(
        t('dialogs.ballAnnotationsExist')
      );
      
      if (!shouldOverwrite) {
        return; // User cancelled
      }
    }

    setIsImporting(true);
    try {
      await loadBallAnnotationsFromJson();
      await showSuccess(t('dialogs.importSuccess'));
    } catch (error) {
      console.error('Import error:', error);
      await showError(t('dialogs.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportAllAnnotations = async () => {
    const rally = getCurrentRally();
    if (!rally) {
      await showAlert(t('dialogs.noRallySelected'));
      return;
    }

    setIsExporting(true);
    try {
      const success = await exportAnnotationsAsJson();
      if (success) {
        await showSuccess(t('dialogs.exportSuccess'));
      } else {
        await showError(t('dialogs.exportError'));
      }
    } catch (error) {
      console.error('Export error:', error);
      await showError(t('dialogs.exportErrorGeneral'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearBallAnnotations = async () => {
    const shouldClear = await showConfirm(t('dialogs.clearBallConfirm'));
    if (shouldClear) {
      clearBallAnnotations();
    }
  };

  const handleDeleteCurrentBallAnnotation = async () => {
    const currentBallAnnotation = getCurrentFrameBallAnnotation();
    
    if (currentBallAnnotation) {
      const shouldDelete = await showConfirm(t('dialogs.deleteBallFrameConfirm'));
      if (shouldDelete) {
        removeCurrentFrameBallAnnotation();
      }
    } else {
      await showAlert(t('dialogs.noBallAnnotationFound'));
    }
  };

  const totalAnnotations = annotations.length;
  const ballAnnotationsCount = ballAnnotations.length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      {/* Ball Radius Control */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">
          Ball Annotation Radius: {ballAnnotationRadius}px
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">1</span>
          <input
            type="range"
            min="1"
            max="20"
            value={ballAnnotationRadius}
            onChange={(e) => setBallAnnotationRadius(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${(ballAnnotationRadius - 1) / 19 * 100}%, #374151 ${(ballAnnotationRadius - 1) / 19 * 100}%, #374151 100%)`
            }}
          />
          <span className="text-xs text-gray-400">20</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Controls the click radius for selecting ball annotations
        </div>
      </div>

      {/* Annotation Statistics */}
      {/* <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
                <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between">
            <span>{t('ball.totalAnnotations')}:</span>
            <span className="text-blue-400 font-medium">{totalAnnotations}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ball.playerAnnotations')}:</span>
            <span className="text-green-400 font-medium">{playerAnnotationsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ball.ballAnnotations')}:</span>
            <span className="text-orange-400 font-medium">{ballAnnotationsCount}</span>
          </div>
          {ballAnnotationsCount > 0 && (
            <div className="flex justify-between col-span-2">
              <span>{t('ball.ballTrackletId')}:</span>
              <span className="text-orange-400 font-medium">99</span>
            </div>
          )}
        </div>
      </div> */}

      {/* Import/Export Controls - Only visible in dev mode */}
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
          {isExporting ? t('ui.exportingAll') : t('ui.exportAllToJson')}
        </button>
      </div>

      {hasBallAnnotations && (
        <div className="space-y-2 mb-4">
          <button
            onClick={handleDeleteCurrentBallAnnotation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            {t('ball.deleteCurrentFrame')}
          </button>
          
          <button
            onClick={handleClearBallAnnotations}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            {t('ball.clearAllBall')}
          </button>
        </div>
      )}

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className="mb-4 text-center">
          <div className={`text-xs px-2 py-1 rounded ${
            saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
            saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {saveStatus === 'saving' && t('ui.saving')}
            {saveStatus === 'saved' && t('ui.saved')}
            {saveStatus === 'error' && t('ui.saveError')}
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
          <p className="font-medium text-gray-300 mb-1">{t('ball.instructions')}:</p>
          <p>• {t('ball.instructionImport')}</p>
          <p>• {t('ball.instructionBallMode')}</p>
          <p>• {t('ball.instructionClickCanvas')}</p>
          <p>• {t('ball.instructionDeleteFrame')}</p>
          <p>• {t('ball.instructionExport')}</p>
          <p>• {t('ball.instructionYCoordinates')}</p>
        </div>
      </div>
    </div>
  );
}
