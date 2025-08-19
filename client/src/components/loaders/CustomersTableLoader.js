import React from 'react';

const CustomersTableLoader = () => {
  // Generate skeleton rows
  const skeletonRows = Array.from({ length: 10 }, (_, index) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <div className="h-3 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div>
          <div className="h-4 bg-gray-200 rounded w-8 animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </td>
      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
    </tr>
  ));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Orders
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Revenue
            </th>
            <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {skeletonRows}
        </tbody>
      </table>
    </div>
  );
};

export default CustomersTableLoader;
