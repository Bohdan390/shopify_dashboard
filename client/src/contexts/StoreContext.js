import React, { createContext, useContext, useState } from 'react';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState('buycosari');

  const value = {
    selectedStore,
    setSelectedStore,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};
