import React from 'react';

/**
 * Enhanced progress bar component for file transfer
 * Includes animation for active transfers and better visual feedback
 */
const ProgressBar = ({ progress, showPercentage = true, animated = true }) => {
  if (progress <= 0) return null;
  
  // Choose bar color based on progress
  const getBarColor = () => {
    if (progress < 30) return "bg-blue-600";
    if (progress < 70) return "bg-blue-500";
    if (progress < 100) return "bg-blue-400";
    return "bg-green-600";
  };

  // Include animation classes for in-progress transfers
  const getAnimationClass = () => {
    if (animated && progress > 0 && progress < 100) {
      return "progress-bar-animated";
    }
    return "";
  };
  
  return (
    <div className="w-full mt-6 mb-4">
      <div className="progress-container">
        <div 
          className={`h-full rounded-full ${getBarColor()} ${getAnimationClass()}`}
          style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
        ></div>
      </div>
      
      {showPercentage && (
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">{progress < 100 ? 'Receiving...' : 'Complete'}</span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;