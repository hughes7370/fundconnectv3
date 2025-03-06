'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

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
        setError(error instanceof Error ? error.message : 'An error occurred');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Saved Searches</h1>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="text-center py-12 bg-white shadow sm:rounded-lg">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No saved searches</h3>
              <p className="mt-1 text-sm text-gray-500">
                Save your fund searches to quickly access them later.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/investor/funds')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Find Funds
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {savedSearches.map((search) => (
                  <li key={search.id}>
                    <div className="px-4 py-4 sm:px-6">
                      {editingSearch?.id === search.id ? (
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Search name"
                          />
                          <div className="ml-4 flex-shrink-0">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="mr-2 font-medium text-primary hover:text-primary-dark"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSearch(null)}
                              className="font-medium text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary truncate">
                            {search.name}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {formatDate(search.created_at)}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {formatCriteria(search.criteria)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApplySearch(search)}
                              className="text-primary hover:text-primary-dark font-medium"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => handleEditSearch(search)}
                              className="text-gray-600 hover:text-gray-900 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleAlerts(search.id, search.alerts_enabled)}
                              className={`${search.alerts_enabled ? 'text-green-600 hover:text-green-900' : 'text-gray-600 hover:text-gray-900'} font-medium`}
                            >
                              {search.alerts_enabled ? 'Alerts On' : 'Alerts Off'}
                            </button>
                            <button
                              onClick={() => handleDeleteSearch(search.id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 