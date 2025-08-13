'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';

export default function DirectorySelector() {
  const [isSelecting, setIsSelecting] = useState(false);
  const { setSelectedDirectory, setRallyFolders, setLoading } = useAppStore();

  interface ValidationResult {
    folderName: string;
    rallyName: string | null;
    isValidPattern: boolean;
    issues: string[];
    status: string;
  }

  const handleSelectDirectory = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      alert('This feature is only available in the desktop application.');
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
          
          let errorMessage = `No valid rally folders found in the selected directory.\n\n`;
          
          // Show validation results if available
          const validationResults = (rallyFolders as unknown as { validationResults?: ValidationResult[] }).validationResults;
          if (validationResults && validationResults.length > 0) {
            errorMessage += `Found ${validationResults.length} directories:\n\n`;
            
            for (const result of validationResults) {
              errorMessage += `📁 ${result.folderName}:\n`;
              if (result.status === 'valid') {
                errorMessage += `  ✅ Valid rally folder\n`;
              } else if (result.status === 'warning') {
                errorMessage += `  ⚠️  Has issues but may work:\n`;
                result.issues.forEach((issue: string) => errorMessage += `     • ${issue}\n`);
              } else {
                errorMessage += `  ❌ Issues found:\n`;
                result.issues.forEach((issue: string) => errorMessage += `     • ${issue}\n`);
              }
              errorMessage += `\n`;
            }
          } else {
            errorMessage += `Debug info:\n`;
            errorMessage += `- Total entries: ${debugInfo.totalEntries || 0}\n`;
            errorMessage += `- Directories: ${debugInfo.directories?.join(', ') || 'none'}\n`;
            errorMessage += `- Rally directories: ${debugInfo.rallyDirectories?.join(', ') || 'none'}\n\n`;
          }
          
          errorMessage += `Requirements for rally folders:\n`;
          errorMessage += `1. Folder name format: [gameId]s[set]rally[number] (e.g., 207s2rally001)\n`;
          errorMessage += `2. Matching .txt file in parent directory (e.g., 207s2rally001.txt)\n`;
          errorMessage += `3. Image files (.jpg, .png, etc.) inside the folder\n`;
          errorMessage += `4. Annotation file with at least 7 columns: frame,tracklet_id,x,y,w,h,score\n\n`;
          errorMessage += `Check the console for detailed logs.`;

          alert(errorMessage);
          setSelectedDirectory(null);
        } else {
          setRallyFolders(rallyFolders);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('Error accessing the selected directory.');
    } finally {
      setIsSelecting(false);
      setLoading(false);
    }
  };

  return (
    <div className="text-center max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Tracklet Annotation Tool</h1>
        <p className="text-gray-400 text-lg">
          Select a directory containing your tracklet annotation data to get started.
        </p>
      </div>
      
      <div className="mb-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Expected Directory Structure:</h3>
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
        {isSelecting ? 'Selecting...' : 'Search Directory'}
      </button>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Annotation files should contain data in this format:</p>
        <code className="bg-gray-800 px-2 py-1 rounded text-xs">
          frame,tracklet_id,x,y,w,h,score[,role,jersey_number,jersey_color,team,event]
        </code>
        <p className="mt-1 text-xs">At least 7 columns required, up to 12 columns supported. No header required.</p>
      </div>
    </div>
  );
}
