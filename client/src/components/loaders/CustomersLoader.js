import React from 'react';
import { Users, DollarSign, ShoppingCart, TrendingUp, Search } from 'lucide-react';

const CustomersLoader = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="max-w-full mx-auto">
        {/* Header Skeleton */}
        <div className="mb-4 sm:mb-6 flex justify-between items-start">
          <div>
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
        </div>

        {/* Summary Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="ml-4">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search Skeleton */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full animate-pulse"></div>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Customers Table Skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Contact', 'Orders', 'Revenue', 'Location', 'Actions'].map((header, i) => (
                    <th key={i} className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((cell, j) => (
                      <td key={j} className="px-3 sm:px-6 py-4 whitespace-nowrap">
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
      </div>
    </div>
  );
};

export default CustomersLoader;
