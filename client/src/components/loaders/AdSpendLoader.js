import React from 'react';
import { DollarSign, BarChart3 } from 'lucide-react';

const AdSpendLoader = () => {
  return (
    <div className="p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-lg w-40 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
      </div>

      {/* Filter Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded-lg w-40 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse"></div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-36 animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Ad Spend Table Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-36 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-6 p-4 border border-gray-100 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdSpendLoader; 