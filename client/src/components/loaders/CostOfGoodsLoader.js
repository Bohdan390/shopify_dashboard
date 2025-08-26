import React from 'react';
import { Package, Calculator, Filter, Calendar, RefreshCw, Plus } from 'lucide-react';

const CostOfGoodsLoader = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="max-w-full mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-44 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-60 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Date Range Filter Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex flex-col">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-40 animate-pulse"></div>
              </div>
              <div className="flex items-center">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-40 animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-28 animate-pulse"></div>
              </div>
            </div>
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="ml-4">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cost of Goods Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Product', 'Cost/Unit', 'Quantity', 'Total Cost', 'Date', 'Actions'].map((header, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((cell, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse"></div>
                          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loading Message */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading cost of goods data...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostOfGoodsLoader; 