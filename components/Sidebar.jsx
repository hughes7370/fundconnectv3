import Link from 'next/link';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen">
      {/* ... existing code ... */}

      {/* ... existing navigation items ... */}
      <Link 
        href="/messages" 
        className={`flex items-center gap-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
          router.pathname.startsWith('/messages') ? 'bg-blue-50 text-blue-600' : ''
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
        <span>Messages</span>
      </Link>
      {/* ... other navigation items ... */}
    </div>
  );
};

export default Sidebar; 