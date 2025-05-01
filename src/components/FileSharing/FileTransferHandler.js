/**
 * Enhanced file transfer utility hook to handle large files
 * with improved performance and progress tracking
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to manage file transfer state with optimizations for large files
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
  const progressSnapshots = useRef([]);
  
  // Reset transfer state
  const resetTransfer = () => {
    receivedSize.current = 0;
    startTime.current = null;
    lastUpdateTime.current = null;
    speedSamples.current = [];
    progressSnapshots.current = [];
    setProgress(0);
    setTransferSpeed(0);
    setTimeRemaining(null);
    setIsComplete(false);
    
    // Clear any existing interval
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
  };
  
  // Start monitoring the transfer
  const startTransfer = (initialSize = 0) => {
    resetTransfer();
    startTime.current = Date.now();
    lastUpdateTime.current = Date.now();
    receivedSize.current = initialSize;
    
    // Set up polling interval for UI updates even when chunks are slow
    updateInterval.current = setInterval(() => {
      updateTransferStats(0, true);
    }, 1000); // Update every second
  };
  
  // Update progress with a new chunk
  const updateProgress = (chunkSize) => {
    const now = Date.now();
    receivedSize.current += chunkSize;
    
    // Take progress snapshots for more accurate ETA calculation
    progressSnapshots.current.push({
      time: now,
      bytes: receivedSize.current
    });
    
    // Limit the number of snapshots (keep last 10)
    if (progressSnapshots.current.length > 10) {
      progressSnapshots.current.shift();
    }
    
    // Update stats after receiving significant data or enough time has passed
    // This reduces UI jank from too-frequent updates
    if (now - lastUpdateTime.current >= 300) { // 300ms minimum between updates
      updateTransferStats(chunkSize);
      lastUpdateTime.current = now;
    }
  };
  
  // Calculate and update transfer statistics
  const updateTransferStats = (chunkSize = 0, isIntervalUpdate = false) => {
    if (!startTime.current || fileSize <= 0) return;
    
    const now = Date.now();
    const elapsedMs = now - startTime.current;
    const elapsedSeconds = elapsedMs / 1000;
    
    // Calculate percentage - ensure it never exceeds 100%
    const percentage = Math.min(Math.floor((receivedSize.current / fileSize) * 100), 100);
    setProgress(percentage);
    
    // Calculate transfer speed using moving average over time
    if (elapsedSeconds > 0) {
      // Base instant speed calculation
      let instantSpeed = receivedSize.current / elapsedSeconds;
      
      // For more stable calculations, use windowed samples
      if (progressSnapshots.current.length >= 2) {
        const oldestSnapshot = progressSnapshots.current[0];
        const newestSnapshot = progressSnapshots.current[progressSnapshots.current.length - 1];
        
        const snapshotTimespan = (newestSnapshot.time - oldestSnapshot.time) / 1000;
        const bytesDelta = newestSnapshot.bytes - oldestSnapshot.bytes;
        
        if (snapshotTimespan > 0 && bytesDelta > 0) {
          instantSpeed = bytesDelta / snapshotTimespan;
        }
      }
      
      // Add to speed samples (keep a longer window for large files)
      speedSamples.current.push(instantSpeed);
      if (speedSamples.current.length > 8) {
        speedSamples.current.shift();
      }
      
      // Calculate weighted moving average with more emphasis on recent speeds
      let totalWeight = 0;
      let weightedSum = 0;
      
      speedSamples.current.forEach((speed, index) => {
        const weight = index + 1;
        weightedSum += speed * weight;
        totalWeight += weight;
      });
      
      const avgSpeed = totalWeight > 0 ? weightedSum / totalWeight : instantSpeed;
      setTransferSpeed(avgSpeed);
      
      // Estimate time remaining based on average speed and remaining bytes
      if (avgSpeed > 0 && percentage < 100) {
        const bytesRemaining = fileSize - receivedSize.current;
        const secondsRemaining = bytesRemaining / avgSpeed;
        
        // Apply smoothing to time estimates to prevent jumpiness
        // For large files, more aggressive smoothing
        let smoothedTimeRemaining = secondsRemaining;
        if (timeRemaining !== null) {
          const bigFile = fileSize > 100 * 1024 * 1024; // 100MB threshold
          const alpha = bigFile ? 0.8 : 0.6; // Smoothing factor - higher means more smoothing
          smoothedTimeRemaining = (timeRemaining * alpha) + (secondsRemaining * (1 - alpha));
        }
        
        setTimeRemaining(smoothedTimeRemaining);
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
    
    // Check if complete - but don't trigger completion on interval updates
    // This prevents false completions from interval-based UI updates
    if (percentage === 100 && !isComplete && !isIntervalUpdate) {
      completeTransfer();
    }
  };
  
  // Complete the transfer
  const completeTransfer = () => {
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
  
  // Make sure we cleanup on unmount or when transfer is no longer active
  useEffect(() => {
    if (!isActive && updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
    
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
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
  
  // Format time remaining to human-readable format with improved readability
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '--:--';
    if (timeRemaining === 0) return 'Complete';
    
    if (timeRemaining < 1) {
      return 'Almost done';
    }
    
    if (timeRemaining > 3600) {
      // More than an hour, show hours and minutes
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else if (timeRemaining > 60) {
      // More than a minute, show minutes and seconds
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = Math.floor(timeRemaining % 60);
      return `${minutes}m ${seconds}s`;
    } else {
      // Less than a minute, just show seconds
      const seconds = Math.ceil(timeRemaining);
      return `${seconds}s`;
    }
  };
  
  // Custom function to manually control progress - useful for complete 0-100 transitions
  const setManualProgress = (value) => {
    setProgress(Math.min(Math.max(0, value), 100));
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
    resetTransfer,
    setManualProgress
  };
};

export default useFileTransfer;