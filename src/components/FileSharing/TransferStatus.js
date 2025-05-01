import React from 'react';
import { formatFileSize } from '../../utils/fileUtils';

/**
 * Enhanced transfer status component that displays detailed information
 * about an ongoing file transfer, including speed and estimated time
 */
const TransferStatus = ({ 
  fileName,
  fileSize, 
  progress, 
  transferSpeed = 0,
  timeRemaining = null,
  isReceiving = true
}) => {
  // Format transfer speed for display
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
  
  // Format remaining time for display
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
  
  // Calculate transfer size display (received/total)
  const getTransferSizeDisplay = () => {
    if (!fileSize) return '';
    
    const receivedSize = Math.floor((fileSize * progress) / 100);
    return `${formatFileSize(receivedSize)} / ${formatFileSize(fileSize)}`;
  };
  
  return (
    <div className="transfer-status my-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <div className="file-info flex items-center">
          <div className="file-icon mr-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-800">{fileName || 'File'}</p>
            <p className="text-sm text-gray-500">{getTransferSizeDisplay()}</p>
          </div>
        </div>
        
        <div className="transfer-progress text-right text-sm">
          <p className="font-medium text-blue-600">{isReceiving ? 'Receiving' : 'Sending'}: {progress}%</p>
          {progress < 100 && (
            <p className="text-gray-500">
              {formatSpeed()} · {formatTimeRemaining()}
            </p>
          )}
          {progress === 100 && (
            <p className="text-green-600 font-medium">Complete</p>
          )}
        </div>
      </div>
      
      <div className="progress-container h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-width duration-300 ease-in-out ${
            progress < 100 ? 'bg-blue-500 progress-bar-animated' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default TransferStatus;