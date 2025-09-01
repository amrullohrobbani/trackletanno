import { AnnotationData } from '@/types/electron';

// Type for tracklet details
export interface TrackletDetails {
  tracklet_id: number;
  role: string;
  jersey_number: string;
  jersey_color: string;
  team: string;
}

/**
 * Parse annotation data from CSV content with flexible column support
 * Supports formats from 7 to 12 columns
 * 
 * Minimum format (7 columns): frame,tracklet_id,x,y,w,h,score
 * Full format (12 columns): frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team,event
 */
export function parseAnnotations(csvContent: string, trackletDetails?: TrackletDetails[]): AnnotationData[] {
  const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '');
  const annotations: AnnotationData[] = [];

  // Create a map for quick tracklet details lookup
  const trackletMap = new Map<number, TrackletDetails>();
  if (trackletDetails) {
    trackletDetails.forEach(detail => {
      trackletMap.set(detail.tracklet_id, detail);
    });
  }

  for (const line of lines) {
    const columns = line.split(',').map(col => col.trim());
    
    // Minimum required columns: frame,tracklet_id,x,y,w,h,score (7 columns)
    if (columns.length < 7) {
      console.warn(`Skipping line with insufficient columns (${columns.length}): ${line}`);
      continue;
    }

    try {
      // Parse required fields
      const frame = parseInt(columns[0], 10);
      const tracklet_id = parseInt(columns[1], 10);
      const x = parseFloat(columns[2]);
      const y = parseFloat(columns[3]);
      const w = parseFloat(columns[4]);
      const h = parseFloat(columns[5]);
      const score = parseFloat(columns[6]);

      // Get tracklet details from separate file or fallback to frame-level data
      const trackletDetail = trackletMap.get(tracklet_id);
      const role = trackletDetail?.role || columns[7] || '';
      const jersey_number = trackletDetail?.jersey_number || columns[8] || '';
      const jersey_color = trackletDetail?.jersey_color || columns[9] || '';
      const team = trackletDetail?.team || columns[10] || '';
      
      // Event is always from frame-level data
      let event = columns[11] || '';
      
      // Normalize no_event to empty string for uniformity
      if (event === 'no_event') {
        event = '';
      }

      // Validate required numeric fields
      if (isNaN(frame) || isNaN(tracklet_id) || isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || isNaN(score)) {
        console.warn(`Skipping line with invalid numeric values: ${line}`);
        continue;
      }

      const annotation: AnnotationData = {
        frame,
        tracklet_id,
        x,
        y,
        w,
        h,
        score,
        role,
        jersey_number,
        jersey_color,
        team,
        ...(event && { event }) // Only include event field if it's not empty
      };

      annotations.push(annotation);
    } catch (error) {
      console.warn(`Error parsing line: ${line}`, error);
    }
  }

  console.log(`Parsed ${annotations.length} annotations from ${lines.length} lines`);
  return annotations;
}

/**
 * Parse tracklet details from CSV content
 * Format: tracklet_id,role,jersey_number,jersey_color,team
 */
export function parseTrackletDetails(csvContent: string): TrackletDetails[] {
  const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '');
  const trackletDetails: TrackletDetails[] = [];

  for (const line of lines) {
    const columns = line.split(',').map(col => col.trim());
    
    // Required columns: tracklet_id,role,jersey_number,jersey_color,team (5 columns)
    if (columns.length < 5) {
      console.warn(`Skipping tracklet line with insufficient columns (${columns.length}): ${line}`);
      continue;
    }

    try {
      const tracklet_id = parseInt(columns[0], 10);
      const role = columns[1] || '';
      const jersey_number = columns[2] || '';
      const jersey_color = columns[3] || '';
      const team = columns[4] || '';

      // Validate tracklet_id
      console.log(tracklet_id);
      if (isNaN(tracklet_id)) {
        console.warn(`Skipping tracklet line with invalid tracklet_id: ${line}`);
        continue;
      }

      const trackletDetail: TrackletDetails = {
        tracklet_id,
        role,
        jersey_number,
        jersey_color,
        team
      };

      trackletDetails.push(trackletDetail);
    } catch (error) {
      console.warn(`Error parsing tracklet line: ${line}`, error);
    }
  }

  console.log(`Parsed ${trackletDetails.length} tracklet details from ${lines.length} lines`);
  return trackletDetails;
}

/**
 * Convert annotations back to CSV format for frame-level file
 * Always exports in full 12-column format with spaces after commas
 * Tracklet details (role, jersey_number, jersey_color, team) are kept empty
 */
export function annotationsToCSV(annotations: AnnotationData[]): string {
  const lines = annotations.map(ann => {
    // Keep events as empty string for uniformity
    const event = ann.event || '';
    // Keep tracklet details empty in frame-level file (they go to separate tracklet file)
    return `${ann.frame}, ${ann.tracklet_id}, ${ann.x}, ${ann.y}, ${ann.w}, ${ann.h}, ${ann.score}, , , , , ${event}`;
  });
  return lines.join('\n');
}

/**
 * Convert tracklet details to CSV format
 * Format: tracklet_id, role, jersey_number, jersey_color, team
 */
export function trackletDetailsToCSV(trackletDetails: TrackletDetails[]): string {
  const header = 'tracklet_id, role, jersey_number, jersey_color, team';
  const lines = trackletDetails.map(detail => {
    return `${detail.tracklet_id}, ${detail.role || ''}, ${detail.jersey_number || ''}, ${detail.jersey_color || ''}, ${detail.team || ''}`;
  });
  return [header, ...lines].join('\n');
}

/**
 * Extract unique tracklet details from annotations
 * This helps migrate from old format to new format
 */
export function extractTrackletDetailsFromAnnotations(annotations: AnnotationData[]): TrackletDetails[] {
  const trackletMap = new Map<number, TrackletDetails>();

  annotations.forEach(ann => {
    if (!trackletMap.has(ann.tracklet_id)) {
      // Only add if we have some meaningful tracklet data
      if (ann.role || ann.jersey_number || ann.jersey_color || ann.team) {
        trackletMap.set(ann.tracklet_id, {
          tracklet_id: ann.tracklet_id,
          role: ann.role || '',
          jersey_number: ann.jersey_number || '',
          jersey_color: ann.jersey_color || '',
          team: ann.team || ''
        });
      }
    }
  });

  return Array.from(trackletMap.values()).sort((a, b) => a.tracklet_id - b.tracklet_id);
}

/**
 * Generate tracklet file path from frame file path
 * Example: 'path/rally.txt' -> 'path/rally_tracklets.txt'
 */
export function getTrackletFilePath(frameFilePath: string): string {
  const lastDotIndex = frameFilePath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return frameFilePath + '_tracklets.txt';
  }
  
  const baseName = frameFilePath.substring(0, lastDotIndex);
  const extension = frameFilePath.substring(lastDotIndex);
  return `${baseName}_tracklets${extension}`;
}
