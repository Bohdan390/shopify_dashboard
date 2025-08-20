import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import BeautifulSelect from './BeautifulSelect';
import { CheckCircle, AlertCircle, Info, Clock, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';

const GlobalStoreSelector = () => {
	const { selectedStore, setSelectedStore } = useStore();
	const [syncInfo, setSyncInfo] = useState(null);
	const [loading, setLoading] = useState(false);
	const [syncingOrders, setSyncingOrders] = useState(false);
	const [syncingAds, setSyncingAds] = useState(false);
	const [syncProgress, setSyncProgress] = useState(null);
	const [syncStep, setSyncStep] = useState('');
	const [syncType, setSyncType] = useState(''); // 'orders' or 'ads'

	const storeOptions = [
		{ value: 'buycosari', label: 'Buycosari.com' },
		{ value: 'meonutrition', label: 'Meonutrition.com' },
		{ value: 'nomobark', label: 'Nomobark.com' },
		{ value: 'dermao', label: 'Dermao.com' },
		{ value: 'gamoseries', label: 'Gamoseries.com' },
		{ value: 'cosara', label: 'Cosara.com' },
	];

	// Get socket from context
	const { socket } = useSocket();

	// WebSocket event handlers
	useEffect(() => {
		if (!socket) return;

		socket.on('global_syncProgress', (data) => {
			updateSyncProgress(data);
		});

		socket.on('global_adsSyncProgress', (data) => {
			updateSyncProgress(data);
		});

		// Cleanup event listeners when component unmounts or socket changes
		return () => {
			if (socket) {
				socket.off('global_syncProgress');
				socket.off('global_adsSyncProgress');
			}
		};
	}, [socket]);

	const updateSyncProgress = (data) => {
		setSyncProgress(data);
		// Update sync step based on progress
		if (data.stage === 'completed') {
			window.location.reload()
		} else if (data.stage === 'error') {
			setSyncStep('Error occurred');
			setSyncProgress(null);
			setTimeout(() => setSyncStep(''), 2000);
		} else {
			setSyncStep(data.message);
		}
	}

	// Fetch real sync data
	const fetchSyncStatus = async (storeId) => {
		try {
			setLoading(true);
			const response = await axios.get(`/api/analytics/sync-status?storeId=${storeId}`);

			if (response.data.success) {
				const data = response.data.data;
				const lastSync = data.last_sync_date;
				const lastAdsSync = data.last_ads_sync_date;
				// Calculate status based on last sync time
				let syncStatus = 'overdue';

				if (lastSync) {
					const lastSyncDate = new Date(lastSync);
					const now = new Date();
					const diffInHours = Math.floor((now - lastSyncDate) / (1000 * 60 * 60));

					if (diffInHours < 6) {
						syncStatus = 'recent';
					} else if (diffInHours < 18) {
						syncStatus = 'normal';
					} else {
						syncStatus = 'overdue';
					}
				} else {
					syncStatus = 'never';
				}

				let syncAdsStatus = 'overdue';

				if (lastAdsSync) {
					const lastAdsSyncDate = new Date(lastAdsSync);
					const now = new Date();
					const diffInHours = Math.floor((now - lastAdsSyncDate) / (1000 * 60 * 60));

					if (diffInHours < 6) {
						syncAdsStatus = 'recent';
					} else if (diffInHours < 18) {
						syncAdsStatus = 'normal';
					} else {
						syncAdsStatus = 'overdue';
					}
				} else {
					syncAdsStatus = 'never';
				}

				setSyncInfo({
					syncStatus,
					syncAdsStatus,
					lastSyncDate: lastSync,
					lastAdsSyncDate: lastAdsSync,
					lastSync: formatLastSync(lastSync),
					lastAdsSync: formatLastSync(lastAdsSync),
				});
			}
		} catch (error) {
			console.error('Error fetching sync status:', error);
			setSyncInfo({
				status: 'unknown',
				lastSync: 'Error',
				warning: 'Failed to load'
			});
		} finally {
			setLoading(false);
		}
	};

	// Handle manual sync orders
	const handleSyncNow = async () => {
		if (!selectedStore) return;

		try {
			setSyncingOrders(true);
			setSyncType('orders');
			setSyncProgress(null); // Clear previous progress
			setSyncStep('Starting orders sync...');

			// Pass socket ID for real-time progress updates
			const response = await axios.post('/api/shopify/sync-orders', {
				syncDate: syncInfo.lastSyncDate, // Today's date
				limit: 250,    // Fetch 250 orders per page (Shopify's maximum)
				socketId: socket?.id, // Pass socket ID for WebSocket communication
				storeId: selectedStore // Pass selected store ID
			});

			// Progress updates will come via WebSocket
			// The syncStep will be updated by the WebSocket progress handler

		} catch (error) {
			console.error('Error syncing orders:', error);
			setSyncStep('Error occurred');
			setSyncProgress(null);
			setSyncType('');
			setTimeout(() => setSyncStep(''), 2000); // Clear error after 2 seconds
			alert('Failed to sync orders. Please try again.');
		}
	};

	// Handle manual sync ads
	const handleSyncAds = async () => {
		if (!selectedStore) return;
		
		try {
			setSyncingAds(true);
			setSyncType('ads');
			setSyncProgress(null);
			setSyncStep('Starting ads sync...');

			await axios.post('/api/ads/sync-windsor', {
				from: "global",
				startDate: syncInfo.lastAdsSyncDate,
				storeId: selectedStore,
				socketId: socket?.id // Pass socket ID for real-time progress
			});

			// Progress updates will come via WebSocket
			// The syncStep will be updated by the WebSocket progress handler

		} catch (error) {
			console.error('Error syncing ads:', error);
			setSyncStep('Error occurred');
			setSyncProgress(null);
			setSyncType('');
			setTimeout(() => setSyncStep(''), 2000); // Clear error after 2 seconds
			alert('Failed to sync ads. Please try again.');
		} finally {
		}
	};

	// Format last sync time
	const formatLastSync = (dateString) => {
		if (!dateString) return '----';
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInHours / 24);
		const diffInMinutes = Math.floor(diffInHours * 60);

		if (diffInMinutes < 30) return 'Just now';
		if (diffInHours < 1) return `${diffInMinutes}m ago`;
		if (diffInDays >= 1) return `${diffInDays}d ago`;
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	};

	const getStatusIcon = (status) => {
		switch (status) {
			case 'recent': return CheckCircle;
			case 'normal': return Clock;
			case 'overdue': return AlertCircle;
			case 'never': return AlertCircle;
			default: return Info;
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'recent': return 'text-green-600';
			case 'normal': return 'text-blue-600';
			case 'overdue': return 'text-orange-600';
			case 'never': return 'text-red-600';
			default: return 'text-gray-600';
		}
	};

	// Fetch sync status when store changes
	useEffect(() => {
		if (selectedStore) {
			fetchSyncStatus(selectedStore);
		}
	}, [selectedStore]);

	// Show loading state
	if (loading || !syncInfo) {
		return (
			<div className="px-4 py-3 border-b border-gray-200">
				<label className="block text-xs font-medium text-gray-600 mb-2">Store</label>
				<BeautifulSelect
					value={selectedStore}
					onChange={(value) => {
						setSelectedStore(value);
						localStorage.setItem("selectedStore", value);
					}}
					options={storeOptions}
					placeholder="Select Store"
					size="sm"
					className="w-full"
				/>

				<div className="mt-4 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Status:</span>
						<div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Last sync date:</span>
						<div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
					</div>
				</div>
			</div>
		);
	}

	const StatusIcon = getStatusIcon(syncInfo.syncStatus);
	const AdsStatusIcon = getStatusIcon(syncInfo.syncAdsStatus);

	return (
		<>
			{/* Sync Loading Overlay */}
			{(syncingOrders || syncingAds) && (
				<div className="fixed inset-0 bg-white bg-opacity-100 z-[60] flex items-center justify-center">
					<div className="text-center mx-4">
						
							<>
								<RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									{syncType === 'orders' ? 'Syncing Orders' : 'Syncing Ads'}
								</h3>
								<p className="text-gray-600 mb-2">
									{syncType === 'orders' 
										? 'Fetching orders from Shopify and calculating analytics...'
										: 'Fetching ads data from Windsor.ai and updating analytics...'
									}
								</p>

								{/* Progress Bar */}
								{syncProgress && (
									<div className="mb-4">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium text-gray-700">
												{syncProgress.message}
											</span>
											<span className="text-sm font-bold text-blue-600">
												{syncProgress.progress}%
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-3" style={{maxWidth: "30vw", position:"relative", left:"50%", transform:"translateX(-50%)"}}>
											<div
												key={`progress-${syncProgress.progress}`}
												className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
												style={{ width: `${syncProgress.progress}%` }}
											></div>
										</div>
										{syncProgress.current && syncProgress.total !== 'unlimited' && (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncType === 'orders' 
													? `${syncProgress.current} / ${syncProgress.total} orders`
													: `${syncProgress.current} / ${syncProgress.total} campaigns`
												}
											</div>
										)}
										{syncProgress.total === 'unlimited' && (
											<div className="text-xs text-blue-600 font-medium mt-1">
												{syncType === 'orders' 
													? `${syncProgress.current ? syncProgress.current : 0} orders processed`
													: syncProgress.campaignsSaved 
														? `${syncProgress.campaignsSaved} campaigns, ${syncProgress.adSpendRecordsSaved} records saved`
														: 'Processing ads data...'
												}
											</div>
										)}
									</div>
								)}

								{syncStep && !syncProgress && (
									<p className="text-sm text-blue-600 font-medium">{syncStep}</p>
								)}
								<p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
							</>
					</div>
				</div>
			)}

			<div className="px-4 py-3 border-b border-gray-200">
				<label className="block text-xs font-medium text-gray-600 mb-2">Store</label>
				<BeautifulSelect
					value={selectedStore}
					onChange={(value) => {
						setSelectedStore(value);
						localStorage.setItem("selectedStore", value);
					}}
					options={storeOptions}
					placeholder="Select Store"
					size="sm"
					className="w-full"
				/>

				{/* Beautiful Sync Info with Status Icon - Orders */}
				<div className="mt-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Status:</span>
						<div className={`flex items-center gap-1`}>
							<StatusIcon className={`w-4 h-4 ${getStatusColor(syncInfo.syncStatus)}`} />
							<span className={`text-sm font-medium ${getStatusColor(syncInfo.syncStatus)} capitalize`}>
								{syncInfo.syncStatus === 'never' ? 'Never synced' : syncInfo.syncStatus}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Last sync date:</span>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-gray-900">
								{syncInfo.lastSync}
							</span>
						</div>
					</div>
					<div className="flex items-center justify-between" style={{ marginTop: 5 }}>
						<span className="text-sm text-gray-600"></span>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-gray-900">
								{syncInfo.lastSyncDate ? new Date(syncInfo.lastSyncDate).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
									minute: '2-digit',
									hour: '2-digit',
									minute: '2-digit',
									second: '2-digit',
								}) : '----'}
							</span>
						</div>
					</div>
					{/* Sync Orders Button */}
					<div>
						<button
							onClick={handleSyncNow}
							disabled={syncingOrders || syncingAds}
							className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${(syncingOrders || syncingAds)
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:bg-blue-800'
								}`}
						>
							{(syncingOrders || syncingAds) ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin" />
									Syncing...
								</>
							) : (
								<>
									<RefreshCw className="w-4 h-4" />
									Sync Orders
								</>
							)}
						</button>
					</div>
				</div>

				{/* Beautiful Sync Info with Status Icon - Ads */}
				<div className="mt-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Status:</span>
						<div className={`flex items-center gap-1`}>
							<AdsStatusIcon className={`w-4 h-4 ${getStatusColor(syncInfo.syncAdsStatus)}`} />
							<span className={`text-sm font-medium ${getStatusColor(syncInfo.syncAdsStatus)} capitalize`}>
								{syncInfo.syncAdsStatus === 'never' ? 'Never synced' : syncInfo.syncAdsStatus}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">Last sync date:</span>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-gray-900">
								{syncInfo.lastAdsSync}
							</span>
						</div>
					</div>
					<div className="flex items-center justify-between" style={{ marginTop: 5 }}>
						<span className="text-sm text-gray-600"></span>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-gray-900">
								{
									syncInfo.syncAdsStatus == "never" ? "----" :
										new Date(syncInfo.lastAdsSyncDate).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
											minute: '2-digit',
											hour: '2-digit',
											minute: '2-digit',
											second: '2-digit',
										})}
							</span>
						</div>
					</div>
					{/* Sync Ads Button */}
					<div>
						<button
							onClick={handleSyncAds}
							disabled={syncingOrders || syncingAds}
							className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${(syncingOrders || syncingAds)
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:bg-blue-800'
								}`}
						>
							{(syncingOrders || syncingAds) ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin" />
									Syncing...
								</>
							) : (
								<>
									<RefreshCw className="w-4 h-4" />
									Sync Ads
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

export default GlobalStoreSelector;
