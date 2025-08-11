import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TrendingUp, DollarSign, BarChart3, Calendar, RefreshCw, Grid, BarChart, Download, Filter, Search } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';

const ProductTrendsChart = () => {
	const { selectedStore } = useStore();
	const [productData, setProductData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
	const [metric, setMetric] = useState('revenue'); // 'revenue', 'orders', 'profit'
	const [timeframe, setTimeframe] = useState('month'); // 'month', 'quarter'
	const [startYear, setStartYear] = useState(new Date().getFullYear());
	const [endYear, setEndYear] = useState(new Date().getFullYear());
	const [startMonth, setStartMonth] = useState(1);
	const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
	const [searchTerm, setSearchTerm] = useState('');
	
	// Sync modal state
	const [showSyncModal, setShowSyncModal] = useState(false);
	const [syncLoading, setSyncLoading] = useState(false);
	const [syncSuccess, setSyncSuccess] = useState(false);
	const [syncModalStartYear, setSyncModalStartYear] = useState(new Date().getFullYear());
	const [syncModalEndYear, setSyncModalEndYear] = useState(new Date().getFullYear());
	const [syncModalStartMonth, setSyncModalStartMonth] = useState(1);
	const [syncModalEndMonth, setSyncModalEndMonth] = useState(12);

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
	const getMonthRangeDisplay = () => {
		if (startMonth === endMonth && startYear === endYear) {
			return `${monthOptions.find(m => m.value === startMonth)?.label} ${startYear}`;
		}
		const startLabel = monthOptions.find(m => m.value === startMonth)?.label;
		const endLabel = monthOptions.find(m => m.value === endMonth)?.label;
		return `${startLabel} ${startYear} - ${endLabel} ${endYear}`;
	};

	// Get month range for API
	const getMonthRangeForAPI = () => {
		const months = [];
		let currentYear = startYear;
		let currentMonth = startMonth;
		
		while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
			months.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
			
			currentMonth++;
			if (currentMonth > 12) {
				currentMonth = 1;
				currentYear++;
			}
		}
		
		return months;
	};

	// Fetch individual product analytics
	const fetchProductAnalytics = useCallback(async () => {
		if (!startYear || !startMonth || !endYear || !endMonth) return;

		setLoading(true);
		setError(null);

		try {
			const monthRange = getMonthRangeForAPI();
			console.log('🔍 Fetching individual product analytics for:', selectedStore);
			console.log('📅 Date range:', monthRange[0], 'to', monthRange[monthRange.length - 1]);
			
			const response = await axios.get('/api/analytics/product-cohort-analytics', {
				params: {
					storeId: selectedStore || 'buycosari',
					startDate: monthRange[0],
					endDate: monthRange[monthRange.length - 1],
					metric: metric,
					timeframe: timeframe
				}
			});

			console.log('📊 Individual product analytics data received:', response.data);
			
			if (response.data.success && response.data.data) {
				setProductData(response.data.data);
			} else {
				setError(response.data.message || 'Failed to fetch product analytics data');
			}
		} catch (err) {
			console.error('❌ Error fetching product analytics:', err);
			if (err.response) {
				setError(`Server error: ${err.response.data?.error || err.response.statusText || 'Unknown error'}`);
			} else if (err.request) {
				setError('No response from server. Please check your connection.');
			} else {
				setError(`Error: ${err.message || 'Failed to fetch product analytics data'}`);
			}
		} finally {
			setLoading(false);
		}
	}, [selectedStore, startYear, startMonth, endYear, endMonth, metric, timeframe]);

	// Format currency for display
	const formatCurrency = (value) => {
		if (value === null || value === undefined) return '$0.00';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value);
	};

	// Format number for display
	const formatNumber = (value) => {
		if (value === null || value === undefined) return '0';
		return new Intl.NumberFormat('en-US').format(Math.round(value));
	};

	// Format month-year for display
	const formatMonthYear = (monthYear) => {
		if (monthYear === 'Average') return 'Average';
		const [year, month] = monthYear.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	};

	// Get metric display value
	const getMetricValue = (product, monthKey) => {
		const value = product[monthKey];
		if (metric === 'revenue' || metric === 'profit') {
			return formatCurrency(value);
		} else {
			return formatNumber(value);
		}
	};

	// Get metric label
	const getMetricLabel = () => {
		switch (metric) {
			case 'revenue':
				return 'Individual Product Revenue Performance';
			case 'orders':
				return 'Individual Product Orders Performance';
			case 'profit':
				return 'Individual Product Profit Performance';
			default:
				return 'Individual Product Revenue Performance';
		}
	};

	// Handle metric change
	const handleMetricChange = (newMetric) => {
		setMetric(newMetric);
	};

	// Handle timeframe change
	const handleTimeframeChange = (newTimeframe) => {
		setTimeframe(newTimeframe);
	};

	// Handle month range changes
	const handleStartMonthChange = (month) => {
		const newStartMonth = parseInt(month);
		setStartMonth(newStartMonth);
		
		if (startYear === endYear && endMonth < newStartMonth) {
			setEndMonth(newStartMonth);
		}
	};

	const handleEndMonthChange = (month) => {
		const newEndMonth = parseInt(month);
		setEndMonth(newEndMonth);
		
		if (startYear === endYear && startMonth > newEndMonth) {
			setStartMonth(newEndMonth);
		}
	};

	const handleStartYearChange = (year) => {
		const newStartYear = parseInt(year);
		setStartYear(newStartYear);
		
		if (newStartYear > endYear) {
			setEndYear(newStartYear);
		}
	};

	const handleEndYearChange = (year) => {
		const newEndYear = parseInt(year);
		setEndYear(newEndYear);
		
		if (newEndYear < startYear) {
			setStartYear(newEndYear);
		}
	};

	// Filter products based on search term
	const getFilteredProducts = () => {
		if (!searchTerm.trim()) return productData;
		return productData.filter(product => 
			product.productSku.toLowerCase().includes(searchTerm.toLowerCase())
		);
	};

	// Sync product trends function
	const handleSyncProductTrends = async () => {
		if (!syncModalStartYear || !syncModalStartMonth || !syncModalEndYear || !syncModalEndMonth) {
			setError('Please select a valid date range');
			return;
		}

		if (syncModalStartYear > syncModalEndYear || 
			(syncModalStartYear === syncModalEndYear && syncModalStartMonth > syncModalEndMonth)) {
			setError('Start date must be before end date');
			return;
		}

		setSyncLoading(true);
		setError(null);
		setSyncSuccess(false);

		try {
			const startDate = `${syncModalStartYear}-${syncModalStartMonth.toString().padStart(2, '0')}`;
			const endDate = `${syncModalEndYear}-${syncModalEndMonth.toString().padStart(2, '0')}`;

			console.log('🔄 Syncing product trends for date range:', startDate, 'to', endDate);
			
			const response = await axios.post('/api/analytics/recalculate-product-trends', {
				startDate,
				endDate,
				storeId: selectedStore || 'buycosari'
			});

			if (response.data.success) {
				console.log('✅ Product trends sync completed successfully');
				setShowSyncModal(false);
				setSyncSuccess(true);
				await fetchProductAnalytics();
			} else {
				setError(response.data.message || 'Failed to sync product trends');
			}
		} catch (err) {
			console.error('❌ Error syncing product trends:', err);
			if (err.response) {
				setError(`Server error: ${err.response.data?.error || err.response.statusText || 'Unknown error'}`);
			} else if (err.request) {
				setError('No response from server. Please check your connection.');
			} else {
				setError(`Error: ${err.message || 'Failed to sync product trends'}`);
			}
		} finally {
			setSyncLoading(false);
		}
	};

	// Get month range display for sync modal
	const getSyncModalMonthRangeDisplay = () => {
		if (syncModalStartMonth === syncModalEndMonth && syncModalStartYear === syncModalEndYear) {
			return `${monthOptions.find(m => m.value === syncModalStartMonth)?.label} ${syncModalStartYear}`;
		}
		const startLabel = monthOptions.find(m => m.value === syncModalStartMonth)?.label;
		const endLabel = monthOptions.find(m => m.value === syncModalEndMonth)?.label;
		return `${startLabel} ${syncModalStartYear} - ${endLabel} ${syncModalEndYear}`;
	};

	// Get the actual number of months in the selected date range
	const getSelectedMonthCount = () => {
		const monthRange = getMonthRangeForAPI();
		return monthRange.length;
	};

	// Load data on component mount and when dependencies change
	useEffect(() => {
		fetchProductAnalytics();
	}, [fetchProductAnalytics]);

	// Auto-hide success message after 5 seconds
	useEffect(() => {
		if (syncSuccess) {
			const timer = setTimeout(() => {
				setSyncSuccess(false);
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [syncSuccess]);

	if (loading && productData.length === 0) {
		return (
			<div className="animate-pulse">
				<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
				<div className="h-80 bg-gray-200 rounded mb-4"></div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[...Array(8)].map((_, i) => (
						<div key={i} className="h-10 bg-gray-200 rounded"></div>
					))}
				</div>
			</div>
		);
	}

	const filteredProducts = getFilteredProducts();

	return (
		<div className="p-8 space-y-6">
			{/* Global Sync Status */}
			{syncLoading && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center gap-3">
						<RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
						<div>
							<h4 className="text-sm font-medium text-blue-900">Syncing Product Trends</h4>
							<p className="text-sm text-blue-700">
								Recalculating trends for {getSyncModalMonthRangeDisplay()}. This may take a few minutes...
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Sync Success Message */}
			{syncSuccess && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<div className="flex items-center gap-3">
						<div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
							<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
							</svg>
						</div>
						<div>
							<h4 className="text-sm font-medium text-green-900">Sync Completed Successfully!</h4>
							<p className="text-sm text-green-700">
								Product trends have been recalculated and updated.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-blue-100 rounded-lg">
						<TrendingUp className="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Product Performance Analytics</h2>
						<p className="text-gray-600">{getMetricLabel()} for {getMonthRangeDisplay()}</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Sync Product Trends Button */}
					<button
						onClick={() => setShowSyncModal(true)}
						disabled={loading}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
						title="Sync product trends"
					>
						<RefreshCw className="w-4 h-4" />
						Sync Trends
					</button>
					
					{/* Refresh Button */}
					<button
						onClick={fetchProductAnalytics}
						disabled={loading}
						className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
						title="Refresh data"
					>
						<RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
					</button>
				</div>
			</div>

			{/* Controls */}
			<div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
				{/* Metric Selection */}
				<div className="flex items-center gap-2">
					<label className="text-sm font-medium text-gray-700">Metric:</label>
					<div className="flex rounded-lg border border-gray-300 overflow-hidden">
						<button
							onClick={() => handleMetricChange('revenue')}
							className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
								metric === 'revenue' 
									? 'bg-blue-600 text-white' 
									: 'bg-white text-gray-700 hover:bg-gray-50'
							}`}
						>
							<DollarSign className="w-4 h-4 inline mr-1" />
							Revenue
						</button>
						<button
							onClick={() => handleMetricChange('orders')}
							className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
								metric === 'orders' 
									? 'bg-green-600 text-white' 
									: 'bg-white text-gray-700 hover:bg-gray-50'
							}`}
						>
							<BarChart3 className="w-4 h-4 inline mr-1" />
							Orders
						</button>
						<button
							onClick={() => handleMetricChange('profit')}
							className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
								metric === 'profit' 
									? 'bg-purple-600 text-white' 
									: 'bg-white text-gray-700 hover:bg-gray-50'
							}`}
						>
							<TrendingUp className="w-4 h-4 inline mr-1" />
							Profit
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
							value={startYear}
							onChange={handleStartYearChange}
							options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
							placeholder="Select year"
							size="sm"
							style={{height: 36}}
							className="min-w-[80px]"
						/>

						<BeautifulSelect
							value={startMonth}
							onChange={handleStartMonthChange}
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
							value={endYear}
							onChange={handleEndYearChange}
							options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
							placeholder="Select year"
							size="sm"
							style={{height: 36}}
							className="min-w-[80px]"
						/>

						<BeautifulSelect
							value={endMonth}
							onChange={handleEndMonthChange}
							options={monthOptions}
							placeholder="Select month"
							size="sm"
							style={{height: 36}}
							className="min-w-[120px]"
						/>
					</div>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			{/* Product Analytics Table */}
			{productData.length > 0 ? (
				<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
					{/* Table Header */}
					<div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
						<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">
								{getMetricLabel()} - {getMonthRangeDisplay()}
						</h3>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setViewMode('table')}
									className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
								>
									<Grid className="w-4 h-4" />
								</button>
								<button
									onClick={() => setViewMode('chart')}
									className={`p-2 rounded ${viewMode === 'chart' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
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
								placeholder="Search product SKUs..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
										MONTHS SINCE FIRST APPEARANCE
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										
									</th>
									{/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										GROWTH
									</th> */}
								</tr>
								<tr>
									<th className='font-medium text-gray-500 uppercase text-xs'>PRODUCT SKU</th>
									<th className='font-medium text-gray-500 uppercase text-xs'>FIRST APPEARANCE</th>
									<th className='font-medium text-gray-500 uppercase text-xs'>FIRST MONTH</th>
									<th className='font-medium text-gray-500 uppercase text-xs'>CAC</th>
									<th className='font-medium text-gray-500 uppercase text-xs'>R-%</th>
									<th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										<div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getSelectedMonthCount()}, minmax(0, 1fr))` }}>
											{Array.from({ length: getSelectedMonthCount() }, (_, i) => {
												const monthDate = new Date(startYear, startMonth - 1 + i, 1);
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
								{filteredProducts.map((product, index) => (
									<tr key={product.productSku} className="hover:bg-gray-50">
										<td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 max-w-[140px] truncate" title={product.productSku}>
											{product.productSku}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
											{product.firstAppearanceDisplay}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
											{getMetricValue(product, 'month0')}
										</td>
										
										{/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
											{product.growthRate !== 0 ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${
													product.growthRate > 0 
														? 'bg-green-100 text-green-800' 
														: 'bg-red-100 text-red-800'
												}`}>
													{product.growthRate > 0 ? '+' : ''}{product.growthRate.toFixed(1)}%
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td> */}
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center text-center">
											{product.cac > 0 ? formatCurrency(product.cac) : '-'}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
											{product.retentionRate > 0 ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${
													product.retentionRate >= 80 
														? 'bg-green-100 text-green-800' 
														: product.retentionRate >= 60
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-red-100 text-red-800'
												}`}>
													{product.retentionRate.toFixed(1)}%
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-4 py-4">
											<div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${getSelectedMonthCount()}, minmax(0, 1fr))` }}>
												{Array.from({ length: getSelectedMonthCount() }, (_, i) => {
													const monthKey = `month${i}`;
													const value = product[monthKey];
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
															{isAvailable ? getMetricValue(product, monthKey) : 'N/A'}
														</div>
													);
												})}
											</div>
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
											{getMetricValue(product, 'totalValue')}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Results Summary */}
					<div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
						<div className="text-sm text-gray-600">
							Showing {filteredProducts.length} of {productData.length} products
							{searchTerm && ` matching "${searchTerm}"`}
						</div>
					</div>
				</div>
			) : (
				<div className="text-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="text-gray-400 mb-4">
						<BarChart3 className="mx-auto h-12 w-12" />
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">No Product Data Available</h3>
					<p className="text-gray-500">
						No product analytics found for {getMonthRangeDisplay()}.
					</p>
				</div>
			)}

			{/* Sync Product Trends Modal */}
			{showSyncModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Sync Product Trends</h3>
							<button
								onClick={() => setShowSyncModal(false)}
								className="text-gray-400 hover:text-gray-600 transition-colors p-1"
							>
								<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="space-y-4">
							<p className="text-sm text-gray-600">
								Select the year and month range to recalculate product trends data.
							</p>

							{/* Date Range Selection */}
							<div className="space-y-4">
								{/* From Date */}
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700 block">From:</span>
									<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
										<BeautifulSelect
											value={syncModalStartYear}
											onChange={setSyncModalStartYear}
											options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
											placeholder="Year"
											size="sm"
											className="flex-1 min-w-0"
										/>
										<BeautifulSelect
											value={syncModalStartMonth}
											onChange={setSyncModalStartMonth}
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
											value={syncModalEndYear}
											onChange={setSyncModalEndYear}
											options={yearOptions.map(year => ({ value: year, label: year.toString() }))}
											placeholder="Year"
											size="sm"
											className="flex-1 min-w-0"
										/>
										<BeautifulSelect
											value={syncModalEndMonth}
											onChange={setSyncModalEndMonth}
											options={monthOptions}
											placeholder="Month"
											size="sm"
											className="flex-1 min-w-0"
										/>
									</div>
											</div>

								{/* Selected Range Display */}
								<div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full w-full sm:w-auto justify-center sm:justify-start">
									<Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
									<span className="text-sm font-semibold text-blue-900 text-center sm:text-left">
										{getSyncModalMonthRangeDisplay()}
									</span>
									</div>
								</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<button
									onClick={() => setShowSyncModal(false)}
									disabled={syncLoading}
									className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
								>
									Cancel
								</button>
								<button
									onClick={handleSyncProductTrends}
									disabled={syncLoading}
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
								>
									{syncLoading ? (
										<>
											<RefreshCw className="w-4 h-4 animate-spin" />
											Syncing...
										</>
									) : (
										<>
											<RefreshCw className="w-4 h-4" />
											Sync Trends
										</>
									)}
								</button>
								</div>
							</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductTrendsChart;
