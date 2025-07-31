# Tracklet Annotation Tool - Complete User Manual

A comprehensive desktop application for annotating tracklet IDs and ball positions in video frames, built with Electron, Next.js, and Tailwind CSS.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Application Overview](#application-overview)
3. [Data Format](#data-format)
4. [Interface Guide](#interface-guide)
5. [Annotation Modes](#annotation-modes)
6. [Step-by-Step CRUD Operations](#step-by-step-crud-operations)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)
10. [Development](#development)

---

## Quick Start

### Installation & Launch
1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd trackletanno
   npm install
   ```

2. **Run the application:**
   ```bash
   npm run electron-dev
   ```

3. **First time setup:**
   - Click "Search Directory" to select your dataset folder
   - Navigate through the directory tree to select a rally
   - Start annotating!

---

## Application Overview

The Tracklet Annotation Tool is designed for sports video analysis, specifically for annotating player tracklets and ball positions in volleyball matches. The application features a three-column layout optimized for efficient annotation workflows.

### Key Features
- **Player Bounding Box Annotation** - Draw and manage player tracklets with team assignments
- **Ball Position Annotation** - Mark precise ball locations with event tagging
- **Event Annotation** - Tag actions like "serve", "spike", "dig", etc.
- **Real-time Visual Feedback** - Color-coded boxes, visibility controls, and progress indicators
- **Automatic File Management** - Seamless saving and loading of annotation data
- **Timeline Visualization** - See annotation coverage across frames
- **Zoom & Pan Controls** - Navigate high-resolution frames with precision

---

## Data Format

### CSV Annotation Structure
Annotation files use CSV format without headers:
```
frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team
```

**Field Descriptions:**
- `frame`: Frame number (matches image filename: 000001.jpg = frame 1)
- `tracklet_id`: Unique player identifier (1-98 for players, 99 for ball)
- `x,y`: Top-left corner coordinates of bounding box
- `w,h`: Width and height of bounding box  
- `score`: Confidence score (1.0 for manual annotations)
- `role`: Player role (e.g., "player", can be empty)
- `jersey_number`: Player's jersey number (optional)
- `jersey_color`: Color of jersey (optional)
- `team`: Team identifier (0=home, 1=away, -1=others)
- `event`: Action/event type (e.g., "serve", "spike", "dig")

### Expected Directory Structure
```
dataset/
├── volleyball_tracking_data/
│   ├── rally_001/
│   │   ├── rally_001.txt        # Annotation file
│   │   ├── 000001.jpg          # Frame images
│   │   ├── 000002.jpg
│   │   └── ...
│   ├── rally_002/
│   │   └── ...
│   └── ...
```

### Team Color System
- **🔵 Blue**: Home team (team = 0)
- **🔴 Red**: Away team (team = 1)  
- **⚫ Gray**: Others/Referees (team = -1)
- **🟠 Orange**: Ball annotations (tracklet_id = 99)

---

## Interface Guide

### Three-Column Layout

#### Left Sidebar - Navigation & Controls
- **Directory Tree**: Browse and select rally folders
- **Frame Navigation**: Previous/Next frame controls
- **Annotation Modes**: Drawing, Assignment, Ball Annotation buttons
- **Visibility Controls**: Toggle tracklet labels and event labels
- **Save Status**: Real-time save indicators

#### Main Canvas - Annotation Area  
- **Image Display**: Current frame with zoom/pan controls
- **Bounding Boxes**: Color-coded player annotations
- **Ball Indicators**: Orange circular markers for ball positions
- **Event Labels**: Colored tags showing assigned events
- **Mode Indicators**: Current mode and zoom level display

#### Right Sidebar - Tracklet Management
- **Player ID Grid**: 5-column grid of tracklet IDs (1-98)
- **Ball Controls**: Special ball annotation controls (ID 99)
- **Event Selector**: Dropdown for event types (serve, spike, dig, etc.)
- **Timeline View**: Visualization of annotation coverage
- **Delete Functions**: Individual and bulk deletion options

---

## Annotation Modes

The application operates in different modes for various annotation tasks:

### 1. 🎯 Selection Mode (Default)
**Purpose**: Navigate and select existing annotations
- **Visual**: Default cursor, no special indicators
- **Function**: Click to select bounding boxes, view annotations
- **Use case**: Reviewing existing work, preparing for editing

### 2. ✏️ Drawing Mode
**Purpose**: Create new player bounding boxes
- **Visual**: Crosshair cursor, "Drawing - ID: X" indicator
- **Function**: Click and drag to draw new boxes
- **Use case**: Adding new player annotations

### 3. 🔄 Assignment Mode  
**Purpose**: Reassign existing bounding boxes to different tracklet IDs
- **Visual**: Crosshair cursor, "Assign - ID: X" indicator
- **Function**: Click existing boxes to change their tracklet ID
- **Use case**: Correcting misassigned player IDs

### 4. ⚽ Ball Annotation Mode
**Purpose**: Mark ball positions with precise center points
- **Visual**: Crosshair cursor, "Ball Annotation Mode" indicator
- **Function**: Click to place ball markers, auto-assigns ID 99
- **Use case**: Tracking ball position throughout rally

---

## Step-by-Step CRUD Operations

### 🔷 Player Bounding Box Operations

#### CREATE - Adding New Player Annotation
1. **Select Tracklet ID**
   - Go to Right Sidebar → Player ID Grid
   - Click on desired player ID (1-98)
   - Selected ID becomes highlighted in blue

2. **Enter Drawing Mode**
   - Click "Draw New Bounding Box" in Left Sidebar, OR
   - Press `D` key
   - Canvas cursor changes to crosshair
   - Mode indicator shows "Drawing - ID: X"

3. **Draw Bounding Box**
   - Position cursor at top-left corner of player
   - Click and hold mouse button
   - Drag to bottom-right corner
   - Release mouse button
   - Box automatically appears with tracklet ID assigned

4. **Verify Creation**
   - New annotation appears in team color
   - Tracklet label shows "ID: X" (if labels enabled)
   - File automatically saves with visual confirmation

#### READ - Viewing Player Annotations
1. **Navigate Frames**
   - Use Previous/Next buttons in Left Sidebar, OR
   - Press `Z` (previous) / `X` (next) keys

2. **Toggle Visibility**
   - Left Sidebar → "Show Tracklet Labels" checkbox
   - Left Sidebar → "Show Event Labels" checkbox
   - Right Sidebar → Eye icons for individual tracklet visibility

3. **View Timeline**
   - Right Sidebar → Click "Timeline" button
   - Modal shows annotation coverage across all frames
   - Red blocks indicate frames with annotations

#### UPDATE - Modifying Player Annotations

**Reassigning Tracklet ID:**
1. **Select New Tracklet ID**
   - Right Sidebar → Click desired new player ID

2. **Enter Assignment Mode**
   - Click "Assign Tracklet ID" in Left Sidebar, OR
   - Press `A` key
   - Mode indicator shows "Assign - ID: X"

3. **Reassign Box**
   - Click on existing bounding box to reassign
   - Box immediately changes to new ID and color
   - File automatically saves

**Adding Event Annotation:**
1. **Select Event Type**
   - Right Sidebar → Event dropdown → Choose event (serve, spike, etc.)

2. **Assign to Bounding Box**
   - Click directly on any existing bounding box
   - Event label appears in top-right corner of box
   - Color-coded by event type (red=serve, blue=receive, etc.)

#### DELETE - Removing Player Annotations

**Delete Single Annotation:**
1. **Navigate to Target Frame**
   - Use frame navigation to find annotation to delete

2. **Delete Specific Tracklet**
   - Right Sidebar → Find tracklet ID
   - Click trash icon (🗑️) next to desired ID
   - Confirm deletion in popup dialog
   - Annotation removed from current frame only

**Delete All Annotations for Tracklet:**
1. **Select Tracklet to Delete**
   - Right Sidebar → Find tracklet ID

2. **Delete Across All Frames**
   - Click trash icon (🗑️) next to tracklet ID
   - Choose "Delete from all frames" option
   - Confirm in dialog - removes ALL instances of this tracklet ID

### 🟠 Ball Annotation Operations

#### CREATE - Adding Ball Position
1. **Enter Ball Mode**
   - Right Sidebar → Click "Ball Annotation" button, OR
   - Right Sidebar → Click on "Ball 99" button
   - Mode indicator shows "Ball Annotation Mode"

2. **Place Ball Marker**
   - Click precisely at ball center position
   - Orange circular marker appears with crosshair center
   - Ball label shows "Ball 99" (if labels enabled)

3. **Add Event (Optional)**
   - Select event from dropdown before placing ball
   - Ball automatically gets event assignment
   - Event label appears above ball marker

#### READ - Viewing Ball Annotations
1. **Toggle Ball Visibility**
   - Right Sidebar → Eye icon next to "Ball 99"
   - Shows/hides all ball annotations

2. **View Ball Timeline**
   - Right Sidebar → Timeline button
   - Ball annotations appear as orange indicators

#### UPDATE - Modifying Ball Annotations

**Moving Ball Position:**
1. **Enter Ball Mode**
   - Click "Ball Annotation" button

2. **Replace Position**
   - Click new position for ball
   - Previous ball annotation on same frame is automatically replaced

**Adding/Changing Ball Event:**
1. **Select Event**
   - Right Sidebar → Event dropdown → Choose event

2. **Apply to Ball**
   - Click directly on existing ball marker
   - Event label appears above ball (gold background)

#### DELETE - Removing Ball Annotations
1. **Right-Click Ball Marker**
   - Right-click directly on orange ball indicator
   - Confirm deletion in popup dialog
   - Ball annotation removed from current frame

---

## Keyboard Shortcuts

| Key | Function | Description |
|-----|----------|-------------|
| `Z` | Previous Frame | Navigate to previous frame |
| `X` | Next Frame | Navigate to next frame |
| `D` | Drawing Mode | Toggle drawing mode on/off |
| `A` | Assignment Mode | Toggle assignment mode on/off |
| `0` | Reset Zoom | Reset zoom to 100% and center image |
| `Ctrl+0` | Reset Zoom | Alternative zoom reset shortcut |

### Mouse Controls
| Action | Function |
|--------|----------|
| Left Click | Draw box / Select / Assign |
| Right Click | Pan image / Delete ball (on ball marker) |
| Middle Click | Pan image |
| Mouse Wheel | Zoom in/out at cursor position |
| Click + Drag | Draw bounding box (drawing mode) |

---

## Advanced Features

### 🔍 Zoom & Pan System
- **Zoom**: Mouse wheel to zoom in/out at cursor position
- **Pan**: Right-click or middle-click and drag to move around image  
- **Reset**: Press `0` to snap back to 100% zoom and center
- **Visual Feedback**: Zoom percentage shown in bottom-right corner

### 👁️ Visibility Controls
- **Individual Tracklets**: Eye icons in right sidebar to show/hide specific player IDs
- **Ball Toggle**: Special eye icon for ball annotations (ID 99)
- **Label Types**: Separate toggles for tracklet labels and event labels
- **Persistent Settings**: Visibility preferences maintained across frames

### 📊 Timeline Visualization
- **Coverage View**: Visual representation of annotation density
- **Frame Navigation**: Click timeline to jump to specific frames
- **Progress Tracking**: See completion status at a glance
- **Multi-tracklet Display**: Different colors for different players

### 🎨 Color Coding System
**Bounding Box Colors:**
- Blue: Home team players
- Red: Away team players  
- Gray: Others (referees, etc.)
- Orange: Ball annotations

**Event Label Colors:**
- Red: Serve
- Blue: Receive  
- Green: Dig
- Yellow: Pass
- Purple: Set
- Orange: Spike
- Gray: Block
- Dark Red: Kill

### 💾 Automatic Saving
- **Real-time Updates**: All changes saved immediately to CSV file
- **Visual Feedback**: Save status indicator shows saving/saved/error states
- **Data Integrity**: Automatic backup and validation
- **No Manual Save**: Never worry about losing work

---

## Troubleshooting

### Common Issues & Solutions

#### "This feature is only available in the desktop application"
- **Cause**: Running in web browser mode
- **Solution**: Use `npm run electron-dev` instead of `npm run dev`

#### Images not loading or appearing blank
- **Cause**: File path or permission issues
- **Solutions**:
  - Check that image files are in same folder as annotation file
  - Verify image formats are supported (jpg, jpeg, png, bmp)
  - Ensure file permissions allow reading
  - Try restarting the application

#### "No rally folders found" message
- **Cause**: Directory structure doesn't match expected format
- **Solutions**:
  - Ensure annotation files have `.txt` extension
  - Check that image files are present in rally folders
  - Verify directory naming follows expected pattern
  - Make sure both annotation file and images are in same subfolder

#### Bounding boxes not appearing
- **Cause**: Annotation data format issues or frame mismatch
- **Solutions**:
  - Check CSV format matches expected structure
  - Verify frame numbers in annotations match image filenames
  - Ensure tracklet IDs are within valid range (1-98 for players, 99 for ball)
  - Check that tracklet visibility is enabled (eye icons)

#### Performance issues with large datasets
- **Solutions**:
  - Close unnecessary applications
  - Work with smaller rally folders when possible
  - Restart application periodically for long sessions
  - Ensure sufficient disk space for saving

#### Drawing mode not working
- **Check**:
  - Valid tracklet ID is selected (1-98, not 99 for regular boxes)
  - Drawing mode is actually enabled (check mode indicator)
  - Mouse is being clicked and dragged (not just clicked)
  - Minimum box size requirement (5x5 pixels)

---

## Development

### System Requirements
- Node.js 16+ 
- npm or yarn package manager
- Electron-compatible operating system (Windows, macOS, Linux)

### Development Commands
```bash
# Web development (limited functionality)
npm run dev

# Full Electron development
npm run electron-dev

# Build for production
npm run build
npm run build-electron

# Linting and code quality
npm run lint
```

### Architecture Overview
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Desktop**: Electron with secure IPC communication
- **State Management**: Zustand for predictable state updates
- **Canvas Rendering**: HTML5 Canvas with zoom/pan transformations
- **File Handling**: Secure electron-based file system access

### Key Components
- `MainCanvas.tsx`: Core annotation interface with drawing logic
- `LeftSidebar.tsx`: Navigation and mode controls
- `RightSidebar.tsx`: Tracklet management and timeline
- `DirectorySelector.tsx`: Initial dataset selection
- `appStore.ts`: Centralized state management with Zustand

### Security Features
- Context isolation between main and renderer processes
- Secure IPC communication for file operations
- No direct file system access from renderer
- Validated data sanitization for all user inputs

---

## Tips for Efficient Annotation

### Workflow Optimization
1. **Plan Your Session**: Review video first to understand player movements
2. **Use Keyboard Shortcuts**: Memorize `Z`/`X` for frame navigation and `D`/`A` for modes
3. **Leverage Visibility Controls**: Hide completed tracklets to focus on remaining work
4. **Timeline Feedback**: Use timeline view to track progress and find gaps
5. **Batch Similar Operations**: Do all drawing first, then assignments, then events

### Quality Control
- **Regular Timeline Checks**: Ensure consistent tracklet coverage
- **Event Validation**: Verify event assignments match actual actions
- **Team Assignment**: Double-check team colors match player affiliations
- **Ball Tracking**: Maintain continuous ball annotation throughout rallies

### Performance Tips
- **Work in Segments**: Complete annotation frame-by-frame rather than jumping around
- **Use Zoom Effectively**: Zoom in for precise box placement, zoom out for context
- **Save Frequently**: Though auto-save is enabled, manually verify save status
- **Clean Workspace**: Close unused rallies and restart application for long sessions

---

*This manual covers the complete functionality of the Tracklet Annotation Tool. For technical support or feature requests, please refer to the project repository or contact the development team.*

