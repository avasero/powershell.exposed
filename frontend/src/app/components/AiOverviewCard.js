"use client";

export default function AiOverviewCard({ overview, isLoading = false }) {
  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 sm:p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }
          .shimmer {
            background: linear-gradient(
              90deg,
              rgba(139, 92, 246, 0.05) 0%,
              rgba(139, 92, 246, 0.15) 50%,
              rgba(139, 92, 246, 0.05) 100%
            );
            background-size: 1000px 100%;
            animation: shimmer 2s infinite linear;
          }
        `}</style>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 shimmer rounded"></div>
          <div className="h-5 w-32 shimmer rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full shimmer rounded"></div>
          <div className="h-4 w-5/6 shimmer rounded"></div>
          <div className="h-4 w-4/6 shimmer rounded"></div>
        </div>
        <div className="mt-4 pt-3 border-t border-purple-500/20">
          <div className="h-3 w-40 shimmer rounded"></div>
        </div>
      </div>
    );
  }

  // Don't render if no overview
  if (!overview) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 sm:p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 hover:border-purple-500/50 transition-all">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="font-mono font-bold text-purple-400 text-sm sm:text-base">
          AI Overview
        </h3>
      </div>

      {/* Overview Content */}
      <div className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {overview}
      </div>

      {/* Footer with attribution and disclaimer */}
      <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
          </svg>
          <span>Powered by OpenAI</span>
        </div>
        <p className="text-xs text-gray-500 italic">
          AI-generated content may not be fully accurate
        </p>
      </div>
    </div>
  );
}
