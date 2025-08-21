'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Mention {
  id: number
  subreddit: string
  post_title: string
  post_url: string
  content: string
  author: string
  created_at: string
}

interface Profile {
  business_name: string
  location: string
  industry: string
}

export default function Dashboard() {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastMonitor, setLastMonitor] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Load mentions
      const { data: mentionsData } = await supabase
        .from('mentions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setMentions(mentionsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runMonitoring = async () => {
    setIsMonitoring(true)
    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (response.ok) {
        setLastMonitor(new Date().toLocaleString())
        // Reload mentions after monitoring
        await loadData()
        alert(`Monitoring complete! Check the console for details.`)
      } else {
        alert(`Error: ${result.error || 'Failed to run monitoring'}`)
      }
    } catch (error) {
      console.error('Error running monitoring:', error)
      alert('Error running monitoring. Check the console for details.')
    } finally {
      setIsMonitoring(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reddit Monitor</h1>
              {profile && (
                <p className="text-sm text-gray-600">
                  Monitoring for {profile.business_name} in {profile.location} • {profile.industry}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={runMonitoring}
                disabled={isMonitoring}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMonitoring ? 'Monitoring...' : 'Run Monitor Now'}
              </button>
              <button
                onClick={signOut}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{mentions.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Mentions</dt>
                      <dd className="text-lg font-medium text-gray-900">{mentions.length} posts found</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {new Set(mentions.map(m => m.subreddit)).size}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Subreddits</dt>
                      <dd className="text-lg font-medium text-gray-900">Active monitoring</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Last Check</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {lastMonitor || 'Never'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mentions List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Mentions</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Posts mentioning your business, industry, or location
              </p>
            </div>
            
            {mentions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mentions found yet</h3>
                <p className="text-gray-500 mb-4">Click "Run Monitor Now" to search for recent posts</p>
                <button
                  onClick={runMonitoring}
                  disabled={isMonitoring}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {isMonitoring ? 'Searching...' : 'Start Monitoring'}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {mentions.map((mention) => (
                  <li key={mention.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            <a href={mention.post_url} target="_blank" rel="noopener noreferrer">
                              {mention.post_title}
                            </a>
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {mention.content}
                          </p>
                          <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                            <span>r/{mention.subreddit}</span>
                            <span>by u/{mention.author}</span>
                            <span>{new Date(mention.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <a
                            href={mention.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-medium"
                          >
                            View on Reddit →
                          </a>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
