const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  getRallyFolders: (basePath) => ipcRenderer.invoke('get-rally-folders', basePath),
  getFrameNumber: (filename) => ipcRenderer.invoke('get-frame-number', filename),
  getFilenameFromFrame: (frameIndex) => ipcRenderer.invoke('get-filename-from-frame', frameIndex),
  debugDirectory: (dirPath) => ipcRenderer.invoke('debug-directory', dirPath),
  getImageData: (imagePath) => ipcRenderer.invoke('get-image-data', imagePath),
  loadAnnotationFile: (annotationFilePath) => ipcRenderer.invoke('load-annotation-file', annotationFilePath),
  saveAnnotationFile: (annotationFilePath, content) => ipcRenderer.invoke('save-annotation-file', annotationFilePath, content),
  readPatchNotes: () => ipcRenderer.invoke('read-patch-notes'),
  extractDominantColor: (imagePath, x, y, width, height) => ipcRenderer.invoke('extract-dominant-color', imagePath, x, y, width, height),
  findJsonFiles: (dirPath) => ipcRenderer.invoke('find-json-files', dirPath),
  exportToJson: (filePath, content) => ipcRenderer.invoke('export-to-json', filePath, content),
  saveFieldRegistration: (data) => ipcRenderer.invoke('save-field-registration', data),
  loadFieldRegistration: (data) => ipcRenderer.invoke('load-field-registration', data),
});
