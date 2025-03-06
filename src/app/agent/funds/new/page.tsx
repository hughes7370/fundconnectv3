'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  description: string;
  investment_strategy: string;
  target_return: number | null;
  fund_manager: string;
  fund_manager_bio: string;
  fund_website: string;
  fund_logo_url: string;
};

export default function UploadFund() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [showBucketInstructions, setShowBucketInstructions] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FundFormInputs>();

  const onSubmit: SubmitHandler<FundFormInputs> = async (data) => {
    setLoading(true);
    setError(null);
    setShowBucketInstructions(false);
    
    try {
      // 1. Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to upload a fund');
      }
      
      // 2. Insert fund data
      const { data: fundData, error: fundError } = await supabase
        .from('funds')
        .insert([
          {
            ...data,
            uploaded_by_agent_id: session.user.id,
          },
        ])
        .select()
        .single();
      
      if (fundError) {
        if (fundError.message.includes('relation') || fundError.message.includes('table')) {
          throw new Error('Database tables not set up. Please run the schema.sql script in your Supabase project.');
        }
        throw fundError;
      }
      
      // 3. Upload document if provided
      if (document && fundData) {
        try {
          const fileName = `${Date.now()}_${document.name}`;
          const filePath = `funds/${fundData.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('fund-documents')
            .upload(filePath, document);
          
          if (uploadError) {
            // Check if the error is related to the bucket not existing
            if (uploadError.message.includes('Bucket not found') || 
                uploadError.message.includes('bucket') || 
                uploadError.message.includes('404')) {
              console.error('Bucket not found error:', uploadError);
              setShowBucketInstructions(true);
              throw new Error('Storage bucket "fund-documents" not found. Please create it in your Supabase dashboard.');
            }
            
            console.error('Document upload error:', uploadError);
            throw new Error(`Failed to upload document: ${uploadError.message}`);
          }
          
          // 4. Create fund document record
          const { error: docError } = await supabase
            .from('fund_documents')
            .insert([
              {
                fund_id: fundData.id,
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
          // We'll show an error but still consider the fund creation successful
          setError(`Fund created successfully, but there was an issue with the document: ${docError.message}`);
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
      setError(error.message || 'An error occurred while uploading the fund');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocument(e.target.files[0]);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Upload New Fund</h1>
        
        <div className="py-4">
          {showBucketInstructions && (
            <div className="mb-6 rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Storage Bucket Not Found</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>The storage bucket "fund-documents" doesn't exist in your Supabase project. Please create it:</p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="font-medium underline">Supabase Dashboard</a></li>
                      <li>Select your project</li>
                      <li>Click on "Storage" in the left sidebar</li>
                      <li>Click "New Bucket"</li>
                      <li>Enter "fund-documents" as the bucket name</li>
                      <li>Select "Public" for the bucket type</li>
                      <li>Click "Create bucket"</li>
                      <li>After creating, click on the bucket and go to "Policies"</li>
                      <li>Add policies to allow authenticated users to upload files</li>
                    </ol>
                    <p className="mt-2">After creating the bucket, you can try uploading again.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
                <div className="space-y-8 divide-y divide-gray-200">
                  <div>
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Fund Details</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Provide information about the fund you're uploading.
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
                          Fund Document (PDF, PPT, etc.)
                        </label>
                        <div className="mt-1">
                          <input
                            type="file"
                            id="document"
                            onChange={handleFileChange}
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Upload a pitch deck or other fund document. Max file size: 10MB.
                          </p>
                        </div>
                      </div>

                      {/* Fund Description */}
                      <div className="col-span-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Fund Description
                        </label>
                        <textarea
                          id="description"
                          rows={4}
                          className={`mt-1 block w-full rounded-md border ${errors.description ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="Provide a detailed description of the fund, its objectives, and investment philosophy."
                          {...register('description')}
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                      </div>

                      {/* Investment Strategy */}
                      <div className="col-span-6">
                        <label htmlFor="investment_strategy" className="block text-sm font-medium text-gray-700">
                          Detailed Investment Strategy
                        </label>
                        <textarea
                          id="investment_strategy"
                          rows={3}
                          className={`mt-1 block w-full rounded-md border ${errors.investment_strategy ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="Explain the fund's investment strategy in detail."
                          {...register('investment_strategy')}
                        />
                        {errors.investment_strategy && (
                          <p className="mt-1 text-sm text-red-600">{errors.investment_strategy.message}</p>
                        )}
                      </div>

                      {/* Target Return */}
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="target_return" className="block text-sm font-medium text-gray-700">
                          Target Return (%)
                        </label>
                        <input
                          type="number"
                          id="target_return"
                          step="0.1"
                          className={`mt-1 block w-full rounded-md border ${errors.target_return ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="15.0"
                          {...register('target_return', { valueAsNumber: true })}
                        />
                        {errors.target_return && (
                          <p className="mt-1 text-sm text-red-600">{errors.target_return.message}</p>
                        )}
                      </div>

                      {/* Fund Manager */}
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="fund_manager" className="block text-sm font-medium text-gray-700">
                          Fund Manager Name
                        </label>
                        <input
                          type="text"
                          id="fund_manager"
                          className={`mt-1 block w-full rounded-md border ${errors.fund_manager ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="John Smith"
                          {...register('fund_manager')}
                        />
                        {errors.fund_manager && (
                          <p className="mt-1 text-sm text-red-600">{errors.fund_manager.message}</p>
                        )}
                      </div>

                      {/* Fund Manager Bio */}
                      <div className="col-span-6">
                        <label htmlFor="fund_manager_bio" className="block text-sm font-medium text-gray-700">
                          Fund Manager Bio
                        </label>
                        <textarea
                          id="fund_manager_bio"
                          rows={3}
                          className={`mt-1 block w-full rounded-md border ${errors.fund_manager_bio ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="Brief biography of the fund manager, including experience and credentials."
                          {...register('fund_manager_bio')}
                        />
                        {errors.fund_manager_bio && (
                          <p className="mt-1 text-sm text-red-600">{errors.fund_manager_bio.message}</p>
                        )}
                      </div>

                      {/* Fund Website */}
                      <div className="col-span-6">
                        <label htmlFor="fund_website" className="block text-sm font-medium text-gray-700">
                          Fund Website
                        </label>
                        <input
                          type="url"
                          id="fund_website"
                          className={`mt-1 block w-full rounded-md border ${errors.fund_website ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="https://example.com"
                          {...register('fund_website')}
                        />
                        {errors.fund_website && (
                          <p className="mt-1 text-sm text-red-600">{errors.fund_website.message}</p>
                        )}
                      </div>

                      {/* Fund Logo URL */}
                      <div className="col-span-6">
                        <label htmlFor="fund_logo_url" className="block text-sm font-medium text-gray-700">
                          Fund Logo URL
                        </label>
                        <input
                          type="url"
                          id="fund_logo_url"
                          className={`mt-1 block w-full rounded-md border ${errors.fund_logo_url ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-primary focus:ring-primary sm:text-sm`}
                          placeholder="https://example.com/logo.png"
                          {...register('fund_logo_url')}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Enter a URL to your fund's logo. You can upload images to services like Imgur or use your own hosting.
                        </p>
                        {errors.fund_logo_url && (
                          <p className="mt-1 text-sm text-red-600">{errors.fund_logo_url.message}</p>
                        )}
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
                      {loading ? 'Uploading...' : 'Upload Fund'}
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