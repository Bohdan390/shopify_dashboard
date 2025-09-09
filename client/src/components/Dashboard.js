import React, { useState, useEffect, useCallback } from 'react';
import {
	Calendar,
	Filter,
	RefreshCw,
	ChevronLeft,
	ChevronRight
} from 'lucide-react';
import {
	Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
	PieChart, Pie, Cell, AreaChart, Area, Brush, ReferenceLine, Legend, ComposedChart, LineChart
} from 'recharts';
import api from "../config/axios"
import { useSocket } from '../contexts/SocketContext';
import BeautifulSelect from './BeautifulSelect';
import DashboardLoader from './loaders/DashboardLoader';
import ChartsAndTableLoader from './loaders/ChartsAndTableLoader';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const G = require('../config/global');

let dailyLoading = false;
const Dashboard = () => {
	const formatLocalDate = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const period = 30;
	const showCustomDateRange = false;

	const { selectedStore, syncCompleted, adsSyncCompleted } = useStore();
	const [dashboardData, setDashboardData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [chartsLoading, setChartsLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [syncStep, setSyncStep] = useState('');
	const [syncSuccess, setSyncSuccess] = useState(false);
	const [syncDate, setSyncDate] = useState('');
	const [showSyncModal, setShowSyncModal] = useState(false);
	const [showDatePresets, setShowDatePresets] = useState(false);
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
	});
	const [sortConfig, setSortConfig] = useState({
		key: 'date',
		direction: 'desc'
	});
	const [analyticsPagination, setAnalyticsPagination] = useState({
		currentPage: 1,
		pageSize: 10,
		totalPages: 1
	});

	// Recalculate modal states
	const [showRecalcModal, setShowRecalcModal] = useState(false);
	const [recalcDate, setRecalcDate] = useState('');

	// WebSocket states
	const { socket, addEventListener } = useSocket();
	const [syncProgress, setSyncProgress] = useState(null);
	const [recalcProgress, setRecalcProgress] = useState(null);

	// Metrics filtering state
	const [metricsPeriod, setMetricsPeriod] = useState('daily');
	const [metricsDateRange, setMetricsDateRange] = useState({
		startDate: '',
		endDate: ''
	});
	// Country filtering state
	const [selectedCountry, setSelectedCountry] = useState('all');

	const handleDateRangeChange = async () => {
		if (dateRange.startDate && dateRange.endDate) {
			try {
				setChartsLoading(true);

				// Fetch both analytics and summary data with country filtering
				const countryParam = selectedCountry !== 'all' ? `&country=${selectedCountry}` : '';
				const summaryUrl = `/api/analytics/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&storeId=${selectedStore}${countryParam}`;
				console.log(selectedCountry, summaryUrl)
				const summaryResponse = await api.get(summaryUrl)
				// Ensure we have valid data
				const summaryData = summaryResponse.data || {};

				console.log(summaryData)
				setDashboardData({
					analytics: summaryData.analytics,
					summary: summaryData.summary
				});

				// Close the popup after successful data fetch

			} catch (error) {
				console.error('❌ Error fetching custom date range data:', error);

				// Show more helpful error message
				let errorMessage = 'Failed to fetch data';
				if (error.response?.status === 500) {
					errorMessage = 'Database connection error. Please check your Supabase configuration.';
				} else if (error.code === 'NETWORK_ERROR') {
					errorMessage = 'Network error. Please check your internet connection.';
				} else if (error.message) {
					errorMessage = error.message;
				}

				alert(`Error: ${errorMessage}`);
				setDashboardData({ summary: {}, analytics: [] });
			} finally {
				setChartsLoading(false);
			}
		} else {
		}
	};

	// WebSocket event handlers
	useEffect(() => {
		if (!socket) return;

		// Add event listeners for dashboard sync progress
		const removeDashboardListener = addEventListener('dashboard_syncProgress', (data) => {
			setSyncProgress(data);
			console.log('📨 dashboard_syncProgress received:', data);

			// Close sync modal immediately when sync starts
			if (data.stage === 'starting' || data.stage === 'fetching' || data.stage === 'saving') {
				setShowSyncModal(false);
			}

			// Update sync step based on progress
			if (data.stage === 'completed') {
				if (data.message && data.message.includes("calculation completed")) {
					setSyncing(false);
				}
				setSyncStep('Complete!');
				setSyncSuccess(true);

				// Refresh dashboard data after successful sync
				setTimeout(() => {
					setSyncStep('');
					setSyncSuccess(false);
					setSyncDate(''); // Clear the date after successful sync
					setSyncProgress(null);
				}, 2000);
			} else if (data.stage === 'error') {
				setSyncStep('Error occurred');
				setSyncProgress(null);
				setTimeout(() => setSyncStep(''), 2000);
			} else {
				setSyncStep(data.message);
			}
		});

		// Add event listener for recalculation progress
		const removeRecalcListener = addEventListener('recalcProgress', (data) => {
			setRecalcProgress(data);

			// Update sync step based on progress
			if (data.stage === 'completed' || data.stage === 'analytics_completed') {
				// If it's analytics_completed, wait for the final 'completed' stage
				if (data.stage === 'analytics_completed') {
					setSyncStep(data.message);
					return;
				}

				setSyncStep('Recalculation Complete!');
				setSyncSuccess(true);

				// Close recalculation modal
				closeRecalcModal();

				setTimeout(() => {
					setSyncStep('');
					setSyncSuccess(false);
					setRecalcProgress(null);
				}, 2000);
			} else if (data.stage === 'error') {
				setSyncStep('Recalculation Error');
				setRecalcProgress(null);
				setTimeout(() => setSyncStep(''), 2000);
			} else {
				setSyncStep(data.message);
			}
		});

		// Cleanup event listeners when component unmounts
		return () => {
			removeDashboardListener();
			removeRecalcListener();
		};
	}, [socket, addEventListener]);

	// Listen for sync completion from GlobalStoreSelector and refresh dashboard data
	useEffect(() => {
		if (syncCompleted > 0 || adsSyncCompleted > 0) {
			// Refresh dashboard data
			if (dateRange.startDate && dateRange.endDate) {
				handleDateRangeChange();
			} else {
				fetchDashboardData();
			}
		}
	}, [syncCompleted, adsSyncCompleted]);



	const fetchDashboardData = useCallback(async (showRefreshing = false) => {
		if (dailyLoading) return;
		dailyLoading = true;
		try {
			// Don't run this function during sync operations
			if (syncProgress && syncProgress.stage !== 'completed') {
				return;
			}

			if (showCustomDateRange) return;

			if (showRefreshing) {
				setRefreshing(true);
			} else if (chartsLoading) {
				// If charts are already loading from date changes, don't set full page loading
			} else {
				setLoading(true);
			}

			let url;

			if (showCustomDateRange) {
				// Only fetch custom range data if both dates are set
				if (!dateRange.startDate || !dateRange.endDate) {
					if (showRefreshing) {
						setRefreshing(false);
					} else {
						setLoading(false);
					}
					return;
				}
				const countryParam = selectedCountry !== 'all' ? `&country=${selectedCountry}` : '';
				url = `/api/analytics/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&storeId=${selectedStore}${countryParam}`;
			} else {
				const countryParam = selectedCountry !== 'all' ? `&country=${selectedCountry}` : '';
				url = `/api/analytics/dashboard?period=${period}&storeId=${selectedStore}${countryParam}`;
			}

			const response = await api.get(url);
			setDashboardData(response.data);

			// Show success toast for manual refresh
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			// Set empty data to prevent undefined errors
			setDashboardData({ summary: {}, analytics: [] });

			// Show error toast for manual refresh
			if (showRefreshing && window.showPrimeToast) {
				window.showPrimeToast('Failed to refresh dashboard data', 'error');
			}
		} finally {
			dailyLoading = false;
			if (showRefreshing) {
				setRefreshing(false);
			} else if (chartsLoading) {
				// Don't change chartsLoading here, it's managed by handleDateRangeChange
			} else {
				setLoading(false);
			}
		}
	}, [period, showCustomDateRange, selectedStore, syncProgress]);

	// Initial data load
	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	// Watch for date range changes and fetch data automatically
	useEffect(() => {
		if (dateRange.startDate && dateRange.endDate && !showCustomDateRange) {
			handleDateRangeChange();
		}
	}, [dateRange.startDate, dateRange.endDate, showCustomDateRange]);

	// Watch for country filter changes and refetch data
	useEffect(() => {
		if (dateRange.startDate && dateRange.endDate && selectedCountry != 'all') {
			handleDateRangeChange();
		}
	}, [selectedCountry]);

	// Initialize metrics date range with main dashboard date range
	useEffect(() => {
		if (dateRange.startDate && dateRange.endDate && !metricsDateRange.startDate && !metricsDateRange.endDate) {
			setMetricsDateRange({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate
			});
		}
	}, [dateRange.startDate, dateRange.endDate, metricsDateRange.startDate, metricsDateRange.endDate]);



	// Update pagination when analytics data changes
	useEffect(() => {
		if (dashboardData?.analytics && Array.isArray(dashboardData.analytics)) {
			const totalPages = Math.ceil((dashboardData.analytics?.length || 0) / analyticsPagination.pageSize);
			setAnalyticsPagination(prev => ({
				...prev,
				totalPages,
				currentPage: prev.currentPage > totalPages ? 1 : prev.currentPage
			}));
		}
	}, [dashboardData?.analytics]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showDatePresets && !event.target.closest('.date-presets-container')) {
				setShowDatePresets(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showDatePresets]);

	const recalculateAnalytics = async () => {
		setShowRecalcModal(false);
		if (!recalcDate) {
			alert('Please select a date for recalculation');
			return;
		}

		try {
			setSyncing(true);
			setRecalcProgress(null); // Clear previous progress
			setSyncStep('Starting analytics recalculation...');

			// Pass socket ID for real-time progress updates
			await api.post('/api/analytics/recalculate', {
				recalcDate: recalcDate,
				socketId: socket?.id, // Pass socket ID for WebSocket communication
				storeId: selectedStore // Pass selected store ID
			});

			// Progress updates will come via WebSocket
			// The syncStep will be updated by the WebSocket progress handler

		} catch (error) {
			setShowRecalcModal(true)
			console.error('Error recalculating analytics:', error);
			setSyncStep('Recalculation Error');
			setRecalcProgress(null);
			setTimeout(() => setSyncStep(''), 2000); // Clear error after 2 seconds
			alert('Failed to recalculate analytics. Please try again.');
		} finally {
			setSyncing(false);
		}
	};

	const syncOrders = async () => {
		if (!syncDate) {
			alert('Please select a date for sync');
			return;
		}

		try {
			setSyncing(true);
			setSyncProgress(null); // Clear previous progress
			setSyncStep('Starting sync...');
			// Pass socket ID for real-time progress updates
			const response = await api.post('/api/shopify/sync-orders', {
				from: "dashboard",
				syncDate: syncDate,
				limit: 250,    // Fetch 250 orders per page (Shopify's maximum)
				socketId: socket?.id, // Pass socket ID for WebSocket communication
				storeId: selectedStore // Pass selected store ID
			});

			// Progress updates will come via WebSocket
			// The syncStep will be updated by the WebSocket progress handler

		} catch (error) {
			console.error('Error syncing orders:', error);
			setSyncStep('Error occurred');
			setSyncProgress(null);
			setSyncing(false);
			setTimeout(() => setSyncStep(''), 2000); // Clear error after 2 seconds
			alert('Failed to sync orders. Please try again.');
		}
	};

	// Handle metrics period change
	const handleMetricsPeriodChange = (newPeriod) => {
		setMetricsPeriod(newPeriod);
		// The charts will automatically update due to the metricsChartData calculation
	};

	const openSyncModal = () => {
		setShowSyncModal(true);
	};

	const closeSyncModal = () => {
		setShowSyncModal(false);
		setSyncDate('');
	};

	const openRecalcModal = () => {
		setShowRecalcModal(true);
	};

	const closeRecalcModal = () => {
		setShowRecalcModal(false);
		setRecalcDate('');
	};

	const handleSort = (key) => {
		setSortConfig(prevConfig => ({
			key,
			direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
		}));
	};

	const getSortIcon = (key) => {
		if (sortConfig.key !== key) {
			return (
				<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
				</svg>
			);
		}

		if (sortConfig.direction === 'asc') {
			return (
				<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
				</svg>
			);
		} else {
			return (
				<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			);
		}
	};

	const sortAnalytics = (data) => {
		if (!sortConfig.key) return data;

		return [...data].sort((a, b) => {
			let aValue = a[sortConfig.key];
			let bValue = b[sortConfig.key];

			// Handle date sorting
			if (sortConfig.key === 'date') {
				aValue = new Date(aValue);
				bValue = new Date(bValue);
			}
			// Handle numeric values
			else if (typeof aValue === 'number' || !isNaN(parseFloat(aValue))) {
				aValue = parseFloat(aValue) || 0;
				bValue = parseFloat(bValue) || 0;
			}
			// Handle string values
			else {
				aValue = String(aValue || '').toLowerCase();
				bValue = String(bValue || '').toLowerCase();
			}

			if (aValue < bValue) {
				return sortConfig.direction === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortConfig.direction === 'asc' ? 1 : -1;
			}
			return 0;
		});
	};

	const getPaginatedAnalytics = (data) => {
		if (!data || !Array.isArray(data)) return [];
		const sortedData = sortAnalytics(data);
		const startIndex = (analyticsPagination.currentPage - 1) * analyticsPagination.pageSize;
		const endIndex = startIndex + analyticsPagination.pageSize;
		return sortedData.slice(startIndex, endIndex);
	};

	const updateAnalyticsPagination = (newPage) => {
		setAnalyticsPagination(prev => ({
			...prev,
			currentPage: newPage
		}));
	};

	const generateAnalyticsPageNumbers = () => {
		const { currentPage, totalPages } = analyticsPagination;
		const pages = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			if (currentPage > 3) {
				pages.push('...');
			}

			// Show pages around current page
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				if (!pages.includes(i)) {
					pages.push(i);
				}
			}

			if (currentPage < totalPages - 2) {
				pages.push('...');
			}

			// Always show last page
			if (totalPages > 1) {
				pages.push(totalPages);
			}
		}

		return pages;
	};

	const { summary, analytics } = dashboardData || {};

	const { formatCurrency, displayCurrency } = useCurrency();

	const formatPercentage = (value) => {
		if (value === undefined || value === null || isNaN(value)) {
			return '0.0%';
		}
		return `${value.toFixed(1)}%`;
	};

	// Smart date formatting for chart labels
	const formatChartDate = (dateString, dataLength) => {
		const date = new Date(dateString);

		// For many data points, show shorter format
		if (dataLength > 50) {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			});
		} else if (dataLength > 30) {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			});
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		}
	};

	// Filter and aggregate metrics data based on selected period
	const getMetricsData = (data, period) => {
		if (!data || data.length === 0) return [];
		// Filter data by date range if specified
		let filteredData = data;

		if (period === 'daily') {
			filteredData = filteredData.map(item => {
				const totalAdSpend = (item.google_ads_spend || 0) + (item.facebook_ads_spend || 0) + (item.taboola_ads_spend || 0);
				return {
					...item,
					total_ad_spend: totalAdSpend,
					aov: (item.revenue || 0) > 0 ? (item.revenue || 0) / item.orders_count : 0,
					ltv: item.customers_count == 0 ? 0 : ((item.revenue || 0) > 0 ? (item.revenue || 0) / item.customers_count : 0),
					ltvProfit: item.customers_count == 0 ? 0 : ((item.revenue || 0) > 0 ? ((item.revenue || 0) - (item.cost_of_goods || 0) - totalAdSpend) / item.customers_count : 0),
					mer: totalAdSpend > 0 ? (item.revenue || 0) / totalAdSpend : 0
				};
			});
			return filteredData;
		}

		// Group data by period
		const groupedData = {};
		filteredData.forEach(item => {
			const date = new Date(item.date);
			let key;

			if (period === 'weekly') {
				// Group by week (Monday to Sunday)
				const dayOfWeek = date.getDay() == 0 ? 7 : date.getDay();
				let monday = G.createLocalDateWithTime(new Date(date.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000));
				if (monday.getTime() < G.createLocalDateWithTime(dateRange.startDate).getTime()) {
					monday = G.createLocalDateWithTime(new Date(dateRange.startDate));
				}
				key = monday.getFullYear() + "-" + String(monday.getMonth() + 1).padStart(2, '0') + "-" + String(monday.getDate()).padStart(2, '0');
			} else if (period === 'monthly') {
				// Group by month
				key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				var startDate = G.createLocalDateWithTime(dateRange.startDate);
				if (startDate.getTime() > G.createLocalDateWithTime(key + "-01").getTime()) {
					key = startDate.getFullYear() + "-" + String(startDate.getMonth() + 1).padStart(2, '0') + "-" + String(startDate.getDate()).padStart(2, '0');
				}
			}

			if (!groupedData[key]) {
				groupedData[key] = {
					date: key,
					revenue: 0,
					profit: 0,
					orders: 0,
					customers: 0,
					google_ads_spend: 0,
					facebook_ads_spend: 0,
					taboola_ads_spend: 0,
					cost_of_goods: 0,
					dateRange: period === 'weekly' ? (() => {
						const startDate = G.createLocalDateWithTime(key);
						var dayOfWeek = 7 - (startDate.getDay() == 0 ? 7 : startDate.getDay());
						let endDate = new Date(startDate.getTime() + dayOfWeek * 24 * 60 * 60 * 1000);
						if (endDate.getTime() > G.createLocalDateWithTime(dateRange.endDate).getTime()) {
							endDate = G.createLocalDateWithTime(dateRange.endDate);
						}
						return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
					})() : (() => {
						const startDate = G.createLocalDateWithTime(key);
						let endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
						if (endDate.getTime() > G.createLocalDateWithTime(dateRange.endDate).getTime()) {
							endDate = G.createLocalDateWithTime(dateRange.endDate);
						}
						return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
					})()
				};
			}

			// Aggregate values
			groupedData[key].revenue += item.revenue || 0;
			groupedData[key].profit += item.profit || 0;
			groupedData[key].orders += item.orders_count || 0;
			groupedData[key].customers += item.customers_count || 0;
			groupedData[key].google_ads_spend += item.google_ads_spend || 0;
			groupedData[key].facebook_ads_spend += item.facebook_ads_spend || 0;
			groupedData[key].taboola_ads_spend += item.taboola_ads_spend || 0;
			groupedData[key].cost_of_goods += item.cost_of_goods || 0;
		});

		if (period === 'weekly') {
			console.log(Object.values(groupedData))
		}
		// Convert grouped data to array and calculate metrics
		return Object.values(groupedData).map(item => {

			const totalAdSpend = (item.google_ads_spend || 0) + (item.facebook_ads_spend || 0) + (item.taboola_ads_spend || 0);
			return {
				...item,
				total_ad_spend: totalAdSpend,
				profit: (item.revenue || 0) - (item.cost_of_goods || 0) - totalAdSpend,
				aov: (item.revenue || 0) > 0 ? (item.revenue || 0) / item.orders : 0,
				ltv: (item.revenue || 0) > 0 ? (item.revenue || 0) / item.customers : 0,
				ltvProfit: (item.revenue || 0) > 0 ? ((item.revenue || 0) - (item.cost_of_goods || 0) - totalAdSpend) / item.customers : 0,
				mer: totalAdSpend > 0 ? (item.revenue || 0) / totalAdSpend : 0
			};
		});
	};

	// Get metrics data based on selected period and date range
	const metricsChartData = getMetricsData(
		analytics || [],
		metricsPeriod,
	);

	if (loading && !refreshing) {
		return <DashboardLoader />;
	}

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
				// Fetch data for last month
				setChartsLoading(true);
				setTimeout(() => fetchDashboardData(), 100);
				return;
			default:
				return;
		}

		setDateRange({
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(today)
		});
		setShowDatePresets(false);
		// Fetch data for the selected preset
		setChartsLoading(true);
		setTimeout(() => fetchDashboardData(), 100);
	};

	const getTotalAdSpend = () => {
		return (summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0) + (selectedStore === "cosara" ? (summary?.totalTaboolaAds || 0) : 0);
	};

	var totalTaboolaAds = 0, totalGoogleAds = 0, totalFacebookAds = 0;
	metricsChartData.forEach(item => {
		totalTaboolaAds += item.taboola_ads_spend || 0;
		totalGoogleAds += item.google_ads_spend || 0;
		totalFacebookAds += item.facebook_ads_spend || 0;
	});
	return (
		<div className="p-8 relative">
			{/* Sync Loading Overlay */}
			{syncing && (
				<div className="fixed inset-0 bg-white bg-opacity-100 z-[60] flex items-center justify-center">
					<div className="text-center max-w-md mx-4">
						{syncSuccess ? (
							<div className="text-success-600">
								<div className="w-12 h-12 mx-auto mb-4 text-4xl">✓</div>
								<h3 className="text-lg font-semibold mb-2">Sync Complete!</h3>
								<p className="text-gray-600">Orders synced and analytics updated</p>
							</div>
						) : (
							<>
								<RefreshCw className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									{recalcProgress ? 'Recalculating Analytics' : 'Syncing Orders'}
								</h3>
								<p className="text-gray-600 mb-2">
									{recalcProgress
										? 'Recalculating analytics from the selected date...'
										: 'Fetching orders from Shopify and calculating analytics...'
									}
								</p>

								{/* Progress Bar */}
								{(syncProgress || recalcProgress) && (
									<div className="mb-4">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium text-gray-700">
												{(syncProgress || recalcProgress).message}
											</span>
											<span className="text-sm font-bold text-blue-600">
												{(syncProgress || recalcProgress).progress}%
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-3">
											<div
												key={`progress-${(syncProgress || recalcProgress).progress}`}
												className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
												style={{ width: `${(syncProgress || recalcProgress).progress}%` }}
											></div>
										</div>
										{(syncProgress && syncProgress.current && syncProgress.total !== 'unlimited') ? (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncProgress.current} / {syncProgress.total} orders
											</div>
										) : <></>}
										{(syncProgress && syncProgress.total === 'unlimited') ? (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncProgress.current} orders processed
											</div>
										) : <></>}
										{(recalcProgress && recalcProgress.current && recalcProgress.total) ? (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{recalcProgress.current} / {recalcProgress.total} dates
											</div>
										) : <></>}
									</div>
								)}

								{(syncStep && !(syncProgress || recalcProgress)) ? (
									<p className="text-sm text-primary-600 font-medium">{syncStep}</p>
								) : <></>}
								<p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
							</>
						)}
					</div>
				</div>
			)}

			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-1">Overview of your Shopify business performance</p>
				</div>
			</div>

			<div className="card mb-6">
				<div className="flex flex-col gap-2">
					<div className="flex gap-2">
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
						<span className="flex items-center text-gray-500" style={{ marginTop: 18 }}>to</span>
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

						{/* Quick Filters Button */}
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
						<div className="flex flex-col">
							<label className="text-xs text-gray-600 mb-1 opacity-0">Q</label>
							<Button
								variant='outlined'
								style={{ height: 40 }}
								onClick={openRecalcModal}
								className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm"
								disabled={syncing}
							>
								<RefreshCw className="w-4 h-4" />
								Recalculate Analytics
							</Button>
						</div>
						<div className="flex flex-col">
							<label className="text-xs text-gray-600 mb-1 opacity-0">Q</label>
							<Button
								variant='contained'
								style={{ height: 40 }}
								onClick={openSyncModal}
								className="btn-primary flex items-center gap-2 px-3 py-1.5 text-sm"
								disabled={syncing}
							>
								{syncing ? (
									<RefreshCw className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								{syncing ? 'Syncing...' : 'Sync Orders'}
							</Button>
						</div>

					</div>

					{/* Date Range Display */}
					<div className="text-xs text-gray-500">
						Selected: {dateRange.startDate} to {dateRange.endDate}
						{selectedCountry !== 'all' && (
							<span className="ml-4 text-blue-600 font-medium">
								📍 Country: {G.availableCountries.find(c => c.country_code === selectedCountry)?.country_name || selectedCountry}
							</span>
						)}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-4 bg-white mt-4">
					{/* Country Filter */}
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700">Country:</span>
						<BeautifulSelect
							value={selectedCountry}
							onChange={(e) => setSelectedCountry(e)}
							selectClass='normal-select'
							options={G.availableCountries.map(country => ({
								label: country.country_name,
								value: country.country_code
							}))}
						/>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700">Metrics Period:</span>
						<div className="flex bg-gray-100 rounded-lg p-1">
							<button
								onClick={() => handleMetricsPeriodChange('daily')}
								className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${metricsPeriod === 'daily'
										? 'bg-white text-blue-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-800'
									}`}
							>
								Daily
							</button>
							<button
								onClick={() => handleMetricsPeriodChange('weekly')}
								className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${metricsPeriod === 'weekly'
										? 'bg-white text-blue-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-800'
									}`}
							>
								Weekly
							</button>
							<button
								onClick={() => handleMetricsPeriodChange('monthly')}
								className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${metricsPeriod === 'monthly'
										? 'bg-white text-blue-600 shadow-sm'
										: 'text-gray-600 hover:text-gray-800'
									}`}
							>
								Monthly
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Charts and Table Loading State */}
			{chartsLoading ? (
				<ChartsAndTableLoader />
			) : (
				<>
					{/* Unified Analytics Dashboard - Big Chart spanning 2 columns */}
					<div className="card col-span-1 lg:col-span-2">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Unified Analytics Dashboard</h3>
						</div>
						<ResponsiveContainer width="100%" height={400}>
							<ComposedChart data={metricsChartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									angle={metricsChartData.length > 20 ? -45 : 0}
									textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
									height={metricsChartData.length > 20 ? 80 : 60}
									tick={{ fontSize: 12 }}
								/>
								<YAxis
									yAxisId="left"
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
									label={{ value: 'Revenue & Ad Spend ($)', angle: -90, position: 'insideLeft', fontSize: 12, y: 200 }}
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => value.toFixed(2)}
									label={{ value: 'MER', angle: 90, position: 'insideRight', fontSize: 12, y: 0 }}
								/>
								<Tooltip
									formatter={(value, name) => {
										if (name === 'MER') {
											return [value.toFixed(2), name];
										}
										return [displayCurrency(value, 'USD'), name];
									}}
									labelFormatter={(label, payload) => {
										if (payload && payload[0] && payload[0].payload.dateRange) {
											return payload[0].payload.dateRange;
										}
										return new Date(label).toLocaleDateString('en-US', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										});
									}}
									contentStyle={{
										backgroundColor: 'rgba(255, 255, 255, 0.95)',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
									}}
								/>
								<Legend />
								<ReferenceLine y={0} stroke="#666" yAxisId="left" />

								{/* Revenue Line - Primary Metric */}
								<Line
									type="monotone"
									dataKey="revenue"
									stroke="#059669"
									strokeWidth={3}
									name="Revenue"
									dot={{ fill: '#fff', strokeWidth: 2, r: 5 }}
									activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#059669' }}
									animationDuration={1000}
									yAxisId="left"
								/>

								{/* Ad Spend Lines */}
								{totalGoogleAds > 0 && <Line
									type="monotone"
									dataKey="google_ads_spend"
									stroke="#f59e0b"
									strokeWidth={2}
									name="Google Ads"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
									yAxisId="left"
								/>}
								{totalFacebookAds > 0 && <Line
									type="monotone"
									dataKey="facebook_ads_spend"
									stroke="#1877F2"
									strokeWidth={2}
									name="Facebook Ads"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
									yAxisId="left"
								/>}
								{/* Taboola Line - Only show for cosara store */}
								{totalTaboolaAds > 0 && 
									<Line
										type="monotone"
										dataKey="taboola_ads_spend"
										stroke="#FF6B35"
										strokeWidth={2}
										name="Taboola"
										dot={metricsChartData.length <= 50}
										activeDot={{ r: 6 }}
										animationDuration={1000}
										yAxisId="left"
									/>
								}
								
								{/* MER Line - Light Gray Color - Now at the end for tooltip order */}
								<Line
									type="monotone"
									dataKey="mer"
									stroke="#D1D5DB"
									strokeWidth={2}
									dot={{ fill: '#fff', strokeWidth: 1, r: 3 }}
									activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1, fill: '#D1D5DB' }}
									name="MER"
									yAxisId="right"
								/>

								{/* Brush for data selection */}
								<Brush
									dataKey="date"
									height={30}
									stroke="#8884d8"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>

					{/* Summary Cards for Quick Insights */}
					<div className={`grid grid-cols-1 gap-4 mt-6 ${selectedStore && selectedStore === 'cosara' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
						<div className="card text-center p-4">
							<div className="text-2xl font-bold text-blue-600">
								{displayCurrency(
									metricsChartData.reduce((sum, item) => sum + (item.revenue || 0), 0),
									'USD'
								)}
							</div>
							<div className="text-sm text-gray-600">Total Revenue</div>
						</div>
						<div className="card text-center p-4">
							<div className="text-2xl font-bold text-orange-600">
								{displayCurrency(
									metricsChartData.reduce((sum, item) => sum + (item.google_ads_spend || 0), 0),
									'USD'
								)}
							</div>
							<div className="text-sm text-gray-600">Google Ads</div>
						</div>
						<div className="card text-center p-4">
							<div className="text-2xl font-bold text-indigo-600">
								{displayCurrency(
									metricsChartData.reduce((sum, item) => 
										sum + (item.facebook_ads_spend || 0), 0),
									'USD'
								)}
							</div>
							<div className="text-sm text-gray-600">Facebook Ads</div>
						</div>
						{/* Taboola Summary Card - Only show for cosara store */}
						{selectedStore && selectedStore === 'cosara' && (
							<div className="card text-center p-4">
								<div className="text-2xl font-bold text-orange-500">
									{displayCurrency(
										metricsChartData.reduce((sum, item) => sum + (item.taboola_ads_spend || 0), 0),
										'USD'
									)}
								</div>
								<div className="text-sm text-gray-600">Taboola</div>
							</div>
						)}
						<div className="card text-center p-4">
							<div className="text-2xl font-bold text-green-600">
								{metricsChartData.reduce((sum, item) => sum + (item.revenue || 0), 0) > 0
									? (metricsChartData.reduce((sum, item) => sum + (item.revenue || 0), 0) /
										metricsChartData.reduce((sum, item) => sum + (item.total_ad_spend || 0), 0)).toFixed(2)
									: '0.00'
								}
							</div>
							<div className="text-sm text-gray-600">Overall MER</div>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
						<div className="card">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-semibold text-gray-900">Profit Trend Analysis</h3>
							</div>
							<ResponsiveContainer width="100%" height={300}>
								<AreaChart data={metricsChartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis
										dataKey="date"
										tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
										angle={metricsChartData.length > 20 ? -45 : 0}
										textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
										height={metricsChartData.length > 20 ? 80 : 60}
										tick={{ fontSize: 12 }}
									/>
									<YAxis
										tick={{ fontSize: 12 }}
										tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
									/>
									<Tooltip
										formatter={(value, name) => [displayCurrency(value, 'USD'), name]}
										labelFormatter={(label, payload) => {
											if (payload && payload[0] && payload[0].payload.dateRange) {
												return payload[0].payload.dateRange;
											}
											return new Date(label).toLocaleDateString('en-US', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric'
											});
										}}
										contentStyle={{
											backgroundColor: 'rgba(255, 255, 255, 0.95)',
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
										}}
									/>
									<Legend />
									<ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

									<Area
										type="monotone"
										dataKey="profit"
										stroke="#10b981"
										fill="#d1fae5"
										fillOpacity={0.6}
										name="Profit"
										animationDuration={1000}
										onMouseEnter={(data, index) => {
											// Enhanced hover effect
										}}
									/>

									{/* Brush for data selection */}
									<Brush
										dataKey="date"
										height={30}
										stroke="#10b981"
										tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
						<div className="card">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-semibold text-gray-900">Ad Spend Distribution</h3>
								<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
									💰 Total: {displayCurrency(getTotalAdSpend(), 'USD')}
								</div>
							</div>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={[
											{
												name: selectedStore === "cosara" ? "Taboola" : "Facebook Ads",
												value: selectedStore === "cosara" ? summary?.totalTaboolaAds || 0 : summary?.totalFacebookAds || 0,
												color: '#3b82f6'
											},
											{
												name: "Google Ads",
												value: summary?.totalGoogleAds || 0,
												color: '#f59e0b'
											}
										]}
										cx="50%"
										cy="50%"
										outerRadius={80}
										dataKey="value"
										label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
										labelLine={false}
										animationDuration={1000}
										onMouseEnter={(entry, index) => {
											// Enhanced hover effect
										}}
									>
										{[
											{ 
												name: selectedStore === "cosara" ? "Taboola" : "Facebook Ads", 
												value: selectedStore === "cosara" ? summary?.totalTaboolaAds || 0 : summary?.totalFacebookAds || 0, 
												color: '#3b82f6' },
											{ name: "Google Ads", value: summary?.totalGoogleAds || 0, color: '#f59e0b' }
										].map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
												stroke="#fff"
												strokeWidth={2}
											/>
										))}
									</Pie>
									<Tooltip
										formatter={(value) => displayCurrency(value, 'USD')}
										contentStyle={{
											backgroundColor: 'rgba(255, 255, 255, 0.95)',
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
										}}
									/>
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						</div>

						{/* Profit Trend Area Chart */}

					</div>
				</>
			)}

			{/* New Metrics Graphs */}
			<div className="mt-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* AOV (Average Order Value) */}
					<div className="card">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">AOV (Average Order Value)</h3>
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								💰 Revenue ÷ Orders
							</div>
						</div>
						<ResponsiveContainer width="100%" height={300}>
							<ComposedChart data={metricsChartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									angle={metricsChartData.length > 20 ? -45 : 0}
									textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
									height={metricsChartData.length > 20 ? 80 : 60}
									tick={{ fontSize: 12 }}
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => `$${value.toFixed(0)}`}
								/>
								<Tooltip
									formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
									labelFormatter={(label, payload) => {
										if (payload && payload[0] && payload[0].payload.dateRange) {
											return payload[0].payload.dateRange;
										}
										return new Date(label).toLocaleDateString('en-US', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										});
									}}
									contentStyle={{
										backgroundColor: 'rgba(255, 255, 255, 0.95)',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
									}}
								/>
								<Legend />
								<ReferenceLine y={0} stroke="#666" />

								{/* Line chart for AOV */}
								<Line
									type="monotone"
									dataKey="aov"
									stroke="#3b82f6"
									strokeWidth={2}
									name="AOV"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
								/>

								{/* Brush for data selection */}
								<Brush
									dataKey="date"
									height={30}
									stroke="#8884d8"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>

					{/* LTV (Lifetime Value per Customer) */}
					<div className="card">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">LTV (Lifetime Value per Customer)</h3>
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								👥 Revenue ÷ Customers
							</div>
						</div>
						<ResponsiveContainer width="100%" height={300}>
							<ComposedChart data={metricsChartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									angle={metricsChartData.length > 20 ? -45 : 0}
									textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
									height={metricsChartData.length > 20 ? 80 : 60}
									tick={{ fontSize: 12 }}
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => `$${value.toFixed(0)}`}
								/>
								<Tooltip
									formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
									labelFormatter={(label, payload) => {
										if (payload && payload[0] && payload[0].payload.dateRange) {
											return payload[0].payload.dateRange;
										}
										return new Date(label).toLocaleDateString('en-US', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										});
									}}
									contentStyle={{
										backgroundColor: 'rgba(255, 255, 255, 0.95)',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
									}}
								/>
								<Legend />
								<ReferenceLine y={0} stroke="#666" />

								{/* Line chart for LTV */}
								<Line
									type="monotone"
									dataKey="ltv"
									stroke="#10b981"
									strokeWidth={2}
									name="LTV"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
								/>

								{/* Brush for data selection */}
								<Brush
									dataKey="date"
									height={30}
									stroke="#8884d8"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>

					{/* LTV Profit (Lifetime Value Profit) */}
					<div className="card">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">LTV Profit (Profit per Customer)</h3>
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								💵 (Revenue - Costs) ÷ Customers
							</div>
						</div>
						<ResponsiveContainer width="100%" height={300}>
							<ComposedChart data={metricsChartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									angle={metricsChartData.length > 20 ? -45 : 0}
									textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
									height={metricsChartData.length > 20 ? 80 : 60}
									tick={{ fontSize: 12 }}
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => `$${value.toFixed(0)}`}
								/>
								<Tooltip
									formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
									labelFormatter={(label, payload) => {
										if (payload && payload[0] && payload[0].payload.dateRange) {
											return payload[0].payload.dateRange;
										}
										return new Date(label).toLocaleDateString('en-US', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										});
									}}
									contentStyle={{
										backgroundColor: 'rgba(255, 255, 255, 0.95)',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
									}}
								/>
								<Legend />
								<ReferenceLine y={0} stroke="#666" />

								{/* Line chart for LTV Profit */}
								<Line
									type="monotone"
									dataKey="ltvProfit"
									stroke="#8b5cf6"
									strokeWidth={2}
									name="LTV Profit"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
								/>

								{/* Brush for data selection */}
								<Brush
									dataKey="date"
									height={30}
									stroke="#8884d8"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>

					{/* MER (Marketing Efficiency Ratio) */}
					<div className="card">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">MER (Marketing Efficiency Ratio)</h3>
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								📊 Revenue ÷ Marketing Spend
							</div>
						</div>
						<ResponsiveContainer width="100%" height={300}>
							<ComposedChart data={metricsChartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
									angle={metricsChartData.length > 20 ? -45 : 0}
									textAnchor={metricsChartData.length > 20 ? "end" : "middle"}
									height={metricsChartData.length > 20 ? 80 : 60}
									tick={{ fontSize: 12 }}
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => `${value.toFixed(1)}x`}
								/>
								<Tooltip
									formatter={(value, name) => [`${value.toFixed(2)}x`, name]}
									labelFormatter={(label, payload) => {
										if (payload && payload[0] && payload[0].payload.dateRange) {
											return payload[0].payload.dateRange;
										}
										return new Date(label).toLocaleDateString('en-US', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										});
									}}
									contentStyle={{
										backgroundColor: 'rgba(255, 255, 255, 0.95)',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
									}}
								/>
								<Legend />
								<ReferenceLine y={1} stroke="#666" />

								{/* Line chart for MER */}
								<Line
									type="monotone"
									dataKey="mer"
									stroke="#f59e0b"
									strokeWidth={2}
									name="MER"
									dot={metricsChartData.length <= 50}
									activeDot={{ r: 6 }}
									animationDuration={1000}
								/>

								{/* Brush for data selection */}
								<Brush
									dataKey="date"
									height={30}
									stroke="#8884d8"
									tickFormatter={(value) => formatChartDate(value, metricsChartData.length)}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Analytics Summary */}
			<div className="mt-8">
				<div className="card">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Analytics Summary</h3>
						{refreshing && (
							<div className="flex items-center gap-2 text-sm text-blue-600">
								<LoadingSpinner size="sm" variant="spinner" />
								<span>Updating...</span>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Performance Overview */}
						<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
							<h4 className="font-semibold text-blue-900 mb-2">Performance Overview</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-blue-700">Total Revenue</span>
									{refreshing ? (
										<div className="h-4 bg-blue-200 rounded w-20 animate-pulse"></div>
									) : (
										<span className="font-semibold text-blue-900">{formatCurrency(summary?.totalRevenue || 0, 'USD')}</span>
									)}
								</div>
								<div className="flex justify-between">
									<span className="text-blue-700">Total Orders</span>
									{refreshing ? (
										<div className="h-4 bg-blue-200 rounded w-16 animate-pulse"></div>
									) : (
										<span className="font-semibold text-blue-900">{summary?.totalOrders || 0}</span>
									)}
								</div>
								<div className="flex justify-between">
									<span className="text-blue-700">Paid Orders</span>
									{refreshing ? (
										<div className="h-4 bg-blue-200 rounded w-16 animate-pulse"></div>
									) : (
										<span className="font-semibold text-blue-900">{summary?.paidOrders || 0}</span>
									)}
								</div>
								<div className="flex justify-between">
									<span className="text-blue-700">Total Profit</span>
									{refreshing ? (
										<div className="h-4 bg-blue-200 rounded w-20 animate-pulse"></div>
									) : (
										<span className={`font-semibold ${(summary?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{formatCurrency(summary?.totalProfit || 0, 'USD')}
										</span>
									)}
								</div>
								<div className="flex justify-between">
									<span className="text-blue-700">Profit Margin</span>
									<span className={`font-semibold ${(summary?.averageProfitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
										{formatPercentage(summary?.averageProfitMargin || 0)}
									</span>
								</div>
							</div>
						</div>

						{/* Ad Performance */}
						<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
							<h4 className="font-semibold text-orange-900 mb-2">Ad Performance</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-orange-700">Google Ads</span>
									<span className="font-semibold text-orange-900">{formatCurrency(summary?.totalGoogleAds || 0, 'USD')}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-orange-700">Facebook Ads</span>
									<span className="font-semibold text-orange-900">{displayCurrency(summary?.totalFacebookAds || 0, 'USD')}</span>
								</div>
								{
									selectedStore === "cosara" && (
										<div className="flex justify-between">
											<span className="text-orange-700">Taboola</span>
											<span className="font-semibold text-orange-900">{displayCurrency(summary?.totalTaboolaAds || 0, 'USD')}</span>
										</div>
									)
								}
								<div className="flex justify-between border-t border-orange-200 pt-2">
									<span className="text-orange-700 font-medium">Total Ad Spend</span>
									<span className="font-semibold text-orange-900">
										{displayCurrency(getTotalAdSpend(), 'USD')}
									</span>
								</div>
							</div>
						</div>

						{/* Cost Analysis */}
						<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
							<h4 className="font-semibold text-purple-900 mb-2">Cost Analysis</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-purple-700">Cost of Goods</span>
									<span className="font-semibold text-purple-900">{formatCurrency(summary?.totalCostOfGoods || 0, 'USD')}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-purple-700">Ad Spend</span>
									<span className="font-semibold text-purple-900">
										{displayCurrency(getTotalAdSpend(), 'USD')}
									</span>
								</div>
								<div className="flex justify-between border-t border-purple-200 pt-2">
									<span className="text-purple-700 font-medium">Total Costs</span>
									<span className="font-semibold text-purple-900">
										{formatCurrency((summary?.totalCostOfGoods || 0) + getTotalAdSpend(), 'USD')}
									</span>
								</div>
							</div>
						</div>

						{/* Key Insights */}
						<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
							<h4 className="font-semibold text-green-900 mb-2">Key Insights</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-green-700">ROAS</span>
									<span className="font-semibold text-green-900">
										{((summary?.totalRevenue || 0) / getTotalAdSpend() || 0).toFixed(2)}x
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-green-700">Avg Daily Revenue</span>
									<span className="font-semibold text-green-900">
										{formatCurrency((summary?.totalRevenue || 0) / (analytics?.length || 1), 'USD')}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-green-700">Data Points</span>
									<span className="font-semibold text-green-900">{analytics?.length || 0} days</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Detailed Analytics Table */}
			<div className="mt-8">
				<div className="card">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Analytics</h3>

					{/* Top Pagination Controls */}
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="text-sm text-gray-600">
								Showing {((analyticsPagination.currentPage - 1) * analyticsPagination.pageSize) + 1} to{' '}
								{Math.min(analyticsPagination.currentPage * analyticsPagination.pageSize, (analytics?.length || 0))} of{' '}
								{analytics?.length || 0} entries
							</div>

							{/* Page Size Selector */}
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-600">Show:</span>
								<BeautifulSelect
									value={analyticsPagination.pageSize}
									onChange={(value) => {
										const newPageSize = parseInt(value);
										setAnalyticsPagination(prev => ({
											...prev,
											pageSize: newPageSize,
											currentPage: 1, // Reset to first page when changing page size
											totalPages: Math.ceil((analytics?.length || 0) / newPageSize)
										}));
									}}
									options={[
										{ value: 5, label: '5' },
										{ value: 10, label: '10' },
										{ value: 25, label: '25' },
										{ value: 50, label: '50' },
										{ value: 100, label: '100' }
									]}
									selectClass='pagesize-select'
									placeholder="Select"
									className="w-20"
									size="small"
								/>
								<span className="text-sm text-gray-600">entries</span>
							</div>
						</div>

						{analyticsPagination.totalPages > 1 && (
							<div className="flex items-center gap-2">
								{/* First Page */}
								<button
									onClick={() => updateAnalyticsPagination(1)}
									disabled={analyticsPagination.currentPage === 1}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									«
								</button>

								{/* Previous Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.currentPage - 1)}
									disabled={analyticsPagination.currentPage === 1}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									‹
								</button>

								{/* Page Numbers */}
								{generateAnalyticsPageNumbers().map((page, index) => (
									<button
										key={index}
										onClick={() => typeof page === 'number' && updateAnalyticsPagination(page)}
										disabled={page === '...'}
										className={`px-3 py-1 text-sm border rounded ${page === analyticsPagination.currentPage
											? 'bg-blue-600 text-white border-blue-600'
											: page === '...'
												? 'text-gray-400 cursor-default'
												: 'hover:bg-gray-50'
											}`}
									>
										{page}
									</button>
								))}

								{/* Next Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.currentPage + 1)}
									disabled={analyticsPagination.currentPage === analyticsPagination.totalPages}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									›
								</button>

								{/* Last Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.totalPages)}
									disabled={analyticsPagination.currentPage === analyticsPagination.totalPages}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									»
								</button>
							</div>
						)}
					</div>

					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50">
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('date')}
									>
										<div className="flex items-center gap-2">
											Date
											{getSortIcon('date')}
										</div>
									</th>
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('revenue')}
									>
										<div className="flex items-center gap-2">
											Revenue
											{getSortIcon('revenue')}
										</div>
									</th>
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('google_ads_spend')}
									>
										<div className="flex items-center gap-2">
											Google Ads
											{getSortIcon('google_ads_spend')}
										</div>
									</th>
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort(selectedStore === "cosara" ? 'taboola_ads_spend' : 'facebook_ads_spend')}
									>
										<div className="flex items-center gap-2">
											Facebook Ads
											{getSortIcon('facebook_ads_spend')}
										</div>
									</th>
									{selectedStore == 'cosara' && <th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('taboola_ads_spend')}
									>
										<div className="flex items-center gap-2">
											Taboola Ads
											{getSortIcon('taboola_ads_spend')}
										</div>
									</th>}
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('cost_of_goods')}
									>
										<div className="flex items-center gap-2">
											Cost of Goods
											{getSortIcon('cost_of_goods')}
										</div>
									</th>
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('profit')}
									>
										<div className="flex items-center gap-2">
											Profit
											{getSortIcon('profit')}
										</div>
									</th>
									<th
										className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
										onClick={() => handleSort('profit_margin')}
									>
										<div className="flex items-center gap-2">
											Margin
											{getSortIcon('profit_margin')}
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{getPaginatedAnalytics(analytics || []).map((day) => (
									<tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
										<td className="py-3 px-4 text-sm text-gray-600">
											{new Date(day.date).toLocaleDateString()}
										</td>
										<td className="py-3 px-4 font-medium">{formatCurrency(day.revenue, 'USD')}</td>
										<td className="py-3 px-4">{displayCurrency(day.google_ads_spend, 'USD')}</td>
										<td className="py-3 px-4">{displayCurrency(day.facebook_ads_spend, 'USD')}</td>
										{selectedStore === "cosara" && <td className="py-3 px-4">{displayCurrency(day.taboola_ads_spend, 'USD')}</td>}
										<td className="py-3 px-4">{formatCurrency(day.cost_of_goods, 'USD')}</td>
										<td className={`py-3 px-4 font-medium ${day.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
											{formatCurrency(day.profit, 'USD')}
										</td>
										<td className={`py-3 px-4 ${day.profit_margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
											{formatPercentage(day.profit_margin)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Bottom Pagination Controls */}
					<div className="mt-6 flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="text-sm text-gray-600">
								Showing {((analyticsPagination.currentPage - 1) * analyticsPagination.pageSize) + 1} to{' '}
								{Math.min(analyticsPagination.currentPage * analyticsPagination.pageSize, (analytics?.length || 0))} of{' '}
								{analytics?.length || 0} entries
							</div>

							{/* Page Size Selector */}
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-600">Show:</span>
								<BeautifulSelect
									value={analyticsPagination.pageSize}
									onChange={(value) => {
										const newPageSize = parseInt(value);
										setAnalyticsPagination(prev => ({
											...prev,
											pageSize: newPageSize,
											currentPage: 1, // Reset to first page when changing page size
											totalPages: Math.ceil((analytics?.length || 0) / newPageSize)
										}));
									}}
									options={[
										{ value: 5, label: '5' },
										{ value: 10, label: '10' },
										{ value: 25, label: '25' },
										{ value: 50, label: '50' },
										{ value: 100, label: '100' }
									]}
									selectClass='pagesize-select'
									placeholder="Select"
									className="w-20"
									size="small"
								/>
								<span className="text-sm text-gray-600">entries</span>
							</div>
						</div>

						{analyticsPagination.totalPages > 1 && (
							<div className="flex items-center gap-2">
								{/* First Page */}
								<button
									onClick={() => updateAnalyticsPagination(1)}
									disabled={analyticsPagination.currentPage === 1}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									«
								</button>

								{/* Previous Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.currentPage - 1)}
									disabled={analyticsPagination.currentPage === 1}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									‹
								</button>

								{/* Page Numbers */}
								{generateAnalyticsPageNumbers().map((page, index) => (
									<button
										key={index}
										onClick={() => typeof page === 'number' && updateAnalyticsPagination(page)}
										disabled={page === '...'}
										className={`px-3 py-1 text-sm border rounded ${page === analyticsPagination.currentPage
											? 'bg-blue-600 text-white border-blue-600'
											: page === '...'
												? 'text-gray-400 cursor-default'
												: 'hover:bg-gray-50'
											}`}
									>
										{page}
									</button>
								))}

								{/* Next Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.currentPage + 1)}
									disabled={analyticsPagination.currentPage === analyticsPagination.totalPages}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									›
								</button>

								{/* Last Page */}
								<button
									onClick={() => updateAnalyticsPagination(analyticsPagination.totalPages)}
									disabled={analyticsPagination.currentPage === analyticsPagination.totalPages}
									className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									»
								</button>
							</div>
						)}
					</div>

					{(analytics?.length || 0) === 0 && (
						<div className="text-center py-8">
							<div className="text-gray-400 mb-4">📊</div>
							<p className="text-gray-600">No analytics data available for the selected period</p>
						</div>
					)}
				</div>
			</div>



			{/* Sync Orders Modal */}
			{showSyncModal && (
				<Dialog open={showSyncModal} onClose={closeSyncModal}
					PaperProps={{
						sx: {
							width: "450px",
							maxWidth: "none", // prevents it from shrinking
						},
					}}>
					<DialogTitle>
						Sync Orders
					</DialogTitle>
					<DialogContent>
						<div>
							<div className='mb-4'>
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
									<div className="flex items-start">
										<svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p className="text-sm text-blue-800">
											This will replace all data from the selected date onwards. Make sure you have the correct date before proceeding.
										</p>
									</div>
								</div>

								<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
									<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									Sync Date
								</label>
								<LocalizationProvider dateAdapter={AdapterDayjs}>
									<DemoContainer components={['DatePicker', 'DatePicker']}>
										<DatePicker
										    className='date-picker'
											value={dayjs(syncDate)}
											onChange={(newValue) => {
												var date = G.createLocalDateWithTime(newValue['$d']).toISOString().split('T')[0]
												setSyncDate(date)
											}} />
									</DemoContainer>
								</LocalizationProvider>
							</div>
						</div>
					</DialogContent>
					<DialogActions style={{paddingLeft: 24, paddingRight: 24, marginBottom: 15}}>
						<Button
							variant='outlined'
							onClick={closeSyncModal}
							className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex-1"
							disabled={syncing}
						>
							Cancel
						</Button>
						<Button
							variant='contained'
							onClick={syncOrders}
							className="text-white font-medium py-2 rounded-lg transition-colors duration-200 flex-1 flex items-center justify-center gap-2"
						>
							{syncing ? (
								<RefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4" />
							)}
							{syncing ? 'Syncing...' : 'Start Sync'}
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{showRecalcModal && (
				<Dialog open={showRecalcModal} onClose={closeRecalcModal}
					PaperProps={{
						sx: {
						width: "450px",
						maxWidth: "none", // prevents it from shrinking
						},
					}}>
					<DialogTitle>Recalculate Analytics</DialogTitle>
					<DialogContent>
						<div>
							<div className='mb-4'>
								<div className="flex items-start">
									<svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<p className="text-sm text-orange-800">
										This will recalculate analytics from the selected date onwards. This is useful when you've added new ad spend or cost data.
									</p>
								</div>
							</div>

							<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
								<svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								Recalculation Date
							</label>
							<LocalizationProvider dateAdapter={AdapterDayjs}>
								<DemoContainer components={['DatePicker', 'DatePicker']}>
									<DatePicker
										value={dayjs(recalcDate)}
										onChange={(newValue) => {
											var date = G.createLocalDateWithTime(newValue['$d']).toISOString().split('T')[0]
											setRecalcDate(date)
										}} />
								</DemoContainer>
							</LocalizationProvider>
						</div>
					</DialogContent>
					<DialogActions style={{paddingLeft: 24, paddingRight: 24, marginBottom: 15}}>
						<Button
							variant='outlined'
							onClick={closeRecalcModal}
							className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors duration-200 flex-1"
							disabled={syncing}
						>
							Cancel
						</Button>
						<Button
							variant='contained'
							onClick={recalculateAnalytics}
							className="text-white font-medium py-2 rounded-lg transition-colors duration-200 flex-1 flex items-center justify-center gap-2"
						>
							{syncing ? (
								<RefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4" />
							)}
							{syncing ? 'Recalculating...' : 'Calculate'}
						</Button>
					</DialogActions>
				</Dialog>
			)}
		</div>
	);
};

export default Dashboard; 