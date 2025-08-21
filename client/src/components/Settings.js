import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, DollarSign, Globe } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useStore } from '../contexts/StoreContext';

const Settings = () => {
  const { 
    selectedCurrency, 
    setSelectedCurrency, 
    exchangeRates, 
    updateExchangeRates 
  } = useCurrency();
  
  const { selectedStore } = useStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [tempCurrency, setTempCurrency] = useState(selectedCurrency);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];

  const handleSave = () => {
    setSelectedCurrency(tempCurrency);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempCurrency(selectedCurrency);
    setIsOpen(false);
  };

  const refreshExchangeRates = async () => {
    setIsUpdatingRates(true);
    try {
      // In a real app, you would fetch live exchange rates from an API
      // For now, we'll simulate an update with slightly different rates
      const newRates = {
        SEK: 0.095 + (Math.random() - 0.5) * 0.01, // Small random variation
        EUR: 1.08 + (Math.random() - 0.5) * 0.02,
        GBP: 1.27 + (Math.random() - 0.5) * 0.02,
      };
      
      updateExchangeRates(newRates);
      
      // Show success message
      if (window.showPrimeToast) {
        window.showPrimeToast('Exchange rates updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      if (window.showPrimeToast) {
        window.showPrimeToast('Failed to update exchange rates', 'error');
      }
    } finally {
      setIsUpdatingRates(false);
    }
  };

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-200 w-full"
        title="Settings"
      >
        <SettingsIcon className="w-5 h-5 mr-3" />
        Settings
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <SettingsIcon size={24} className="text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Store Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Store</h3>
                <p className="text-lg font-semibold text-gray-900 capitalize">{selectedStore}</p>
              </div>

              {/* Currency Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-green-600" />
                  <h3 className="text-lg font-medium text-gray-900">Currency Settings</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Currency
                  </label>
                  <select
                    value={tempCurrency}
                    onChange={(e) => setTempCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    All monetary values will be displayed in the selected currency
                  </p>
                </div>

                {/* Exchange Rates */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-900">Exchange Rates (to USD)</h4>
                    <button
                      onClick={refreshExchangeRates}
                      disabled={isUpdatingRates}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isUpdatingRates ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {Object.entries(exchangeRates).map(([currency, rate]) => (
                      <div key={currency} className="flex justify-between">
                        <span className="text-blue-700">{currency}:</span>
                        <span className="font-medium text-blue-900">
                          {currency === 'USD' ? '1.00' : rate.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Note: Facebook ad spend data comes in SEK and will be automatically converted
                  </p>
                </div>
              </div>

              {/* Additional Settings Placeholder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe size={20} className="text-purple-600" />
                  <h3 className="text-lg font-medium text-gray-900">Additional Settings</h3>
                </div>
                <p className="text-sm text-gray-500">
                  More configuration options will be added here in future updates.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
