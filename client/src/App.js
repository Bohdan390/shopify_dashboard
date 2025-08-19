import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import AdSpend from './components/AdSpend';
import CostOfGoods from './components/CostOfGoods';
import ProductAnalytics from './components/ProductAnalytics';
import ProductTrendsChart from './components/ProductTrendsChart';
import Customers from './components/Customers';
import CustomerLTV from './components/CustomerLTV';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import ProtectedRoute from './components/ProtectedRoute';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
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
  const { selectedStore, setSelectedStore } = useStore();

  return (
    <ProtectedRoute>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/ad-spend" element={<AdSpend />} />
        <Route path="/cost-of-goods" element={<CostOfGoods />} />
        <Route path="/product-analytics" element={<ProductAnalytics />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customer-ltv" element={<CustomerLTV />} />
        {/* Protected Product Trends route - redirects to dashboard if not meonutrition */}
        <Route path="/product-trends" element={<ProtectedProductTrendsRoute />} />
      </Routes>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <SocketProvider>
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
              <ToastContainer />
            </div>
          </Router>
        </SocketProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App; 