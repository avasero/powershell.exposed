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
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 cursor-target relative bg-black border-2 border-green-500/50 text-green-400/80 hover:border-green-500 hover:text-green-400 font-black font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all overflow-hidden group";
  
  const sizeClasses = {
    sm: "h-8 px-4 py-2 text-xs",
    md: "h-10 px-6 py-3 text-sm", 
    lg: "h-12 px-8 py-4 text-base",
    xl: "h-14 px-12 py-7 text-xl"
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
