import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

interface HotkeyConfig {
  [eventName: string]: string;
}

interface HotkeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: 'volleyball' | 'tennis';
  onSave: (config: HotkeyConfig) => void;
  currentConfig: HotkeyConfig;
}

export default function HotkeyConfigModal({
  isOpen,
  onClose,
  sport,
  onSave,
  currentConfig
}: HotkeyConfigModalProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<HotkeyConfig>(currentConfig);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig, isOpen]);

  const defaultVolleyballConfig: HotkeyConfig = {
    'serve': 'q',
    'underhand_serve': 'w',
    'receive': 'e',
    'dig': 'r',
    'pass': 't',
    'set': 'y',
    'spike': 'u',
    'block': 'i',
    'score': 'o',
    'net': 'p',
    'no_event': 'n'
  };

  const defaultTennisConfig: HotkeyConfig = {
    'serve': 'w',
    'forehand': 'e',
    'backhand': 'r',
    'overhead': 't',
    'smash': 'y',
    'volley': 'u',
    'net': 'i',
    'bounce': 'q',
    'no_event': 'n'
  };

  const defaultConfig = sport === 'volleyball' ? defaultVolleyballConfig : defaultTennisConfig;

  const eventLabels: { [key: string]: string } = sport === 'volleyball' ? {
    'serve': t('events.serve'),
    'underhand_serve': t('events.underhand_serve'),
    'receive': t('events.receive'),
    'dig': t('events.dig'),
    'pass': t('events.pass'),
    'set': t('events.set'),
    'spike': t('events.spike'),
    'block': t('events.block'),
    'score': t('events.score'),
    'net': t('events.net'),
    'no_event': t('events.no_event')
  } : {
    'serve': t('events.tennis.serve'),
    'forehand': t('events.tennis.forehand'),
    'backhand': t('events.tennis.backhand'),
    'overhead': t('events.tennis.overhead'),
    'smash': t('events.tennis.smash'),
    'volley': t('events.tennis.volley'),
    'net': t('events.tennis.net'),
    'bounce': t('events.tennis.bounce'),
    'no_event': t('events.tennis.no_event')
  };

  const handleKeyPress = (eventName: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const key = e.key.toLowerCase();
    
    // Only allow single letter keys
    if (key.length !== 1 || !/[a-z0-9]/.test(key)) {
      setError('Please use single letter or number keys (a-z, 0-9)');
      return;
    }

    // Check for duplicates
    const duplicate = Object.entries(config).find(
      ([name, hotkey]) => hotkey === key && name !== eventName
    );

    if (duplicate) {
      setError(`Key "${key}" is already used by ${eventLabels[duplicate[0]]}`);
      return;
    }

    setError(null);
    setConfig(prev => ({ ...prev, [eventName]: key }));
    setEditingKey(null);
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            ⌨️ {sport === 'volleyball' ? 'Volleyball' : 'Tennis'} Hotkey Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded text-sm text-blue-200">
            <p className="font-medium mb-1">💡 How to configure:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Click on a hotkey input field</li>
              <li>Press the key you want to assign</li>
              <li>Keys must be unique (no duplicates)</li>
              <li>Only single letters (a-z) and numbers (0-9) are allowed</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-200">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-3">
            {Object.entries(config).map(([eventName, hotkey]) => (
              <div
                key={eventName}
                className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex-1">
                  <span className="text-white font-medium">{eventLabels[eventName]}</span>
                  <span className="text-gray-400 text-xs ml-2">({eventName})</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={hotkey.toUpperCase()}
                    onKeyDown={(e) => handleKeyPress(eventName, e)}
                    onFocus={() => setEditingKey(eventName)}
                    onBlur={() => setEditingKey(null)}
                    readOnly
                    placeholder="Press key..."
                    className={`w-16 text-center px-3 py-2 bg-gray-700 border-2 rounded text-white font-bold uppercase cursor-pointer transition-all ${
                      editingKey === eventName
                        ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  />
                  {config[eventName] !== defaultConfig[eventName] && (
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, [eventName]: defaultConfig[eventName] }))}
                      className="text-xs text-orange-400 hover:text-orange-300"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
          >
            🔄 Reset All to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              💾 Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
