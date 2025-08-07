import React, { useState, useEffect } from 'react';
import {
	BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell, Legend
} from 'recharts';
import {
	DollarSign, TrendingUp, TrendingDown, ShoppingCart, RefreshCw,
	Facebook, Chrome, Filter, Download, Settings, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import BeautifulSelect from './BeautifulSelect';
import { io } from 'socket.io-client';
import AdSpendLoader from './loaders/AdSpendLoader';

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
		console.log('selectMonth called with month:', month);
		console.log('Current month before:', currentMonth);
		const newMonth = new Date(currentMonth.getFullYear(), month, 1);
		console.log('New month date:', newMonth);
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
		<div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center">
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
							className="text-sm font-medium text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors year-selector"
						>
							{currentMonth.getFullYear()}
						</button>
						<button
							onClick={goToNextYear}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Next Year"
						>
							<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
							</svg>
						</button>
					</div>

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
							<div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
								<div className="grid grid-cols-3 gap-1">
									{monthNames.map((month, index) => (
										<button
											key={index}
											onClick={() => selectMonth(index)}
											className={`px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${
												index === currentMonth.getMonth() ? 'bg-blue-100 text-blue-700 font-medium' : ''
											}`}
										>
											{month}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Year Selector */}
					{showYearSelector && (
						<div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 year-selector">
							<div className="grid grid-cols-3 gap-1">
								{Array.from({ length: 12 }, (_, i) => currentMonth.getFullYear() - 6 + i).map((year) => (
									<button
										key={year}
										onClick={() => selectYear(year)}
										className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${year === currentMonth.getFullYear() ? 'bg-blue-100 text-blue-700' : ''
											}`}
									>
										{year}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Calendar Grid */}
				<div className="grid grid-cols-7 gap-1 mb-4">
					{dayNames.map((day) => (
						<div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
							{day}
						</div>
					))}
					{getDaysInMonth(currentMonth).map((date, index) => (
						<button
							key={index}
							onClick={() => handleDateClick(date)}
							disabled={!date}
							className={`p-2 text-sm rounded-lg transition-colors ${!date
									? 'invisible'
									: isToday(date)
										? 'bg-blue-100 text-blue-700 font-semibold'
										: isSelected(date)
											? 'bg-blue-600 text-white font-semibold'
											: 'hover:bg-gray-100 text-gray-700'
								}`}
						>
							{date ? date.getDate() : ''}
						</button>
					))}
				</div>

				{/* Quick Actions */}
				<div className="flex gap-2">
					<button
						onClick={() => {
							const today = new Date();
							onDateSelect(formatDate(today));
							onClose();
						}}
						className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Today
					</button>
					<button
						onClick={onClose}
						className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

const AdSpend = () => {
	const [adSpendData, setAdSpendData] = useState([]);
	const [campaigns, setCampaigns] = useState([]);
	const [stores, setStores] = useState([]);
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [syncProgress, setSyncProgress] = useState(null);
	const [socket, setSocket] = useState(null);
	const [dateRange, setDateRange] = useState({
		startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		endDate: new Date().toISOString().split('T')[0]
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
		roas: 0
	});

	// Calendar state variables
	const [showDatePresets, setShowDatePresets] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);

	// WebSocket connection setup
	useEffect(() => {
		const newSocket = io('http://localhost:5000');

		newSocket.on('connect', () => {
			console.log('🔌 Connected to WebSocket server (AdSpend)');
		});

		newSocket.on('adsSyncProgress', (data) => {
			console.log('📊 Ads sync progress:', data);
			setSyncProgress(data);

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
					fetchCampaigns();
					fetchSummaryStats();
					fetchChartData();
					setSyncProgress(null);
				}, 2000);
			} else if (data.stage === 'error') {
				setTimeout(() => setSyncProgress(null), 3000);
			}
		});

		newSocket.on('disconnect', () => {
			console.log('🔌 Disconnected from WebSocket server (AdSpend)');
		});

		setSocket(newSocket);

		return () => {
			newSocket.close();
		};
	}, []);

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
		// Reset to first page when filters change
		setAdSpendPagination(prev => ({ ...prev, currentPage: 1 }));
		fetchAdSpendData();
		fetchCampaigns();
		fetchStores();
		fetchProducts();

		// Fetch summary stats and chart data with a slight delay to ensure fresh data
		setTimeout(() => {
			fetchSummaryStats();
			fetchChartData();
		}, 100);
	}, [dateRange, filters]);

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
					startDate: startDate.toISOString().split('T')[0],
					endDate: lastMonthEnd.toISOString().split('T')[0]
				});
				setShowDatePresets(false);
				return;
			default:
				return;
		}

		setDateRange({
			startDate: startDate.toISOString().split('T')[0],
			endDate: today.toISOString().split('T')[0]
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
	const fetchSummaryStats = async () => {
		try {
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				...filters
			});

			console.log('🔍 Fetching summary stats for date range:', dateRange.startDate, 'to', dateRange.endDate);

			const response = await axios.get(`/api/ads/summary-stats?${params}`);
			const data = response.data.data || [];

			console.log('📊 Summary stats received:', data.length, 'records');
			console.log('📊 Sample summary data:', data.slice(0, 3));

			calculateSummaryStats(data);
		} catch (error) {
			console.error('❌ Error fetching summary stats:', error);
			// Set default values if error
			setSummaryStats({
				totalSpend: 0,
				facebookSpend: 0,
				googleSpend: 0,
				totalImpressions: 0,
				totalClicks: 0,
				totalConversions: 0,
				roas: 0
			});
		}
	};

	// Separate function to fetch chart data - completely independent of pagination
	const fetchChartData = async () => {
		try {
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
			});

			// Add filters but exclude pagination
			Object.keys(filters).forEach(key => {
				if (key !== 'page' && key !== 'pageSize') {
					params.append(key, filters[key]);
				}
			});

			console.log('🔍 Fetching chart data for date range:', dateRange.startDate, 'to', dateRange.endDate);

			const response = await axios.get(`/api/ads/chart-data?${params}`);
			const data = response.data.data || [];

			console.log('📊 Chart data received:', data.length, 'processed records');
			console.log('📊 Sample data:', data.slice(0, 3));

			if (data.length === 0) {
				console.log('⚠️ No data found for chart');
				setChartData([]);
				return;
			}

			console.log('📈 Chart data ready:', data.length, 'unique dates');
			console.log('📈 Date range in chart:', data[0]?.date, 'to', data[data.length - 1]?.date);

			// Validate chart data
			if (data.length < 2) {
				console.log('⚠️ Insufficient chart data points');
			}

			setChartData(data);
		} catch (error) {
			console.error('❌ Error fetching chart data:', error);
			setChartData([]);
		}
	};

	const fetchCampaigns = async () => {
		try {
			console.log('🔍 Fetching campaigns...');
			const response = await axios.get('/api/ads/campaigns');
			const data = response.data.data || [];
			console.log('📊 Campaigns received:', data.length, 'campaigns');
			setCampaigns(data);
		} catch (error) {
			console.error('❌ Error fetching campaigns:', error);
			setCampaigns([]);
		}
	};

	const fetchStores = async () => {
		try {
			console.log('🔍 Fetching stores...');
			const response = await axios.get('/api/ads/stores');
			const data = response.data.data || [];
			console.log('📊 Stores received:', data.length, 'stores');
			setStores(data);
		} catch (error) {
			console.error('❌ Error fetching stores:', error);
			// Set empty array to prevent errors
			setStores([]);
		}
	};

	const fetchProducts = async () => {
		try {
			console.log('🔍 Fetching products...');
			const response = await axios.get('/api/ads/products');
			const data = response.data.data || [];
			console.log('📊 Products received:', data.length, 'products');
			setProducts(data);
		} catch (error) {
			console.error('❌ Error fetching products:', error);
			// Set empty array to prevent errors
			setProducts([]);
		}
	};

	const calculateSummaryStats = (data) => {
		console.log('🧮 Calculating summary stats from', data.length, 'records');

		const stats = data.reduce((acc, item) => {
			const spend = parseFloat(item.spend_amount) || 0;
			acc.totalSpend += spend;
			acc.totalImpressions += parseInt(item.impressions) || 0;
			acc.totalClicks += parseInt(item.clicks) || 0;
			acc.totalConversions += parseFloat(item.conversions) || 0;

			if (item.platform === 'facebook') {
				acc.facebookSpend += spend;
			} else if (item.platform === 'google') {
				acc.googleSpend += spend;
			}

			return acc;
		}, {
			totalSpend: 0,
			facebookSpend: 0,
			googleSpend: 0,
			totalImpressions: 0,
			totalClicks: 0,
			totalConversions: 0
		});

		stats.roas = stats.totalSpend > 0 ? (stats.totalConversions / stats.totalSpend) : 0;

		console.log('💰 Calculated stats:', stats);
		setSummaryStats(stats);
	};

	const syncAds = async (platform = 'all') => {
		try {
			setSyncProgress({ stage: 'starting', message: 'Starting Windsor.ai sync...', progress: 0 });

			const response = await axios.post('/api/ads/sync-windsor', {
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				socketId: socket?.id // Pass socket ID for real-time progress
			});

			const { campaignsSaved, adSpendRecordsSaved } = response.data;

			// Progress will be handled by WebSocket, so we don't need to set it here
			// The WebSocket will handle the progress updates and completion

		} catch (error) {
			console.error('Error syncing Windsor.ai data:', error);
			setSyncProgress({ stage: 'error', message: 'Windsor.ai sync failed!', progress: 0 });
			setTimeout(() => setSyncProgress(null), 3000);
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	};

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
				...filters
			});

			console.log('🔍 Fetching ad spend data with params:', params.toString());

			const response = await axios.get(`/api/ads/spend-detailed?${params}`);
			const { data, pagination } = response.data;
			
			console.log('📊 Ad spend data received:', data?.length || 0, 'records');
			console.log('📊 Pagination:', pagination);
			
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
			{ name: 'Google', value: summaryStats.googleSpend, color: '#EA4335' }
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

			const response = await axios.get(`/api/ads/spend-detailed?${params}`);
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
								<span className="flex items-center text-gray-500">to</span>
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
							</div>

							{/* Date Range Display */}
							<div className="text-xs text-gray-500">
								Selected: {dateRange.startDate} to {dateRange.endDate}
							</div>
						</div>
					</div>

					{/* Additional Filters and Sync Buttons */}
					<div className="flex gap-4 mb-8 items-center">
						{/* Platform Filter */}
						<div className="flex gap-2 ml-4">
							<button
								onClick={() => syncAds('all')}
								disabled={loading}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
							>
								<RefreshCw className="w-4 h-4 mr-1" />
								Sync All
							</button>
							<button
								onClick={() => syncAds('facebook')}
								disabled={loading}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
							>
								<Facebook className="w-4 h-4 mr-1" />
								Sync FB
							</button>
							<button
								onClick={() => syncAds('google')}
								disabled={loading}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
							>
								<Chrome className="w-4 h-4 mr-1" />
								Sync Google
							</button>
						</div>
						<div className="flex items-center gap-2 ml-4">
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">Platform:</label>
							<BeautifulSelect
								value={filters.platform}
								onChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}
								options={[
									{ value: '', label: 'All Platforms' },
									{ value: 'facebook', label: 'Facebook' },
									{ value: 'google', label: 'Google' }
								]}
								className="w-40"
							/>
						</div>

						{/* Store Filter */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-gray-700 whitespace-nowrap">Store:</label>
							<BeautifulSelect
								value={filters.storeId}
								onChange={(value) => setFilters(prev => ({ ...prev, storeId: value }))}
								options={[
									{ value: '', label: 'All Stores' },
									...stores.map(store => ({ value: store.store_id, label: store.store_name }))
								]}
								className="w-32"
							/>
						</div>

						{/* Sync Buttons */}
						
					</div>

					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<DollarSign className="w-8 h-8 text-green-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">Total Spend</p>
									<p className="text-2xl font-bold text-gray-900">
										{formatCurrency(summaryStats.totalSpend)}
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
										{formatCurrency(summaryStats.facebookSpend)}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="flex items-center">
								<Chrome className="w-8 h-8 text-[#EA4335]" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">Google Spend</p>
									<p className="text-2xl font-bold text-[#EA4335]">
										{formatCurrency(summaryStats.googleSpend)}
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
								</div>
							</div>
						</div>
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
						{/* Spend Over Time */}
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Spend Over Time</h3>
							{getChartData().length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={getChartData()}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip formatter={(value) => formatCurrency(value)} />
										<Legend />
										<Line type="monotone" dataKey="facebook" stroke="#1877F2" name="Facebook" strokeWidth={2} />
										<Line type="monotone" dataKey="google" stroke="#EA4335" name="Google" strokeWidth={2} />
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
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={getPlatformData()}
										cx="50%"
										cy="50%"
										outerRadius={80}
										dataKey="value"
										label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
									>
										{getPlatformData().map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} />
										))}
									</Pie>
									<Tooltip formatter={(value) => formatCurrency(value)} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Campaign Table */}
					<div className="bg-white rounded-lg shadow-sm border">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
						</div>

						{/* Top Pagination */}
						<PaginationControls />

						<div className="overflow-x-auto relative">
							{loading && (
								<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
									<div className="flex items-center space-x-2">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
										<span className="text-gray-600">Loading...</span>
									</div>
								</div>
							)}
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
											onClick={() => handleSort('campaign_id')}
										>
											<div className="flex items-center gap-2">
												Campaign
												{getSortIcon('campaign_id')}
											</div>
										</th>
										<th
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											onClick={() => handleSort('platform')}
										>
											<div className="flex items-center gap-2">
												Platform
												{getSortIcon('platform')}
											</div>
										</th>
										<th
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											onClick={() => handleSort('store_id')}
										>
											<div className="flex items-center gap-2">
												Store
												{getSortIcon('store_id')}
											</div>
										</th>
										{/* <th
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
											onClick={() => handleSort('product_id')}
										>
											<div className="flex items-center gap-2">
												Product
												{getSortIcon('product_id')}
											</div>
										</th> */}
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
											onClick={() => handleSort('impressions')}
										>
											<div className="flex items-center gap-2">
												Impressions
												{getSortIcon('impressions')}
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
											onClick={() => handleSort('conversions')}
										>
											<div className="flex items-center gap-2">
												Conversions
												{getSortIcon('conversions')}
											</div>
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{adSpendData.length === 0 ? (
										<tr>
											<td colSpan="9" className="px-6 py-8 text-center text-gray-500">
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
											<tr key={index}>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{new Date(item.date).toLocaleDateString()}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
													{item.campaign_id}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.platform === 'facebook'
														? 'bg-[#1877F2] bg-opacity-10 text-[#1877F2]'
														: 'bg-[#EA4335] bg-opacity-10 text-[#EA4335]'
													}`}>
														{item.platform === 'facebook' ? <Facebook className="w-3 h-3 mr-1" /> : <Chrome className="w-3 h-3 mr-1" />}
														{item.platform}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{item.store_id || '-'}
												</td>
												{/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{item.product_id || '-'}
												</td> */}
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{formatCurrency(item.spend_amount)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatNumber(item.impressions)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatNumber(item.clicks)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatNumber(item.conversions)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
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