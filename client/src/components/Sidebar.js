import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingCart, 
  DollarSign, 
  Package,
  TrendingUp,
  Package2
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/ad-spend', icon: DollarSign, label: 'Ad Spend' },
    { path: '/cost-of-goods', icon: Package, label: 'Cost of Goods' },
    { path: '/product-analytics', icon: Package2, label: 'Product Analytics' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Shopify Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Revenue & Profit Analytics</p>
      </div>

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
    </div>
  );
};

export default Sidebar; 