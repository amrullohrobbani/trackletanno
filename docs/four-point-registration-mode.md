# 4-Point Quick Registration Mode

## Overview
The 4-point registration mode is a faster alternative to the full 10-point field registration mode. Instead of manually positioning all 10 keypoints, users select only 4 template points and place them in the image. The system then automatically calculates the homography transformation and applies it to all 10 keypoints.

## User Workflow

### Step 1: Enter Field Registration Mode
1. Click the "Field Registration Mode" button in the left sidebar
2. The volleyball court overlay will appear

### Step 2: Activate 4-Point Mode
1. Click the "🎯 4-Point Quick Mode" button (appears when in field registration mode)
2. A small template overlay appears in the top-right corner showing all 10 keypoints
3. The overlay is highlighted with a magenta border and instructions: "Click 4 Template Points"

### Step 3: Select 4 Template Points
1. Click on 4 points in the small template overlay in the top-right corner
2. The selected points turn magenta in the overlay
3. These points can be corners, or any combination of points that provide good coverage
4. The selected indices appear in the sidebar under "Selected Template Points"

### Step 4: Place Corresponding Image Points
1. After selecting each template point, click on the corresponding location in the main image
2. Large magenta circles (#1, #2, #3, #4) appear where you click
3. Dashed magenta lines connect your image points to their corresponding template points
4. You can see your progress in the sidebar

### Step 5: Apply Transformation
1. Once all 4 point pairs are placed, the "✨ Apply 4-Point Transformation" button becomes available
2. Click this button to:
   - Calculate the homography from your 4 point pairs
   - Automatically position all 10 keypoints in the image
   - Exit 4-point mode
3. The homography is now ready to save

### Step 6: Save Registration
1. Review the automatically positioned keypoints
2. Make manual adjustments if needed (system reverts to normal 10-point mode)
3. Click "💾 Save Registration" to save the homography

## Technical Implementation

### State Management (appStore.ts)
- **fourPointMode**: boolean flag indicating if 4-point mode is active
- **fourPointTemplateIndices**: array of selected template keypoint indices (0-9)
- **fourPointImageCoords**: array of corresponding image coordinates

### Actions (appStore.ts)
- **setFourPointMode(enabled)**: Toggle 4-point mode on/off
- **selectTemplatePoint(index)**: Add a template point to the selection (max 4)
- **addFourPointImageCoord(coord)**: Add an image point coordinate
- **calculateFourPointHomography()**: Calculate homography from 4 point pairs and apply to all 10 keypoints
- **resetFourPointMode()**: Clear 4-point mode state

### UI Components

#### LeftSidebar.tsx
- "🎯 4-Point Quick Mode" button to toggle the mode
- Display of selected template points with indices
- "Apply 4-Point Transformation" button (enabled when ready)
- Quick workflow instructions

#### MainCanvas.tsx
**Visual Elements:**
1. Small template overlay in top-right corner (25% of canvas width)
   - Semi-transparent black background
   - Court template image with all keypoints
   - Selected points highlighted in magenta
   - Magenta border with instructions
   
2. Main canvas visualization:
   - Template keypoints selected for 4-point mode show in magenta
   - Image points shown as large magenta circles with labels (#1-4)
   - Dashed magenta lines connecting image points to template points

**Interaction Handling:**
- Click on template overlay → select template point
- Click on main image → add corresponding image point
- Automatic progression through the 4 point pairs

### Homography Calculation
The 4-point homography calculation uses the same `calculateHomography` utility as the 10-point mode, but with only 4 point correspondences. The calculated transformation is then applied to all 10 template keypoints to generate their image space positions automatically.

**Formula:** 
For each template point `T`, calculate its image position `I` using:
```
I = H * T
```
Where H is the 3x3 homography matrix calculated from the 4 point pairs.

## Advantages
1. **Speed**: Much faster than manually positioning 10 points
2. **Accuracy**: Homography ensures geometric consistency
3. **Simplicity**: Only need to identify 4 corresponding points
4. **Flexibility**: Works with any 4 points (corners, mid-points, etc.)

## Best Practices
1. **Point Selection**: Choose points that are well-distributed across the court
2. **Corner Priority**: Using the 4 corners (indices 0, 1, 8, 9) is often most reliable
3. **Verification**: After applying transformation, verify the auto-positioned points align correctly
4. **Adjustments**: Switch back to normal mode to fine-tune individual points if needed

## Keyboard Shortcuts
- **F**: Toggle field registration mode on/off
- **ESC**: Exit 4-point mode and clear selection
- Click individual keypoints in normal mode to drag and adjust

## Version History
- **v1.6.3**: Initial implementation of 4-point quick registration mode
