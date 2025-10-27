/**
 * Homography calculation utilities for field registration
 * JavaScript implementation of homography calculation similar to OpenCV's findHomography
 */

interface Point2D {
  x: number;
  y: number;
}

interface HomographyResult {
  matrix: number[][];
  error: number;
}

/**
 * Calculate homography matrix using DLT (Direct Linear Transform) algorithm
 * @param srcPoints Source points (image space)
 * @param dstPoints Destination points (template space)
 * @returns 3x3 homography matrix
 */
export function calculateHomography(srcPoints: Point2D[], dstPoints: Point2D[]): number[][] {
  if (srcPoints.length !== dstPoints.length || srcPoints.length < 4) {
    throw new Error('Need at least 4 corresponding points for homography calculation');
  }

  // Use DLT algorithm to calculate homography
  const result = calculateHomographyDLT(srcPoints, dstPoints);
  
  if (!result || !result.matrix) {
    throw new Error('Failed to calculate homography matrix');
  }

  return result.matrix;
}

/**
 * Direct Linear Transform (DLT) algorithm for homography calculation
 */
function calculateHomographyDLT(srcPoints: Point2D[], dstPoints: Point2D[]): HomographyResult | null {
  const numPoints = srcPoints.length;
  
  // Create the A matrix for the system Ah = 0
  // Each point correspondence gives us 2 equations
  const A: number[][] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const x1 = srcPoints[i].x;
    const y1 = srcPoints[i].y;
    const x2 = dstPoints[i].x;
    const y2 = dstPoints[i].y;
    
    // First equation: x2(h31*x1 + h32*y1 + h33) = h11*x1 + h12*y1 + h13
    // Rearranged: -h11*x1 - h12*y1 - h13 + 0 + 0 + 0 + h31*x1*x2 + h32*y1*x2 + h33*x2 = 0
    A.push([-x1, -y1, -1, 0, 0, 0, x1 * x2, y1 * x2, x2]);
    
    // Second equation: y2(h31*x1 + h32*y1 + h33) = h21*x1 + h22*y1 + h23
    // Rearranged: 0 + 0 + 0 - h21*x1 - h22*y1 - h23 + h31*x1*y2 + h32*y1*y2 + h33*y2 = 0
    A.push([0, 0, 0, -x1, -y1, -1, x1 * y2, y1 * y2, y2]);
  }
  
  // Solve using SVD (Singular Value Decomposition)
  const svdResult = svd(A);
  if (!svdResult) {
    return null;
  }
  
  // The solution is the last column of V (corresponding to smallest singular value)
  const h = svdResult.V[svdResult.V.length - 1];
  
  // Reshape into 3x3 matrix
  const H = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
  
  // Normalize by making H[2][2] = 1 (if possible)
  if (Math.abs(H[2][2]) > 1e-10) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        H[i][j] /= H[2][2];
      }
    }
  }
  
  // Calculate reprojection error
  const error = calculateReprojectionError(srcPoints, dstPoints, H);
  
  return { matrix: H, error };
}

/**
 * Simple SVD implementation for small matrices
 * This is a simplified version focused on finding the null space
 */
function svd(A: number[][]): { U: number[][], S: number[], V: number[][] } | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m === 0 || n === 0) return null;
  
  // For homography, we typically have 8+ equations and 9 unknowns
  // We need to find the null space of A^T * A
  const AtA = multiplyMatrices(transpose(A), A);
  
  // Use power iteration to find the eigenvector with smallest eigenvalue
  const nullVector = findNullSpace(AtA);
  
  if (!nullVector) return null;
  
  return {
    U: [], // Not needed for our use case
    S: [], // Not needed for our use case
    V: [nullVector] // The null space vector
  };
}

/**
 * Find the null space (eigenvector corresponding to smallest eigenvalue)
 */
function findNullSpace(matrix: number[][]): number[] | null {
  const n = matrix.length;
  
  // Start with a random vector
  let v = Array(n).fill(0).map(() => Math.random() - 0.5);
  
  // Normalize
  let norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  v = v.map(x => x / norm);
  
  // Inverse power iteration to find smallest eigenvalue
  for (let iter = 0; iter < 100; iter++) {
    const oldV = [...v];
    
    // Solve (A + λI)v = oldV where λ is a small shift
    const shifted = matrix.map((row, i) => 
      row.map((val, j) => i === j ? val + 1e-6 : val)
    );
    
    const solvedV = solveLinearSystem(shifted, oldV);
    if (!solvedV) return null;
    v = solvedV;
    
    // Normalize
    norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    if (norm < 1e-10) return null;
    v = v.map(x => x / norm);
    
    // Check convergence
    const diff = v.reduce((sum, val, i) => sum + Math.abs(val - oldV[i]), 0);
    if (diff < 1e-8) break;
  }
  
  return v;
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  
  // Create augmented matrix
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    if (maxRow !== i) {
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    }
    
    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      // Try to continue with regularization
      augmented[i][i] = 1e-10;
    }
    
    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  
  return x;
}

/**
 * Matrix multiplication helper
 */
function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  
  const result: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < inner; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  
  return result;
}

/**
 * Matrix transpose helper
 */
function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  const result: number[][] = Array(cols).fill(0).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  
  return result;
}

/**
 * Calculate reprojection error
 */
function calculateReprojectionError(srcPoints: Point2D[], dstPoints: Point2D[], H: number[][]): number {
  let totalError = 0;
  
  for (let i = 0; i < srcPoints.length; i++) {
    const projected = transformPoint(srcPoints[i], H);
    const dx = projected.x - dstPoints[i].x;
    const dy = projected.y - dstPoints[i].y;
    totalError += Math.sqrt(dx * dx + dy * dy);
  }
  
  return totalError / srcPoints.length;
}

/**
 * Transform a point using homography matrix
 * @param point Input point
 * @param H 3x3 homography matrix
 * @returns Transformed point
 */
export function transformPoint(point: Point2D, H: number[][]): Point2D {
  const x = point.x;
  const y = point.y;
  
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  
  if (Math.abs(w) < 1e-10) {
    throw new Error('Point at infinity in homography transformation');
  }
  
  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w
  };
}

/**
 * Transform multiple points using homography matrix
 */
export function transformPoints(points: Point2D[], H: number[][]): Point2D[] {
  return points.map(point => transformPoint(point, H));
}

/**
 * Get the inverse of a homography matrix
 */
export function invertHomography(H: number[][]): number[][] {
  // Calculate determinant
  const det = 
    H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
    H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
    H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('Homography matrix is singular and cannot be inverted');
  }
  
  // Calculate inverse using adjugate matrix
  const inv: number[][] = [
    [
      (H[1][1] * H[2][2] - H[1][2] * H[2][1]) / det,
      (H[0][2] * H[2][1] - H[0][1] * H[2][2]) / det,
      (H[0][1] * H[1][2] - H[0][2] * H[1][1]) / det
    ],
    [
      (H[1][2] * H[2][0] - H[1][0] * H[2][2]) / det,
      (H[0][0] * H[2][2] - H[0][2] * H[2][0]) / det,
      (H[0][2] * H[1][0] - H[0][0] * H[1][2]) / det
    ],
    [
      (H[1][0] * H[2][1] - H[1][1] * H[2][0]) / det,
      (H[0][1] * H[2][0] - H[0][0] * H[2][1]) / det,
      (H[0][0] * H[1][1] - H[0][1] * H[1][0]) / det
    ]
  ];
  
  return inv;
}

/**
 * Convert homography matrix to format suitable for saving as .npy file
 */
export function homographyToNumpyFormat(H: number[][]): Float64Array {
  const flat = new Float64Array(9);
  let index = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      flat[index++] = H[i][j];
    }
  }
  return flat;
}

/**
 * Load homography matrix from numpy format
 */
export function homographyFromNumpyFormat(data: Float64Array | number[]): number[][] {
  if (data.length !== 9) {
    throw new Error('Invalid homography data: expected 9 elements');
  }
  
  const H: number[][] = Array(3).fill(0).map(() => Array(3).fill(0));
  let index = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      H[i][j] = data[index++];
    }
  }
  return H;
}