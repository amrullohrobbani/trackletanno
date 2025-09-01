# Space After Comma Formatting

## Overview

The annotation system now maintains the space-after-comma formatting style that you prefer for better readability and consistency with your existing data format.

## Format Examples

### Frame-Level Annotations
```csv
frame, tracklet_id, x, y, w, h, score, role, jersey_number, jersey_color, team, event
1, 1, 100, 200, 50, 80, 0.95, , , , , 
1, 2, 300, 400, 60, 90, 0.90, , , , , 
2, 1, 105, 205, 50, 80, 0.92, , , , , hit
```

### Tracklet Details
```csv
tracklet_id, role, jersey_number, jersey_color, team
1, spiker, 10, red, home
2, setter, 3, blue, away
```

## Implementation Details

### Functions Updated
1. **`trackletDetailsToCSV()`** - Uses `join(', ')` with space
2. **`saveAnnotationsToFile()`** - Uses `join(', ')` for frame data
3. **Auto-conversion logic** - Uses `join(', ')` for cleaned data

### Benefits
- **Readability**: Easier to read in text editors
- **Consistency**: Matches your existing data format
- **Compatibility**: Works with existing parsing logic
- **Flexibility**: Easy to modify if needed

### Code Locations
- `src/utils/annotationParser.ts` - trackletDetailsToCSV function
- `src/store/appStore.ts` - saveAnnotationsToFile function
- `src/store/appStore.ts` - auto-conversion logic

The system now consistently uses space-after-comma formatting across all CSV generation functions while maintaining full functionality of the dual-file annotation system.
