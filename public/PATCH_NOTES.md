# Tracklet Annotation Tool - Patch Notes

## Version 1.3.0 - Current Release
*Release Date: September 11, 2025*

### 🎯 New Features
- **Enhanced Patch Notes Modal**: Increased max width to XL and hidden scrollbar for better UX
- **Dynamic Patch Notes Loading**: Patch notes now load directly from PATCH_NOTES.md file (single source of truth)
- **Annotation Duplication Feature**: Added ability to duplicate annotations to multiple frames
- **Tennis Event System**: Added tennis-specific event annotations with attributes
  - Events: forehand, backhand, serve, overhead, bounce, net
  - Attributes for forehand/backhand/serve/overhead: flat (default), drive, slice
  - Formatted as "event attribute" (e.g., "serve flat", "forehand slice")
- **Copyright Footer**: Added KIST Human Data Intelligence Lab copyright notice in footer
- **Improved Tracklet Selection**: Enhanced tracklet ID selection persistence after bounding box assignment

### 🐛 Bug Fixes
- **Windows Compatibility**: Fixed annotation display issues on Windows systems
  - Enhanced filename extraction to support both Windows and Unix path separators
  - Resolved path separator handling across multiple components
- **Scrollbar Visibility**: Hidden scrollbars in patch notes for cleaner appearance

### 🔧 Technical Improvements
- Single source of truth for patch notes documentation
- Enhanced Advanced Tracklet Modal with three operation types (merge, switch, duplicate)
- Tailwind CSS utility additions for scrollbar hiding
- Cross-platform path handling improvements

---

## Version 1.2.4 - Previous Release
*Release Date: September 7, 2025*

### 🎯 New Features
- **1-Based Frame Indexing**: Updated frame number handling to use 1-based indexing across the application
- **Improved Frame Input**: Enhanced frame number input handling in LeftSidebar
- **Custom Role Selection**: Added custom role selection and team positioning information in RightSidebar

### 🐛 Bug Fixes
- **Frame Number Logic**: Improved frame number extraction logic to handle NaN cases
- **Annotation Parsing**: Enhanced annotation parsing precision
- **Duplicate Removal**: Implemented duplicate annotation removal functionality

### 🔧 Technical Improvements
- Better localization for frame input prompts
- Enhanced tracklet information display in TrackletTimelineModal
- Improved annotation details localization

---

## Version 1.2.2 - Previous Release
*Release Date: August 2025*

### 🎯 New Features
- **Auto-Conversion Feature**: Implemented auto-conversion of old annotation formats to dual-file system on directory open
- **Enhanced Timeline Modal**: Updated tracklet information display in TrackletTimelineModal

### 🐛 Bug Fixes
- **Ball Annotation**: Streamlined ball annotation deletion logic
- **Annotation Details**: Fixed annotation details handling
- **Ball Import**: Fixed handle ball import and no_event issues

### 🔧 Technical Improvements
- Enhanced annotation preservation logic for tracklets and balls
- Improved annotation details function

---

## Version 1.1.3 - Major Update
*Release Date: July 2025*

### 🎯 New Features
- **Enhanced UI**: Added crosshair cursor on drawing mode
- **Dialog Improvements**: Enter key support for dialog confirmations and ball mode
- **Event Annotation**: Added event annotation system with bounding box integration

### 🐛 Bug Fixes
- **Selection Management**: Clear selection on deleting annotations
- **Dialog Width**: Fixed dialog width to respect content
- **Event Annotation**: Don't select bounding box when annotating events

### 🔧 Technical Improvements
- Better user interaction feedback
- Improved dialog system
- Enhanced annotation workflow

---

## Version 1.0.0 - Initial Release
*Release Date: June 2025*

### 🎯 New Features
- **Core Annotation System**: Basic tracklet annotation functionality
- **Canvas Interaction**: Draw and edit bounding boxes on video frames
- **File Management**: Load and save annotation data in CSV format
- **Rally Navigation**: Browse and annotate multiple rally sequences
- **Tracklet Management**: Assign and manage tracklet IDs

### 🔧 Technical Improvements
- Electron + Next.js architecture
- TypeScript implementation
- Zustand state management
- HTML5 Canvas rendering

### 🎯 New Features
- **Copyright Footer**: Added KIST Human Data Intelligence Lab copyright notice in footer
- **Patch Notes Modal**: Added accessible patch notes modal with version history
- **Improved Tracklet Selection**: Enhanced tracklet ID selection persistence after bounding box assignment
- **Tennis Event System**: Added tennis-specific event annotations with attributes
  - Events: forehand, backhand, serve, overhead, bounce, net
  - Attributes for forehand/backhand/serve/overhead: flat (default), drive, slice
  - Formatted as "event attribute" (e.g., "serve flat", "forehand slice")

### 🐛 Bug Fixes
- **Windows Compatibility**: Fixed annotation display issues on Windows systems
  - Resolved path separator handling (Windows `\` vs Unix `/`)
  - Fixed filename extraction for frame number calculation
  - Disabled problematic image preloading that caused 404 errors
- **Frame Navigation**: Improved frame navigation smoothness and reliability
- **Canvas Rendering**: Enhanced annotation rendering performance

### 🔧 Technical Improvements
- Cross-platform path handling for better Windows support
- Secure Electron IPC image loading
- Optimized canvas redraw operations
- Enhanced debugging utilities for development