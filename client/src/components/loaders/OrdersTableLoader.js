import React from 'react';

const OrdersTableLoader = () => {
  // Generate skeleton rows
  const skeletonRows = Array.from({ length: 10 }, (_, index) => (
    <tr key={index} className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
    </tr>
  ));

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Order #
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Customer
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Amount
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Status
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Fulfillment
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {skeletonRows}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTableLoader;
