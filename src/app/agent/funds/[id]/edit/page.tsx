'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, SubmitHandler } from 'react-hook-form';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentPreview from '@/components/DocumentPreview';
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

type FundDocument = {
  id: string;
  document_type: string;
  file_url: string;
  created_at?: string;
};

export default function EditFundPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState<string>('');
  const [existingDocuments, setExistingDocuments] = useState<FundDocument[]>([]);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{url: string, type: string} | null>(null);
  
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
        
        // Load existing documents
        const { data: documents, error: documentsError } = await supabase
          .from('fund_documents')
          .select('id, document_type, file_url, created_at')
          .eq('fund_id', fundId)
          .order('created_at', { ascending: false });
          
        if (documentsError) {
          console.error('Error loading documents:', documentsError);
        } else {
          setExistingDocuments(documents || []);
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
          
          // Based on the user's description of the Supabase storage structure,
          // we need to upload to the exact location where files are expected
          
          // First, try to upload directly to the fund ID folder at root level
          let filePath = `${fundId}/${fileName}`;
          
          console.log('Uploading document with path:', filePath);
          
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
          
          // 4. Create fund document record - store the exact path used for upload
          const { data: newDocData, error: docError } = await supabase
            .from('fund_documents')
            .insert([
              {
                fund_id: fundId,
                document_type: documentName || document.name, // Use custom name or file name
                file_url: filePath, // Store the exact path used for upload
              },
            ])
            .select()
            .single();
          
          if (docError) {
            console.error('Document record error:', docError);
            throw new Error(`Failed to create document record: ${docError.message}`);
          }
          
          // Add the new document to the existing documents list
          if (newDocData) {
            setExistingDocuments([newDocData, ...existingDocuments]);
          }
          
          // Clear the document form
          setDocument(null);
          setDocumentName('');
          
          // Show success message
          alert('Document uploaded successfully!');
          
          // Don't redirect, stay on the page
          setLoading(false);
          return;
        } catch (docError: any) {
          console.error('Document processing error:', docError);
          // We'll show an error but still consider the fund update successful
          setError(`Fund updated successfully, but there was an issue with the document: ${docError.message}`);
          setLoading(false);
          return;
        }
      }
      
      // Success - show message and stay on page
      alert('Fund details updated successfully!');
      setLoading(false);
      
      // Refresh the document list
      refreshDocuments();
    } catch (error: any) {
      console.error('Error updating fund:', error);
      setError(error.message || 'An error occurred while updating the fund');
      setLoading(false);
    }
  };

  // Function to refresh the documents list
  const refreshDocuments = async () => {
    try {
      const { data: documents, error: documentsError } = await supabase
        .from('fund_documents')
        .select('id, document_type, file_url, created_at')
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false });
        
      if (documentsError) {
        console.error('Error loading documents:', documentsError);
      } else {
        setExistingDocuments(documents || []);
      }
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setDocument(file);
      
      // Set default document name from file name (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      setDocumentName(fileName);
    }
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    try {
      setDeletingDocument(documentId);
      
      // First, find the document to get its file path
      const documentToDelete = existingDocuments.find(doc => doc.id === documentId);
      
      if (!documentToDelete) {
        throw new Error('Document not found');
      }
      
      // Delete the document record from the database
      const { error: deleteRecordError } = await supabase
        .from('fund_documents')
        .delete()
        .eq('id', documentId);
        
      if (deleteRecordError) {
        throw new Error(`Failed to delete document record: ${deleteRecordError.message}`);
      }
      
      // Try to delete the file from storage
      try {
        const { error: deleteFileError } = await supabase.storage
          .from('fund-documents')
          .remove([documentToDelete.file_url]);
          
        if (deleteFileError) {
          console.warn('Warning: Could not delete file from storage:', deleteFileError);
          // Continue anyway since the database record is deleted
        }
      } catch (storageError) {
        console.warn('Warning: Error when deleting file from storage:', storageError);
        // Continue anyway since the database record is deleted
      }
      
      // Update the UI by removing the deleted document
      setExistingDocuments(existingDocuments.filter(doc => doc.id !== documentId));
      
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert(`Error deleting document: ${error.message}`);
    } finally {
      setDeletingDocument(null);
    }
  };
  
  const handlePreviewDocument = (document: FundDocument) => {
    setSelectedDocument({
      url: document.file_url,
      type: document.document_type
    });
  };

  // Add a separate document upload handler
  const handleDocumentUpload = async () => {
    if (!document) {
      alert('Please select a document to upload');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to upload a document');
      }
      
      // Sanitize the file name by removing special characters and spaces
      const sanitizedFileName = document.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      
      const fileName = `${Date.now()}_${sanitizedFileName}`;
      
      // Upload directly to the fund ID folder at root level
      let filePath = `${fundId}/${fileName}`;
      
      console.log('Uploading document with path:', filePath);
      
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
      
      // Create fund document record
      const { data: newDocData, error: docError } = await supabase
        .from('fund_documents')
        .insert([
          {
            fund_id: fundId,
            document_type: documentName || document.name,
            file_url: filePath,
          },
        ])
        .select()
        .single();
      
      if (docError) {
        console.error('Document record error:', docError);
        throw new Error(`Failed to create document record: ${docError.message}`);
      }
      
      // Add the new document to the existing documents list
      if (newDocData) {
        setExistingDocuments([newDocData, ...existingDocuments]);
      }
      
      // Clear the document form
      setDocument(null);
      setDocumentName('');
      
      // Show success message
      alert('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert(`Error uploading document: ${error.message}`);
    } finally {
      setLoading(false);
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
                          >
                            <option value="Venture Capital">Venture Capital</option>
                            <option value="Private Equity">Private Equity</option>
                            <option value="Growth Equity">Growth Equity</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Private Debt">Private Debt</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Fund of Funds">Fund of Funds</option>
                            <option value="Hedge Fund">Hedge Fund</option>
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                              setValueAs: v => v === "" ? null : parseFloat(v)
                            })}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                              setValueAs: v => v === "" ? null : parseFloat(v)
                            })}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
                          />
                          {errors.carry && (
                            <p className="mt-1 text-sm text-red-600">{errors.carry.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Document Management Section */}
                  <div className="pt-8">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Document Management</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Manage fund documents and upload new ones.
                      </p>
                    </div>

                    {/* Existing Documents Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-700 mb-3">Existing Documents</h4>
                      {existingDocuments.length > 0 ? (
                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 bg-white">
                          {existingDocuments.map((doc) => (
                            <li key={doc.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                              <div className="w-0 flex-1 flex items-center">
                                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-2 flex-1 w-0 truncate">
                                  {doc.document_type || 'Fund Document'}
                                </span>
                              </div>
                              <div className="ml-4 flex-shrink-0 flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewDocument(doc)}
                                  className="font-medium text-blue-600 hover:text-blue-500"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  disabled={deletingDocument === doc.id}
                                  className="font-medium text-red-600 hover:text-red-500"
                                >
                                  {deletingDocument === doc.id ? (
                                    <span className="flex items-center">
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Deleting...
                                    </span>
                                  ) : (
                                    'Delete'
                                  )}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 italic">No documents uploaded yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Upload New Document Section */}
                    <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
                      <h4 className="text-md font-medium text-blue-800 mb-3">Upload New Document</h4>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                            Select File
                          </label>
                          <div className="mt-1 flex items-center">
                            <input
                              type="file"
                              id="document"
                              onChange={handleFileChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-white px-3 py-2"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Upload a new pitch deck or other fund document. Max file size: 10MB.
                          </p>
                        </div>
                        
                        {document && (
                          <div className="bg-white p-4 rounded-md border border-blue-200">
                            <label htmlFor="documentName" className="block text-sm font-medium text-gray-700">
                              Document Name
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id="documentName"
                                value={documentName}
                                onChange={(e) => setDocumentName(e.target.value)}
                                placeholder="Enter a name for this document"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Provide a descriptive name for this document (e.g., "Pitch Deck", "Financial Statements", etc.)
                              </p>
                            </div>
                            
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={handleDocumentUpload}
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                {loading ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload Document
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
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
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDocument && (
        <DocumentPreview
          documentUrl={selectedDocument.url}
          documentType={selectedDocument.type}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </DashboardLayout>
  );
} 