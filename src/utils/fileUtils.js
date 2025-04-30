/**
 * Utility functions for file handling
 */

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Read a file as an ArrayBuffer
   * @param {File} file - File to read
   * @param {number} offset - Byte offset to start reading
   * @param {number} length - Number of bytes to read
   * @returns {Promise<ArrayBuffer>} File chunk as ArrayBuffer
   */
  export const readFileChunk = (file, offset, length) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const slice = file.slice(offset, offset + length);
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      
      reader.readAsArrayBuffer(slice);
    });
  };
  
  /**
   * Create a download link for a file blob
   * @param {Blob} blob - File blob
   * @param {string} fileName - Name for the downloaded file
   * @returns {string} URL for downloading the file
   */
  export const createDownloadLink = (blob, fileName) => {
    return {
      url: URL.createObjectURL(blob),
      name: fileName,
      size: blob.size,
      type: blob.type
    };
  };
  
  /**
   * Revoke a blob URL to free up memory
   * @param {string} url - Blob URL to revoke
   */
  export const revokeDownloadLink = (url) => {
    URL.revokeObjectURL(url);
  };