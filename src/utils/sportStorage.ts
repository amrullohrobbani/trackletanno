// Utility functions for managing sport preferences and hotkey configurations using localStorage

export interface HotkeyConfig {
  [eventName: string]: string;
}

const STORAGE_KEYS = {
  SELECTED_SPORT: 'trackletanno_selected_sport',
  VOLLEYBALL_HOTKEYS: 'trackletanno_volleyball_hotkeys',
  TENNIS_HOTKEYS: 'trackletanno_tennis_hotkeys',
};

// Default hotkey configurations
export const DEFAULT_VOLLEYBALL_HOTKEYS: HotkeyConfig = {
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

export const DEFAULT_TENNIS_HOTKEYS: HotkeyConfig = {
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

/**
 * Save selected sport to localStorage
 */
export function saveSelectedSport(sport: 'volleyball' | 'tennis'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SPORT, sport);
  } catch (error) {
    console.error('Error saving selected sport:', error);
  }
}

/**
 * Load selected sport from localStorage
 */
export function loadSelectedSport(): 'volleyball' | 'tennis' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_SPORT);
    return (saved === 'volleyball' || saved === 'tennis') ? saved : 'volleyball';
  } catch (error) {
    console.error('Error loading selected sport:', error);
    return 'volleyball';
  }
}

/**
 * Save hotkey configuration for a specific sport
 */
export function saveHotkeyConfig(sport: 'volleyball' | 'tennis', config: HotkeyConfig): void {
  try {
    const key = sport === 'volleyball' 
      ? STORAGE_KEYS.VOLLEYBALL_HOTKEYS 
      : STORAGE_KEYS.TENNIS_HOTKEYS;
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.error(`Error saving ${sport} hotkey config:`, error);
  }
}

/**
 * Load hotkey configuration for a specific sport
 */
export function loadHotkeyConfig(sport: 'volleyball' | 'tennis'): HotkeyConfig {
  try {
    const key = sport === 'volleyball' 
      ? STORAGE_KEYS.VOLLEYBALL_HOTKEYS 
      : STORAGE_KEYS.TENNIS_HOTKEYS;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      const config = JSON.parse(saved);
      // Validate that it's a valid config object
      if (typeof config === 'object' && config !== null) {
        return config;
      }
    }
  } catch (error) {
    console.error(`Error loading ${sport} hotkey config:`, error);
  }
  
  // Return default if no saved config or error
  return sport === 'volleyball' 
    ? DEFAULT_VOLLEYBALL_HOTKEYS 
    : DEFAULT_TENNIS_HOTKEYS;
}

/**
 * Reset hotkey configuration to defaults for a specific sport
 */
export function resetHotkeyConfig(sport: 'volleyball' | 'tennis'): HotkeyConfig {
  const defaultConfig = sport === 'volleyball' 
    ? DEFAULT_VOLLEYBALL_HOTKEYS 
    : DEFAULT_TENNIS_HOTKEYS;
  saveHotkeyConfig(sport, defaultConfig);
  return defaultConfig;
}

/**
 * Get all storage keys for debugging/export
 */
export function getAllStorageData() {
  return {
    selectedSport: loadSelectedSport(),
    volleyballHotkeys: loadHotkeyConfig('volleyball'),
    tennisHotkeys: loadHotkeyConfig('tennis')
  };
}

/**
 * Clear all sport-related localStorage data
 */
export function clearAllSportData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing sport data:', error);
  }
}
