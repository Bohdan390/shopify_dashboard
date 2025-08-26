import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CountryCostsManager = ({ storeId, productId, productTitle, onClose, onUpdate }) => {
  const [countries, setCountries] = useState([]);
  const [countryCosts, setCountryCosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    country_code: '',
    cost_of_goods: '',
    shipping_cost: '',
    vat_rate: '',
    tariff_rate: '',
    currency: 'USD'
  });

  useEffect(() => {
    fetchData();
  }, [storeId, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [countriesRes, costsRes] = await Promise.all([
        axios.get('/api/country-costs/countries/list'),
        axios.get(`/api/country-costs/${storeId}/${productId}`)
      ]);
      
      setCountries(countriesRes.data);
      const costsMap = {};
      costsRes.data.forEach(cost => {
        costsMap[cost.country_code] = cost;
      });
      setCountryCosts(costsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`/api/country-costs/${storeId}/${productId}`, formData);
      setCountryCosts(prev => ({
        ...prev,
        [formData.country_code]: response.data.data
      }));
      if (onUpdate) onUpdate(response.data.countryCosts);
      resetForm();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      country_code: '',
      cost_of_goods: '',
      shipping_cost: '',
      vat_rate: '',
      tariff_rate: '',
      currency: 'USD'
    });
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Country Costs: {productTitle}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Country List */}
          <div className="w-1/2 border-r p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Countries</h3>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
              >
                + Add Country
              </button>
            </div>

            <div className="space-y-3">
              {countries.map(country => {
                const cost = countryCosts[country.country_code];
                return (
                  <div key={country.country_code} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{country.country_name}</span>
                      {cost ? (
                        <span className="text-green-600 text-sm">${cost.cost_of_goods + cost.shipping_cost}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">No costs set</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="w-1/2 p-6">
            {showForm ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <h3 className="text-lg font-medium mb-4">Add Country Costs</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select country</option>
                      {countries.map(country => (
                        <option key={country.country_code} value={country.country_code}>
                          {country.country_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cost of Goods</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_of_goods}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_of_goods: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Shipping Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.shipping_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, shipping_cost: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">VAT Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.vat_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, vat_rate: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tariff Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tariff_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tariff_rate: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Select a country to add costs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryCostsManager;
