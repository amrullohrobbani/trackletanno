<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Tracklet Annotation Tool

This is an Electron + Next.js application for annotating tracklet IDs in video frames. The application features:

## Architecture
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Desktop**: Electron for file system access and native functionality
- **State Management**: Zustand for global state
- **Canvas**: HTML5 Canvas for image display and bounding box interaction
- **Icons**: Heroicons for UI components

## Key Components
- **MainCanvas**: Handles image display, bounding box drawing, and annotation interactions
- **LeftSidebar**: Contains annotation controls and directory tree navigation
- **RightSidebar**: Manages tracklet ID selection and display
- **DirectorySelector**: Initial screen for selecting annotation data directory

## Data Format
Annotation files are CSV without headers, format: `frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team`
Frame numbers correspond to 6-digit image filenames (e.g., 000001.jpg = frame 1)
Team values are numeric: 0=home, 1=away, -1=others

## Electron Integration
- Uses IPC (Inter-Process Communication) for secure file operations
- Main process handles file I/O, directory selection
- Renderer process (Next.js) handles UI and user interactions

## Key Features
- Three-column responsive layout
- Keyboard shortcuts (Z/X for frame navigation, Home/End for first/last frame, D/A for modes, B for ball mode, ESC to clear)
- Real-time bounding box drawing and editing
- Automatic file saving with visual feedback
- Support for 1920x1080 image frames
