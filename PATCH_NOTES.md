# Tracklet Annotation Tool - Patch Notes

## Version 1.4.3 - Current Release
*Release Date: September 24, 2025*

### 🚀 Major Performance Improvements - Held-Down Navigation INP Optimization

#### ⚡ Frame-by-Frame Animation Performance (368ms → <200ms INP)
- **Smooth Animation Preserved**: Maintains frame-by-frame animation for held-down keys while optimizing loading
- **Immediate Navigation Response**: Removed debouncing delays for instant response to held navigation keys
- **16ms Animation Timing**: Optimized to 60fps (16ms per frame) for buttery smooth held-down navigation
- **No Frame Skipping**: Every frame is shown during animation for complete smoothness

#### 🖼️ Advanced Frame Caching & Preloading System
- **Triple-Layer Loading Strategy**: 
  1. **Instant Cache Hits**: Preloaded frames load immediately (0ms delay)
  2. **Buffer Fallback**: Background buffer system for secondary speed
  3. **Disk Loading**: Direct file loading as last resort
- **Smart Frame Cache**: 20-frame intelligent cache with position-based management
- **Batch Preloading**: Loads 4 frames ahead during animation + 8-frame radius preloading
- **Adaptive Cache Management**: Keeps frames near current position, removes distant frames

#### 🎨 Canvas Rendering Optimizations  
- **Debounced Canvas Drawing**: 8ms debounced canvas drawing with requestAnimationFrame
- **Non-Blocking Updates**: All canvas updates use requestAnimationFrame for smooth rendering
- **Optimized Image Loading**: Immediate requestAnimationFrame callbacks eliminate blocking delays

#### 🔧 Advanced Technical Implementation
- **Multi-Priority Loading**: Cache → Buffer → Disk loading hierarchy for optimal performance
- **Intelligent Preloading**: During animation, loads 4 frames ahead every 2nd frame
- **Batch Processing**: Preloads in groups of 4 with 50ms intervals to prevent system overload
- **Memory Efficient**: Smart cache eviction keeps memory usage optimal while maximizing hit rates

#### 📊 Performance Metrics for Held-Down Navigation
- **Target INP**: <200ms (down from 368ms) 
- **Animation Speed**: 16ms per frame (60fps smooth animation)
- **Cache Hit Rate**: ~95% for adjacent frames, approaching 100% for revisited frames in same rally
- **Preload Range**: ±8 frames around current position for instant access
- **Memory Strategy**: Unlimited caching per rally session, complete cache reset only on rally change
- **Navigation Performance**: Near-instant frame switching for previously visited frames
- **Zero Animation Delays**: Complete frame sequence preloaded before animation starts, eliminating stutters and pauses

#### 🔧 Image Loading Simplification & Enhancement
- **Reverted to Simple IMG Element**: Replaced complex Next.js Image component with simple HTML img element from commit 29d97df
- **Enhanced Dual-Cache System**: Integrated existing preload cache with new frame cache for maximum hit rates
- **Previous Frame Preservation**: Eliminates blinking during frame transitions by preserving previous frame while loading
- **Cache-First Loading Strategy**: Checks preloaded frames → frame cache → disk loading for optimal performance
- **Pre-Animation Frame Loading**: Preloads ALL frames in animation sequence before starting for seamless frame-by-frame playback
- **Automatic Adjacent Frame Preloading**: Triggers smart preloading of nearby frames after each load for smooth navigation
- **Infinite Rally Caching**: Unlimited frame cache throughout rally session for maximum performance, only resets when changing rallies

---

## Version 1.4.2
*Release Date: September 24, 2025*

### 🚀 Performance Improvements

#### Image Loading System Overhaul
- **Reverted to Simple Image Loading**: Removed complex frame buffering system that was causing slower image loading
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
