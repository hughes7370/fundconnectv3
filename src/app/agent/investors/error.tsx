'use client';

import React from 'react';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function InvestorsError({ error, reset }: ErrorProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6 text-center max-w-lg">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">{error.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => reset()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
} 