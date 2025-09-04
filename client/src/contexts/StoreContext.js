import React, { createContext, useContext, useState, useCallback } from 'react';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState(localStorage.getItem("selectedStore") || "buycosari");
  const [syncCompleted, setSyncCompleted] = useState(0);
  const [adsSyncCompleted, setAdsSyncCompleted] = useState(0);
  const [syncCustomerLtv, setSyncCustomerLtv] = useState(false);
  const [syncProductLtv, setSyncProductLtv] = useState(false);

  const notifySyncComplete = useCallback(() => {
    setSyncCompleted(prev => prev + 1);
  }, []);

  const notifyAdsSyncComplete = useCallback(() => {
    setAdsSyncCompleted(prev => prev + 1);
  }, []);

  const value = {
    selectedStore,
    setSelectedStore,
    syncCompleted,
    adsSyncCompleted,
    notifySyncComplete,
    notifyAdsSyncComplete,
    syncCustomerLtv,
    syncProductLtv,
    setSyncCustomerLtv,
    setSyncProductLtv,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};
