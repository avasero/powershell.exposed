"use client";

export default function AnalysisSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-pulse">
      <div className="h-8 sm:h-10 md:h-12 w-64 sm:w-80 md:w-96 bg-gray-700 rounded mb-6 sm:mb-8"></div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-3 sm:p-4 bg-gray-800 border-gray-600">
        <div className="h-4 w-32 bg-gray-600 rounded mb-2"></div>
        <div className="h-5 w-full bg-gray-600 rounded"></div>
      </div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6">
          <div className="h-6 w-48 bg-gray-600 rounded mb-4 mx-auto"></div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-2 border border-gray-600 rounded bg-gray-700">
                <div className="h-4 w-16 bg-gray-600 rounded mb-1 mx-auto"></div>
                <div className="h-3 w-12 bg-gray-600 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="p-6 sm:p-8 rounded-lg border-2 border-gray-600 text-center bg-black">
          <div className="h-6 w-24 bg-gray-600 rounded mb-4 mx-auto"></div>
          <div className="h-16 w-20 bg-gray-600 rounded mb-4 mx-auto"></div>
          <div className="h-4 w-48 bg-gray-600 rounded mx-auto"></div>
        </div>
      </div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 text-center">
          <div className="h-6 w-32 bg-gray-600 rounded mb-2 mx-auto"></div>
          <div className="h-12 w-8 bg-gray-600 rounded mb-2 mx-auto"></div>
          <div className="h-4 w-24 bg-gray-600 rounded mx-auto"></div>
        </div>
      </div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="h-6 w-32 bg-gray-600 rounded mb-4"></div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 sm:p-6 bg-gray-800 border-gray-600">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="h-5 w-48 bg-gray-600 rounded mb-2 sm:mb-0"></div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-16 bg-gray-600 rounded"></div>
                  <div className="h-6 w-20 bg-gray-600 rounded"></div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="h-4 w-20 bg-gray-600 rounded mb-2"></div>
                <div className="h-12 w-full bg-gray-600 rounded"></div>
              </div>
              
              <div className="mb-4">
                <div className="h-4 w-28 bg-gray-600 rounded mb-2"></div>
                <div className="h-8 w-full bg-gray-700 rounded"></div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="h-4 w-24 bg-gray-600 rounded mb-2"></div>
                  <div className="flex flex-wrap gap-1">
                    <div className="h-6 w-16 bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div>
                  <div className="h-4 w-28 bg-gray-600 rounded mb-2"></div>
                  <div className="flex flex-wrap gap-1">
                    <div className="h-6 w-20 bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="h-4 w-20 bg-gray-600 rounded mb-2"></div>
                <div className="h-4 w-72 bg-gray-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <div className="h-10 w-48 bg-gray-600 rounded"></div>
      </div>
    </div>
  );
}
