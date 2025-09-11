import React, { useState, useEffect, Fragment } from 'react';
import { ShoppingCart, Search, Filter, Calendar, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Checkbox, FormControlLabel } from '@mui/material';
import api from "../config/axios"
import BeautifulSelect from './BeautifulSelect';
import OrdersLoader from './loaders/OrdersLoader';
import OrdersTableLoader from './loaders/OrdersTableLoader';
import LoadingSpinner from './LoadingSpinner';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useStore } from '../contexts/StoreContext';

const G = require("../config/global")

let isLoading = false;
const Orders = () => {
	const { selectedStore, syncCompleted, adsSyncCompleted } = useStore();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [tableLoading, setTableLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
	const [unfulfilledFilter, setUnfulfilledFilter] = useState(false);
	const [pageSize, setPageSize] = useState(10);
	const [error, setError] = useState(null);
	const [showDatePresets, setShowDatePresets] = useState(false);
	const [pagination, setPagination] = useState({
		currentPage: 1,
		totalPages: 1,
		totalOrders: 0,
		pageSize: 10,
		hasNext: false,
		hasPrev: false
	});
	const [overallStats, setOverallStats] = useState({
		totalOrders: 0,
		paidOrders: 0,
		totalRevenue: 0,
		avgOrderValue: 0
	});
	const [urgentOrdersCount, setUrgentOrdersCount] = useState(0);
	const [filteredOrderCount, setFilteredOrderCount] = useState(0);
	const [sortConfig, setSortConfig] = useState({
		key: 'created_at',
		direction: 'desc'
	});
	const formatLocalDate = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Date range state
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
	});

	// Preset period state
	const [period, setPeriod] = useState('30');
	const [periodType, setPeriodType] = useState('days');
	const [showCustomDateRange, setShowCustomDateRange] = useState(false);

	// Calendar states
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);

	// Collapsible table state
	const [expandedOrders, setExpandedOrders] = useState(new Set());
	const [orderLineItems, setOrderLineItems] = useState({});
	const [loadingLineItems, setLoadingLineItems] = useState(new Set());

	useEffect(() => {
		fetchOrders();
		fetchOverallStats();
	}, [selectedStore]);

	// Listen for sync completion from GlobalStoreSelector
	useEffect(() => {
		if (syncCompleted > 0 || adsSyncCompleted > 0) {
			fetchOrders();
			fetchOverallStats();
		}
	}, [syncCompleted, adsSyncCompleted]);

	// Only search when filters change (not when typing)
	useEffect(() => {
		setSearchLoading(true);
		fetchOrders(1, false, true).finally(() => setSearchLoading(false));
	}, [statusFilter, fulfillmentFilter, unfulfilledFilter]);

	// Automatically fetch data when date range changes
	useEffect(() => {
		if (dateRange.startDate && dateRange.endDate) {
			setSearchLoading(true);
			Promise.all([
				fetchOrders(1, false, true),
				fetchOverallStats()
			]).finally(() => setSearchLoading(false));
		}
	}, [dateRange.startDate, dateRange.endDate]);

	// Reset to page 1 when page size changes
	useEffect(() => {
		fetchOrders(1, false, true);
	}, [pageSize]);

	// Fetch order line items from server
	const fetchOrderLineItems = async (orderId) => {
		try {
			setLoadingLineItems(prev => new Set([...prev, orderId]));
			const response = await api.get(`/api/shopify/order-line-items?order_id=${orderId}`);
			
			// Handle different response structures
			let lineItems = [];
			console.log('API Response for order', orderId, ':', response.data);
			
			if (response.data) {
				if (Array.isArray(response.data)) {
					lineItems = response.data;
				} else if (response.data.line_items && Array.isArray(response.data.line_items)) {
					lineItems = response.data.line_items;
				} else if (response.data.items && Array.isArray(response.data.items)) {
					lineItems = response.data.items;
				} else {
					console.warn('Unexpected line items response structure:', response.data);
					lineItems = [];
				}
			}
			
			console.log('Processed line items:', lineItems);
			
			setOrderLineItems(prev => ({...prev, [orderId]: lineItems}));
		} catch (error) {
			console.error('Error fetching line items:', error);
			// Set empty array to prevent infinite loading
			setOrderLineItems(prev => ({...prev, [orderId]: []}));
		} finally {
			setLoadingLineItems(prev => {
				const newSet = new Set(prev);
				newSet.delete(orderId);
				return newSet;
			});
		}
	};

	// Handle row expansion/collapse
	const handleRowClick = (orderId) => {
		if (expandedOrders.has(orderId)) {
			// Collapse
			setExpandedOrders(prev => {
				const newSet = new Set(prev);
				newSet.delete(orderId);
				return newSet;
			});
		} else {
			// Expand
			setExpandedOrders(prev => new Set([...prev, orderId]));
			// Fetch line items if not already loaded
			if (!orderLineItems[orderId]) {
				fetchOrderLineItems(orderId);
			}
		}
	};

	// Automatically reload data when search is cleared
	useEffect(() => {
		if (searchTerm === '') {
			// Reset to first page and fetch all orders when search is cleared
			fetchOrders(1, false, true);
		}
	}, [searchTerm]);

	const fetchOrders = async (page = 1, showRefresh = false, isTableOnly = false, customSortConfig = null) => {
		if (isLoading) return;
		isLoading = true;
		if (showRefresh) return;
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
				limit: pageSize.toString(),
				page: page.toString(),
				storeId: selectedStore
			});

			// Add search parameter if provided
			if (searchTerm.trim()) {
				params.append('search', searchTerm.trim());
			}

			// Add status filter if not 'all'
			if (statusFilter !== 'all') {
				params.append('status', statusFilter);
			}

			// Add fulfillment filter if not 'all'
			if (fulfillmentFilter !== 'all') {
				params.append('fulfillmentStatus', fulfillmentFilter);
			}

			// Add unfulfilled filter for orders older than 48 hours
			if (unfulfilledFilter) {
				params.append('unfulfilledOlderThan', 48);
			}

			// Add date range parameters if both dates are selected
			if (dateRange.startDate && dateRange.endDate) {
				params.append('startDate', dateRange.startDate);
				params.append('endDate', dateRange.endDate);
			}

			// Add sort parameters (use custom sort config if provided, otherwise use current sortConfig)
			const sortToUse = customSortConfig || sortConfig;
			params.append('sortBy', sortToUse.key);
			params.append('sortDirection', sortToUse.direction);

			const response = await api.get(`/api/shopify/orders?${params.toString()}`);
			setOrders(response.data.orders);
			setPagination(response.data.pagination);
			setFilteredOrderCount(response.data.pagination.totalOrders);
			
			// Calculate urgent orders count
			const urgentCount = response.data.orders.filter(order => isOrderUrgent(order)).length;
			setUrgentOrdersCount(urgentCount);
			
			// Show success message for sorting if custom sort config was used
		} catch (error) {
			console.error('Error fetching orders:', error);
			setError('Failed to fetch orders. Please try again.');
			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to fetch orders. Please try again.', 'error');
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
			setTableLoading(false);
			isLoading = false;
		}
	};

	const fetchOverallStats = async () => {
		try {
			const params = new URLSearchParams({
				storeId: selectedStore
			});

			// Add date range parameters if both dates are selected
			if (dateRange.startDate && dateRange.endDate) {
				params.append('startDate', dateRange.startDate);
				params.append('endDate', dateRange.endDate);
			}

			const response = await api.get(`/api/shopify/stats?${params.toString()}`);
			setOverallStats(response.data);
		} catch (error) {
			console.error('Error fetching overall stats:', error);
			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to fetch order statistics', 'error');
			}
		}
	};

	const handleSearch = () => {
		// if (!searchTerm.trim()) {
		// 	if (window.showPrimeToast) {
		// 		window.showPrimeToast('Please enter a search term', 'warning');
		// 	}
		// 	return;
		// }
		
		setSearchLoading(true);
		fetchOrders(1, false, true).finally(() => setSearchLoading(false));
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	const clearAllFilters = () => {
		setStatusFilter('all');
		setFulfillmentFilter('all');
		setUnfulfilledFilter(false);
		setSearchTerm('');
		setDateRange({
			startDate: formatLocalDate(new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)),
			endDate: formatLocalDate(new Date())
		});
		setPeriod('30');
		setPeriodType('days');
	};

	const showUrgentOrders = () => {
		setStatusFilter('all');
		setFulfillmentFilter('unfulfilled');
		setUnfulfilledFilter(true);
		setSearchTerm('');
		// Set a wide date range to capture all urgent orders
		const now = new Date();
		const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
		setDateRange({
			startDate: formatLocalDate(threeMonthsAgo),
			endDate: formatLocalDate(now)
		});
		setPeriod('90');
		setPeriodType('days');
	};

	// Calculate 48 hours ago timestamp for unfulfilled filter
	const get48HoursAgo = () => {
		const now = new Date();
		const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
		return fortyEightHoursAgo.toISOString();
	};

	// Check if an order is older than 48 hours and unfulfilled
	const isOrderUrgent = (order) => {
		if (order.fulfillment_status !== 'unfulfilled') return false;
		const orderDate = new Date(order.created_at);
		const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
		return orderDate < fortyEightHoursAgo;
	};

	// Preset period functions
	const getLastDaysRange = (days) => {
		const endDate = new Date();
		const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
		
		const formatLocalDate = (date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		return {
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(endDate)
		};
	};

	const getThisMonthRange = () => {
		const now = new Date();
		const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		
		const formatLocalDate = (date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		return {
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(endDate)
		};
	};

	const getLastMonthRange = () => {
		const now = new Date();
		const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
		
		const formatLocalDate = (date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		return {
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(endDate)
		};
	};

	const handlePeriodChange = (newPeriod) => {
		setPeriod(newPeriod);
		setShowCustomDateRange(false);
		
		let newDateRange;
		let newPeriodType = 'days';
		
		switch (newPeriod) {
			case '7':
				newDateRange = getLastDaysRange(7);
				break;
			case '30':
				newDateRange = getLastDaysRange(30);
				break;
			case '90':
				newDateRange = getLastDaysRange(90);
				break;
			case 'thisMonth':
				newDateRange = getThisMonthRange();
				newPeriodType = 'months';
				break;
			case 'lastMonth':
				newDateRange = getLastMonthRange();
				newPeriodType = 'months';
				break;
			default:
				newDateRange = getLastDaysRange(30);
		}
		
		setPeriodType(newPeriodType);
		setDateRange(newDateRange);
	};

	// Auto-adjust date range when unfulfilled filter is enabled
	useEffect(() => {
		if (unfulfilledFilter) {
			// If unfulfilled filter is enabled, ensure we have a wide enough date range
			// to capture orders older than 48 hours
			const now = new Date();
			const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
			
			if (!dateRange.startDate || new Date(dateRange.startDate) > threeMonthsAgo) {
				setDateRange({
					startDate: formatLocalDate(threeMonthsAgo),
					endDate: formatLocalDate(now)
				});
				setPeriod('90');
				setPeriodType('days');
			}
		}
	}, [unfulfilledFilter]);

	const getPeriodDisplayLabel = () => {
		switch (period) {
			case '7':
				return 'Last 7 Days';
			case '30':
				return 'Last 30 Days';
			case '90':
				return 'Last 90 Days';
			case 'thisMonth':
				return 'This Month';
			case 'lastMonth':
				return 'Last Month';
			default:
				return 'Last 30 Days';
		}
	};

	const toggleDateRangeMode = () => {
		setShowCustomDateRange(!showCustomDateRange);
		if (!showCustomDateRange) {
			// Switching to custom date range, reset period
			setPeriod('30');
			setPeriodType('days');
		}
	};

	// Date range handlers
	const handleDateRangeChange = async () => {
		if (dateRange.startDate && dateRange.endDate) {
			try {
				setSearchLoading(true);
				await fetchOrders(1, false, true);
				await fetchOverallStats();
			} catch (error) {
				console.error('Error fetching orders with date range:', error);
				if (window.showPrimeToast) {
					window.showPrimeToast('Failed to apply date range filter', 'error');
				}
			} finally {
				setSearchLoading(false);
			}
		} else {
			if (window.showPrimeToast) {
				window.showPrimeToast('Please select both start and end dates', 'warning');
			}
		}
	};

	const handleDatePreset = (preset) => {
		const today = new Date();
		let startDate = new Date();

		switch (preset) {
			case 'today':
				startDate = today;
				break;
			case 'yesterday':
				startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
				break;
			case 'last7days':
				startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case 'last30days':
				startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			case 'last90days':
				startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
				break;
			case 'thisMonth':
				startDate = new Date(today.getFullYear(), today.getMonth(), 1);
				break;
			case 'lastMonth':
				startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
				const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
				setDateRange({
					startDate: formatLocalDate(startDate),
					endDate: formatLocalDate(lastMonthEnd)
				});
				setShowDatePresets(false);
				return;
			default:
				return;
		}

		setDateRange({
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(today)
		});
		setShowDatePresets(false);
	};

	const handleStartDateSelect = (date) => {
		setDateRange(prev => ({ ...prev, startDate: date }));
	};

	const handleEndDateSelect = (date) => {
		setDateRange(prev => ({ ...prev, endDate: date }));
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'paid':
				return 'bg-success-100 text-success-800';
			case 'partially_paid':
				return 'bg-warning-100 text-warning-800';
			case 'pending':
				return 'bg-warning-100 text-warning-800';
			case 'refunded':
				return 'bg-danger-100 text-danger-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Sorting functions
	const handleSort = (key) => {
		let direction = 'asc';
		if (sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		const newSortConfig = { key, direction };
		setSortConfig(newSortConfig);
		
		// Fetch orders with new sort configuration using the consolidated function
		fetchOrders(1, false, true, newSortConfig);
	};

	const getSortIcon = (key) => {
		if (sortConfig.key !== key) {
			return (
				<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
				</svg>
			);
		}
		return sortConfig.direction === 'asc' ? (
			<svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
			</svg>
		) : (
			<svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
			</svg>
		);
	};



	// Pagination component
	const PaginationControls = () => {
		if (pagination.totalPages <= 1) return null;

		// Generate smart page numbers
		const generatePageNumbers = () => {
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

			return pages;
		};

		const pageNumbers = generatePageNumbers();

		return (
			<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
				<div className="flex items-center gap-2">
					{/* Page Size Selector */}


					{/* Pagination Info */}
					<div className="flex items-center text-sm text-gray-700">
						<span>
							Showing {((pagination.currentPage - 1) * pageSize) + 1} to{' '}
							{Math.min(pagination.currentPage * pageSize, pagination.totalOrders)} of{' '}
							{pagination.totalOrders} orders
						</span>
					</div>
				</div>

				<div className="flex items-center space-x-2">
					{/* First page button */}
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700">Show:</span>
						<div>
							<BeautifulSelect
								value={pageSize}
								onChange={(value) => setPageSize(parseInt(value))}
								options={[
									{ value: 10, label: '10' },
									{ value: 25, label: '25' },
									{ value: 50, label: '50' },
									{ value: 100, label: '100' }
								]}
								selectClass="pagesize-select"
								placeholder="Select"
								disabled={searchLoading || tableLoading}
								className="w-24"
								size="sm"
							/>
						</div>
						<span className="text-sm text-gray-500">per page</span>
					</div>
					<button
						onClick={() => fetchOrders(1, false, true)}
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
						onClick={() => fetchOrders(pagination.currentPage - 1, false, true)}
						disabled={!pagination.hasPrev || tableLoading}
						className={`px-3 py-1 text-sm rounded-md ${pagination.hasPrev && !tableLoading
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Previous
					</button>

					{/* Page numbers */}
					<div className="flex items-center space-x-1">
												{pageNumbers.map((page, index) => (
							<Fragment key={index}>
								{page === '...' ? (
									<span className="px-2 text-gray-500">...</span>
								) : (
									<button
										onClick={() => fetchOrders(page, false, true)}
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
							</Fragment>
						))}
					</div>

					{/* Next button */}
					<button
						onClick={() => fetchOrders(pagination.currentPage + 1, false, true)}
						disabled={!pagination.hasNext || tableLoading}
						className={`px-3 py-1 text-sm rounded-md ${pagination.hasNext && !tableLoading
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Next
					</button>

					{/* Last page button */}
					<button
						onClick={() => fetchOrders(pagination.totalPages, false, true)}
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
		);
	};



	if (loading && !refreshing) {
		return <OrdersLoader />;
	}

	return (
		<div className="p-8">
			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Orders</h1>
					<p className="text-gray-600 mt-1">
						Manage and view your Shopify orders
						{pagination.totalPages > 1 && ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
					</p>
				</div>
			</div>

			{/* Filters */}
			<div className="card mb-6">
				<div className="flex flex-col gap-4">
					{/* Search and Status Filters */}

					{/* Date Range Filters */}
					<div className="flex flex-col md:flex-row gap-2 items-end">
						{/* Custom Date Range */}
						<div className="flex flex-col md:flex-row gap-2 flex-1">
							<div className="flex flex-col">
								<label className="text-xs text-gray-600 mb-1">Start Date</label>
								<LocalizationProvider dateAdapter={AdapterDayjs}>
									<DemoContainer components={['DatePicker', 'DatePicker']}>
										<DatePicker
											value={dayjs(dateRange.startDate)}
											onChange={(newValue) => {
												var startDate = G.createLocalDateWithTime(newValue['$d']).toISOString().split('T')[0]
												setDateRange({ ...dateRange, startDate })
											}} />
									</DemoContainer>
								</LocalizationProvider>
							</div>
							<span className="flex items-center text-gray-500" style={{marginTop: 18}}>to</span>
							<div className="flex flex-col">
								<label className="text-xs text-gray-600 mb-1">End Date</label>
								<LocalizationProvider dateAdapter={AdapterDayjs}>
									<DemoContainer components={['DatePicker', 'DatePicker']}>
										<DatePicker
											value={dayjs(dateRange.endDate)}
											onChange={(newValue) => {
												var endDate = G.createLocalDateWithTime(newValue['$d']).toISOString().split('T')[0]
												setDateRange({ ...dateRange, endDate })
											}} />
									</DemoContainer>
								</LocalizationProvider>
							</div>
							<div className="flex flex-col">
									<label className="text-xs text-gray-600 mb-1">Quick Filters</label>
									<div className="relative date-presets-container">
										<button
											onClick={() => setShowDatePresets(!showDatePresets)}
											className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
										>
											<Filter className="w-4 h-4" />
											Presets
										</button>

										{showDatePresets && (
											<div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
												<div className="py-1">
													<button onClick={() => handleDatePreset('today')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Today</button>
													<button onClick={() => handleDatePreset('yesterday')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Yesterday</button>
													<button onClick={() => handleDatePreset('last7days')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Last 7 Days</button>
													<button onClick={() => handleDatePreset('last30days')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Last 30 Days</button>
													<button onClick={() => handleDatePreset('last90days')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Last 90 Days</button>
													<button onClick={() => handleDatePreset('thisMonth')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">This Month</button>
													<button onClick={() => handleDatePreset('lastMonth')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Last Month</button>
												</div>
											</div>
										)}
									</div>
								</div>
						</div>

						{/* Date Range Display */}
						{(dateRange.startDate || dateRange.endDate) && (
							<div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
								<div className="flex items-center justify-between">
									<span>Selected: {dateRange.startDate || 'Not set'} to {dateRange.endDate || 'Not set'}</span>
									{searchLoading && (
										<div className="flex items-center gap-1 text-blue-600">
											<LoadingSpinner size="xs" variant="spinner" />
											<span>Updating...</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Search orders by number or email..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyPress={handleKeyPress}
									className="input-field pl-10 pr-20"
									disabled={searchLoading || tableLoading}
								/>
							</div>
						</div>
						<div className="flex gap-4">
							<BeautifulSelect
								value={statusFilter}
								onChange={setStatusFilter}
								options={[
									{ value: 'all', label: 'All Status' },
									{ value: 'paid', label: 'Paid' },
									{ value: 'partially_paid', label: 'Partially Paid' },
									{ value: 'pending', label: 'Pending' },
									{ value: 'partially_refunded', label: 'Partially Refunded' },
									{ value: 'refunded', label: 'Refunded' }
								]}
								placeholder="Select status"
								disabled={searchLoading || tableLoading}
								selectClass='lpa-select'
								style={{ height: '42px' }}								
								className="w-40"
								size="md"
							/>
						</div>
					</div>
					
					{/* Special Unfulfilled Filter */}
					<div className="border border-orange-200 rounded-lg">
						<FormControlLabel
							control={
								<Checkbox
									checked={unfulfilledFilter}
									onChange={(e) => setUnfulfilledFilter(e.target.checked)}
									disabled={searchLoading || tableLoading}
									sx={{
										color: '#ea580c', // orange-600
										'&.Mui-checked': {
											color: '#ea580c', // orange-600
										},
										'&.Mui-disabled': {
											color: '#d1d5db', // gray-300
										}
									}}
								/>
							}
							label={
								<span className="text-sm font-semibold text-orange-800">
									Orders Not Fulfilled - Order Made More Than 48 Hours Ago
								</span>
							}
							sx={{
								margin: 0,
								'& .MuiFormControlLabel-label': {
									color: '#92400e', // orange-800
									fontWeight: 600,
									fontSize: '0.875rem'
								}
							}}
						/>
					</div>
					
					{/* Action Buttons */}
					<div style={{textAlign: 'right'}}>
						<button
							onClick={clearAllFilters}
							disabled={searchLoading || tableLoading}
							className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Clear All Filters
						</button>
					</div>
				</div>
			</div>


			{/* Status Messages */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-red-500" />
						<div>
							<h3 className="text-sm font-medium text-red-800">Error Loading Orders</h3>
							<p className="text-sm text-red-700 mt-1">{error}</p>
						</div>
						<button
							onClick={() => fetchOrders(1, false, true)}
							className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
						>
							Retry
						</button>
					</div>
				</div>
			)}

			{/* Success Message */}

			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
				<div className="stat-card">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Orders</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
								) : (
									overallStats.totalOrders
								)}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-primary-50">
							<ShoppingCart className="w-6 h-6 text-primary-600" />
						</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Paid Orders</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
								) : (
									overallStats.paidOrders
								)}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-success-50">
							<div className="w-6 h-6 text-success-600">✓</div>
						</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Revenue</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
								) : (
									formatCurrency(overallStats.totalRevenue)
								)}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-success-50">
							<div className="w-6 h-6 text-success-600">$</div>
						</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Avg Order Value</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
								) : (
									formatCurrency(overallStats.avgOrderValue)
								)}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-warning-50">
							<div className="w-6 h-6 text-warning-600">📊</div>
						</div>
					</div>
				</div>
			</div>
			{/* Orders Table */}
			<div className="card mt-4">
				{/* Filter Summary */}
				{(statusFilter !== 'all' || fulfillmentFilter !== 'all' || unfulfilledFilter || searchTerm.trim()) && (
					<div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Filter className="w-4 h-4 text-blue-600" />
								<span className="text-sm font-medium text-blue-800">
									Filtered Results: {filteredOrderCount} orders
								</span>
							</div>
							<div className="text-xs text-blue-600">
								{statusFilter !== 'all' && `Status: ${statusFilter} • `}
								{fulfillmentFilter !== 'all' && `Fulfillment: ${fulfillmentFilter} • `}
								{unfulfilledFilter && '🚨 Unfulfilled > 48h • '}
								{searchTerm.trim() && `Search: "${searchTerm}"`}
							</div>
						</div>
					</div>
				)}
				
				{/* Top Pagination */}
				<PaginationControls />

				{/* Table Loading Overlay */}
				{refreshing && (
					<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
						<div className="text-center">
							<LoadingSpinner size="lg" variant="spinner" />
							<p className="text-gray-600 mt-2">Refreshing orders...</p>
						</div>
					</div>
				)}

				{/* Show table loader when tableLoading is true */}
				{tableLoading ? (
					<OrdersTableLoader />
				) : (
					<div className="overflow-x-auto relative">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50">
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('shopify_order_id') : undefined}
									>
										<div className="flex items-center gap-2">
											Order #
											{getSortIcon('shopify_order_id')}
										</div>
									</th>
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('customer_email') : undefined}
									>
										<div className="flex items-center gap-2">
											Customer
											{getSortIcon('customer_email')}
										</div>
									</th>
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('total_price') : undefined}
									>
										<div className="flex items-center gap-2">
											Amount
											{getSortIcon('total_price')}
										</div>
									</th>
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('financial_status') : undefined}
									>
										<div className="flex items-center gap-2">
											Status
											{getSortIcon('financial_status')}
										</div>
									</th>
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('fulfillment_status') : undefined}
									>
										<div className="flex items-center gap-2">
											Fulfillment
											{getSortIcon('fulfillment_status')}
										</div>
									</th>
									<th
										className={`text-left py-3 px-4 font-medium text-gray-700 select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
										onClick={!tableLoading ? () => handleSort('created_at') : undefined}
									>
										<div className="flex items-center gap-2">
											Date
											{getSortIcon('created_at')}
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{orders.map((order) => (
									<Fragment key={order.shopify_order_id}>
										<tr 
											onClick={() => handleRowClick(order.shopify_order_id)}
											className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
												isOrderUrgent(order) ? 'bg-red-50 border-l-4 border-l-red-500' : ''
											}`}
										>
											<td className="py-3 px-4">
												<span className="font-medium text-gray-900">{order.shopify_order_id}</span>
											</td>
											<td className="py-3 px-4">
												<div>
													<div className="text-sm text-gray-900">{order.customer_email}</div>
												</div>
											</td>
											<td className="py-3 px-4">
												<span className="font-medium text-gray-900">
													{formatCurrency(order.total_price)}
													{
														order.financial_status === 'partially_refunded' && (
															<span className="text-xs text-gray-500">
																({formatCurrency(order.refund_price)})
															</span>
														)
													}
												</span>
											</td>
											<td className="py-3 px-4">
												<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.financial_status)}`}>
													{order.financial_status}
												</span>
											</td>
											<td className="py-3 px-4">
												<div className="flex items-center gap-2">
													<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${order.fulfillment_status === 'fulfilled'
														? 'bg-success-100 text-success-800'
														: 'bg-gray-100 text-gray-800'
														}`}>
														{order.fulfillment_status == 'fulfilled' ? 'Fulfilled' : 'Unfulfilled'}
													</span>
													{isOrderUrgent(order) && (
														<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
															🚨 Urgent
														</span>
													)}
												</div>
											</td>
											<td className="py-3 px-4 text-sm text-gray-600">
												{formatDate(order.created_at)}
											</td>
										</tr>
										
										{/* Expanded Line Items Row */}
										{expandedOrders.has(order.shopify_order_id) && (
											<tr className="bg-gray-50">
												<td colSpan="7" className="p-0">
													<div className="p-6">
														{loadingLineItems.has(order.shopify_order_id) ? (
															<div className="flex items-center justify-center py-8">
																<LoadingSpinner size="md" variant="spinner" />
																<span className="ml-3 text-gray-600">Loading line items...</span>
															</div>
														) : orderLineItems[order.shopify_order_id] && Array.isArray(orderLineItems[order.shopify_order_id]) && orderLineItems[order.shopify_order_id].length > 0 ? (
															<div>
																<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
																	<ShoppingCart className="w-5 h-5 text-blue-600" />
																	Order Line Items
																</h4>
																<div className="overflow-x-auto">
																	<table className="min-w-full bg-white rounded-lg border border-gray-200">
																		<thead className="bg-gray-50">
																			<tr>
																				<th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Product</th>
																				<th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">SKU</th>
																				<th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">Quantity</th>
																				<th className="text-right py-3 px-4 font-medium text-gray-700 text-sm">Price</th>
																				<th className="text-right py-3 px-4 font-medium text-gray-700 text-sm">Total</th>
																			</tr>
																		</thead>
																		<tbody>
																			{orderLineItems[order.shopify_order_id].map((item, index) => (
																				<tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
																					<td className="py-3 px-4">
																						<div>
																							<div className="text-sm font-medium text-gray-900">{item.product_title || 'N/A'}</div>
																							{item.variant_title && (
																								<div className="text-xs text-gray-500">{item.variant_title}</div>
																							)}
																						</div>
																					</td>
																					<td className="py-3 px-4 text-sm text-gray-600">{item.sku_title || 'N/A'}</td>
																					<td className="py-3 px-4 text-center text-sm text-gray-600">{item.quantity}</td>
																					<td className="py-3 px-4 text-right text-sm text-gray-600">{formatCurrency(item.price)}</td>
																					<td className="text-right py-3 px-4 text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															</div>
														) : (
															<div className="text-center py-8 text-gray-500">
																<ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
																<p>No line items found for this order</p>
															</div>
														)}
													</div>
												</td>
											</tr>
										)}
									</Fragment>
								))}
							</tbody>
						</table>
					</div>
				)}

				{orders.length === 0 && (
					<div className="text-center py-8">
						<ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600">No orders found</p>
					</div>
				)}

				{/* Bottom Pagination */}
				<PaginationControls />
			</div>
		</div>
	);
};

export default Orders; 