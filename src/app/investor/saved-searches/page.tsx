'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

type SavedSearch = {
  id: string;
  name: string;
  criteria: {
    strategy?: string;
    minSize?: string;
    maxSize?: string;
    geography?: string;
    sector?: string;
  };
  created_at: string;
  alerts_enabled: boolean;
};

export default function SavedSearches() {
  const router = useRouter();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        const { data, error } = await supabase
          .from('saved_searches')
          .select('*')
          .eq('investor_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setSavedSearches(data || []);
      } catch (error) {
        console.error('Error loading saved searches:', error);
        setError('Failed to load saved searches');
      } finally {
        setLoading(false);
      }
    };
    
    loadSavedSearches();
  }, [router]);

  const handleDeleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSavedSearches(savedSearches.filter(search => search.id !== id));
    } catch (error) {
      console.error('Error deleting saved search:', error);
      alert('Failed to delete saved search');
    }
  };

  const handleEditSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setSearchName(search.name);
  };

  const handleSaveEdit = async () => {
    if (!editingSearch) return;
    
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ name: searchName })
        .eq('id', editingSearch.id);
        
      if (error) throw error;
      
      setSavedSearches(savedSearches.map(search => 
        search.id === editingSearch.id ? { ...search, name: searchName } : search
      ));
      
      setEditingSearch(null);
    } catch (error) {
      console.error('Error updating saved search:', error);
      alert('Failed to update saved search');
    }
  };

  const handleToggleAlerts = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ alerts_enabled: !currentValue })
        .eq('id', id);
        
      if (error) throw error;
      
      setSavedSearches(savedSearches.map(search => 
        search.id === id ? { ...search, alerts_enabled: !currentValue } : search
      ));
    } catch (error) {
      console.error('Error toggling alerts:', error);
      alert('Failed to update alert settings');
    }
  };

  const handleApplySearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    
    if (search.criteria.strategy) params.set('strategy', search.criteria.strategy);
    if (search.criteria.minSize) params.set('minSize', search.criteria.minSize);
    if (search.criteria.maxSize) params.set('maxSize', search.criteria.maxSize);
    if (search.criteria.geography) params.set('geography', search.criteria.geography);
    if (search.criteria.sector) params.set('sector', search.criteria.sector);
    
    router.push(`/investor/funds?${params.toString()}`);
  };

  const formatCriteria = (criteria: SavedSearch['criteria']) => {
    const parts = [];
    
    if (criteria.strategy) parts.push(`Strategy: ${criteria.strategy}`);
    if (criteria.minSize) parts.push(`Min Size: $${criteria.minSize}M`);
    if (criteria.maxSize) parts.push(`Max Size: $${criteria.maxSize}M`);
    if (criteria.geography) parts.push(`Geography: ${criteria.geography}`);
    if (criteria.sector) parts.push(`Sector: ${criteria.sector}`);
    
    return parts.join(' • ') || 'No filters applied';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-primary">Saved Searches</h1>
            <Link 
              href="/investor/funds" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Funds
            </Link>
          </div>
        </div>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12 bg-white rounded-lg shadow-md border border-gray-100">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-500">Loading your saved searches...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 border border-red-100 shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-10 border border-gray-100 flex flex-col items-center justify-center">
              <div className="bg-gray-50 rounded-full p-6 mb-4">
                <svg
                  className="h-16 w-16 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">No saved searches</h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Save your fund searches with specific filters to quickly access them later and receive alerts when new matching funds are added.
              </p>
              <div className="flex items-center bg-blue-50 p-4 rounded-lg border border-blue-100 max-w-md text-left">
                <div className="bg-blue-100 rounded-full p-2 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 text-sm mb-1">How to save a search</h4>
                  <p className="text-sm text-blue-700">
                    Go to the Find Funds page, set your filters, and click "Save Search" to save your criteria for easy access later.
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/investor/funds"
                  className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Go to Find Funds
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criteria
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alerts
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedSearches.map((search, idx) => (
                      <tr key={search.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-primary">{search.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            {formatCriteria(search.criteria)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(search.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleToggleAlerts(search.id, search.alerts_enabled)}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${search.alerts_enabled ? 'bg-accent-green focus:ring-accent-green' : 'bg-gray-200 focus:ring-primary'}`}
                            aria-pressed="false"
                          >
                            <span className="sr-only">Toggle alerts</span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${search.alerts_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                            ></span>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-3 justify-end">
                            <button
                              onClick={() => handleApplySearch(search)}
                              className="text-primary hover:text-primary-dark flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Apply
                            </button>
                            <button
                              onClick={() => handleEditSearch(search)}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSearch(search.id)}
                              className="text-red-600 hover:text-red-800 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Edit search modal */}
        {editingSearch && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingSearch(null)}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Edit Saved Search
                      </h3>
                      <div className="mt-4">
                        <label htmlFor="searchName" className="block text-sm font-medium text-gray-700">
                          Search Name
                        </label>
                        <input
                          type="text"
                          name="searchName"
                          id="searchName"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleSaveEdit}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setEditingSearch(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 