/**
 * A utility hook to handle file transfer state in both sender and receiver
 * This helps coordinate UI updates for large file transfers
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to manage file transfer state
 * @param {Object} options - Configuration options
 * @param {number} options.fileSize - Total file size in bytes
 * @param {function} options.onProgress - Optional callback for progress updates
 * @param {function} options.onComplete - Optional callback when transfer completes
 * @param {boolean} options.isActive - Whether the transfer is currently active
 * @returns {Object} Transfer state and control functions
 */
export const useFileTransfer = ({
  fileSize = 0,
  onProgress = null,
  onComplete = null,
  isActive = false
}) => {
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0); // bytes per second
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Refs for tracking state between renders
  const receivedSize = useRef(0);
  const startTime = useRef(null);
  const lastUpdateTime = useRef(null);
  const speedSamples = useRef([]);
  const updateInterval = useRef(null);
  
  // Reset transfer state
  const resetTransfer = () => {
    receivedSize.current = 0;
    startTime.current = null;
    lastUpdateTime.current = null;
    speedSamples.current = [];
    setProgress(0);
    setTransferSpeed(0);
    setTimeRemaining(null);
    setIsComplete(false);
  };
  
  // Start monitoring the transfer
  const startTransfer = (initialSize = 0) => {
    resetTransfer();
    startTime.current = Date.now();
    lastUpdateTime.current = Date.now();
    receivedSize.current = initialSize;
    
    // Clear any existing interval
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }
    
    // Set up polling interval for UI updates even when chunks are slow
    updateInterval.current = setInterval(() => {
      updateTransferStats();
    }, 1000); // Update every second
  };
  
  // Update progress with a new chunk
  const updateProgress = (chunkSize) => {
    const now = Date.now();
    receivedSize.current += chunkSize;
    
    // Only calculate speed every ~500ms to smooth out readings
    if (now - lastUpdateTime.current >= 500) {
      updateTransferStats();
      lastUpdateTime.current = now;
    }
  };
  
  // Calculate and update transfer statistics
  const updateTransferStats = () => {
    if (!startTime.current || fileSize <= 0) return;
    
    const now = Date.now();
    const elapsedSeconds = (now - startTime.current) / 1000;
    
    // Calculate percentage
    const percentage = Math.min(Math.floor((receivedSize.current / fileSize) * 100), 100);
    setProgress(percentage);
    
    // Calculate transfer speed as a moving average
    if (elapsedSeconds > 0) {
      const currentSpeed = receivedSize.current / elapsedSeconds;
      
      // Add to speed samples (keep last 5 samples)
      speedSamples.current.push(currentSpeed);
      if (speedSamples.current.length > 5) {
        speedSamples.current.shift();
      }
      
      // Calculate average speed
      const avgSpeed = speedSamples.current.reduce((sum, speed) => sum + speed, 0) / 
                        speedSamples.current.length;
      setTransferSpeed(avgSpeed);
      
      // Estimate time remaining
      if (avgSpeed > 0 && percentage < 100) {
        const bytesRemaining = fileSize - receivedSize.current;
        const secondsRemaining = bytesRemaining / avgSpeed;
        setTimeRemaining(secondsRemaining);
      } else if (percentage === 100) {
        setTimeRemaining(0);
      }
    }
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress({
        progress: percentage,
        bytesReceived: receivedSize.current,
        totalBytes: fileSize,
        speed: transferSpeed,
        timeRemaining
      });
    }
    
    // Check if complete
    if (percentage === 100 && !isComplete) {
      setIsComplete(true);
      if (onComplete) {
        onComplete({
          bytesReceived: receivedSize.current,
          totalBytes: fileSize,
          elapsedTime: elapsedSeconds
        });
      }
      
      // Clear the update interval
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
    }
  };
  
  // Complete the transfer
  const completeTransfer = () => {
    updateTransferStats();
    setProgress(100);
    setIsComplete(true);
    
    if (onComplete) {
      const elapsedSeconds = (Date.now() - startTime.current) / 1000;
      onComplete({
        bytesReceived: receivedSize.current,
        totalBytes: fileSize,
        elapsedTime: elapsedSeconds
      });
    }
    
    // Clear the update interval
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
  };
  
  // Clean up on unmount or when transfer is no longer active
  useEffect(() => {
    if (!isActive && updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
    
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [isActive]);
  
  // Format transfer speed to human-readable format
  const formatSpeed = () => {
    if (transferSpeed === 0) return '-- KB/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = transferSpeed;
    let unitIndex = 0;
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024;
      unitIndex++;
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`;
  };
  
  // Format time remaining to human-readable format
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '--:--';
    if (timeRemaining === 0) return 'Complete';
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
    } else {
      return `${seconds} sec`;
    }
  };
  
  return {
    progress,
    transferSpeed,
    timeRemaining,
    isComplete,
    formatSpeed,
    formatTimeRemaining,
    startTransfer,
    updateProgress,
    completeTransfer,
    resetTransfer
  };
};

export default useFileTransfer;