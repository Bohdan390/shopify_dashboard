import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import CostOfGoodsLoader from './loaders/CostOfGoodsLoader';

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
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
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
      </div>
    </div>
  );
};

const CostOfGoods = () => {
  const [costOfGoods, setCostOfGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingEntry, setAddingEntry] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
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

  useEffect(() => {
    fetchCostOfGoods();
  }, [dateRange]);

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

  const fetchCostOfGoods = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/ads/cog?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setCostOfGoods(response.data);
    } catch (error) {
      console.error('Error fetching cost of goods:', error);
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setAddingEntry(true);

      if (editingEntry) {
        // Update existing entry
        await axios.put(`/api/ads/cog/${editingEntry.id}`, formData);
      } else {
        // Add new entry
        await axios.post('/api/ads/cog', formData);
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
      alert('Failed to save cost of goods entry. Please try again.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      productId: entry.product_id || '',
      productTitle: entry.product_title || '',
      costPerUnit: entry.cost_per_unit.toString(),
      quantity: entry.quantity.toString(),
      totalCost: entry.total_cost.toString(),
      date: entry.date
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
      fetchCostOfGoods();
    } catch (error) {
      console.error('Error deleting cost of goods:', error);
      alert('Failed to delete cost of goods entry. Please try again.');
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

  if (loading) {
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
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Cost Entry
        </button>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            </div>
            <div className="p-3 rounded-lg bg-danger-50">
              <Package className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary-50">
              <div className="w-6 h-6 text-primary-600">📦</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Cost/Unit</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgCostPerUnit)}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning-50">
              <div className="w-6 h-6 text-warning-600">📊</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-900">{costOfGoods.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="w-6 h-6 text-gray-600">🏷️</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost of Goods Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costOfGoods.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            {costOfGoods.length > 0 && (
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
            )}
            <Bar dataKey="total_cost" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost of Goods Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost of Goods Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Cost/Unit</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Quantity</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Total Cost</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {costOfGoods.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.product_title || 'N/A'}</div>
                      {item.product_id && (
                        <div className="text-xs text-gray-500">ID: {item.product_id}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(item.cost_per_unit)}</td>
                  <td className="py-3 px-4">{item.quantity}</td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(item.total_cost)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDate(item.date)}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary-600 hover:text-primary-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-danger-600 hover:text-danger-900"
                      title="Delete"
                      disabled={deletingEntry === item.id}
                    >
                      {deletingEntry === item.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-danger-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {costOfGoods.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No cost of goods data found</p>
          </div>
        )}
      </div>

      {/* Add Cost Entry Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md add-cost-entry-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingEntry ? 'Edit Cost Entry' : 'Add Cost Entry'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                <input
                  type="text"
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  className="input-field"
                  placeholder="Enter product ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <input
                  type="text"
                  value={formData.productTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, productTitle: e.target.value }))}
                  className="input-field"
                  placeholder="Enter product title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, costPerUnit: e.target.value }))}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="input-field"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalCost: e.target.value }))}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center"
                  disabled={addingEntry}
                >
                  {addingEntry ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Entry'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary flex-1"
                  disabled={addingEntry}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostOfGoods; 