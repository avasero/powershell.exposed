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
  
  const CHARACTER_LIMIT = 5000;
  const MAX_ROWS = 10;
  const MIN_HEIGHT = 50;
  const LINE_HEIGHT = 24; // Approximate line height in pixels
  const MAX_HEIGHT = MIN_HEIGHT + (LINE_HEIGHT * (MAX_ROWS - 2)); // Account for padding

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate the new height based on content, with limits
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, scrollHeight));
      
      textareaRef.current.style.height = newHeight + 'px';
      
      // Enable scrolling if content exceeds max height
      if (scrollHeight > MAX_HEIGHT) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [value, MAX_HEIGHT]);

  // Check character limit and show warning
  useEffect(() => {
    if (value.length >= CHARACTER_LIMIT - 100) { // Show warning 100 chars before limit
      setShowCharacterWarning(true);
    } else {
      setShowCharacterWarning(false);
    }
  }, [value]);

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSubmit && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Enforce character limit
    if (newValue.length <= CHARACTER_LIMIT) {
      onChange(e);
    }
    // If at limit, still call onChange but don't update value
    // This allows parent components to handle the limit behavior
  };

  return (
    <div className="w-full">
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg overflow-hidden border-2 ${error ? 'border-red-500' : showCharacterWarning ? 'border-yellow-500' : ''}`} style={{backgroundColor: 'var(--card-bg)', borderColor: error ? '#ef4444' : showCharacterWarning ? '#eab308' : 'var(--border-color)'}}>
        <span className="px-3 sm:px-4 py-3 font-mono text-sm sm:text-base border-b sm:border-b-0 sm:border-r border-opacity-30 flex-shrink-0" style={{color: 'var(--accent)', borderColor: 'var(--border-color)'}}>
          PS &gt;
        </span>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full font-mono px-3 sm:px-4 py-3 border-none outline-none resize-none text-sm sm:text-base"
            style={{
              backgroundColor: 'var(--card-bg)', 
              color: 'var(--foreground)',
              minHeight: `${MIN_HEIGHT}px`,
              maxHeight: `${MAX_HEIGHT}px`,
              lineHeight: `${LINE_HEIGHT}px`
            }}
            disabled={disabled}
            rows={1}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-2 right-7 text-xs font-mono opacity-60" style={{color: value.length >= CHARACTER_LIMIT - 100 ? 'var(--warning)' : 'var(--muted-foreground)'}}>
            {value.length}/{CHARACTER_LIMIT}
          </div>
        </div>
      </div>
      
      {/* Character limit warning */}
      {showCharacterWarning && (
        <div className="mt-2 text-sm font-mono flex items-center gap-2" style={{color: 'var(--warning)'}}>
          <span>⚠️</span>
          <span>
            {value.length >= CHARACTER_LIMIT 
              ? "Your search is capped at 5000 characters" 
              : `Approaching character limit (${CHARACTER_LIMIT - value.length} remaining)`
            }
          </span>
        </div>
      )}
      
      {/* Multi-line help text */}
      {value.includes('\n') && (
        <div className="mt-1 text-xs font-mono opacity-60" style={{color: 'var(--muted-foreground)'}}>
          💡 Multi-line command detected. Press Shift+Enter for new lines, Enter to analyze.
        </div>
      )}
    </div>
  );
}
