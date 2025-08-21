import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900">
            Reddit Monitor
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Track mentions of your business across Reddit
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500">
            Get notified when people mention your business, industry, or location on Reddit. 
            Never miss an opportunity to engage with potential customers.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/onboarding"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Get Started
            </Link>
            
            <Link
              href="/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </Link>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-900 mb-3">How it works:</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <p>1. Tell us about your business</p>
            <p>2. Choose relevant subreddits to monitor</p>
            <p>3. View curated mentions in your dashboard</p>
          </div>
        </div>
      </div>
    </div>
  )
}
