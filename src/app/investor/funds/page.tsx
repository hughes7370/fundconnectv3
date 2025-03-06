'use client';

import { useEffect, useState, Suspense } from 'react';
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

function FundsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    strategy: searchParams?.get('strategy') || '',
    minSize: searchParams?.get('minSize') || '',
    maxSize: searchParams?.get('maxSize') || '',
    geography: searchParams?.get('geography') || '',
    sector: searchParams?.get('sector') || '',
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
    
    const newFilters = {
      ...filters,
      [name]: value,
    };
    
    setFilters(newFilters);
    
    // Update URL with filters immediately
    const params = new URLSearchParams();
    
    if (newFilters.strategy) params.set('strategy', newFilters.strategy);
    if (newFilters.minSize) params.set('minSize', newFilters.minSize);
    if (newFilters.maxSize) params.set('maxSize', newFilters.maxSize);
    if (newFilters.geography) params.set('geography', newFilters.geography);
    if (newFilters.sector) params.set('sector', newFilters.sector);
    
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
            <div className="bg-white px-6 pt-5 pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="flex justify-between items-start mb-4">
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
                      <h3 className="text-lg leading-6 font-medium text-primary">
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
                    <div className="mt-4 bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-600">
                        {selectedFund.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-500">Size</h4>
                      <p className="text-sm text-primary font-medium">{formatCurrency(selectedFund.size)}</p>
                      <p className="text-xs text-gray-500">Min: {formatCurrency(selectedFund.minimum_investment)}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-500">Strategy</h4>
                      <p className="text-sm text-primary font-medium">{selectedFund.strategy}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-500">Sector</h4>
                      <p className="text-sm text-primary font-medium">{selectedFund.sector_focus}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-500">Geography</h4>
                      <p className="text-sm text-primary font-medium">{selectedFund.geography}</p>
                    </div>
                    
                    {selectedFund.target_return && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="text-sm font-medium text-gray-500">Target Return</h4>
                        <p className="text-sm text-accent-green font-medium">{selectedFund.target_return}%</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-500">Manager</h4>
                      <p className="text-sm text-primary font-medium">{selectedFund.agent_name}</p>
                      <p className="text-xs text-gray-500">{selectedFund.agent_firm}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <Link
                href={`/investor/funds/${selectedFund.id}`}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                View Full Details
              </Link>
              <button
                type="button"
                className="ml-3 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-primary">Find Funds</h1>
          </div>
        
          <div className="mb-4">
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <div className="relative">
                  <label htmlFor="strategy" className="block text-sm font-medium text-gray-700 mb-1">
                    Strategy
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <select
                      id="strategy"
                      name="strategy"
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white"
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="minSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Min Size (in millions)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="minSize"
                      id="minSize"
                      className="block w-full pl-7 pr-3 py-2.5 sm:text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      value={filters.minSize}
                      onChange={handleFilterChange}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="maxSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Size (in millions)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="maxSize"
                      id="maxSize"
                      className="block w-full pl-7 pr-3 py-2.5 sm:text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      value={filters.maxSize}
                      onChange={handleFilterChange}
                      min="0"
                      placeholder="No max"
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="geography" className="block text-sm font-medium text-gray-700 mb-1">
                    Geography
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <select
                      id="geography"
                      name="geography"
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white"
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-1">
                    Sector
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <select
                      id="sector"
                      name="sector"
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white"
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg className="mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleSaveSearch}
                className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <svg className="mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save This Search
              </button>
            </div>
          </div>
        </div>
          
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
          ) : funds.length === 0 ? (
            <div className="text-center bg-white shadow-md rounded-lg py-12 border border-gray-100">
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
              <h3 className="mt-2 text-lg font-medium text-gray-900">No matching funds</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search filters to find more funds.
              </p>
            </div>
          ) : (
            <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
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
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {funds.map((fund, idx) => (
                      <tr key={fund.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {fund.fund_logo_url ? (
                              <img 
                                src={fund.fund_logo_url} 
                                alt={`${fund.name} logo`} 
                                className="h-10 w-10 object-contain mr-3 rounded-md border border-gray-200"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center mr-3 border border-gray-200">
                                <span className="text-sm font-medium text-primary">
                                  {fund.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <Link href={`/investor/funds/${fund.id}`} className="text-primary hover:text-primary-dark font-medium hover:underline">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(fund.size)}</div>
                          <div className="text-xs text-gray-500">
                            Min: {formatCurrency(fund.minimum_investment)}
                          </div>
                          {fund.target_return && (
                            <div className="text-xs text-accent-green font-medium mt-1">
                              Target: {fund.target_return}%
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">
                            {fund.strategy}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{fund.sector_focus}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                              {fund.geography}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{fund.agent_name}</div>
                          <div className="text-xs text-gray-500">
                            {fund.agent_firm}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col space-y-2 items-end">
                            <button
                              onClick={() => handleQuickView(fund)}
                              className="text-primary hover:text-primary-dark text-xs flex items-center"
                            >
                              <svg className="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
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
          )}
        </div>
      </div>
      
      {renderQuickViewModal()}
    </DashboardLayout>
  );
}

export default function InvestorFunds() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading funds...</div>}>
      <FundsContent />
    </Suspense>
  );
} 