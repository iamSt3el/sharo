import React from 'react';

/**
 * Progress bar component for file transfer
 */
const ProgressBar = ({ progress, showPercentage = true }) => {
  if (progress <= 0) return null;
  
  // Choose bar color based on progress
  const getBarColor = () => {
    if (progress < 30) return "bg-blue-600";
    if (progress < 70) return "bg-blue-500";
    if (progress < 100) return "bg-blue-400";
    return "bg-green-600";
  };
  
  return (
    <div className="w-full mt-6">
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div 
          className={`h-4 rounded-full ${getBarColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {showPercentage && (
        <p className="text-center mt-1 text-sm text-gray-600">{progress}%</p>
      )}
    </div>
  );
};

export default ProgressBar;