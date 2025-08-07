import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import AdSpend from './components/AdSpend';
import CostOfGoods from './components/CostOfGoods';
import CampaignRoi from './components/CampaignRoi';
import ProductAnalytics from './components/ProductAnalytics';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/ad-spend" element={<AdSpend />} />
            <Route path="/cost-of-goods" element={<CostOfGoods />} />
            <Route path="/campaign-roi" element={<CampaignRoi />} />
            <Route path="/product-analytics" element={<ProductAnalytics />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 