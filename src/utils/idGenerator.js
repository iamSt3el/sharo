/**
 * Utility functions for generating and validating room IDs
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a short, random room ID
 * @param {number} length - Length of the ID to generate (default: 6)
 * @returns {string} Generated room ID
 */
export const generateRoomId = (length = 6) => {
  // Generate a UUID and take the first few characters
  return uuidv4().substring(0, length);
};

/**
 * Generate a readable room ID using words (easier for users to communicate)
 * @returns {string} Word-based room ID
 */
export const generateReadableRoomId = () => {
  // List of simple, distinct adjectives
  const adjectives = [
    'red', 'blue', 'green', 'bold', 'calm', 'dark', 'easy',
    'fast', 'good', 'kind', 'loud', 'nice', 'proud', 'safe',
    'tall', 'warm', 'wise', 'brave', 'glad', 'shiny'
  ];
  
  // List of simple, distinct nouns
  const nouns = [
    'apple', 'bear', 'cloud', 'dog', 'eagle', 'fish', 'goat',
    'house', 'ice', 'jar', 'king', 'lake', 'moon', 'nest',
    'ocean', 'park', 'queen', 'river', 'star', 'tree'
  ];
  
  // Generate a 3-digit number for additional uniqueness
  const number = Math.floor(Math.random() * 900) + 100;
  
  // Pick random words from each list
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // Combine into a readable, memorable room ID
  return `${adjective}-${noun}-${number}`;
};

/**
 * Validate a room ID
 * @param {string} roomId - Room ID to validate
 * @returns {boolean} Whether the room ID is valid
 */
export const validateRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') {
    return false;
  }
  
  // For alphanumeric IDs, check length and characters
  if (/^[a-zA-Z0-9]+$/.test(roomId)) {
    return roomId.length >= 4 && roomId.length <= 12;
  }
  
  // For readable IDs, check format
  const readableFormat = /^[a-z]+-[a-z]+-\d{3}$/;
  if (readableFormat.test(roomId)) {
    return true;
  }
  
  return false;
};