import React from 'react';

/**
 * Enhanced status message component to display transfer status
 * with better visual feedback and animations
 */
const StatusMessage = ({ status, type = 'info' }) => {
  if (!status) return null;
  
  // Define styles based on message type
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let borderColor = 'border-gray-300';
  let icon = null;
  
  switch (type) {
    case 'success':
      bgColor = 'bg-green-50';
      textColor = 'text-green-800';
      borderColor = 'border-green-300';
      icon = (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;
    case 'error':
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
      borderColor = 'border-red-300';
      icon = (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      break;
    case 'warning':
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-300';
      icon = (
        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-800';
      borderColor = 'border-blue-300';
      icon = (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;
  }
  
  return (
    <div className={`status-message ${bgColor} ${textColor} border ${borderColor} rounded flex items-start animate-fadeIn`}>
      {icon}
      <p>{status}</p>
    </div>
  );
};

// Define a smaller, inline version of the status message for use in tighter UI areas
StatusMessage.Inline = ({ status, type = 'info' }) => {
  if (!status) return null;
  
  // Choose icon based on status type
  let icon;
  let textColor;
  
  switch (type) {
    case 'success':
      textColor = 'text-green-600';
      icon = (
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;
    case 'error':
      textColor = 'text-red-600';
      icon = (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      break;
    case 'warning':
      textColor = 'text-yellow-600';
      icon = (
        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case 'info':
    default:
      textColor = 'text-blue-600';
      icon = (
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;
  }
  
  return (
    <div className={`inline-flex items-center ${textColor} text-sm`}>
      {icon}
      <span className="ml-1">{status}</span>
    </div>
  );
};

export default StatusMessage;