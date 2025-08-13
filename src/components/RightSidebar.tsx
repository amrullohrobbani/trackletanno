'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAppStore } from '@/store/appStore';
import { parseAnnotations } from '@/utils/annotationParser';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TimelineButton from '@/components/TimelineButton';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getTrackletColor } from '@/utils/trackletColors';
import { showConfirm } from '@/utils/dialogUtils';
import RallyEventsModal from '@/components/RallyEventsModal';

export default function RightSidebar() {
  const { t } = useLanguage();
  
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
    setSelectedEvent,
    idAnalysisResult,
    isAnalyzing,
    showAnalysis,
    analyzeTrackletIDs,
    setShowAnalysis,
    clearAnalysis,
    showTrackletLabels,
    setShowTrackletLabels,
    showEventLabels,
    setShowEventLabels,
    ballAnnotationMode,
    setBallAnnotationMode,
    visibleTrackletIds,
    setTrackletVisibility,
    showAllTracklets,
    hideAllTracklets,
    deleteAllAnnotationsWithTrackletId
  } = useAppStore();

  const [customId, setCustomId] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(true);
  const [showEventsList, setShowEventsList] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState('volleyball'); // Default to volleyball
  
  // Annotation editing state
  const [editRole, setEditRole] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [editJerseyColor, setEditJerseyColor] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [customJerseyColor, setCustomJerseyColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  
  const availableIds = getAvailableTrackletIds();
  const currentRally = getCurrentRally();

  // Sport-specific event types
  const sportEventTypes = useMemo(() => ({
    volleyball: [
      { key: 'q', name: 'serve', label: t('events.serve'), color: 'bg-red-600' },
      { key: 'w', name: 'receive', label: t('events.receive'), color: 'bg-blue-600' },
      { key: 'e', name: 'dig', label: t('events.dig'), color: 'bg-green-600' },
      { key: 'r', name: 'pass', label: t('events.pass'), color: 'bg-yellow-600' },
      { key: 't', name: 'set', label: t('events.set'), color: 'bg-purple-600' },
      { key: 'y', name: 'spike', label: t('events.spike'), color: 'bg-orange-600' },
      { key: 'u', name: 'block', label: t('events.block'), color: 'bg-pink-600' },
      { key: 'i', name: 'score', label: t('events.score'), color: 'bg-indigo-600' },
      { key: 'n', name: 'no_event', label: t('events.no_event'), color: 'bg-gray-600' }
    ],
    tennis: [
      { key: 'q', name: 'serve', label: 'Serve', color: 'bg-red-600' },
      { key: 'w', name: 'hit', label: 'Hit', color: 'bg-blue-600' },
      { key: 'e', name: 'bounce', label: 'Bounce', color: 'bg-green-600' },
      { key: 'n', name: 'no_event', label: 'No Event', color: 'bg-gray-600' }
    ]
  }), [t]);

  // Event types with hotkeys (memoized to prevent dependency issues)
  const eventTypes = useMemo(() => sportEventTypes[selectedSport as keyof typeof sportEventTypes] || sportEventTypes.volleyball, [sportEventTypes, selectedSport]);

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

  // Auto-show analysis results when completed
  useEffect(() => {
    if (idAnalysisResult && !isAnalyzing) {
      setShowAnalysis(true);
    }
  }, [idAnalysisResult, isAnalyzing, setShowAnalysis]);

  // Handle keyboard shortcuts for event selection using react-hotkeys-hook
  const eventHotkeyOptions = {
    enableOnFormTags: false, // Disable when focus is on form elements (input, textarea, select)
    enableOnContentEditable: false, // Disable on contenteditable elements
    ignoreModifiers: false
  };

  // Set up hotkeys for each event type using react-hotkeys-hook
  useHotkeys('q', () => {
    const eventType = eventTypes.find(e => e.key === 'q');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: Q -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('w', () => {
    const eventType = eventTypes.find(e => e.key === 'w');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: W -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('e', () => {
    const eventType = eventTypes.find(e => e.key === 'e');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: E -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('r', () => {
    const eventType = eventTypes.find(e => e.key === 'r');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: R -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('t', () => {
    const eventType = eventTypes.find(e => e.key === 't');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: T -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('y', () => {
    const eventType = eventTypes.find(e => e.key === 'y');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: Y -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('u', () => {
    const eventType = eventTypes.find(e => e.key === 'u');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: U -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('i', () => {
    const eventType = eventTypes.find(e => e.key === 'i');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: I -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  useHotkeys('n', () => {
    const eventType = eventTypes.find(e => e.key === 'n');
    if (eventType) {
      setSelectedEvent(selectedEvent === eventType.name ? '' : eventType.name);
      console.log(`Event hotkey pressed: N -> ${eventType.name}`);
    }
  }, eventHotkeyOptions, [selectedEvent, eventTypes, setSelectedEvent]);

  const handleSelectId = (id: number) => {
    setSelectedTrackletId(id);
    setShowCustomInput(false);
    
    // Auto-enable ball annotation mode when selecting tracklet ID 99
    if (id === 99) {
      setBallAnnotationMode(true);
    }
    
    // Show the tracklet if it's hidden when selected
    if (!visibleTrackletIds.has(id)) {
      setTrackletVisibility(id, true);
    }
  };

  const handleAddCustomId = () => {
    const id = parseInt(customId);
    if (!isNaN(id) && id > 0) {
      setSelectedTrackletId(id);
      setCustomId('');
      setShowCustomInput(false);
      
      // Auto-enable ball annotation mode when selecting tracklet ID 99
      if (id === 99) {
        setBallAnnotationMode(true);
      }
      
      // Show the tracklet if it's hidden when selected
      if (!visibleTrackletIds.has(id)) {
        setTrackletVisibility(id, true);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0 bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">{t('sidebar.trackletIds')}</h2>
          <LanguageSwitcher />
        </div>
        {/* Tracklet Label Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showTrackletLabels ? 'bg-blue-600' : 'bg-gray-400'}`}
            onClick={() => setShowTrackletLabels(!showTrackletLabels)}
            aria-pressed={showTrackletLabels}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${showTrackletLabels ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
          <span className="text-sm text-gray-400">
            {t('sidebar.trackletLabelToggle')}
          </span>
        </div>
        {/* Event Label Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showEventLabels ? 'bg-blue-600' : 'bg-gray-400'}`}
            onClick={() => setShowEventLabels(!showEventLabels)}
            aria-pressed={showEventLabels}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${showEventLabels ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
          <span className="text-sm text-gray-400">
            {t('sidebar.eventLabelToggle')}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {currentRally ? (
            <>
              {t('sidebar.rally')}: {currentRally.name}<br />
              {availableIds.length} {t('sidebar.trackletIds')} {t('sidebar.available')}
            </>
          ) : (
            t('sidebar.noRallySelected')
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="p-4 bg-gray-800 space-y-6">
          {currentRally ? (
            <>
              {/* Available IDs - Unified View */}
              <div>
                <h3 className="text-md font-medium mb-3 text-white flex items-center gap-2">
                  🎯 {t('sidebar.availableIds')}
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">{availableIds.length}</span>
                </h3>
                
                {/* Show/Hide All Controls */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={showAllTracklets}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    <EyeIcon className="w-4 h-4" />
                    {t('ui.showAll')}
                  </button>
                  <button
                    onClick={hideAllTracklets}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    <EyeSlashIcon className="w-4 h-4" />
                    {t('ui.hideAll')}
                  </button>
                </div>
                {availableIds.length > 0 ? (
                  <div className="space-y-4">
                    {/* Ball ID - Special treatment at top */}
                    {availableIds.includes(99) && (
                      <div className="relative">
                        <button
                          onClick={() => handleSelectId(99)}
                          className={`w-full p-4 rounded-lg font-bold transition-all duration-200 border-2 flex items-center justify-center gap-3 ${
                            selectedTrackletId === 99
                              ? 'bg-orange-600 text-white border-orange-400 shadow-lg'
                              : 'bg-orange-900/30 hover:bg-orange-800/40 text-orange-300 border-orange-600/50'
                          }`}
                        >
                          <span className="text-2xl">⚽</span>
                          <span>Ball (ID: 99)</span>
                          {ballAnnotationMode && selectedTrackletId === 99 && (
                            <span className="text-xs bg-orange-700 px-2 py-1 rounded">ACTIVE</span>
                          )}
                        </button>
                        <button
                          onClick={() => setTrackletVisibility(99, !visibleTrackletIds.has(99))}
                          className={`absolute flex items-center justify-center top-2 left-2 w-6 h-6 rounded-full transition-colors ${
                            visibleTrackletIds.has(99) 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-500 text-gray-300'
                          }`}
                          title={visibleTrackletIds.has(99) ? 'Hide ball annotations' : 'Show ball annotations'}
                        >
                          {visibleTrackletIds.has(99) ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            const shouldDelete = await showConfirm(t('dialogs.deleteAllBallAnnotations'));
                            if (shouldDelete) {
                              deleteAllAnnotationsWithTrackletId(99);
                            }
                          }}
                          className="absolute flex items-center justify-center top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title={t('ui.deleteAllBallAnnotationsTitle')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* All Player IDs - Unified Grid */}
                    {availableIds.filter(id => id !== 99).length > 0 && (
                      <div>
                        <h4 className="text-sm text-gray-400 mb-3">{t('ui.playerIds')}:</h4>
                        <div 
                          className="grid gap-2 w-full"
                          style={{ 
                            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                            display: 'grid'
                          }}
                        >
                          {availableIds
                            .filter(id => id !== 99)
                            .sort((a, b) => a - b)
                            .map((id) => (
                              <div key={id} className="flex flex-col gap-1 w-full">
                                <div className="relative w-full">
                                  <button
                                    onClick={() => handleSelectId(id)}
                                    className={`w-full p-2 rounded-lg text-sm font-bold transition-all duration-200 border-2 relative flex items-center justify-center ${
                                      selectedTrackletId === id
                                        ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-500'
                                    }`}
                                    style={{ aspectRatio: '1' }}
                                    title={`Select tracklet ID ${id}`}
                                  >
                                    {id}
                                    <div 
                                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-gray-600"
                                      style={{ backgroundColor: getTrackletColor(id) }}
                                    ></div>
                                  </button>
                                  <button
                                    onClick={() => setTrackletVisibility(id, !visibleTrackletIds.has(id))}
                                    className={`absolute flex items-center justify-center -bottom-1 -left-1 w-5 h-5 rounded-full transition-colors z-10 ${
                                      visibleTrackletIds.has(id) 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-500 text-gray-300'
                                    }`}
                                    title={visibleTrackletIds.has(id) ? 'Hide bounding box' : 'Show bounding box'}
                                  >
                                    {visibleTrackletIds.has(id) ? (
                                      <EyeIcon className="w-3 h-3" />
                                    ) : (
                                      <EyeSlashIcon className="w-3 h-3" />
                                    )}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const shouldDelete = await showConfirm(t('dialogs.deleteAllTrackletAnnotations', { id }));
                                      if (shouldDelete) {
                                        deleteAllAnnotationsWithTrackletId(id);
                                      }
                                    }}
                                    className="absolute flex items-center justify-center -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors z-10"
                                    title={`Delete all annotations for tracklet ${id}`}
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                                <TimelineButton 
                                  trackletId={id} 
                                  variant="icon" 
                                  size="sm"
                                  className="flex-shrink-0 w-full"
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-6 bg-gray-800 rounded-lg">
                    <span className="text-2xl block mb-2">🔢</span>
                    {t('dialogs.noTrackletIdsAvailable')}
                  </div>
                )}
              </div>

              {/* Custom ID Input */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-white">{t('sidebar.customId')}</h3>
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {showCustomInput ? t('sidebar.cancel') : t('sidebar.addNew')}
                  </button>
                </div>
                
                {showCustomInput && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        value={customId}
                        onChange={(e) => setCustomId(e.target.value)}
                        placeholder={t('sidebar.enterId')}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                      />
                      <button
                        onClick={handleAddCustomId}
                        disabled={!customId || isNaN(parseInt(customId)) || parseInt(customId) <= 0}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                      >
                        {t('sidebar.add')}
                      </button>
                    </div>
                    <p className="text-xs text-orange-300 bg-orange-900/30 p-2 rounded">
                      {t('dialogs.ballAnnotationTip')}
                    </p>
                  </div>
                )}
              </div>

              {/* Selected ID Display */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-md font-medium mb-2 text-white">{t('sidebar.selectedId')}</h3>
                {selectedTrackletId !== null ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${selectedTrackletId === 99 ? 'text-orange-400' : 'text-blue-400'}`}>
                          {selectedTrackletId}
                        </span>
                        {selectedTrackletId === 99 && (
                          <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded font-medium">
                            ⚽ BALL
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // Disable ball annotation mode when clearing tracklet ID 99
                          if (selectedTrackletId === 99) {
                            setBallAnnotationMode(false);
                          }
                          setSelectedTrackletId(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        {t('sidebar.clear')}
                      </button>
                    </div>
                    
                    {selectedTrackletId === 99 && ballAnnotationMode && (
                      <div className="text-xs text-orange-300 bg-orange-900/30 p-2 rounded">
                        {t('dialogs.ballAnnotationModeActiveCanvas')}
                      </div>
                    )}
                    <TimelineButton 
                      trackletId={selectedTrackletId} 
                      variant="primary" 
                      size="md"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {t('sidebar.noIdSelected')}
                  </div>
                )}
              </div>

              {/* Event Annotation */}
              <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-md font-medium mb-3 text-white">{t('eventAnnotation.title')}</h3>
                <div className="space-y-3">
                  {/* Sport Selection */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Sport</label>
                    <select
                      value={selectedSport}
                      onChange={(e) => {
                        setSelectedSport(e.target.value);
                        setSelectedEvent(''); // Clear selected event when changing sports
                      }}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="volleyball">Volleyball</option>
                      <option value="tennis">Tennis</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">{t('eventAnnotation.selectEventType')}</label>
                    <div className="grid grid-cols-3 gap-2">
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
                    {t('eventAnnotation.clearSelection')}
                  </button>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>
                      {selectedEvent ? (
                        <>🎯 <strong className="text-white">{selectedEvent.toUpperCase()}</strong> {t('eventAnnotation.modeActive')}</>
                      ) : (
                        <>⚡ {t('eventAnnotation.selectFirst')}</>
                      )}
                    </p>
                    <p>• {t('eventAnnotation.hotkeyTip')}</p>
                    <p>• {t('ui.eventsApplyCurrentFrame')}</p>
                  </div>
                </div>
              </div>

              {/* Rally Events List */}
              <div className="mt-6">
                <button
                  onClick={() => setIsEventsModalOpen(true)}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {t('events.view_rally_events')} ({annotations.filter(ann => ann.event && ann.event.trim() !== '').length})
                </button>
              </div>


              {/* Annotation Details Editor */}
              <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-white">{t('annotationDetails.title')}</h3>
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
                    {showAnnotationEditor ? t('annotationDetails.close') : t('annotationDetails.editDetails')}
                  </button>
                </div>
                
                {selectedBoundingBox ? (
                  showAnnotationEditor ? (
                    <div className="space-y-3">
                      {/* Role */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('annotationDetails.role')}</label>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          placeholder={t('annotationDetails.rolePlaceholder')}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      
                      {/* Jersey Number */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('annotationDetails.jerseyNumber')}</label>
                        <input
                          type="text"
                          value={editJerseyNumber}
                          onChange={(e) => setEditJerseyNumber(e.target.value)}
                          placeholder={t('annotationDetails.jerseyNumberPlaceholder')}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      
                      {/* Jersey Color */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('annotationDetails.jerseyColor')}</label>
                        <div className="space-y-2">
                          <select
                            value={editJerseyColor}
                            onChange={(e) => {
                              setEditJerseyColor(e.target.value);
                              setShowCustomColor(e.target.value === 'custom');
                            }}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            <option value="">{t('annotationDetails.selectColor')}</option>
                            <option value="red">{t('colors.red')}</option>
                            <option value="blue">{t('colors.blue')}</option>
                            <option value="white">{t('colors.white')}</option>
                            <option value="black">{t('colors.black')}</option>
                            <option value="yellow">{t('colors.yellow')}</option>
                            <option value="green">{t('colors.green')}</option>
                            <option value="orange">{t('colors.orange')}</option>
                            <option value="purple">{t('colors.purple')}</option>
                            <option value="custom">{t('annotationDetails.customColor')}</option>
                          </select>
                          
                          {showCustomColor && (
                            <input
                              type="text"
                              value={customJerseyColor}
                              onChange={(e) => {
                                setCustomJerseyColor(e.target.value);
                                setEditJerseyColor(e.target.value);
                              }}
                              placeholder={t('annotationDetails.enterCustomColor')}
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Team */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('annotationDetails.team')}</label>
                        <select
                          value={editTeam}
                          onChange={(e) => setEditTeam(e.target.value)}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="">{t('annotationDetails.selectTeam')}</option>
                          <option value="0">{t('annotationDetails.homeTeam')}</option>
                          <option value="1">{t('annotationDetails.awayTeam')}</option>
                          <option value="-1">{t('annotationDetails.others')}</option>
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
                        {t('annotationDetails.saveDetails')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {t('annotationDetails.clickEditToModify')}
                    </p>
                  )
                ) : (
                  <p className="text-xs text-gray-400">
                    {t('annotationDetails.selectBoxToEdit')}
                  </p>
                )}
              </div>

              {/* ID Analysis */}
              <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-white">{t('idAnalysis.title')}</h3>
                  <div className="flex gap-2">
                    {!showAnalysis ? (
                      <button
                        onClick={analyzeTrackletIDs}
                        disabled={isAnalyzing || annotations.length === 0}
                        className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded transition-colors"
                      >
                        {isAnalyzing ? t('idAnalysis.analyzing') : t('idAnalysis.analyze')}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAnalysis(false)}
                        className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors mr-2"
                      >
                        {t('idAnalysis.hide')}
                      </button>
                    )}
                    {idAnalysisResult && (
                      <button
                        onClick={clearAnalysis}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        {t('dialogs.clearAnalysis')}
                      </button>
                    )}
                  </div>
                </div>
                
                {showAnalysis && idAnalysisResult ? (
                  <div className="space-y-4">
                    {/* Overall Statistics */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-lg font-bold text-blue-400">{idAnalysisResult.totalTracklets}</div>
                        <div className="text-xs text-gray-400">{t('idAnalysis.totalTracklets')}</div>
                      </div>
                      <div className="bg-gray-800 rounded p-3">
                        <div className={`text-lg font-bold ${idAnalysisResult.problematicTracklets === 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {idAnalysisResult.problematicTracklets}
                        </div>
                        <div className="text-xs text-gray-400">{t('idAnalysis.problematicTracklets')}</div>
                      </div>
                      <div className="bg-gray-800 rounded p-3">
                        <div className={`text-lg font-bold ${idAnalysisResult.overallScore > 0.8 ? 'text-green-400' : idAnalysisResult.overallScore > 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(idAnalysisResult.overallScore * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">{t('idAnalysis.overallScore')}</div>
                      </div>
                    </div>
                    
                    {/* Tracklet Details */}
                    {idAnalysisResult.problematicTracklets > 0 ? (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2">{t('idAnalysis.trackletDetails')}</h4>
                        <div className="space-y-2">
                          {idAnalysisResult.tracklets
                            .filter(t => t.suspectedSwitching || t.missingFrames.length > 0 || t.colorConsistency < 0.7)
                            .map((tracklet) => {
                              const getQualityColor = (analysis: typeof tracklet): string => {
                                if (analysis.suspectedSwitching) return '#ef4444'; // red
                                if (analysis.missingFrames.length > 0) return '#f97316'; // orange
                                if (analysis.colorConsistency < 0.7) return '#eab308'; // yellow
                                return '#22c55e'; // green
                              };
                              
                              const getTrackletStatus = (analysis: typeof tracklet): string => {
                                if (analysis.suspectedSwitching) return t('idAnalysis.status.suspectedSwitching');
                                if (analysis.missingFrames.length > analysis.totalFrames * 0.3) return t('idAnalysis.status.manyMissingFrames');
                                if (analysis.missingFrames.length > 0) return t('idAnalysis.status.someMissingFrames');
                                if (analysis.colorConsistency < 0.7) return t('idAnalysis.status.inconsistentColors');
                                return t('idAnalysis.status.good');
                              };
                              
                              return (
                                <div key={tracklet.trackletId} className="bg-gray-800 rounded p-3 border-l-4" style={{ borderLeftColor: getQualityColor(tracklet) }}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-white">ID {tracklet.trackletId}</span>
                                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: getQualityColor(tracklet), color: 'white' }}>
                                      {getTrackletStatus(tracklet)}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                    <div>{t('idAnalysis.details.frames')}: {tracklet.firstFrame}-{tracklet.lastFrame}</div>
                                    <div>{t('idAnalysis.details.missing')}: {tracklet.missingFrames.length}</div>
                                    <div>{t('idAnalysis.details.gaps')}: {tracklet.continuityGaps}</div>
                                    <div></div> {/* Empty slot to maintain grid layout */}
                                  </div>
                                  {tracklet.dominantColors.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs text-gray-400 mb-1">{t('ui.sampledColors')}:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {tracklet.dominantColors.slice(0, 8).map((colorData, idx) => (
                                          <div
                                            key={idx}
                                            className="w-4 h-4 rounded border border-gray-600"
                                            style={{ 
                                              backgroundColor: `rgb(${colorData.color.r}, ${colorData.color.g}, ${colorData.color.b})` 
                                            }}
                                            title={`Frame ${colorData.frame}: rgb(${colorData.color.r}, ${colorData.color.g}, ${colorData.color.b}) - ${Math.round(colorData.confidence * 100)}%`}
                                          ></div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {tracklet.missingFrames.length > 0 && tracklet.missingFrames.length <= 10 && (
                                    <div className="mt-2 text-xs text-yellow-400">
                                      {t('dialogs.missingFramesLabel')}: {tracklet.missingFrames.join(', ')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-green-400 py-4">
                        <div className="text-2xl mb-2">✓</div>
                        <div className="text-sm">{t('idAnalysis.noIssues')}</div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 italic">
                      {t('idAnalysis.help')}
                    </div>
                  </div>
                ) : !showAnalysis && idAnalysisResult ? (
                  <div className="text-center">
                    <button
                      onClick={() => setShowAnalysis(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t('idAnalysis.show')}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    {t('idAnalysis.noAnalysis')}
                  </div>
                )}
              </div>

              {/* Detailed Instructions */}
              <div className="mt-6 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium mb-3 text-white">{t('instructions.howToUse')}</h4>
                <div className="space-y-4 text-xs text-gray-400">
                  
                  {/* Navigation */}
                  <div>
                    <h5 className="text-white font-medium mb-2">🎯 {t('instructions.navigation.title')}</h5>
                    <ul className="space-y-1">
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">Z</kbd> / <kbd className="bg-gray-700 px-1 rounded text-xs">X</kbd> - {t('instructions.navigation.prevNext')}</li>
                      <li>• {t('instructions.navigation.jumpFrame')}</li>
                      <li>• {t('instructions.navigation.zoom')}</li>
                      <li>• {t('instructions.navigation.pan')}</li>
                    </ul>
                  </div>

                  {/* Drawing & Assigning */}
                  <div>
                    <h5 className="text-white font-medium mb-2">✏️ {t('instructions.drawing.title')}</h5>
                    <ul className="space-y-1">
                      <li>• {t('instructions.drawing.selectId')}</li>
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">D</kbd> - {t('instructions.drawing.drawingMode')}</li>
                      <li>• <kbd className="bg-gray-700 px-1 rounded text-xs">A</kbd> - {t('instructions.drawing.assignMode')}</li>
                      <li>• {t('instructions.drawing.drawMode')}</li>
                      <li>• {t('instructions.drawing.assignModeDesc')}</li>
                    </ul>
                  </div>

                  {/* Ball Annotation */}
                  <div>
                    <h5 className="text-white font-medium mb-2">⚽ {t('instructions.ball.title')}</h5>
                    <ul className="space-y-1">
                      <li>• {t('instructions.ball.ballMode')}</li>
                      <li>• {t('instructions.ball.ballClick')}</li>
                      <li>• {t('instructions.ball.ballEvent')}</li>
                      <li>• {t('instructions.ball.ballDelete')}</li>
                    </ul>
                  </div>

                  {/* Editing */}
                  <div>
                    <h5 className="text-white font-medium mb-2">📝 {t('instructions.editing.title')}</h5>
                    <ul className="space-y-1">
                      <li>• {t('instructions.editing.selectBox')}</li>
                      <li>• {t('instructions.editing.editDetails')}</li>
                      <li>• {t('instructions.editing.eventAnnotation')}</li>
                      <li>• {t('instructions.editing.eventHotkeys')}</li>
                      <li>• {t('instructions.editing.events')}</li>
                      <li>• {t('instructions.editing.delete')}</li>
                    </ul>
                  </div>

                  {/* Visibility Controls */}
                  <div>
                    <h5 className="text-white font-medium mb-2">👁️ {t('instructions.visibility.title')}</h5>
                    <ul className="space-y-1">
                      <li>• {t('instructions.visibility.trackletToggle')}</li>
                      <li>• {t('instructions.visibility.labelToggle')}</li>
                      <li>• {t('instructions.visibility.showAll')}</li>
                      <li>• {t('instructions.visibility.ballToggle')}</li>
                    </ul>
                  </div>

                  {/* File Management */}
                  <div>
                    <h5 className="text-white font-medium mb-2">💾 {t('instructions.fileManagement.title')}</h5>
                    <ul className="space-y-1">
                      <li>• {t('instructions.fileManagement.autoSave')}</li>
                      <li>• {t('instructions.fileManagement.csvSupport')}</li>
                      <li>• {t('instructions.fileManagement.switchRallies')}</li>
                      <li>• {t('instructions.fileManagement.dataPreserved')}</li>
                    </ul>
                  </div>

                  {/* Visual Cues */}
                  <div>
                    <h5 className="text-white font-medium mb-2">🎨 {t('instructions.visualCues.title')}</h5>
                    <ul className="space-y-1">
                      {/* <li>• {t('instructions.visualCues.uniqueColors')}</li> */}
                      <li>• {t('instructions.visualCues.selectedBoxes')}</li>
                      {/* <li>• {t('instructions.visualCues.currentMode')}</li> */}
                      <li>• {t('instructions.visualCues.zoomLevel')}</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Quick Tips */}
              <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-blue-200">💡 {t('quickTips.title')}</h4>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• {t('quickTips.workflow')}</li>
                  <li>• {t('quickTips.zoomIn')}</li>
                  <li>• {t('quickTips.consistency')}</li>
                  <li>• {t('quickTips.useHotkeys')}</li>
                  <li>• {t('quickTips.ballTracking')}</li>
                  <li>• {t('quickTips.timeline')}</li>
                  <li>• {t('quickTips.visibility')}</li>
                  <li>• {t('quickTips.eventsPerFrame')}</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🏃‍♂️</div>
              <div className="text-lg font-medium mb-1 text-gray-300">{t('sidebar.noRallySelected')}</div>
              <div className="text-xs text-gray-400">
                {t('sidebar.useDirectoryTree')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rally Events Modal */}
      <RallyEventsModal
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        eventTypes={eventTypes}
      />
    </div>
  );
}
