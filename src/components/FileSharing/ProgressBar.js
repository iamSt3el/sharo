import React, { useEffect, useState, useRef } from 'react';

/**
 * Enhanced progress bar component for file transfer
 * - Smoother animations for large files
 * - Better visual feedback
 * - Processing state indicator
 * - Animated transitions
 */
const ProgressBar = ({ 
  progress, 
  showPercentage = true, 
  animated = true,
  color = null,
  height = "h-2", // Tailwind height class
  showText = true,
  processingText = null
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const lastProgressRef = useRef(0);
  const animationRef = useRef(null);
  
  // Smooth progress animation, especially important for large files
  // where the progress jumps from 0 to 100% suddenly
  useEffect(() => {
    // Don't animate backwards
    if (progress < lastProgressRef.current) {
      setDisplayProgress(progress);
      lastProgressRef.current = progress;
      return;
    }
    
    // For big jumps (like 0 to 100%), use a timed animation
    if (progress > 0 && displayProgress === 0 && progress - displayProgress > 50) {
      // Clear any existing animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      
      // Start from current display progress
      let currentProgress = displayProgress;
      const targetProgress = progress;
      
      // Calculate animation duration based on the jump size
      // Larger jumps get slower animations to make them feel more natural
      const jumpSize = targetProgress - currentProgress;
      const durationMs = Math.min(Math.max(jumpSize * 30, 500), 3000); // Between 500ms and 3s
      
      // Calculate step size for a smooth animation
      const fps = 30;
      const steps = durationMs / (1000 / fps);
      const step = jumpSize / steps;
      
      // Set up animation interval
      animationRef.current = setInterval(() => {
        currentProgress += step;
        
        if (currentProgress >= targetProgress) {
          // Animation complete
          setDisplayProgress(targetProgress);
          setAnimationComplete(true);
          clearInterval(animationRef.current);
          animationRef.current = null;
        } else {
          setDisplayProgress(currentProgress);
        }
      }, 1000 / fps);
      
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    } else {
      // For small increments, follow immediately or with slight delay
      setDisplayProgress(progress);
    }
    
    lastProgressRef.current = progress;
  }, [progress, displayProgress]);
  
  if (progress <= 0 && displayProgress <= 0) return null;
  
  // Choose bar color based on progress
  const getBarColor = () => {
    if (color) return color;
    
    if (displayProgress < 30) return "bg-blue-600";
    if (displayProgress < 70) return "bg-blue-500";
    if (displayProgress < 100) return "bg-blue-400";
    return "bg-green-600";
  };

  // Include animation classes for in-progress transfers
  const getAnimationClass = () => {
    if (animated && displayProgress > 0 && displayProgress < 100) {
      return "progress-bar-animated";
    }
    return "";
  };
  
  // Get the status text based on progress
  const getStatusText = () => {
    if (displayProgress < 100) {
      return processingText ? processingText : 'Receiving...';
    }
    return 'Complete';
  };
  
  // Round display progress for the UI
  const displayProgressRounded = Math.min(Math.round(displayProgress), 100);
  
  return (
    <div className="w-full mt-6 mb-4">
      <div className={`progress-container ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div 
          className={`h-full rounded-full ${getBarColor()} ${getAnimationClass()}`}
          style={{ 
            width: `${displayProgressRounded}%`, 
            transition: 'width 0.3s ease'
          }}
        ></div>
      </div>
      
      {showPercentage && showText && (
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">{getStatusText()}</span>
          <span className="text-sm font-medium">{displayProgressRounded}%</span>
        </div>
      )}
    </div>
  );
};

// Compact version for smaller UI areas
ProgressBar.Compact = ({ progress, animated = true, color = null }) => {
  return (
    <ProgressBar 
      progress={progress} 
      showPercentage={false} 
      animated={animated} 
      color={color}
      height="h-1"
      showText={false}
    />
  );
};

// Indeterminate version for when we don't know the progress percentage
ProgressBar.Indeterminate = ({ color = "bg-blue-500", height = "h-2" }) => {
  return (
    <div className="w-full mt-6 mb-4">
      <div className={`progress-container ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div 
          className={`${color} h-full rounded-full progress-indeterminate`}
          style={{ width: '40%' }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;