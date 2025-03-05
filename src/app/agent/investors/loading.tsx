import React from 'react';

export default function InvestorsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
      </div>
      
      {/* Search box loading state */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
      </div>
      
      {/* Table loading state */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <div className="p-4">
          <div className="h-12 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
} 