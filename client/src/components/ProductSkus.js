import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import BeautifulSelect from './BeautifulSelect';
import {
    Plus, Edit, Trash2, Search, RefreshCw,
    Package, Hash, FileText, TrendingUp, Save, X, XCircle,
    DollarSign, ShoppingCart, BarChart3
} from 'lucide-react';

const ProductSkus = () => {
    const { selectedStore } = useStore();
    const navigate = useNavigate();
    const [productSkus, setProductSkus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 0
    });
    const [productRevenue, setProductRevenue] = useState({
        totalRevenue: 0,
        totalProfit: 0,
        totalQuantity: 0,
        avgOrderValue: 0
    });

    // Sort state
    const [sortConfig, setSortConfig] = useState({
        key: 'sale_price',
        direction: 'asc'
    });

    // Form state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        sku_id: '',
        sku_title: '',
        product_ids: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Product selection state
    const [availableProducts, setAvailableProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Campaign linking state
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedSku, setSelectedSku] = useState(null);
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    const [linkedCampaigns, setLinkedCampaigns] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [linkingCampaigns, setLinkingCampaigns] = useState(new Set()); // Track which campaigns are being linked/unlinked
    const [campaignSearchTerm, setCampaignSearchTerm] = useState(''); // Search term for campaigns in modal

    let isLoading = false;

    // Redirect if store is not meonutrition
    useEffect(() => {
        if (selectedStore && selectedStore !== 'meonutrition') {
            navigate('/product-analytics');
        }
    }, [selectedStore, navigate]);

    // Fetch product SKUs with revenue data
    const fetchProductSkus = async (page = 1, search = '') => {
        if (isLoading) return;
        isLoading = true;
        if (!selectedStore) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page,
                pageSize: pagination.pageSize,
                search: search,
                sortBy: sortConfig.key,
                sortDirection: sortConfig.direction
            });

            const response = await api.get(`/api/product-skus/${selectedStore}?${params}`);

            if (response.data.success) {
                setProductSkus(response.data.data);
                setProductRevenue({
                    totalRevenue: response.data.totalRevenue,
                    totalProfit: response.data.totalProfit,
                    totalQuantity: response.data.totalQuantity,
                    avgOrderValue: response.data.avgOrderValue
                })
                setPagination(prev => ({
                    ...prev,
                    currentPage: response.data.pagination.currentPage,
                    totalPages: response.data.pagination.totalPages,
                    totalItems: response.data.pagination.totalItems
                }));
            }
        } catch (error) {
            console.error('Error fetching product SKUs:', error);
        } finally {
            setLoading(false);
            isLoading = false;
        }
    };

    // Load data when store changes
    useEffect(() => {
        if (selectedStore) {
            fetchProductSkus(1, searchTerm);
            fetchAvailableProducts();
        }
    }, [selectedStore]);

    // Handle sort changes
    useEffect(() => {
        if (selectedStore && productSkus.length > 0) {
            // Only refetch if we already have data (not on initial load)
            fetchProductSkus(1, searchTerm);
        }
    }, [sortConfig]);

    // Close campaign linking modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showLinkModal && !event.target.closest('.link-modal')) {
                closeLinkModal();
            }
        };

        if (showLinkModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLinkModal]);

    // Fetch available products for selection
    const fetchAvailableProducts = async () => {
        if (!selectedStore) return;

        try {
            setLoadingProducts(true);
            const response = await api.get(`/api/ads/products?storeId=${selectedStore}`);

            console.log(response.data);
            setAvailableProducts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        // Search with current sort configuration
        fetchProductSkus(1, searchTerm);
    };

    // Handle pagination
    const handlePageChange = (page) => {
        fetchProductSkus(page, searchTerm);
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setPagination(prev => ({
            ...prev,
            pageSize: parseInt(newPageSize),
            currentPage: 1
        }));
        // Fetch data with new page size and current sort
        fetchProductSkus(1, searchTerm);
    };

    // Handle sorting
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
        // Fetch data with new sort configuration
    };

    // Get sort icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            );
        }
        
        if (sortConfig.direction === 'asc') {
            return (
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            );
        }
        
        return (
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        );
    };

    // Pagination Controls Component
    const PaginationControls = () => {
        if (pagination.totalPages <= 1) return null;

        // Generate smart page numbers
        const generatePageNumbers = () => {
            const current = pagination.currentPage;
            const total = pagination.totalPages;
            const pages = [];

            // Always show first page
            pages.push(1);

            if (total <= 7) {
                // If total pages <= 7, show all pages
                for (let i = 2; i <= total; i++) {
                    pages.push(i);
                }
            } else {
                // Smart pagination for larger page counts
                if (current <= 4) {
                    // Near the beginning
                    for (let i = 2; i <= 5; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(total);
                } else if (current >= total - 3) {
                    // Near the end
                    pages.push('...');
                    for (let i = total - 4; i <= total; i++) {
                        pages.push(i);
                    }
                } else {
                    // In the middle
                    pages.push('...');
                    for (let i = current - 1; i <= current + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(total);
                }
            }

            return pages;
        };

        const pageNumbers = generatePageNumbers();

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    {/* Pagination Info */}
                    <div className="flex items-center text-sm text-gray-700">
                        {loading && (
                            <div className="flex items-center mr-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                <span className="text-blue-600">Loading...</span>
                            </div>
                        )}
                        <span>
                            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                            {pagination.totalItems} product SKUs
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Show:</span>
                        <BeautifulSelect
                            value={pagination.pageSize}
                            onChange={handlePageSizeChange}
                            options={[
                                { value: 10, label: '10' },
                                { value: 20, label: '20' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' }
                            ]}
                            placeholder="Select"
                            disabled={loading}
                            className="w-24"
                            size="sm"
                        />
                        <span className="text-sm text-gray-500">per page</span>
                    </div>

                    {/* First page button */}
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.currentPage === 1 || loading}
                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === 1 || loading
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        title="First page"
                    >
                        «
                    </button>

                    {/* Previous button */}
                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1 || loading}
                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage > 1 && !loading
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                        {pageNumbers.map((page, index) => (
                            <React.Fragment key={index}>
                                {page === '...' ? (
                                    <span className="px-2 text-gray-500">...</span>
                                ) : (
                                    <button
                                        onClick={() => handlePageChange(page)}
                                        disabled={loading}
                                        className={`px-3 py-1 text-sm rounded-md ${page === pagination.currentPage
                                            ? 'bg-blue-600 text-white'
                                            : loading
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Next button */}
                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages || loading}
                        className={`px-3 py-1 text-sm rounded-md ${pagination.currentPage < pagination.totalPages && !loading
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Next
                    </button>

                    {/* Last page button */}
                    <button
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.currentPage === pagination.totalPages || loading}
                        className={`px-2 py-1 text-sm rounded-md ${pagination.currentPage === pagination.totalPages || loading
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        title="Last page"
                    >
                        »
                    </button>
                </div>
            </div>
        );
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            sku_id: '',
            sku_title: '',
            product_ids: ''
        });
        setSelectedProducts([]);
        setEditingId(null);
        setShowModal(false);
        setSubmitting(false);
    };

    // Open modal for adding new SKU
    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    // Open modal for editing
    const openEditModal = (sku) => {
        setFormData({
            sku_id: sku.sku_id,
            sku_title: sku.sku_title,
            product_ids: sku.product_ids
        });

        // Parse existing product IDs and set selected products
        if (sku.product_ids) {
            const productIds = sku.product_ids.split(',').filter(id => id.trim());
            const products = availableProducts.filter(p => productIds.includes(p.product_id.toString()));
            setSelectedProducts(products);
        } else {
            setSelectedProducts([]);
        }

        setEditingId(sku.sku_id);
        setShowModal(true);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Convert selected products to product_ids string
        const productIds = selectedProducts.map(p => p.product_id).join(',');

        try {
            if (editingId) {
                // Update existing
                await api.put(`/api/product-skus/${editingId}`, {
                    sku_id: formData.sku_id,
                    sku_title: formData.sku_title,
                    product_ids: productIds
                });
            } else {
                // Create new
                await api.post('/api/product-skus', {
                    store_id: selectedStore,
                    sku_id: formData.sku_id,
                    sku_title: formData.sku_title,
                    product_ids: productIds
                });
            }

            resetForm();
            fetchProductSkus(pagination.currentPage, searchTerm);

            // Show success message
            if (window.showPrimeToast) {
                window.showPrimeToast(
                    editingId ? 'Product SKU updated successfully!' : 'Product SKU created successfully!',
                    'success'
                );
            }
        } catch (error) {
            console.error('Error saving product SKU:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast(error.response?.data?.message || 'Error saving product SKU', 'error');
            } else {
                alert(error.response?.data?.message || 'Error saving product SKU');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Handle edit
    const handleEdit = (sku) => {
        openEditModal(sku);
    };

    // Product selection functions
    const handleProductSelect = (product) => {
        if (!selectedProducts.find(p => p.product_id === product.product_id)) {
            setSelectedProducts([...selectedProducts, product]);
        }
        else {
            setSelectedProducts(selectedProducts.filter(p => p.product_id !== product.product_id));
        }
    };

    const handleProductRemove = (productId) => {
        setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    };

    const filteredProducts = availableProducts.filter(product =>
        product.product_title?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.product_id?.toString().includes(productSearchTerm)
    );

    // Handle delete
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product SKU link?')) {
            return;
        }

        try {
            await api.delete(`/api/product-skus/${id}`);
            fetchProductSkus(pagination.currentPage, searchTerm);

            // Show success message
            if (window.showPrimeToast) {
                window.showPrimeToast('Product SKU deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting product SKU:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast('Error deleting product SKU', 'error');
            } else {
                alert('Error deleting product SKU');
            }
        }
    };

    // Campaign linking functions
    const openLinkModal = async (sku) => {
        setSelectedSku(sku);
        setShowLinkModal(true);
        setLoadingCampaigns(true);

        try {
            // Fetch available campaigns
            const campaignsResponse = await api.get('/api/analytics/available-campaigns', { params: { storeId: selectedStore } });
            setAvailableCampaigns(campaignsResponse.data);

            // Fetch existing links for this SKU
            const linksResponse = await api.get('/api/analytics/product-campaign-links', { 
                params: { storeId: selectedStore } 
            });
            const skuLinks = linksResponse.data.filter(link => link.product_sku === sku.sku_id);
            setLinkedCampaigns(skuLinks);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const handleLinkCampaign = async (campaign) => {
        try {
            setLinkingCampaigns(prev => new Set([...prev, campaign.campaign_id]));

            await api.post('/api/analytics/product-campaign-links', {
                product_id: selectedSku.sku_id,
                product_title: selectedSku.sku_title,
                store_id: selectedStore,
                product_sku: selectedSku.sku_id,
                campaign_id: campaign.campaign_id,
                campaign_name: campaign.campaign_name || campaign.campaign_id,
                platform: campaign.platform
            });

            // Refresh the links
            const linksResponse = await api.get('/api/analytics/product-campaign-links', { 
                params: { storeId: selectedStore } 
            });
            const skuLinks = linksResponse.data.filter(link => link.product_sku === selectedSku.sku_id);
            setLinkedCampaigns(skuLinks);

            // Show success message
            if (window.showPrimeToast) {
                window.showPrimeToast('Campaign linked successfully!', 'success');
            }
        } catch (error) {
            console.error('Error linking campaign:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast('Error linking campaign', 'error');
            }
        } finally {
            setLinkingCampaigns(prev => {
                const newSet = new Set(prev);
                newSet.delete(campaign.campaign_id);
                return newSet;
            });
        }
    };

    const handleUnlinkCampaign = async (linkId, campaignId) => {
        try {
            setLinkingCampaigns(prev => new Set([...prev, campaignId]));

            await api.post(`/api/analytics/product-campaign-links/${linkId}`, {
                storeId: selectedStore,
                productSku: selectedSku.sku_id
            });

            // Refresh the links
            const linksResponse = await api.get('/api/analytics/product-campaign-links', { 
                params: { storeId: selectedStore } 
            });
            const skuLinks = linksResponse.data.filter(link => link.product_sku === selectedSku.sku_id);
            setLinkedCampaigns(skuLinks);

            // Show success message
            if (window.showPrimeToast) {
                window.showPrimeToast('Campaign unlinked successfully!', 'success');
            }
        } catch (error) {
            console.error('Error unlinking campaign:', error);
            if (window.showPrimeToast) {
                window.showPrimeToast('Error unlinking campaign', 'error');
            }
        } finally {
            setLinkingCampaigns(prev => {
                const newSet = new Set(prev);
                newSet.delete(campaignId);
                return newSet;
            });
        }
    };

    const closeLinkModal = () => {
        setShowLinkModal(false);
        setSelectedSku(null);
        setAvailableCampaigns([]);
        setLinkedCampaigns([]);
        setLinkingCampaigns(new Set()); // Clear loading states
        setCampaignSearchTerm(''); // Clear search term when closing modal
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format product IDs
    const formatProductIds = (productIds) => {
        if (!productIds) return 'None';
        const ids = productIds.split(',').filter(id => id.trim());
        if (ids.length === 0) return 'None';
        if (ids.length <= 3) return ids.join(', ');
        return `${ids.slice(0, 3).join(', ')} +${ids.length - 3} more`;
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    if (!selectedStore) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="text-center text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Please select a store to manage product SKUs</p>
                </div>
            </div>
        );
    }

    // Show loading while redirecting for non-meonutrition stores
    if (selectedStore !== 'meonutrition') {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="text-center text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Redirecting to Product Analytics...</p>
                    <p className="text-sm mt-2">Product SKU management is only available for Meo Nutrition store</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Product SKU Management</h1>
                <p className="text-gray-600">Manage product SKU links for {selectedStore}</p>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center">
                        <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(productRevenue.totalRevenue)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center">
                        <Package className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {productRevenue.totalQuantity.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Profit</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {formatCurrency(productRevenue.totalProfit)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center">
                        <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                            <p className="text-2xl font-bold text-indigo-700">
                                {formatCurrency(productRevenue.avgOrderValue)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Actions Bar */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by SKU ID, title, or product IDs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchProductSkus(pagination.currentPage, searchTerm)}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Manage SKU
                        </button>
                    </div>
                </div>
            </div>

            {/* Product SKU Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {editingId ? 'Edit Product SKU' : 'Add New Product SKU'}
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* SKU Details */}
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            SKU Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sku_title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sku_title: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., Meo Nutrition Protein Powder"
                                        />
                                    </div>
                                </div>

                                {/* Product Selection */}
                                <div>
                                    {/* Selected Products Display */}
                                    {selectedProducts.length > 0 && (
                                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Products:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedProducts.map((product) => (
                                                    <div
                                                        key={product.product_id}
                                                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                                    >
                                                        <span>{product.product_title || `Product ${product.product_id}`}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleProductRemove(product.product_id)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Search and Selection */}
                                    <div className="border border-gray-300 rounded-lg p-4">
                                        <div className="mb-3">
                                            <input
                                                type="text"
                                                placeholder="Search products by title or ID..."
                                                value={productSearchTerm}
                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                            {loadingProducts ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                                    Loading products...
                                                </div>
                                            ) : filteredProducts.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    No products found
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-200">
                                                    {filteredProducts.map((product) => (
                                                        <div
                                                            key={product.product_id}
                                                            onClick={() => handleProductSelect(product)}
                                                            className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedProducts.find(p => p.product_id === product.product_id)
                                                                    ? 'bg-blue-50 border-l-4 border-blue-500'
                                                                    : ''
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {product.product_title || `Product ${product.product_id}`}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        ID: {product.product_id}
                                                                    </div>
                                                                </div>
                                                                {selectedProducts.find(p => p.product_id === product.product_id) && (
                                                                    <div className="text-blue-600">
                                                                        <Package className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200 justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Saving...
                                            </div>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                {editingId ? 'Update' : 'Create'}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={submitting}
                                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Linking Modal */}
            {showLinkModal && selectedSku && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden link-modal flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Link Campaigns to Product SKU</h3>
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {selectedSku.sku_title}
                                </p>
                            </div>
                            <button
                                onClick={closeLinkModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 flex flex-col overflow-hidden">
                            {/* Available Campaigns */}
                            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                                <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                    Available Campaigns
                                </h4>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        {availableCampaigns.length} total campaigns
                                    </span>
                                    <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                                        {linkedCampaigns.length} linked
                                    </span>
                                </div>
                            </div>

                            {/* Campaign Search */}
                            <div className="mb-6 flex-shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search campaigns by name or platform..."
                                        value={campaignSearchTerm}
                                        onChange={(e) => setCampaignSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>

                            {loadingCampaigns ? (
                                <div className="text-center py-12 flex-1 flex items-center justify-center">
                                    <div>
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600">Loading campaigns...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                                    {(() => {
                                        // Filter campaigns based on search term
                                        const filteredCampaigns = availableCampaigns.filter(campaign => {
                                            const searchLower = campaignSearchTerm.toLowerCase();
                                            const campaignName = (campaign.campaign_name || campaign.campaign_id || '').toLowerCase();
                                            const platform = (campaign.platform || '').toLowerCase();

                                            return campaignName.includes(searchLower) || platform.includes(searchLower);
                                        });

                                        return filteredCampaigns.length > 0 ? (
                                            <>
                                                {/* Search Results Info */}
                                                {campaignSearchTerm && (
                                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <p className="text-sm text-blue-700">
                                                            Showing {filteredCampaigns.length} of {availableCampaigns.length} campaigns matching "{campaignSearchTerm}"
                                                        </p>
                                                    </div>
                                                )}

                                                {filteredCampaigns.map((campaign, index) => {
                                                    const isLinked = linkedCampaigns.some(link => link.campaign_id === campaign.campaign_id);
                                                    const linkedCampaign = linkedCampaigns.find(link => link.campaign_id === campaign.campaign_id);

                                                    return (
                                                        <div
                                                            key={campaign.campaign_id}
                                                            className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${isLinked
                                                                ? 'border-green-300 bg-green-50 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:border-blue-300'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-gray-900 mb-2">{campaign.campaign_name || campaign.campaign_id}</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${campaign.platform === 'facebook'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-red-100 text-red-800'
                                                                            }`}>
                                                                            {campaign.platform === 'facebook' ? 'Facebook' : 'Google'}
                                                                        </span>
                                                                        {isLinked && (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                                ✓ Linked
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isLinked ? (
                                                                        <button
                                                                            onClick={() => handleUnlinkCampaign(linkedCampaign.id, campaign.campaign_id)}
                                                                            disabled={linkingCampaigns.has(campaign.campaign_id)}
                                                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${linkingCampaigns.has(campaign.campaign_id)
                                                                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                                                                : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg transform hover:scale-105'
                                                                                }`}
                                                                        >
                                                                            {linkingCampaigns.has(campaign.campaign_id) ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                                    Unlinking...
                                                                                </div>
                                                                            ) : (
                                                                                'Unlink'
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleLinkCampaign(campaign)}
                                                                            disabled={linkingCampaigns.has(campaign.campaign_id)}
                                                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${linkingCampaigns.has(campaign.campaign_id)
                                                                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                                                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                                                                                }`}
                                                                        >
                                                                            {linkingCampaigns.has(campaign.campaign_id) ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                                    Linking...
                                                                                </div>
                                                                            ) : (
                                                                                '+ Link'
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Search className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    {campaignSearchTerm ? 'No campaigns found' : 'No campaigns available'}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {campaignSearchTerm ? `No campaigns match "${campaignSearchTerm}"` : 'Sync your ad platforms first'}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Product SKUs Table */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Product SKU Links ({pagination.totalItems})
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Click on any row to link/unlink campaigns for that SKU
                    </p>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-500">Loading product SKUs...</p>
                    </div>
                ) : productSkus.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No product SKUs found</p>
                        <p className="text-sm">Create your first product SKU link to get started</p>
                    </div>
                ) : (
                    <>
                        {/* Top Pagination Controls */}
                        <PaginationControls />
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('sku_title')}
                                                disabled={loading}
                                                className={`flex items-center space-x-1 transition-colors ${!loading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            >
                                                <span>SKU Title</span>
                                                {getSortIcon('sku_title')}
                                            </button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('total_revenue')}
                                                disabled={loading}
                                                className={`flex items-center space-x-1 transition-colors ${!loading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            >
                                                <span>Total Revenue</span>
                                                {getSortIcon('total_revenue')}
                                            </button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('total_quantity')}
                                                disabled={loading}
                                                className={`flex items-center space-x-1 transition-colors ${!loading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            >
                                                <span>Ad Spend</span>
                                                {getSortIcon('total_quantity')}
                                            </button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('order_count')}
                                                disabled={loading}
                                                className={`flex items-center space-x-1 transition-colors ${!loading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            >
                                                <span>Cost of Goods</span>
                                                {getSortIcon('order_count')}
                                            </button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('avg_order_value')}
                                                disabled={loading}
                                                className={`flex items-center space-x-1 transition-colors ${!loading ? 'hover:text-gray-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                            >
                                                <span>Profit</span>
                                                {getSortIcon('avg_order_value')}
                                            </button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {productSkus.map((sku) => (
                                        <tr 
                                            key={sku.sku_id} 
                                            className="hover:bg-blue-50 hover:border-l-4 hover:border-blue-500 cursor-pointer transition-all duration-200 border-l-4 border-transparent"
                                            onClick={() => openLinkModal(sku)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <FileText className="w-4 h-4 text-green-600 mr-2" />
                                                    <span className="text-sm text-gray-900">
                                                        {sku.sku_title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <DollarSign className="w-4 h-4 text-green-600 mr-2" />
                                                    <span className="text-sm font-semibold text-green-700">
                                                        {formatCurrency(sku.total_revenue)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Package className="w-4 h-4 text-blue-600 mr-2" />
                                                    <span className="font-medium">{formatCurrency(sku.ad_spend)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <ShoppingCart className="w-4 h-4 text-purple-600 mr-2" />
                                                    <span className="font-medium">{formatCurrency(sku.cost_of_goods)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <BarChart3 className="w-4 h-4 text-indigo-600 mr-2" />
                                                    <span className="text-sm font-medium text-indigo-700">
                                                        {formatCurrency(sku.total_profit)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(sku);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(sku.sku_id);
                                                        }}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <PaginationControls />
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductSkus;
