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
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-light sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <img
                  className="h-8 w-auto"
                  src="/logo.svg"
                  alt="Fund Connect"
                />
              </Link>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-6">
                <Link href="#" className="text-sm font-medium text-gray-dark hover:text-primary">
                  Solutions
                </Link>
                <Link href="#" className="text-sm font-medium text-gray-dark hover:text-primary">
                  Products
                </Link>
                <Link href="#" className="text-sm font-medium text-gray-dark hover:text-primary">
                  Resources
                </Link>
                <Link href="#" className="text-sm font-medium text-gray-dark hover:text-primary">
                  About Us
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-dark hover:text-primary">
                Login
              </Link>
              <Link 
                href="/auth/register" 
                className="px-3 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="flex-grow bg-gradient-to-b from-white to-gray-light">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-dark sm:text-5xl md:text-6xl">
                <span className="block">Discover Top</span>
                <span className="block text-primary">Emerging Fund Managers</span>
              </h1>
              <p className="mt-3 text-base text-gray-dark sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Fund Connect seamlessly integrates with your investment workflow, helping you discover the right funds based on your investment criteria and preferences.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left">
                <div className="mt-5">
                  <Link
                    href="/auth/register?role=investor"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
                  >
                    Request a Demo
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center ml-4 px-5 py-3 border border-primary text-base font-medium rounded-md text-primary bg-white hover:bg-gray-light transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
                <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
                    alt="Fund Connect platform interface"
                    width={500}
                    height={300}
                    className="w-full"
                  />
                  <div className="absolute inset-0 bg-primary bg-opacity-30 flex items-center justify-center">
                    <svg className="h-20 w-20 text-white" fill="currentColor" viewBox="0 0 84 84">
                      <circle opacity="0.9" cx="42" cy="42" r="42" fill="white" />
                      <path d="M55 42L35 55V29L55 42Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-dark sm:text-4xl">
              Streamlined Fund Discovery
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-dark mx-auto">
              Connect with the right funds based on your investment criteria and preferences.
            </p>
          </div>

          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-gray-light rounded-lg p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-md bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-dark">Smart Fund Matching</h3>
              <p className="mt-2 text-base text-gray-dark">
                Our platform automatically matches funds with your investment criteria, saving you time and effort.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-light rounded-lg p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-dark">Secure Communication</h3>
              <p className="mt-2 text-base text-gray-dark">
                Exchange information securely with fund managers through our encrypted platform.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-light rounded-lg p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-md bg-accent-green flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-dark">Data-Driven Insights</h3>
              <p className="mt-2 text-base text-gray-dark">
                Access detailed analytics and performance metrics to make informed investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="bg-gray-light py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-dark sm:text-4xl">
              Trusted by Leading Investors
            </h2>
          </div>
          <div className="mt-12 max-w-lg mx-auto lg:max-w-none">
            <div className="space-y-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-light overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                      alt="Testimonial author" 
                      width={48} 
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-dark">Michael Roberts</h3>
                    <p className="text-sm text-gray-dark">Managing Partner, Skyline Ventures</p>
                  </div>
                </div>
                <p className="mt-4 text-base text-gray-dark italic">
                  "Fund Connect has revolutionized how we discover emerging managers. The platform's intuitive interface and data-driven recommendations have significantly improved our investment process."
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-light overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                      alt="Testimonial author" 
                      width={48} 
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-dark">Sarah Johnson</h3>
                    <p className="text-sm text-gray-dark">CIO, Horizon Investments</p>
                  </div>
                </div>
                <p className="mt-4 text-base text-gray-dark italic">
                  "The quality of fund managers on the platform is exceptional. Fund Connect has become an essential tool in our due diligence process."
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-light overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                      alt="Testimonial author" 
                      width={48} 
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-dark">David Chen</h3>
                    <p className="text-sm text-gray-dark">Director, Pacific Capital Group</p>
                  </div>
                </div>
                <p className="mt-4 text-base text-gray-dark italic">
                  "Fund Connect seamlessly integrates into our workflow, making it easy to identify and connect with qualified fund managers that meet our specific investment criteria."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Stay Updated
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-light mx-auto">
              Subscribe to our newsletter for the latest insights on emerging fund managers.
            </p>
            
            {/* Fix for hydration issues with browser extensions */}
            <div className="mt-8 sm:flex sm:justify-center">
              <div className="w-full sm:max-w-md">
                <form onSubmit={handleSubmit} className="sm:flex">
                  <label htmlFor="email-address" className="sr-only">Email address</label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 border-white focus:outline-none focus:ring-2 focus:ring-secondary rounded-md text-gray-dark"
                    placeholder="Your email address"
                  />
                  <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-secondary transition-colors"
                    >
                      Subscribe
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-dark text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Fund Connect</h3>
              <p className="text-sm text-gray-light">
                Connecting funds with the right investors through our data-driven platform.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Solutions</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">For Investors</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">For Fund Managers</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">For Placement Agents</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">Blog</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">Research</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">Events</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">About Us</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">Contact</Link></li>
                <li><Link href="#" className="text-sm text-gray-light hover:text-white">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-light pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-light">
              &copy; {new Date().getFullYear()} Fund Connect. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="text-gray-light hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link href="#" className="text-gray-light hover:text-white">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
