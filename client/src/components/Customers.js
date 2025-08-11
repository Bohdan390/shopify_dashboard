import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import {
    Users,
    DollarSign,
    ShoppingCart,
    Mail,
    Phone,
    MapPin,
    Search,
    Eye,
    Calendar,
    TrendingUp,
    RefreshCw,
    BarChart3,
    Grid,
    BarChart,
    Download
} from 'lucide-react';

const Customers = () => {
    const { selectedStore } = useStore();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryStats, setSummaryStats] = useState({});
    const [searchEmail, setSearchEmail] = useState('');
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

    // Customer LTV State
    const [ltvData, setLtvData] = useState([]);
    const [ltvLoading, setLtvLoading] = useState(false);
    const [ltvError, setLtvError] = useState(null);
    const [ltvMetric, setLtvMetric] = useState('ltv'); // 'ltv' or 'profit-ltv'
    const [ltvStartYear, setLtvStartYear] = useState(new Date().getFullYear());
    const [ltvEndYear, setLtvEndYear] = useState(new Date().getFullYear());
    const [ltvStartMonth, setLtvStartMonth] = useState(1);
    const [ltvEndMonth, setLtvEndMonth] = useState(new Date().getMonth() + 1);
    const [ltvSearchTerm, setLtvSearchTerm] = useState('');
    const [ltvViewMode, setLtvViewMode] = useState('table');

    // LTV Sync Modal State
    const [showLtvSyncModal, setShowLtvSyncModal] = useState(false);
    const [ltvSyncLoading, setLtvSyncLoading] = useState(false);
    const [ltvSyncSuccess, setLtvSyncSuccess] = useState(false);
    const [ltvSyncModalStartYear, setLtvSyncModalStartYear] = useState(new Date().getFullYear());
    const [ltvSyncModalEndYear, setLtvSyncModalEndYear] = useState(new Date().getFullYear());
    const [ltvSyncModalStartMonth, setLtvSyncModalStartMonth] = useState(1);
    const [ltvSyncModalEndMonth, setLtvSyncModalEndMonth] = useState(12);

    // Month options with names
    const monthOptions = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    // Generate year options (current year and 4 years back)
    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    // Get month range for display
    const getLtvMonthRangeDisplay = () => {
        if (ltvStartMonth === ltvEndMonth && ltvStartYear === ltvEndYear) {
            return `${monthOptions.find(m => m.value === ltvStartMonth)?.label} ${ltvStartYear}`;
        }
        const startLabel = monthOptions.find(m => m.value === ltvStartMonth)?.label;
        const endLabel = monthOptions.find(m => m.value === ltvEndMonth)?.label;
        return `${startLabel} ${ltvStartYear} - ${endLabel} ${ltvEndYear}`;
    };

    // Get month range for API
    const getLtvMonthRangeForAPI = () => {
        const months = [];
        let currentYear = ltvStartYear;
        let currentMonth = ltvStartMonth;
        
        while (currentYear < ltvEndYear || (currentYear === ltvEndYear && currentMonth <= ltvEndMonth)) {
            months.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
            
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        
        return months;
    };

    // Fetch customer LTV analytics
    const fetchCustomerLtvAnalytics = useCallback(async () => {
        if (!ltvStartYear || !ltvStartMonth || !ltvEndYear || !ltvEndMonth) return;

        setLtvLoading(true);
        setLtvError(null);

        try {
            const monthRange = getLtvMonthRangeForAPI();
            console.log('🔍 Fetching customer LTV analytics for:', selectedStore);
            console.log('📅 Date range:', monthRange[0], 'to', monthRange[monthRange.length - 1]);
            
            const response = await axios.get('/api/analytics/customer-ltv-cohorts', {
                params: {
                    storeId: selectedStore || 'buycosari',
                    startDate: monthRange[0],
                    endDate: monthRange[monthRange.length - 1],
                    metric: ltvMetric
                }
            });

            console.log('📊 Customer LTV analytics data received:', response.data);
            
            if (response.data.success && response.data.data) {
                setLtvData(response.data.data);
            } else {
                setLtvError(response.data.message || 'Failed to fetch customer LTV data');
            }
        } catch (err) {
            console.error('❌ Error fetching customer LTV analytics:', err);
            if (err.response) {
                setLtvError(`Server error: ${err.response.data?.error || err.response.statusText || 'Unknown error'}`);
            } else if (err.request) {
                setLtvError('No response from server. Please check your connection.');
            } else {
                setLtvError(`Error: ${err.message || 'Failed to fetch customer LTV data'}`);
            }
        } finally {
            setLtvLoading(false);
        }
    }, [selectedStore, ltvStartYear, ltvStartMonth, ltvEndYear, ltvEndMonth, ltvMetric]);

    // Format number for display
    const formatNumber = (value) => {
        if (value === null || value === undefined) return '0';
        return new Intl.NumberFormat('en-US').format(Math.round(value));
    };

    // Get metric display value
    const getLtvMetricValue = (cohort, monthKey) => {
        const value = cohort[monthKey];
        if (ltvMetric === 'ltv' || ltvMetric === 'profit-ltv') {
            return formatCurrency(value);
        } else {
            return formatNumber(value);
        }
    };

    // Get metric label
    const getLtvMetricLabel = () => {
        switch (ltvMetric) {
            case 'ltv':
                return 'Customer Lifetime Value (Revenue per Customer)';
            case 'profit-ltv':
                return 'Customer Lifetime Value (Profit per Customer)';
            default:
                return 'Customer Lifetime Value (Revenue per Customer)';
        }
    };

    // Handle LTV metric change
    const handleLtvMetricChange = (newMetric) => {
        setLtvMetric(newMetric);
    };

    // Handle LTV month range changes
    const handleLtvStartMonthChange = (month) => {
        const newStartMonth = parseInt(month);
        setLtvStartMonth(newStartMonth);
        
        if (ltvStartYear === ltvEndYear && ltvEndMonth < newStartMonth) {
            setLtvEndMonth(newStartMonth);
        }
    };

    const handleLtvEndMonthChange = (month) => {
        const newEndMonth = parseInt(month);
        setLtvEndMonth(newEndMonth);
        
        if (ltvStartYear === ltvEndYear && ltvStartMonth > newEndMonth) {
            setLtvStartMonth(newEndMonth);
        }
    };

    const handleLtvStartYearChange = (year) => {
        const newStartYear = parseInt(year);
        setLtvStartYear(newStartYear);
        
        if (newStartYear > ltvEndYear) {
            setLtvEndYear(newStartYear);
        }
    };

    const handleLtvEndYearChange = (year) => {
        const newEndYear = parseInt(year);
        setLtvEndYear(newEndYear);
        
        if (newEndYear < ltvStartYear) {
            setLtvStartYear(newEndYear);
        }
    };

    // Filter LTV data based on search term
    const getFilteredLtvData = () => {
        if (!ltvSearchTerm.trim()) return ltvData;
        return ltvData.filter(cohort => 
            cohort.cohortMonth.toLowerCase().includes(ltvSearchTerm.toLowerCase())
        );
    };

    // Sync customer LTV function
    const handleSyncCustomerLtv = async () => {
        if (!ltvSyncModalStartYear || !ltvSyncModalStartMonth || !ltvSyncModalEndYear || !ltvSyncModalEndMonth) {
            setLtvError('Please select a valid date range');
            return;
        }

        if (ltvSyncModalStartYear > ltvSyncModalEndYear || 
            (ltvSyncModalStartYear === ltvSyncModalEndYear && ltvSyncModalStartMonth > ltvSyncModalEndMonth)) {
            setLtvError('Start date must be before end date');
            return;
        }

        setLtvSyncLoading(true);
        setLtvError(null);
        setLtvSyncSuccess(false);

        try {
            const startDate = `${ltvSyncModalStartYear}-${ltvSyncModalStartMonth.toString().padStart(2, '0')}`;
            const endDate = `${ltvSyncModalEndYear}-${ltvSyncModalEndMonth.toString().padStart(2, '0')}`;

            console.log('🔄 Syncing customer LTV for date range:', startDate, 'to', endDate);
            
            const response = await axios.post('/api/analytics/sync-customer-ltv-cohorts', {
                startDate,
                endDate,
                storeId: selectedStore || 'buycosari'
            });

            if (response.data.success) {
                console.log('✅ Customer LTV sync completed successfully');
                setShowLtvSyncModal(false);
                setLtvSyncSuccess(true);
                await fetchCustomerLtvAnalytics();
            } else {
                setLtvError(response.data.message || 'Failed to sync customer LTV data');
            }
        } catch (err) {
            console.error('❌ Error syncing customer LTV:', err);
            if (err.response) {
                setLtvError(`Server error: ${err.response.data?.error || err.response.statusText || 'Unknown error'}`);
            } else if (err.request) {
                setLtvError('No response from server. Please check your connection.');
            } else {
                setLtvError(`Error: ${err.message || 'Failed to sync customer LTV data'}`);
            }
        } finally {
            setLtvSyncLoading(false);
        }
    };

    // Get month range display for sync modal
    const getLtvSyncModalMonthRangeDisplay = () => {
        if (ltvSyncModalStartMonth === ltvSyncModalEndMonth && ltvSyncModalStartYear === ltvSyncModalEndYear) {
            return `${monthOptions.find(m => m.value === ltvSyncModalStartMonth)?.label} ${ltvSyncModalStartYear}`;
        }
        const startLabel = monthOptions.find(m => m.value === ltvSyncModalStartMonth)?.label;
        const endLabel = monthOptions.find(m => m.value === ltvSyncModalEndMonth)?.label;
        return `${startLabel} ${ltvSyncModalStartYear} - ${endLabel} ${ltvSyncModalEndYear}`;
    };

    // Get the actual number of months in the selected date range
    const getLtvSelectedMonthCount = () => {
        const monthRange = getLtvMonthRangeForAPI();
        return monthRange.length;
    };

    // Load LTV data on component mount and when dependencies change
    useEffect(() => {
        if (selectedStore) {
            fetchCustomerLtvAnalytics();
        }
    }, [fetchCustomerLtvAnalytics]);

    // Auto-hide success message after 5 seconds
    useEffect(() => {
        if (ltvSyncSuccess) {
            const timer = setTimeout(() => {
                setLtvSyncSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [ltvSyncSuccess]);

    // Fetch customer analytics
    const fetchCustomerAnalytics = async (page = 1, pageSize = pagination.pageSize, sortField = sortConfig.field, sortDirection = sortConfig.direction) => {
        try {
            setLoading(true);
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

            const response = await axios.get(`/api/customers/analytics?${params}`);
            setCustomers(response.data.data || []);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('❌ Error fetching customer analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch summary stats
    const fetchSummaryStats = async () => {
        try {
            const response = await axios.get(`/api/customers/summary/stats?storeId=${selectedStore}`);
            setSummaryStats(response.data.data || {});
        } catch (error) {
            console.error('❌ Error fetching summary stats:', error);
        }
    };

    // Fetch customer details
    const fetchCustomerDetails = async (customerId) => {
        try {
            setShowCustomerModal(true);
            setCustomerDetailsLoading(true);
            setSelectedCustomer(null);
            const response = await axios.get(`/api/customers/${customerId}?storeId=${selectedStore}`);
            setSelectedCustomer(response.data.data);
        } catch (error) {
            console.error('❌ Error fetching customer details:', error);
        } finally {
            setCustomerDetailsLoading(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        fetchCustomerAnalytics(1);
    };

    // Handle page change
    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
        fetchCustomerAnalytics(page);
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPagination(prev => ({ ...prev, pageSize: newPageSize, currentPage: 1 }));
        fetchCustomerAnalytics(1, newPageSize);
    };

    // Handle sorting
    const handleSort = (field) => {
        const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ field, direction: newDirection });
        fetchCustomerAnalytics(1, pagination.pageSize, field, newDirection);
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

    useEffect(() => {
        if (searchEmail === '') {
            handleSearch();
        }
    }, [searchEmail]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-full mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customers</h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage and analyze your customer base</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalCustomers || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-green-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryStats.totalRevenue || 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <ShoppingCart className="h-8 w-8 text-purple-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalOrders || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryStats.averageRevenue || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer LTV Cohort Analysis */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
                    {/* Global LTV Sync Status */}
                    {ltvSyncLoading && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-900">Syncing Customer LTV Data</h4>
                                    <p className="text-sm text-blue-700">
                                        Recalculating LTV cohorts for {getLtvSyncModalMonthRangeDisplay()}. This may take a few minutes...
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LTV Sync Success Message */}
                    {ltvSyncSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-green-900">LTV Sync Completed Successfully!</h4>
                                    <p className="text-sm text-green-700">
                                        Customer LTV data has been recalculated and updated.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LTV Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Customer LTV Cohort Analysis</h2>
                                <p className="text-gray-600">{getLtvMetricLabel()} for {getLtvMonthRangeDisplay()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Sync Customer LTV Button */}
                            <button
                                onClick={() => setShowLtvSyncModal(true)}
                                disabled={ltvLoading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
                                title="Sync customer LTV data"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Sync LTV
                            </button>
                            
                            {/* Refresh Button */}
                            <button
                                onClick={fetchCustomerLtvAnalytics}
                                disabled={ltvLoading}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                                title="Refresh data"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-600 ${ltvLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* LTV Controls */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
                        {/* Metric Selection */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Metric:</label>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                <button
                                    onClick={() => handleLtvMetricChange('ltv')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                        ltvMetric === 'ltv' 
                                            ? 'bg-purple-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <DollarSign className="w-4 h-4 inline mr-1" />
                                    LTV (Revenue)
                                </button>
                                <button
                                    onClick={() => handleLtvMetricChange('profit-ltv')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                        ltvMetric === 'profit-ltv' 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <TrendingUp className="w-4 h-4 inline mr-1" />
                                    Profit-LTV
                                </button>
                            </div>
                        </div>

                        {/* Year and Month Range Selectors */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Period:</span>
                            </div>
                            
                            {/* Start Year and Month */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">From:</span>
                                
                                <BeautifulSelect
                                    value={ltvStartYear}
                                    onChange={handleLtvStartYearChange}
                                    options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
                                    placeholder="Select year"
                                    size="sm"
                                    style={{height: 36}}
                                    className="min-w-[80px]"
                                />

                                <BeautifulSelect
                                    value={ltvStartMonth}
                                    onChange={handleLtvStartMonthChange}
                                    options={monthOptions}
                                    placeholder="Select month"
                                    size="sm"
                                    style={{height: 36}}
                                    className="min-w-[120px]"
                                />
                            </div>

                            <span className="text-sm font-medium text-gray-700">to</span>

                            {/* End Year and Month */}
                            <div className="flex items-center gap-2">
                                <BeautifulSelect
                                    value={ltvEndYear}
                                    onChange={handleLtvEndYearChange}
                                    options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
                                    placeholder="Select year"
                                    size="sm"
                                    style={{height: 36}}
                                    className="min-w-[80px]"
                                />

                                <BeautifulSelect
                                    value={ltvEndMonth}
                                    onChange={handleLtvEndMonthChange}
                                    options={monthOptions}
                                    placeholder="Select month"
                                    size="sm"
                                    style={{height: 36}}
                                    className="min-w-[120px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LTV Error Message */}
                    {ltvError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            {ltvError}
                        </div>
                    )}

                    {/* LTV Data Table */}
                    {ltvData.length > 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Table Header */}
                            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {getLtvMetricLabel()} - {getLtvMonthRangeDisplay()}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setLtvViewMode('table')}
                                            className={`p-2 rounded ${ltvViewMode === 'table' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <Grid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setLtvViewMode('chart')}
                                            className={`p-2 rounded ${ltvViewMode === 'chart' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <BarChart className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-gray-600">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search customer cohorts..."
                                        value={ltvSearchTerm}
                                        onChange={(e) => setLtvSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Table Content */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{textAlign: 'center'}}>
                                                MONTHS SINCE FIRST PURCHASE
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                
                                            </th>
                                        </tr>
                                        <tr>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>CUSTOMER COHORT</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>NEW CUSTOMERS</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>FIRST MONTH</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>CAC</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>R-%</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getLtvSelectedMonthCount()}, minmax(0, 1fr))` }}>
                                                    {Array.from({ length: getLtvSelectedMonthCount() }, (_, i) => {
                                                        const monthDate = new Date(ltvStartYear, ltvStartMonth - 1 + i, 1);
                                                        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
                                                        const year = monthDate.getFullYear();
                                                        return (
                                                            <div key={i} className="text-center">
                                                                <div className="font-bold">{i}</div>
                                                                <div className="text-xs">{monthName} {year}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {getFilteredLtvData().map((cohort, index) => (
                                            <tr key={cohort.cohortMonth} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 max-w-[140px] truncate" title={cohort.cohortMonth}>
                                                    {cohort.cohortMonthDisplay}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                                    {cohort.customerCount || 0}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    {getLtvMetricValue(cohort, 'month0')}
                                                </td>
                                                
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    {cohort.cac > 0 ? formatCurrency(cohort.cac) : '-'}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    {cohort.retentionRate > 0 ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            cohort.retentionRate >= 80 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : cohort.retentionRate >= 60
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {cohort.retentionRate.toFixed(1)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getLtvSelectedMonthCount()}, minmax(0, 1fr))` }}>
                                                        {Array.from({ length: getLtvSelectedMonthCount() }, (_, i) => {
                                                            const monthKey = `month${i}`;
                                                            const value = cohort[monthKey];
                                                            const isAvailable = value !== undefined && value !== null && value > 0;
                                                            
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`p-2 text-xs text-center rounded ${
                                                                        isAvailable 
                                                                            ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                                                            : 'bg-gray-200 text-gray-500 border border-gray-300 font-medium'
                                                                    }`}
                                                                >
                                                                    {isAvailable ? getLtvMetricValue(cohort, monthKey) : 'N/A'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                                    {getLtvMetricValue(cohort, 'totalValue')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Results Summary */}
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <div className="text-sm text-gray-600">
                                    Showing {getFilteredLtvData().length} of {ltvData.length} customer cohorts
                                    {ltvSearchTerm && ` matching "${ltvSearchTerm}"`}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                            <div className="text-gray-400 mb-4">
                                <TrendingUp className="mx-auto h-12 w-12" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer LTV Data Available</h3>
                            <p className="text-gray-500">
                                No customer LTV analytics found for {getLtvMonthRangeDisplay()}.
                            </p>
                        </div>
                    )}
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
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Customers Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
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
                                    <BeautifulSelect
                                        value={pagination.pageSize}
                                        onChange={(value) => handlePageSizeChange(parseInt(value))}
                                        options={[
                                            { value: 10, label: '10' },
                                            { value: 20, label: '20' },
                                            { value: 50, label: '50' },
                                            { value: 100, label: '100' }
                                        ]}
                                        placeholder="Select"
                                        disabled={loading}
                                        className="w-24"
                                        size="sm"
                                    />
                                    <span className="text-sm text-gray-500">per page</span>
                                </div>

                                {/* Pagination Controls */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex items-center space-x-2">
                                        {/* First page button */}
                                        <button
                                            onClick={() => handlePageChange(1)}
                                            disabled={pagination.currentPage === 1}
                                            className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === 1
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
                                            disabled={pagination.currentPage === 1}
                                            className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === 1
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
                                                                className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
                                                                    ? 'bg-primary-600 text-white'
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
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Next
                                        </button>

                                        {/* Last page button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.totalPages)}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages
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
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={() => handleSort('first_name')}
                                            className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                        >
                                            <span>Customer</span>
                                            {getSortIcon('first_name')}
                                        </button>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={() => handleSort('orders_count')}
                                            className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                        >
                                            <span>Orders</span>
                                            {getSortIcon('orders_count')}
                                        </button>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <button
                                            onClick={() => handleSort('total_orders_price')}
                                            className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
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
                                                Paid: {formatCurrency(customer.total_paid)}
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
                                    <BeautifulSelect
                                        value={pagination.pageSize}
                                        onChange={(value) => handlePageSizeChange(parseInt(value))}
                                        options={[
                                            { value: 10, label: '10' },
                                            { value: 20, label: '20' },
                                            { value: 50, label: '50' },
                                            { value: 100, label: '100' }
                                        ]}
                                        placeholder="Select"
                                        disabled={loading}
                                        className="w-24"
                                        size="sm"
                                    />
                                    <span className="text-sm text-gray-500">per page</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {/* First page button */}
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={pagination.currentPage === 1}
                                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === 1
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
                                        disabled={pagination.currentPage === 1}
                                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === 1
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
                                                            className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
                                                                ? 'bg-primary-600 text-white'
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
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages
                                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Next
                                    </button>

                                    {/* Last page button */}
                                    <button
                                        onClick={() => handlePageChange(pagination.totalPages)}
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                        {customerDetailsLoading ? 'Loading Customer Details...' : `Customer Details: ${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
                                    </h3>
                                    <button
                                        onClick={() => setShowCustomerModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
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
                        </div>
                    </div>
                )}

                {/* Customer LTV Sync Modal */}
                {showLtvSyncModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sync Customer LTV Data</h3>
                                <button
                                    onClick={() => setShowLtvSyncModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Select the year and month range to recalculate customer LTV cohort data.
                                </p>

                                {/* Date Range Selection */}
                                <div className="space-y-4">
                                    {/* From Date */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 block">From:</span>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                            <BeautifulSelect
                                                value={ltvSyncModalStartYear}
                                                onChange={setLtvSyncModalStartYear}
                                                options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
                                                placeholder="Year"
                                                size="sm"
                                                className="flex-1 min-w-0"
                                            />
                                            <BeautifulSelect
                                                value={ltvSyncModalStartMonth}
                                                onChange={setLtvSyncModalStartMonth}
                                                options={monthOptions}
                                                placeholder="Month"
                                                size="sm"
                                                className="flex-1 min-w-0"
                                            />
                                        </div>
                                    </div>

                                    {/* To Date */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 block">To:</span>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                            <BeautifulSelect
                                                value={ltvSyncModalEndYear}
                                                onChange={setLtvSyncModalEndYear}
                                                options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
                                                placeholder="Year"
                                                size="sm"
                                                className="flex-1 min-w-0"
                                            />
                                            <BeautifulSelect
                                                value={ltvSyncModalEndMonth}
                                                onChange={setLtvSyncModalEndMonth}
                                                options={monthOptions}
                                                placeholder="Month"
                                                size="sm"
                                                className="flex-1 min-w-0"
                                            />
                                        </div>
                                    </div>

                                    {/* Selected Range Display */}
                                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-full w-full sm:w-auto justify-center sm:justify-start">
                                        <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-purple-900 text-center sm:text-left">
                                            {getLtvSyncModalMonthRangeDisplay()}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        onClick={() => setShowLtvSyncModal(false)}
                                        disabled={ltvSyncLoading}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSyncCustomerLtv}
                                        disabled={ltvSyncLoading}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2"
                                    >
                                        {ltvSyncLoading ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4" />
                                                Sync LTV Data
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Customers;
