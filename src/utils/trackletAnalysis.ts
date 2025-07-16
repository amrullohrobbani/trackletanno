import { AnnotationData, TrackletAnalysis, IDAnalysisResult, DominantColor } from '@/types/electron';

/**
 * Analyze tracklet IDs for continuity issues, missing frames, and potential player switching
 */
export async function analyzeTrackletIDs(
  annotations: AnnotationData[], 
  rallyPath: string
): Promise<IDAnalysisResult> {
  // Group annotations by tracklet ID
  const trackletGroups = new Map<number, AnnotationData[]>();
  
  annotations.forEach(ann => {
    if (!trackletGroups.has(ann.tracklet_id)) {
      trackletGroups.set(ann.tracklet_id, []);
    }
    trackletGroups.get(ann.tracklet_id)!.push(ann);
  });

  const trackletAnalyses: TrackletAnalysis[] = [];
  
  // Analyze each tracklet
  for (const [trackletId, trackletAnnotations] of trackletGroups) {
    const analysis = await analyzeTracklet(trackletId, trackletAnnotations, rallyPath);
    trackletAnalyses.push(analysis);
  }

  // Calculate overall statistics
  const problematicTracklets = trackletAnalyses.filter(t => 
    t.suspectedSwitching || t.missingFrames.length > 0 || t.colorConsistency < 0.7
  ).length;

  const overallScore = trackletAnalyses.length > 0 
    ? trackletAnalyses.reduce((sum, t) => sum + (t.colorConsistency * 0.7 + (t.missingFrames.length === 0 ? 0.3 : 0)), 0) / trackletAnalyses.length
    : 1.0;

  return {
    tracklets: trackletAnalyses,
    totalTracklets: trackletGroups.size,
    problematicTracklets,
    overallScore
  };
}

/**
 * Analyze a single tracklet for issues
 */
async function analyzeTracklet(
  trackletId: number, 
  annotations: AnnotationData[], 
  rallyPath: string
): Promise<TrackletAnalysis> {
  // Sort annotations by frame
  const sortedAnns = annotations.sort((a, b) => a.frame - b.frame);
  
  const firstFrame = sortedAnns[0].frame;
  const lastFrame = sortedAnns[sortedAnns.length - 1].frame;
  const totalFrames = lastFrame - firstFrame + 1;
  
  // Find missing frames
  const presentFrames = new Set(sortedAnns.map(ann => ann.frame));
  const missingFrames: number[] = [];
  
  for (let frame = firstFrame; frame <= lastFrame; frame++) {
    if (!presentFrames.has(frame)) {
      missingFrames.push(frame);
    }
  }

  // Calculate continuity gaps (sequences of missing frames)
  const continuityGaps = calculateContinuityGaps(missingFrames);

  // Extract dominant colors from actual bounding box regions
  const dominantColors = await extractDominantColorsFromBoundingBoxes(sortedAnns, rallyPath);
  
  // Calculate color consistency based on extracted colors
  const colorConsistency = calculateColorConsistencyFromColors(dominantColors);
  
  // Detect potential switching based on color changes and gaps
  const suspectedSwitching = detectPotentialSwitching(sortedAnns, missingFrames, colorConsistency);

  return {
    trackletId,
    totalFrames,
    missingFrames,
    continuityGaps,
    dominantColors,
    colorConsistency,
    suspectedSwitching,
    firstFrame,
    lastFrame
  };
}

/**
 * Extract dominant colors from bounding box regions using Electron API
 */
async function extractDominantColorsFromBoundingBoxes(
  annotations: AnnotationData[], 
  rallyPath: string
): Promise<DominantColor[]> {
  const dominantColors: DominantColor[] = [];
  
  // Only sample every few frames to avoid too many API calls
  const sampleRate = Math.max(1, Math.floor(annotations.length / 10)); // Sample up to 10 frames
  
  for (let i = 0; i < annotations.length; i += sampleRate) {
    const ann = annotations[i];
    
    try {
      // Construct image path - assuming images are named by frame number
      const imageFile = `${String(ann.frame).padStart(6, '0')}.jpg`;
      const imagePath = `${rallyPath}/${imageFile}`;
      
      // Check if we have access to Electron API
      if (typeof window !== 'undefined' && window.electronAPI) {
        const colorResult = await window.electronAPI.extractDominantColor(
          imagePath, 
          ann.x, 
          ann.y, 
          ann.w, 
          ann.h
        );
        
        dominantColors.push({
          frame: ann.frame,
          color: colorResult.color,
          confidence: colorResult.confidence
        });
      }
    } catch (error) {
      console.warn(`Failed to extract color for frame ${ann.frame}:`, error);
      // Add a fallback neutral color
      dominantColors.push({
        frame: ann.frame,
        color: { r: 128, g: 128, b: 128 },
        confidence: 0.1
      });
    }
  }
  
  return dominantColors;
}

/**
 * Calculate color consistency from extracted dominant colors
 */
function calculateColorConsistencyFromColors(dominantColors: DominantColor[]): number {
  if (dominantColors.length === 0) return 0.5; // Neutral score if no color data
  
  // Calculate color distance between consecutive frames
  let totalDistance = 0;
  let comparisons = 0;
  
  for (let i = 1; i < dominantColors.length; i++) {
    const color1 = dominantColors[i - 1].color;
    const color2 = dominantColors[i].color;
    
    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
    
    // Normalize distance (max distance in RGB space is ~441)
    const normalizedDistance = distance / 441;
    totalDistance += normalizedDistance;
    comparisons++;
  }
  
  if (comparisons === 0) return 0.5;
  
  const averageDistance = totalDistance / comparisons;
  // Convert distance to consistency (1 - distance, so lower distance = higher consistency)
  return Math.max(0, 1 - averageDistance);
}
function calculateContinuityGaps(missingFrames: number[]): number {
  if (missingFrames.length === 0) return 0;
  
  let gaps = 1;
  for (let i = 1; i < missingFrames.length; i++) {
    if (missingFrames[i] !== missingFrames[i - 1] + 1) {
      gaps++;
    }
  }
  
  return gaps;
}

/**
 * Detect potential player switching based on various factors
 */
function detectPotentialSwitching(
  annotations: AnnotationData[], 
  missingFrames: number[], 
  colorConsistency: number
): boolean {
  // Switching indicators:
  // 1. Low color consistency
  // 2. Large gaps in continuity
  // 3. Changes in team assignment
  // 4. Changes in jersey number
  
  const hasLowColorConsistency = colorConsistency < 0.6;
  const hasLargeGaps = missingFrames.length > annotations.length * 0.3;
  
  // Check for team changes
  const teams = annotations.map(ann => ann.team).filter(team => team && team.trim() !== '');
  const uniqueTeams = new Set(teams);
  const hasTeamChanges = uniqueTeams.size > 1;
  
  // Check for jersey number changes
  const jerseyNumbers = annotations.map(ann => ann.jersey_number).filter(num => num && num.trim() !== '');
  const uniqueJerseyNumbers = new Set(jerseyNumbers);
  const hasJerseyNumberChanges = uniqueJerseyNumbers.size > 1;
  
  return hasLowColorConsistency || hasLargeGaps || hasTeamChanges || hasJerseyNumberChanges;
}

/**
 * Get a color for visualizing tracklet quality
 */
export function getQualityColor(analysis: TrackletAnalysis): string {
  if (analysis.suspectedSwitching) return '#ef4444'; // red
  if (analysis.missingFrames.length > 0) return '#f97316'; // orange
  if (analysis.colorConsistency < 0.7) return '#eab308'; // yellow
  return '#22c55e'; // green
}

/**
 * Get a human-readable status for a tracklet
 */
export function getTrackletStatus(analysis: TrackletAnalysis): string {
  if (analysis.suspectedSwitching) return 'Suspected switching';
  if (analysis.missingFrames.length > analysis.totalFrames * 0.3) return 'Many missing frames';
  if (analysis.missingFrames.length > 0) return 'Some missing frames';
  if (analysis.colorConsistency < 0.7) return 'Inconsistent colors';
  return 'Good';
}
