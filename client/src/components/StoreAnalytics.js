import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import StoreAnalyticsLoader from './loaders/StoreAnalyticsLoader';

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
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 20 }, (_, i) => currentMonth.getFullYear() - 10 + i).map(year => (
                    <button
                      key={year}
                      onClick={() => selectYear(year)}
                      className={`px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors ${
                        year === currentMonth.getFullYear() ? 'bg-blue-100 text-blue-700 font-medium' : ''
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

const StoreAnalytics = () => {
  const [storeAnalytics, setStoreAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const fetchStoreAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/store', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          page: currentPage,
          limit: itemsPerPage,
          sortBy,
          sortOrder
        }
      });
      setStoreAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching store analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreAnalytics();
  }, [dateRange]);

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

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Analytics</h1>
        <p className="text-gray-600">Analyze performance across all stores</p>
      </div>

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
          
          {/* Date Range Display */}
          <div className="text-xs text-gray-500">
            Selected: {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {storeAnalytics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(storeAnalytics.reduce((sum, store) => sum + store.revenue, 0))}
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
                  {formatCurrency(storeAnalytics.reduce((sum, store) => sum + store.ad_spend, 0))}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(storeAnalytics.reduce((sum, store) => sum + store.profit, 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Stores</p>
                <p className="text-2xl font-bold text-gray-900">{storeAnalytics.length}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-gray-600">{storeAnalytics.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Analytics Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Store Performance</h2>
        </div>
        
        {loading ? (
          <StoreAnalyticsLoader />
        ) : storeAnalytics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ad Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaigns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storeAnalytics.map((store, index) => (
                  <tr key={store.store_id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {store.store_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatCurrency(store.revenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(store.ad_spend)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        store.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(store.profit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        store.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(store.roi_percentage)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {store.campaigns?.length || 0} campaigns
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {store.products?.length || 0} products
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
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">No store analytics data available for the selected period</p>
          </div>
        )}
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
    </div>
  );
};

export default StoreAnalytics; 