import React, { useState, useEffect } from 'react';
import {
	BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell, Legend
} from 'recharts';
import {
	DollarSign, TrendingUp, TrendingDown, ShoppingCart, RefreshCw,
	Facebook, Chrome, Filter, Download, Settings, Calendar, ChevronLeft, ChevronRight, Plus, BarChart3, Edit, Trash2, X
} from 'lucide-react';
import api from '../config/axios';
import BeautifulSelect from './BeautifulSelect';
import { useSocket } from '../contexts/SocketContext';
import AdSpendLoader from './loaders/AdSpendLoader';
import AdSpendTableLoader from './loaders/AdSpendTableLoader';
import AdsCampaignTableLoader from './loaders/AdsCampaignTableLoader';
import { useStore } from '../contexts/StoreContext';
import { useCurrency } from '../contexts/CurrencyContext';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

// Custom Calendar Component
const CustomCalendar = ({ isOpen, onClose, onDateSelect, selectedDate, label }) => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDateState, setSelectedDateState] = useState(selectedDate ? new Date(selectedDate) : null);
	const [showYearSelector, setShowYearSelector] = useState(false);
	const [showMonthSelector, setShowMonthSelector] = useState(false);

	useEffect(() => {
		if (selectedDate) {
			setSelectedDateState(new Date(selectedDate));
			setCurrentMonth(new Date(selectedDate));
		}
	}, [selectedDate]);

	// Close year selector when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showYearSelector && !event.target.closest('.year-selector')) {
				setShowYearSelector(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showYearSelector]);

	// Close month selector when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showMonthSelector && !event.target.closest('.month-selector')) {
				setShowMonthSelector(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showMonthSelector]);

	// Close calendar modal when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (isOpen && !event.target.closest('.calendar-modal') && !event.target.closest('.month-selector-modal')) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen, onClose]);

	const getDaysInMonth = (date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDay = firstDay.getDay();

		const days = [];
		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDay; i++) {
			days.push(null);
		}
		// Add all days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(new Date(year, month, i));
		}
		return days;
	};

	const formatDate = (date) => {
		// Use local timezone to avoid date shifting
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const isToday = (date) => {
		const today = new Date();
		return date && date.toDateString() === today.toDateString();
	};

	const isSelected = (date) => {
		return date && selectedDateState && date.toDateString() === selectedDateState.toDateString();
	};

	const handleDateClick = (date) => {
		if (date) {
			setSelectedDateState(date);
			onDateSelect(formatDate(date));
			onClose();
		}
	};

	const goToPreviousMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const goToPreviousYear = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
	};

	const goToNextYear = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
	};

	const goToPreviousQuarter = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 3, 1));
	};

	const goToNextQuarter = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3, 1));
	};

	const selectYear = (year) => {
		setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
		setShowYearSelector(false);
	};

	const selectMonth = (month) => {
		const newMonth = new Date(currentMonth.getFullYear(), month, 1);
		setCurrentMonth(newMonth);
		setShowMonthSelector(false);
	};

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
			<div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 calendar-modal">
				{/* Header */}
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">{label}</h3>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Enhanced Navigation */}
				<div className="mb-4">
					{/* Year Navigation */}
					<div className="flex items-center justify-between mb-2">
						<button
							onClick={goToPreviousYear}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Previous Year"
						>
							<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
							</svg>
						</button>
						<button
							onClick={() => setShowYearSelector(!showYearSelector)}
							className="year-selector text-sm font-medium text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
						>
							{currentMonth.getFullYear()}
						</button>
						<button
							onClick={goToNextYear}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Next Year"
						>
							<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7m-8 0l7-7-7 7" />
							</svg>
						</button>
					</div>

					{/* Year Selector Dropdown */}
					{showYearSelector && (
						<div className="relative year-selector">
							<div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 max-h-40 overflow-y-auto" style={{left: "50%", transform: "translateX(-50%)"}}>
								<div className="grid grid-cols-3 gap-1">
									{Array.from({ length: 20 }, (_, i) => currentMonth.getFullYear() - 10 + i).map(year => (
										<button
											key={year}
											onClick={() => selectYear(year)}
											className={`px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${year === currentMonth.getFullYear() ? 'bg-blue-100 text-blue-700 font-medium' : ''
												}`}
										>
											{year}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Month Navigation */}
					<div className="flex items-center justify-between mb-4">
						<button
							onClick={goToPreviousMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Previous Month"
						>
							<ChevronLeft className="w-5 h-5 text-gray-500" />
						</button>
						<button
							onClick={() => setShowMonthSelector(!showMonthSelector)}
							className="text-sm font-medium text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors month-selector"
						>
							{monthNames[currentMonth.getMonth()]}
						</button>
						<button
							onClick={goToNextMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Next Month"
						>
							<ChevronRight className="w-5 h-5 text-gray-500" />
						</button>
					</div>

					{/* Month Selector Dropdown */}
					{showMonthSelector && (
						<div className="relative month-selector">
							<div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20" style={{width:260,left: "50%", transform: "translateX(-50%)"}}>
								<div className="grid grid-cols-3 gap-1">
									{monthNames.map((month, index) => (
										<button
											key={index}
											onClick={() => selectMonth(index)}
											className={`px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${index === currentMonth.getMonth() ? 'bg-blue-100 text-blue-700 font-medium' : ''
												}`}
										>
											{month}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Day Headers */}
				<div className="grid grid-cols-7 gap-1 mb-2">
					{dayNames.map(day => (
						<div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
							{day}
						</div>
					))}
				</div>

				{/* Calendar Grid */}
				<div className="grid grid-cols-7 gap-1">
					{getDaysInMonth(currentMonth).map((date, index) => (
						<button
							key={index}
							onClick={() => handleDateClick(date)}
							disabled={!date}
							className={`
                p-2 text-sm font-medium rounded-lg transition-all duration-200
                ${!date ? 'invisible' : ''}
                ${isToday(date) ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                ${isSelected(date) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                ${date && !isToday(date) && !isSelected(date) ? 'text-gray-700 hover:bg-gray-100' : ''}
              `}
						>
							{date ? date.getDate() : ''}
						</button>
					))}
				</div>

				{/* Today Button */}
				<div className="mt-4 pt-4 border-t border-gray-200">
					<button
						onClick={() => handleDateClick(new Date())}
						className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
					>
						Today
					</button>
				</div>
			</div>
		</div>
	);
};

const AdSpend = () => {
	const formatLocalDate = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const { selectedStore, adsSyncCompleted } = useStore();
	const [adSpendData, setAdSpendData] = useState([]);
	const [campaigns, setCampaigns] = useState([]);
	const [loading, setLoading] = useState(false);
	const [syncProgress, setSyncProgress] = useState(null);
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
	});
	const [filters, setFilters] = useState({
		platform: '',
		storeId: '',
		productId: ''
	});

	const [adSpendPagination, setAdSpendPagination] = useState({
		currentPage: 1,
		pageSize: 10,
		totalPages: 1,
		totalItems: 0
	});

	// Sort configuration
	const [sortConfig, setSortConfig] = useState({
		key: 'date',
		direction: 'desc'
	});

	// Summary stats
	const [summaryStats, setSummaryStats] = useState({
		totalSpend: 0,
		facebookSpend: 0,
		googleSpend: 0,
		totalImpressions: 0,
		totalClicks: 0,
		totalConversions: 0,
		totalRevenue: 0,
		roas: 0
	});

	// Calendar state variables
	const [showDatePresets, setShowDatePresets] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);

	const [currencyChange, setCurrencyChange] = useState(null);
	// Get socket from context
	const { socket, addEventListener } = useSocket();

	// WebSocket event handlers
	useEffect(() => {
		if (!socket) return;

		// Add event listener for ads sync progress
		const removeAdsSyncListener = addEventListener('adsSyncProgress', (data) => {
			setSyncProgress(data);

			console.log(data)
			// Handle completion - check for both 'completed' and 'analytics_completed' stages
			if (data.stage === 'completed' || data.stage === 'analytics_completed') {
				// If it's analytics_completed, wait for the final 'completed' stage
				if (data.stage === 'analytics_completed') {
					// Don't clear progress yet, wait for final completion
					return;
				}
				
				// Refresh data after successful sync
				setTimeout(() => {
					fetchAdSpendData();
					fetchSummaryStats(campaignPagination.currentPage);
					fetchChartData();
					setSyncProgress(null);
				}, 2000);
			} else if (data.stage === 'error') {
				setTimeout(() => setSyncProgress(null), 3000);
			}
		});

		// Cleanup event listeners when component unmounts or socket changes
		return () => {
			removeAdsSyncListener();
		};
	}, [socket, addEventListener]);

	// Close date presets dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showDatePresets && !event.target.closest('.date-presets-container')) {
				setShowDatePresets(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showDatePresets]);

	// Effect for filters and date range changes (affects both table and chart)
	useEffect(() => {
		// Don't run this effect during sync operations
		if (syncProgress && syncProgress.stage !== 'completed') {
			return;
		}
		
		// Reset to first page when filters change
		setAdSpendPagination(prev => ({ ...prev, currentPage: 1 }));
		fetchAdSpendData();

		// Fetch summary stats and chart data with a slight delay to ensure fresh data
		setTimeout(() => {
			fetchSummaryStats(campaignPagination.currentPage);
			fetchChartData();
		}, 100);
	}, [dateRange, filters, selectedStore, syncProgress]);

	// Listen for ads sync completion from GlobalStoreSelector
	useEffect(() => {
		if (adsSyncCompleted > 0) {
			// Reset pagination to first page
			setAdSpendPagination(prev => ({ ...prev, currentPage: 1 }));
			// Refresh all data
			fetchAdSpendData();
			fetchSummaryStats(campaignPagination.currentPage);
			fetchChartData();
		}
	}, [adsSyncCompleted]);

	// Separate effect for pagination changes (only affects table, not chart)
	useEffect(() => {
		// Only fetch table data when pagination changes, not chart data
		if (adSpendPagination.currentPage > 0) {
			fetchAdSpendData();
		}
	}, [adSpendPagination.currentPage, adSpendPagination.pageSize]);

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


	const fetchAdSpendData = async (page = adSpendPagination.currentPage) => {
		return fetchAdSpendDataWithSort(page);
	};

	// Separate function to fetch summary stats (all data without pagination)
	const fetchSummaryStats = async (page = campaignPagination.currentPage, sortConfigOverride = null) => {
		setLoadingCampaigns(true);
		try {
			const currentSortConfig = sortConfigOverride || campaignSortConfig;
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				store_id: selectedStore,
				page: page,
				pageSize: campaignPagination.pageSize,
				sortBy: currentSortConfig.key,
				sortOrder: currentSortConfig.direction
			});
			
			// Add search parameter if search value exists
			if (campaignSearch.trim()) {
				params.append('search', campaignSearch.trim());
			}

			const response = await api.get(`/api/ads/summary-stats?${params}`);
			const { totalSpend, totalGoogleAmount, totalFacebookAmount, roiPercentage, revenue, campaigns, totalCount } = response.data;

			setCampaigns(campaigns);
			setCampaignPagination(prev => ({
				...prev,
				totalPages: Math.ceil(totalCount / campaignPagination.pageSize),
				totalItems: totalCount
			}));

				// Calculate summary stats including revenue for ROAS
			const stats = {
				totalSpend: totalSpend,
				facebookSpend: totalFacebookAmount,
				googleSpend: totalGoogleAmount,
				roas: roiPercentage,
				totalRevenue: revenue
			};

			setSummaryStats(stats);

			// Calculate ROAS using actual revenue data (not conversions)
			stats.roas = stats.totalSpend > 0 ? (stats.totalRevenue / stats.totalSpend) : 0;

			setSummaryStats(stats);

			console.log(stats)
		} catch (error) {
			console.error('Error fetching summary stats:', error);
		}
		finally {
			setLoadingCampaigns(false);
		}
	};

	// Calculate optimal number of data points based on date range
	const getOptimalDataPoints = () => {
		const startDate = new Date(dateRange.startDate);
		const endDate = new Date(dateRange.endDate);
		const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
		
		// For very short ranges (1-7 days), show individual days
		if (daysDiff <= 7) return 50;
		// For short ranges (8-30 days), show individual days
		if (daysDiff <= 30) return 50;
		// For medium ranges (31-90 days), limit to 60 points
		if (daysDiff <= 90) return 60;
		// For long ranges (91+ days), limit to 50 points
		return 50;
	};

	// Smart data aggregation for charts - similar to Dashboard
	const aggregateChartData = (data, maxPoints = null) => {
		// Use optimal data points if not specified
		const optimalPoints = maxPoints || getOptimalDataPoints();
		
		// Only aggregate if there are too many days for comfortable viewing
		if (!data || data.length <= optimalPoints) return data;

		const daysDiff = Math.ceil(data.length / optimalPoints);
		const aggregated = [];

		for (let i = 0; i < data.length; i += daysDiff) {
			const chunk = data.slice(i, i + daysDiff);
			
			// Create date range label
			const startDate = new Date(chunk[0].date);
			const endDate = new Date(chunk[chunk.length - 1].date);
			const dateRangeLabel = startDate.getTime() === endDate.getTime()
				? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
				: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

			const aggregatedPoint = {
				date: chunk[0].date,
				dateRange: dateRangeLabel,
				daysCount: chunk.length,
				facebook: chunk.reduce((sum, item) => sum + (item.facebook || 0), 0),
				google: chunk.reduce((sum, item) => sum + (item.google || 0), 0),
				total: chunk.reduce((sum, item) => sum + (item.facebook || 0) + (item.google || 0), 0)
			};
			aggregated.push(aggregatedPoint);
		}

		return aggregated;
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

	// Separate function to fetch chart data - completely independent of pagination
	const fetchChartData = async () => {
		try {
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				store_id: selectedStore,
			});

			// Add filters but exclude pagination
			Object.keys(filters).forEach(key => {
				if (key !== 'page' && key !== 'pageSize') {
					params.append(key, filters[key]);
				}
			});


			const response = await api.get(`/api/ads/chart-data?${params}`);
			const data = response.data.data || [];

			if (data.length === 0) {
				setChartData([]);
				return;
			}

			// Apply smart data aggregation if needed
			const optimalPoints = getOptimalDataPoints();
			
			const processedData = aggregateChartData(data);
			
			if (processedData.length < data.length) {
				const sampleAggregated = processedData.find(item => item.dateRange);
			}

			setChartData(processedData);
		} catch (error) {
			console.error('❌ Error fetching chart data:', error);
			setChartData([]);
		}
	};

	const syncAds = async (platform = 'all') => {
		try {
			setSyncProgress({ stage: 'starting', message: `Starting Windsor.ai sync for ${selectedStore}...`, progress: 0 });

			await api.post('/api/ads/sync-windsor', {
				from: "dashboard",
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				storeId: selectedStore,
				socketId: socket?.id // Pass socket ID for real-time progress
			});

			// Progress will be handled by WebSocket, so we don't need to set it here
			// The WebSocket will handle the progress updates and completion

		} catch (error) {
			console.error('Error syncing Windsor.ai data:', error);
			setSyncProgress({ stage: 'error', message: 'Windsor.ai sync failed!', progress: 0 });
			setTimeout(() => setSyncProgress(null), 3000);
		}
	};

	const { formatCurrency, displayCurrency } = useCurrency();

	const formatNumber = (num) => {
		return new Intl.NumberFormat('en-US').format(num);
	};

	const [chartData, setChartData] = useState([]);

	const getChartData = () => {
		return chartData;
	};

	const handleSort = (key) => {
		let direction = 'asc';
		if (sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		const newSortConfig = { key, direction };
		setSortConfig(newSortConfig);
		// Reset to first page when sorting
		setAdSpendPagination(prev => ({ ...prev, currentPage: 1 }));
		fetchAdSpendDataWithSort(1, newSortConfig);
	};

	const fetchAdSpendDataWithSort = async (page = adSpendPagination.currentPage, sortConfigOverride = null) => {
		try {
			setLoading(true);
			const currentSortConfig = sortConfigOverride || sortConfig;
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				page: page,
				pageSize: adSpendPagination.pageSize,
				sortBy: currentSortConfig.key,
				sortOrder: currentSortConfig.direction,
				store_id: selectedStore,
				...filters
			});

			const response = await api.get(`/api/ads/spend-detailed?${params}`);
			const { data, pagination } = response.data;
			
			setAdSpendData(data || []);

			// Update pagination from server response
			setAdSpendPagination(prev => ({
				...prev,
				totalPages: pagination.totalPages,
				currentPage: pagination.currentPage,
				totalItems: pagination.totalItems
			}));

			// Summary stats and chart data are handled separately
			// Only fetch table data here
		} catch (error) {
			console.error('❌ Error fetching ad spend data:', error);
			setAdSpendData([]);
		} finally {
			setLoading(false);
		}
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
			<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
			</svg>
		) : (
			<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
			</svg>
		);
	};

	const getPlatformData = () => {
		return [
			{ name: 'Facebook', value: summaryStats.facebookSpend, color: '#1877F2' },
			{ name: 'Google', value: summaryStats.googleSpend, color: '#f59e0b' }
		];
	};

	// Pagination functions
	const updateAdSpendPagination = (newPage) => {
		setAdSpendPagination(prev => ({
			...prev,
			currentPage: newPage
		}));
		fetchAdSpendDataWithSort(newPage);
	};

	const fetchAdSpendDataForPage = async (page) => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				page: page,
				pageSize: adSpendPagination.pageSize,
				...filters
			});

			const response = await api.get(`/api/ads/spend-detailed?${params}`);
			const { data, pagination } = response.data;
			setAdSpendData(data || []);

			// Update pagination from server response
			setAdSpendPagination(prev => ({
				...prev,
				totalPages: pagination.totalPages,
				currentPage: pagination.currentPage,
				totalItems: pagination.totalItems
			}));

			// Summary stats and chart data are handled separately
			// Only fetch table data here
		} catch (error) {
			console.error('Error fetching ad spend data:', error);
		} finally {
			setLoading(false);
		}
	};

	const PaginationControls = () => {
		if (adSpendPagination.totalPages <= 1) return null;

		// Generate smart page numbers
		const generatePageNumbers = () => {
			const current = adSpendPagination.currentPage;
			const total = adSpendPagination.totalPages;
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
					{/* Pagination Info */}
					<div className="flex items-center text-sm text-gray-700">
						{loading && (
							<div className="flex items-center mr-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
								<span className="text-blue-600">Loading...</span>
							</div>
						)}
						<span>
							Showing {((adSpendPagination.currentPage - 1) * adSpendPagination.pageSize) + 1} to{' '}
							{Math.min(adSpendPagination.currentPage * adSpendPagination.pageSize, adSpendPagination.totalItems)} of{' '}
							{adSpendPagination.totalItems} campaigns
						</span>
					</div>
				</div>

				<div className="flex items-center space-x-2">
					{/* Page Size Selector */}
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700">Show:</span>
						<BeautifulSelect
							value={adSpendPagination.pageSize}
							onChange={(value) => {
								setAdSpendPagination(prev => ({
									...prev,
									pageSize: parseInt(value),
									currentPage: 1
								}));
								fetchAdSpendData(1);
							}}
							options={[
								{ value: 10, label: '10' },
								{ value: 20, label: '20' },
								{ value: 50, label: '50' },
								{ value: 100, label: '100' }
							]}
							selectClass="pagesize-select"
							placeholder="Select"
							disabled={loading}
							className="w-24"
								size="sm"
						/>
						<span className="text-sm text-gray-500">per page</span>
					</div>

					{/* First page button */}
					<button
						onClick={() => updateAdSpendPagination(1)}
						disabled={adSpendPagination.currentPage === 1 || loading}
						className={`px-2 py-1 text-sm rounded-md ${adSpendPagination.currentPage === 1 || loading
							? 'bg-gray-50 text-gray-400 cursor-not-allowed'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						title="First page"
					>
						«
					</button>

					{/* Previous button */}
					<button
						onClick={() => updateAdSpendPagination(adSpendPagination.currentPage - 1)}
						disabled={adSpendPagination.currentPage === 1 || loading}
						className={`px-3 py-1 text-sm rounded-md ${adSpendPagination.currentPage > 1 && !loading
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Previous
					</button>

					{/* Page numbers */}
					<div className="flex items-center space-x-1">
						{pageNumbers.map((page, index) => (
							<React.Fragment key={index}>
								{page === '...' ? (
									<span className="px-2 text-gray-500">...</span>
								) : (
									<button
										onClick={() => updateAdSpendPagination(page)}
										disabled={loading}
										className={`px-3 py-1 text-sm rounded-md ${page === adSpendPagination.currentPage
											? 'bg-blue-600 text-white'
											: loading
												? 'bg-gray-50 text-gray-400 cursor-not-allowed'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
											}`}
									>
										{page}
									</button>
								)}
							</React.Fragment>
						))}
					</div>

					{/* Next button */}
					<button
						onClick={() => updateAdSpendPagination(adSpendPagination.currentPage + 1)}
						disabled={adSpendPagination.currentPage === adSpendPagination.totalPages || loading}
						className={`px-3 py-1 text-sm rounded-md ${adSpendPagination.currentPage < adSpendPagination.totalPages && !loading
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Next
					</button>

					{/* Last page button */}
					<button
						onClick={() => updateAdSpendPagination(adSpendPagination.totalPages)}
						disabled={adSpendPagination.currentPage === adSpendPagination.totalPages || loading}
						className={`px-2 py-1 text-sm rounded-md ${adSpendPagination.currentPage === adSpendPagination.totalPages || loading
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

	// Campaign Management State
	const [campaignCurrencies, setCampaignCurrencies] = useState({});
	const [loadingCampaigns, setLoadingCampaigns] = useState(true);
	
	// Campaign search state
	const [campaignSearch, setCampaignSearch] = useState('');
	
	// Campaign pagination state
	const [campaignPagination, setCampaignPagination] = useState({
		currentPage: 1,
		pageSize: 10,
		totalPages: 1,
		totalItems: 0
	});

	// Campaign sort configuration
	const [campaignSortConfig, setCampaignSortConfig] = useState({
		key: 'campaign_id',
		direction: 'asc'
	});

	// Effect to handle search changes
	useEffect(() => {
		if (selectedStore && campaignSearch.trim() == "") {
			// Reset to first page when search changes
			setCampaignPagination(prev => ({ ...prev, currentPage: 1 }));
			// Fetch campaigns with search
			fetchSummaryStats(1);
		}
	}, [campaignSearch]);

	// Separate effect for campaign pagination changes
	useEffect(() => {
		if (selectedStore && campaignPagination.currentPage > 0) {
			fetchSummaryStats(campaignPagination.currentPage);
		}
	}, [campaignPagination.currentPage, campaignPagination.pageSize]);

	// Load saved currencies from localStorage on component mount
	useEffect(() => {
		const saved = localStorage.getItem('campaignCurrencies');
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setCampaignCurrencies(parsed);
			} catch (error) {
				console.error('Error parsing saved currencies:', error);
			}
		}
	}, []);

	// Save currencies to localStorage when they change
	useEffect(() => {
		if (Object.keys(campaignCurrencies).length > 0) {
			localStorage.setItem('campaignCurrencies', JSON.stringify(campaignCurrencies));
		}
	}, [campaignCurrencies]);

	const handleCampaignCurrencyChange = async (campaignId, currency) => {
		setCampaignCurrencies(prev => ({ ...prev, [campaignId]: currency }));
		setCurrencyChange(campaignId);
		await api.post(`/api/ads/update-campaign-currency`, {
			campaign_id: campaignId,
			currency_symbol: currency,
			store_id: selectedStore
		});
		setCurrencyChange(null);

		fetchSummaryStats(campaignPagination.currentPage);
	};

	const handleCampaignSort = (key) => {
		let direction = 'asc';
		if (campaignSortConfig.key === key && campaignSortConfig.direction === 'asc') {
			direction = 'desc';
		}
		const newSortConfig = { key, direction };
		setCampaignSortConfig(newSortConfig);
		// Reset to first page when sorting
		setCampaignPagination(prev => ({ ...prev, currentPage: 1 }));
		// Fetch campaigns with new sort
		fetchSummaryStats(1, newSortConfig);
	};

	const handleCampaignSearch = () => {
		// Reset to first page when searching
		setCampaignPagination(prev => ({ ...prev, currentPage: 1 }));
		// Fetch campaigns with search
		fetchSummaryStats(1);
	};

	const getCampaignSortIcon = (key) => {
		if (campaignSortConfig.key !== key) {
			return (
				<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
				</svg>
			);
		}
		return campaignSortConfig.direction === 'asc' ? (
			<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
			</svg>
		) : (
			<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
			</svg>
		);
	};

	// Pagination functions
	const updateCampaignPagination = (newPage) => {
		setCampaignPagination(prev => ({
			...prev,
			currentPage: newPage
		}));
		fetchSummaryStats(newPage);
	};

	// Campaign Pagination Controls Component
	const CampaignPaginationControls = () => {
		if (campaignPagination.totalPages <= 1) return null;

		// Generate smart page numbers
		const generatePageNumbers = () => {
			const current = campaignPagination.currentPage;
			const total = campaignPagination.totalPages;
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
					{/* Pagination Info */}
					<div className="flex items-center text-sm text-gray-700">
						{loadingCampaigns && (
							<div className="flex items-center mr-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
								<span className="text-blue-600">Loading...</span>
							</div>
						)}
						<span>
							Showing {((campaignPagination.currentPage - 1) * campaignPagination.pageSize) + 1} to{' '}
							{Math.min(campaignPagination.currentPage * campaignPagination.pageSize, campaignPagination.totalItems)} of{' '}
							{campaignPagination.totalItems} campaigns
						</span>
					</div>
				</div>

				<div className="flex items-center space-x-2">
					{/* Page Size Selector */}
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700">Show:</span>
						<BeautifulSelect
							value={campaignPagination.pageSize}
							onChange={(value) => {
								setCampaignPagination(prev => ({
									...prev,
									pageSize: parseInt(value),
									currentPage: 1
								}));
								fetchSummaryStats(1);
							}}
							options={[
								{ value: 10, label: '10' },
								{ value: 20, label: '20' },
								{ value: 50, label: '50' },
								{ value: 100, label: '100' }
							]}
							selectClass="pagesize-select"
							placeholder="Select"
							disabled={loadingCampaigns}
							className="w-28"
							size="small"
							variant="pagination"
						/>
						<span className="text-sm text-gray-500">per page</span>
					</div>

					{/* First page button */}
					<button
						onClick={() => updateCampaignPagination(1)}
						disabled={campaignPagination.currentPage === 1 || loadingCampaigns}
						className={`px-2 py-1 text-sm rounded-md ${campaignPagination.currentPage === 1 || loadingCampaigns
							? 'bg-gray-50 text-gray-400 cursor-not-allowed'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						title="First page"
					>
						«
					</button>

					{/* Previous button */}
					<button
						onClick={() => updateCampaignPagination(campaignPagination.currentPage - 1)}
						disabled={campaignPagination.currentPage === 1 || loadingCampaigns}
						className={`px-3 py-1 text-sm rounded-md ${campaignPagination.currentPage > 1 && !loadingCampaigns
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Previous
					</button>

					{/* Page numbers */}
					<div className="flex items-center space-x-1">
						{pageNumbers.map((page, index) => (
							<React.Fragment key={index}>
								{page === '...' ? (
									<span className="px-2 text-gray-500">...</span>
								) : (
									<button
										onClick={() => updateCampaignPagination(page)}
										disabled={loadingCampaigns}
										className={`px-3 py-1 text-sm rounded-md ${page === campaignPagination.currentPage
											? 'bg-blue-600 text-white'
											: loadingCampaigns
												? 'bg-gray-50 text-gray-400 cursor-not-allowed'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
											}`}
									>
										{page}
									</button>
								)}
							</React.Fragment>
						))}
					</div>

					{/* Next button */}
					<button
						onClick={() => updateCampaignPagination(campaignPagination.currentPage + 1)}
						disabled={campaignPagination.currentPage === campaignPagination.totalPages || loadingCampaigns}
						className={`px-3 py-1 text-sm rounded-md ${campaignPagination.currentPage < campaignPagination.totalPages && !loadingCampaigns
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Next
					</button>

					{/* Last page button */}
					<button
						onClick={() => updateCampaignPagination(campaignPagination.totalPages)}
						disabled={campaignPagination.currentPage === campaignPagination.totalPages || loadingCampaigns}
						className={`px-2 py-1 text-sm rounded-md ${campaignPagination.currentPage === campaignPagination.totalPages || loadingCampaigns
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

	return (
		<div className="p-6 bg-gray-50 min-h-screen">
			{loading && adSpendData.length === 0 ? (
				<AdSpendLoader />
			) : (
				<>
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Ad Spend Dashboard</h1>
						<p className="text-gray-600">Track and analyze your advertising spend across platforms</p>
					</div>

					{/* Sync Progress */}
					{syncProgress && (
						<div className={`mb-6 p-4 border rounded-lg ${syncProgress.stage === 'completed'
								? 'bg-green-50 border-green-200'
								: syncProgress.stage === 'error'
									? 'bg-red-50 border-red-200'
									: 'bg-blue-50 border-blue-200'
							}`}>
							<div className="flex items-center">
								<RefreshCw className={`w-5 h-5 mr-2 ${syncProgress.stage === 'completed'
										? 'text-green-600'
										: syncProgress.stage === 'error'
											? 'text-red-600'
											: 'text-blue-600'
									} ${syncProgress.stage !== 'completed' && syncProgress.stage !== 'error' ? 'animate-spin' : ''}`} />
								<span className="text-sm font-medium">{syncProgress.message}</span>
							</div>
							{syncProgress.stage !== 'completed' && syncProgress.stage !== 'error' && (
								<div className="mt-2 w-full bg-gray-200 rounded-full h-2">
									<div
										className={`h-2 rounded-full transition-all duration-300 ${syncProgress.stage === 'error' ? 'bg-red-600' : 'bg-blue-600'
											}`}
										style={{ width: `${syncProgress.progress}%` }}
									></div>
								</div>
							)}
						</div>
					)}

					{/* Beautiful Date Range Filter with Calendar */}
					<div className="card mb-6">
						<div className="flex flex-col gap-2">
							<div className="flex gap-2">
								<div className="flex flex-col">
									<label className="text-xs text-gray-600 mb-1">Start Date</label>
									<button
										onClick={() => setShowStartCalendar(true)}
										className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
									>
										<span>{dateRange.startDate || 'Select start date'}</span>
										<Calendar className="w-4 h-4 text-gray-400 ml-2" />
									</button>
								</div>
								<span className="flex items-center text-gray-500" style={{marginTop: 18}}>to</span>
								<div className="flex flex-col">
									<label className="text-xs text-gray-600 mb-1">End Date</label>
									<button
										onClick={() => setShowEndCalendar(true)}
										className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
									>
										<span>{dateRange.endDate || 'Select end date'}</span>
										<Calendar className="w-4 h-4 text-gray-400 ml-2" />
									</button>
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

								{/* Sync All Button */}
								<div className="flex flex-col" style={{marginLeft: 10}}>
									<label className="text-xs text-gray-600 mb-1">Sync Data</label>
									<button
										onClick={() => syncAds('all')}
										disabled={loading}
										style={{height: 38}}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
									>
										<RefreshCw className="w-4 h-4 mr-2" />
										Sync All
									</button>
								</div>
							</div>

							{/* Date Range Display */}
							<div className="text-xs text-gray-500">
								Selected: {dateRange.startDate} to {dateRange.endDate}
							</div>
						</div>
					</div>

					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<DollarSign className="w-8 h-8 text-green-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">Total Spend</p>
									<p className="text-2xl font-bold text-gray-900">
										{formatCurrency(summaryStats.totalSpend, 'USD')}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<Facebook className="w-8 h-8 text-[#1877F2]" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">Facebook Spend</p>
									<p className="text-2xl font-bold text-[#1877F2]">
										{displayCurrency(summaryStats.facebookSpend, "USD")}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<Chrome className="w-8 h-8 text-[#f59e0b]" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">Google Spend</p>
									<p className="text-2xl font-bold text-[#f59e0b]">
										{formatCurrency(summaryStats.googleSpend, 'USD')}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<TrendingUp className="w-8 h-8 text-purple-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">ROAS</p>
									<p className="text-2xl font-bold text-gray-900">
										{`${summaryStats.roas.toFixed(2)}x`}
									</p>
									<p className="text-xs text-gray-500 mt-1">
										Revenue: {formatCurrency(summaryStats.totalRevenue, 'USD')}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Debug Info */}
					<div className="bg-gray-50 p-4 rounded-lg mb-6">
						<h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info (ROAS Calculation)</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
							<div>
								<span className="text-gray-600">Total Revenue:</span>
								<span className="ml-2 font-medium">{formatCurrency(summaryStats.totalRevenue, 'USD')}</span>
							</div>
							<div>
								<span className="text-gray-600">Total Ad Spend:</span>
								<span className="ml-2 font-medium">{formatCurrency(summaryStats.totalSpend, 'USD')}</span>
							</div>
							<div>
								<span className="text-gray-600">ROAS Formula:</span>
								<span className="ml-2 font-medium">Revenue ÷ Ad Spend</span>
							</div>
							<div>
								<span className="text-gray-600">ROAS Result:</span>
								<span className="ml-2 font-medium">{summaryStats.totalSpend > 0 ? `${(summaryStats.totalRevenue / summaryStats.totalSpend).toFixed(2)}x` : 'N/A'}</span>
							</div>
						</div>
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
						{/* Spend Over Time */}
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-semibold text-gray-900">Spend Over Time</h3>
								{chartData.length > 0 && chartData.some(item => item.dateRange) && (
									<div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded border border-blue-200">
										📊 Data grouped for better viewing ({chartData.length} points)
									</div>
								)}
							</div>
							{getChartData().length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={getChartData()}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
										<XAxis 
											dataKey="date" 
											tick={{ fontSize: 12 }}
											tickFormatter={(value) => {
												return formatChartDate(value, getChartData().length);
											}}
											angle={getChartData().length > 20 ? -45 : 0}
											textAnchor={getChartData().length > 20 ? "end" : "middle"}
											height={getChartData().length > 20 ? 80 : 60}
										/>
										<YAxis 
											tick={{ fontSize: 12 }}
											tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
										/>
										<Tooltip 
											formatter={(value, name) => [formatCurrency(value, 'USD'), name]}
											labelFormatter={(label, payload) => {
												if (payload && payload[0] && payload[0].payload.dateRange) {
													return `${payload[0].payload.dateRange} (${payload[0].payload.daysCount} days)`;
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
										<Line 
											type="monotone" 
											dataKey="facebook" 
											stroke="#1877F2" 
											name="Facebook" 
											strokeWidth={2}
											animationDuration={1000}
											activeDot={{ r: 6  }}
										/>
										<Line 
											type="monotone" 
											dataKey="google" 
											stroke="#f59e0b" 
											name="Google" 
											strokeWidth={2}
											animationDuration={1000}
											activeDot={{ r: 6  }}
										/>
									</LineChart>
								</ResponsiveContainer>
							) : (
								<div className="flex items-center justify-center h-[300px] text-gray-500">
									<div className="text-center">
										<div className="text-2xl mb-2">📊</div>
										<div>No chart data available</div>
										<div className="text-sm text-gray-400 mt-1">Check console for debugging info</div>
									</div>
								</div>
							)}
						</div>

						{/* Platform Distribution */}
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-semibold text-gray-900">Platform Distribution</h3>
								<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
									💰 Total: {formatCurrency(summaryStats.totalSpend, 'USD')}
								</div>
							</div>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={getPlatformData()}
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
										{getPlatformData().map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
												stroke="#fff"
												strokeWidth={2}
											/>
										))}
									</Pie>
									<Tooltip
										formatter={(value) => formatCurrency(value, 'USD')}
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
					</div>

					{/* Ads Campaign Table */}
					<div className="bg-white rounded-lg shadow-sm border mb-8">
						<div className="px-6 py-4 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-900">Ads Campaigns</h3>
								<div className="flex items-center gap-3">
									{/* Search Input */}
									<div className="relative">
										<input
											type="text"
											placeholder="Search campaigns..."
											value={campaignSearch}
											onChange={(e) => setCampaignSearch(e.target.value)}
											onKeyPress={(e) => e.key === 'Enter' && handleCampaignSearch()}
											className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
										/>
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Top Pagination for Campaigns */}
						{campaignPagination.totalPages > 1 && <CampaignPaginationControls />}

						{/* Search Results Info */}
						{campaignSearch && (
							<div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
								<div className="flex items-center justify-between text-sm">
									<div className="flex items-center gap-2">
										<svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										<span className="text-blue-800 font-medium">
											Search results for "{campaignSearch}"
										</span>
									</div>
									<span className="text-blue-600">
										{campaignPagination.totalItems} campaign{campaignPagination.totalItems !== 1 ? 's' : ''} found
									</span>
								</div>
							</div>
						)}

						<div className="table-container overflow-x-auto relative">
							{loadingCampaigns ? (
								<AdsCampaignTableLoader />
							) : campaigns.length === 0 ? (
								<div className="p-8 text-center text-gray-500">
									<BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
									<p className="text-lg font-medium mb-2">No campaigns found</p>
									<p className="text-sm">Create your first campaign to get started</p>
								</div>
							) : (
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th 
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleCampaignSort('campaign_id')}
											>
												<div className="flex items-center gap-2">
													Campaign Name
													{getCampaignSortIcon('campaign_id')}
												</div>
											</th>
											<th 
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleCampaignSort('total_spend')}
											>
												<div className="flex items-center gap-2">
													Total Spend
													{getCampaignSortIcon('total_spend')}
												</div>
											</th>
											<th 
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleCampaignSort('platform')}
											>
												<div className="flex items-center gap-2">
													Platform
													{getCampaignSortIcon('platform')}
												</div>
											</th>
											<th 
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleCampaignSort('total_clicks')}
											>
												<div className="flex items-center gap-2">
													Total Clicks
													{getCampaignSortIcon('total_clicks')}
												</div>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Display Currency
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{campaigns.map((campaign) => (
											<tr key={campaign.campaign_id} className="hover:bg-gray-50 relative">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center">
														<BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
														<span 
															className="text-sm font-medium text-gray-900 truncate max-w-100"
															title={campaign.campaign_name || campaign.campaign_id}
														>
															{campaign.campaign_name || campaign.campaign_id}
														</span>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{displayCurrency(campaign.total_spend / campaign.currency, campaign.currency_symbol)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															campaign.platform === 'facebook' 
																? 'bg-blue-100 text-blue-800' 
																: 'bg-amber-100 text-amber-800'
														}`}>
															{campaign.platform === 'facebook' ? (
																<Facebook className="w-3 h-3 mr-1" />
															) : (
																<Chrome className="w-3 h-3 mr-1" />
															)}
															{campaign.platform}
														</span>
													</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
													{campaign.total_clicks?.toLocaleString() || '0'}
												</td>
												<td className="px-6 py-4 whitespace-nowrap flex items-center">
													{
														currencyChange == campaign.campaign_id && (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
														)
													}
													<div className="relative">
														<BeautifulSelect
															value={campaign.currency_symbol}
															onChange={(currency) => handleCampaignCurrencyChange(campaign.campaign_id, currency)}
															options={[
																{ value: 'USD', label: 'USD ($)' },
																{ value: 'SEK', label: 'SEK (kr)' },
																{ value: 'EUR', label: 'EUR (€)' }
															]}
															className="w-32"
															size="small"
														/>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>

						{/* Bottom Pagination for Campaigns */}
						{campaignPagination.totalPages > 1 && <CampaignPaginationControls />}
					</div>

					{/* Campaign Table */}
					<div className="bg-white rounded-lg shadow-sm border">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
						</div>

						{/* Top Pagination */}
						<PaginationControls />

						<div className="table-container overflow-x-auto relative">
							{loading ? (
								<AdSpendTableLoader />
							) : (
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleSort('date')}
											>
												<div className="flex items-center gap-2">
													Date
													{getSortIcon('date')}
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											>
												<div className="flex items-center gap-2">
													Campaign
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											>
												<div className="flex items-center gap-2">
													Platform
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											>
												<div className="flex items-center gap-2">
													Store
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleSort('spend_amount')}
											>
												<div className="flex items-center gap-2">
													Spend
													{getSortIcon('spend_amount')}
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleSort('clicks')}
											>
												<div className="flex items-center gap-2">
													Clicks
													{getSortIcon('clicks')}
												</div>
											</th>
											<th
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
												onClick={() => handleSort('impressions')}
											>
												<div className="flex items-center gap-2">
													Impressions
													{getSortIcon('impressions')}
												</div>
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{adSpendData.length === 0 ? (
											<tr>
												<td colSpan="8" className="px-6 py-8 text-center text-gray-500">
													<div className="flex flex-col items-center">
														<div className="text-4xl mb-2">📊</div>
														<div className="text-lg font-medium mb-2">No ad spend data found</div>
														<div className="text-sm text-gray-400 mb-4">
															Try syncing ads data or adjusting your date range and filters
														</div>
														<button
															onClick={() => syncAds('all')}
															className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
														>
															<RefreshCw className="w-4 h-4 mr-2 inline" />
															Sync Ads Data
														</button>
													</div>
												</td>
											</tr>
										) : (
											adSpendData.map((item, index) => (
												<tr key={index} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{new Date(item.date).toLocaleDateString()}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														<span 
															className="truncate max-w-32 block"
															title={item.campaign_id}
														>
															{item.campaign_id}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															item.platform === 'facebook' 
																? 'bg-blue-100 text-blue-800' 
																: 'bg-amber-100 text-amber-800'
														}`}>
															{item.platform === 'facebook' ? (
																<Facebook className="w-3 h-3 mr-1" />
															) : (
																<Chrome className="w-3 h-3 mr-1" />
															)}
															{item.platform}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{item.store_id}
													</td>
													{/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{item.product_id || 'N/A'}
													</td> */}
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{displayCurrency(item.spend_amount, item.currency_symbol)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{item.clicks?.toLocaleString() || 'N/A'}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{item.impressions?.toLocaleString() || 'N/A'}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							)}
						</div>

						{/* Bottom Pagination */}
						<PaginationControls />
					</div>

					{/* Calendar Modals */}
					<CustomCalendar
						isOpen={showStartCalendar}
						onClose={() => setShowStartCalendar(false)}
						onDateSelect={handleStartDateSelect}
						selectedDate={dateRange.startDate}
						label="Select Start Date"
					/>

					<CustomCalendar
						isOpen={showEndCalendar}
						onClose={() => setShowEndCalendar(false)}
						onDateSelect={handleEndDateSelect}
						selectedDate={dateRange.endDate}
						label="Select End Date"
					/>
				</>
			)}
		</div>
	);
};

export default AdSpend; 