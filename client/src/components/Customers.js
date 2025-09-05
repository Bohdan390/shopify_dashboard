import React, { useState, useEffect, useCallback } from 'react';
import api from "../config/axios"
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import LoadingSpinner from './LoadingSpinner';
import CustomersLoader from './loaders/CustomersLoader';
import CustomersTableLoader from './loaders/CustomersTableLoader';
import {
    Users,
    DollarSign,
    ShoppingCart,
    Mail,
    Phone,
    MapPin,
    Search,
    Eye,
    TrendingUp,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { Button, Dialog, DialogContent, DialogTitle } from '@mui/material';

let isLoading = false;
const Customers = () => {
	const { selectedStore, syncCompleted, adsSyncCompleted } = useStore();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [summaryStats, setSummaryStats] = useState({});
    const [searchEmail, setSearchEmail] = useState('');
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 0
    });
    const [sortConfig, setSortConfig] = useState({
        field: 'total_orders_price',
        direction: 'desc'
    });
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

    const fetchCustomerAnalytics = async (page = 1, pageSize = pagination.pageSize, sortField = sortConfig.field, sortDirection = sortConfig.direction, showRefresh = false, isTableOnly = false) => {
        if (isLoading) return;
        isLoading = true;
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else if (isTableOnly) {
                setTableLoading(true);
            } else {
                setLoading(true);
            }
            setError(null);
            
            const params = new URLSearchParams({
                storeId: selectedStore,
                page: page,
                pageSize: pageSize,
                sortField: sortField,
                sortDirection: sortDirection
            });

            if (searchEmail) {
                params.append('searchEmail', searchEmail);
            }

            const response = await api.get(`/api/customers/analytics?${params}`);
            setCustomers(response.data.data || []);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('❌ Error fetching customer analytics:', error);
            setError('Failed to fetch customers. Please try again.');
            if (window.showPrimeToast) {
                window.showPrimeToast('Failed to fetch customers. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setTableLoading(false);
            isLoading = false;
        }
    };

    // Fetch summary stats
    const fetchSummaryStats = async () => {
        try {
            const response = await api.get(`/api/customers/summary/stats?storeId=${selectedStore}`);
            setSummaryStats(response.data.data || {});
        } catch (error) {
            console.error('❌ Error fetching summary stats:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast('Failed to fetch customer statistics', 'error');
            }
        }
    };

    // Fetch customer details
    const fetchCustomerDetails = async (customerId) => {
        try {
            setShowCustomerModal(true);
            setCustomerDetailsLoading(true);
            setSelectedCustomer(null);
            const response = await api.get(`/api/customers/${customerId}?storeId=${selectedStore}`);
            setSelectedCustomer(response.data.data);
        } catch (error) {
            console.error('❌ Error fetching customer details:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast('Failed to load customer details', 'error');
            }
        } finally {
            setCustomerDetailsLoading(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        if (!searchEmail.trim()) {
            if (window.showPrimeToast) {
                window.showPrimeToast('Please enter an email to search', 'warning');
            }
            return;
        }
        
        setSearchLoading(true);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        fetchCustomerAnalytics(1, pagination.pageSize, sortConfig.field, sortConfig.direction, false, true).finally(() => setSearchLoading(false));
    };

    // Handle page change
    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
        fetchCustomerAnalytics(page, pagination.pageSize, sortConfig.field, sortConfig.direction, false, true);
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPagination(prev => ({ ...prev, pageSize: newPageSize, currentPage: 1 }));
        fetchCustomerAnalytics(1, newPageSize, sortConfig.field, sortConfig.direction, false, true);
    };

    // Handle sorting
    const handleSort = (field) => {
        const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ field, direction: newDirection });
        fetchCustomerAnalytics(1, pagination.pageSize, field, newDirection, false, true);
    };

    // Get sort icon
    const getSortIcon = (field) => {
        if (sortConfig.field !== field) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Effects
    useEffect(() => {
        if (selectedStore) {
            fetchCustomerAnalytics();
            fetchSummaryStats();
        }
    }, [selectedStore]);

    // Listen for sync completion from GlobalStoreSelector and refresh data
    useEffect(() => {
        if (syncCompleted > 0 || adsSyncCompleted > 0) {
            if (selectedStore) {
                fetchCustomerAnalytics();
                fetchSummaryStats();
            }
        }
    }, [syncCompleted, adsSyncCompleted, selectedStore]);

    useEffect(() => {
        if (searchEmail === '') {
            // Reset to first page and fetch all customers when search is cleared
            setPagination(prev => ({ ...prev, currentPage: 1 }));
            fetchCustomerAnalytics(1, pagination.pageSize, sortConfig.field, sortConfig.direction, false, true);
        }
    }, [searchEmail]);

    if (loading && !refreshing) {
        return <CustomersLoader />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customers</h1>
                        <p className="text-sm sm:text-base text-gray-600">Manage and analyze your customer base</p>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error Loading Customers</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                            <button
                                onClick={() => fetchCustomerAnalytics(1, pagination.pageSize, sortConfig.field, sortConfig.direction, false, true)}
                                className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {refreshing ? (
                                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        summaryStats.totalCustomers || 0
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-green-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {refreshing ? (
                                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        formatCurrency(summaryStats.totalRevenue || 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <ShoppingCart className="h-8 w-8 text-purple-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {refreshing ? (
                                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        summaryStats.totalOrders || 0
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {refreshing ? (
                                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        formatCurrency(summaryStats.averageRevenue || 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Search */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by email..."
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                    disabled={searchLoading || tableLoading}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <Button
                            variant='contained'
                            onClick={handleSearch}
                            disabled={searchLoading || tableLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {searchLoading ? (
                                <LoadingSpinner size="xs" variant="spinner" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                            {searchLoading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>
                </div>

                {/* Customers Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden relative">
                    {/* Table Loading Overlay */}
                    {refreshing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                            <div className="text-center">
                                <LoadingSpinner size="lg" variant="spinner" />
                                <p className="text-gray-600 mt-2">Refreshing customers...</p>
                            </div>
                        </div>
                    )}

                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center text-sm text-gray-700">
                                <span>
                                    Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                                    {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                                    {pagination.totalItems} customers
                                </span>
                            </div>
                            <div className="flex items-center space-x-4">
                                {/* Page Size Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Show:</span>
                                    <div>
                                        <BeautifulSelect
                                            value={pagination.pageSize}
                                            onChange={(value) => handlePageSizeChange(parseInt(value))}
                                            options={[
                                                { value: 10, label: '10' },
                                                { value: 20, label: '20' },
                                                { value: 50, label: '50' },
                                                { value: 100, label: '100' }
                                            ]}
                                            selectClass="nopa-pagesize-select"
                                            placeholder="Select"
                                            disabled={loading}
                                            className="w-28"
                                            size="sm"
                                            variant="pagination"
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500">per page</span>
                                </div>

                                {/* Pagination Controls */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex items-center space-x-2">
                                        {/* First page button */}
                                        <button
                                            onClick={() => handlePageChange(1)}
                                            disabled={pagination.currentPage === 1 || tableLoading}
                                            className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === 1 || tableLoading
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            title="First page"
                                        >
                                            «
                                        </button>

                                        {/* Previous button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                                            disabled={pagination.currentPage === 1 || tableLoading}
                                            className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === 1 || tableLoading
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Previous
                                        </button>

                                        {/* Page numbers */}
                                        <div className="flex items-center space-x-1">
                                            {(() => {
                                                const current = pagination.currentPage;
                                                const total = pagination.totalPages;
                                                const pages = [];

                                                // Always show first page
                                                pages.push(1);

                                                if (total <= 7) {
                                                    // If total pages <= 7, show all pages
                                                    for (let i = 2; i <= total; i++) {
                                                        pages.push(i);
                                                    }
                                                } else {
                                                    // Smart pagination for larger page counts
                                                    if (current <= 4) {
                                                        // Near the beginning
                                                        for (let i = 2; i <= 5; i++) {
                                                            pages.push(i);
                                                        }
                                                        pages.push('...');
                                                        pages.push(total);
                                                    } else if (current >= total - 3) {
                                                        // Near the end
                                                        pages.push('...');
                                                        for (let i = total - 4; i <= total; i++) {
                                                            pages.push(i);
                                                        }
                                                    } else {
                                                        // In the middle
                                                        pages.push('...');
                                                        for (let i = current - 1; i <= current + 1; i++) {
                                                            pages.push(i);
                                                        }
                                                        pages.push('...');
                                                        pages.push(total);
                                                    }
                                                }

                                                return pages.map((page, index) => (
                                                    <React.Fragment key={index}>
                                                        {page === '...' ? (
                                                            <span className="px-2 text-gray-500">...</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePageChange(page)}
                                                                disabled={tableLoading}
                                                                className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
                                                                    ? 'bg-primary-600 text-white'
                                                                    : tableLoading
                                                                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        )}
                                                    </React.Fragment>
                                                ));
                                            })()}
                                        </div>

                                        {/* Next button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                                            disabled={pagination.currentPage === pagination.totalPages || tableLoading}
                                            className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages || tableLoading
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Next
                                        </button>

                                        {/* Last page button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.totalPages)}
                                            disabled={pagination.currentPage === pagination.totalPages || tableLoading}
                                            className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages || tableLoading
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            title="Last page"
                                        >
                                            »
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {tableLoading ? (
                        <CustomersTableLoader />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={!tableLoading ? () => handleSort('first_name') : undefined}
                                            disabled={tableLoading}
                                            className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                        >
                                            <span>Customer</span>
                                            {getSortIcon('first_name')}
                                        </button>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={!tableLoading ? () => handleSort('orders_count') : undefined}
                                            disabled={tableLoading}
                                            className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                        >
                                            <span>Orders</span>
                                            {getSortIcon('orders_count')}
                                        </button>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={!tableLoading ? () => handleSort('total_orders_price') : undefined}
                                            disabled={tableLoading}
                                            className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                        >
                                            <span>Revenue</span>
                                            {getSortIcon('total_orders_price')}
                                        </button>
                                    </th>
                                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customers.map((customer) => (
                                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {customer.first_name} {customer.last_name}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-500">ID: {customer.customer_id}</div>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                                                {customer.email && (
                                                    <div className="flex items-center text-xs sm:text-sm text-gray-900">
                                                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                        <span className="truncate">{customer.email}</span>
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className="flex items-center text-xs sm:text-sm text-gray-900">
                                                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                        <span className="truncate">{customer.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{customer.orders_count}</div>
                                            <div className="text-xs sm:text-sm text-gray-500">
                                                Avg: {formatCurrency(customer.average_order_value)}
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(customer.total_orders_price)}
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-500">
                                                Paid: {formatCurrency(customer.net_revenue)}
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                                            {customer.city && customer.country && (
                                                <div className="flex items-center text-xs sm:text-sm text-gray-900">
                                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                    <span className="truncate">{customer.city}, {customer.country}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => fetchCustomerDetails(customer.customer_id)}
                                                className="text-blue-600 hover:text-blue-900 flex items-center text-xs sm:text-sm"
                                            >
                                                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                <span className="hidden sm:inline">View Details</span>
                                                <span className="sm:hidden">View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                            {/* Pagination Info */}
                            <div className="flex items-center text-sm text-gray-700">
                                <span>
                                    Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                                    {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                                    {pagination.totalItems} customers
                                </span>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Page Size Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Show:</span>
                                    <div>
                                        <BeautifulSelect
                                            value={pagination.pageSize}
                                            onChange={(value) => handlePageSizeChange(parseInt(value))}
                                            options={[
                                                { value: 10, label: '10' },
                                                { value: 20, label: '20' },
                                                { value: 50, label: '50' },
                                                { value: 100, label: '100' }
                                            ]}
                                            selectClass="nopa-pagesize-select"
                                            placeholder="Select"
                                            disabled={loading || tableLoading}
                                            className="w-28"
                                            size="sm"
                                            variant="pagination"
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500">per page</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {/* First page button */}
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={pagination.currentPage === 1 || tableLoading}
                                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === 1 || tableLoading
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        title="First page"
                                    >
                                        «
                                    </button>

                                    {/* Previous button */}
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1 || tableLoading}
                                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === 1 || tableLoading
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Previous
                                    </button>

                                    {/* Page numbers */}
                                    <div className="flex items-center space-x-1">
                                        {(() => {
                                            const current = pagination.currentPage;
                                            const total = pagination.totalPages;
                                            const pages = [];

                                            // Always show first page
                                            pages.push(1);

                                            if (total <= 7) {
                                                // If total pages <= 7, show all pages
                                                for (let i = 2; i <= total; i++) {
                                                    pages.push(i);
                                                }
                                            } else {
                                                // Smart pagination for larger page counts
                                                if (current <= 4) {
                                                    // Near the beginning
                                                    for (let i = 2; i <= 5; i++) {
                                                        pages.push(i);
                                                    }
                                                    pages.push('...');
                                                    pages.push(total);
                                                } else if (current >= total - 3) {
                                                    // Near the end
                                                    pages.push('...');
                                                    for (let i = total - 4; i <= total; i++) {
                                                        pages.push(i);
                                                    }
                                                } else {
                                                    // In the middle
                                                    pages.push('...');
                                                    for (let i = current - 1; i <= current + 1; i++) {
                                                        pages.push(i);
                                                    }
                                                    pages.push('...');
                                                    pages.push(total);
                                                }
                                            }

                                            return pages.map((page, index) => (
                                                <React.Fragment key={index}>
                                                    {page === '...' ? (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePageChange(page)}
                                                            disabled={tableLoading}
                                                            className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
                                                                ? 'bg-primary-600 text-white'
                                                                : tableLoading
                                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    )}
                                                </React.Fragment>
                                            ));
                                        })()}
                                    </div>

                                    {/* Next button */}
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages || tableLoading}
                                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages || tableLoading
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Next
                                    </button>

                                    {/* Last page button */}
                                    <button
                                        onClick={() => handlePageChange(pagination.totalPages)}
                                        disabled={pagination.currentPage === pagination.totalPages || tableLoading}
                                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages || tableLoading
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        title="Last page"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer Details Modal */}
                {showCustomerModal && (
                    <Dialog open={showCustomerModal} onClose={() => setShowCustomerModal(false)}
                        PaperProps={{
                            sx: {
                                width: "650px",
                                maxWidth: "none", // prevents it from shrinking
                            },
                        }}>
                        <DialogTitle>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                {customerDetailsLoading ? 'Loading Customer Details...' : `Customer Details: ${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
                            </h3>
                        </DialogTitle>
                            <DialogContent>
                            <div className="">
                                {customerDetailsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                            <p className="text-gray-600">Loading customer details...</p>
                                        </div>
                                    </div>
                                ) : selectedCustomer ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        {/* Customer Info */}
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 mb-4">Customer Information</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                                    <p className="text-sm text-gray-900">{selectedCustomer.email || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Phone</label>
                                                    <p className="text-sm text-gray-900">{selectedCustomer.phone || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Address</label>
                                                    <p className="text-sm text-gray-900">
                                                        {selectedCustomer.address1 || 'N/A'}
                                                        {selectedCustomer.address2 && <br />}
                                                        {selectedCustomer.address2}
                                                        {selectedCustomer.city && <br />}
                                                        {selectedCustomer.city}, {selectedCustomer.province} {selectedCustomer.zip}
                                                        {selectedCustomer.country && <br />}
                                                        {selectedCustomer.country}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Analytics */}
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 mb-4">Analytics</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Total Orders</label>
                                                    <p className="text-sm text-gray-900">{selectedCustomer.orders_count}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Total Revenue</label>
                                                    <p className="text-sm text-gray-900">{formatCurrency(selectedCustomer.total_orders_price)}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Average Order Value</label>
                                                    <p className="text-sm text-gray-900">{formatCurrency(selectedCustomer.average_order_value)}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Customer Since</label>
                                                    <p className="text-sm text-gray-900">{formatDate(selectedCustomer.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Order History */}
                                {!customerDetailsLoading && selectedCustomer && selectedCustomer.order_history && selectedCustomer.order_history.length > 0 && (
                                    <div className="mt-4 sm:mt-6">
                                        <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-3 sm:mb-4">Order History</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedCustomer.order_history.map((order) => (
                                                        <tr key={order.order_id}>
                                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">{order.order_number}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">{formatDate(order.created_at)}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">{formatCurrency(order.total_price)}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">
                                                                <span className={`px-2 py-1 text-xs rounded-full ${order.financial_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {order.financial_status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
};

export default Customers;
