import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Calendar, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import BeautifulSelect from './BeautifulSelect';
import OrdersLoader from './loaders/OrdersLoader';
import OrdersTableLoader from './loaders/OrdersTableLoader';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';

// Custom Calendar Component (reused from Dashboard)
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
				  ${date && isToday(date) ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
				  ${date && isSelected(date) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
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

	// Only search when status filter changes (not when typing)
	useEffect(() => {
		setSearchLoading(true);
		fetchOrders(1, false, true).finally(() => setSearchLoading(false));
	}, [statusFilter]);

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

			// Add date range parameters if both dates are selected
			if (dateRange.startDate && dateRange.endDate) {
				params.append('startDate', dateRange.startDate);
				params.append('endDate', dateRange.endDate);
			}

			// Add sort parameters (use custom sort config if provided, otherwise use current sortConfig)
			const sortToUse = customSortConfig || sortConfig;
			params.append('sortBy', sortToUse.key);
			params.append('sortDirection', sortToUse.direction);

			const response = await axios.get(`/api/shopify/orders?${params.toString()}`);
			setOrders(response.data.orders);
			setPagination(response.data.pagination);
			
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

			const response = await axios.get(`/api/shopify/stats?${params.toString()}`);
			setOverallStats(response.data);
		} catch (error) {
			console.error('Error fetching overall stats:', error);
			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to fetch order statistics', 'error');
			}
		}
	};

	const handleSearch = () => {
		if (!searchTerm.trim()) {
			if (window.showPrimeToast) {
				window.showPrimeToast('Please enter a search term', 'warning');
			}
			return;
		}
		
		setSearchLoading(true);
		fetchOrders(1, false, true).finally(() => setSearchLoading(false));
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
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
							<React.Fragment key={index}>
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
							</React.Fragment>
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
				<button
					onClick={() => {
						fetchOrders(1, true);
						fetchOverallStats();
					}}
					disabled={refreshing}
					className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{refreshing ? (
						<LoadingSpinner size="sm" variant="spinner" />
					) : (
						<RefreshCw className="w-4 h-4" />
					)}
					{refreshing ? 'Refreshing...' : 'Refresh Orders'}
				</button>
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
								<button
									onClick={() => setShowStartCalendar(true)}
									disabled={tableLoading}
									className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
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
									disabled={tableLoading}
									className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span>{dateRange.endDate || 'Select end date'}</span>
									<Calendar className="w-4 h-4 text-gray-400 ml-2" />
								</button>
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
								<button
									onClick={handleSearch}
									disabled={searchLoading || tableLoading}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-3 py-1 rounded-md text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{searchLoading ? (
										<LoadingSpinner size="xs" variant="spinner" />
									) : (
										<Search className="w-3 h-3" />
									)}
									{searchLoading ? 'Searching...' : 'Search'}
								</button>
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
								style={{ height: '42px' }}								
								className="w-40"
								size="md"
							/>
						</div>
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
										onClick={!tableLoading ? () => handleSort('order_number') : undefined}
									>
										<div className="flex items-center gap-2">
											Order #
											{getSortIcon('order_number')}
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
									<tr key={order.order_number} className="border-b border-gray-100 hover:bg-gray-50">
										<td className="py-3 px-4">
											<span className="font-medium text-gray-900">{order.order_number}</span>
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
											<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${order.fulfillment_status === 'fulfilled'
												? 'bg-success-100 text-success-800'
												: 'bg-gray-100 text-gray-800'
												}`}>
												{order.fulfillment_status || 'unfulfilled'}
											</span>
										</td>
										<td className="py-3 px-4 text-sm text-gray-600">
											{formatDate(order.created_at)}
										</td>
									</tr>
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

			{/* Summary Stats */}

			{/* Calendar Components */}
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
		</div>
	);
};

export default Orders; 