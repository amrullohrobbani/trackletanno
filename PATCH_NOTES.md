# Tracklet Annotation Tool - Patch Notes

## Version 1.6.2 - Current Release
*Release Date: October 29, 2025*

### 🖼️ Field Registration Overlay Fix for Packaged Apps

#### Fixed Electron Export Issue
- **Volleyball Court Overlay**: Field registration overlay now displays correctly in packaged Linux and Windows apps
  - Added dedicated IPC handler `get-volleyball-court-image` for secure image loading
  - Enhanced fallback system for both development and production environments
  - Fixed file protocol URL generation for cross-platform compatibility

#### Enhanced Resource Management
- **Multi-Path Resolution**: Robust path detection for volleyball court template image
  - Checks multiple locations: `public/`, `out/`, `resources/` directories
  - Automatic fallback to development URL when running in dev mode
  - Improved error handling and logging for debugging

#### Build Configuration Updates
- **Electron-Builder Enhancement**: Updated package configuration to ensure volleyball court image inclusion
  - Added explicit file inclusion for `public/volleyball_color.png`
  - Added extraResources configuration for reliable resource packaging
  - Cross-platform file path handling for Windows and Linux builds

#### Technical Improvements
- **IPC Integration**: Volleyball court image loading now uses secure Electron IPC communication
- **Development Compatibility**: Maintains backward compatibility with Next.js development server
- **Error Handling**: Enhanced error messages and fallback mechanisms

---

## Version 1.6.1 - Previous Release
*Release Date: October 29, 2025*

### 🛡️ File Renaming Safety Enhancement

#### Enhanced Safety Logic
- **Conservative File Renaming**: System now only renames files if ALL images have non-digit names
  - Previous: Renamed ALL files if ANY file had non-digit name
  - New: Only renames if ALL files need renaming (safety first approach)
  - Prevents accidental renaming of properly named files

#### Improved Validation & Logging
- **Detailed Logging**: Better visibility into renaming decisions
  - Shows count of digit vs non-digit files
  - Lists examples of non-digit files when preserving original names
  - Clear console messages explaining why files were/weren't renamed

#### Usage Impact
- **Mixed Naming Protection**: If folder has both `001.jpg` and `IMG_001.jpg`, preserves all original names
- **Batch Renaming**: Only when folder has files like `IMG_001.jpg`, `photo_002.jpg` (all non-digit)
- **Data Safety**: Prevents loss of carefully crafted filename conventions

---

## Version 1.6.0 - Previous Release
*Release Date: October 29, 2025*

### 🏐 Field Registration System

#### New Field Registration Mode
- **Court Overlay System**: Interactive volleyball court mapping with perspective transformation
- **10-Point Keypoint System**: 4 corner points + 6 intermediate points for accurate court geometry
- **Off-Canvas Placement**: Place keypoints outside visible area for better perspective correction
- **Real-time Visual Feedback**: Color-coded keypoints (gold corners, green intermediate points)

#### Smart Keypoint Management
- **Automatic Line Alignment**: Moving corners automatically adjusts intermediate points
- **Straight Line Guarantee**: Corner-to-corner lines remain mathematically straight
- **Default Matrix**: Starts with realistic court positioning from real dataset data
- **Drag & Drop**: Click and drag keypoints for precise positioning

#### Enhanced File Loading
- **Multiple Formats**: Supports both padded (`009550.npy`) and unpadded (`9550.npy`) frame numbers
- **Robust Fallback**: 4-tier system handles different dataset naming conventions
- **Homography-Only Mode**: Works even when coordinate files are missing

### 🔧 Technical Improvements
- **Off-Canvas Coordinates**: Updated coordinate system to allow keypoints beyond canvas boundaries
- **Enhanced IPC**: Improved Electron file loading with better error handling
- **Store Integration**: New field registration state management functions
- **Default Homography**: Hardcoded realistic matrix from dataset `226s3rally0249570/9590.npy`

### 🎮 User Experience
- **Clean Interface**: Professional appearance without debugging clutter
- **Mode Indicators**: Clear status showing keypoint count and current action
- **Intuitive Controls**: ESC to exit, click to place, drag to adjust
- **Hover Effects**: Visual feedback for better interaction

### 📊 Usage
1. Enter Field Registration Mode via left sidebar
2. System loads with default court positioning
3. Click to place/select keypoints (up to 10)
4. Drag keypoints to match court boundaries
5. Place corner points off-screen if needed for perspective

---

## Version 1.5.0 - Previous Release
*Release Date: October 20, 2025*

### 🎯 New Features

#### Sport Selection Persistence
- **Automatic Sport Memory**: Application now remembers your last selected sport (volleyball/tennis)
  - Sport preference saved to browser localStorage
  - Automatically restores your sport selection when reopening the app
  - No need to manually select your sport every session
  - Seamless workflow continuation across app restarts

#### Customizable Hotkey System
- **Per-Sport Hotkey Configuration**: Configure custom keyboard shortcuts for each sport independently
  - Click "⌨️ Configure Hotkeys" button in right sidebar to open configuration modal
  - Customize hotkeys for all event types per sport (volleyball and tennis have separate configs)
  - Real-time validation prevents duplicate key assignments
  - Visual indicators show which keys are modified from defaults
  - Individual reset buttons to restore default hotkey for specific events
  - Bulk "Reset All to Defaults" button for complete hotkey reset

#### Hotkey Configuration Modal Features
- **Intuitive Interface**: User-friendly modal for hotkey customization
  - Click on any hotkey field to set a new key
  - Type a single character (a-z, 0-9) to assign new hotkey
  - Duplicate key detection with conflict highlighting
  - Shows conflicting event name when duplicate detected
  - Modified keys highlighted with blue border for easy identification
  - Sport-specific configuration tabs (volleyball/tennis)

#### Data Persistence
- **localStorage Integration**: All preferences stored locally
  - Sport selection persists across sessions
  - Custom hotkeys saved per sport
  - Data survives app restarts and updates
  - Simple API for easy maintenance

### 🔧 Technical Improvements

#### New Components & Utilities
- **HotkeyConfigModal.tsx**: Full-featured hotkey configuration interface (250+ lines)
  - Real-time keyboard input handling
  - Duplicate detection with visual feedback
  - Individual and bulk reset functionality
  - Type-safe implementation with TypeScript

- **sportStorage.ts**: Centralized localStorage management utility
  - `saveSelectedSport()` / `loadSelectedSport()`: Sport preference persistence
  - `saveHotkeyConfig()` / `loadHotkeyConfig()`: Hotkey configuration persistence
  - `resetHotkeyConfig()`: Restore default hotkeys for a sport
  - `clearAllSportData()`: Clear all stored preferences
  - Default configurations: `DEFAULT_VOLLEYBALL_HOTKEYS` and `DEFAULT_TENNIS_HOTKEYS`

#### Enhanced Right Sidebar
- **Dynamic Hotkey Loading**: Hotkeys now load from localStorage on mount
  - useEffect hooks for automatic load/save operations
  - useMemo for efficient hotkey computation
  - Type-safe sport selection with proper TypeScript casting
  - Integration with existing event annotation system

#### Internationalization
- **Multi-language Support**: Full translation support for volleyball and tennis events
  - English and Korean translations for all event types
  - Volleyball events: underhand_serve, overhand_serve, receive, dig, pass, set, spike, block, kill, net, no_event
  - Tennis events: serve, forehand, backhand, overhead, smash, volley, net, bounce, no_event
  - Seamless language switching with existing i18n system

### 🎮 Usage Instructions

#### Changing Sport Selection
1. Right sidebar → Sport dropdown
2. Select "Volleyball" or "Tennis"
3. Selection automatically saved to localStorage
4. Next time you open the app, your sport selection is restored

#### Configuring Custom Hotkeys
1. Right sidebar → Click "⌨️ Configure Hotkeys" button
2. Modal opens showing current hotkey configuration
3. Click on any hotkey field (shows current key)
4. Press a new key (a-z, 0-9) to assign
5. If key is already used, conflict warning appears with event name
6. Click "Reset" next to individual event to restore default
7. Click "Reset All to Defaults" to restore all hotkeys
8. Click "Save" to apply changes (saved to localStorage)
9. Click "Cancel" to discard changes

#### Hotkey Validation Rules
- Only single characters allowed (a-z, 0-9)
- Each key can only be assigned once per sport
- Duplicate assignments show error with conflicting event name
- Modified keys highlighted with blue border
- Save button disabled if validation errors exist

### 📦 Default Hotkey Configurations

#### Volleyball Events
- `q`: Underhand Serve
- `w`: Overhand Serve
- `e`: Receive
- `r`: Dig
- `t`: Pass
- `y`: Set
- `u`: Spike
- `i`: Block
- `o`: Kill
- `p`: Net
- `n`: No Event

#### Tennis Events
- `w`: Serve
- `e`: Forehand
- `r`: Backhand
- `t`: Overhead
- `y`: Smash
- `u`: Volley
- `i`: Net
- `q`: Bounce
- `n`: No Event

### 🔍 Technical Details

#### localStorage Structure
```json
{
  "matchtagger_selected_sport": "volleyball" | "tennis",
  "matchtagger_volleyball_hotkeys": {
    "underhand_serve": "q",
    "overhand_serve": "w",
    ...
  },
  "matchtagger_tennis_hotkeys": {
    "serve": "w",
    "forehand": "e",
    ...
  }
}
```

#### Key Benefits of localStorage
- **Larger Storage**: 5-10MB capacity vs cookies' 4KB limit
- **Desktop Optimization**: Perfect for Electron apps (no HTTP overhead)
- **Simpler API**: Easier to work with than cookies
- **Better Performance**: Synchronous access, no network requests
- **Data Persistence**: Survives app restarts and updates

### 📚 Documentation
- **Comprehensive Guide**: New documentation file `docs/sport-hotkey-persistence.md`
  - Feature descriptions and use cases
  - API reference for all functions
  - Default configurations documented
  - Testing checklist for validation
  - Future enhancement suggestions

### 🎨 User Experience Impact
- **Workflow Continuity**: No need to reconfigure sport selection each session
- **Personalization**: Customize hotkeys to match your muscle memory
- **Efficiency**: Faster annotation with personalized keyboard shortcuts
- **Flexibility**: Different hotkey sets for volleyball vs tennis workflows
- **Visual Feedback**: Clear indicators for modified settings and conflicts

---

## Version 1.4.3
*Release Date: September 30, 2025*

### 🎨 Left Sidebar Navigation Improvements

#### Enhanced Directory Navigation
- **Sticky Directory Header**: Rally Datasets header now stays fixed when scrolling reaches the top
  - Directory header remains accessible while browsing long lists
  - Seamless transition from scrollable to fixed positioning
  - Maintains clean layout without sacrificing functionality

#### Improved Directory Scrolling
- **Custom Directory Scrollbar**: Enhanced scrollbar specifically for directory tree navigation
  - More visible 10px wide scrollbar with contrasting colors
  - Easy grab-and-scroll functionality for quick navigation
  - Hover effects for better user feedback
  - Optimized for jumping to end of long directory lists

#### Layout Optimizations
- **Flexible Content Areas**: Better space utilization in left sidebar
  - Frame navigation and annotation controls in upper scrollable section
  - Directory content takes remaining space with independent scrolling
  - Responsive layout adapts to different content sizes

#### Annotation Synchronization
- **Ball Annotation Sync**: Improved synchronization of ball annotations with frame loading
  - Ball annotations now appear instantly with frame changes
  - No lag or delay when navigating between frames
  - Consistent rendering performance across all annotation types

### 🎮 User Experience Impact
- Directory navigation feels more responsive and intuitive
- No more losing track of directory header when scrolling
- Quick access to any part of long directory structures
- Smoother overall workflow for annotation tasks

---

## Version 1.4.2
*Release Date: September 24, 2025*

### 🚀 Performance & User Experience Improvements

#### Faster Image Loading System
- **File Protocol Implementation**: Replaced base64 image encoding with custom `local-file://` protocol
  - Significantly faster image loading and reduced memory usage
  - Browser caching enabled for better performance on revisited frames
  - Cross-platform compatibility (Windows, Linux, macOS)

#### Smooth Frame Navigation
- **Anti-Flicker System**: Images no longer blink when switching frames
  - Previous frame stays visible while next frame loads
  - Seamless transitions between frames
  - Subtle loading indicator during frame changes

#### Technical Improvements
- **Electron Protocol Handler**: Custom file protocol for secure local file access
- **Dual Image Buffer**: Current and next image states prevent visual interruptions
- **Smart Loading States**: Full loading screen only for initial loads, minimal indicators for transitions

### 🎮 User Impact
- Frame navigation (Z/X keys) feels much smoother and faster
- No more flickering or blank screens between frames
- Reduced memory usage and faster performance overall
- Better caching means revisiting frames loads instantly

---

## Version 1.4.1
*Release Date: September 24, 2025*

### � Bug Fixes
- **Frame Index Resolution**: Enhanced frame-to-filename mapping for better compatibility
- **Auto-Conversion Feature**: Improved detection of images that need frame number conversion
- **Duplicate Operation**: Fixed frame index handling in Advanced Tracklet Modal

---

## Version 1.4.0
*Release Date: September 22, 2025*

### 🎯 New Features
- **Event Delete Functionality**: Added delete button for individual events in Rally Events Modal
- **Enhanced Navigation System**: 15-frame buffer for ultra-smooth navigation
- **Improved Rally Events Modal**: Clean layout with event management capabilities

---

## Version 1.3.1
*Release Date: September 13, 2025*

### 🎯 Updates
- **Secure File Access**: Uses Electron IPC for enhanced security
- **Enhanced Error Handling**: Better fallback mechanisms and error reporting
- **Type Safety**: Full TypeScript support for all functionality

---

## Version 1.3.0
*Release Date: September 11, 2025*

### 🎯 New Features
- **Enhanced Patch Notes Modal**: Improved UI with better UX
- **Dynamic Patch Notes Loading**: Loads directly from PATCH_NOTES.md file
- **Annotation Duplication Feature**: Duplicate annotations to multiple frames
- **Tennis Event System**: Tennis-specific event annotations
- **Timeline and Tracklet Features**: Enhanced annotation management
*Release Date: September 24, 2025*

### 🚀 Performance Improvements

#### Image Loading System Overhaul
- **Reverted to Simple Image Loading**: Removed complex frame buffering system that was causing slower image loading
  - Eliminated 15-frame buffer system that was preloading 30+ frames simultaneously
  - Removed `frameBuffer`, `bufferSize`, `isBuffering`, `loadFrameBuffer`, `clearFrameBuffer`, `isFrameBuffered`, and `getBufferedFrame` from store
  - Simplified MainCanvas image loading to load images on-demand only
  - Removed preloading logic for adjacent frames

#### User Experience Enhancements  
- **Faster Frame Navigation**: Images now load directly when needed instead of waiting for buffer operations
- **Reduced Memory Usage**: No longer caching multiple frames in memory simultaneously
- **Simplified Architecture**: Cleaner, more maintainable codebase without complex buffer management

#### Technical Changes
- **MainCanvas Simplification**: 
  - Removed all frame buffer checks and preloading logic
  - Streamlined `loadImage()` function to use direct `window.electronAPI.getImageData()` calls
  - Eliminated animation frame preloading system
  - Removed buffering status indicator from UI

- **Store Cleanup**:
  - Removed frame buffer related state and functions
  - Simplified navigation functions (`nextFrame`, `previousFrame`)
  - Removed buffer clearing when changing directories or rallies

### 🎮 Usage Impact
- Frame navigation (Z/X keys) now loads images on-demand for faster response
- Initial frame loading is more responsive without buffer initialization delays
- Memory usage is significantly reduced during extended annotation sessions

---

## Version 1.4.1
*Release Date: September 24, 2025*
*Release Date: September 24, 2025*

### 🔧 Bug Fixes

#### Advanced Tracklet Modal - Duplicate Operation
- **Fixed Frame Index Handling**: Corrected duplicate operation to properly use frame indices instead of literal frame numbers
  - Added `convertFrameIndexToNumber()` helper function for consistent frame index to frame number conversion
  - Updated source frame lookup in `generatePreview`, `performOperation`, and `validateAndStartOperation` functions
  - Enhanced error handling with proper frame index validation
  - Improved UI labels to clarify frame index vs. literal frame number usage

#### User Interface Improvements
- **Updated Input Labels**: 
  - Changed "Source Frame" to "Source Frame Index" for clarity
  - Changed "Target Frame(s)" to "Target Frame Index(es)" for consistency
  - Added helpful placeholder text explaining frame indices vs. literal frame numbers

#### Technical Enhancements
- **Consistent Frame Handling**: Duplicate operation now follows the same frame indexing system as other operations
  - Frame index 1 = first image file, index 2 = second image file, etc.
  - Proper conversion to actual frame numbers from image filenames
  - Updated all dependency arrays to include new helper function

### 🎮 Usage Notes
- When using duplicate operation, enter frame indices (1, 2, 3...) rather than literal frame numbers from filenames
- This ensures consistency with frame range parsing throughout the application

---

## Version 1.4.0
*Release Date: September 22, 2025*
*Release Date: September 22, 2025*

### 🎯 New Features

#### Event Management Enhancements
- **Event Delete Functionality**: Added delete button for individual events in Rally Events Modal
  - Delete button (🗑️) appears next to each event in the events list
  - Confirmation dialog prevents accidental deletions
  - Deletes only the event annotation, preserves underlying bounding box and tracking data
  - Frame-specific deletion - only removes event from specific frame/tracklet combination
  - Automatic file saving ensures changes are immediately persisted

#### Enhanced User Interface
- **Improved Rally Events Modal**: 
  - Clean layout with event emoji and delete button side by side
  - Red hover highlight for delete button (`hover:text-red-400`)
  - Non-disruptive click handling prevents event navigation when deleting
  - Visual feedback and smooth interactions

### 🔧 Technical Improvements

#### Store Management
- **New Store Function**: `deleteEventFromAnnotation(frame, trackletId)`
  - Removes event property from specific annotation
  - Maintains data integrity by preserving all other annotation properties
  - Console feedback for successful deletions

#### Enhanced Navigation System
- **Buffer Size Optimization**: Confirmed 15-frame buffer for ultra-smooth navigation
  - 15 frames before and after current frame (31 frames total)
  - Smooth rapid Z/X key navigation with 50ms frame timing
  - Animation interruption for responsive consecutive keypresses

### 🎮 Usage Instructions

#### Event Deletion
1. Open Rally Events Modal from left sidebar
2. Locate the event you want to delete
3. Click the 🗑️ delete button next to the event
4. Confirm deletion in the dialog
5. Event is removed while preserving the annotation

#### Navigation
- **Z/X Keys**: Smooth frame-by-frame navigation with animation
- **Home/End Keys**: Instant jumps to first/last frame
- **Rapid Navigation**: Hold or rapidly press Z/X for smooth transitions

### 📦 Dependencies
- Maintained compatibility with existing codebase
- Uses Heroicons TrashIcon for delete button
- Integrated with existing Zustand store management

---

## Version 1.3.1 - Previous Release
*Release Date: September 13, 2025*

### 🎯 New Update
- **Secure File Access**: Uses Electron IPC instead of direct file system access for security
- **Enhanced Error Handling**: Proper fallback mechanisms and error reporting
- **Type Safety**: Full TypeScript support for all new functionality
- **User Experience**: More intuitive interfaces and better feedback
- **Documentation**: Comprehensive project documentation for future reference

### 🔧 Technical Improvements
- Add patch notes reading functionality
- Enhance duplicate operation with source frame selection

---

## Version 1.3.0 - Previous Release
*Release Date: September 11, 2025*

### 🎯 New Features
- **Enhanced Patch Notes Modal**: Increased max width to XL and hidden scrollbar for better UX
- **Dynamic Patch Notes Loading**: Patch notes now load directly from PATCH_NOTES.md file (single source of truth)
- **Annotation Duplication Feature**: Added ability to duplicate annotations to multiple frames
- **Tennis Event System**: Added tennis-specific event annotations with attributes
- Smooth frame navigation system
- Enhanced buffer management
- Timeline and tracklet features
