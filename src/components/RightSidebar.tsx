'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { parseAnnotations } from '@/utils/annotationParser';

export default function RightSidebar() {
  const {
    selectedTrackletId,
    setSelectedTrackletId,
    getAvailableTrackletIds,
    getCurrentRally,
    setAnnotations,
    setLoading,
    selectedBoundingBox,
    boundingBoxes,
    annotations,
    currentFrameIndex,
    updateAnnotationDetails
  } = useAppStore();

  const [customId, setCustomId] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  
  // Annotation editing state
  const [editRole, setEditRole] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [editJerseyColor, setEditJerseyColor] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [customJerseyColor, setCustomJerseyColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  
  const availableIds = getAvailableTrackletIds();
  const currentRally = getCurrentRally();

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
        
        const annotations = parseAnnotations(fileContent);
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
    <div className="flex flex-col h-full overflow-hidden bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gray-800">
        <h2 className="text-lg font-semibold mb-2 text-white">Tracklet IDs</h2>
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
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="p-4 bg-gray-800">
          {currentRally ? (
            <>
              {/* Available IDs */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3 text-white">Available IDs</h3>
                {availableIds.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => handleSelectId(id)}
                        className={`p-2 rounded text-sm font-medium transition-colors border ${
                          selectedTrackletId === id
                            ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                        }`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">No tracklet IDs found in annotations</div>
                )}
              </div>

              {/* Custom ID Input */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-white">Custom ID</h3>
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
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2 text-white">Selected ID</h3>
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
                  <div className="text-gray-400 text-sm">
                    No ID selected
                  </div>
                )}
              </div>

              {/* Annotation Details Editor */}
              <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-white">Annotation Details</h3>
                  <button
                    onClick={() => {
                      setShowAnnotationEditor(!showAnnotationEditor);
                      if (!showAnnotationEditor && selectedBoundingBox) {
                        // Load current annotation data when opening editor
                        const targetBox = boundingBoxes.find(box => box.id === selectedBoundingBox);
                        if (targetBox) {
                          const frameNumber = currentFrameIndex + 1;
                          const annotation = annotations.find(ann => 
                            ann.frame === frameNumber && ann.tracklet_id === targetBox.tracklet_id
                          );
                          if (annotation) {
                            setEditRole(annotation.role || '');
                            setEditJerseyNumber(annotation.jersey_number || '');
                            setEditJerseyColor(annotation.jersey_color || '');
                            setEditTeam(annotation.team || '');
                          }
                        }
                      }
                    }}
                    disabled={!selectedBoundingBox}
                    className={`text-xs transition-colors ${
                      selectedBoundingBox
                        ? 'text-blue-400 hover:text-blue-300'
                        : 'text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {showAnnotationEditor ? 'Close' : 'Edit Details'}
                  </button>
                </div>
                
                {selectedBoundingBox ? (
                  showAnnotationEditor ? (
                    <div className="space-y-3">
                      {/* Role */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Role</label>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          placeholder="e.g., player, referee"
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      
                      {/* Jersey Number */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Jersey Number</label>
                        <input
                          type="text"
                          value={editJerseyNumber}
                          onChange={(e) => setEditJerseyNumber(e.target.value)}
                          placeholder="e.g., 10, 23"
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      
                      {/* Jersey Color */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Jersey Color</label>
                        <div className="space-y-2">
                          <select
                            value={editJerseyColor}
                            onChange={(e) => {
                              setEditJerseyColor(e.target.value);
                              setShowCustomColor(e.target.value === 'custom');
                            }}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            <option value="">Select color</option>
                            <option value="red">Red</option>
                            <option value="blue">Blue</option>
                            <option value="white">White</option>
                            <option value="black">Black</option>
                            <option value="yellow">Yellow</option>
                            <option value="green">Green</option>
                            <option value="orange">Orange</option>
                            <option value="purple">Purple</option>
                            <option value="custom">Custom...</option>
                          </select>
                          
                          {showCustomColor && (
                            <input
                              type="text"
                              value={customJerseyColor}
                              onChange={(e) => {
                                setCustomJerseyColor(e.target.value);
                                setEditJerseyColor(e.target.value);
                              }}
                              placeholder="Enter custom color"
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Team */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Team</label>
                        <select
                          value={editTeam}
                          onChange={(e) => setEditTeam(e.target.value)}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="">Select team</option>
                          <option value="0">Home Team (0)</option>
                          <option value="1">Away Team (1)</option>
                          <option value="-1">Others (-1)</option>
                        </select>
                      </div>
                      
                      {/* Save Button */}
                      <button
                        onClick={() => {
                          if (selectedBoundingBox) {
                            updateAnnotationDetails(selectedBoundingBox, {
                              role: editRole,
                              jersey_number: editJerseyNumber,
                              jersey_color: editJerseyColor,
                              team: editTeam
                            });
                            setShowAnnotationEditor(false);
                          }
                        }}
                        className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                      >
                        Save Details
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Click &quot;Edit Details&quot; to modify annotation information
                    </p>
                  )
                ) : (
                  <p className="text-xs text-gray-400">
                    Select a bounding box to edit its details
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-white">Instructions</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Select an ID above</li>
                  <li>• Use D key for draw mode</li>
                  <li>• Use A key for assign mode</li>
                  <li>• Click boxes to assign selected ID</li>
                </ul>
              </div>

              {/* Tracklet ID Color Legend */}
              <div className="mt-4 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-white">Tracklet ID Colors</h4>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: '#EF4444' }}></div>
                    <span className="text-gray-300">ID 1, 21, 41...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: '#3B82F6' }}></div>
                    <span className="text-gray-300">ID 2, 22, 42...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: '#10B981' }}></div>
                    <span className="text-gray-300">ID 3, 23, 43...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: '#F59E0B' }}></div>
                    <span className="text-gray-300">ID 4, 24, 44...</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Colors repeat every 20 IDs for better variety
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🏃‍♂️</div>
              <div className="text-lg font-medium mb-1 text-gray-300">No Rally Selected</div>
              <div className="text-xs text-gray-400">
                Use the directory tree on the left to switch between rallies
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
