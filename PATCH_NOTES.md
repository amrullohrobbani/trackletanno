# Tracklet Annotation Tool - Patch Notes

## Version 1.4.2 - Current Release
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
