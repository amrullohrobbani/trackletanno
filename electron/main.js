const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const isDev = process.env.NODE_ENV === 'development';

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
    
    // Look for folders matching the pattern [gameId]s[set]rally[rallynumber]
    // and corresponding .txt files with the same name
    const rallyPattern = /^(\d+s\d+rally\d+)$/;
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = entry.name.match(rallyPattern);
        if (match) {
          const rallyName = match[1];
          const rallyPath = path.join(basePath, entry.name);
          const annotationFilePath = path.join(basePath, `${rallyName}.txt`);
          
          console.log('Checking rally folder:', rallyPath);
          console.log('Looking for annotation file:', annotationFilePath);
          
          try {
            // Check if annotation file exists
            const annotationExists = await fs.access(annotationFilePath).then(() => true).catch(() => false);
            
            if (annotationExists) {
              const rallyEntries = await fs.readdir(rallyPath);
              console.log('Files in rally folder:', rallyEntries.length);
              
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
              
              if (imageFiles.length > 0) {
                rallyFolders.push({
                  name: rallyName,
                  path: rallyPath,
                  annotationFile: annotationFilePath,
                  imageFiles: imageFiles.map(img => path.join(rallyPath, img))
                });
                console.log('Added rally folder:', rallyName);
              } else {
                console.log('Rally folder missing image files:', rallyName);
              }
            } else {
              console.log('Annotation file not found for:', rallyName);
            }
          } catch (rallyError) {
            console.error(`Error reading rally folder ${rallyPath}:`, rallyError);
          }
        }
      }
    }
    
    // Fallback: look for the old rally_ pattern for backward compatibility
    if (rallyFolders.length === 0) {
      console.log('No new format rally folders found, checking old format...');
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('rally_')) {
          const rallyPath = path.join(basePath, entry.name);
          console.log('Checking old format rally folder:', rallyPath);
          
          try {
            const rallyEntries = await fs.readdir(rallyPath);
            console.log('Files in rally folder:', rallyEntries);
            
            // Look for annotation file and images
            const annotationFile = rallyEntries.find(file => file.endsWith('.txt'));
            const imageFiles = rallyEntries.filter(file => 
              /\.(jpg|jpeg|png|bmp)$/i.test(file)
            ).sort((a, b) => {
              // Extract frame numbers for proper sorting (handles format like 000001.jpg)
              const getFrameNumber = (filename) => {
                const match = filename.match(/(\d{6})\./);
                return match ? parseInt(match[1], 10) : 0;
              };
              return getFrameNumber(a) - getFrameNumber(b);
            });
            
            console.log('Found annotation file:', annotationFile);
            console.log('Found image files count:', imageFiles.length);
            
            if (annotationFile && imageFiles.length > 0) {
              rallyFolders.push({
                name: entry.name,
                path: rallyPath,
                annotationFile: path.join(rallyPath, annotationFile),
                imageFiles: imageFiles.map(img => path.join(rallyPath, img))
              });
              console.log('Added old format rally folder:', entry.name);
            } else {
              console.log('Old format rally folder missing required files:', entry.name);
            }
          } catch (rallyError) {
            console.error(`Error reading old format rally folder ${rallyPath}:`, rallyError);
          }
        }
      }
    }
    
    console.log('Total rally folders found:', rallyFolders.length);
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
    const imageBuffer = await fs.readFile(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    
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
      default:
        mimeType = 'image/jpeg'; // Default fallback
    }
    
    const base64Data = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error('Error reading image file:', error);
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
