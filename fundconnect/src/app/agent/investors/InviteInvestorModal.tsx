'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface InviteInvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: () => void;
}

export default function InviteInvestorModal({ isOpen, onClose, onInviteSuccess }: InviteInvestorModalProps) {
  const supabase = createClientComponentClient();
  const [investorEmail, setInvestorEmail] = useState('');
  const [investorName, setInvestorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // First, generate a unique invitation code
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitation_codes')
        .insert({
          code: Math.random().toString(36).substring(2, 10).toUpperCase(), // Generate random code
          agent_id: (await supabase.auth.getUser()).data.user!.id
        })
        .select('code')
        .single();
      
      if (invitationError) throw invitationError;
      
      setInviteCode(invitationData.code);
      onInviteSuccess();
      
      // In a real app, you would send an email to the investor with the invitation code
      // For now, we'll just display the code in the UI
    } catch (err) {
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while creating the invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Invite Investor</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
        
        {inviteCode ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-medium mb-2">Invitation Created!</h3>
            <p className="mb-4">Share this code with your investor:</p>
            <div className="bg-gray-100 p-4 rounded-md text-center mb-4">
              <span className="text-xl font-mono font-bold tracking-wider">{inviteCode}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This code will expire in 30 days. The investor can use it to register on Fund Connect.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="investorName">
                Investor Name
              </label>
              <input
                id="investorName"
                type="text"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter investor name"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="investorEmail">
                Investor Email
              </label>
              <input
                id="investorEmail"
                type="email"
                value={investorEmail}
                onChange={(e) => setInvestorEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter investor email"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-600 mr-4"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 