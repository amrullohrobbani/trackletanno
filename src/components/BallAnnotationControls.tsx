'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { 
  CircleStackIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BallAnnotationControls() {
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
    saveStatus
  } = useAppStore();

  const handleToggleBallMode = () => {
    setBallAnnotationMode(!ballAnnotationMode);
  };

  const handleImportJson = async () => {
    if (!selectedDirectory) {
      alert('Please select a directory first.');
      return;
    }

    setIsImporting(true);
    try {
      await loadBallAnnotationsFromJson();
      alert(`Successfully imported ball annotations!`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing ball annotations from JSON files.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportJson = async () => {
    const rally = getCurrentRally();
    if (!rally) {
      alert('No rally selected.');
      return;
    }

    setIsExporting(true);
    try {
      const success = await exportAnnotationsAsJson();
      if (success) {
        alert(`Successfully exported annotations to JSON!`);
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

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h3 className="text-md font-medium mb-4 text-white flex items-center gap-2">
        <CircleStackIcon className="w-5 h-5 text-orange-400" />
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

      {/* Ball Annotation Stats */}
      {hasBallAnnotations && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="text-sm text-gray-300">
            <div className="flex justify-between items-center">
              <span>{t('ball.annotations')}:</span>
              <span className="text-orange-400 font-medium">{ballAnnotations.length}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>{t('ball.trackletId')}:</span>
              <span className="text-orange-400 font-medium">99</span>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Controls */}
      <div className="space-y-2">
        <button
          onClick={handleImportJson}
          disabled={isImporting || !selectedDirectory}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          {isImporting ? t('ball.importing') : t('ball.importJson')}
        </button>

        <button
          onClick={handleExportJson}
          disabled={isExporting || !getCurrentRally()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          {isExporting ? t('ball.exporting') : t('ball.exportJson')}
        </button>
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className="mt-3 text-center">
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

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-400">
        <p className="mb-1">• {t('ball.helpImport')}</p>
        <p className="mb-1">• {t('ball.helpAnnotate')}</p>
        <p>• {t('ball.helpExport')}</p>
      </div>
    </div>
  );
}
