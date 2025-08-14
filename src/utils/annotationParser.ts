import { AnnotationData } from '@/types/electron';

/**
 * Parse annotation data from CSV content with flexible column support
 * Supports formats from 7 to 12 columns
 * 
 * Minimum format (7 columns): frame,tracklet_id,x,y,w,h,score
 * Full format (12 columns): frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team,event
 */
export function parseAnnotations(csvContent: string): AnnotationData[] {
  const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '');
  const annotations: AnnotationData[] = [];

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

      // Parse optional fields with defaults
      const role = columns[7] || '';
      const jersey_number = columns[8] || '';
      const jersey_color = columns[9] || '';
      const team = columns[10] || '';
      let event = columns[11] || ''; // New event field
      
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
 * Convert annotations back to CSV format
 * Always exports in full 12-column format for consistency
 */
export function annotationsToCSV(annotations: AnnotationData[]): string {
  const lines = annotations.map(ann => {
    // Convert empty event back to 'no_event' for CSV export if needed
    // For now, keep it as empty string for uniformity as requested
    const event = ann.event || '';
    return `${ann.frame},${ann.tracklet_id},${ann.x},${ann.y},${ann.w},${ann.h},${ann.score},${ann.role || ''},${ann.jersey_number || ''},${ann.jersey_color || ''},${ann.team || ''},${event}`;
  });
  return lines.join('\n');
}
