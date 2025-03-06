'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  // Client-side state to handle form submission
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription here
    console.log('Subscribing email:', email);
    // Reset form
    setEmail('');
    // Show success message or redirect
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <div className="font-bold text-xl">
                <span className="text-[#1E3A8A]">Fund </span>
                <span className="text-[#2DD4BF]">Connect</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:text-[#1E3A8A]/80 transition-colors">
              Login
            </Link>
            <Link 
              href="/auth/register" 
              className="px-5 py-2 rounded-md text-sm font-medium bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 transition-colors"
            >
              <span className="text-white">Register</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl font-bold text-[#1E3A8A]">
                Discover Top
                <div className="text-[#2DD4BF] mt-1">Emerging Fund Managers</div>
              </h1>
              <p className="mt-4 text-gray-600 text-lg">
                Fund Connect seamlessly integrates with your investment workflow, helping you discover the right funds based on your investment criteria and preferences.
              </p>
              <div className="mt-8">
                <Link
                  href="/auth/register"
                  className="inline-block px-8 py-3 bg-[#1E3A8A] text-white font-medium rounded-md hover:bg-[#1E3A8A]/90 transition-colors"
                >
                  <span className="text-white">Join Our Exclusive Network</span>
                </Link>
              </div>
            </div>
            <div className="relative rounded-lg overflow-hidden shadow-lg">
              <div className="aspect-w-16 aspect-h-9 lg:aspect-h-8">
                <img
                  src="https://images.unsplash.com/photo-1511883040705-6011fad9edfc?q=80&w=2948&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Financial district skyscrapers"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Fund Connect Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1E3A8A]">
              Why Choose Fund Connect?
            </h2>
          </div>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="h-14 w-14 rounded-md bg-[#1E3A8A] flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1E3A8A]">Trusted Quality, Verified Managers</h3>
              <p className="mt-3 text-base text-gray-600">
                All fund managers are backed by licensed broker-dealers and rated by former LPs, so you connect with only the most credible opportunities.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-8">
              <div className="h-14 w-14 rounded-md bg-[#2DD4BF] flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1E3A8A]">AI-Driven Insights for Smarter Decisions</h3>
              <p className="mt-3 text-base text-gray-600">
                Our AI analyzes every fund's investment thesis, delivering scoring and insights to empower confident choices.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-8">
              <div className="h-14 w-14 rounded-md bg-[#10B981] flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1E3A8A]">An Exclusive Community</h3>
              <p className="mt-3 text-base text-gray-600">
                Join a vetted network of top investors and fund managers, ensuring quality interactions and opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#1E3A8A]">
              Streamlined Fund Discovery
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-600 mx-auto">
              Discover funds vetted by licensed professionals and trusted by the investor community.
            </p>
          </div>

          <div className="mt-16 grid gap-10 grid-cols-1 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-8 flex flex-col items-center text-center shadow-sm">
              <div className="h-14 w-14 rounded-md bg-[#1E3A8A] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#1E3A8A]">Smart Fund Matching</h3>
              <p className="mt-3 text-base text-gray-600">
                Our platform automatically matches you with funds that fit your criteria, backed by AI-powered analysis.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg p-8 flex flex-col items-center text-center shadow-sm">
              <div className="h-14 w-14 rounded-md bg-[#2DD4BF] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#1E3A8A]">Secure Communication</h3>
              <p className="mt-3 text-base text-gray-600">
                Exchange information securely with fund managers through our encrypted platform.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-8 flex flex-col items-center text-center shadow-sm">
              <div className="h-14 w-14 rounded-md bg-[#10B981] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#1E3A8A]">Data-Driven Insights</h3>
              <p className="mt-3 text-base text-gray-600">
                Access AI-powered analysis alongside detailed analytics and performance metrics for every fund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#1E3A8A]">
              Trusted by Leading Investors
            </h2>
          </div>
          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="Testimonial author" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-[#1E3A8A]">Michael Roberts</h3>
                  <p className="text-sm text-gray-600">Managing Partner, Skyline Ventures</p>
                </div>
              </div>
              <p className="mt-4 text-base text-gray-600 italic">
                "Fund Connect has revolutionized how we discover emerging managers. The platform's intuitive interface and AI-driven insights have significantly improved our investment process."
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="Testimonial author" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-[#1E3A8A]">Sarah Johnson</h3>
                  <p className="text-sm text-gray-600">CIO, Horizon Investments</p>
                </div>
              </div>
              <p className="mt-4 text-base text-gray-600 italic">
                "The quality of fund managers on this vetted platform is exceptional. Fund Connect has become an essential tool in our due diligence process."
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="Testimonial author" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-[#1E3A8A]">David Chen</h3>
                  <p className="text-sm text-gray-600">Director, Pacific Capital Group</p>
                </div>
              </div>
              <p className="mt-4 text-base text-gray-600 italic">
                "Fund Connect's exclusivity and secure communication features make it easy to identify and connect with qualified fund managers that meet our specific investment criteria."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-[#1E3A8A] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-200 mb-4">
              Connecting vetted funds with qualified investors through our exclusive, data-driven platform.
            </p>
            <div className="flex justify-center space-x-4 text-xs text-gray-200 mb-4">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="#" className="hover:text-white transition-colors">Terms & Conditions</Link>
            </div>
            <p className="text-xs text-gray-300">
              &copy; {new Date().getFullYear()} Fund Connect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
