import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import AdSpend from './components/AdSpend';
import CostOfGoods from './components/CostOfGoods';
import CampaignRoi from './components/CampaignRoi';
import ProductAnalytics from './components/ProductAnalytics';
import ProductTrendsChart from './components/ProductTrendsChart';
import Customers from './components/Customers';
import Sidebar from './components/Sidebar';
import { StoreProvider, useStore } from './contexts/StoreContext';
import './App.css';

// Protected Route component for Product Trends
const ProtectedProductTrendsRoute = () => {
  const { selectedStore } = useStore();
  
  if (selectedStore !== 'meonutrition') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <ProductTrendsChart />;
};

function AppRoutes() {
  const { selectedStore } = useStore();

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/ad-spend" element={<AdSpend />} />
      <Route path="/cost-of-goods" element={<CostOfGoods />} />
      <Route path="/campaign-roi" element={<CampaignRoi />} />
      <Route path="/product-analytics" element={<ProductAnalytics />} />
      <Route path="/customers" element={<Customers />} />
      {/* Protected Product Trends route - redirects to dashboard if not meonutrition */}
      <Route path="/product-trends" element={<ProtectedProductTrendsRoute />} />
    </Routes>
  );
}

function App() {
  return (
    <StoreProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 overflow-auto">
            <AppRoutes />
          </div>
        </div>
      </Router>
    </StoreProvider>
  );
}

export default App; 