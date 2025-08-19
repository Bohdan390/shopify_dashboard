import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Calendar, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import CostOfGoodsLoader from './loaders/CostOfGoodsLoader';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import CostOfGoodsTableLoader from './loaders/CostOfGoodsTableLoader';
// Product Autocomplete Component
const ProductAutocomplete = ({ 
  value, 
  onChange, 
  placeholder, 
  onProductSelect, 
  className = "",
  disabled = false,
  required = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }

    const filtered = products.filter(product => 
      product.product_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ads/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setShowDropdown(true);
  };

  const handleProductSelect = (product) => {
    setSearchTerm(product.product_title || product.product_id);
    onChange(product.product_title || product.product_id);
    onProductSelect(product);
    setShowDropdown(false);
    
    // Show success message when product is selected
    if (window.showToast) {
      window.showToast.success('Product Selected', `Selected: ${product.product_title || 'No Title'} (ID: ${product.product_id})`);
    }
  };

  const handleFocus = () => {
    if (searchTerm.trim()) {
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow click events
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {showDropdown && filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredProducts.map((product) => (
            <button
              key={product.product_id}
              type="button"
              onClick={() => handleProductSelect(product)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 text-sm">
                  {product.product_title || 'No Title'}
                </span>
                <span className="text-xs text-gray-500">
                  ID: {product.product_id}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" variant="spinner" />
            <span className="ml-2 text-sm text-gray-500">Loading products...</span>
          </div>
        </div>
      )}
    </div>
  );
};

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

const CostOfGoods = () => {
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
  const [formData, setFormData] = useState({
    productId: '',
    productTitle: '',
    costPerUnit: '',
    quantity: '',
    totalCost: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  
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

  useEffect(() => {
    fetchCostOfGoods(1, true);
  }, [dateRange]);

  // Listen for sync completion from GlobalStoreSelector and refresh data
  useEffect(() => {
    if (syncCompleted > 0 || adsSyncCompleted > 0) {
      console.log('🔄 Sync completed, refreshing CostOfGoods data...');
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

  // Close Add Cost Entry Modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showForm && !event.target.closest('.add-cost-entry-modal')) {
        setShowForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showForm]);

  const fetchCostOfGoods = async (page = 1, resetPagination = false, showTableLoader = false) => {
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
        sortBy: 'date',
        sortOrder: 'desc'
      });
      
      const response = await axios.get(`/api/ads/cog?${params}`);
      
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
      
      if (window.showToast) {
        window.showToast.error('Error', 'Failed to load cost of goods data');
      }
    } finally {
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
          startDate: startDate.toISOString().split('T')[0],
          endDate: lastMonthEnd.toISOString().split('T')[0]
        });
        setShowDatePresets(false);
        
        if (window.showToast) {
          window.showToast.success('Date Range Updated', `Date range set to ${preset}`);
        }
        return;
      default:
        return;
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    setShowDatePresets(false);

    if (window.showToast) {
      window.showToast.success('Date Range Updated', `Date range set to ${preset}`);
    }
  };

  const handleStartDateSelect = (date) => {
    setDateRange(prev => ({ ...prev, startDate: date }));
    if (window.showToast) {
      window.showToast.info('Date Selected', `Start date set to ${date}`);
    }
  };

  const handleEndDateSelect = (date) => {
    setDateRange(prev => ({ ...prev, endDate: date }));
    if (window.showToast) {
      window.showToast.info('Date Selected', `End date set to ${date}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setAddingEntry(true);

      // Transform form data to match API expectations
      const apiData = {
        product_id: formData.productId,
        product_title: formData.productTitle,
        cost_per_unit: formData.costPerUnit,
        quantity: formData.quantity,
        total_cost: formData.totalCost,
        date: formData.date,
        store_id: selectedStore || 'buycosari'
      };

      if (editingEntry) {
        // Update existing entry
        await axios.put(`/api/ads/cog/${editingEntry.id}`, apiData);
        
        if (window.showToast) {
          window.showToast.success('Entry Updated', 'Cost of goods entry updated successfully');
        }
      } else {
        // Add new entry
        await axios.post('/api/ads/cog', apiData);
        
        if (window.showToast) {
          window.showToast.success('Entry Added', 'New cost of goods entry added successfully');
        }
      }

      setFormData({
        productId: '',
        productTitle: '',
        costPerUnit: '',
        quantity: '',
        totalCost: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      setEditingEntry(null);
      fetchCostOfGoods();
    } catch (error) {
      console.error('Error saving cost of goods:', error);
      
      if (window.showToast) {
        window.showToast.error('Error', 'Failed to save cost of goods entry. Please try again.');
      }
    } finally {
      setAddingEntry(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      productId: entry.product_id || '',
      productTitle: entry.product_title || '',
      costPerUnit: entry.cost_per_unit ? entry.cost_per_unit.toString() : '',
      quantity: entry.quantity ? entry.quantity.toString() : '',
      totalCost: entry.total_cost ? entry.total_cost.toString() : '',
      date: entry.date || new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Are you sure you want to delete this cost of goods entry?')) {
      return;
    }

    try {
      setDeletingEntry(entry.id);
      await axios.delete(`/api/ads/cog/${entry.id}`);
      
      if (window.showToast) {
        window.showToast.success('Entry Deleted', 'Cost of goods entry deleted successfully');
      }
      
      fetchCostOfGoods();
    } catch (error) {
      console.error('Error deleting cost of goods:', error);
      
      if (window.showToast) {
        window.showToast.error('Error', 'Failed to delete cost of goods entry. Please try again.');
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
      costPerUnit: '',
      quantity: '',
      totalCost: '',
      date: new Date().toISOString().split('T')[0]
    });
    
    if (window.showToast) {
      window.showToast.info('Cancelled', 'Operation cancelled');
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

  const totalCost = costOfGoods.reduce((sum, item) => sum + parseFloat(item.total_cost), 0);
  const totalQuantity = costOfGoods.reduce((sum, item) => sum + parseInt(item.quantity), 0);
  const avgCostPerUnit = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  const getChartData = () => {
    const data = [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

      const dailyCost = costOfGoods
        .filter(item => new Date(item.date) >= startOfDay && new Date(item.date) < endOfDay)
        .reduce((sum, item) => sum + parseFloat(item.total_cost), 0);

      const dailyQuantity = costOfGoods
        .filter(item => new Date(item.date) >= startOfDay && new Date(item.date) < endOfDay)
        .reduce((sum, item) => sum + parseInt(item.quantity), 0);

      const avgCost = dailyQuantity > 0 ? dailyCost / dailyQuantity : 0;

      data.push({
        date: currentDate.toISOString().split('T')[0],
        totalCost: dailyCost,
        avgCostPerUnit: avgCost
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
  };

  const getDailyCostData = () => {
    if (!costOfGoods || costOfGoods.length === 0) {
      return [];
    }

    // Group costs by date
    const dailyCostMap = new Map();
    
    costOfGoods.forEach(item => {
      const date = item.date;
      const totalCost = parseFloat(item.total_cost) || 0;
      
      if (dailyCostMap.has(date)) {
        dailyCostMap.set(date, dailyCostMap.get(date) + totalCost);
      } else {
        dailyCostMap.set(date, totalCost);
      }
    });

    // Convert to array and sort by date
    const sortedDailyCosts = Array.from(dailyCostMap.entries())
      .map(([date, totalCost]) => ({
        date: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        totalCost: totalCost
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return sortedDailyCosts;
  };

  const getProductCostData = () => {
    if (!costOfGoods || costOfGoods.length === 0) {
      return [];
    }

    const productCostMap = new Map();
    
    costOfGoods.forEach(item => {
      const productId = item.product_id;
      const productTitle = item.product_title || productId;
      const totalCost = parseFloat(item.total_cost) || 0;
      const quantity = parseInt(item.quantity) || 0;

      if (productCostMap.has(productId)) {
        const existing = productCostMap.get(productId);
        productCostMap.set(productId, {
          ...existing,
          totalCost: existing.totalCost + totalCost,
          quantity: existing.quantity + quantity
        });
      } else {
        productCostMap.set(productId, {
          product: productTitle,
          totalCost: totalCost,
          quantity: quantity
        });
      }
    });

    // Convert to array, sort by total cost (highest first), and take top 10
    const sortedProducts = Array.from(productCostMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    return sortedProducts;
  };

  // Reset to page 1 when page size changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    // Fetch new data with updated page size
    fetchCostOfGoods(1, true, true);
  }, [pageSize]);

  // Pagination component
  const PaginationControls = () => {
    console.log('🔍 PaginationControls called:', {
      costOfGoodsLength: costOfGoods?.length,
      pagination: pagination
    });
    
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost of Goods</h1>
          <p className="text-gray-600 mt-1">Track your product costs and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              setError(null);
              fetchCostOfGoods();
            }}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <LoadingSpinner size="sm" variant="spinner" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Cost Entry
          </button>
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
            <button
              onClick={() => fetchCostOfGoods()}
              className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
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
          </div>

          {/* Date Range Display */}
          <div className="text-xs text-gray-500">
            Selected: {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {refreshing ? (
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  formatCurrency(totalCost)
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
                  totalQuantity.toLocaleString()
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
                  formatCurrency(avgCostPerUnit)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost of Goods Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Cost Entries</h3>
        </div>

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
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add First Entry
                </button>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costOfGoods.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.product_title || item.product_id}</div>
                        <div className="text-sm text-gray-500">ID: {item.product_id}</div>
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
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          disabled={refreshing || deletingEntry === item.id}
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
                ))}
              </tbody>
            </table>
          )}
          
        </div>
        
        {/* Pagination Controls - Outside the overflow container */}
        {costOfGoods.length > 0 && <PaginationControls />}
      </div>

      {/* Add/Edit Cost Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 add-cost-entry-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEntry ? 'Edit Cost Entry' : 'Add Cost Entry'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID *</label>
                  <ProductAutocomplete
                    value={formData.productId}
                    onChange={(value) => setFormData({ ...formData, productId: value })}
                    onProductSelect={(product) => {
                      setFormData({
                        ...formData,
                        productId: product.product_id,
                        productTitle: product.product_title || product.product_id
                      });
                    }}
                    placeholder="Enter Product ID or Title"
                    disabled={refreshing}
                    required={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
                  <ProductAutocomplete
                    value={formData.productTitle}
                    onChange={(value) => setFormData({ ...formData, productTitle: value })}
                    onProductSelect={(product) => {
                      setFormData({
                        ...formData,
                        productId: product.product_id,
                        productTitle: product.product_title || product.product_id
                      });
                    }}
                    placeholder="Enter Product ID or Title"
                    disabled={refreshing}
                    required={true}
                  />
                </div>

                {/* Selected Product Info */}
                {formData.productId && formData.productTitle && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <div className="text-sm">
                        <span className="font-medium text-blue-900">Selected Product:</span>
                        <div className="text-blue-700">
                          <div><strong>Title:</strong> {formData.productTitle}</div>
                          <div><strong>ID:</strong> {formData.productId}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={addingEntry}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={addingEntry}
                >
                  {addingEntry ? (
                    <LoadingSpinner size="sm" variant="spinner" />
                  ) : (
                    editingEntry ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />
                  )}
                  {addingEntry ? 'Saving...' : (editingEntry ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default CostOfGoods; 