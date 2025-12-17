"use client";

export default function LoadingSpinner({ message = "Loading", size = "xl", isInline = false }) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg",
    xl: "text-xl"
  };

  const spinnerSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  if (isInline) {
    return (
      <div className="relative inline-flex items-center justify-center">
       
        <div className="absolute inset-0 blur-xl opacity-50 animate-pulse" 
             style={{background: 'var(--accent)'}}></div>
        
        
        <div className={`relative ${spinnerSizes[size]}`}>
          <div className="absolute inset-0 rounded-full border-2 border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin"
               style={{color: 'var(--accent)'}}></div>
        </div>
        
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full animate-pulse"
               style={{backgroundColor: 'var(--accent)'}}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 blur-xl opacity-50 animate-pulse" 
               style={{background: 'var(--accent)'}}></div>
          <div className={`relative ${spinnerSizes[size]}`}>
            <div className="absolute inset-0 rounded-full border-2 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin"
                 style={{color: 'var(--accent)'}}></div>
          </div>
          
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full animate-pulse"
                 style={{backgroundColor: 'var(--accent)'}}></div>
          </div>
        </div>

        
        <div className="flex items-center space-x-1">
          <span className={`font-mono ${sizeClasses[size]} font-semibold`} 
                style={{color: 'var(--accent)'}}>
            {message}
          </span>
          <span className="flex space-x-1">
            <span className="animate-bounce" style={{animationDelay: '0ms', color: 'var(--accent)'}}>.</span>
            <span className="animate-bounce" style={{animationDelay: '150ms', color: 'var(--accent)'}}>.</span>
            <span className="animate-bounce" style={{animationDelay: '300ms', color: 'var(--accent)'}}>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
