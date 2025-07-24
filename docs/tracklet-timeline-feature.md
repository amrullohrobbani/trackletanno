# Tracklet Timeline Feature

## Overview
The Tracklet Timeline feature allows users to view and navigate through all annotations for a specific tracklet ID across all frames in a rally. This provides an easy way to track the movement and presence of a single tracklet throughout the entire video sequence.

## Features

### 🎯 **Timeline Modal**
- **Full Timeline View**: Shows all frames where the tracklet appears or should appear
- **Cropped Images**: Displays cropped sections around each bounding box for easy identification
- **Placeholder Frames**: Shows frames where the tracklet has no annotations with visual placeholders
- **Progress Indicator**: Shows annotation coverage percentage and statistics
- **Smooth Navigation**: Click any frame to jump to it in the main canvas

### 🔧 **User Interface**
- **Responsive Design**: Modal adapts to different screen sizes
- **Keyboard Controls**: 
  - `←/→` arrows: Navigate between frames
  - `Home/End`: Jump to first/last frame  
  - `Escape`: Close modal
- **Visual Feedback**: Current frame highlighted with blue ring
- **Toggle View**: Show/hide placeholder frames for missing annotations

### 🎨 **Visual Elements**
- **Color-coded Boundaries**: Consistent tracklet colors from main canvas
- **Smooth Animations**: Hover effects and transitions
- **Loading States**: Progress indicators during image processing
- **Statistics Display**: Real-time annotation coverage metrics

## How to Use

### 1. **Access Timeline from Selected Tracklet**
- Select any tracklet ID from the right sidebar
- Click the "View Timeline" button in the Selected ID section
- Modal opens showing full timeline for that tracklet

### 2. **Access Timeline from Tracklet List**
- Find any tracklet ID in the "Available IDs" grid
- Click the small timeline icon (≡) next to the tracklet ID
- Modal opens directly for that specific tracklet

### 3. **Navigate Within Timeline**
- **Click any frame**: Jump to that frame in main canvas
- **Use keyboard**: Arrow keys for navigation
- **Scroll**: Use mouse wheel or scrollbar to move through timeline
- **Auto-scroll**: "Scroll to Current" button centers current frame

### 4. **Filter View**
- **Show Placeholders**: Toggle to include/exclude frames without annotations
- **Statistics**: View annotation coverage and missing frame count

## Technical Implementation

### Components
- `TrackletTimelineModal.tsx`: Main modal component
- `TimelineButton.tsx`: Reusable button component for accessing timeline
- Integration with existing `RightSidebar.tsx`

### Data Processing
- **Image Cropping**: Automatic cropping around bounding boxes with padding
- **Placeholder Generation**: Canvas-generated placeholders for missing annotations  
- **Caching**: Cropped images cached for performance
- **Async Loading**: Progressive loading of images for smooth experience

### Features
- **Frame Synchronization**: Timeline stays synced with main canvas navigation
- **Memory Efficient**: Images loaded on-demand and cached intelligently
- **Error Handling**: Graceful fallbacks for missing or corrupted images

## User Benefits

### 🔍 **Quality Assurance**
- Easily spot missing annotations across frames
- Identify inconsistent tracklet assignments
- Review annotation quality for specific tracklets

### ⚡ **Efficient Workflow**
- Quick navigation to specific frames needing attention
- Visual overview of tracklet presence throughout rally
- Reduced time spent manually checking each frame

### 📊 **Progress Tracking**
- Clear metrics on annotation completion
- Visual progress bar showing coverage percentage
- Easy identification of work remaining

## Keyboard Shortcuts Summary
- `← →`: Navigate frames in timeline
- `Home`: Jump to first frame
- `End`: Jump to last frame  
- `Escape`: Close timeline modal

## Future Enhancements
- Batch annotation tools for missing frames
- Export timeline as image sequence
- Tracklet path visualization overlay
- Multi-tracklet comparison view
