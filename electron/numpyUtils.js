const { fromArrayBuffer } = require('numpy-parser');
const npyjs = require('npyjs');

/**
 * Load a numpy (.npy) file and return the data as a 3x3 matrix
 * @param {Buffer} buffer - The file buffer
 * @returns {number[][]} - 3x3 matrix
 */
function loadHomographyFromNpy(buffer) {
  try {
    // Convert Buffer to ArrayBuffer for numpy-parser
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const array = fromArrayBuffer(arrayBuffer);
    
    // Reshape flat array to 3x3 matrix
    if (array.shape.length !== 2 || array.shape[0] !== 3 || array.shape[1] !== 3) {
      throw new Error(`Expected 3x3 matrix, got shape: [${array.shape.join(',')}]`);
    }
    
    const matrix = [];
    let index = 0;
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        row.push(array.data[index++]);
      }
      matrix.push(row);
    }
    
    return matrix;
  } catch (error) {
    throw new Error(`Failed to load homography from .npy file: ${error.message}`);
  }
}

/**
 * Save a 3x3 matrix as a numpy (.npy) file
 * Creates a .npy file compatible with numpy-parser
 * @param {number[][]} matrix - 3x3 matrix
 * @returns {Buffer} - Buffer containing the .npy file data
 */
function saveHomographyToNpy(matrix) {
  try {
    // Validate input is 3x3 matrix
    if (!Array.isArray(matrix) || matrix.length !== 3) {
      throw new Error('Matrix must be a 3x3 array');
    }
    
    for (let i = 0; i < 3; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== 3) {
        throw new Error('Matrix must be a 3x3 array');
      }
    }
    
    // Flatten matrix to 1D array
    const flatData = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        flatData.push(matrix[i][j]);
      }
    }
    
    // Convert to Float64Array for proper numpy format
    const typedArray = new Float64Array(flatData);
    
    // Create .npy file manually with proper header format
    // that's compatible with numpy-parser
    const magic = Buffer.from([0x93, 0x4E, 0x55, 0x4D, 0x50, 0x59]); // "\x93NUMPY"
    const version = Buffer.from([0x01, 0x00]); // version 1.0
    
    // Create header dict with proper spacing (compatible with numpy-parser)
    const headerDict = "{'descr': '<f8', 'fortran_order': False, 'shape': (3, 3), }";
    
    // Header length must be divisible by 64 bytes (including the 10-byte prefix)
    const totalHeaderBytesNeeded = Math.ceil((10 + headerDict.length + 1) / 64) * 64;
    const paddingNeeded = totalHeaderBytesNeeded - 10 - headerDict.length - 1;
    const padding = ' '.repeat(paddingNeeded);
    const fullHeaderDict = headerDict + padding;
    
    const headerLength = Buffer.alloc(2);
    headerLength.writeUInt16LE(fullHeaderDict.length + 1); // +1 for newline
    
    const newline = Buffer.from([0x0A]); // '\n'
    const headerBuffer = Buffer.concat([magic, version, headerLength, Buffer.from(fullHeaderDict), newline]);
    
    // Data buffer
    const dataBuffer = Buffer.from(typedArray.buffer);
    
    return Buffer.concat([headerBuffer, dataBuffer]);
  } catch (error) {
    throw new Error(`Failed to save homography to .npy file: ${error.message}`);
  }
}

/**
 * Test the round-trip conversion (load -> save -> load)
 * @param {Buffer} originalBuffer - Original .npy file buffer
 * @returns {boolean} - True if round-trip is successful
 */
function testRoundTrip(originalBuffer) {
  try {
    console.log('Testing numpy round-trip conversion...');
    
    // Load original
    const originalMatrix = loadHomographyFromNpy(originalBuffer);
    console.log('Original matrix loaded:', originalMatrix);
    
    // Save to new buffer
    const newBuffer = saveHomographyToNpy(originalMatrix);
    console.log('Matrix saved to new buffer, size:', newBuffer.length);
    
    // Load from new buffer
    const newMatrix = loadHomographyFromNpy(newBuffer);
    console.log('New matrix loaded:', newMatrix);
    
    // Compare matrices
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const diff = Math.abs(originalMatrix[i][j] - newMatrix[i][j]);
        if (diff > 1e-10) {
          console.error(`Matrix values differ at [${i},${j}]: ${originalMatrix[i][j]} vs ${newMatrix[i][j]}`);
          return false;
        }
      }
    }
    
    console.log('✅ Round-trip test successful!');
    return true;
  } catch (error) {
    console.error('❌ Round-trip test failed:', error.message);
    return false;
  }
}

module.exports = {
  loadHomographyFromNpy,
  saveHomographyToNpy,
  testRoundTrip
};