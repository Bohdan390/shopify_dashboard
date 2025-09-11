import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Calendar, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Globe, ChevronDown, X } from 'lucide-react';
import api from "../config/axios"
import CostOfGoodsLoader from './loaders/CostOfGoodsLoader';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import CostOfGoodsTableLoader from './loaders/CostOfGoodsTableLoader';
import CountryCostsManager from './CountryCostsManager';
import { Button, Dialog, DialogContent, DialogTitle, styled, TextField } from '@mui/material';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useCurrency } from '../contexts/CurrencyContext';
import Autocomplete from '@mui/material/Autocomplete';
import * as XLSX from 'xlsx';

// Product Autocomplete Component

const G = require("../config/global");

let isFetchingSummaryStats = false, isFetchingCostOfGoods = false;

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
	'& .MuiDialogContent-root': {
		padding: theme.spacing(2),
	},
	'& .MuiDialogActions-root': {
		padding: theme.spacing(1),
	},
}));

const CostOfGoods = () => {
	const formatLocalDate = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Sort functions
	const handleSort = (key) => {
		const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
		const newSortConfig = { key, direction: newDirection };
		setSortConfig(newSortConfig);
		// Reset to first page when sorting changes
		fetchCostOfGoods(1, true, true, newSortConfig);
	};

	const getSortIcon = (key) => {
		if (sortConfig.key !== key) {
			return <ChevronDown className="w-4 h-4 text-gray-400" />;
		}
		return sortConfig.direction === 'asc' 
			? <ChevronDown className="w-4 h-4 text-gray-600 rotate-180" />
			: <ChevronDown className="w-4 h-4 text-gray-600" />;
	};

	// Search functions
	const handleSearchChange = (e) => {
		const value = e.target.value;
		setSearchTerm(value);
		if (value == '') {
			clearSearch()
		}
	};

	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			fetchSummaryStats();
			fetchCostOfGoods(1, true, true);
		}
	};

	const clearSearch = () => {
		setSearchTerm('');
		fetchCostOfGoods(1, true, true, sortConfig, '');
		fetchSummaryStats('');
	};

	const { selectedStore, syncCompleted, adsSyncCompleted } = useStore();
	const [costOfGoods, setCostOfGoods] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [error, setError] = useState(null);
	const [addingEntry, setAddingEntry] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingEntry, setEditingEntry] = useState(null);
	const [deletingEntry, setDeletingEntry] = useState(null);
	const [tableLoading, setTableLoading] = useState(false);
	const [showCountryCosts, setShowCountryCosts] = useState(false);
	const [selectedProductForCountryCosts, setSelectedProductForCountryCosts] = useState(null);
	const [showCountryCostsSection, setShowCountryCostsSection] = useState(false);
	const [countryCosts, setCountryCosts] = useState([]);
	const [summaryStats, setSummaryStats] = useState({});
	const [formData, setFormData] = useState({
		productId: '',
		productTitle: '',
		quantity: '',
		totalCost: '',
		date: new Date().toISOString().split('T')[0],
		countryCosts: {} // New field for country costs
	});
	const [newCountryCost, setNewCountryCost] = useState({
		country: '',
		cost_of_goods: 0,
		shipping_cost: 0,
		vat_rate: 0,
		tariff_rate: 0,
		discounts_and_refunds: 0,
		payment_processing_fee: 0,
		quantity: 0,
		currency: 'USD'
	});
	const [editCountryCostIndex, setEditCountryCostIndex] = useState(-1);
	const [expandedRows, setExpandedRows] = useState(new Set());
	const [countryCostsData, setCountryCostsData] = useState({});
	const [products, setProducts] = useState([]);
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
	});
	const [showDatePresets, setShowDatePresets] = useState(false);

	// Sort state
	const [sortConfig, setSortConfig] = useState({
		key: 'date',
		direction: 'desc'
	});

	// Search state
	const [searchTerm, setSearchTerm] = useState('');

	// Pagination state
	const [pageSize, setPageSize] = useState(10);
	const [pagination, setPagination] = useState({
		currentPage: 1,
		totalPages: 1,
		totalEntries: 0,
		pageSize: 10,
		hasNext: false,
		hasPrev: false
	});

	const { formatCurrency, displayCurrency } = useCurrency();

	useEffect(() => {
		fetchCostOfGoods(1, true);
	}, [dateRange]);

	// Fetch products on component mount
	useEffect(() => {
		fetchSummaryStats()
		fetchProducts();
	}, []);

	const fetchSummaryStats = (search = searchTerm) => {
		if (isFetchingSummaryStats) return;
		isFetchingSummaryStats = true;
		try {
			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				store_id: selectedStore || 'buycosari',
			});
			if (search) {
				params.append('search', search);
			}
			api.get('/api/ads/cost-summary?' + params)
			.then((response) => {
				setSummaryStats(response.data.data || {});
			})
			.catch((error) => {
				console.error('Error fetching products:', error);
			});
		} catch (error) {
			console.error('Error fetching products:', error);
		} finally {
			isFetchingSummaryStats = false;
		}
	}
	// Listen for sync completion from GlobalStoreSelector and refresh data
	useEffect(() => {
		if (syncCompleted > 0 || adsSyncCompleted > 0) {
			fetchCostOfGoods(1, true);
		}
	}, [syncCompleted, adsSyncCompleted]);

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

	// Fetch products for SearchableSelect
	const fetchProducts = async () => {
		try {
			if (selectedStore == "meonutrition") {
				const response = await api.get('/api/ads/product-skus?storeId=' + selectedStore);
				const productsData = response.data.data || [];
				setProducts(productsData);
			}
			else {
				const response = await api.get('/api/ads/products?storeId=' + selectedStore);
				const productsData = response.data.data || [];
				setProducts(productsData);
			}
		} catch (error) {
			console.error('Error fetching products:', error);
		}
	};

	const fetchCostOfGoods = async (page = 1, resetPagination = false, showTableLoader = false, sort = sortConfig, search = searchTerm) => {
		if (isFetchingCostOfGoods) return;
		isFetchingCostOfGoods = true;
		try {
			if (resetPagination) {
				setPagination(prev => ({ ...prev, currentPage: page }));
			}

			if (showTableLoader) {
				setTableLoading(true);
			} else {
				setLoading(true);
			}

			setError(null);

			const params = new URLSearchParams({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				store_id: selectedStore || 'buycosari',
				page: page.toString(),
				pageSize: pageSize.toString(),
				sortBy: sort.key,
				sortOrder: sort.direction,
				search: search || ''
			});

			const response = await api.get(`/api/ads/cog?${params}`);

			// Handle server-side pagination response
			if (response.data && response.data.data && response.data.pagination) {
				setCostOfGoods(response.data.data);
				setPagination(response.data.pagination);
			} else {
				// Fallback for backward compatibility
				setCostOfGoods(response.data || []);
			}

		} catch (error) {
			console.error('Error fetching cost of goods:', error);
			setError('Failed to load cost of goods data. Please try again.');

			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to load cost of goods data', 'error');
			}
		} finally {
			isFetchingCostOfGoods = false;
			if (showTableLoader) {
				setTableLoading(false);
			} else {
				setLoading(false);
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

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			setAddingEntry(true);

			let totalCostWithCountryCosts = Number(formData.totalCost || 0);
			let totalCost = 0, totalQuantity = 0;

			if (countryCosts.length > 0) {
				countryCosts.forEach(country => {
					// Convert all values to numbers
					country.cost_of_goods = G.roundPrice(Number(country.cost_of_goods || 0));
					country.shipping_cost = G.roundPrice(Number(country.shipping_cost || 0));
					country.vat_rate = G.roundPrice(Number(country.vat_rate || 0));
					country.tariff_rate = G.roundPrice(Number(country.tariff_rate || 0));
					country.discounts_and_refunds = G.roundPrice(Number(country.discounts_and_refunds || 0));
					country.payment_processing_fee = G.roundPrice(Number(country.payment_processing_fee || 0));

					country.total_cost = calculateTotalPerUnit(country) * Number(country.quantity || 0);
					country.total_cost = G.roundPrice(country.total_cost);
					totalCost += country.total_cost
					totalQuantity += country.quantity
				});
			}

			const apiData = {
				product_id: formData.productId,
				product_title: formData.productTitle,
				cost_per_unit: totalCost / totalQuantity,
				quantity: countryCosts.reduce((sum, country) => sum + Number(country.quantity || 0), 0),
				total_cost: totalCostWithCountryCosts, // Use the calculated total with country costs
				date: formData.date,
				country_cost_id: formData.country_cost_id,
				store_id: selectedStore || 'buycosari',
				country_costs: countryCosts // Include the country costs data
			};

			if (editingEntry) {
				// Update existing entry
				await api.put(`/api/ads/cog/${editingEntry.id}`, apiData);
				setCountryCostsData(prev => {
					prev[formData.country_cost_id] = countryCosts;
					return prev;
				});
			} else {
				// Add new entry with country costs
				const costEntryResponse = await api.post('/api/ads/cog', apiData);
			}

			setFormData({
				productId: '',
				productTitle: '',
				costPerUnit: '',
				totalCost: '',
				date: formatLocalDate(new Date()),
				country_cost_id: ''
			});
			setCountryCosts([]); // Clear the country costs array
			setShowForm(false);
			setEditingEntry(null);
			fetchCostOfGoods();
		} catch (error) {
			console.error('Error saving cost of goods:', error);

			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to save cost of goods entry. Please try again.', 'error');
			}
		} finally {
			setAddingEntry(false);
		}
	};

	const handleEdit = async (entry) => {
		setEditingEntry(entry);
		var countryCosts = countryCostsData[entry.country_cost_id];
		if (countryCosts == undefined) {
			countryCosts = await fetchCountryCostsForCountryCostId(entry.country_cost_id);
			setCountryCostsData(prev => ({
				...prev,
				[entry.country_cost_id]: countryCosts
			}));
		}
		setFormData({
			productId: entry.product_id || '',
			productTitle: entry.product_title || '',
			quantity: entry.quantity ? entry.quantity.toString() : '',
			totalCost: entry.total_cost ? entry.total_cost.toString() : '',
			country_cost_id: entry.country_cost_id,
			date: entry.date || new Date().toISOString().split('T')[0],
		});
		setCountryCosts(countryCosts);
		setShowForm(true);
	};

	const handleDelete = async (entry) => {
		if (!window.confirm('Are you sure you want to delete this cost of goods entry?')) {
			return;
		}

		try {
			setDeletingEntry(entry.id);
			await api.delete(`/api/ads/cog/${entry.id}`);

			fetchCostOfGoods();
		} catch (error) {
			console.error('Error deleting cost of goods:', error);

			if (window.showPrimeToast) {
				window.showPrimeToast('Failed to delete cost of goods entry. Please try again.', 'error');
			}
		} finally {
			setDeletingEntry(null);
		}
	};

	const handleCancel = () => {
		setShowForm(false);
		setEditingEntry(null);
		setFormData({
			productId: '',
			productTitle: '',
			quantity: '',
			totalCost: '',
			date: new Date().toISOString().split('T')[0],
			countryCosts: {}
		});
		setShowCountryCostsSection(false);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Function to fetch country costs for a specific product
	const fetchCountryCostsForCountryCostId = async (countryCostId) => {
		try {
			const response = await api.get(`/api/ads/cog/country-costs/${countryCostId}`);
			return response.data.data || [];
		} catch (error) {
			console.error('Error fetching country costs:', error);
			return [];
		}
	};

	// Function to toggle row expansion
	const toggleRowExpansion = async (countryCostId) => {
		const newExpandedRows = new Set(expandedRows);

		if (newExpandedRows.has(countryCostId)) {
			newExpandedRows.delete(countryCostId);
			setExpandedRows(newExpandedRows);
		} else {
			newExpandedRows.add(countryCostId);
			setExpandedRows(newExpandedRows);
			// Fetch country costs if not already loaded
			if (!countryCostsData[countryCostId]) {
				const costs = await fetchCountryCostsForCountryCostId(countryCostId);
				console.log(costs)
				setCountryCostsData(prev => ({
					...prev,
					[countryCostId]: costs
				}));
			}
		}

	};

	const calculateTotalPerUnit = (country) => {
		const countryCostNum = Number(country.cost_of_goods || 0);
		const shippingNum = Number(country.shipping_cost || 0);
		const discountsNum = Number(country.discounts_and_refunds || 0);
		const processingFeeNum = Number(country.payment_processing_fee || 0);
		const vatRate = Number(country.vat_rate || 0);
		const tariffRate = Number(country.tariff_rate || 0);

		// Calculate subtotal (base + country cost + shipping + discounts + processing fees)
		const subtotal = (countryCostNum + shippingNum + discountsNum) * G.currencyRates[country.currency];

		const vatAmount = subtotal * (vatRate / 100);

		const tariffAmount = subtotal * (tariffRate / 100);

		const processingFeeAmount = subtotal * (processingFeeNum / 100);

		return subtotal + vatAmount + tariffAmount + processingFeeAmount;
	};

	const calculateSubtotalPerUnit = (country) => {
		const countryCostNum = Number(country.cost_of_goods || 0);
		const shippingNum = Number(country.shipping_cost || 0);
		const discountsNum = Number(country.discounts_and_refunds || 0);

		// Calculate subtotal (base + country cost + shipping + discounts + processing fees)
		const subtotal = (countryCostNum + shippingNum + discountsNum) * G.currencyRates[country.currency];

		return G.roundPrice(subtotal);
	}

	const calculateVATPerUnit = (country) => {
		const countryCostNum = Number(country.cost_of_goods || 0);
		const shippingNum = Number(country.shipping_cost || 0);
		const discountsNum = Number(country.discounts_and_refunds || 0);
		const vatRate = Number(country.vat_rate || 0);

		// Calculate subtotal (base + country cost + shipping + discounts + processing fees)
		const subtotal = (countryCostNum + shippingNum + discountsNum) * G.currencyRates[country.currency];

		const vatAmount = G.roundPrice(subtotal * (vatRate / 100));

		return vatAmount;
	}

	const calculateTariffPerUnit = (country) => {	
		const countryCostNum = Number(country.cost_of_goods || 0);
		const shippingNum = Number(country.shipping_cost || 0);
		const discountsNum = Number(country.discounts_and_refunds || 0);
		const tariffRate = Number(country.tariff_rate || 0);

		const subtotal = (countryCostNum + shippingNum + discountsNum) * G.currencyRates[country.currency];

		const tariffAmount = G.roundPrice(subtotal * (tariffRate / 100));

		return tariffAmount;
	}

	const calculateProcessingFeePerUnit = (country) => {	
		const countryCostNum = Number(country.cost_of_goods || 0);
		const shippingNum = Number(country.shipping_cost || 0);
		const discountsNum = Number(country.discounts_and_refunds || 0);
		const processingFeeNum = Number(country.payment_processing_fee || 0);

		const subtotal = (countryCostNum + shippingNum + discountsNum) * G.currencyRates[country.currency];

		const processingFeeAmount = G.roundPrice(subtotal * (processingFeeNum / 100));

		return processingFeeAmount;
	}

	// Reset to page 1 when page size changes
	useEffect(() => {
		setPagination(prev => ({ ...prev, currentPage: 1 }));
		// Fetch new data with updated page size
		fetchCostOfGoods(1, true, true);
	}, [pageSize]);

	// Pagination component
	const PaginationControls = () => {

		// Always show pagination when there's data, even if only 1 page
		if (!costOfGoods || costOfGoods.length === 0) return null;

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
							{Math.min(pagination.currentPage * pageSize, pagination.totalEntries)} of{' '}
							{pagination.totalEntries} entries
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
						onClick={() => fetchCostOfGoods(1, false, true)}
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
						onClick={() => fetchCostOfGoods(pagination.currentPage - 1, false, true)}
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
										onClick={() => fetchCostOfGoods(page, false, true)}
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
						onClick={() => fetchCostOfGoods(pagination.currentPage + 1, false, true)}
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
						onClick={() => fetchCostOfGoods(pagination.totalPages, false, true)}
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
		return <CostOfGoodsLoader />;
	}

	const Abc = (e) => {
		const file = e.target.files[0];
        const reader = new FileReader();

		reader.onload = async function (event) {
			const data = new Uint8Array(event.target.result)
			const workbook = XLSX.read(data, { type: 'array' });
			var costsOfGoods = new Map()
			if (workbook.SheetNames.length === 1) {
				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];
				const json = XLSX.utils.sheet_to_json(sheet);
				for (const row of json) {
					var flag = true
					if (!row['Variant SKU']) continue;
					var sku = row['Variant SKU']
					if (sku.includes("-")) {
						sku = sku.split("-")[0] + "-" + sku.split("-")[1]
					}
					var pp = products.filter(p => p.sku_id == sku)
					if (pp.length == 0) flag = false
					var arr = row['Handle'].split("-")
					for (var i = 0; i < pp.length; i++) {
						var p = pp[i]
						flag = true
						arr.forEach((a) => {
							if (!p.product_title.toLowerCase().includes(a.toLowerCase())) {
								flag = false
							}
						})
						if (flag) break;
					}
					if (pp.length == 1) flag = true
					if (!flag) {
						console.log(flag, row['Variant SKU'], pp, arr)
					}
					
					if (costsOfGoods.has(sku)) {
						costsOfGoods.get(sku).costs.push({
							country: 'United States',
							cost_of_goods: Number(row['Product Cost']),
							shipping_cost: Number(row['Shipping Cost']),
							vat_rate: 0,
							tariff_rate: 0,
							discounts_and_refunds: 0,
							payment_processing_fee: 0,
							quantity: 1,
							total_cost: Number(row['Product Cost']) + Number(row['Shipping Cost']),
							currency: 'USD'
						})
					}
					else {
						costsOfGoods.set(sku, {
							sku_id: sku,
							sku_title: pp[0].product_title,
							costs: [{
								country: 'United States',
								cost_of_goods: Number(row['Product Cost']),
								shipping_cost: Number(row['Shipping Cost']),
								vat_rate: 0,
								tariff_rate: 0,
								discounts_and_refunds: 0,
								payment_processing_fee: 0,
								quantity: 1,
								total_cost: Number(row['Product Cost']) + Number(row['Shipping Cost']),
								currency: 'USD'
							}],
						})
					}

					// if (products.find(p => p.product_title == row.Product_Name)) {
					// 	let totalCost = 0, totalQuantity = 6, costs = [];
					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['1_Bottle_COGS']),
					// 		shipping_cost: Number(row['1_Bottle_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['1_Bottle_COGS']) + Number(row['1_Bottle_Shipping']),
					// 		currency: 'USD'
					// 	})

					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['2_Bottles_COGS']),
					// 		shipping_cost: Number(row['2_Bottles_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['2_Bottles_COGS']) + Number(row['2_Bottles_Shipping']),
					// 		currency: 'USD'
					// 	})

					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['3_Bottles_COGS']),
					// 		shipping_cost: Number(row['3_Bottles_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['3_Bottles_COGS']) + Number(row['3_Bottles_Shipping']),
					// 		currency: 'USD'
					// 	})

					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['4_Bottles_COGS']),
					// 		shipping_cost: Number(row['4_Bottles_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['4_Bottles_COGS']) + Number(row['4_Bottles_Shipping']),
					// 		currency: 'USD'
					// 	})

					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['5_Bottles_COGS']),
					// 		shipping_cost: Number(row['5_Bottles_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['5_Bottles_COGS']) + Number(row['5_Bottles_Shipping']),
					// 		currency: 'USD'
					// 	})

					// 	costs.push({
					// 		country: 'United States',
					// 		cost_of_goods: Number(row['6_Bottles_COGS']),
					// 		shipping_cost: Number(row['6_Bottles_Shipping']),
					// 		vat_rate: 0,
					// 		tariff_rate: 0,
					// 		discounts_and_refunds: 0,
					// 		payment_processing_fee: 0,
					// 		quantity: 1,
					// 		total_cost: Number(row['6_Bottles_COGS']) + Number(row['6_Bottles_Shipping']),
					// 		currency: 'USD'
					// 	})
						
					// 	totalCost = costs.reduce((sum, country) => sum + country.total_cost, 0);
					// 	const apiData = {
					// 		product_id: products.find(p => p.product_title == row.Product_Name).product_id,
					// 		product_title: row.Product_Name,
					// 		cost_per_unit: G.roundPrice(totalCost / totalQuantity),
					// 		quantity: totalQuantity,
					// 		total_cost: G.roundPrice(totalCost), // Use the calculated total with country costs
					// 		date: new Date().toISOString().split('T')[0],
					// 		store_id: selectedStore || 'buycosari',
					// 		country_costs: costs // Include the country costs data
					// 	};

					// 	console.log(apiData, totalCost)
					// 	const costEntryResponse = await api.post('/api/ads/cog', apiData);
					// }
				}

				for (var i = 0; i < Array.from(costsOfGoods.values()).length; i++) {
					var cost = Array.from(costsOfGoods.values())[i]
					let totalCost = cost.costs.reduce((sum, country) => sum + country.total_cost, 0);
					let totalQuantity = cost.costs.reduce((sum, country) => sum + country.quantity, 0);
					const apiData = {
						product_id: cost.sku_id,
						product_title: cost.sku_title,
						cost_per_unit: G.roundPrice(totalCost / totalQuantity),
						quantity: totalQuantity,
						total_cost: G.roundPrice(totalCost), // Use the calculated total with country costs
						date: new Date().toISOString().split('T')[0],
						store_id: selectedStore || 'buycosari',
						country_costs: cost.costs // Include the country costs data
					};
						
					// const costEntryResponse = await api.post('/api/ads/cog', apiData);
				}
			}
		}
		reader.readAsArrayBuffer(file);

	}
	return (
		<div className="p-8">
			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Cost of Goods</h1>
					<p className="text-gray-600 mt-1">Track your product costs and inventory</p>
				</div>
				<div className="flex items-center gap-3">
					{/* <input type="file" onChange={(e) => Abc(e)} /> */}
					<Button
						variant='contained'
						onClick={() => {
							setFormData({
								...formData,
								productTitle: '',
								productId: '',
								quantity: '',
								totalCost: '',
								date: new Date().toISOString().split('T')[0]
							})
							setCountryCosts([])
							setShowForm(true)
						}}
						className="btn-primary flex items-center gap-2"
					>
						<Plus className="w-4 h-4" />
						Add Cost Entry
					</Button>
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-red-500" />
						<div>
							<h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
							<p className="text-sm text-red-700 mt-1">{error}</p>
						</div>
						<Button
							variant='contained'
							onClick={() => fetchCostOfGoods()}
							className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
						>
							Retry
						</Button>
					</div>
				</div>
			)}

			{/* Beautiful Date Range Filter with Calendar */}
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
					</div>

					{/* Date Range Display */}
					<div className="text-xs text-gray-500">
						Selected: {dateRange.startDate} to {dateRange.endDate}
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="card mb-6">
				<div className="flex items-center gap-4">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Search Cost of Goods
						</label>
						<div className="relative">
							<input
								type="text"
								value={searchTerm}
								onChange={handleSearchChange}
								onKeyPress={handleSearchKeyPress}
								placeholder="Search by product name, SKU, or cost... (Press Enter to search)"
								className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
								disabled={searchLoading || tableLoading}
							/>
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Package className="h-4 w-4 text-gray-400" />
							</div>
							{searchTerm && (
								<button
									onClick={clearSearch}
									className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
									disabled={searchLoading || tableLoading}
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					</div>
					{searchLoading && (
						<div className="flex items-center text-sm text-gray-500">
							<RefreshCw className="w-4 h-4 animate-spin mr-2" />
							Searching...
						</div>
					)}
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<Package className="w-8 h-8 text-blue-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Cost</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
								) : (
									formatCurrency(summaryStats.total_cost || 0)
								)}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<Package className="w-8 h-8 text-green-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Quantity</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
								) : (
									summaryStats.total_quantity || 0
								)}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<Package className="w-8 h-8 text-purple-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Avg Cost/Unit</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
								) : (
									formatCurrency(summaryStats.avg_cost_per_unit || 0)
								)}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<div className="flex items-center">
						<Globe className="w-8 h-8 text-green-600" />
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Products with Country Costs</p>
							<p className="text-2xl font-bold text-gray-900">
								{refreshing ? (
									<div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
								) : summaryStats.total_count || 0}
							</p>
							
						</div>
					</div>
				</div>
			</div>

			{/* Temporary Test Button for Country Costs */}

			{/* Cost of Goods Table */}
			<div className="bg-white rounded-lg shadow-sm border">
				<div className="overflow-x-auto relative">
					{refreshing && (
						<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
							<div className="flex items-center space-x-2">
								<LoadingSpinner size="md" variant="spinner" />
								<span className="text-gray-600">Refreshing...</span>
							</div>
						</div>
					)}

					{tableLoading ? (
						<CostOfGoodsTableLoader />
					) : costOfGoods.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<div className="flex flex-col items-center">
								<div className="text-4xl mb-2">📦</div>
								<div className="text-lg font-medium mb-2">No cost entries found</div>
								<div className="text-sm text-gray-400 mb-4">
									Try adjusting your date range or add a new cost entry
								</div>
							</div>
						</div>
					) : (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										<button
											onClick={() => handleSort('product_title')}
											disabled={tableLoading}
											className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
										>
											<span>{selectedStore == "meonutrition" ? "Product SKU" : "Product Name"}</span>
											{getSortIcon('product_title')}
										</button>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										<button
											onClick={() => handleSort('cost_per_unit')}
											disabled={tableLoading}
											className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
										>
											<span>AVG Cost/Unit</span>
											{getSortIcon('cost_per_unit')}
										</button>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										<button
											onClick={() => handleSort('quantity')}
											disabled={tableLoading}
											className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
										>
											<span>Quantity</span>
											{getSortIcon('quantity')}
										</button>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										<button
											onClick={() => handleSort('total_cost')}
											disabled={tableLoading}
											className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
										>
											<span>Total Cost</span>
											{getSortIcon('total_cost')}
										</button>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										<button
											onClick={() => handleSort('date')}
											disabled={tableLoading}
											className={`flex items-center space-x-1 transition-colors ${!tableLoading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
										>
											<span>Date</span>
											{getSortIcon('date')}
										</button>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{costOfGoods.map((item, index) => {
									return (
										<React.Fragment key={index}>
											<tr
												className="hover:bg-gray-50 cursor-pointer"
												onClick={() => toggleRowExpansion(item.country_cost_id)}
											>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-2">
														<button
															onClick={(e) => {
																e.stopPropagation();
																toggleRowExpansion(item.country_cost_id);
															}}
															className="p-1 hover:bg-gray-200 rounded transition-colors"
														>
															{expandedRows.has(item.country_cost_id) ? (
																<ChevronDown className="w-4 h-4 text-gray-500" />
															) : (
																<ChevronRight className="w-4 h-4 text-gray-500" />
															)}
														</button>
														<div>
															<div className="text-sm font-medium text-gray-900 flex items-center gap-2">
																{item.product_title || item.product_id}
																{item.country_costs && Object.keys(item.country_costs).length > 0 && (
																	<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
																		🌍 {Object.keys(item.country_costs).length} countries
																	</span>
																)}
															</div>
															<div className="text-sm text-gray-500">ID: {item.product_id}</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{formatCurrency(item.cost_per_unit)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{item.quantity.toLocaleString()}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{formatCurrency(item.total_cost)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(item.date)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<div className="flex items-center space-x-2">
														<button
															onClick={() => handleEdit(item)}
															className="text-blue-600 hover:text-blue-900 transition-colors"
															disabled={refreshing}
															title="Edit"
														>
															<Edit className="w-4 h-4" />
														</button>
														<button
															onClick={() => handleDelete(item)}
															className="text-red-600 hover:text-red-900 transition-colors"
															disabled={refreshing || deletingEntry === item.id}
															title="Delete"
														>
															{deletingEntry === item.id ? (
																<LoadingSpinner size="sm" variant="spinner" />
															) : (
																<Trash2 className="w-4 h-4" />
															)}
														</button>
													</div>
												</td>
											</tr>

											{/* Nested Country Costs Table */}
											{expandedRows.has(item.country_cost_id) && (
												<tr>
													<td colSpan="7" className="px-0 py-0">
														<div className="bg-gray-50 border-t border-gray-200">
															<div className="px-6 py-4">
																{countryCostsData[item.country_cost_id] ? (
																	countryCostsData[item.country_cost_id].length > 0 ? (
																		<div className="overflow-x-auto">
																			<table className="min-w-full divide-y divide-gray-200">
																				<thead className="bg-gray-100">
																					<tr>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost of Goods</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shipping</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discounts</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">VAT Rate</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tariff Rate</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Processing Fee</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
																						<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
																					</tr>
																				</thead>
																				<tbody className="bg-white divide-y divide-gray-200">
																					{countryCostsData[item.country_cost_id].map((countryCost, countryIndex) => (
																						<tr key={countryIndex} className="hover:bg-gray-50">
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{countryCost.country_code || countryCost.country}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{displayCurrency(Number(countryCost.cost_of_goods || 0).toFixed(2), countryCost.currency)}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{displayCurrency(Number(countryCost.shipping_cost || 0).toFixed(2), countryCost.currency)}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{displayCurrency(Number(countryCost.discounts_and_refunds || 0).toFixed(2), countryCost.currency)}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{countryCost.quantity.toLocaleString()}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{Number(countryCost.vat_rate || 0).toFixed(1)}%
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{Number(countryCost.tariff_rate || 0).toFixed(1)}%
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{Number(countryCost.payment_processing_fee || 0).toFixed(1)}%
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{displayCurrency(Number(countryCost.total_cost || 0).toFixed(2), countryCost.currency)}
																							</td>
																							<td className="px-4 py-2 text-sm text-gray-900">
																								{countryCost.currency || 'USD'}
																							</td>
																						</tr>
																					))}
																				</tbody>
																			</table>
																		</div>
																	) : (
																		<div className="text-center py-4 text-gray-500">
																			<div className="text-sm">No country costs configured for this product</div>
																		</div>
																	)
																) : (
																	<div className="text-center py-4">
																		<LoadingSpinner size="sm" variant="spinner" />
																		<div className="text-sm text-gray-500 mt-1">Loading country costs...</div>
																	</div>
																)}
															</div>
														</div>
													</td>
												</tr>
											)}
										</React.Fragment>
									);
								})}
							</tbody>
						</table>
					)}

				</div>
				{/* Pagination Controls - Outside the overflow container */}
				{costOfGoods.length > 0 && <PaginationControls />}
			</div>

			{/* Add/Edit Cost Entry Modal */}
			{showForm && (
				<BootstrapDialog open={showForm} onClose={handleCancel} aria-labelledby="customized-dialog-title">
					<DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
						{editingEntry ? 'Edit Cost Entry' : 'Add Cost Entry'}
					</DialogTitle>
					<DialogContent>
						<form onSubmit={handleSubmit} className="space-y-4">

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{selectedStore == "meonutrition" ? "Product SKU Title *" : "Product Title *"}</label>
								<Autocomplete
									id="free-solo-demo"
									freeSolo
									options={products.map((option) => ({label: option.product_title, id: option.product_id}))}
									getOptionLabel={(option) => option.label}
									renderOption={(props, option) => (
										<li {...props} key={option.id}>
										  <span>{option.label}</span>
										</li>
									  )}
									renderInput={(params) => <TextField 
										onChange={(e) => {
											var product = products.find(_p => _p && _p.product_title.includes(e.target.value))
											if (product) {
												setFormData({
													...formData,
													productTitle: product.product_title,
													productId: product.product_id
												})
											}
											else {
												setFormData({
													...formData,
													productTitle: e.target.value,
													productId: null
												})
											}
										}}
										{...params} placeholder="Choose a product..." 
										sx={{ "& .MuiInputBase-root": { height: 38 } }}
									/>}
									onChange={(event, value) => {
										if (!value) return
										setFormData({
											...formData,
											productTitle: value.label,
											productId: value.id
										});
									}}
								/>
								{/* <SearchableSelect
									value={formData.productTitle}
									onChange={(value) => {
										const selectedProduct = products.find(p => p.product_id === value);
										if (selectedProduct) {
											setFormData({
												...formData,
												productId: selectedProduct.product_id,
												productTitle: selectedProduct.product_title
											});
										} else {
											setFormData({ ...formData, productTitle: value });
										}
									}}
									options={[
										{ value: '', label: 'Choose a product...' },
										...products.map(product => {
											return ({
												value: product.product_id,
												label: `${product.product_title} (${product.product_id})`
											})
										})
									]}
									placeholder="Search and select a product"
									searchPlaceholder="Search products..."
									disabled={refreshing}
									className="w-full"
									size="md"
								/> */}
							</div>

							{/* Selected Product Info */}
							{formData.productId && formData.productTitle && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
									<div className="flex items-center gap-2">
										<Package className="w-4 h-4 text-blue-600" />
										<div className="text-sm">
											<span className="font-medium text-blue-900">{'' + (selectedStore == "meonutrition" ? "Selected Product SKU:" : "Selected Product:")}</span>
											<div className="text-blue-700">
												<div><strong>Title:</strong> {formData.productTitle}</div>
												<div><strong>ID:</strong> {formData.productId}</div>
											</div>
										</div>
									</div>
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
								<LocalizationProvider dateAdapter={AdapterDayjs}>
									<DemoContainer components={['DatePicker', 'DatePicker']}>
										<DatePicker
											value={dayjs(formData.date)}
											onChange={(newValue) => {
												var date = G.createLocalDateWithTime(newValue['$d']).toISOString().split('T')[0]
												setFormData({ ...formData, date: date })
											}} />
									</DemoContainer>
								</LocalizationProvider>
							</div>

							{/* Country Costs Section */}
							<div className="border-t pt-6">
								<div className="space-y-4">
									{/* Country Costs Summary */}
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
										<div className="flex items-center gap-2">
											<Globe className="w-4 h-4 text-gray-600" />
											<span className="text-sm font-medium text-gray-700">
												{countryCosts.length} country cost{countryCosts.length !== 1 ? 's' : ''} configured
											</span>
										</div>
										<div className="text-xs text-gray-500 mt-2">
											Each country cost shows the total for that specific destination
										</div>
									</div>

									{/* Country Costs List */}
									{countryCosts.length > 0 && (
										<div className="space-y-3 mb-4">
											{countryCosts.map((country, index) => (
												<div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-start gap-3">
																<div className="flex-1">
																	<div className="flex items-center justify-between mb-2">
																		<h6 className="font-medium text-gray-900 text-sm">{country.country}</h6>
																		<div className="flex items-center gap-1">
																			<button
																				type="button"
																				onClick={() => {
																					setNewCountryCost({ ...country });
																					setEditCountryCostIndex(index);
																					setShowCountryCostsSection(true);
																				}}
																				className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
																				title="Edit country cost"
																			>
																				<Edit className="w-4 h-4" />
																			</button>
																			<button
																				type="button"
																				onClick={() => {
																					const updatedCountryCosts = countryCosts.filter((_, i) => i !== index);
																					setCountryCosts(updatedCountryCosts);

																					if (window.showPrimeToast) {
																						window.showPrimeToast(`Removed country cost for ${country.country}`, 'info');
																					}
																				}}
																				className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
																				title="Remove country cost"
																			>
																				<Trash2 className="w-4 h-4" />
																			</button>
																		</div>
																	</div>
																	<div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-600">
																		<div>
																			<span className="font-medium">Cost:</span> ${country.cost_of_goods}
																		</div>
																		<div>
																			<span className="font-medium">Shipping:</span> ${country.shipping_cost}
																		</div>
																		<div>
																			<span className="font-medium">VAT:</span> {country.vat_rate}%
																		</div>
																		<div>
																			<span className="font-medium">Tariff:</span> {country.tariff_rate}%
																		</div>
																		<div>
																			<span className="font-medium">Processing:</span> {country.payment_processing_fee}%
																		</div>
																		<div>
																			<span className="font-medium">Discounts:</span> {displayCurrency(Number(country.discounts_and_refunds || 0).toFixed(2), country.currency)}
																		</div>
																		<div>
																			<span className="font-medium">Quantity:</span> {country.quantity}
																		</div>
																		<div>
																			<span className="font-medium">Currency:</span> {country.currency}
																		</div>
																	</div>
																	{/* Individual Country Cost Total */}
																	<div className="mt-3 pt-2 border-t border-gray-200">
																		{/* Per Unit Breakdown */}
																		<div className="space-y-2 mb-3">
																			<div className="flex items-center justify-between text-xs">
																				<span className="text-gray-600">Country Cost:</span>
																				<span className="text-gray-700">{displayCurrency(Number(country.cost_of_goods || 0).toFixed(2), country.currency)}</span>
																			</div>
																			<div className="flex items-center justify-between text-xs">
																				<span className="text-gray-600">Shipping:</span>
																				<span className="text-gray-700">{displayCurrency(Number(country.shipping_cost || 0).toFixed(2), country.currency)}</span>
																			</div>
																			<div className="flex items-center justify-between text-xs">
																				<span className="text-gray-600">Discounts:</span>
																				<span className="text-gray-700">{displayCurrency(Number(country.discounts_and_refunds || 0).toFixed(2), country.currency)}</span>
																			</div>
																			<div className="flex items-center justify-between text-xs">
																				<span className="text-gray-600">Subtotal:</span>
																				<span className="text-gray-700 font-medium">
																					${calculateSubtotalPerUnit(country)}
																				</span>
																			</div>
																		</div>

																		{/* VAT and Tariff Calculation */}
																		{(Number(country.vat_rate || 0) > 0 || Number(country.tariff_rate || 0) > 0 || Number(country.payment_processing_fee || 0) > 0) && (
																			<div className="space-y-2 mb-3 p-2 bg-gray-50 rounded">
																				{Number(country.vat_rate || 0) > 0 && (
																					<div className="flex items-center justify-between text-xs">
																						<span className="text-gray-600">VAT ({country.vat_rate}%):</span>
																						<span className="text-red-600">+${calculateVATPerUnit(country)}</span>
																					</div>
																				)}
																				{Number(country.tariff_rate || 0) > 0 && (
																					<div className="flex items-center justify-between text-xs">
																						<span className="text-gray-600">Tariff ({country.tariff_rate}%):</span>
																						<span className="text-red-600">+${calculateTariffPerUnit(country)}</span>
																					</div>
																				)}
																				{Number(country.payment_processing_fee || 0) > 0 && (
																					<div className="flex items-center justify-between text-xs">
																						<span className="text-gray-600">Processing ({country.payment_processing_fee}%):</span>
																						<span className="text-red-600">+${calculateProcessingFeePerUnit(country)}</span>
																					</div>
																				)}
																			</div>
																		)}

																		{/* Final Totals */}
																		<div className="space-y-2">
																			<div className="flex items-center justify-between">
																				<span className="text-xs font-medium text-gray-700">Per Unit Total (with taxes):</span>
																				<span className="text-sm font-bold text-blue-600">
																					${calculateTotalPerUnit(country).toFixed(2)}
																				</span>
																			</div>
																			{country.quantity && (
																				<div className="flex items-center justify-between">
																					<span className="text-xs font-medium text-gray-600">Total for {country.quantity} units:</span>
																					<span className="text-sm font-bold text-green-600">
																						${(calculateTotalPerUnit(country) * country.quantity).toFixed(2)}
																					</span>
																				</div>
																			)}
																		</div>
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>
											))}
										</div>
									)}

									{/* Empty State */}
									{countryCosts.length === 0 && (
										<div className="text-center py-6 text-gray-500">
											<div className="text-4xl mb-2">🌍</div>
											<div className="text-sm font-medium mb-1">No country costs added yet</div>
											<div className="text-xs text-gray-400">Click "Add Country Cost" to get started</div>
										</div>
									)}
									{/* Add More Countries Button */}
									<div className="mt-4 pt-4 border-t border-gray-200">
										<div className="w-full" style={{textAlign: 'center'}}>
											{
												(
													<Button
														variant='contained'
														type="button"
														onClick={() => {
															setShowCountryCostsSection(true);
															setEditCountryCostIndex(-1);
															setNewCountryCost({
																country: '',
																cost_of_goods: 0,
																shipping_cost: 0,
																vat_rate: 0,
																tariff_rate: 0,
																discounts_and_refunds: 0,
																payment_processing_fee: 0,
																quantity: 0,
																currency: 'USD'
															});
														}}
														className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
													>
														<Plus className="w-4 h-4" />
														Add Country Cost
													</Button>
												)
											}
										</div>
									</div>
								</div>
							</div>

							<div className="flex gap-3 pt-4">
								<Button
									variant='outlined'
									type="button"
									onClick={handleCancel}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
									disabled={addingEntry}
								>
									Cancel
								</Button>
								<Button
									variant='contained'
									type="submit"
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									disabled={addingEntry}
								>
									{addingEntry ? (
										<LoadingSpinner size="sm" variant="spinner" />
									) : (
										editingEntry ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />
									)}
									{addingEntry ? 'Saving...' : (editingEntry ? 'Update' : 'Add Cost')}
								</Button>
							</div>
						</form>
					</DialogContent>

				</BootstrapDialog>
			)}

			{
				showCountryCostsSection && (
					<BootstrapDialog open={showCountryCostsSection} onClose={() => {
						setShowCountryCostsSection(false);
						setEditCountryCostIndex(-1);
						// Reset the form when closing
						setNewCountryCost({
							country: '',
							cost_of_goods: 0,
							shipping_cost: 0,
							vat_rate: 0,
							tariff_rate: 0,
							discounts_and_refunds: 0,
							payment_processing_fee: 0,
							quantity: 0,
							currency: 'USD'
						});
					}} aria-labelledby="customized-dialog-title">
						<DialogTitle>
							{editCountryCostIndex !== -1 ? 'Edit Country Cost' : 'Add Country Cost'}
						</DialogTitle>
						<DialogContent style={{ width: "25vw" }}>
							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
								<BeautifulSelect
									options={G.availableCountries.map(country => ({ value: country.country_name, label: country.country_name }))}
									value={newCountryCost.country}
									selectClass='w-full'
									onChange={(e) => setNewCountryCost({ ...newCountryCost, country: e })}
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Cost of Goods (USD)</label>
								<input
									type="number"
									step="0.01"
									value={newCountryCost.cost_of_goods || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, cost_of_goods: parseFloat(e.target.value) || '' })}
									placeholder="0.00 (use base cost)"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost (USD)</label>
								<input
									type="number"
									step="0.01"
									value={newCountryCost.shipping_cost || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, shipping_cost: parseFloat(e.target.value) || '' })}
									placeholder="0.00"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={newCountryCost.vat_rate || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, vat_rate: parseFloat(e.target.value) || '' })}
									placeholder="0.00"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Tariff Rate (%)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={newCountryCost.tariff_rate || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, tariff_rate: parseFloat(e.target.value) || '' })}
									placeholder="0.00"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Payment Processing Fee (%)</label>
								<input
									type="number"
									step="0.01"
									value={newCountryCost.payment_processing_fee || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, payment_processing_fee: parseFloat(e.target.value) || '' })}
									placeholder="0.00"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Discounts and Refunds (USD)</label>
								<input
									type="number"
									step="0.01"
									value={newCountryCost.discounts_and_refunds || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, discounts_and_refunds: parseFloat(e.target.value) || '' })}
									placeholder="0.00"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
								<input
									type="number"
									step="1"
									value={newCountryCost.quantity || ''}
									onChange={(e) => setNewCountryCost({ ...newCountryCost, quantity: parseInt(e.target.value) || '' })}
									placeholder="1"
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="w-full mt-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
								<BeautifulSelect
									options={[
										{ value: 'USD', label: 'USD ($)' },
										{ value: 'SEK', label: 'SEK (kr)' },
										{ value: 'EUR', label: 'EUR (€)' }
									]}
									value={newCountryCost.currency}
									selectClass='w-full'
									onChange={(e) => setNewCountryCost({ ...newCountryCost, currency: e })}
								/>
							</div>

							<div className="w-full gap-3 pt-4" style={{textAlign: 'center'}}>
								<Button
									variant='contained'
									type="button"
									onClick={() => {
										// Validate required fields
										if (!newCountryCost.country.trim()) {
											if (window.showPrimeToast) {
												window.showPrimeToast('Please enter a country name', 'error');
											}
											return;
										}

										if (editCountryCostIndex !== -1) {
											// Update existing country cost
											var updatedCountryCosts = [...countryCosts];
											updatedCountryCosts[editCountryCostIndex] = { ...newCountryCost };
											for (var key in updatedCountryCosts[editCountryCostIndex]) {
												if (updatedCountryCosts[editCountryCostIndex][key] === '') {
													updatedCountryCosts[editCountryCostIndex][key] = 0;
												}
											}
											setCountryCosts(updatedCountryCosts);

											// Show success message
											if (window.showPrimeToast) {
												window.showPrimeToast(`Updated country cost for ${newCountryCost.country}`, 'success');
											}
										} else {
											// Add the new country cost to the list
											var value = { ...newCountryCost };
											for (var key in value) {
												if (value[key] === '') {
													value[key] = 0;
												}
											}
											let updatedCountryCosts = [...countryCosts, { ...value }];
											setCountryCosts(updatedCountryCosts);

											// Show success message
											if (window.showPrimeToast) {
												window.showPrimeToast(`Added country cost for ${newCountryCost.country}`, 'success');
											}
										}

										// Reset the form and close modal
										setNewCountryCost({
											country: '',
											cost_of_goods: 0,
											shipping_cost: 0,
											vat_rate: 0,
											tariff_rate: 0,
											discounts_and_refunds: 0,
											payment_processing_fee: 0,
											quantity: 0,
											currency: 'USD'
										});
										setEditCountryCostIndex(-1);
										setShowCountryCostsSection(false);
									}}
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									disabled={!newCountryCost.country.trim()}
								>
									{editCountryCostIndex !== -1 ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
									{editCountryCostIndex !== -1 ? 'Update Country Cost' : 'Add Country Cost'}
								</Button>
							</div>
						</DialogContent>
					</BootstrapDialog>
				)
			}

			{/* Country Costs Manager Modal */}
			{showCountryCosts && selectedProductForCountryCosts && (
				<CountryCostsManager
					storeId={selectedProductForCountryCosts.storeId}
					productId={selectedProductForCountryCosts.id}
					productTitle={selectedProductForCountryCosts.title}
					onClose={() => {
						setShowCountryCosts(false);
						setSelectedProductForCountryCosts(null);
					}}
					onUpdate={(countryCosts) => {
						console.log('Country costs updated:', countryCosts);
						// Refresh the cost of goods data to show updated country costs
						fetchCostOfGoods(pagination.currentPage, false, true);
						// Show success message
						setError(null);
					}}
				/>
			)}
		</div>
	);
};

export default CostOfGoods; 