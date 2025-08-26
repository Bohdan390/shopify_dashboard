import React from 'react';

const CostOfGoodsTableLoader = () => {
  // Generate skeleton rows
  const skeletonRows = Array.from({ length: 10 }, (_, index) => (
    <tr key={index} className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
        </div>
      </td>
    </tr>
  ));

  return (
    <div className="overflow-x-auto relative">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost/Unit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Cost
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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

export default CostOfGoodsTableLoader;
