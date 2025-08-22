import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

const G = require('../config/global');

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
  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem('selectedCurrency', selectedCurrency);
  }, [selectedCurrency]);

  // Convert amount from source currency to target currency
  const convertCurrency = (amount, fromCurrency = 'USD', toCurrency = null) => {
    if (!amount || amount === 0) return 0;
    
    const targetCurrency = toCurrency || selectedCurrency;
    
    if (fromCurrency === targetCurrency) return amount;
    
    // First convert to USD, then to target currency
    const usdAmount = amount * G.currencyRates[fromCurrency];
    const targetAmount = usdAmount / G.currencyRates[targetCurrency];
    
    return targetAmount;
  };

  // Format currency based on selected currency
  const formatCurrency = (amount, sourceCurrency = 'USD') => {
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

  const displayCurrency = (amount, sourceCurrency = 'USD') => {
      if (!amount || amount === 0) return '0';
  
      const currencyOptions = {
        USD: { locale: 'en-US', currency: 'USD' },
        SEK: { locale: 'sv-SE', currency: 'SEK' },
        EUR: { locale: 'de-DE', currency: 'EUR' },
        GBP: { locale: 'en-GB', currency: 'GBP' },
      };
      
      const options = currencyOptions[sourceCurrency];

      if (sourceCurrency == "SEK") {
        console.log(new Intl.NumberFormat(options.locale, {
          style: 'currency',
          currency: options.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount))
      }
      
      return new Intl.NumberFormat(options.locale, {
        style: 'currency',
        currency: options.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
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

  const value = {
    selectedCurrency,
    setSelectedCurrency,
    convertCurrency,
    displayCurrency,
    formatCurrency,
    getCurrencySymbol,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
