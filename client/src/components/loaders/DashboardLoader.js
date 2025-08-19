import React from 'react';
import { ShoppingCart, TrendingUp, DollarSign, Users, Package } from 'lucide-react';

const DashboardLoader = () => {
  return (
    <div className="p-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
      </div>

      {/* Controls Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
          <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
          <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { icon: DollarSign, color: 'from-green-200 to-green-300' },
          { icon: TrendingUp, color: 'from-blue-200 to-blue-300' },
          { icon: Users, color: 'from-purple-200 to-purple-300' },
          { icon: Package, color: 'from-orange-200 to-orange-300' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
              </div>
              <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-lg animate-pulse flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border mb-8 hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
            {/* Chart bars skeleton */}
            <div className="absolute inset-0 flex items-end justify-center space-x-2 p-8">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="w-8 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t animate-pulse" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
              ))}
            </div>
            <div className="text-center relative z-10">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Table Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-6 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
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

export default DashboardLoader; 