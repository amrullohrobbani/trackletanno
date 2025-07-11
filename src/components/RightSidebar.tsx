'use client';

import { useState, useEffect, useMemo } from 'react';
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
    updateAnnotationDetails,
    selectedEvent,
    setSelectedEvent
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

  // Event types with hotkeys (memoized to prevent dependency issues)
  const eventTypes = useMemo(() => [
    { key: '1', name: 'serve', label: 'Serve', color: 'bg-red-600' },
    { key: '2', name: 'receive', label: 'Receive', color: 'bg-blue-600' },
    { key: '3', name: 'dig', label: 'Dig', color: 'bg-green-600' },
    { key: '4', name: 'pass', label: 'Pass', color: 'bg-yellow-600' },
    { key: '5', name: 'set', label: 'Set', color: 'bg-purple-600' },
    { key: '6', name: 'spike', label: 'Spike', color: 'bg-orange-600' },
    { key: '7', name: 'block', label: 'Block', color: 'bg-pink-600' },
    { key: '8', name: 'score', label: 'Score', color: 'bg-indigo-600' }
  ], []);

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

  // Handle keyboard shortcuts for event selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if the key matches any event type hotkey
      const eventType = eventTypes.find(e => e.key === event.key);
      if (eventType) {
        event.preventDefault();
        setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
        console.log(`Event hotkey pressed: ${event.key} -> ${eventType.name}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEvent, eventTypes, setSelectedEvent]);

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

              {/* Event Annotation */}
              <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-md font-medium mb-3 text-white">Event Annotation</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Select Event Type (Click or Use Hotkey)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {eventTypes.map((eventType) => (
                        <button
                          key={eventType.name}
                          onClick={() => setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name)}
                          className={`p-2 rounded text-xs font-medium transition-all border-2 relative ${
                            selectedEvent === eventType.name
                              ? `${eventType.color} hover:opacity-90 text-white shadow-lg ring-2 ring-white ring-opacity-50`
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{eventType.key}</span>
                            <span className="text-xs">{eventType.label}</span>
                          </div>
                          {selectedEvent === eventType.name && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Clear Event Button */}
                  <button
                    onClick={() => setSelectedEvent('')}
                    className="w-full p-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Clear Event Selection
                  </button>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>
                      {selectedEvent ? (
                        <>🎯 <strong className="text-white">{selectedEvent.toUpperCase()}</strong> mode active. Click any bounding box to assign this event.</>
                      ) : (
                        <>⚡ Select an event above, then click a bounding box to assign it.</>
                      )}
                    </p>
                    <p>• Press number keys (1-8) for quick event selection</p>
                    <p>• Events apply only to the current frame</p>
                  </div>
                </div>
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

              {/* Detailed Instructions */}
              <div className="mt-6 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium mb-3 text-white">How to Use This App</h4>
                <div className="space-y-4 text-xs text-gray-400">
                  
                  {/* Navigation */}
                  <div>
                    <h5 className="text-white font-medium mb-2">🎯 Navigation</h5>
                    <ul className="space-y-1">
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">Z</kbd> / <kbd className="bg-gray-700 px-1 rounded text-xs">X</kbd> - Previous/Next frame</li>
                      <li>• Click frame number input to jump to specific frame</li>
                      <li>• Mouse wheel - Zoom in/out on canvas</li>
                      <li>• Right-click + drag - Pan around zoomed image</li>
                    </ul>
                  </div>

                  {/* Drawing & Assigning */}
                  <div>
                    <h5 className="text-white font-medium mb-2">✏️ Drawing & Assigning</h5>
                    <ul className="space-y-1">
                      <li>• Select a tracklet ID from the list above</li>
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">D</kbd> - Switch to Drawing mode</li>
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">A</kbd> - Switch to Assign mode</li>
                      <li>• Draw mode: Click & drag to create new bounding boxes</li>
                      <li>• Assign mode: Click existing boxes to assign selected ID</li>
                    </ul>
                  </div>

                  {/* Editing */}
                  <div>
                    <h5 className="text-white font-medium mb-2">📝 Editing Annotations</h5>
                    <ul className="space-y-1">
                      <li>• Click any bounding box to select it</li>
                      <li>• Use &quot;Edit Details&quot; to modify player information</li>
                      <li>• Use &quot;Event Annotation&quot; section: select event (click or hotkey 1-8), then click bounding box</li>
                      <li>• Player details apply to ALL frames with same tracklet ID</li>
                      <li>• Events apply only to the current frame</li>
                      <li>• Delete individual boxes or entire tracklet IDs</li>
                    </ul>
                  </div>

                  {/* File Management */}
                  <div>
                    <h5 className="text-white font-medium mb-2">💾 File Management</h5>
                    <ul className="space-y-1">
                      <li>• All changes are automatically saved</li>
                      <li>• Supports 7-12 column CSV annotation format</li>
                      <li>• Switch between rallies using left sidebar</li>
                      <li>• Original data is preserved and backed up</li>
                    </ul>
                  </div>

                  {/* Visual Cues */}
                  <div>
                    <h5 className="text-white font-medium mb-2">🎨 Visual Cues</h5>
                    <ul className="space-y-1">
                      <li>• Each tracklet ID has a unique color</li>
                      <li>• Selected boxes have thicker borders</li>
                      <li>• Current mode shown in top-left corner</li>
                      <li>• Zoom level displayed in bottom-right</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Quick Tips */}
              <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-blue-200">💡 Quick Tips</h4>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• Use consistent tracklet IDs across frames for tracking</li>
                  <li>• Zoom in for precise bounding box placement</li>
                  <li>• Edit player details once - applies to all frames</li>
                  <li>• Use hotkeys 1-8 for quick event selection, then click boxes</li>
                  <li>• Events are assigned per frame, tracklet IDs apply to all frames</li>
                  <li>• Save time by using assign mode for existing boxes</li>
                </ul>
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
