import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface DocumentPreviewProps {
  documentUrl: string;
  documentType: string;
  onClose: () => void;
}

export default function DocumentPreview({ documentUrl, documentType, onClose }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  React.useEffect(() => {
    async function getPublicUrl() {
      try {
        setLoading(true);
        const debugMessages: string[] = [];
        
        // Validate the document URL
        if (!documentUrl) {
          throw new Error('Document URL is missing');
        }
        
        // Extract important parts from the URL
        let cleanedUrl = documentUrl.replace(/^\/+/, '').replace(/\/+/g, '/');
        debugMessages.push(`Original path: ${cleanedUrl}`);
        
        // Extract the fund ID and filename
        let fundId = '';
        let fileName = '';
        
        // Try to extract fund ID and filename from the path
        const pathParts = cleanedUrl.split('/');
        if (pathParts.length >= 2) {
          // If the path has at least two parts, assume the first is the fund ID and the last is the filename
          fundId = pathParts[pathParts.length - 2];
          fileName = pathParts[pathParts.length - 1];
        } else {
          // If there's only one part, it's probably just the filename
          fileName = pathParts[0];
        }
        
        debugMessages.push(`Extracted fund ID: ${fundId}`);
        debugMessages.push(`Extracted filename: ${fileName}`);
        
        // Check if the fund ID looks like a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fundId);
        debugMessages.push(`Fund ID is UUID format: ${isUuid}`);
        
        // Generate a list of possible paths to try based on the user's description
        const possiblePaths = [];
        
        // 1. Try the original path as is
        possiblePaths.push(cleanedUrl);
        
        // 2. Try just the fund ID folder at root with the filename
        if (fundId && fileName) {
          possiblePaths.push(`${fundId}/${fileName}`);
        }
        
        // 3. Try with fund_documents prefix
        if (fundId && fileName) {
          possiblePaths.push(`fund_documents/${fundId}/${fileName}`);
        }
        
        // 4. Try with funds prefix
        if (fundId && fileName) {
          possiblePaths.push(`funds/${fundId}/${fileName}`);
        }
        
        // 5. Try with different fund IDs from the user's description
        const alternativeFundIds = [
          'f5a4fa6c-25e9-42c9-9b10-857991d6923d',
          '5e212746-ee6b-43f1-8ca4-f3b52981cb1f'
        ];
        
        for (const altFundId of alternativeFundIds) {
          if (altFundId !== fundId && fileName) {
            possiblePaths.push(`${altFundId}/${fileName}`);
            possiblePaths.push(`fund_documents/${altFundId}/${fileName}`);
            possiblePaths.push(`funds/${altFundId}/${fileName}`);
          }
        }
        
        // 6. Try looking inside the fund ID folder for any files
        if (fundId) {
          try {
            debugMessages.push(`Listing files in ${fundId} folder...`);
            const { data: folderFiles, error: folderError } = await supabase.storage
              .from('fund-documents')
              .list(fundId);
              
            if (!folderError && folderFiles && folderFiles.length > 0) {
              debugMessages.push(`Found ${folderFiles.length} files in ${fundId} folder`);
              // Add all files in this folder to possible paths
              for (const file of folderFiles) {
                possiblePaths.push(`${fundId}/${file.name}`);
              }
            } else {
              debugMessages.push(`No files found in ${fundId} folder or error: ${folderError?.message}`);
            }
          } catch (err) {
            debugMessages.push(`Error listing files in folder: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        
        // Remove duplicates
        const uniquePaths = [...new Set(possiblePaths)];
        debugMessages.push(`Trying these possible paths: ${uniquePaths.join(', ')}`);
        
        // Try each path until one works
        let foundUrl = null;
        let lastError = null;
        
        for (const path of uniquePaths) {
          try {
            debugMessages.push(`Attempting to fetch document with path: ${path}`);
            
            const { data, error } = await supabase.storage
              .from('fund-documents')
              .createSignedUrl(path, 3600); // 1 hour expiry
            
            if (error) {
              debugMessages.push(`Error with path ${path}: ${error.message}`);
              lastError = error;
              continue; // Try next path
            }
            
            if (data && data.signedUrl) {
              debugMessages.push(`Successfully found document at path: ${path}`);
              foundUrl = data.signedUrl;
              break; // Exit the loop once we find a working URL
            }
          } catch (err) {
            debugMessages.push(`Error trying path ${path}: ${err instanceof Error ? err.message : String(err)}`);
            lastError = err;
          }
        }
        
        // If we couldn't find the file through the Supabase API, try using the public URL directly
        if (!foundUrl && fundId && fileName) {
          // Construct the public URL based on the Supabase project URL
          const publicUrlAttempt = `https://iqejajqqjdccgedsnjgn.supabase.co/storage/v1/object/public/fund-documents/${fundId}/${fileName}`;
          debugMessages.push(`Trying direct public URL: ${publicUrlAttempt}`);
          
          try {
            // Check if the URL is accessible
            const response = await fetch(publicUrlAttempt, { method: 'HEAD' });
            if (response.ok) {
              debugMessages.push(`Public URL is accessible!`);
              foundUrl = publicUrlAttempt;
            } else {
              debugMessages.push(`Public URL returned status: ${response.status}`);
            }
          } catch (err) {
            debugMessages.push(`Error checking public URL: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        
        setDebugInfo(debugMessages);
        
        if (foundUrl) {
          debugMessages.push('Successfully generated URL');
          setPublicUrl(foundUrl);
        } else {
          // If all paths failed, throw an error with all the paths we tried
          throw new Error(`Document not found. Tried these paths: ${uniquePaths.join(', ')}`);
        }
      } catch (err: any) {
        console.error('Error getting document URL:', err);
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }
    
    getPublicUrl();
  }, [documentUrl]);

  // Determine file extension
  const fileExtension = documentUrl.split('.').pop()?.toLowerCase() || '';
  
  // Determine if the file is previewable
  const isPDF = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
  const isText = ['txt', 'md', 'csv'].includes(fileExtension);
  
  // Render appropriate preview based on file type
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center p-6">
          <svg className="h-12 w-12 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-gray-500 mt-2">Unable to preview this document</p>
          <div className="mt-4 text-sm text-gray-600 bg-gray-100 p-3 rounded max-w-lg overflow-auto">
            <p className="font-medium mb-1">Troubleshooting:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Check if the file exists in your Supabase storage bucket</li>
              <li>Verify the file path is correct: <code className="bg-gray-200 px-1 rounded">{documentUrl}</code></li>
              <li>Ensure the storage bucket permissions allow access</li>
              <li>Check the browser console for detailed error messages</li>
            </ul>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="font-medium mb-1">Debug Information:</p>
              <div className="bg-gray-800 text-gray-200 p-2 rounded text-xs font-mono overflow-auto max-h-40">
                {debugInfo.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="font-medium mb-1">Try Direct Link:</p>
              <a 
                href={`https://iqejajqqjdccgedsnjgn.supabase.co/storage/v1/object/public/fund-documents/${documentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      );
    }
    
    if (!publicUrl) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center p-6">
          <p className="text-gray-500">No preview available</p>
        </div>
      );
    }
    
    if (isPDF) {
      // For PDFs, we have two options:
      // 1. Use the browser's built-in PDF viewer (which might be limited in some browsers)
      // 2. Use Google Docs viewer as a fallback (which works well for most PDFs)
      
      // First, try to use the browser's built-in viewer
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
          <iframe 
            src={`${publicUrl}#toolbar=1`} 
            className="w-full h-full border-0"
            title={`PDF Preview: ${documentType}`}
            onError={() => setError('Failed to load PDF')}
            style={{ minHeight: '75vh' }}
          />
          
          {/* Fallback option if the browser's PDF viewer doesn't work well */}
          <div className="w-full p-2 bg-gray-200 text-center text-sm">
            <span>If the preview doesn't display correctly, try the </span>
            <a 
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Google Docs viewer
            </a>
            <span> or </span>
            <a 
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              open directly
            </a>
          </div>
        </div>
      );
    }
    
    if (isImage) {
      return (
        <div className="flex justify-center items-center h-full p-4 bg-gray-100" style={{ minHeight: '75vh' }}>
          <img 
            src={publicUrl} 
            alt={documentType} 
            className="max-w-full max-h-full object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }
    
    if (isText) {
      return (
        <iframe 
          src={publicUrl} 
          className="w-full h-full border-0"
          title={`Text Preview: ${documentType}`}
          onError={() => setError('Failed to load text file')}
          style={{ minHeight: '75vh' }}
        />
      );
    }
    
    // For non-previewable files, show a message
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-6" style={{ minHeight: '75vh' }}>
        <svg className="h-16 w-16 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium text-gray-700">{documentType || 'Document'}</p>
        <p className="text-gray-500 mt-2">This file type cannot be previewed</p>
        <a 
          href={publicUrl} 
          download
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {documentType || 'Document Preview'}
          </h3>
          <div className="flex items-center space-x-2">
            <a 
              href={publicUrl || '#'} 
              target="_blank"
              rel="noopener noreferrer"
              className={`text-gray-500 hover:text-gray-700 ${!publicUrl ? 'pointer-events-none opacity-50' : ''}`}
              title="Open in new tab"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto" style={{ minHeight: '75vh' }}>
          {renderPreview()}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
          <div className="text-sm text-gray-500">
            {fileExtension.toUpperCase()} file
          </div>
          {publicUrl ? (
            <a 
              href={publicUrl} 
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-300 cursor-not-allowed"
            >
              <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 