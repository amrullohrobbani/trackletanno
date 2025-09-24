'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DirectorySelector() {
  const [isSelecting, setIsSelecting] = useState(false);
  const { setSelectedDirectory, setRallyFolders, setLoading } = useAppStore();
  const { t } = useLanguage();

  interface ValidationResult {
    folderName: string;
    rallyName: string | null;
    isValidPattern: boolean;
    issues: string[];
    status: string;
  }

  const handleSelectDirectory = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      alert(t('dialogs.featureDesktopOnly'));
      return;
    }

    setIsSelecting(true);
    setLoading(true);

    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      
      if (selectedPath) {
        setSelectedDirectory(selectedPath);
        
        // Look for rally folders in the selected directory
        const rallyFolders = await window.electronAPI.getRallyFolders(selectedPath);
        console.log('Found rally folders:', rallyFolders);
        
        if (rallyFolders.length === 0) {
          // Enhanced error message with validation details
          const debugInfo = await window.electronAPI.debugDirectory(selectedPath);
          console.log('Debug info:', debugInfo);
          
          let errorMessage = t('dialogs.noRallyFoldersFound') + '\n\n';
          
          // Show validation results if available
          const validationResults = (rallyFolders as unknown as { validationResults?: ValidationResult[] }).validationResults;
          if (validationResults && validationResults.length > 0) {
            errorMessage += t('dialogs.foundDirectories', { count: validationResults.length }) + '\n\n';
            
            for (const result of validationResults) {
              errorMessage += `📁 ${result.folderName}:\n`;
              if (result.status === 'valid') {
                errorMessage += `  ${t('dialogs.validRallyFolder')}\n`;
              } else if (result.status === 'warning') {
                errorMessage += `  ${t('dialogs.hasIssuesButMayWork')}\n`;
                result.issues.forEach((issue: string) => errorMessage += `     • ${issue}\n`);
              } else {
                errorMessage += `  ${t('dialogs.issuesFound')}\n`;
                result.issues.forEach((issue: string) => errorMessage += `     • ${issue}\n`);
              }
              errorMessage += `\n`;
            }
          } else {
            errorMessage += `${t('dialogs.debugInfo')}\n`;
            errorMessage += `${t('dialogs.totalEntries', { count: debugInfo.totalEntries || 0 })}\n`;
            errorMessage += `${t('dialogs.directories', { list: debugInfo.directories?.join(', ') || 'none' })}\n`;
            errorMessage += `${t('dialogs.rallyDirectories', { list: debugInfo.rallyDirectories?.join(', ') || 'none' })}\n\n`;
          }
          
          errorMessage += `${t('dialogs.requirementsForRallyFolders')}\n`;
          errorMessage += `${t('dialogs.folderNameFormat')}\n`;
          errorMessage += `${t('dialogs.matchingTxtFile')}\n`;
          errorMessage += `${t('dialogs.imageFiles')}\n`;
          errorMessage += `${t('dialogs.annotationFileFormat')}\n\n`;
          errorMessage += `${t('dialogs.checkConsoleForLogs')}`;

          alert(errorMessage);
          setSelectedDirectory(null);
        } else {
          await setRallyFolders(rallyFolders);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert(t('dialogs.errorAccessingDirectory'));
    } finally {
      setIsSelecting(false);
      setLoading(false);
    }
  };

  return (
    <div className="text-center max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{t('app.title')}</h1>
        <p className="text-gray-400 text-lg">
          {t('app.selectDirectory')}
        </p>
      </div>
      
      <div className="mb-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">{t('ui.expectedDirectoryStructure')}:</h3>
          <div className="text-left text-sm text-gray-300 font-mono">
            <div>📁 selected_directory/</div>
            <div className="ml-4">📁 207s2rally001/</div>
            <div className="ml-12">�️ 002001.jpg</div>
            <div className="ml-12">🖼️ 002002.jpg</div>
            <div className="ml-12">🖼️ ...</div>
            <div className="ml-4">� 207s2rally001.txt</div>
            <div className="ml-4">📁 207s2rally002/</div>
            <div className="ml-12">📄 ...</div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSelectDirectory}
        disabled={isSelecting}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
      >
        {isSelecting ? t('ui.loading') : t('app.selectDirectory')}
      </button>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>{t('ui.annotationFileFormat')}:</p>
        <code className="bg-gray-800 px-2 py-1 rounded text-xs">
          frame,tracklet_id,x,y,w,h,score[,role,jersey_number,jersey_color,team,event]
        </code>
        <p className="mt-1 text-xs">{t('ui.columnsRequired')}</p>
      </div>
    </div>
  );
}
