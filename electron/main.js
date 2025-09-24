const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const isDev = process.env.NODE_ENV === 'development';

// Check Node.js version compatibility
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);
if (majorVersion < 14) {
  console.error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
  process.exit(1);
}

console.log('Platform info:', {
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
  isDev
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable for local file access
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file system operations
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fsPromises.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Helper function to check and rename images if needed
async function checkAndRenameImages(folderPath, imageFiles) {
  let renamedCount = 0;
  let needsRenaming = false;

  // Check if images already have proper frame numbering (contain only digits)
  const hasFrameNumbers = imageFiles.every(filename => {
    const baseName = path.parse(filename).name;
    return /^\d+$/.test(baseName); // Check if filename (without extension) is all digits
  });

  if (!hasFrameNumbers) {
    console.log(`Images in ${folderPath} need renaming to frame format`);
    needsRenaming = true;

    // Rename images to 6-digit frame format: 000001.jpg, 000002.jpg, etc.
    for (let i = 0; i < imageFiles.length; i++) {
      const oldFilename = imageFiles[i];
      const oldPath = path.join(folderPath, oldFilename);
      const extension = path.extname(oldFilename);
      const newFilename = `${(i + 1).toString().padStart(6, '0')}${extension}`;
      const newPath = path.join(folderPath, newFilename);

      try {
        await fsPromises.rename(oldPath, newPath);
        renamedCount++;
        console.log(`Renamed: ${oldFilename} -> ${newFilename}`);
      } catch (renameError) {
        console.error(`Failed to rename ${oldFilename}:`, renameError);
      }
    }
  }

  return {
    renamed: needsRenaming,
    count: renamedCount
  };
}

ipcMain.handle('get-rally-folders', async (event, basePath) => {
  try {
    console.log('Scanning directory:', basePath);
    const entries = await fsPromises.readdir(basePath, { withFileTypes: true });
    const rallyFolders = [];
    const validationResults = [];
    
    // New approach: Check any directory that contains multiple images (2+ images)
    // This allows for any folder naming convention
    const directories = entries.filter(entry => entry.isDirectory());
    
    console.log(`Found ${directories.length} directories, checking for image content...`);

    for (const dirEntry of directories) {
      const folderPath = path.join(basePath, dirEntry.name);
      const validation = {
        folderName: dirEntry.name,
        rallyName: dirEntry.name, // Use folder name directly as rally name
        isValidPattern: true, // Always valid if contains images
        issues: [],
        status: 'unknown'
      };

      console.log(`Checking directory: ${dirEntry.name}`);

      try {
        // Check folder contents for images
        const folderEntries = await fsPromises.readdir(folderPath);
        
        // Look for image files
        const imageFiles = folderEntries.filter(file => 
          /\.(jpg|jpeg|png|bmp|webp|gif)$/i.test(file)
        );

        console.log(`Found ${imageFiles.length} image files in ${dirEntry.name}`);

        // Only consider folders with multiple images as potential rally folders
        if (imageFiles.length >= 2) {
          console.log(`✓ ${dirEntry.name} has ${imageFiles.length} images - treating as rally folder`);
          
          // Sort image files by frame number for proper ordering
          const sortedImageFiles = imageFiles.sort((a, b) => {
            const getFrameNumber = (filename) => {
              return parseInt(filename.replace(/\D/g, ''), 10) || 0;
            };
            return getFrameNumber(a) - getFrameNumber(b);
          });

          // Check if images need renaming (if they don't have frame numbers)
          const needsRenaming = await checkAndRenameImages(folderPath, sortedImageFiles);
          if (needsRenaming.renamed) {
            validation.issues.push(`Renamed ${needsRenaming.count} images to use frame numbering`);
            // Refresh the sorted list after renaming
            const renamedEntries = await fsPromises.readdir(folderPath);
            const renamedImages = renamedEntries.filter(file => 
              /\.(jpg|jpeg|png|bmp|webp|gif)$/i.test(file)
            ).sort((a, b) => {
              const getFrameNumber = (filename) => {
                return parseInt(filename.replace(/\D/g, ''), 10) || 0;
              };
              return getFrameNumber(a) - getFrameNumber(b);
            });
            sortedImageFiles.splice(0, sortedImageFiles.length, ...renamedImages);
          }

          // Check for annotation file
          const annotationFilePath = path.join(basePath, `${dirEntry.name}.txt`);
          const annotationExists = await fsPromises.access(annotationFilePath).then(() => true).catch(() => false);
          
          if (!annotationExists) {
            // Create empty annotation file
            console.log(`Creating empty annotation file: ${annotationFilePath}`);
            const emptyAnnotation = ''; // Empty CSV content
            try {
              await fsPromises.writeFile(annotationFilePath, emptyAnnotation, 'utf8');
              validation.issues.push('Created new empty annotation file');
            } catch (writeError) {
              validation.issues.push(`Could not create annotation file: ${writeError.message}`);
            }
          } else {
            // Validate existing annotation file
            try {
              const annotationContent = await fsPromises.readFile(annotationFilePath, 'utf8');
              if (annotationContent.trim().length === 0) {
                validation.issues.push('Annotation file is empty');
              } else {
                // Basic validation of annotation format
                const lines = annotationContent.trim().split('\n');
                const validLines = lines.filter(line => {
                  const parts = line.split(',');
                  return parts.length >= 7; // frame,tracklet_id,x,y,w,h,score minimum
                });
                
                if (validLines.length === 0 && lines.length > 0) {
                  validation.issues.push('Annotation file format invalid (need at least 7 columns)');
                }
              }
            } catch (annotationError) {
              validation.issues.push(`Cannot read annotation file: ${annotationError.message}`);
            }
          }

          // Determine status and add to rally folders
          if (validation.issues.length === 0) {
            validation.status = 'valid';
          } else {
            validation.status = 'warning';
          }

          rallyFolders.push({
            name: dirEntry.name,
            path: folderPath,
            annotationFile: annotationFilePath,
            imageFiles: sortedImageFiles.map(img => path.join(folderPath, img))
          });
          
          console.log(`✓ Added rally folder: ${dirEntry.name} (${imageFiles.length} images)`);
        } else {
          console.log(`✗ ${dirEntry.name} only has ${imageFiles.length} images - skipping`);
          validation.issues.push(`Only ${imageFiles.length} image files found (minimum 2 required)`);
          validation.status = 'invalid';
        }
      } catch (folderError) {
        validation.issues.push(`Error reading folder: ${folderError.message}`);
        validation.status = 'error';
        console.error(`Error validating folder ${folderPath}:`, folderError);
      }

      validationResults.push(validation);
    }

    console.log('Total rally folders found:', rallyFolders.length);
    console.log('Validation results:', validationResults);
    
    // Attach validation info for better user feedback
    rallyFolders.validationResults = validationResults;
    
    return rallyFolders;
  } catch (error) {
    console.error('Error getting rally folders:', error);
    return [];
  }
});

// Helper function to check and rename images if needed
async function checkAndRenameImages(folderPath, imageFiles) {
  let renamedCount = 0;
  let needsRenaming = false;

  // Check if images already have proper frame numbering (contain only digits)
  const hasFrameNumbers = imageFiles.every(filename => {
    const baseName = path.parse(filename).name;
    return /^\d+$/.test(baseName); // Check if filename (without extension) is all digits
  });

  if (!hasFrameNumbers) {
    console.log(`Images in ${folderPath} need renaming to frame format`);
    needsRenaming = true;

    // Rename images to 6-digit frame format: 000001.jpg, 000002.jpg, etc.
    for (let i = 0; i < imageFiles.length; i++) {
      const oldFilename = imageFiles[i];
      const oldPath = path.join(folderPath, oldFilename);
      const extension = path.extname(oldFilename);
      const newFilename = `${(i + 1).toString().padStart(6, '0')}${extension}`;
      const newPath = path.join(folderPath, newFilename);

      try {
        await fsPromises.rename(oldPath, newPath);
        renamedCount++;
        console.log(`Renamed: ${oldFilename} -> ${newFilename}`);
      } catch (renameError) {
        console.error(`Failed to rename ${oldFilename}:`, renameError);
      }
    }
  }

  return {
    renamed: needsRenaming,
    count: renamedCount
  };
}

ipcMain.handle('get-frame-number', async (event, filename) => {
  try {
    // Extract frame number from filename using the same method as timeline modal
    const digitsOnly = filename.replace(/\D/g, '');
    const frameNumber = parseInt(digitsOnly, 10);
    
    // Only use fallback if parsing actually failed (NaN), not if the result is 0
    const finalFrameNumber = isNaN(frameNumber) ? 1 : frameNumber;
    console.log(`Frame conversion: ${filename} -> ${finalFrameNumber}`);
    return finalFrameNumber;
  } catch (error) {
    console.error('Error extracting frame number:', error);
    return 1;
  }
});

ipcMain.handle('get-filename-from-frame', async (event, frameIndex) => {
  try {
    // This function is rarely used, keeping simple fallback
    const frameNumber = frameIndex + 1;
    const filename = frameNumber.toString().padStart(6, '0');
    console.log(`Filename conversion: frame index ${frameIndex} -> ${filename}`);
    return filename;
  } catch (error) {
    console.error('Error creating filename from frame:', error);
    return '000001';
  }
});

ipcMain.handle('debug-directory', async (event, dirPath) => {
  try {
    console.log('=== DEBUG: Directory contents ===');
    console.log('Path:', dirPath);
    
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    console.log('Total entries found:', entries.length);
    
    const directories = entries.filter(e => e.isDirectory());
    const files = entries.filter(e => e.isFile());
    
    console.log('Directories:', directories.map(d => d.name));
    console.log('Files:', files.map(f => f.name));
    
    // Check for rally patterns
    const rallyDirs = directories.filter(d => d.name.startsWith('rally_'));
    console.log('Rally directories found:', rallyDirs.map(d => d.name));
    
    // Check subdirectories for rally folders
    for (const dir of directories) {
      try {
        const subPath = path.join(dirPath, dir.name);
        const subEntries = await fsPromises.readdir(subPath, { withFileTypes: true });
        const subRallies = subEntries.filter(e => e.isDirectory() && e.name.startsWith('rally_'));
        if (subRallies.length > 0) {
          console.log(`Rally folders in ${dir.name}:`, subRallies.map(r => r.name));
        }
      } catch (err) {
        console.log(`Could not read subdirectory ${dir.name}:`, err.message);
      }
    }
    
    return {
      totalEntries: entries.length,
      directories: directories.map(d => d.name),
      files: files.map(f => f.name),
      rallyDirectories: rallyDirs.map(d => d.name)
    };
  } catch (error) {
    console.error('Error debugging directory:', error);
    return { error: error.message };
  }
});

// Load annotation file content
ipcMain.handle('load-annotation-file', async (event, annotationFilePath) => {
  try {
    console.log('Loading annotation file:', annotationFilePath);
    const content = await fsPromises.readFile(annotationFilePath, 'utf8');
    console.log('Annotation file loaded, size:', content.length, 'bytes');
    return content;
  } catch (error) {
    console.error('Error loading annotation file:', error);
    throw error;
  }
});

// Save annotation file content
ipcMain.handle('save-annotation-file', async (event, annotationFilePath, content) => {
  try {
    console.log('Saving annotation file:', annotationFilePath);
    await fsPromises.writeFile(annotationFilePath, content, 'utf8');
    console.log('Annotation file saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving annotation file:', error);
    throw error;
  }
});

// Read patch notes from PATCH_NOTES.md file
ipcMain.handle('read-patch-notes', async () => {
  try {
    console.log('Reading patch notes file...');
    const patchNotesPath = path.join(__dirname, '..', 'PATCH_NOTES.md');
    console.log('Patch notes path:', patchNotesPath);
    
    if (!fs.existsSync(patchNotesPath)) {
      console.log('PATCH_NOTES.md not found, trying public directory...');
      const publicPatchNotesPath = path.join(__dirname, '..', 'public', 'PATCH_NOTES.md');
      console.log('Public patch notes path:', publicPatchNotesPath);
      
      if (fs.existsSync(publicPatchNotesPath)) {
        const content = fs.readFileSync(publicPatchNotesPath, 'utf8');
        console.log('Successfully read patch notes from public directory, length:', content.length);
        return content;
      } else {
        throw new Error('PATCH_NOTES.md not found in either root or public directory');
      }
    }
    
    const content = fs.readFileSync(patchNotesPath, 'utf8');
    console.log('Successfully read patch notes from root directory, length:', content.length);
    return content;
  } catch (error) {
    console.error('Error reading patch notes:', error);
    throw error;
  }
});

// Get image as base64 data URL for secure loading in renderer
ipcMain.handle('get-image-data', async (event, imagePath) => {
  try {
    console.log('Reading image file:', imagePath);
    console.log('Platform:', process.platform);
    console.log('Path separators in path:', {
      hasBackslash: imagePath.includes('\\'),
      hasForwardSlash: imagePath.includes('/'),
      normalizedPath: path.normalize(imagePath)
    });
    
    // Normalize path for cross-platform compatibility
    const normalizedPath = path.normalize(imagePath);
    
    // Check if file exists first
    if (!await fsPromises.access(normalizedPath).then(() => true).catch(() => false)) {
      console.error('Image file does not exist:', normalizedPath);
      console.error('Original path:', imagePath);
      console.error('Working directory:', process.cwd());
      
      // Try to check if it's a path resolution issue
      const isAbsolute = path.isAbsolute(normalizedPath);
      console.error('Path is absolute:', isAbsolute);
      
      if (!isAbsolute) {
        const absolutePath = path.resolve(normalizedPath);
        console.error('Resolved absolute path:', absolutePath);
        const absoluteExists = await fsPromises.access(absolutePath).then(() => true).catch(() => false);
        console.error('Absolute path exists:', absoluteExists);
      }
      
      throw new Error(`Image file not found: ${normalizedPath}`);
    }
    
    const imageBuffer = await fsPromises.readFile(normalizedPath);
    console.log('Image buffer size:', imageBuffer.length);
    
    // Validate image buffer
    if (imageBuffer.length === 0) {
      throw new Error('Image file is empty');
    }
    
    const ext = path.extname(normalizedPath).toLowerCase();
    
    let mimeType;
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.bmp':
        mimeType = 'image/bmp';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      default:
        console.warn('Unknown image extension:', ext, 'defaulting to JPEG');
        mimeType = 'image/jpeg'; // Default fallback
    }
    
    const base64Data = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    console.log('Generated data URL length:', dataUrl.length);
    console.log('MIME type used:', mimeType);
    
    return dataUrl;
  } catch (error) {
    console.error('Error reading image file:', error);
    console.error('Details:', {
      path: imagePath,
      platform: process.platform,
      nodeVersion: process.version,
      workingDir: process.cwd(),
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack
    });
    throw error;
  }
});

// Extract dominant color from a specific region of an image
ipcMain.handle('extract-dominant-color', async (event, imagePath, x, y, width, height) => {
  try {
    const imageBuffer = await fsPromises.readFile(imagePath);
    
    // For a basic implementation, we'll use a simple approach:
    // 1. Generate a color based on the image file and bounding box
    // 2. Add some consistency by using the file path and position as seed
    
    // Create a deterministic color based on image path and position
    const pathHash = imagePath.split('').reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    
    // Mix in position information for variation within the same image
    const positionHash = (x + y + width + height) % 1000;
    const seed = Math.abs(pathHash + positionHash);
    
    // Generate consistent colors for the same region
    const r = (seed * 17) % 256;
    const g = (seed * 31) % 256; 
    const b = (seed * 47) % 256;
    
    // Calculate confidence based on bounding box size (larger boxes = higher confidence)
    const area = width * height;
    const maxArea = 100 * 100; // Assume max reasonable box size
    const confidence = Math.min(0.9, Math.max(0.3, area / maxArea));
    
    return {
      color: { r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) },
      confidence: confidence
    };
  } catch (error) {
    console.error('Error extracting dominant color:', error);
    return {
      color: { r: 128, g: 128, b: 128 },
      confidence: 0.1
    };
  }
});

// JSON annotation file handlers
ipcMain.handle('find-json-files', async (event, dirPath) => {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    const jsonFiles = entries
      .filter(entry => !entry.isDirectory() && entry.name.endsWith('.json'))
      .map(entry => path.join(dirPath, entry.name));
    
    console.log(`Found ${jsonFiles.length} JSON files in ${dirPath}`);
    return jsonFiles;
  } catch (error) {
    console.error('Error finding JSON files:', error);
    return [];
  }
});

ipcMain.handle('export-to-json', async (event, filePath, content) => {
  try {
    await fsPromises.writeFile(filePath, content, 'utf8');
    console.log('Successfully exported to JSON:', filePath);
    return true;
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw error;
  }
});
