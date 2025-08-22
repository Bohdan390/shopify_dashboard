import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axios';
import { useSocket, SocketProvider } from '../contexts/SocketContext';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import SearchableSelect from './SearchableSelect';
import CustomerLTVLoader from './loaders/CustomerLTVLoader';
import {
    DollarSign,
    Calendar,
    TrendingUp,
    Grid,
} from 'lucide-react';
let isLtvLoading = false, timeOut = null
const CustomerLTV = () => {
	const { selectedStore, syncCompleted, adsSyncCompleted } = useStore();
    const [loading, setLoading] = useState(true);
    // Customer LTV State
    const [ltvData, setLtvData] = useState([]);
    const [ltvLoading, setLtvLoading] = useState(false);
    const [ltvMetric, setLtvMetric] = useState('ltv'); // 'ltv' or 'profit-ltv'
    const [ltvStartYear, setLtvStartYear] = useState(new Date().getFullYear());
    const [ltvEndYear, setLtvEndYear] = useState(new Date().getFullYear());
    const [ltvStartMonth, setLtvStartMonth] = useState(1);
    const [ltvEndMonth, setLtvEndMonth] = useState(new Date().getMonth() + 1);
    const [ltvViewMode, setLtvViewMode] = useState('table');
    const [socketConnected, setSocketConnected] = useState(false);

    // Product SKU State
    const [productSkus, setProductSkus] = useState([]);

    // Individual Product LTV State
    const [selectedProductSku, setSelectedProductSku] = useState('');

    // LTV Sync Modal State
    const [ltvSyncSuccess, setLtvSyncSuccess] = useState(false);

    // LTV Sync Progress Modal State
    const [ltvSyncProgress, setLtvSyncProgress] = useState({
        stage: '',
        message: '',
        progress: 0,
        total: 0,
        current: 0
    });

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

    // Fetch individual product LTV data
    const fetchIndividualProductLtv = async () => {
        console.log('🔌 Fetching individual product LTV', socket.readyState, isLtvLoading);
        if (isLtvLoading) return;
        isLtvLoading = true;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            isLtvLoading = false;
            return;
        }
        try {
            setLtvLoading(true);
            const params = new URLSearchParams({
                sku: selectedProductSku,
                storeId: selectedStore,
            });

            var startDate = ltvStartYear + "-" + (ltvStartMonth > 9 ? ltvStartMonth : "0" + ltvStartMonth);
            var endDate = ltvEndYear + "-" + (ltvEndMonth > 9 ? ltvEndMonth : "0" + ltvEndMonth);
            await api.post('/api/analytics/sync-customer-ltv-cohorts', {
                startDate,
                endDate,
                storeId: selectedStore || 'buycosari',
                socketId: socket?.id, // Use the WebSocket ID
                sku: selectedProductSku
            });
            console.log("isfinsiehd-----------")
            isLtvLoading = false;
        } catch (error) {
            console.error('❌ Error fetching customer analytics:', error);
            isLtvLoading = false;
        }
    };

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
        if (!ltvStartYear || !ltvStartMonth || !ltvEndYear || !ltvEndMonth || !selectedProductSku) return;
        fetchIndividualProductLtv();
    }, [selectedStore, ltvStartYear, ltvStartMonth, ltvEndYear, ltvEndMonth, selectedProductSku, socketConnected]);

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

    // Handle product selection for individual LTV analysis
    const handleProductSelection = (productSku) => {
        setSelectedProductSku(productSku);
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
        return ltvData
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

    // Listen for sync completion from GlobalStoreSelector and refresh data
    useEffect(() => {
        if (syncCompleted > 0 || adsSyncCompleted > 0) {
            if (selectedStore) {
                fetchCustomerLtvAnalytics();
            }
        }
    }, [syncCompleted, adsSyncCompleted, selectedStore]);

    // Auto-hide success message after 5 seconds
    useEffect(() => {
        if (ltvSyncSuccess) {
            const timer = setTimeout(() => {
                setLtvSyncSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [ltvSyncSuccess]);
    // Get socket from context
    const { socket, selectStore, addEventListener, reconnect, isConnected } = useSocket();

    useEffect(() => {
        console.log('🔌 Socket status check:', {
            socket: !!socket,
            connected: socket?.connected,
            id: socket?.id,
            store: selectedStore,
            sku: selectedProductSku
        });
        handleProductLtv();
    }, [socket, selectedStore, selectedProductSku]);

    const handleProductLtv = async () => {
        if (selectedStore && selectedProductSku) {
            // Check if socket is truly functional
            console.log('Socket state:', socket?.readyState, 'Socket ID:', socket?.id);
            if (socket && socket.readyState === WebSocket.OPEN) {
                clearTimeout(timeOut);
                socket.send(JSON.stringify({
                    type: "refresh_product_skus",
                    data: selectedProductSku
                }));
            }
            else {
                console.log('🔌 Socket not connected, attempting to reconnect...');
                timeOut = setTimeout(() => {
                    handleProductLtv();
                }, 2000);
            }
        }
    }
    // Select store for socket when component mounts
    useEffect(() => {
        if (!socket) return;
        
        // Select store for this socket connection
        if (selectedStore) {
            selectStore(selectedStore);
        }
        
        // Add event listener for syncProgress
        addEventListener('refresh_product_skus', (data) => {
            console.log('🔌 Refreshing product skus');
            fetchIndividualProductLtv();
        });
        const removeListener = addEventListener('syncProgress', (data) => {
            if (data.stage && data.stage === 'calculating') {
                setLtvSyncProgress({
                    stage: data.stage,
                    message: data.message,
                    progress: data.progress,
                    total: data.total || 0,
                    current: data.current || 0
                });
            }
            else if (data.stage === 'completed') {
                setTimeout(() => {
                    setLtvSyncProgress({
                        stage: "",
                        message: "",
                        progress: 100,
                        total: 0,
                        current: 0
                    });
                }, 500);
            }
            else if (data.stage == "get_customer_ltv_cohorts") {
                console.log('🔌 LTV data received', JSON.parse(data.data));
                setLtvLoading(false);
                setLtvData(JSON.parse(data.data) || []);
            }
        });

        // Cleanup event listener when component unmounts
        return removeListener;
    }, [socket, selectedStore, selectStore, addEventListener]);

    // Fetch product SKUs
    const fetchProductSkus = async () => {
        try {
            const response = await api.get('/api/customers/products-sku', {
                params: {
                    storeId: selectedStore || 'buycosari'
                }
            });

            if (response.data && response.data.data) {
                setProductSkus(response.data.data);
                if (response.data.data.length > 0) {
                    setSelectedProductSku(response.data.data[0].sku_id);
                }
            } else {
                setProductSkus([]);
            }
        } catch (error) {
            console.error('❌ Error fetching product SKUs:', error);
            setProductSkus([]);
        } finally {
            setLoading(false);
        }
    };



    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Effects
    useEffect(() => {
        if (selectedStore) {
            fetchProductSkus();
        }
    }, [selectedStore]);

    // Refresh individual product LTV when date range changes
    if (loading) {
        return <CustomerLTVLoader />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customers</h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage and analyze your customer base</p>
                </div>

                {/* Customer LTV Cohort Analysis */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
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
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Product SKU:
                        </label>
                        <SearchableSelect
                            value={selectedProductSku}
                            onChange={handleProductSelection}
                            options={[
                                { value: '', label: 'Choose a product...' },
                                ...productSkus.map(sku => ({ value: sku.sku_id, label: sku.sku_title }))
                            ]}
                            placeholder="Select a product to analyze"
                            searchPlaceholder="Search products..."
                            size="md"
                            className="w-full max-w-md"
                        />
                    </div>
                    {/* LTV Controls */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6">
                        {/* Metric Selection */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Metric:</label>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                <button
                                    onClick={() => handleLtvMetricChange('ltv')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${ltvMetric === 'ltv'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <DollarSign className="w-4 h-4 inline mr-1" />
                                    LTV (Revenue)
                                </button>
                                <button
                                    onClick={() => handleLtvMetricChange('profit-ltv')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${ltvMetric === 'profit-ltv'
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
                                    style={{ height: 36 }}
                                    className="min-w-[80px]"
                                />

                                <BeautifulSelect
                                    value={ltvStartMonth}
                                    onChange={handleLtvStartMonthChange}
                                    options={monthOptions}
                                    placeholder="Select month"
                                    size="sm"
                                    style={{ height: 36 }}
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
                                    style={{ height: 36 }}
                                    className="min-w-[80px]"
                                />

                                <BeautifulSelect
                                    value={ltvEndMonth}
                                    onChange={handleLtvEndMonthChange}
                                    options={monthOptions}
                                    placeholder="Select month"
                                    size="sm"
                                    style={{ height: 36 }}
                                    className="min-w-[120px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LTV Loading State */}
                    {ltvLoading && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <span>Loading customer LTV data for {getLtvMonthRangeDisplay()}...</span>
                            </div>
                        </div>
                    )}

                    {/* LTV Data Table */}
                    {ltvLoading ? (
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
                            {(ltvSyncProgress.stage === 'calculating' || ltvSyncProgress.stage === 'completed') && (
                                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                                    <div className="relative w-48 bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                                        <div
                                            className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${ltvSyncProgress.progress}%` }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40 rounded-full" />
                                    </div>
                                    <div className="flex items-center justify-between ml-2">
                                        <span className="text-xs font-medium text-gray-800 flex-shrink-0">{ltvSyncProgress.progress}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : ltvData.length > 0 ? (
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
                                    </div>
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
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ textAlign: 'center' }}>
                                                MONTHS SINCE FIRST PURCHASE
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                                            </th>
                                        </tr>
                                        <tr>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>CUSTOMER COHORT</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>NEW CUSTOMERS</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>CAC</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>R-%</th>
                                            <th className='font-medium text-gray-500 uppercase text-xs'>FIRST ORDER</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getLtvSelectedMonthCount()}, minmax(0, 1fr))` }}>
                                                    {Array.from({ length: getLtvSelectedMonthCount() }, (_, i) => {
                                                        const monthDate = new Date(ltvStartYear, ltvStartMonth - 1 + i, 1);
                                                        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
                                                        const year = monthDate.getFullYear();
                                                        return (
                                                            <div key={i} className="text-center">
                                                                <div className="font-bold">{i}</div>
                                                                {/* <div className="text-xs">{monthName} {year}</div> */}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </th>
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
                                                    {cohort.cac > 0 ? formatCurrency(cohort.cac) : '-'}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    {
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cohort.retentionRate >= 80
                                                            ? 'bg-green-100 text-green-800'
                                                            : cohort.retentionRate >= 60
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {cohort.retentionRate.toFixed(1)}%
                                                        </span>
                                                    }
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div
                                                        className={`p-2 text-xs text-center rounded ${ltvMetric === 'profit-ltv' ? 'bg-green-100' : 'bg-purple-100'} text-purple-900 border border-purple-200`}
                                                    >
                                                        {cohort.first_order_price > 0 ? formatCurrency(cohort.first_order_price) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getLtvSelectedMonthCount()}, minmax(0, 1fr))` }}>
                                                        {Array.from({ length: getLtvSelectedMonthCount() }, (_, i) => {
                                                            const monthKey = ltvMetric === 'profit-ltv' ? `monthProfit${i}` : `monthRevenue${i}`;
                                                            const value = cohort[monthKey];
                                                            const isAvailable = value !== undefined && value !== null;

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`p-2 text-xs text-center rounded ${isAvailable
                                                                        ? `${ltvMetric === 'profit-ltv' ? 'bg-green-100' : 'bg-purple-100'} text-purple-900 border border-purple-200`
                                                                        : 'bg-gray-200 text-gray-500 border border-gray-300 font-medium'
                                                                        }`}
                                                                >
                                                                    {isAvailable ? getLtvMetricValue(cohort, monthKey) : 'N/A'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
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
            </div>
        </div>
    );
};

export default CustomerLTV;
