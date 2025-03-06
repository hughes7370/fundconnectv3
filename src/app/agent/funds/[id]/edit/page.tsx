'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, SubmitHandler } from 'react-hook-form';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type FundFormInputs = {
  name: string;
  size: number;
  minimum_investment: number;
  strategy: string;
  sector_focus: string;
  geography: string;
  track_record_irr: number | null;
  track_record_moic: number | null;
  team_background: string;
  management_fee: number;
  carry: number;
};

export default function EditFundPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const router = useRouter();
  const params = useParams();
  const fundId = params?.id as string;
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FundFormInputs>();

  useEffect(() => {
    // Only proceed if fundId is available
    if (!fundId) {
      setError('Fund ID is missing');
      setLoading(false);
      return;
    }
    
    const loadFund = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Load fund data
        const { data: fundData, error: fundError } = await supabase
          .from('funds')
          .select(`
            name,
            size,
            minimum_investment,
            strategy,
            sector_focus,
            geography,
            track_record_irr,
            track_record_moic,
            team_background,
            management_fee,
            carry
          `)
          .eq('id', fundId)
          .eq('uploaded_by_agent_id', session.user.id)
          .single();
          
        if (fundError) {
          if (fundError.message.includes('relation') || fundError.message.includes('table')) {
            throw new Error('Database tables not set up. Please run the schema.sql script in your Supabase project.');
          }
          throw fundError;
        }

        if (!fundData) {
          throw new Error('Fund not found or you do not have permission to edit it.');
        }
        
        // Set form data
        reset(fundData);
      } catch (error: any) {
        console.error('Error loading fund:', error);
        setError(error.message || 'An error occurred while loading the fund');
      } finally {
        setLoading(false);
      }
    };
    
    loadFund();
  }, [fundId, router, reset]);

  const onSubmit: SubmitHandler<FundFormInputs> = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to update a fund');
      }
      
      // 2. Update fund data
      const { error: fundError } = await supabase
        .from('funds')
        .update({
          name: data.name,
          size: data.size,
          minimum_investment: data.minimum_investment,
          strategy: data.strategy,
          sector_focus: data.sector_focus,
          geography: data.geography,
          track_record_irr: data.track_record_irr,
          track_record_moic: data.track_record_moic,
          team_background: data.team_background,
          management_fee: data.management_fee,
          carry: data.carry
        })
        .eq('id', fundId)
        .eq('uploaded_by_agent_id', session.user.id);
      
      if (fundError) {
        console.error('Fund update error:', fundError);
        throw new Error(fundError.message || 'Failed to update fund');
      }
      
      // 3. Upload new document if provided
      if (document) {
        try {
          // Sanitize the file name by removing special characters and spaces
          const sanitizedFileName = document.name
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .toLowerCase();
          
          const fileName = `${Date.now()}_${sanitizedFileName}`;
          // Ensure the path only uses forward slashes and no double slashes
          const filePath = `fund_documents/${fundId}/${fileName}`.replace(/\/+/g, '/');
          
          const { error: uploadError } = await supabase.storage
            .from('fund-documents')
            .upload(filePath, document, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Document upload error:', uploadError);
            throw new Error(`Failed to upload document: ${uploadError.message}`);
          }
          
          // 4. Create fund document record
          const { error: docError } = await supabase
            .from('fund_documents')
            .insert([
              {
                fund_id: fundId,
                document_type: 'pitch_deck', // Default type for simplicity
                file_url: filePath,
              },
            ]);
          
          if (docError) {
            console.error('Document record error:', docError);
            throw new Error(`Failed to create document record: ${docError.message}`);
          }
        } catch (docError: any) {
          console.error('Document processing error:', docError);
          // We'll show an error but still consider the fund update successful
          setError(`Fund updated successfully, but there was an issue with the document: ${docError.message}`);
          // Continue to redirect after a delay to allow the user to read the error
          setTimeout(() => {
            router.push('/agent/funds');
          }, 5000);
          return;
        }
      }
      
      // Success - redirect to fund list
      router.push('/agent/funds');
    } catch (error: any) {
      console.error('Error updating fund:', error);
      setError(error.message || 'An error occurred while updating the fund');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocument(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Fund</h1>
          <div className="py-4">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && error.includes('Fund not found')) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Fund</h1>
          <div className="py-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  <div className="mt-4">
                    <Link
                      href="/agent/funds"
                      className="text-sm font-medium text-red-800 hover:text-red-700"
                    >
                      ← Back to Funds
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Fund</h1>
        
        <div className="py-4">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
                <div className="space-y-8 divide-y divide-gray-200">
                  <div>
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Fund Details</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Update the fund information below.
                      </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Fund Name
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="name"
                            {...register("name", { required: "Fund name is required" })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                          Fund Size ($)
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="size"
                            {...register("size", { 
                              required: "Fund size is required",
                              min: { value: 1, message: "Fund size must be greater than 0" }
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.size && (
                            <p className="mt-1 text-sm text-red-600">{errors.size.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="minimum_investment" className="block text-sm font-medium text-gray-700">
                          Minimum Investment ($)
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="minimum_investment"
                            {...register("minimum_investment", { 
                              required: "Minimum investment is required",
                              min: { value: 1, message: "Minimum investment must be greater than 0" }
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.minimum_investment && (
                            <p className="mt-1 text-sm text-red-600">{errors.minimum_investment.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                          Strategy
                        </label>
                        <div className="mt-1">
                          <select
                            id="strategy"
                            {...register("strategy", { required: "Strategy is required" })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          >
                            <option value="">Select a strategy</option>
                            <option value="Venture Capital">Venture Capital</option>
                            <option value="Private Equity">Private Equity</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Credit">Credit</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Hedge Fund">Hedge Fund</option>
                            <option value="Fund of Funds">Fund of Funds</option>
                            <option value="Other">Other</option>
                          </select>
                          {errors.strategy && (
                            <p className="mt-1 text-sm text-red-600">{errors.strategy.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="sector_focus" className="block text-sm font-medium text-gray-700">
                          Sector Focus
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="sector_focus"
                            {...register("sector_focus", { required: "Sector focus is required" })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="e.g., Technology, Healthcare"
                          />
                          {errors.sector_focus && (
                            <p className="mt-1 text-sm text-red-600">{errors.sector_focus.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="geography" className="block text-sm font-medium text-gray-700">
                          Geography
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="geography"
                            {...register("geography", { required: "Geography is required" })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="e.g., North America, Europe"
                          />
                          {errors.geography && (
                            <p className="mt-1 text-sm text-red-600">{errors.geography.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="track_record_irr" className="block text-sm font-medium text-gray-700">
                          Track Record IRR (%)
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="track_record_irr"
                            step="0.01"
                            {...register("track_record_irr", { 
                              valueAsNumber: true,
                              required: false
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.track_record_irr && (
                            <p className="mt-1 text-sm text-red-600">{errors.track_record_irr.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="track_record_moic" className="block text-sm font-medium text-gray-700">
                          Track Record MOIC
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="track_record_moic"
                            step="0.01"
                            {...register("track_record_moic", { 
                              valueAsNumber: true,
                              required: false
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.track_record_moic && (
                            <p className="mt-1 text-sm text-red-600">{errors.track_record_moic.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="team_background" className="block text-sm font-medium text-gray-700">
                          Team Background
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="team_background"
                            rows={3}
                            {...register("team_background", { required: "Team background is required" })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.team_background && (
                            <p className="mt-1 text-sm text-red-600">{errors.team_background.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="management_fee" className="block text-sm font-medium text-gray-700">
                          Management Fee (%)
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="management_fee"
                            step="0.01"
                            {...register("management_fee", { 
                              required: "Management fee is required",
                              min: { value: 0, message: "Management fee cannot be negative" }
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.management_fee && (
                            <p className="mt-1 text-sm text-red-600">{errors.management_fee.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="carry" className="block text-sm font-medium text-gray-700">
                          Carry (%)
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            id="carry"
                            step="0.01"
                            {...register("carry", { 
                              required: "Carry is required",
                              min: { value: 0, message: "Carry cannot be negative" }
                            })}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {errors.carry && (
                            <p className="mt-1 text-sm text-red-600">{errors.carry.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                          Update Fund Document (PDF, PPT, etc.)
                        </label>
                        <div className="mt-1">
                          <input
                            type="file"
                            id="document"
                            onChange={handleFileChange}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Upload a new pitch deck or other fund document. Max file size: 10MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4 my-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push('/agent/funds')}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 