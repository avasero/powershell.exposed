"use client";
import { useState } from "react";
import ThemedButton from "./ThemedButton";

export default function ReviewRequestModal({ isOpen, onClose, command, onSubmit }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (onSubmit) {
        await onSubmit({ command, reason, comment });
      }
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason("");
        setComment("");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to submit review request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setReason("");
      setComment("");
      setError("");
      setSubmitted(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

     
      <div className="relative w-full max-w-lg bg-black border-2 border-green-500/30 rounded-lg shadow-2xl">
        
        <div className="flex items-center justify-between p-4 border-b border-green-500/20">
          <h2 className="text-lg font-mono font-bold" style={{ color: 'var(--accent)' }}>
            Request Review
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-mono text-green-400">Review request submitted successfully!</p>
            </div>
          ) : (
            <>
            
              <div>
                <label className="block font-mono text-sm font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Command
                </label>
                <div className="bg-black/50 rounded border border-green-500/20 p-3 max-h-32 overflow-auto">
                  <code className="font-mono text-xs break-all" style={{ color: 'var(--muted-foreground)' }}>
                    {command || "No command"}
                  </code>
                </div>
              </div>

             
              <div>
                <label className="block font-mono text-sm font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-black border border-green-500/30 rounded p-3 font-mono text-sm focus:outline-none focus:border-green-500"
                  style={{ color: 'var(--foreground)' }}
                >
                  <option value="">Select a reason...</option>
                  <option value="unmatched">Unmatched indicator</option>
                  <option value="incorrectly_matched">Incorrectly matched indicator</option>
                </select>
              </div>

             
              <div>
                <label className="block font-mono text-sm font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide additional details about your review request..."
                  rows={4}
                  className="w-full bg-black border border-green-500/30 rounded p-3 font-mono text-sm resize-none focus:outline-none focus:border-green-500"
                  style={{ color: 'var(--foreground)' }}
                />
              </div>

             
              {error && (
                <div className="text-red-400 text-sm font-mono">
                  {error}
                </div>
              )}

             
              <div className="flex justify-end pt-2">
                <ThemedButton
                  type="submit"
                  disabled={submitting}
                  loading={submitting}
                >
                  {submitting ? "Sending..." : "Send"}
                </ThemedButton>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export function RequestReviewButton({ command, isAuthenticated, className = "" }) {
  const [showModal, setShowModal] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(false);

  const handleClick = () => {
    // isAuthenticated is a function from AuthContext, need to call it
    const isLoggedIn = typeof isAuthenticated === 'function' ? isAuthenticated() : isAuthenticated;
    if (!isLoggedIn) {
      setShowLoginMessage(true);
      setTimeout(() => setShowLoginMessage(false), 5000);
    } else {
      setShowModal(true);
    }
  };

  const handleSubmit = async (data) => {
    // TODO: Implement API call to submit review request
    const { makeAuthenticatedRequest } = await import('../../lib/api');

    const response = await makeAuthenticatedRequest('/review-request', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit review request');
    }

    return response.json();
  };

  return (
    <>
      <ThemedButton
        variant="outline"
        onClick={handleClick}
        className={className}
      >
        Request Review
      </ThemedButton>

      
      {showLoginMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg border border-yellow-500/30 bg-black/95 shadow-lg animate-fade-in">
          <p className="text-sm font-mono text-yellow-400 text-center whitespace-nowrap">
            Submitting a review request is reserved for registered users only
          </p>
        </div>
      )}
      <ReviewRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        command={command}
        onSubmit={handleSubmit}
      />
    </>
  );
}
