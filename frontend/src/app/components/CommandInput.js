"use client";
import { useRef, useEffect, useState } from 'react';

export default function CommandInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a PowerShell command...",
  error = "",
  disabled = false
}) {
  const textareaRef = useRef(null);
  const [showCharacterWarning, setShowCharacterWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const CHARACTER_LIMIT = 10000;
  const MAX_ROWS = 10;
  const MIN_HEIGHT = 50;
  const LINE_HEIGHT = 24;
  const MAX_HEIGHT = MIN_HEIGHT + (LINE_HEIGHT * (MAX_ROWS - 2));

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Dynamic height adjustment - disabled on mobile to prevent resize issues
  useEffect(() => {
    if (textareaRef.current) {
      // On mobile, keep fixed height to prevent shrinking when keyboard opens
      if (isMobile) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        textareaRef.current.style.overflowY = 'auto';
        return;
      }

      textareaRef.current.style.height = 'auto';

      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, scrollHeight));

      textareaRef.current.style.height = newHeight + 'px';

      if (scrollHeight > MAX_HEIGHT) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [value, MAX_HEIGHT, isMobile]);


  useEffect(() => {
    if (value.length >= CHARACTER_LIMIT - 100) {
      setShowCharacterWarning(true);
    } else {
      setShowCharacterWarning(false);
    }
  }, [value]);

  const handleKeyDown = (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSubmit && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;

    // Enforce character limit (no trimming - preserve whitespace)
    if (newValue.length <= CHARACTER_LIMIT) {
      onChange(e);
    }
    // If at limit, still call onChange but don't update value
    // This allows parent components to handle the limit behavior
  };

  return (
    <div className="w-full">
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg overflow-hidden border-2 ${error ? 'border-red-500' : showCharacterWarning ? 'border-yellow-500' : 'border-green-500/30'} bg-black/80 hover:border-green-500/50 transition-all`} style={{ borderColor: error ? '#ef4444' : showCharacterWarning ? '#eab308' : 'rgba(34, 197, 94, 0.3)' }}>
        <span className="px-3 sm:px-4 py-3 font-mono text-sm sm:text-base border-b sm:border-b-0 sm:border-r border-opacity-30 flex-shrink-0" style={{ color: 'var(--accent)', borderColor: 'var(--border-color)' }}>
          PS &gt;
        </span>
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full font-mono px-3 sm:px-4 py-3 border-none outline-none resize-none text-sm sm:text-base bg-transparent"
            style={{
              color: 'var(--foreground)',
              minHeight: `${MIN_HEIGHT}px`,
              maxHeight: `${MAX_HEIGHT}px`,
              lineHeight: `${LINE_HEIGHT}px`
            }}
            disabled={disabled}
            rows={1}
          />
        </div>
      </div>

      {(value.length > 0 || showCharacterWarning) && (
        <div className="flex justify-between mt-1">
          <div className="flex-1">
            {showCharacterWarning && (
              <div className="text-sm font-mono flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                <span>
                  {value.length >= CHARACTER_LIMIT
                    ? "Your search is capped at 10000 characters"
                    : `Approaching character limit (${CHARACTER_LIMIT - value.length} remaining)`
                  }
                </span>
              </div>
            )}

            {value.includes('\n') && (
              <div className="text-xs font-mono opacity-60 ml-4" style={{ color: 'var(--muted-foreground)' }}>
                Multi-line command detected. Press Shift+Enter for new lines, Enter to analyze.
              </div>
            )}
          </div>
          {value.length > 0 && (
            <span className="text-xs mr-2 font-mono opacity-60 ml-2 whitespace-nowrap " style={{ color: value.length >= CHARACTER_LIMIT - 100 ? 'var(--warning)' : 'var(--muted-foreground)' }}>
              {value.length}/{CHARACTER_LIMIT}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
