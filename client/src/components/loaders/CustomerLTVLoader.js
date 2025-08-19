import React from 'react';

const CustomerLTVLoader = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                {/* Header Skeleton */}
                <div className="mb-4 sm:mb-6">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>

                {/* Main Content Card Skeleton */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
                    {/* LTV Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
                            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                    </div>

                    {/* Product SKU Selector Skeleton */}
                    <div className="mb-6">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded w-80 animate-pulse"></div>
                    </div>

                    {/* LTV Controls Skeleton */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
                        {/* Metric Selection */}
                        <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                <div className="w-32 h-10 bg-gray-200 animate-pulse"></div>
                                <div className="w-32 h-10 bg-gray-200 animate-pulse"></div>
                            </div>
                        </div>

                        {/* Year and Month Range Selectors */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                                <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
                                <div className="h-9 bg-gray-200 rounded w-28 animate-pulse"></div>
                            </div>

                            <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>

                            <div className="flex items-center gap-2">
                                <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
                                <div className="h-9 bg-gray-200 rounded w-28 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ position: 'relative' }}>
                                {/* Loading Skeleton */}
                                <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                                </div>

                                <div className="p-4">
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center space-x-4">
                                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                                <div className="flex-1 grid grid-cols-6 gap-1">
                                                    {Array.from({ length: 6 }, (_, j) => (
                                                        <div key={j} className="h-8 bg-gray-200 rounded animate-pulse"></div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerLTVLoader;
