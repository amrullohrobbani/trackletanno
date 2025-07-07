'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { AnnotationData } from '@/types/electron';

export default function RightSidebar() {
  const {
    selectedTrackletId,
    setSelectedTrackletId,
    getAvailableTrackletIds,
    getCurrentRally,
    setAnnotations,
    setLoading
  } = useAppStore();

  const [customId, setCustomId] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const availableIds = getAvailableTrackletIds();
  const currentRally = getCurrentRally();

  const parseAnnotationFile = (content: string): AnnotationData[] => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return []; // No data

    return lines.map((line, index) => {
      const parts = line.split(',');
      if (parts.length !== 11) {
        console.warn(`Line ${index + 1} has incorrect number of columns:`, line);
        return null;
      }

      return {
        frame: parseInt(parts[0]),
        tracklet_id: parseInt(parts[1]),
        x: parseFloat(parts[2]),
        y: parseFloat(parts[3]),
        w: parseFloat(parts[4]),
        h: parseFloat(parts[5]),
        score: parseFloat(parts[6]),
        role: parts[7],
        jersey_number: parts[8],
        jersey_color: parts[9],
        team: parts[10]
      };
    }).filter((ann): ann is AnnotationData => ann !== null);
  };

  // Load annotation data when rally changes
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!currentRally || typeof window === 'undefined' || !window.electronAPI) return;

      setLoading(true);
      try {
        console.log('=== Loading annotations ===');
        console.log('Annotation file:', currentRally.annotationFile);
        const fileContent = await window.electronAPI.readFile(currentRally.annotationFile);
        console.log('File content length:', fileContent.length);
        console.log('First 200 chars:', fileContent.substring(0, 200));
        
        const annotations = parseAnnotationFile(fileContent);
        console.log('Parsed annotations count:', annotations.length);
        if (annotations.length > 0) {
          console.log('Sample annotation:', annotations[0]);
          const uniqueFrames = [...new Set(annotations.map(ann => ann.frame))].sort();
          console.log('Unique frames in annotations:', uniqueFrames.slice(0, 10));
        }
        
        setAnnotations(annotations);
      } catch (error) {
        console.error('Error loading annotations:', error);
        setAnnotations([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnnotations();
  }, [currentRally, setAnnotations, setLoading]);

  const handleSelectId = (id: number) => {
    setSelectedTrackletId(id);
    setShowCustomInput(false);
  };

  const handleAddCustomId = () => {
    const id = parseInt(customId);
    if (!isNaN(id) && id > 0) {
      setSelectedTrackletId(id);
      setCustomId('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Tracklet IDs</h2>
        <div className="text-sm text-gray-400">
          {currentRally ? (
            <>
              Rally: {currentRally.name}<br />
              {availableIds.length} tracklet IDs available
            </>
          ) : (
            'No rally selected'
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {currentRally ? (
            <>
              {/* Available IDs */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Available IDs</h3>
                {availableIds.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => handleSelectId(id)}
                        className={`p-2 rounded text-sm font-medium transition-colors ${
                          selectedTrackletId === id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No tracklet IDs found in annotations</div>
                )}
              </div>

              {/* Custom ID Input */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium">Custom ID</h3>
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {showCustomInput ? 'Cancel' : 'Add New'}
                  </button>
                </div>
                
                {showCustomInput && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customId}
                      onChange={(e) => setCustomId(e.target.value)}
                      placeholder="Enter ID..."
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <button
                      onClick={handleAddCustomId}
                      disabled={!customId || isNaN(parseInt(customId)) || parseInt(customId) <= 0}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Selected ID Display */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2">Selected ID</h3>
                {selectedTrackletId !== null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-400">{selectedTrackletId}</span>
                    <button
                      onClick={() => setSelectedTrackletId(null)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    No ID selected
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Instructions</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Select an ID above</li>
                  <li>• Use D key for draw mode</li>
                  <li>• Use A key for assign mode</li>
                  <li>• Click boxes to assign selected ID</li>
                </ul>
              </div>

              {/* Team Color Legend */}
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Team Colors</h4>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                    <span className="text-gray-400">Home Team (0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
                    <span className="text-gray-400">Away Team (1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6B7280' }}></div>
                    <span className="text-gray-400">Others (-1)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Team values: 0=home, 1=away, -1=others
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🏃‍♂️</div>
              <div className="text-lg font-medium mb-1">No Rally Selected</div>
              <div className="text-xs text-gray-500">
                Use the directory tree on the left to switch between rallies
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
