"use client";

export default function LoadingSpinner({ message = "Loading...", size = "xl" }) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg",
    xl: "text-xl"
  };

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
        <span className={`font-mono ${sizeClasses[size]}`} style={{color: 'var(--accent)'}}>
          {message}
        </span>
      </div>
    </div>
  );
}
