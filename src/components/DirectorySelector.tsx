'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';

export default function DirectorySelector() {
  const [isSelecting, setIsSelecting] = useState(false);
  const { setSelectedDirectory, setRallyFolders, setLoading } = useAppStore();

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
          // Debug the directory structure to help troubleshoot
          const debugInfo = await window.electronAPI.debugDirectory(selectedPath);
          console.log('Debug info:', debugInfo);
          
          alert(`No rally folders with annotation data found in the selected directory.
          
Debug info:
- Total entries: ${debugInfo.totalEntries || 0}
- Directories: ${debugInfo.directories?.join(', ') || 'none'}
- Rally directories: ${debugInfo.rallyDirectories?.join(', ') || 'none'}

Please check:
1. Directory contains folders starting with 'rally_'
2. Rally folders contain .txt files (annotations)  
3. Rally folders contain image files (.jpg, .png, etc.)
4. Annotation files have 11 columns: frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team

Check the console for more detailed logs.`);
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
            <div className="ml-4">📁 sets_1/</div>
            <div className="ml-8">📁 rally_1/</div>
            <div className="ml-12">📄 annotations.txt</div>
            <div className="ml-12">🖼️ 000001.jpg</div>
            <div className="ml-12">🖼️ 000002.jpg</div>
            <div className="ml-12">🖼️ ...</div>
            <div className="ml-8">📁 rally_2/</div>
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
          frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team
        </code>
        <p className="mt-1 text-xs">One row per annotation, no header required</p>
      </div>
    </div>
  );
}
