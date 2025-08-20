import React, { useState, useEffect } from 'react';
import api from "../config/axios"
import BeautifulSelect from './BeautifulSelect';

const ProductGroups = ({ selectedStore, dateRange }) => {
	const [productGroups, setProductGroups] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [autoGroupLoading, setAutoGroupLoading] = useState(false);
	const [sortBy, setSortBy] = useState('revenue');
	const [sortOrder, setSortOrder] = useState('desc');

	// Fetch product groups analytics
	const fetchProductGroups = async () => {
		if (!dateRange?.startDate || !dateRange?.endDate) return;

		setLoading(true);
		setError(null);

		try {
			const response = await api.get('/api/product-groups/analytics', {
				params: {
					storeId: selectedStore,
					startDate: dateRange.startDate,
					endDate: dateRange.endDate
				}
			});

			setProductGroups(response.data);
		} catch (err) {
			console.error('❌ Error fetching product groups:', err);
			setError('Failed to fetch product groups data');
		} finally {
			setLoading(false);
		}
	};

	// Auto-group products
	const handleAutoGroup = async () => {
		setAutoGroupLoading(true);
		setError(null);
		try {
			const response = await api.post('/api/product-groups/auto-group', {
				storeId: selectedStore
			});
			
			// Set the doNotGroup data directly
			if (response.data.groups) {
				setProductGroups(response.data.groups);
			}
		} catch (err) {
			console.error('❌ Error auto-grouping products:', err);
			setError('Failed to auto-group products');
		} finally {
			setAutoGroupLoading(false);
		}
	};

	// Sort product groups
	const getSortedProductGroups = () => {
		if (!productGroups.length) return [];

		return [...productGroups].sort((a, b) => {
			let aValue, bValue;

			switch (sortBy) {
				case 'revenue':
					aValue = a.revenue || 0;
					bValue = b.revenue || 0;
					break;
				case 'orders':
					aValue = a.orderCount || 0;
					bValue = b.orderCount || 0;
					break;
				case 'sku':
					aValue = (a.sku || '').toLowerCase();
					bValue = (b.sku || '').toLowerCase();
					break;
				default:
					aValue = a.revenue || 0;
					bValue = b.revenue || 0;
			}

			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});
	};

	// Handle sort change
	const handleSortChange = (newSortBy) => {
		if (sortBy === newSortBy) {
			// Toggle sort order if same field
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			// Set new sort field with default desc order
			setSortBy(newSortBy);
			setSortOrder('desc');
		}
	};

	useEffect(() => {
		fetchProductGroups();
	}, [selectedStore, dateRange]);

	if (loading) {
		return (
			<div className="animate-pulse">
				<div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
				<div className="space-y-3">
					<div className="h-4 bg-gray-200 rounded"></div>
					<div className="h-4 bg-gray-200 rounded w-5/6"></div>
					<div className="h-4 bg-gray-200 rounded w-4/6"></div>
				</div>
			</div>
		);
	}

	const sortedProductGroups = getSortedProductGroups();

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center gap-4">
					{/* Sort Controls */}
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-gray-700">Sort by:</label>
						<BeautifulSelect
							value={sortBy}
							onChange={handleSortChange}
							options={[
								{ value: 'revenue', label: 'Revenue' },
								{ value: 'orders', label: 'Orders' },
								{ value: 'sku', label: 'Product Name' }
							]}
							placeholder="Select sort field"
							size="sm"
							className="w-32"
						/>
						<button
							onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
							className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
							title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
						>
							<svg 
								className={`w-4 h-4 transform transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
							</svg>
						</button>
					</div>
					<button
						onClick={handleAutoGroup}
						disabled={autoGroupLoading}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
					>
						{autoGroupLoading ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								Auto-grouping...
							</>
						) : (
							<>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Auto-group Products
							</>
						)}
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			{sortedProductGroups.length === 0 ? (
				<div className="text-center py-8">
					<div className="text-gray-400 mb-4">
						<svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">No Product Groups Found</h3>
					<p className="text-gray-500 mb-4">
						No product groups have been created yet. Click "Auto-group Products" to automatically group your products based on SKU patterns.
					</p>
				</div>
			) : (
				<div className="grid gap-6">
					{sortedProductGroups.map((group, index) => (
						<div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-xl font-semibold text-gray-800 mb-1">
										{group.sku || 'Unknown Product'}
									</h3>
									<p className="text-sm text-gray-500">Main SKU: {group.sku}</p>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-blue-600">
										${(group.revenue || 0).toFixed(2)}
									</div>
									<div className="text-sm text-gray-500">Total Revenue</div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<div className="bg-blue-50 p-4 rounded-lg">
									<div className="text-2xl font-bold text-blue-600">
										${(group.revenue || 0).toFixed(2)}
									</div>
									<div className="text-sm text-blue-600 font-medium">Total Revenue</div>
								</div>

								<div className="bg-green-50 p-4 rounded-lg">
									<div className="text-2xl font-bold text-green-600">
										{group.order_count || 0}
									</div>
									<div className="text-sm text-green-600 font-medium">Orders</div>
								</div>
							</div>

							{/* Period Info */}
							<div className="mt-4 text-sm text-gray-500">
								Period: {dateRange?.startDate} to {dateRange?.endDate}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ProductGroups;
