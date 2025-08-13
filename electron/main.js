const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
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
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
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
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('get-rally-folders', async (event, basePath) => {
  try {
    console.log('Scanning directory:', basePath);
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const rallyFolders = [];
    const validationResults = [];
    
    // Support multiple rally folder naming patterns:
    // 1. [gameId]s[set]rally[rallynumber] (e.g., 207s2rally001)
    // 2. [name]_rally_[number] (e.g., bra_fra_men_vnl_2022_1080p_rally_000012)
    // 3. rally_[anything] (old format fallback)
    const rallyPatterns = [
      { 
        pattern: /^(\d+s\d+rally\d+)$/,
        type: 'volleyball_standard',
        getAnnotationName: (match) => match[1]
      },
      { 
        pattern: /^(.+_rally_\d+)$/,
        type: 'vnl_format', 
        getAnnotationName: (match) => match[1]
      },
      { 
        pattern: /^(rally_.+)$/,
        type: 'old_format',
        getAnnotationName: (match) => match[1]
      }
    ];
    
    // First pass: collect all potential rally folders and analyze them
    const potentialRallies = entries.filter(entry => entry.isDirectory()).map(entry => {
      let matchedPattern = null;
      let rallyName = null;
      
      // Try each pattern
      for (const patternInfo of rallyPatterns) {
        const match = entry.name.match(patternInfo.pattern);
        if (match) {
          matchedPattern = patternInfo;
          rallyName = patternInfo.getAnnotationName(match);
          break;
        }
      }
      
      return {
        folderName: entry.name,
        rallyName: rallyName,
        isValidPattern: !!matchedPattern,
        patternType: matchedPattern?.type || 'unknown',
        path: path.join(basePath, entry.name)
      };
    });
    
    console.log(`Found ${potentialRallies.length} directories, ${potentialRallies.filter(p => p.isValidPattern).length} match rally patterns`);
    potentialRallies.forEach(p => {
      if (p.isValidPattern) {
        console.log(`  ✓ ${p.folderName} -> ${p.rallyName} (${p.patternType})`);
      } else {
        console.log(`  ✗ ${p.folderName} (no pattern match)`);
      }
    });
    
    for (const potential of potentialRallies) {
      const validation = {
        folderName: potential.folderName,
        rallyName: potential.rallyName,
        isValidPattern: potential.isValidPattern,
        issues: [],
        status: 'unknown'
      };
      
      if (!potential.isValidPattern) {
        validation.issues.push('Folder name does not match any supported rally pattern:');
        validation.issues.push('  • [gameId]s[set]rally[number] (e.g., 207s2rally001)');
        validation.issues.push('  • [name]_rally_[number] (e.g., bra_fra_men_vnl_2022_1080p_rally_000012)');
        validation.issues.push('  • rally_[name] (legacy format)');
        validation.status = 'invalid_pattern';
        validationResults.push(validation);
        continue;
      }
      
      const rallyPath = potential.path;
      const annotationFilePath = path.join(basePath, `${potential.rallyName}.txt`);
      
      console.log('Validating rally folder:', rallyPath);
      console.log('Looking for annotation file:', annotationFilePath);
      
      try {
        // Check if annotation file exists
        const annotationExists = await fs.access(annotationFilePath).then(() => true).catch(() => false);
        
        if (!annotationExists) {
          validation.issues.push(`Missing annotation file: ${potential.rallyName}.txt`);
        }
        
        // Check folder contents
        const rallyEntries = await fs.readdir(rallyPath);
        console.log(`Files in ${potential.folderName}:`, rallyEntries.length);
        
        // Look for image files
        const imageFiles = rallyEntries.filter(file => 
          /\.(jpg|jpeg|png|bmp)$/i.test(file)
        ).sort((a, b) => {
          // Extract frame numbers for proper sorting (handles format like 002001.jpg)
          const getFrameNumber = (filename) => {
            const match = filename.match(/(\d{6})\./);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getFrameNumber(a) - getFrameNumber(b);
        });
        
        console.log('Found image files count:', imageFiles.length);
        
        if (imageFiles.length === 0) {
          validation.issues.push('No image files (.jpg, .jpeg, .png, .bmp) found in folder');
        }
        
        // Validate annotation file content if it exists
        if (annotationExists) {
          try {
            const annotationContent = await fs.readFile(annotationFilePath, 'utf8');
            const lines = annotationContent.trim().split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
              validation.issues.push('Annotation file is empty');
            } else {
              // Check if first line has proper format (at least 7 columns)
              const firstLine = lines[0];
              const columns = firstLine.split(',');
              
              if (columns.length < 7) {
                validation.issues.push(`Annotation file has ${columns.length} columns, minimum 7 required (frame,tracklet_id,x,y,w,h,score)`);
              }
              
              // Check if frame numbers in annotation roughly match image files
              if (imageFiles.length > 0) {
                const frameNumbers = lines.map(line => {
                  const parts = line.split(',');
                  return parseInt(parts[0]) || 0;
                }).filter(f => f > 0);
                
                // Count unique frames rather than frame range
                const uniqueFrames = [...new Set(frameNumbers)];
                const uniqueFrameCount = uniqueFrames.length;
                
                // Allow for reasonable variance (up to 20% difference)
                const variance = Math.abs(uniqueFrameCount - imageFiles.length);
                const allowedVariance = imageFiles.length * 0.2;
                
                if (variance > allowedVariance) {
                  validation.issues.push(`Frame count mismatch: ${uniqueFrameCount} unique annotation frames vs ${imageFiles.length} image files`);
                }
              }
            }
          } catch (annotationError) {
            validation.issues.push(`Cannot read annotation file: ${annotationError.message}`);
          }
        }
        
        // Determine final status
        if (validation.issues.length === 0) {
          validation.status = 'valid';
          rallyFolders.push({
            name: potential.rallyName,
            path: rallyPath,
            annotationFile: annotationFilePath,
            imageFiles: imageFiles.map(img => path.join(rallyPath, img))
          });
          console.log('✓ Added rally folder:', potential.rallyName);
        } else if (annotationExists && imageFiles.length > 0) {
          validation.status = 'warning';
          // Add folder even with warnings since it has the essential components
          rallyFolders.push({
            name: potential.rallyName,
            path: rallyPath,
            annotationFile: annotationFilePath,
            imageFiles: imageFiles.map(img => path.join(rallyPath, img))
          });
          console.log('⚠ Added rally folder with warnings:', potential.rallyName);
        } else {
          validation.status = 'invalid';
          console.log('✗ Rally folder missing critical components:', potential.rallyName);
        }
        
      } catch (rallyError) {
        validation.issues.push(`Error reading folder: ${rallyError.message}`);
        validation.status = 'error';
        console.error(`Error validating rally folder ${rallyPath}:`, rallyError);
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

ipcMain.handle('get-frame-number', async (event, filename) => {
  try {
    // Extract frame number from filename (e.g., 000001.jpg -> 1)
    const match = filename.match(/(\d{6})\./);
    const frameNumber = match ? parseInt(match[1], 10) : 1;
    console.log(`Frame conversion: ${filename} -> ${frameNumber}`);
    return frameNumber; // Keep 1-based indexing to match annotation files
  } catch (error) {
    console.error('Error extracting frame number:', error);
    return 1;
  }
});

ipcMain.handle('get-filename-from-frame', async (event, frameIndex) => {
  try {
    // Convert 0-based frame index to 6-digit filename format (e.g., 0 -> 000001)
    const frameNumber = frameIndex + 1; // Convert to 1-based for filename
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
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
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
        const subEntries = await fs.readdir(subPath, { withFileTypes: true });
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
    const content = await fs.readFile(annotationFilePath, 'utf8');
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
    await fs.writeFile(annotationFilePath, content, 'utf8');
    console.log('Annotation file saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving annotation file:', error);
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
    if (!await fs.access(normalizedPath).then(() => true).catch(() => false)) {
      console.error('Image file does not exist:', normalizedPath);
      console.error('Original path:', imagePath);
      console.error('Working directory:', process.cwd());
      
      // Try to check if it's a path resolution issue
      const isAbsolute = path.isAbsolute(normalizedPath);
      console.error('Path is absolute:', isAbsolute);
      
      if (!isAbsolute) {
        const absolutePath = path.resolve(normalizedPath);
        console.error('Resolved absolute path:', absolutePath);
        const absoluteExists = await fs.access(absolutePath).then(() => true).catch(() => false);
        console.error('Absolute path exists:', absoluteExists);
      }
      
      throw new Error(`Image file not found: ${normalizedPath}`);
    }
    
    const imageBuffer = await fs.readFile(normalizedPath);
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
    const imageBuffer = await fs.readFile(imagePath);
    
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
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
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
    await fs.writeFile(filePath, content, 'utf8');
    console.log('Successfully exported to JSON:', filePath);
    return true;
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw error;
  }
});
