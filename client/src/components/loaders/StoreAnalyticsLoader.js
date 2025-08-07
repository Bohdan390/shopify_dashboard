import React from 'react';
import { Store, BarChart3 } from 'lucide-react';

const StoreAnalyticsLoader = () => {
  return (
    <div className="p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
      </div>

      {/* Date Range Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
          <div className="mt-6">
            <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Store Table Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="p-8">
          <div className="text-center">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <div className="h-6 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsLoader; 