/**
 * Encryption service for end-to-end file encryption
 * Uses Web Crypto API with AES-GCM 256-bit encryption
 */

// Generate a random encryption key
export const generateKey = async () => {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
  };
  
  // Export key to share with peer
  export const exportKey = async (key) => {
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(exportedKey));
  };
  
  // Import key from peer
  export const importKey = async (keyData) => {
    const keyBuffer = new Uint8Array(keyData).buffer;
    return await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );
  };
  
  // Encrypt file chunk
  export const encryptData = async (key, data, iv) => {
    // Ensure data is in the correct format (ArrayBuffer)
    let dataBuffer = data;
    if (data instanceof Blob) {
      dataBuffer = await data.arrayBuffer();
    } else if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
      throw new Error("Data must be ArrayBuffer, Uint8Array, or Blob");
    }
    
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      dataBuffer
    );
    
    return encryptedData;
  };
  
  // Decrypt file chunk
  export const decryptData = async (key, data, iv) => {
    // Ensure data is in the correct format (ArrayBuffer)
    let dataBuffer = data;
    
    // Handle various potential input types
    if (data instanceof Blob) {
      dataBuffer = await data.arrayBuffer();
    } else if (data instanceof Uint8Array) {
      dataBuffer = data.buffer;
    } else if (!(data instanceof ArrayBuffer)) {
      console.error("Invalid data type for decryption:", typeof data, data);
      throw new Error("Data must be ArrayBuffer, Uint8Array, or Blob");
    }
    
    try {
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        dataBuffer
      );
      
      return decryptedData;
    } catch (error) {
      console.error("Decryption failed:", error);
      console.error("Data type:", typeof dataBuffer);
      console.error("Data length:", dataBuffer.byteLength);
      console.error("IV length:", iv.length);
      throw error; // Re-throw for proper handling upstream
    }
  };
  
  // Generate a random IV for AES-GCM
  export const generateIV = () => {
    return window.crypto.getRandomValues(new Uint8Array(12));
  };