import { AnnotationData } from '@/types/electron';

// Debug utility for tracking annotation-frame connections
export const debugAnnotationFrameConnection = (imagePath: string, annotations: AnnotationData[], frameNumber: number) => {
  console.group(`🔍 Frame-Annotation Debug: ${imagePath}`);
  
  // Extract filename from path (handle both Windows and Unix path separators)
  const filename = imagePath.split(/[/\\]/).pop() || '';
  console.log(`📁 Image filename: ${filename}`);
  console.log(`🔢 Extracted frame number: ${frameNumber}`);
  
  // Filter annotations for this frame
  const frameAnnotations = annotations.filter(ann => ann.frame === frameNumber);
  const boundingBoxAnnotations = frameAnnotations.filter(ann => ann.tracklet_id !== 99);
  const ballAnnotations = frameAnnotations.filter(ann => ann.tracklet_id === 99);
  
  console.log(`📊 Total annotations in dataset: ${annotations.length}`);
  console.log(`🎯 Annotations for frame ${frameNumber}: ${frameAnnotations.length}`);
  console.log(`📦 Bounding box annotations: ${boundingBoxAnnotations.length}`);
  console.log(`⚽ Ball annotations: ${ballAnnotations.length}`);
  
  if (frameAnnotations.length > 0) {
    console.log('📋 Frame annotations:', frameAnnotations);
  } else {
    // Check nearby frames for debugging
    const nearbyFrames = [frameNumber - 1, frameNumber + 1];
    nearbyFrames.forEach(nearbyFrame => {
      const nearbyAnnotations = annotations.filter(ann => ann.frame === nearbyFrame);
      if (nearbyAnnotations.length > 0) {
        console.log(`🔍 Frame ${nearbyFrame} has ${nearbyAnnotations.length} annotations`);
      }
    });
  }
  
  // Check for common issues
  const uniqueFrames = [...new Set(annotations.map(ann => ann.frame))].sort((a, b) => a - b);
  console.log(`📈 Available frames in dataset: ${uniqueFrames.slice(0, 10)}${uniqueFrames.length > 10 ? '...' : ''} (${uniqueFrames.length} total)`);
  
  if (!uniqueFrames.includes(frameNumber)) {
    console.warn(`⚠️ Frame ${frameNumber} not found in dataset!`);
    if (uniqueFrames.length > 0) {
      const closest = uniqueFrames.reduce((prev, curr) => 
        Math.abs(curr - frameNumber) < Math.abs(prev - frameNumber) ? curr : prev
      );
      console.log(`🎯 Closest available frame: ${closest}`);
    } else {
      console.warn(`⚠️ No frames available in dataset - empty annotation set`);
    }
  }
  
  console.groupEnd();
  
  return {
    frameNumber,
    totalAnnotations: annotations.length,
    frameAnnotations: frameAnnotations.length,
    boundingBoxCount: boundingBoxAnnotations.length,
    ballAnnotationCount: ballAnnotations.length,
    availableFrames: uniqueFrames,
    hasFrameData: uniqueFrames.includes(frameNumber)
  };
};

export const debugFrameNavigation = (currentIndex: number, imageFiles: string[], annotations: AnnotationData[]) => {
  console.group(`🎬 Frame Navigation Debug`);
  console.log(`📍 Current frame index: ${currentIndex}`);
  console.log(`📁 Total image files: ${imageFiles.length}`);
  
  if (imageFiles[currentIndex]) {
    const currentImageFile = imageFiles[currentIndex];
    const filename = currentImageFile.split(/[/\\]/).pop() || '';
    const frameNumber = parseInt(filename.replace(/\D/g, ''), 10);
    
    console.log(`🖼️ Current image: ${filename}`);
    console.log(`🔢 Frame number: ${frameNumber}`);
    
    debugAnnotationFrameConnection(currentImageFile, annotations, frameNumber);
  }
  
  console.groupEnd();
};
