import { AnnotationData } from '@/types/electron';

// Ball-specific constants
export const BALL_TRACKLET_ID = 99;
export const BALL_POINT_SIZE = 8; // Size of ball point annotation

// JSON annotation format interfaces
export interface JsonTrack {
  track_id: number;
  attributes: {
    role: string;
    jersey_number: string | null;
    team: string | null;
  };
  bbox: {
    x: number | null;
    y: number | null;
    w: number | null;
    h: number | null;
  };
  event: string | null;
}

export interface JsonFrameAnnotation {
  frame: string;
  tracks: JsonTrack[];
}

export interface JsonAnnotationFile {
  video_source: string;
  annotations: JsonFrameAnnotation[];
}

/**
 * Parse JSON annotation file and extract ball annotations
 * Converts ball position points to TXT format with tracklet ID 99
 * Rescales coordinates from 224x224 to target resolution (matching current canvas)
 */
export function parseJsonBallAnnotations(jsonContent: string, targetWidth: number = 1920, targetHeight: number = 1080): AnnotationData[] {
  try {
    const data: JsonAnnotationFile = JSON.parse(jsonContent);
    const annotations: AnnotationData[] = [];
    const processedFrames = new Set<number>(); // Track processed frames to avoid duplicates

    // Source resolution from JSON (assuming 224x224)
    const sourceWidth = 224;
    const sourceHeight = 224;

    console.log(`Ball annotation scaling: ${sourceWidth}x${sourceHeight} → ${targetWidth}x${targetHeight}`);

    for (const frameAnnotation of data.annotations) {
      // Extract frame number from filename (e.g., "002001.jpg" -> 2001)
      const frameNumber = parseInt(frameAnnotation.frame.replace(/\D/g, ''), 10);
      
      // Skip if this frame was already processed (duplicate prevention)
      if (processedFrames.has(frameNumber)) {
        console.warn(`Duplicate frame ${frameNumber} detected, skipping...`);
        continue;
      }
      
      for (const track of frameAnnotation.tracks) {
        // Only process ball annotations
        if (track.attributes.role === 'ball' && track.bbox.x !== null && track.bbox.y !== null) {
          // Scale coordinates from 224x224 to target resolution
          const scaledX = (track.bbox.x / sourceWidth) * targetWidth;
          const scaledY = (track.bbox.y / sourceHeight) * targetHeight;
          
          const annotation: AnnotationData = {
            frame: frameNumber,
            tracklet_id: BALL_TRACKLET_ID,
            x: scaledX,
            y: scaledY,
            w: BALL_POINT_SIZE, // Use small fixed size for ball point
            h: BALL_POINT_SIZE,
            score: 1.0, // Default score for manual annotations
            role: 'ball',
            jersey_number: '',
            jersey_color: '',
            team: '',
            event: track.event || ''
          };
          
          annotations.push(annotation);
          processedFrames.add(frameNumber); // Mark frame as processed
        }
      }
    }

    console.log(`Parsed ${annotations.length} ball annotations from JSON (scaled from ${sourceWidth}x${sourceHeight} to ${targetWidth}x${targetHeight})`);
    return annotations;
  } catch (error) {
    console.error('Error parsing JSON ball annotations:', error);
    return [];
  }
}

/**
 * Convert TXT annotations to JSON format
 * Groups annotations by frame and converts to JSON structure
 * Scales coordinates back from target resolution to 224x224
 */
export function convertAnnotationsToJson(
  annotations: AnnotationData[], 
  videoSource: string = "../207s2rally001",
  targetWidth: number = 1920,
  targetHeight: number = 1080
): string {
  const jsonData: JsonAnnotationFile = {
    video_source: videoSource,
    annotations: []
  };

  // Target resolution for JSON export (224x224)
  const exportWidth = 224;
  const exportHeight = 224;

  // Group annotations by frame
  const frameGroups = new Map<number, AnnotationData[]>();
  for (const annotation of annotations) {
    if (!frameGroups.has(annotation.frame)) {
      frameGroups.set(annotation.frame, []);
    }
    frameGroups.get(annotation.frame)!.push(annotation);
  }

  // Convert each frame group to JSON format
  const sortedFrames = Array.from(frameGroups.keys()).sort((a, b) => a - b);
  
  for (const frameNumber of sortedFrames) {
    const frameAnnotations = frameGroups.get(frameNumber)!;
    const frameFilename = String(frameNumber).padStart(6, '0') + '.jpg';
    
    const tracks: JsonTrack[] = [];
    
    for (const annotation of frameAnnotations) {
      // Scale coordinates back to 224x224 for ball annotations
      let exportX = annotation.x;
      let exportY = annotation.y;
      
      if (annotation.tracklet_id === BALL_TRACKLET_ID) {
        exportX = (annotation.x / targetWidth) * exportWidth;
        exportY = (annotation.y / targetHeight) * exportHeight;
      }
        
      const track: JsonTrack = {
        track_id: annotation.tracklet_id === BALL_TRACKLET_ID ? 0 : annotation.tracklet_id,
        attributes: {
          role: annotation.role || (annotation.tracklet_id === BALL_TRACKLET_ID ? 'ball' : 'player'),
          jersey_number: annotation.jersey_number || null,
          team: annotation.team || null
        },
        bbox: {
          x: exportX,
          y: exportY,
          // For ball annotations, don't include w/h or set them to null
          w: annotation.tracklet_id === BALL_TRACKLET_ID ? null : annotation.w,
          h: annotation.tracklet_id === BALL_TRACKLET_ID ? null : annotation.h
        },
        event: annotation.event || null
      };
      
      tracks.push(track);
    }
    
    jsonData.annotations.push({
      frame: frameFilename,
      tracks: tracks
    });
  }

  return JSON.stringify(jsonData, null, 4);
}

/**
 * Check if a directory contains JSON annotation files
 */
export async function findJsonAnnotationFiles(directoryPath: string): Promise<string[]> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return [];
  }

  try {
    const entries = await window.electronAPI.readDirectory(directoryPath);
    const jsonFiles = entries
      .filter(entry => !entry.isDirectory && entry.name.endsWith('.json'))
      .map(entry => entry.path);
    
    console.log(`Found ${jsonFiles.length} JSON files in ${directoryPath}`);
    return jsonFiles;
  } catch (error) {
    console.error('Error finding JSON annotation files:', error);
    return [];
  }
}

/**
 * Load and merge JSON ball annotations from all JSON files in directory
 * Filters by video_source to match current rally folder
 */
export async function loadJsonBallAnnotations(directoryPath: string, targetWidth: number = 1920, targetHeight: number = 1080, currentRallyName?: string): Promise<AnnotationData[]> {
  const jsonFiles = await findJsonAnnotationFiles(directoryPath);
  let allAnnotations: AnnotationData[] = [];

  console.log(`Loading ball annotations for rally: ${currentRallyName || 'any'}`);

  for (const jsonFile of jsonFiles) {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const content = await window.electronAPI.readFile(jsonFile);
        
        // Parse the JSON to check video_source
        const jsonData: JsonAnnotationFile = JSON.parse(content);
        
        // If we have a current rally name, check if this JSON file matches
        if (currentRallyName) {
          // Extract rally name from video_source path (e.g., "/home/vanyi/new_samples/217s3rally028" -> "217s3rally028")
          const videoSourceRallyName = jsonData.video_source.split(/[/\\]/).pop() || '';
          
          // Only process this JSON file if it matches the current rally
          if (videoSourceRallyName !== currentRallyName) {
            console.log(`Skipping JSON file ${jsonFile}: video_source "${videoSourceRallyName}" doesn't match current rally "${currentRallyName}"`);
            continue;
          }
          
          console.log(`✓ Processing JSON file ${jsonFile}: video_source matches rally "${currentRallyName}"`);
        }
        
        const annotations = parseJsonBallAnnotations(content, targetWidth, targetHeight);
        allAnnotations = allAnnotations.concat(annotations);
      }
    } catch (error) {
      console.error(`Error loading JSON file ${jsonFile}:`, error);
    }
  }

  console.log(`Loaded total ${allAnnotations.length} ball annotations from ${jsonFiles.length} JSON files for rally ${currentRallyName || 'any'}`);
  return allAnnotations;
}

/**
 * Export annotations to JSON file
 */
export async function exportAnnotationsToJson(
  annotations: AnnotationData[], 
  outputPath: string,
  videoSource?: string,
  targetWidth: number = 1920,
  targetHeight: number = 1080
): Promise<boolean> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return false;
  }

  try {
    const jsonContent = convertAnnotationsToJson(annotations, videoSource, targetWidth, targetHeight);
    await window.electronAPI.writeFile(outputPath, jsonContent);
    console.log(`Exported ${annotations.length} annotations to JSON: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('Error exporting annotations to JSON:', error);
    return false;
  }
}
