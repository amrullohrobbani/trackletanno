export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<DirectoryEntry[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  getRallyFolders: (basePath: string) => Promise<RallyFolder[]>;
  getFrameNumber: (filename: string) => Promise<number>;
  getFilenameFromFrame: (frameIndex: number) => Promise<string>;
  debugDirectory: (dirPath: string) => Promise<{
    totalEntries?: number;
    directories?: string[];
    files?: string[];
    rallyDirectories?: string[];
    error?: string;
  }>;
  getImageData: (imagePath: string) => Promise<string>;
  loadAnnotationFile: (annotationFilePath: string) => Promise<string>;
  saveAnnotationFile: (annotationFilePath: string, content: string) => Promise<boolean>;
}

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface RallyFolder {
  name: string;
  path: string;
  annotationFile: string;
  imageFiles: string[];
}

export interface AnnotationData {
  frame: number;
  tracklet_id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  role: string;
  jersey_number: string;
  jersey_color: string;
  team: string;
  event: string; // New field for spatial temporal events
}

export interface BoundingBox {
  id: string;
  tracklet_id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  team?: string;
  selected?: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
