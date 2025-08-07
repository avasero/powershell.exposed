"use client";
import { useRef, useEffect } from 'react';

export default function CommandInput({ 
  value, 
  onChange, 
  onSubmit,
  placeholder = "Type a PowerShell command...", 
  error = "",
  disabled = false 
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate the new height based on content, with limits
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // Máximo 4-5 linhas
      const minHeight = 50;  // Altura mínima
      
      const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
      textareaRef.current.style.height = newHeight + 'px';
      
      // Remove any scrollbars if content fits
      if (scrollHeight <= maxHeight) {
        textareaRef.current.style.overflowY = 'hidden';
      } else {
        textareaRef.current.style.overflowY = 'auto';
      }
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

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg overflow-hidden border-2 ${error ? 'border-red-500' : ''}`} style={{backgroundColor: 'var(--card-bg)', borderColor: error ? '#ef4444' : 'var(--border-color)'}}>
      <span className="px-3 sm:px-4 py-3 font-mono text-sm sm:text-base border-b sm:border-b-0 sm:border-r border-opacity-30 flex-shrink-0" style={{color: 'var(--accent)', borderColor: 'var(--border-color)'}}>
        PS &gt;
      </span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 font-mono px-3 sm:px-4 py-3 border-none outline-none resize-none min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] no-scrollbar text-sm sm:text-base"
        style={{
          backgroundColor: 'var(--card-bg)', 
          color: 'var(--foreground)',
          overflowY: 'hidden'
        }}
        disabled={disabled}
        rows={1}
      />
    </div>
  );
}
