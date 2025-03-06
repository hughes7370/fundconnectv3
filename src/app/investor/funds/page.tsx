'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type Fund = {
  id: string;
  name: string;
  size: number;
  minimum_investment: number;
  strategy: string;
  sector_focus: string;
  geography: string;
  agent_name: string;
  agent_firm: string;
  description: string | null;
  fund_logo_url: string | null;
  target_return: number | null;
};

type FilterState = {
  strategy: string;
  minSize: string;
  maxSize: string;
  geography: string;
  sector: string;
};

export default function InvestorFunds() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    strategy: searchParams.get('strategy') || '',
    minSize: searchParams.get('minSize') || '',
    maxSize: searchParams.get('maxSize') || '',
    geography: searchParams.get('geography') || '',
    sector: searchParams.get('sector') || '',
  });
  
  const [strategies, setStrategies] = useState<string[]>([]);
  const [geographies, setGeographies] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  
  useEffect(() => {
    const loadFunds = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Check if the new columns exist by trying to select them
        // This will be caught in the error handler if they don't exist
        try {
          const { data: testData, error: testError } = await supabase
            .from('funds')
            .select('description, fund_logo_url, target_return')
            .limit(1);
          
          // If we get here, the columns exist
          console.log('Enhanced fund profile columns exist');
          
          // Build query with all columns
          let query = supabase
            .from('funds')
            .select(`
              id,
              name,
              size,
              minimum_investment,
              strategy,
              sector_focus,
              geography,
              description,
              fund_logo_url,
              target_return,
              agents:uploaded_by_agent_id(name, firm)
            `);
          
          // Apply filters and execute query
          applyFiltersAndExecuteQuery(query);
        } catch (columnError) {
          console.log('Enhanced fund profile columns do not exist yet, using basic query');
          
          // Build query with only the original columns
          let query = supabase
            .from('funds')
            .select(`
              id,
              name,
              size,
              minimum_investment,
              strategy,
              sector_focus,
              geography,
              agents:uploaded_by_agent_id(name, firm)
            `);
          
          // Apply filters and execute query
          applyFiltersAndExecuteQuery(query);
        }
      } catch (error: any) {
        console.error('Error loading funds:', error);
        setError(error.message || 'An error occurred while loading funds');
      } finally {
        setLoading(false);
      }
    };
    
    const applyFiltersAndExecuteQuery = async (query: any) => {
      // Apply filters
      if (filters.strategy) {
        query = query.eq('strategy', filters.strategy);
      }
      
      if (filters.geography) {
        query = query.ilike('geography', `%${filters.geography}%`);
      }
      
      if (filters.sector) {
        query = query.ilike('sector_focus', `%${filters.sector}%`);
      }
      
      if (filters.minSize) {
        query = query.gte('size', parseInt(filters.minSize) * 1000000); // Convert to millions
      }
      
      if (filters.maxSize) {
        query = query.lte('size', parseInt(filters.maxSize) * 1000000); // Convert to millions
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Format results
      const formattedFunds = (data || []).map((fund: any) => {
        const agentData = Array.isArray(fund.agents) ? fund.agents[0] : fund.agents;
        
        // Use type assertion to handle potentially missing fields
        const fundData = fund as any;
        
        return {
          id: fund.id,
          name: fund.name,
          size: fund.size,
          minimum_investment: fund.minimum_investment,
          strategy: fund.strategy,
          sector_focus: fund.sector_focus,
          geography: fund.geography,
          // Use null for fields that might not exist yet
          description: fundData.description || null,
          fund_logo_url: fundData.fund_logo_url || null,
          target_return: fundData.target_return || null,
          agent_name: agentData?.name || 'Unknown',
          agent_firm: agentData?.firm || 'Unknown',
        };
      });
      
      setFunds(formattedFunds);
      
      // Load filter options (for dropdowns)
      await loadFilterOptions();
    };
    
    const loadFilterOptions = async () => {
      try {
        // Get unique strategies
        const { data: strategyData } = await supabase
          .from('funds')
          .select('strategy')
          .order('strategy');
        
        const uniqueStrategies = Array.from(
          new Set((strategyData || []).map((item) => item.strategy))
        ).filter(Boolean);
        
        setStrategies(uniqueStrategies);
        
        // Get unique geographies (simplified for MVP)
        const { data: geographyData } = await supabase
          .from('funds')
          .select('geography');
        
        const uniqueGeographies = Array.from(
          new Set((geographyData || []).map((item) => item.geography))
        ).filter(Boolean);
        
        setGeographies(uniqueGeographies);
        
        // Get unique sectors (simplified for MVP)
        const { data: sectorData } = await supabase
          .from('funds')
          .select('sector_focus');
        
        const uniqueSectors = Array.from(
          new Set((sectorData || []).map((item) => item.sector_focus))
        ).filter(Boolean);
        
        setSectors(uniqueSectors);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    
    loadFunds();
  }, [router, filters, searchParams]);

  const formatCurrency = (amount: number) => {
    // Format large numbers with appropriate suffix (M, B)
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update URL with filters
    const params = new URLSearchParams();
    
    if (filters.strategy) params.set('strategy', filters.strategy);
    if (filters.minSize) params.set('minSize', filters.minSize);
    if (filters.maxSize) params.set('maxSize', filters.maxSize);
    if (filters.geography) params.set('geography', filters.geography);
    if (filters.sector) params.set('sector', filters.sector);
    
    router.push(`/investor/funds?${params.toString()}`);
  };

  const handleSaveSearch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      // Create a modal to get the search name
      const searchName = prompt('Enter a name for this search:');
      
      if (!searchName) return; // User cancelled
      
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          investor_id: session.user.id,
          name: searchName,
          criteria: filters,
          alerts_enabled: false
        });
        
      if (error) throw error;
      
      alert('Search saved successfully!');
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      strategy: '',
      minSize: '',
      maxSize: '',
      geography: '',
      sector: '',
    });
    
    router.push('/investor/funds');
  };

  const handleQuickView = (fund: Fund) => {
    setSelectedFund(fund);
    setShowQuickView(true);
  };

  const handleCloseQuickView = () => {
    setShowQuickView(false);
    setTimeout(() => {
      setSelectedFund(null);
    }, 300);
  };

  const renderQuickViewModal = () => {
    if (!selectedFund) return null;
    
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${showQuickView ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleCloseQuickView}
          ></div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${showQuickView ? 'sm:scale-100' : 'sm:scale-95'}`}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {selectedFund.fund_logo_url ? (
                        <img 
                          src={selectedFund.fund_logo_url} 
                          alt={`${selectedFund.name} logo`} 
                          className="h-12 w-12 object-contain mr-3 rounded-md"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-500">
                            {selectedFund.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {selectedFund.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={handleCloseQuickView}
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {selectedFund.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        {selectedFund.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Size</h4>
                      <p className="text-sm text-gray-900">{formatCurrency(selectedFund.size)}</p>
                      <p className="text-xs text-gray-500">Min: {formatCurrency(selectedFund.minimum_investment)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Strategy</h4>
                      <p className="text-sm text-gray-900">{selectedFund.strategy}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Sector</h4>
                      <p className="text-sm text-gray-900">{selectedFund.sector_focus}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Geography</h4>
                      <p className="text-sm text-gray-900">{selectedFund.geography}</p>
                    </div>
                    
                    {selectedFund.target_return && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Target Return</h4>
                        <p className="text-sm text-green-600 font-medium">{selectedFund.target_return}%</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Manager</h4>
                      <p className="text-sm text-gray-900">{selectedFund.agent_name}</p>
                      <p className="text-xs text-gray-500">{selectedFund.agent_firm}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Link
                href={`/investor/funds/${selectedFund.id}`}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
              >
                View Full Details
              </Link>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleCloseQuickView}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Find Funds</h1>
        
        <div className="py-4">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSearch}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                      Strategy
                    </label>
                    <select
                      id="strategy"
                      name="strategy"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      value={filters.strategy}
                      onChange={handleFilterChange}
                    >
                      <option value="">Any Strategy</option>
                      {strategies.map((strategy) => (
                        <option key={strategy} value={strategy}>
                          {strategy}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="minSize" className="block text-sm font-medium text-gray-700">
                      Min Size (in millions)
                    </label>
                    <input
                      type="number"
                      name="minSize"
                      id="minSize"
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={filters.minSize}
                      onChange={handleFilterChange}
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="maxSize" className="block text-sm font-medium text-gray-700">
                      Max Size (in millions)
                    </label>
                    <input
                      type="number"
                      name="maxSize"
                      id="maxSize"
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={filters.maxSize}
                      onChange={handleFilterChange}
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="geography" className="block text-sm font-medium text-gray-700">
                      Geography
                    </label>
                    <select
                      id="geography"
                      name="geography"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      value={filters.geography}
                      onChange={handleFilterChange}
                    >
                      <option value="">Any Geography</option>
                      {geographies.map((geography) => (
                        <option key={geography} value={geography}>
                          {geography}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="sector" className="block text-sm font-medium text-gray-700">
                      Sector
                    </label>
                    <select
                      id="sector"
                      name="sector"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      value={filters.sector}
                      onChange={handleFilterChange}
                    >
                      <option value="">Any Sector</option>
                      {sectors.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-5 flex justify-between">
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Clear Filters
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleSaveSearch}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save Search
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="mt-8">
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
            ) : funds.length === 0 ? (
              <div className="text-center py-12">
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No matching funds</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try changing your search filters to find more funds.
                </p>
              </div>
            ) : (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Fund
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Size
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Strategy
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Sector / Geography
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Manager
                              </th>
                              <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">View</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {funds.map((fund, idx) => (
                              <tr key={fund.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center">
                                    {fund.fund_logo_url ? (
                                      <img 
                                        src={fund.fund_logo_url} 
                                        alt={`${fund.name} logo`} 
                                        className="h-10 w-10 object-contain mr-3 rounded-md"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center mr-3">
                                        <span className="text-xs font-medium text-gray-500">
                                          {fund.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <Link href={`/investor/funds/${fund.id}`} className="text-primary hover:text-primary-dark hover:underline">
                                        {fund.name}
                                      </Link>
                                      {fund.description && (
                                        <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                          {fund.description.length > 60 ? `${fund.description.substring(0, 60)}...` : fund.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(fund.size)}
                                  <div className="text-xs text-gray-400">
                                    Min: {formatCurrency(fund.minimum_investment)}
                                  </div>
                                  {fund.target_return && (
                                    <div className="text-xs text-green-600 font-medium mt-1">
                                      Target: {fund.target_return}%
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {fund.strategy}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {fund.sector_focus}
                                  <div className="text-xs text-gray-400">
                                    {fund.geography}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {fund.agent_name}
                                  <div className="text-xs text-gray-400">
                                    {fund.agent_firm}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex flex-col space-y-2 items-end">
                                    <button
                                      onClick={() => handleQuickView(fund)}
                                      className="text-gray-600 hover:text-gray-900 text-xs"
                                    >
                                      Quick View
                                    </button>
                                    <Link 
                                      href={`/investor/funds/${fund.id}`} 
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    >
                                      View Details
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {renderQuickViewModal()}
      </div>
    </DashboardLayout>
  );
} 