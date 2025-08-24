'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { getIndustrySubreddits, getLocationSubreddits } from '@/lib/subredditSuggestions'

export default function SubredditSelector() {
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([])
  const [businessSuggestions, setBusinessSuggestions] = useState<string[]>([])
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [industrySuggestions, setIndustrySuggestions] = useState<string[]>([])
  const [customSubreddit, setCustomSubreddit] = useState('')
  const [profile, setProfile] = useState<{
    business_name: string
    location: string
    industry: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        
        // Get separate suggestion categories
        const industrySubs = getIndustrySubreddits(data.industry)
        const locationSubs = getLocationSubreddits(data.location)
        
        // Business-specific based on name
        const businessSubs: string[] = []
        const businessName = data.business_name.toLowerCase()
        if (businessName.includes('chamber')) {
          businessSubs.push('events', 'EventPlanning', 'venue', 'weddingplanning', 'business', 'networking')
        }
        
        setIndustrySuggestions(industrySubs)
        setLocationSuggestions(locationSubs)
        setBusinessSuggestions([...new Set(businessSubs)])
        
        // Pre-select the most relevant ones
        const combined = [...businessSubs, ...locationSubs.slice(0, 2), ...industrySubs.slice(0, 3)]
        const uniqueSelected = [...new Set(combined)].slice(0, 5)
        setSelectedSubreddits(uniqueSelected)
        
        console.log('Location suggestions for', data.location, ':', locationSubs)
        console.log('Industry suggestions for', data.industry, ':', industrySubs)
        console.log('Business suggestions for', data.business_name, ':', businessSubs)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSubredditToggle = (subreddit: string) => {
    if (selectedSubreddits.includes(subreddit)) {
      setSelectedSubreddits(selectedSubreddits.filter(s => s !== subreddit))
    } else {
      setSelectedSubreddits([...selectedSubreddits, subreddit])
    }
  }

  const handleAddCustom = () => {
    const cleaned = customSubreddit.replace(/^r\//, '').trim()
    if (cleaned && !selectedSubreddits.includes(cleaned)) {
      setSelectedSubreddits([...selectedSubreddits, cleaned])
      setCustomSubreddit('')
    }
  }

  const handleSave = async () => {
    if (selectedSubreddits.length === 0) {
      alert('Please select at least one subreddit to monitor')
      return
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Clear existing subreddits for this user
      await supabase
        .from('monitored_subreddits')
        .delete()
        .eq('user_id', user.id)

      // Save selected subreddits
      const promises = selectedSubreddits.map(subreddit =>
        supabase.from('monitored_subreddits').insert({
          user_id: user.id,
          subreddit_name: subreddit,
          keywords: [profile?.industry, profile?.business_name, profile?.location].filter(Boolean)
        })
      )

      await Promise.all(promises)
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error saving subreddits:', error)
      alert('Error saving selections. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading personalized suggestions...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found. Please complete onboarding first.</p>
          <a href="/onboarding" className="text-blue-600 hover:text-blue-500 mt-2 inline-block">
            Go to onboarding →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Select Subreddits to Monitor</h1>
            <p className="mt-2 text-gray-600">
              Based on <strong>{profile.business_name}</strong> in <strong>{profile.location}</strong>, 
              specializing in <strong>{profile.industry}</strong>, here are personalized subreddit recommendations.
            </p>
          </div>

          {/* Business-Specific Subreddits */}
          {businessSuggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                🏢 Business-Specific Subreddits
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {businessSuggestions.map(subreddit => (
                  <label key={subreddit} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSubreddits.includes(subreddit) 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedSubreddits.includes(subreddit)}
                      onChange={() => handleSubredditToggle(subreddit)}
                      className="text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium">r/{subreddit}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Location-Specific Subreddits */}
          {locationSuggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                📍 Location-Based Subreddits ({profile.location})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {locationSuggestions.map(subreddit => (
                  <label key={subreddit} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSubreddits.includes(subreddit) 
                      ? 'bg-green-50 border-green-300' 
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedSubreddits.includes(subreddit)}
                      onChange={() => handleSubredditToggle(subreddit)}
                      className="text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium">r/{subreddit}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Industry-Specific Subreddits */}
          {industrySuggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                🏭 Industry Subreddits ({profile.industry})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {industrySuggestions.map(subreddit => (
                  <label key={subreddit} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSubreddits.includes(subreddit) 
                      ? 'bg-purple-50 border-purple-300' 
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedSubreddits.includes(subreddit)}
                      onChange={() => handleSubredditToggle(subreddit)}
                      className="text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium">r/{subreddit}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Subreddit */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">➕ Add Custom Subreddit</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customSubreddit}
                onChange={(e) => setCustomSubreddit(e.target.value)}
                placeholder="Enter subreddit name (e.g., 'technology' or 'r/technology')"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <button
                onClick={handleAddCustom}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-500">
              <strong>{selectedSubreddits.length}</strong> subreddit{selectedSubreddits.length !== 1 ? 's' : ''} selected
              {selectedSubreddits.length > 0 && (
                <div className="mt-1">
                  Selected: {selectedSubreddits.slice(0, 5).join(', ')}
                  {selectedSubreddits.length > 5 && ` +${selectedSubreddits.length - 5} more`}
                </div>
              )}
            </div>
            <div className="space-x-3">
              <button
                onClick={() => window.location.href = '/onboarding'}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Profile
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || selectedSubreddits.length === 0}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Starting Monitor...' : `Start Monitoring (${selectedSubreddits.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
