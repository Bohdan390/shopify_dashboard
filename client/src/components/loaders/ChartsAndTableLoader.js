import React from 'react';
import { TrendingUp, BarChart3, RefreshCw } from 'lucide-react';

const ChartsAndTableLoader = () => {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue & Profit Chart Skeleton */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-[300px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
            {/* Chart lines skeleton */}
            <div className="absolute inset-0 flex items-end justify-center space-x-2 p-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="w-6 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t animate-pulse" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
              ))}
            </div>
            <div className="text-center relative z-10">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Ad Spend Chart Skeleton */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
          </div>
          <div className="h-[300px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
            {/* Chart bars skeleton */}
            <div className="absolute inset-0 flex items-end justify-center space-x-2 p-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="w-8 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t animate-pulse" style={{ height: `${Math.random() * 70 + 15}%` }}></div>
              ))}
            </div>
            <div className="text-center relative z-10">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-28 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Trend Chart Skeleton */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40 animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-[300px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
          {/* Area chart skeleton */}
          <div className="absolute inset-0 flex items-end justify-center space-x-2 p-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="w-6 bg-gradient-to-t from-green-200 to-green-100 rounded-t animate-pulse" style={{ height: `${Math.random() * 50 + 30}%` }}></div>
            ))}
          </div>
          <div className="text-center relative z-10">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-36 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Skeleton */}
      <div className="mt-8 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { color: 'from-blue-200 to-blue-300' },
              { color: 'from-orange-200 to-orange-300' },
              { color: 'from-purple-200 to-purple-300' },
              { color: 'from-green-200 to-green-300' }
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2 animate-pulse"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Analytics Table Skeleton */}
      <div className="mt-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
          </div>

          {/* Top Pagination Controls Skeleton */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12 animate-pulse"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Date', 'Revenue', 'Google Ads', 'Facebook Ads', 'Cost of Goods', 'Profit', 'Margin'].map((header, i) => (
                    <th key={i} className="text-left py-3 px-4">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="border-b border-gray-100">
                    {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                      <td key={cell} className="py-3 px-4">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls Skeleton */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12 animate-pulse"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Message */}
      <div className="text-center mt-8">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Updating charts and table data...</span>
        </div>
      </div>
    </div>
  );
};

export default ChartsAndTableLoader;
