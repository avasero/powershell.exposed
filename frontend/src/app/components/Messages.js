"use client";

export function ErrorMessage({ message, className = "" }) {
  if (!message) return null;
  
  return (
    <div className={`mt-2 text-xs sm:text-sm font-mono text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2 ${className}`}>
      {message}
    </div>
  );
}

export function SuccessMessage({ message, className = "" }) {
  if (!message) return null;
  
  return (
    <div className={`mt-2 text-xs sm:text-sm font-mono text-green-400 bg-green-900/20 border border-green-500/30 rounded p-2 ${className}`}>
      {message}
    </div>
  );
}

export function InfoMessage({ message, className = "" }) {
  if (!message) return null;
  
  return (
    <div className={`mt-2 text-xs font-mono px-2 ${className}`} style={{color: 'var(--accent)', opacity: 0.7}}>
      💡 {message}
    </div>
  );
}
