# Windows Annotation Display Issue Debug

## Problem Analysis

The issue appears to be related to path handling and frame number extraction on Windows systems.

## Fixes Applied

### 1. Path Separator Handling
**Issue**: Windows uses backslashes (`\`) for paths while the code was only handling forward slashes (`/`)

**Fixed Files**:
- `src/components/MainCanvas.tsx` - Multiple filename extraction functions
- `src/store/appStore.ts` - Frame number extraction
- `src/utils/debugHelpers.ts` - Debug path handling
- `src/components/LeftSidebar.tsx` - Directory display
- `src/utils/ballAnnotationParser.ts` - Video source path parsing

**Fix**: Changed `imagePath.split('/').pop()` to `imagePath.split(/[/\\]/).pop()` to handle both Windows and Unix path separators.

### 2. Image Preloading Issues
**Issue**: The preloading code was trying to load images directly via HTTP requests instead of using Electron's secure IPC image loading

**Fix**: Disabled preloading in Electron environment to prevent 404 errors. All images are now loaded securely via IPC when needed.

## Frame Number Debugging

From the terminal logs, we can see:
- Annotation data uses 0-based frame numbers (000000, 000001, etc.)
- App uses 1-based frame indexing (currentFrameIndex starts at 1)
- Frame conversion logs show: "000000.jpg -> 0"

This suggests the frame number extraction is working correctly, but there might be a mismatch between 0-based annotation frame numbers and 1-based app indexing.

## Next Steps for Testing

1. Test on Windows to verify path handling fixes work
2. Check console logs for frame/annotation matching issues
3. Verify that annotations appear when navigating frames
4. Test with different rally datasets

## Expected Behavior After Fixes

- No more 404 errors for image requests
- Proper filename extraction on Windows paths
- Annotations should display correctly on canvas
- Frame navigation should be smooth

## Additional Windows-Specific Considerations

- Ensure file permissions are correct
- Check that annotation files are accessible
- Verify image file formats are supported
- Test with different path lengths and special characters
