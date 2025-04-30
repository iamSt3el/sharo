import React from 'react';

/**
 * Reusable button component with different variants
 */
const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  type = 'button'
}) => {
  // Base styles
  const baseStyles = "py-2 px-4 rounded font-medium transition-colors";
  
  // Width styles
  const widthStyles = fullWidth ? "w-full" : "";
  
  // Variant styles
  let variantStyles = "";
  
  switch (variant) {
    case 'primary':
      variantStyles = "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300";
      break;
    case 'secondary':
      variantStyles = "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400";
      break;
    case 'success':
      variantStyles = "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300";
      break;
    case 'danger':
      variantStyles = "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300";
      break;
    case 'outline':
      variantStyles = "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-300";
      break;
    default:
      variantStyles = "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300";
  }
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles} ${widthStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;