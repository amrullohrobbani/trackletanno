# Auto-Conversion Feature Documentation

## Overview

The Tracklet Annotation Tool now automatically converts old single-file annotation formats to the new dual-file system **immediately when you open a directory** for the first time. This eliminates data redundancy and improves performance while maintaining full backward compatibility.

## How It Works

### 1. **Directory Opening Phase**
When you open a directory (via DirectorySelector or LeftSidebar):
- The system scans for rally folders and validates them
- Calls `setRallyFolders()` with the found rally folders

### 2. **Automatic First Rally Loading**
`setRallyFolders()` now automatically:
- Sets the rally folders in the store
- Automatically calls `setCurrentRally(0)` to load the first rally
- This triggers the annotation loading process immediately

### 3. **Auto-Conversion Trigger**
During the first rally loading (`setCurrentRally(0)`):
- Attempts to load the tracklet details file (`[rally_name]_tracklets.txt`)
- If not found, automatically triggers the conversion process
- Extracts tracklet details from the old format
- Creates the new dual-file structure

### 4. **Conversion Process**
Two files are created/updated:

**Frame-level file** (`[rally_name].txt`):
```csv
frame,tracklet_id,x,y,w,h,score,,,,,,event
1,1,100,200,50,80,0.95,,,,,,
2,1,105,205,50,80,0.92,,,,,,hit
```
- Contains dynamic data (positions, events)
- Tracklet detail fields are cleared to eliminate redundancy
- Maintains 12-column format for compatibility

**Tracklet details file** (`[rally_name]_tracklets.txt`):
```csv
tracklet_id,role,jersey_number,jersey_color,team
1,spiker,10,red,home
2,setter,3,blue,away
```
- Contains static identity information
- One entry per tracklet (no redundancy)
- CSV format with headers

## User Experience

### Complete Workflow
```
1. User opens directory
   ↓
2. System scans rally folders
   ↓
3. setRallyFolders() called
   ↓
4. First rally automatically loaded
   ↓
5. Auto-conversion triggered (if needed)
   ↓
6. User sees first rally with converted annotations
```

### Before Opening Directory
```
rally_folder/
├── 001.jpg
├── 002.jpg
├── rally.txt (contains redundant tracklet details)
```

### After Opening Directory (Auto-Converted)
```
rally_folder/
├── 001.jpg
├── 002.jpg
├── rally.txt (cleaned frame data)
├── rally_tracklets.txt (unique tracklet details)
```

## Benefits

1. **Immediate**: Conversion happens on directory opening, not rally selection
2. **Automatic**: No user intervention required
3. **Transparent**: Happens seamlessly with first rally load
4. **Safe**: Preserves all original data
5. **Efficient**: Reduces file size and redundancy immediately
6. **Intuitive**: User immediately sees the first rally loaded and ready

## Console Output

When opening a directory with old format files, you'll see:
```
Scanning directory: /path/to/rally/directory
Found 3 directories, 3 match rally patterns
Loading annotation file: /path/to/rally_001.txt
No tracklet details file found at rally_001_tracklets.txt, using frame-level data
Extracted 12 tracklet details from frame-level data
✓ Auto-converted: Created tracklet details file rally_001_tracklets.txt
✓ Auto-converted: Cleaned frame-level file rally_001.txt
```

## Error Handling

- If conversion fails, the system continues with the original single-file format
- Original data is never lost
- Detailed error logging helps with troubleshooting
- Graceful fallback ensures the app remains functional

## Technical Implementation

### Modified Functions
- `setRallyFolders()`: Now async and automatically loads first rally
- `setCurrentRally()`: Contains the auto-conversion logic
- Components updated to handle async `setRallyFolders()`

### Key Functions
- `extractTrackletDetailsFromAnnotations()`: Extracts unique tracklet details
- `trackletDetailsToCSV()`: Converts to CSV format with headers
- `getTrackletFilePath()`: Generates tracklet file path

### File Naming Convention
- Frame file: `[rally_name].txt`
- Tracklet file: `[rally_name]_tracklets.txt`

## Testing

The conversion has been tested with:
- ✅ Directory opening with old format files
- ✅ Files with tracklet details in old format
- ✅ Files with empty tracklet details
- ✅ Mixed annotation scenarios
- ✅ Large annotation files (2000+ entries)
- ✅ TypeScript compilation
- ✅ Electron environment
- ✅ Async workflow integration

## Backward Compatibility

The system maintains full backward compatibility:
- Old single-file format still supported
- Existing annotations load correctly
- No breaking changes to existing workflows
- Immediate migration on directory opening
- Graceful handling of conversion failures

---

*This feature was enhanced to provide immediate auto-conversion when opening directories, making the transition to the dual-file system completely seamless for users.*
