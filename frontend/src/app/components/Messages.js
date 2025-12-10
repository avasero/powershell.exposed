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

export function InfoMessage({ message, className = "", onClick, clickable = false }) {
  if (!message) return null;

  const handleClick = () => {
    if (onClick && clickable) {
      onClick();
    }
  };

  return (
    <div
      className={`mt-2 text-xs font-mono px-2 break-all ${clickable ? 'cursor-pointer hover:opacity-100 transition-all duration-200 hover:bg-green-500/10 rounded' : ''} ${className}`}
      style={{ color: 'var(--accent)', opacity: clickable ? 0.9 : 0.7, overflowWrap: 'break-word', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
      onClick={handleClick}
      title={clickable ? "Click to use this example" : ""}
    >
      {message} {clickable && <span className="text-green-400 ml-1"></span>}
    </div>
  );
}
