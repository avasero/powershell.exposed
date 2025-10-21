"use client";

export default function AnalysisSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
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
            rgba(55, 65, 81, 0.4) 0%,
            rgba(75, 85, 101, 0.8) 50%,
            rgba(55, 65, 81, 0.4) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .glow {
          box-shadow: 0 0 20px rgba(147, 51, 234, 0.15);
        }
      `}</style>

      {/* Title skeleton with glow */}
      <div className="h-8 sm:h-10 md:h-12 w-64 sm:w-80 md:w-96 shimmer rounded-lg mb-6 sm:mb-8 glow"></div>

      {/* Command input skeleton */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-xl p-4 sm:p-5 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 glow">
        <div className="h-3 w-32 shimmer rounded mb-3"></div>
        <div className="h-6 w-full shimmer rounded-lg"></div>
      </div>

      {/* Metrics grid skeleton */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-5 sm:p-7 glow">
          <div className="h-6 w-48 shimmer rounded-lg mb-5 mx-auto"></div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} 
                   className="p-3 border border-gray-600 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 hover:scale-105 transition-transform duration-300"
                   style={{animationDelay: `${i * 100}ms`}}>
                <div className="h-4 w-16 shimmer rounded-md mb-2 mx-auto"></div>
                <div className="h-3 w-12 shimmer rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score card skeleton */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="p-6 sm:p-8 rounded-xl border-2 border-gray-600 text-center bg-gradient-to-br from-black to-gray-900 glow">
          <div className="h-6 w-24 shimmer rounded-lg mb-4 mx-auto"></div>
          <div className="relative mx-auto w-24 h-24 mb-4">
            <div className="absolute inset-0 shimmer rounded-full"></div>
            <div className="absolute inset-2 bg-gray-900 rounded-full"></div>
          </div>
          <div className="h-4 w-48 shimmer rounded-lg mx-auto"></div>
        </div>
      </div>

      {/* Matches count skeleton */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-5 sm:p-7 text-center glow">
          <div className="h-6 w-32 shimmer rounded-lg mb-3 mx-auto"></div>
          <div className="h-14 w-10 shimmer rounded-lg mb-3 mx-auto"></div>
          <div className="h-4 w-24 shimmer rounded-lg mx-auto"></div>
        </div>
      </div>

      {/* Matches list skeleton */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="h-6 w-32 shimmer rounded-lg mb-5"></div>
        <div className="space-y-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} 
                 className="border rounded-xl p-5 sm:p-7 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 hover:border-gray-500 transition-all duration-300 glow"
                 style={{animationDelay: `${i * 150}ms`}}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                <div className="h-5 w-48 shimmer rounded-lg mb-2 sm:mb-0"></div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-16 shimmer rounded-full"></div>
                  <div className="h-7 w-20 shimmer rounded-full"></div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="h-4 w-20 shimmer rounded mb-2"></div>
                <div className="h-14 w-full shimmer rounded-lg"></div>
              </div>
              
              <div className="mb-4">
                <div className="h-4 w-28 shimmer rounded mb-2"></div>
                <div className="h-10 w-full shimmer rounded-lg"></div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="h-4 w-24 shimmer rounded mb-2"></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-7 w-16 shimmer rounded-full"></div>
                    <div className="h-7 w-20 shimmer rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="h-4 w-28 shimmer rounded mb-2"></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-7 w-20 shimmer rounded-full"></div>
                    <div className="h-7 w-24 shimmer rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="h-4 w-20 shimmer rounded mb-2"></div>
                <div className="h-4 w-full max-w-md shimmer rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Button skeleton */}
      <div className="flex justify-center mb-8">
        <div className="h-11 w-48 shimmer rounded-lg glow"></div>
      </div>
    </div>
  );
}
