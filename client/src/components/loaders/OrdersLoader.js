import React from 'react';
import { ShoppingCart, Search, Filter, Calendar } from 'lucide-react';

const OrdersLoader = () => {
  return (
    <div className="p-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
      </div>

      {/* Search and Filter Skeleton */}
      <div className="card mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-2 items-end">
            <div className="flex flex-col md:flex-row gap-2 flex-1">
              <div className="flex flex-col">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
              </div>
              <span className="flex items-center text-gray-500" style={{marginTop: 18}}>to</span>
              <div className="flex flex-col">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <div className="h-3 mb-1 animate-pulse opacity-0"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full animate-pulse"></div>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-40 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <div className="w-6 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table Skeleton */}
      <div className="card mt-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-6 p-4 border border-gray-100 rounded-lg">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersLoader; 