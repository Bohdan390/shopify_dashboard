import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Package, Calendar, Filter, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import ProductAnalyticsLoader from './loaders/ProductAnalyticsLoader';
import ProductAnalyticsTableLoader from './loaders/ProductAnalyticsTableLoader';
import ProductGroups from './ProductGroups';
import BeautifulSelect from './BeautifulSelect';
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

const ProductAnalytics = () => {
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [productAnalytics, setProductAnalytics] = useState({ products: [], pagination: {} });
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const { selectedStore, adsSyncCompleted } = useStore();
  const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			startDate: formatLocalDate(thirtyDaysAgo),
			endDate: formatLocalDate(today)
		};
  });
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState('total_revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // New state for input field
  const [filters, setFilters] = useState({
    minRevenue: '',
    maxRevenue: '',
    minProfit: '',
    maxProfit: '',
    minROI: '',
    maxROI: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Manual linking state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [linkingCampaigns, setLinkingCampaigns] = useState(new Set()); // Track which campaigns are being linked/unlinked
  const [campaignSearchTerm, setCampaignSearchTerm] = useState(''); // Search term for campaigns in modal
  const [showProductGroupsModal, setShowProductGroupsModal] = useState(false);

  // Listen for ads sync completion from GlobalStoreSelector
  
  const fetchProductAnalytics = async (isTableOnly = false) => {
    try {
      if (isTableOnly) {
        setTableLoading(true);
      } else {
        setLoading(true);
      }
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        storeId: selectedStore,
        sortBy,
        sortOrder,
        search: searchTerm,
        page: currentPage,
        limit: itemsPerPage,
        ...filters
      };

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await axios.get('/api/analytics/product', { params });
      setProductAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching product analytics:', error);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    // Use table-only loading for pagination and sorting changes
    const isTableOnly = currentPage > 1 || sortBy !== 'total_revenue' || sortOrder !== 'desc';
    fetchProductAnalytics(isTableOnly);
  }, [dateRange, sortBy, sortOrder, searchTerm, filters, currentPage, itemsPerPage, selectedStore]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    // Reset to first page when sorting
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const clearFilters = () => {
    setFilters({
      minRevenue: '',
      maxRevenue: '',
      minProfit: '',
      maxProfit: '',
      minROI: '',
      maxROI: ''
    });
    setSearchTerm('');
    setSearchInput('');
    setCurrentPage(1);
  };

  // Manual linking functions
  const handleProductClick = async (product) => {
    setSelectedProduct(product);
    setShowLinkModal(true);
    setLoadingCampaigns(true);

    try {
      // Fetch available campaigns
      const campaignsResponse = await axios.get('/api/analytics/available-campaigns', { params: { storeId: selectedStore } });
      setAvailableCampaigns(campaignsResponse.data);

      // Fetch existing links for this product
      const linksResponse = await axios.get('/api/analytics/product-campaign-links');
      const productLinks = linksResponse.data.filter(link => link.product_sku === product.product_sku);
      setLinkedCampaigns(productLinks);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleLinkCampaign = async (campaign) => {
    try {
      setLinkingCampaigns(prev => new Set([...prev, campaign.campaign_id]));

      await axios.post('/api/analytics/product-campaign-links', {
        product_id: selectedProduct.product_id, // Use product_title as product_id
        product_title: selectedProduct.product_title,
        store_id: selectedStore,
        product_sku: selectedProduct.product_sku,
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name || campaign.campaign_id, // Use campaign name if available
        platform: campaign.platform
      });

      // Refresh the links
      const linksResponse = await axios.get('/api/analytics/product-campaign-links');
      const productLinks = linksResponse.data.filter(link => link.product_sku === selectedProduct.product_sku);
      setLinkedCampaigns(productLinks);

      // Refresh product analytics to show updated data
      fetchProductAnalytics();
    } catch (error) {
      console.error('Error linking campaign:', error);
    } finally {
      setLinkingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaign.campaign_id);
        return newSet;
      });
    }
  };

  const handleUnlinkCampaign = async (linkId, campaignId) => {
    try {
      setLinkingCampaigns(prev => new Set([...prev, campaignId]));

      await axios.post(`/api/analytics/product-campaign-links/${linkId}`, {
        storeId: selectedStore,
        productSku: selectedProduct.product_sku
      });

      // Refresh the links
      const linksResponse = await axios.get('/api/analytics/product-campaign-links');
      const productLinks = linksResponse.data.filter(link => link.product_sku === selectedProduct.product_sku);
      setLinkedCampaigns(productLinks);

      // Refresh product analytics to show updated data
      fetchProductAnalytics();
    } catch (error) {
      console.error('Error unlinking campaign:', error);
    } finally {
      setLinkingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setSelectedProduct(null);
    setAvailableCampaigns([]);
    setLinkedCampaigns([]);
    setLinkingCampaigns(new Set()); // Clear loading states
    setCampaignSearchTerm(''); // Clear search term when closing modal
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

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

  // Close filters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilters && !event.target.closest('.filters-container')) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  // Close link modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLinkModal && !event.target.closest('.link-modal')) {
        closeLinkModal();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLinkModal]);

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

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const SortableHeader = ({ field, children, currentSortBy, currentSortOrder }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none ${!tableLoading ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
      onClick={!tableLoading ? () => handleSort(field) : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {getSortIcon(field)}
      </div>
    </th>
  );

  const getSortIcon = (key) => {
    if (sortBy !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const PaginationControls = () => {
    if (!productAnalytics.pagination) return null;

    // Generate smart page numbers
    const generatePageNumbers = () => {
      const current = productAnalytics.pagination.page;
      const total = productAnalytics.pagination.totalPages;
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
            <span>
              Showing {((productAnalytics.pagination.page - 1) * productAnalytics.pagination.limit) + 1} to{' '}
              {Math.min(productAnalytics.pagination.page * productAnalytics.pagination.limit, productAnalytics.pagination.totalCount)} of{' '}
              {productAnalytics.pagination.totalCount} results
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <div>
              <BeautifulSelect
                value={itemsPerPage}
                onChange={(value) => setItemsPerPage(parseInt(value))}
                options={[
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                placeholder="Select"
                disabled={loading || tableLoading}
                className="w-24"
                size="sm"
              />
            </div>
            <span className="text-sm text-gray-500">per page</span>
          </div>

          {/* First page button */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={productAnalytics.pagination.page === 1 || loading || tableLoading}
            className={`px-2 py-1 text-sm rounded-md ${productAnalytics.pagination.page === 1 || loading || tableLoading
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            title="First page"
          >
            «
          </button>

          {/* Previous button */}
          <button
            onClick={() => setCurrentPage(productAnalytics.pagination.page - 1)}
            disabled={!productAnalytics.pagination.hasPrevPage || loading || tableLoading}
            className={`px-3 py-1 text-sm rounded-md ${productAnalytics.pagination.hasPrevPage && !loading && !tableLoading
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
                    onClick={() => setCurrentPage(page)}
                    disabled={loading || tableLoading}
                    className={`px-3 py-1 text-sm rounded-md ${page === productAnalytics.pagination.page
                      ? 'bg-primary-600 text-white'
                      : loading || tableLoading
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
            onClick={() => setCurrentPage(productAnalytics.pagination.page + 1)}
            disabled={!productAnalytics.pagination.hasNextPage || loading || tableLoading}
            className={`px-3 py-1 text-sm rounded-md ${productAnalytics.pagination.hasNextPage && !loading && !tableLoading
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
          >
            Next
          </button>

          {/* Last page button */}
          <button
            onClick={() => setCurrentPage(productAnalytics.pagination.totalPages)}
            disabled={productAnalytics.pagination.page === productAnalytics.pagination.totalPages || loading || tableLoading}
            className={`px-2 py-1 text-sm rounded-md ${productAnalytics.pagination.page === productAnalytics.pagination.totalPages || loading || tableLoading
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
    return <ProductAnalyticsLoader />
  }
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Analytics</h1>
        <p className="text-gray-600">Analyze performance across all products</p>
      </div>

      {/* Product Groups Analytics Button - Only for meonutrition store */}

      {/* Beautiful Date Range Filter with Calendar */}
      <div className="card mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
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
                        <button
                          onClick={() => handleDatePreset('today')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => handleDatePreset('yesterday')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Yesterday
                        </button>
                        <button
                          onClick={() => handleDatePreset('last7days')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => handleDatePreset('last30days')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Last 30 Days
                        </button>
                        <button
                          onClick={() => handleDatePreset('last90days')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Last 90 Days
                        </button>
                        <button
                          onClick={() => handleDatePreset('thisMonth')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          This Month
                        </button>
                        <button
                          onClick={() => handleDatePreset('lastMonth')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Last Month
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View Product Groups Analytics Button - Right side */}
            {selectedStore === 'meonutrition' && (
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Actions</label>
                <button
                  onClick={() => setShowProductGroupsModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  View Product Groups Analytics
                </button>
              </div>
            )}
          </div>

          {/* Date Range Display */}
          <div className="text-xs text-gray-500">
            Selected: {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    disabled={loading || tableLoading}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              {/* Search Button */}
              <button
                onClick={handleSearchSubmit}
                disabled={loading || tableLoading}
                className="px-4 py-2 rounded-lg border transition-colors bg-blue-600 text-white border-blue-600 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                Search
              </button>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors ${showFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
              >
                <Filter className="w-4 h-4 mr-2 inline" />
                Filters
              </button>

              {/* Clear Filters */}
              {(searchTerm || Object.values(filters).some(v => v !== '')) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>


          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 filters-container">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Revenue</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minRevenue}
                    onChange={(e) => handleFilterChange('minRevenue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Revenue</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={filters.maxRevenue}
                    onChange={(e) => handleFilterChange('maxRevenue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Profit</label>
                  <input
                    type="number"
                    placeholder="-∞"
                    value={filters.minProfit}
                    onChange={(e) => handleFilterChange('minProfit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Profit</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={filters.maxProfit}
                    onChange={(e) => handleFilterChange('maxProfit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min ROI %</label>
                  <input
                    type="number"
                    placeholder="-∞"
                    value={filters.minROI}
                    onChange={(e) => handleFilterChange('minROI', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max ROI %</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={filters.maxROI}
                    onChange={(e) => handleFilterChange('maxROI', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {productAnalytics.products && productAnalytics.products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(productAnalytics.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ad Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(productAnalytics.totalAdSpend)}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className={`text-2xl font-bold ${productAnalytics.totalProfit >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
                  }`}>
                  {formatCurrency(productAnalytics.totalProfit)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-gray-900">{productAnalytics.pagination?.totalCount || productAnalytics.products.length}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-gray-600">{productAnalytics.pagination?.totalCount || productAnalytics.products.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Analytics Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Product Performance</h2>
        </div>
        <PaginationControls />
        {tableLoading ? (
          <ProductAnalyticsTableLoader />
        ) : productAnalytics.products && productAnalytics.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="product_title" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    Product
                  </SortableHeader>
                  <SortableHeader field="total_revenue" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    Revenue
                  </SortableHeader>
                  <SortableHeader field="ad_spend" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    Ad Spend
                  </SortableHeader>
                  <SortableHeader field="profit" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    Profit
                  </SortableHeader>
                  <SortableHeader field="roi_percentage" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    ROI
                  </SortableHeader>
                  <SortableHeader field="order_count" currentSortBy={sortBy} currentSortOrder={sortOrder}>
                    Orders
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productAnalytics.products.map((product, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleProductClick(product)}
                    title="Click to manage campaign links"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.sku_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatCurrency(product.total_revenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(product.ad_spend)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(product.profit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${product.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatPercentage(product.roi_percentage)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.order_count} orders
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Package className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">No product analytics data available for the selected period</p>
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationControls />
      </div>

      {/* Manual Link Modal */}
      {showLinkModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden link-modal flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Link Campaigns to Product</h3>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {selectedProduct.product_title}
                </p>
              </div>
              <button
                onClick={closeLinkModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              {/* Available Campaigns */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  Available Campaigns
                </h4>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {availableCampaigns.length} total campaigns
                  </span>
                  <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    {linkedCampaigns.length} linked
                  </span>
                </div>
              </div>

              {/* Campaign Search */}
              <div className="mb-6 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search campaigns by name or platform..."
                    value={campaignSearchTerm}
                    onChange={(e) => setCampaignSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {loadingCampaigns ? (
                <div className="text-center py-12 flex-1 flex items-center justify-center">
                  <div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading campaigns...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                  {(() => {
                    // Filter campaigns based on search term
                    const filteredCampaigns = availableCampaigns.filter(campaign => {
                      const searchLower = campaignSearchTerm.toLowerCase();
                      const campaignName = (campaign.campaign_name || campaign.campaign_id || '').toLowerCase();
                      const platform = (campaign.platform || '').toLowerCase();

                      return campaignName.includes(searchLower) || platform.includes(searchLower);
                    });

                    return filteredCampaigns.length > 0 ? (
                      <>
                        {/* Search Results Info */}
                        {campaignSearchTerm && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                              Showing {filteredCampaigns.length} of {availableCampaigns.length} campaigns matching "{campaignSearchTerm}"
                            </p>
                          </div>
                        )}

                        {filteredCampaigns.map((campaign, index) => {
                          const isLinked = linkedCampaigns.some(link => link.campaign_id === campaign.campaign_id);
                          const linkedCampaign = linkedCampaigns.find(link => link.campaign_id === campaign.campaign_id);

                          return (
                            <div
                              key={campaign.campaign_id}
                              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${isLinked
                                ? 'border-green-300 bg-green-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 mb-2">{campaign.campaign_name || campaign.campaign_id}</div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${campaign.platform === 'facebook'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-red-100 text-red-800'
                                      }`}>
                                      {campaign.platform === 'facebook' ? 'Facebook' : 'Google'}
                                    </span>
                                    {isLinked && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        ✓ Linked
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isLinked ? (
                                    <button
                                      onClick={() => handleUnlinkCampaign(linkedCampaign.id, campaign.campaign_id)}
                                      disabled={linkingCampaigns.has(campaign.campaign_id)}
                                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${linkingCampaigns.has(campaign.campaign_id)
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg transform hover:scale-105'
                                        }`}
                                    >
                                      {linkingCampaigns.has(campaign.campaign_id) ? (
                                        <div className="flex items-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          Unlinking...
                                        </div>
                                      ) : (
                                        'Unlink'
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleLinkCampaign(campaign)}
                                      disabled={linkingCampaigns.has(campaign.campaign_id)}
                                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${linkingCampaigns.has(campaign.campaign_id)
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                                        }`}
                                    >
                                      {linkingCampaigns.has(campaign.campaign_id) ? (
                                        <div className="flex items-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          Linking...
                                        </div>
                                      ) : (
                                        '+ Link'
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {campaignSearchTerm ? 'No campaigns found' : 'No campaigns available'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {campaignSearchTerm ? `No campaigns match "${campaignSearchTerm}"` : 'Sync your ad platforms first'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
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

      {/* Product Groups Analytics Modal */}
      {showProductGroupsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Product Groups Analytics</h2>
              <button
                onClick={() => setShowProductGroupsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ProductGroups selectedStore={selectedStore} dateRange={dateRange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics; 