import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState(
    localStorage.getItem('selectedCurrency') || 'USD'
  );
  
  const [exchangeRates, setExchangeRates] = useState({
    SEK: 0.095, // 1 SEK = 0.095 USD (approximate)
    USD: 1.0,
    EUR: 1.08, // 1 EUR = 1.08 USD (approximate)
    GBP: 1.27, // 1 GBP = 1.27 USD (approximate)
  });

  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem('selectedCurrency', selectedCurrency);
  }, [selectedCurrency]);

  // Convert amount from source currency to target currency
  const convertCurrency = (amount, fromCurrency = 'SEK', toCurrency = null) => {
    if (!amount || amount === 0) return 0;
    
    const targetCurrency = toCurrency || selectedCurrency;
    
    if (fromCurrency === targetCurrency) return amount;
    
    // First convert to USD, then to target currency
    const usdAmount = amount * exchangeRates[fromCurrency];
    const targetAmount = usdAmount / exchangeRates[targetCurrency];
    
    return targetAmount;
  };

  // Format currency based on selected currency
  const formatCurrency = (amount, sourceCurrency = 'SEK') => {
    if (!amount || amount === 0) return '0';
    
    const convertedAmount = convertCurrency(amount, sourceCurrency, selectedCurrency);
    
    const currencyOptions = {
      USD: { locale: 'en-US', currency: 'USD' },
      SEK: { locale: 'sv-SE', currency: 'SEK' },
      EUR: { locale: 'de-DE', currency: 'EUR' },
      GBP: { locale: 'en-GB', currency: 'GBP' },
    };
    
    const options = currencyOptions[selectedCurrency] || currencyOptions.USD;
    
    return new Intl.NumberFormat(options.locale, {
      style: 'currency',
      currency: options.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  };

  // Get currency symbol
  const getCurrencySymbol = () => {
    const symbols = {
      USD: '$',
      SEK: 'kr',
      EUR: '€',
      GBP: '£',
    };
    return symbols[selectedCurrency] || '$';
  };

  // Update exchange rates (could be called periodically or from an API)
  const updateExchangeRates = (newRates) => {
    setExchangeRates(prev => ({ ...prev, ...newRates }));
  };

  const value = {
    selectedCurrency,
    setSelectedCurrency,
    exchangeRates,
    updateExchangeRates,
    convertCurrency,
    formatCurrency,
    getCurrencySymbol,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
