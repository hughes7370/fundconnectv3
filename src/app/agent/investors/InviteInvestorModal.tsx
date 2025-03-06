'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface InviteInvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: () => void;
}

export default function InviteInvestorModal({ isOpen, onClose, onInviteSuccess }: InviteInvestorModalProps) {
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
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create invitations');
      }
      
      console.log('Creating invitation code for agent:', user.id);
      
      // Generate a unique invitation code - ensure it's uppercase
      const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.log('Generated invitation code:', invitationCode);
      
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitation_codes')
        .insert({
          code: invitationCode,
          agent_id: user.id
        })
        .select('code, agent_id')
        .single();
      
      if (invitationError) {
        console.error('Error creating invitation code:', invitationError);
        throw invitationError;
      }
      
      console.log('Invitation code created successfully:', invitationData);
      
      // Create a pending investor record
      const { data: pendingInvestor, error: pendingInvestorError } = await supabase
        .from('pending_investors')
        .insert({
          name: investorName,
          email: investorEmail,
          invitation_code: invitationCode,
          agent_id: user.id,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();
        
      if (pendingInvestorError) {
        console.error('Error creating pending investor:', pendingInvestorError);
        // Don't throw here, we still want to show the invitation code
        // Just log the error
      } else {
        console.log('Pending investor created:', pendingInvestor);
      }
      
      setInviteCode(invitationData.code);
      
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
    <div className="fixed inset-0 flex items-center justify-center z-[9999]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Invite Investor</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        {inviteCode ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-medium mb-2">Invitation Created!</h3>
            <p className="mb-4">Share this code with your investor:</p>
            <div className="bg-gray-100 p-4 rounded-md text-center mb-4 relative">
              <span className="text-xl font-mono font-bold tracking-wider">{inviteCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode || '');
                  // You could add a toast notification here
                  alert('Invitation code copied to clipboard!');
                }}
                className="absolute right-2 top-2 text-blue-600 hover:text-blue-800"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This code will expire in 30 days. The investor can use it to register on Fund Connect.
            </p>
            <button
              onClick={() => {
                onInviteSuccess();
                onClose();
              }}
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