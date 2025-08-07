import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Search, Filter } from 'lucide-react';
import axios from 'axios';
import BeautifulSelect from './BeautifulSelect';
import OrdersLoader from './loaders/OrdersLoader';

const Orders = () => {
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

	useEffect(() => {
		fetchOrders();
		fetchOverallStats();
	}, []);

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
				page: page.toString()
			});

			// Add search parameter if provided
			if (searchTerm.trim()) {
				params.append('search', searchTerm.trim());
			}

			// Add status filter if not 'all'
			if (statusFilter !== 'all') {
				params.append('status', statusFilter);
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
			const response = await axios.get('/api/shopify/stats');
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
                className="w-40"
                size="md"
              />
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
		</div>
	);
};

export default Orders; 