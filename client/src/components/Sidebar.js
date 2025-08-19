import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingCart, 
  DollarSign, 
  Package,
  TrendingUp,
  Package2,
  Users,
  LogOut
} from 'lucide-react';
import GlobalStoreSelector from './GlobalStoreSelector';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { selectedStore } = useStore();
  const { logout, sessionExpiry } = useAuth();

  const navigation = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/customer-ltv', icon: Users, label: 'Customer LTV' },
    { path: '/ad-spend', icon: DollarSign, label: 'Ad Spend' },
    { path: '/cost-of-goods', icon: Package, label: 'Cost of Goods' },
    { path: '/product-analytics', icon: Package2, label: 'Product Analytics' },
    // Only show Product Trends for meonutrition store
    // ...(selectedStore === 'meonutrition' ? [{ path: '/product-trends', icon: TrendingUp, label: 'Product Trends' }] : []),
  ];

  const formatTimeRemaining = () => {
    if (!sessionExpiry) return '';
    const now = new Date().getTime();
    const remaining = sessionExpiry - now;
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col" style={{height: "100vh", overflow: "auto"}}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Shopify Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Revenue & Profit Analytics</p>
      </div>

      {/* Global Store Selector */}
      <GlobalStoreSelector />

      {/* Navigation */}
      <nav className="flex-1 mt-6">
        <div className="px-4">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors duration-200 ${
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 