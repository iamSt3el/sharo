/**
 * Encryption service for end-to-end file encryption
 * Uses Web Crypto API with AES-GCM 256-bit encryption
 */

// Generate a random encryption key - FIXED to ensure keys are extractable
export const generateKey = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true, // Set extractable to true so keys can be exported
    ["encrypt", "decrypt"]
  );
};

// Export key to share with peer
export const exportKey = async (key) => {
  try {
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(exportedKey));
  } catch (error) {
    console.error("Error exporting key:", error);
    throw new Error("Failed to export encryption key: " + error.message);
  }
};

// Import key from peer
export const importKey = async (keyData) => {
  try {
    const keyBuffer = new Uint8Array(keyData).buffer;
    return await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256
      },
      true, // Make imported keys extractable too
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error importing key:", error);
    throw new Error("Failed to import encryption key: " + error.message);
  }
};

// Encrypt file chunk
export const encryptData = async (key, data, iv) => {
  try {
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
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data: " + error.message);
  }
};

// Decrypt file chunk
export const decryptData = async (key, data, iv) => {
  try {
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
    console.error("Data type:", typeof data);
    console.error("Data length:", data instanceof ArrayBuffer || data instanceof Blob || data instanceof Uint8Array ? data.byteLength || data.size : 'unknown');
    console.error("IV length:", iv?.length);
    throw error; // Re-throw for proper handling upstream
  }
};

// Generate a random IV for AES-GCM
export const generateIV = () => {
  return window.crypto.getRandomValues(new Uint8Array(12));
};