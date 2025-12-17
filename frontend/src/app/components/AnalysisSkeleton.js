"use client";

export default function AnalysisSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            rgba(32, 224, 115, 0.05) 0%,
            rgba(32, 224, 115, 0.15) 50%,
            rgba(32, 224, 115, 0.05) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite linear;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>

     
      <div className="h-8 sm:h-10 md:h-12 w-64 sm:w-80 md:w-96 shimmer rounded-lg mb-6 sm:mb-8"></div>

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 border rounded-lg p-4 bg-black/80 border-green-500/30">
            <div className="h-3 w-24 shimmer rounded mb-2"></div>
            <div className="h-10 w-full shimmer rounded"></div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-10 w-32 shimmer rounded"></div>
          </div>
        </div>
      </div>

      
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 rounded-lg border-2 border-green-500/30 text-center bg-black/80">
          <div className="h-6 w-48 shimmer rounded-lg mb-3 mx-auto"></div>
          <div className="h-12 w-24 shimmer rounded-lg mb-3 mx-auto"></div>
          <div className="h-4 w-64 shimmer rounded-lg mx-auto"></div>
        </div>
      </div>

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
          <div className="h-4 w-32 shimmer rounded mb-3"></div>
          <div className="bg-black rounded p-3 border border-blue-500/20">
            <div className="h-3 w-full shimmer rounded mb-2"></div>
            <div className="h-3 w-5/6 shimmer rounded mb-2"></div>
            <div className="h-3 w-4/6 shimmer rounded"></div>
          </div>
          <div className="h-3 w-48 shimmer rounded mt-2"></div>
        </div>
      </div>

      
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="border rounded-lg bg-black/80 border-green-500/30 overflow-hidden">
          <div className="p-4 border-b border-green-500/30">
            <div className="h-5 w-40 shimmer rounded"></div>
          </div>
          <div className="overflow-x-auto">
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-green-500/20 last:border-0">
                  <div className="h-4 w-48 shimmer rounded"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-16 shimmer rounded"></div>
                    <div className="h-6 w-12 shimmer rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-4">
        <div className="h-6 w-48 shimmer rounded"></div>
      </div>

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-4 sm:p-6 bg-black/80 border-green-500/30">
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-5 w-64 shimmer rounded mb-2"></div>
                <div className="h-3 w-full shimmer rounded mb-1"></div>
                <div className="h-3 w-5/6 shimmer rounded"></div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="h-8 w-20 shimmer rounded-full"></div>
                <div className="h-8 w-16 shimmer rounded-full"></div>
              </div>
            </div>

            <div className="mb-4">
              <div className="h-4 w-32 shimmer rounded mb-2"></div>
              <div className="bg-black rounded p-3 border border-green-500/20">
                <div className="h-3 w-full shimmer rounded"></div>
              </div>
            </div>

           
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="h-4 w-24 shimmer rounded mb-2"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-20 shimmer rounded-full"></div>
                  <div className="h-6 w-24 shimmer rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="h-4 w-28 shimmer rounded mb-2"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 shimmer rounded-full"></div>
                  <div className="h-6 w-20 shimmer rounded-full"></div>
                </div>
              </div>
            </div>

        
            <div>
              <div className="h-4 w-20 shimmer rounded mb-2"></div>
              <div className="h-3 w-full max-w-md shimmer rounded"></div>
            </div>
          </div>
        ))}
      </div>

      
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <div className="h-10 w-48 shimmer rounded"></div>
        <div className="h-10 w-40 shimmer rounded"></div>
      </div>
    </div>
  );
}
