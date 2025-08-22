import React from 'react';

const AdsCampaignTableLoader = () => {
	return (
		<div className="animate-pulse">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Campaign Name
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Total Spend
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Total Clicks
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Platform
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Display Currency
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{[...Array(10)].map((_, index) => (
						<tr key={index}>
							{/* Campaign Name */}
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="flex items-center">
									<div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
									<div className="h-4 bg-gray-200 rounded w-32"></div>
								</div>
							</td>
							{/* Total Spend */}
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="h-4 bg-gray-200 rounded w-20"></div>
							</td>
							{/* Total Clicks */}
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="h-4 bg-gray-200 rounded w-16"></div>
							</td>
							{/* Platform */}
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="h-6 bg-gray-200 rounded-full w-20"></div>
							</td>
							{/* Display Currency */}
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="flex items-center space-x-3">
									<div className="flex items-center">
										<div className="h-4 bg-gray-200 rounded w-12 mr-2"></div>
										<div className="h-8 bg-gray-200 rounded w-28"></div>
									</div>
									<div className="flex items-center space-x-1">
										<div className="h-6 bg-gray-200 rounded w-12"></div>
										<div className="h-6 bg-gray-200 rounded w-12"></div>
										<div className="h-6 bg-gray-200 rounded w-12"></div>
									</div>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default AdsCampaignTableLoader;
