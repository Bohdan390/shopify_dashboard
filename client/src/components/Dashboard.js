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
	PieChart, Pie, Cell, AreaChart, Area, Brush, ReferenceLine, Legend, ComposedChart
} from 'recharts';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import BeautifulSelect from './BeautifulSelect';
import DashboardLoader from './loaders/DashboardLoader';
import ChartsAndTableLoader from './loaders/ChartsAndTableLoader';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';

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
			if (isOpen && !event.target.closest('.calendar-modal') && !event.target.closest('.month-selector-modal') && !event.target.closest('.sync-modal') && !event.target.closest('.recalc-modal')) {
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
			// Only close the calendar modal, not other modals
			setTimeout(() => {
				onClose();
			}, 100);
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
	// Custom calendar states
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);
	const [showSyncCalendar, setShowSyncCalendar] = useState(false);

	// Recalculate modal states
	const [showRecalcModal, setShowRecalcModal] = useState(false);
	const [recalcDate, setRecalcDate] = useState('');
	const [showRecalcCalendar, setShowRecalcCalendar] = useState(false);

	// WebSocket states
	const { socket } = useSocket();
	const [syncProgress, setSyncProgress] = useState(null);
	const [recalcProgress, setRecalcProgress] = useState(null);



	const handleDateRangeChange = async () => {
		if (dateRange.startDate && dateRange.endDate) {
			try {
				setChartsLoading(true);

				// Fetch both analytics and summary data
				const analyticsUrl = `/api/analytics/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&storeId=${selectedStore}`;
				const summaryUrl = `/api/analytics/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&storeId=${selectedStore}`;

				const [analyticsResponse, summaryResponse] = await Promise.all([
					axios.get(analyticsUrl),
					axios.get(summaryUrl)
				]);
				// Ensure we have valid data
				const analyticsData = Array.isArray(analyticsResponse.data) ? analyticsResponse.data : [];
				const summaryData = summaryResponse.data || {};

				setDashboardData({
					analytics: analyticsData,
					summary: summaryData
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

		socket.on('dashboard_syncProgress', (data) => {
			setSyncProgress(data);
			console.log(data)

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

		socket.on('recalcProgress', (data) => {
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

		// Cleanup event listeners when component unmounts or socket changes
		return () => {
			if (socket) {
				socket.off('dashboard_syncProgress');
				socket.off('recalcProgress');
			}
		};
	}, [socket]);

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
				url = `/api/analytics/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&storeId=${selectedStore}`;
			} else {
				url = `/api/analytics/dashboard?period=${period}&storeId=${selectedStore}`;
			}

			const response = await axios.get(url);
			setDashboardData(response.data);

			// Show success toast for manual refresh
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			// Set empty data to prevent undefined errors
			setDashboardData({ summary: {}, analytics: [] });

			// Show error toast for manual refresh
			if (showRefreshing && window.showToast) {
				window.showToast.error('Update Failed', 'Failed to refresh dashboard data');
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
	// Watch for date range changes and fetch data automatically
	useEffect(() => {
		if (dateRange.startDate && dateRange.endDate && !showCustomDateRange) {
			handleDateRangeChange();
		}
	}, [dateRange.startDate, dateRange.endDate, showCustomDateRange]);



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

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape' && showSyncModal) {
				closeSyncModal();
			}
		};

		if (showSyncModal) {
			document.addEventListener('keydown', handleEscape);
			return () => document.removeEventListener('keydown', handleEscape);
		}
	}, [showSyncModal]);

	// Close sync modal when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showSyncModal && !event.target.closest('.sync-modal') && !event.target.closest('.calendar-modal')) {
				closeSyncModal();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showSyncModal]);

	// Close recalc modal when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showRecalcModal && !event.target.closest('.recalc-modal') && !event.target.closest('.calendar-modal')) {
				closeRecalcModal();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showRecalcModal]);

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
		if (!recalcDate) {
			alert('Please select a date for recalculation');
			return;
		}

		try {
			setSyncing(true);
			setRecalcProgress(null); // Clear previous progress
			setSyncStep('Starting analytics recalculation...');

			// Pass socket ID for real-time progress updates
			await axios.post('/api/analytics/recalculate', {
				recalcDate: recalcDate,
				socketId: socket?.id, // Pass socket ID for WebSocket communication
				storeId: selectedStore // Pass selected store ID
			});

			// Progress updates will come via WebSocket
			// The syncStep will be updated by the WebSocket progress handler

		} catch (error) {
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
			const response = await axios.post('/api/shopify/sync-orders', {
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

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatPercentage = (value) => {
		if (value === undefined || value === null || isNaN(value)) {
			return '0.0%';
		}
		return `${value.toFixed(1)}%`;
	};

	// Smart data aggregation for charts
	const aggregateChartData = (data, maxPoints = 50) => {
		// Only aggregate if there are too many days for comfortable viewing
		// For 7 days, 30 days, etc. - show individual days
		// Only aggregate for very large date ranges (like custom ranges with many months)
		if (!data || data.length <= maxPoints) return data;

		const daysDiff = Math.ceil(data.length / maxPoints);
		const aggregated = [];

		for (let i = 0; i < data.length; i += daysDiff) {
			const chunk = data.slice(i, i + daysDiff);
			const totalRevenue = chunk.reduce((sum, item) => sum + (item.revenue || 0), 0);
			const totalProfit = chunk.reduce((sum, item) => sum + (item.profit || 0), 0);

			// Create date range label
			const startDate = new Date(chunk[0].date);
			const endDate = new Date(chunk[chunk.length - 1].date);
			const dateRangeLabel = startDate.getTime() === endDate.getTime()
				? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
				: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

			const totalAdSpend = chunk.reduce((sum, item) => sum + (item.google_ads_spend || 0) + (item.facebook_ads_spend || 0), 0);
			const aggregatedPoint = {
				date: chunk[0].date,
				dateRange: dateRangeLabel,
				daysCount: chunk.length,
				revenue: totalRevenue,
				profit: totalProfit,
				google_ads_spend: chunk.reduce((sum, item) => sum + (item.google_ads_spend || 0), 0),
				facebook_ads_spend: chunk.reduce((sum, item) => sum + (item.facebook_ads_spend || 0), 0),
				total_ad_spend: totalAdSpend,
				cost_of_goods: chunk.reduce((sum, item) => sum + (item.cost_of_goods || 0), 0),
				profit_margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
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

	// Get aggregated chart data and add total ad spend
	const chartData = aggregateChartData(analytics || []).map(item => ({
		...item,
		total_ad_spend: (item.google_ads_spend || 0) + (item.facebook_ads_spend || 0),
		profit: (item.revenue || 0) - (item.cost_of_goods || 0) - ((item.google_ads_spend || 0) + (item.facebook_ads_spend || 0))
	}));

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
										{syncProgress && syncProgress.current && syncProgress.total !== 'unlimited' && (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncProgress.current} / {syncProgress.total} orders
											</div>
										)}
										{syncProgress && syncProgress.total === 'unlimited' && (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncProgress.current} orders processed
											</div>
										)}
										{recalcProgress && recalcProgress.current && recalcProgress.total && (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{recalcProgress.current} / {recalcProgress.total} dates
											</div>
										)}
									</div>
								)}

								{syncStep && !(syncProgress || recalcProgress) && (
									<p className="text-sm text-primary-600 font-medium">{syncStep}</p>
								)}
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
				<div className="flex gap-4" style={{ display: "flex", alignItems: "center" }}>
					{/* Period Selector */}
					{/* Custom Date Range */}
					{showCustomDateRange && (
						<div className="flex flex-col gap-2">
							<div className="flex gap-2">
								<div className="flex flex-col">
									<label className="text-xs text-gray-600 mb-1">Start Date</label>
									<button
										onClick={() => setShowStartCalendar(true)}
										className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
									>
										<span>{dateRange.startDate || 'Select start date'}</span>
										<svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</button>
								</div>
								<span className="flex items-center text-gray-500" style={{ marginTop: 18 }}>to</span>
								<div className="flex flex-col">
									<label className="text-xs text-gray-600 mb-1">End Date</label>
									<button
										onClick={() => setShowEndCalendar(true)}
										className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
									>
										<span>{dateRange.endDate || 'Select end date'}</span>
										<svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</button>
								</div>
								<button
									onClick={() => { handleDateRangeChange() }}
									disabled={loading || !dateRange.startDate || !dateRange.endDate}
									className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed self-end"
								>
									Apply
								</button>
							</div>
							{/* Date Range Display */}
							{(dateRange.startDate || dateRange.endDate) && (
								<div className="text-xs text-gray-500">
									Selected: {dateRange.startDate || 'Not set'} to {dateRange.endDate || 'Not set'}
								</div>
							)}
						</div>
					)}


					{/* Recalculate Analytics Button */}

				</div>
			</div>

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
						<span className="flex items-center text-gray-500" style={{ marginTop: 18 }}>to</span>
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
						<div className="flex flex-col">
							<label className="text-xs text-gray-600 mb-1 opacity-0">Q</label>
							<button
								style={{ height: 40 }}
								onClick={openRecalcModal}
								className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm"
								disabled={syncing}
							>
								<RefreshCw className="w-4 h-4" />
								Recalculate Analytics
							</button>


						</div>


						<div className="flex flex-col">
							<label className="text-xs text-gray-600 mb-1 opacity-0">Q</label>
							<button
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
						</button>
						</div>
						
					</div>

					{/* Date Range Display */}
					<div className="text-xs text-gray-500">
						Selected: {dateRange.startDate} to {dateRange.endDate}
					</div>
				</div>
			</div>

			{/* Charts and Table Loading State */}
			{chartsLoading ? (
				<ChartsAndTableLoader />
			) : (
				<>
					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Revenue & Profit Chart */}
				<div className="card">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Revenue & Ad Spend Trend</h3>
						{chartData.length < (analytics?.length || 0) && (
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								📊 Showing {chartData.length} aggregated points from {(analytics?.length || 0)} days
							</div>
						)}
					</div>
					<ResponsiveContainer width="100%" height={300}>
						<ComposedChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis
								dataKey="date"
								tickFormatter={(value) => formatChartDate(value, chartData.length)}
								angle={chartData.length > 20 ? -45 : 0}
								textAnchor={chartData.length > 20 ? "end" : "middle"}
								height={chartData.length > 20 ? 80 : 60}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								tick={{ fontSize: 12 }}
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<Tooltip
								formatter={(value, name) => [formatCurrency(value), name]}
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

							{/* Area chart for ad spend background */}
							<Area
								type="monotone"
								dataKey="total_ad_spend"
								stroke="#ef4444"
								fill="#fef2f2"
								fillOpacity={0.3}
								name="Ad Spend Area"
								hide={true}
							/>

							{/* Line charts */}
							<Line
								type="monotone"
								dataKey="revenue"
								stroke="#3b82f6"
								strokeWidth={2}
								name="Revenue"
								dot={chartData.length <= 50}
								activeDot={{ r: 6 }}
								animationDuration={1000}
							/>
							<Line
								type="monotone"
								dataKey="total_ad_spend"
								stroke="#ef4444"
								strokeWidth={2}
								name="Ad Spend"
								dot={chartData.length <= 50}
								activeDot={{ r: 6 }}
								animationDuration={1000}
							/>

							{/* Brush for data selection */}
							<Brush
								dataKey="date"
								height={30}
								stroke="#8884d8"
								tickFormatter={(value) => formatChartDate(value, chartData.length)}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				{/* Ad Spend Chart */}
				<div className="card">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Ad Spend Breakdown</h3>
						{chartData.length < (analytics?.length || 0) && (
							<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
								📊 Showing {chartData.length} aggregated points from {(analytics?.length || 0)} days
							</div>
						)}
					</div>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis
								dataKey="date"
								tickFormatter={(value) => formatChartDate(value, chartData.length)}
								angle={chartData.length > 20 ? -45 : 0}
								textAnchor={chartData.length > 20 ? "end" : "middle"}
								height={chartData.length > 20 ? 80 : 60}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								tick={{ fontSize: 12 }}
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<Tooltip
								formatter={(value, name) => [formatCurrency(value), name]}
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
							<Bar
								dataKey="google_ads_spend"
								fill="#f59e0b"
								name="Google Ads"
								radius={[4, 4, 0, 0]}
								animationDuration={1000}
								onMouseEnter={(data, index) => {
									// Enhanced hover effect
								}}
							/>
							<Bar
								dataKey="facebook_ads_spend"
								fill="#3b82f6"
								name="Facebook Ads"
								radius={[4, 4, 0, 0]}
								animationDuration={1000}
								onMouseEnter={(data, index) => {
									// Enhanced hover effect
								}}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
				{/* Ad Spend Distribution Pie Chart */}
				<div className="card">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Profit Trend Analysis</h3>
						<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
							📈 {summary?.totalProfit >= 0 ? 'Profitable' : 'Loss'} Period
						</div>
					</div>
					<ResponsiveContainer width="100%" height={300}>
						<AreaChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis
								dataKey="date"
								tickFormatter={(value) => formatChartDate(value, chartData.length)}
								angle={chartData.length > 20 ? -45 : 0}
								textAnchor={chartData.length > 20 ? "end" : "middle"}
								height={chartData.length > 20 ? 80 : 60}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								tick={{ fontSize: 12 }}
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<Tooltip
								formatter={(value, name) => [formatCurrency(value), name]}
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
								tickFormatter={(value) => formatChartDate(value, chartData.length)}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
				<div className="card">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Ad Spend Distribution</h3>
						<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
							💰 Total: {formatCurrency((summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0))}
						</div>
					</div>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={[
									{
										name: 'Facebook Ads',
										value: summary?.totalFacebookAds || 0,
										color: '#3b82f6'
									},
									{
										name: 'Google Ads',
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
									{ name: 'Facebook Ads', value: summary?.totalFacebookAds || 0, color: '#3b82f6' },
									{ name: 'Google Ads', value: summary?.totalGoogleAds || 0, color: '#f59e0b' }
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
								formatter={(value) => formatCurrency(value)}
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
										<span className="font-semibold text-blue-900">{formatCurrency(summary?.totalRevenue || 0)}</span>
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
											{formatCurrency(summary?.totalProfit || 0)}
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
									<span className="font-semibold text-orange-900">{formatCurrency(summary?.totalGoogleAds || 0)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-orange-700">Facebook Ads</span>
									<span className="font-semibold text-orange-900">{formatCurrency(summary?.totalFacebookAds || 0)}</span>
								</div>
								<div className="flex justify-between border-t border-orange-200 pt-2">
									<span className="text-orange-700 font-medium">Total Ad Spend</span>
									<span className="font-semibold text-orange-900">
										{formatCurrency((summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0))}
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
									<span className="font-semibold text-purple-900">{formatCurrency(summary?.totalCostOfGoods || 0)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-purple-700">Ad Spend</span>
									<span className="font-semibold text-purple-900">
										{formatCurrency((summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0))}
									</span>
								</div>
								<div className="flex justify-between border-t border-purple-200 pt-2">
									<span className="text-purple-700 font-medium">Total Costs</span>
									<span className="font-semibold text-purple-900">
										{formatCurrency((summary?.totalCostOfGoods || 0) + (summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0))}
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
										{((summary?.totalRevenue || 0) / ((summary?.totalGoogleAds || 0) + (summary?.totalFacebookAds || 0)) || 0).toFixed(2)}x
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-green-700">Avg Daily Revenue</span>
									<span className="font-semibold text-green-900">
										{formatCurrency((summary?.totalRevenue || 0) / (analytics?.length || 1))}
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
									placeholder="Select"
									className="w-20"
									size="sm"
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
										onClick={() => handleSort('facebook_ads_spend')}
									>
										<div className="flex items-center gap-2">
											Facebook Ads
											{getSortIcon('facebook_ads_spend')}
										</div>
									</th>
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
										<td className="py-3 px-4 font-medium">{formatCurrency(day.revenue)}</td>
										<td className="py-3 px-4">{formatCurrency(day.google_ads_spend)}</td>
										<td className="py-3 px-4">{formatCurrency(day.facebook_ads_spend)}</td>
										<td className="py-3 px-4">{formatCurrency(day.cost_of_goods)}</td>
										<td className={`py-3 px-4 font-medium ${day.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
											{formatCurrency(day.profit)}
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
									placeholder="Select"
									className="w-20"
									size="sm"
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

					{/* Custom Calendar Components */}
					<CustomCalendar
						isOpen={showStartCalendar}
						onClose={() => setShowStartCalendar(false)}
						onDateSelect={(date) => {
							setDateRange(prev => ({ ...prev, startDate: date }));
						}}
						selectedDate={dateRange.startDate}
						label="Select Start Date"
					/>

					<CustomCalendar
						isOpen={showEndCalendar}
						onClose={() => setShowEndCalendar(false)}
						onDateSelect={(date) => {
							setDateRange(prev => ({ ...prev, endDate: date }));
						}}
						selectedDate={dateRange.endDate}
						label="Select End Date"
					/>

					<CustomCalendar
						isOpen={showSyncCalendar}
						onClose={() => setShowSyncCalendar(false)}
						onDateSelect={(date) => {
							setSyncDate(date);
						}}
						selectedDate={syncDate}
						label="Select Sync Date"
					/>
				</div>
			</div>



			{/* Sync Orders Modal */}
			{showSyncModal && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
					onClick={closeSyncModal}
				>
					<div
						className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl sync-modal"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Sync Orders</h3>
							<button
								onClick={closeSyncModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
								disabled={syncing}
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="mb-6">
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
							<button
								onClick={() => setShowSyncCalendar(true)}
								className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
								disabled={syncing}
							>
								<span>{syncDate || 'Select sync date'}</span>
								<svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</button>
						</div>



						<div className="flex gap-3">
							<button
								onClick={closeSyncModal}
								className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex-1"
								disabled={syncing}
							>
								Cancel
							</button>
							<button
								onClick={syncOrders}
								className="btn-primary flex-1 flex items-center justify-center gap-2"
								disabled={syncing || !syncDate}
							>
								{syncing ? (
									<RefreshCw className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								{syncing ? 'Syncing...' : 'Start Sync'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Recalculate Analytics Modal */}
			{showRecalcModal && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
					onClick={closeRecalcModal}
				>
					<div
						className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl recalc-modal"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Recalculate Analytics</h3>
							<button
								onClick={closeRecalcModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
								disabled={syncing}
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="mb-6">
							<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
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
							<button
								onClick={() => setShowRecalcCalendar(true)}
								className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between"
								disabled={syncing}
							>
								<span>{recalcDate || 'Select recalculation date'}</span>
								<svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</button>
						</div>

						<div className="flex gap-3">
							<button
								onClick={closeRecalcModal}
								className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex-1"
								disabled={syncing}
							>
								Cancel
							</button>
							<button
								onClick={recalculateAnalytics}
								className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex-1 flex items-center justify-center gap-2"
								disabled={syncing || !recalcDate}
							>
								{syncing ? (
									<RefreshCw className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								{syncing ? 'Recalculating...' : 'Start Recalculation'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Custom Calendar for Recalculate */}
			<CustomCalendar
				isOpen={showRecalcCalendar}
				onClose={() => setShowRecalcCalendar(false)}
				onDateSelect={(date) => {
					setRecalcDate(date);
				}}
				selectedDate={recalcDate}
				label="Select Recalculation Date"
			/>

			{/* Additional Interactive Charts */}
		</div>
	);
};

export default Dashboard; 