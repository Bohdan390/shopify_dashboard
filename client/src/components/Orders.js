import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Search, Filter, Calendar } from 'lucide-react';
import axios from 'axios';
import BeautifulSelect from './BeautifulSelect';
import OrdersLoader from './loaders/OrdersLoader';
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
		return date.toDateString() === today.toDateString();
	};

	const isSelected = (date) => {
		return selectedDateState && date.toDateString() === selectedDateState.toDateString();
	};

	const handleDateClick = (date) => {
		setSelectedDateState(date);
		onDateSelect(formatDate(date));
		onClose();
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
		setCurrentMonth(new Date(currentMonth.getFullYear(), month, 1));
		setShowMonthSelector(false);
	};

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 calendar-modal">
			<div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
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

				{/* Month/Year Navigation */}
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<button
							onClick={goToPreviousYear}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
							</svg>
						</button>
						<button
							onClick={goToPreviousMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<div className="relative month-selector">
							<button
								onClick={() => setShowMonthSelector(!showMonthSelector)}
								className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
							>
								{monthNames[currentMonth.getMonth()]}
							</button>
							{showMonthSelector && (
								<div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
									{monthNames.map((month, index) => (
										<button
											key={month}
											onClick={() => selectMonth(index)}
											className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
										>
											{month}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="relative year-selector">
							<button
								onClick={() => setShowYearSelector(!showYearSelector)}
								className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
							>
								{currentMonth.getFullYear()}
							</button>
							{showYearSelector && (
								<div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[80px] max-h-48 overflow-y-auto">
									{Array.from({ length: 10 }, (_, i) => currentMonth.getFullYear() - 5 + i).map((year) => (
										<button
											key={year}
											onClick={() => selectYear(year)}
											className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
										>
											{year}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={goToNextMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
						<button
							onClick={goToNextYear}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				</div>

				{/* Calendar Grid */}
				<div className="grid grid-cols-7 gap-1">
					{dayNames.map((day) => (
						<div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
							{day}
						</div>
					))}
					{getDaysInMonth(currentMonth).map((date, index) => (
						<button
							key={index}
							onClick={() => date && handleDateClick(date)}
							disabled={!date}
							className={`p-2 text-sm rounded-lg transition-colors ${
								!date
									? 'invisible'
									: isToday(date)
									? 'bg-blue-100 text-blue-700 font-semibold'
									: isSelected(date)
									? 'bg-primary-600 text-white'
									: 'hover:bg-gray-100 text-gray-700'
							}`}
						>
							{date ? date.getDate() : ''}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};

const Orders = () => {
	const { selectedStore } = useStore();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [pageSize, setPageSize] = useState(10);
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

	// Date range state
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		const formatLocalDate = (date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
	});

	// Calendar states
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);

	useEffect(() => {
		fetchOrders();
		fetchOverallStats();
	}, [selectedStore]);

	// Only search when status filter changes (not when typing)
	useEffect(() => {
		setSearchLoading(true);
		fetchOrders(1).finally(() => setSearchLoading(false));
	}, [statusFilter]);

	// Reset to page 1 when page size changes
	useEffect(() => {
		fetchOrders(1);
	}, [pageSize]);

	const fetchOrders = async (page = 1) => {
		try {
			setLoading(true);
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

			// Add sort parameters
			params.append('sortBy', sortConfig.key);
			params.append('sortDirection', sortConfig.direction);

			const response = await axios.get(`/api/shopify/orders?${params.toString()}`);
			setOrders(response.data.orders);
			setPagination(response.data.pagination);
		} catch (error) {
			console.error('Error fetching orders:', error);
		} finally {
			setLoading(false);
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
		}
	};

	const handleSearch = () => {
		setSearchLoading(true);
		fetchOrders(1).finally(() => setSearchLoading(false));
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	// Date range handlers
	const handleDateRangeChange = async () => {
		if (dateRange.startDate && dateRange.endDate) {
			try {
				setSearchLoading(true);
				await fetchOrders(1);
				await fetchOverallStats();
			} catch (error) {
				console.error('Error fetching orders with date range:', error);
			} finally {
				setSearchLoading(false);
			}
		} else {
			console.log('Please select both start and end dates');
		}
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
		
		// Fetch orders with new sort configuration using the updated config
		const fetchWithNewSort = async () => {
			try {
				setLoading(true);
				const params = new URLSearchParams({
					limit: pageSize.toString(),
					page: '1'
				});

				// Add search parameter if provided
				if (searchTerm.trim()) {
					params.append('search', searchTerm.trim());
				}

				// Add status filter if not 'all'
				if (statusFilter !== 'all') {
					params.append('status', statusFilter);
				}

				// Add sort parameters with the new configuration
				params.append('sortBy', newSortConfig.key);
				params.append('sortDirection', newSortConfig.direction);

				const response = await axios.get(`/api/shopify/orders?${params.toString()}`);
				setOrders(response.data.orders);
				setPagination(response.data.pagination);
			} catch (error) {
				console.error('Error fetching orders:', error);
			} finally {
				setLoading(false);
			}
		};
		
		fetchWithNewSort();
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
							disabled={searchLoading}
							className="w-24"
							size="sm"
						/>
						<span className="text-sm text-gray-500">per page</span>
					</div>
					<button
						onClick={() => fetchOrders(1)}
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
						onClick={() => fetchOrders(pagination.currentPage - 1)}
						disabled={!pagination.hasPrev}
						className={`px-3 py-1 text-sm rounded-md ${pagination.hasPrev
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
										onClick={() => fetchOrders(page)}
										className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
											? 'bg-primary-600 text-white'
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
						onClick={() => fetchOrders(pagination.currentPage + 1)}
						disabled={!pagination.hasNext}
						className={`px-3 py-1 text-sm rounded-md ${pagination.hasNext
							? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							: 'bg-gray-50 text-gray-400 cursor-not-allowed'
							}`}
					>
						Next
					</button>

					{/* Last page button */}
					<button
						onClick={() => fetchOrders(pagination.totalPages)}
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
		);
	};



	if (loading) {
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
						fetchOrders(1);
						fetchOverallStats();
					}}
					className="btn-primary flex items-center gap-2"
				>
					<ShoppingCart className="w-4 h-4" />
					Refresh Orders
				</button>
			</div>

			{/* Filters */}
			<div className="card mb-6">
				<div className="flex flex-col gap-4">
					{/* Search and Status Filters */}
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
									disabled={searchLoading}
								/>
								<button
									onClick={handleSearch}
									disabled={searchLoading}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-3 py-1 rounded-md text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Search
								</button>
								{searchLoading && (
									<div className="absolute right-16 top-1/2 transform -translate-y-1/2">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
									</div>
								)}
							</div>
						</div>
						<div className="flex gap-4">
							<BeautifulSelect
								value={statusFilter}
								onChange={setStatusFilter}
								options={[
									{ value: 'all', label: 'All Status' },
									{ value: 'paid', label: 'Paid' },
									{ value: 'pending', label: 'Pending' },
									{ value: 'refunded', label: 'Refunded' }
								]}
								placeholder="Select status"
								disabled={searchLoading}
								style={{ height: '42px' }}								
								className="w-40"
								size="md"
							/>
						</div>
					</div>

					{/* Date Range Filters */}
					<div className="flex flex-col md:flex-row gap-2 items-end">
						{/* Custom Date Range */}
						<div className="flex flex-col md:flex-row gap-2 flex-1">
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
							<button
								onClick={handleDateRangeChange}
								disabled={searchLoading || !dateRange.startDate || !dateRange.endDate}
								className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm self-end"
							>
								Apply Date Range
							</button>
						</div>

						{/* Date Range Display */}
						{(dateRange.startDate || dateRange.endDate) && (
							<div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
								Selected: {dateRange.startDate || 'Not set'} to {dateRange.endDate || 'Not set'}
							</div>
						)}
					</div>
				</div>
			</div>


			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
				<div className="stat-card">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Orders</p>
							<p className="text-2xl font-bold text-gray-900">{overallStats.totalOrders}</p>
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
								{overallStats.paidOrders}
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
								{formatCurrency(overallStats.totalRevenue)}
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
								{formatCurrency(overallStats.avgOrderValue)}
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

				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 bg-gray-50">
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('order_number')}
								>
									<div className="flex items-center gap-2">
										Order #
										{getSortIcon('order_number')}
									</div>
								</th>
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('customer_email')}
								>
									<div className="flex items-center gap-2">
										Customer
										{getSortIcon('customer_email')}
									</div>
								</th>
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('total_price')}
								>
									<div className="flex items-center gap-2">
										Amount
										{getSortIcon('total_price')}
									</div>
								</th>
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('financial_status')}
								>
									<div className="flex items-center gap-2">
										Status
										{getSortIcon('financial_status')}
									</div>
								</th>
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('fulfillment_status')}
								>
									<div className="flex items-center gap-2">
										Fulfillment
										{getSortIcon('fulfillment_status')}
									</div>
								</th>
								<th
									className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
									onClick={() => handleSort('created_at')}
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
										<span className="font-medium text-gray-900">{formatCurrency(order.total_price)}</span>
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