import React from 'react';
import { Package, TrendingUp, DollarSign, Filter, Calendar, RefreshCw, Search } from 'lucide-react';

const ProductAnalyticsLoader = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-9 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-2"></div>
        <div className="h-5 w-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
      </div>

      {/* Date Range Filter Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Start Date */}
            <div className="flex flex-col">
              <div className="h-3 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse flex items-center justify-between px-3">
                <div className="h-4 w-24 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
                <Calendar className="w-4 h-4 text-gray-300" />
              </div>
            </div>

            {/* To Label */}
            <div className="flex items-center">
              <div className="h-4 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            </div>

            {/* End Date */}
            <div className="flex flex-col">
              <div className="h-3 w-14 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse flex items-center justify-between px-3">
                <div className="h-4 w-24 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
                <Calendar className="w-4 h-4 text-gray-300" />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-col">
              <div className="h-3 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse flex items-center gap-2 px-3">
                <Filter className="w-4 h-4 text-gray-300" />
                <div className="h-4 w-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Product Groups Button */}
            <div className="flex flex-col">
              <div className="h-3 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-48 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg animate-pulse flex items-center gap-2 px-3">
                <div className="h-4 w-4 bg-gradient-to-r from-blue-300 to-blue-400 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gradient-to-r from-blue-300 to-blue-400 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Date Range Display */}
          <div className="h-3 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Search and Filter Bar Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse" style={{width: 200}}></div>
              </div>
            </div>

            {/* Search Button */}
            <div className="h-10 w-24 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg animate-pulse flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-blue-300" />
              <div className="h-4 w-12 bg-gradient-to-r from-blue-300 to-blue-400 rounded animate-pulse"></div>
            </div>

            {/* Filter Toggle */}
            <div className="h-10 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse flex items-center gap-2 px-3">
              <Filter className="w-4 h-4 text-gray-300" />
              <div className="h-4 w-12 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Advanced Filters Skeleton */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
                  <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-2"></div>
                <div className="h-8 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse flex items-center justify-center">
                {i === 0 && <DollarSign className="w-5 h-5 text-gray-300" />}
                {i === 1 && <Package className="w-5 h-5 text-gray-300" />}
                {i === 2 && <TrendingUp className="w-5 h-5 text-gray-300" />}
                {i === 3 && <div className="w-4 h-4 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Analytics Table Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Table Header */}
        <div className="px-6 py-4">
          <div className="h-6 w-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
        </div>

        {/* Top Pagination Skeleton */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table Content Skeleton */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Product', 'Revenue', 'Ad Spend', 'Profit', 'ROI', 'Orders'].map((header, i) => (
                  <th key={i} className="px-6 py-3 text-left">
                    <div className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(8)].map((_, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {[...Array(6)].map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                      {colIndex === 0 ? (
                        <div className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      ) : (
                        <div className="h-5 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Skeleton */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalyticsLoader; 