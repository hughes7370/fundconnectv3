'use client';

import React, { useState } from 'react';
import InviteInvestorModal from './InviteInvestorModal';

interface Investor {
  user_id: string;
  name: string;
  approved: boolean;
}

interface InvestorsClientProps {
  investors: Investor[];
}

export default function InvestorsClient({ investors }: InvestorsClientProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayInvestors, setDisplayInvestors] = useState<Investor[]>(investors);
  
  // Handle search functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (!term.trim()) {
      setDisplayInvestors(investors);
    } else {
      const filtered = investors.filter(investor => 
        investor.name.toLowerCase().includes(term.toLowerCase())
      );
      setDisplayInvestors(filtered);
    }
  };
  
  // Handle invite success (refresh the page to show new invites)
  const handleInviteSuccess = () => {
    // In a real app, you would refresh the data here
    // For now, we'll just close the modal
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Investors</h1>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite New Investor
        </button>
      </div>
      
      {/* Search and filter section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <input
          type="text"
          placeholder="Search investors..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      {/* Investors table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interests</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayInvestors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm ? 'No investors match your search.' : 'No investors found. Invite some investors to get started.'}
                </td>
              </tr>
            ) : (
              displayInvestors.map((investor) => (
                <tr key={investor.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      investor.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {investor.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    0 interests
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    $0
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="#" className="text-blue-600 hover:text-blue-900 mr-4">View</a>
                    <a href="#" className="text-red-600 hover:text-red-900">Remove</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Invite Modal */}
      <InviteInvestorModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSuccess={handleInviteSuccess}
      />
    </>
  );
} 