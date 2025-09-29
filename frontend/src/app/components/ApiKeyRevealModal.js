"use client";
import { useState } from 'react';
import ThemedButton from './ThemedButton';

export default function ApiKeyRevealModal({ apiKey, onClose, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        if (onCopy) onCopy();
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full border-2 shadow-xl"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--accent)',
          color: 'var(--foreground)'
        }}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔑</div>
          <h3 className="text-lg font-mono font-bold" style={{color: 'var(--accent)'}}>
            API Key Created Successfully!
          </h3>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded border" style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--destructive)',
            borderWidth: '2px'
          }}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">⚠️</span>
              <span className="font-mono font-bold text-sm" style={{color: 'var(--destructive)'}}>
                IMPORTANT - READ CAREFULLY
              </span>
            </div>
            <p className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
              This is the <strong>only time</strong> your API Key will be shown in full. 
              Copy it now as it will be masked after closing this popup.
            </p>
          </div>

          <div>
            <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
              Your new API Key:
            </label>
            <div className="space-y-3">
              <code 
                className="block p-3 rounded border font-mono text-sm break-all select-all"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--accent)',
                  color: 'var(--foreground)',
                  borderWidth: '2px'
                }}
              >
                {apiKey}
              </code>
              
              <ThemedButton
                onClick={handleCopy}
                className="w-full"
                style={{
                  backgroundColor: copied ? 'var(--success)' : 'var(--accent)',
                  color: copied ? 'var(--success-foreground)' : 'var(--accent-foreground)'
                }}
              >
                {copied ? '✅ Copied!' : '📋 Copy API Key'}
              </ThemedButton>
            </div>
          </div>

          <div className="pt-4 border-t" style={{borderColor: 'var(--border-color)'}}>
            <ThemedButton
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Got it, close popup
            </ThemedButton>
          </div>
        </div>
      </div>
    </div>
  );
}