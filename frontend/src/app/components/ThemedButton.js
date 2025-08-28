"use client";

export default function ThemedButton({ 
  children, 
  variant = "primary", 
  size = "md", 
  disabled = false, 
  loading = false,
  className = "",
  ...props 
}) {
  const baseClasses = "font-mono font-semibold rounded transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95";
  
  const sizeClasses = {
    sm: "px-3 py-1 text-xs sm:text-sm",
    md: "px-4 py-2 text-sm sm:text-base", 
    lg: "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base",
    xl: "px-6 py-3 text-base sm:text-lg"
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--accent)',
      color: 'var(--background)',
      border: 'none'
    },
    secondary: {
      backgroundColor: 'var(--card-bg)',
      color: 'var(--secondary)',
      borderColor: 'var(--secondary)',
      border: '1px solid'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--accent)',
      borderColor: 'var(--accent)',
      border: '1px solid'
    }
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'currentColor'}}></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
