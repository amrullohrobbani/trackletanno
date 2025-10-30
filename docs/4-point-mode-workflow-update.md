# 4-Point Mode Workflow Update

## Changes Made (October 30, 2025)

### Final Simplification
**Using Existing Template Overlay Instead of New Overlay**
- Removed the small top-right corner overlay
- Now uses the existing full-screen template overlay for point selection
- More intuitive: click directly on the court template keypoints you see
- Cleaner UI with less visual clutter

### Workflow

#### Phase 1: Template Point Selection (Minimum 4)
- Click on template keypoints shown on the **main court overlay**
- These are the green/gold keypoints you see on the volleyball court template
- Can select 4 or more points (no upper limit)
- Selected points turn **magenta**
- Progress shown in top-left: "Step 1: Click N more template points on overlay"

#### Phase 2: Image Point Placement (After ≥4 Template Points Selected)
- Once you have 4+ template points selected, start placing them in the image
- Click anywhere in the **actual image** (not on overlay keypoints)
- Each click places the next point **in the same order** as template selection
- Progress shown in top-left: "Step 2: Place point #X in image (Y/Z)"
- Visual feedback:
  - Large magenta circles with labels (#1, #2, #3, etc.)
  - Dashed magenta lines connecting image points to template points

#### Phase 3: Apply Transformation
- Button becomes available when all selected template points have corresponding image points
- Click "✨ Apply Transformation (N points)" to calculate homography
- System automatically positions all 10 keypoints based on the homography
- Mode exits automatically after applying

### UI Updates

#### LeftSidebar.tsx
- **Step Indicator**: Dynamic header showing current phase
  - "Step 1: Select Template Points (min 4)"
  - "Step 2: Place Points in Image (X/Y)"
- **Progress Display**: 
  - Template point badges show green checkmarks when placed
  - Current placement target highlighted
- **Apply Button**: Shows number of points being used
- **Instructions Updated**: "Select 4+ template points on overlay → Place them in order on image → Apply"

#### MainCanvas.tsx
- **Template Overlay Instructions**: Dynamic text showing current step
  - "Select Template Points (min 4)"
  - "Place Point #X in Image"
  - "Ready! Click Apply"
- **Click Handling**:
  - Clicks on overlay → select template points
  - Clicks on overlay (not on point) → ignored, doesn't advance to placement
  - Clicks on image → only accepted if ≥4 template points selected
  - Placement happens in sequence matching template selection order

### Code Changes

#### appStore.ts
```typescript
// Removed 4-point limit on template selection
selectTemplatePoint: (index: number) => {
  // Allow selecting any number of points (minimum 4 required)
  if (!fourPointTemplateIndices.includes(index)) {
    set({ fourPointTemplateIndices: [...fourPointTemplateIndices, index] });
  }
}

// Removed hard limit on image coords
addFourPointImageCoord: (imageCoords: { x: number; y: number }) => {
  // Add coords if we haven't placed all template points yet
  if (fourPointImageCoords.length < fourPointTemplateIndices.length) {
    set({ fourPointImageCoords: [...fourPointImageCoords, imageCoords] });
  }
}

// Updated to handle variable number of points (≥4)
calculateFourPointHomography: () => {
  if (fourPointTemplateIndices.length < 4 || 
      fourPointImageCoords.length !== fourPointTemplateIndices.length) {
    console.warn(`Need at least 4 point pairs...`);
    return;
  }
  // Calculate homography with N points
}
```

#### MainCanvas Click Handler
```typescript
// Step 1: Template selection (no limit, no duplicates)
if (distance <= clickThreshold * 2) {
  if (!fourPointTemplateIndices.includes(i)) {
    selectTemplatePoint(i);
  }
  return;
}

// Prevent placement phase if < 4 template points
if (fourPointTemplateIndices.length >= 4 && 
    fourPointImageCoords.length < fourPointTemplateIndices.length) {
  addFourPointImageCoord(coords);
} else if (fourPointTemplateIndices.length < 4) {
  console.log('Need to select at least 4 template points first...');
  return;
}
```

### Benefits

1. **More Flexible**: Can use 4, 5, 6, or even all 10 points for better accuracy
2. **Sequential Clarity**: Order of placement matches order of selection
3. **Better Feedback**: Clear indication of which point to place next
4. **Error Prevention**: Can't start placing until minimum 4 points selected
5. **Visual Guidance**: Template overlay provides constant reference

### Testing Checklist

- [ ] Click 4-Point Mode button activates mode
- [ ] Select 4 template points on overlay
- [ ] Try selecting duplicate (should be ignored)
- [ ] Try clicking image before 4 points (should show warning)
- [ ] Place 4 points in image in order
- [ ] Apply button appears and works
- [ ] Try with more than 4 points (5-10)
- [ ] Verify all 10 keypoints are positioned correctly
- [ ] Exit mode and verify state is cleared

### Version
- **Release**: v1.6.3
- **Date**: October 30, 2025
- **Status**: ✅ Build Successful
