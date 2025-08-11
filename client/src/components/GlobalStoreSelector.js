import React from 'react';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';

const GlobalStoreSelector = () => {
  const { selectedStore, setSelectedStore } = useStore();

  const storeOptions = [
    { value: 'buycosari', label: 'Buycosari.com' },
    { value: 'meonutrition', label: 'Meonutrition.com' }
  ];

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <label className="block text-xs font-medium text-gray-600 mb-2">Store</label>
      <BeautifulSelect
        value={selectedStore}
        onChange={(value) => setSelectedStore(value)}
        options={storeOptions}
        placeholder="Select Store"
        size="sm"
        className="w-full"
      />
    </div>
  );
};

export default GlobalStoreSelector;
