'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getIndustrySubreddits, getLocationSubreddits } from '@/lib/subredditSuggestions'

export default function SubredditSelector() {
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([])
  const [suggestedSubreddits, setSuggestedSubreddits] = useState<string[]>([])
  const [locationSubreddits, setLocationSubreddits] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
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
        const industrySubs = getIndustrySubreddits(data.industry)
        const locationSubs = getLocationSubreddits(data.location)
        setSuggestedSubreddits(industrySubs)
        setLocationSubreddits(locationSubs)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubredditToggle = (subreddit: string) => {
    if (selectedSubreddits.includes(subreddit)) {
      setSelectedSubreddits(selectedSubreddits.filter(s => s !== subreddit))
    } else {
      setSelectedSubreddits([...selectedSubreddits, subreddit])
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
          keywords: [profile.industry, profile.business_name, profile.location]
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
          <p className="mt-4 text-gray-600">Loading your profile...</p>
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

  const allSubreddits = [...new Set([...suggestedSubreddits, ...locationSubreddits])]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Select Subreddits to Monitor</h1>
            <p className="mt-2 text-gray-600">
              Based on your business ({profile.business_name}) in {profile.location}, 
              here are some relevant subreddits to monitor for mentions in the {profile.industry} industry.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Industry Subreddits ({profile.industry})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {suggestedSubreddits.map(subreddit => (
                <label key={subreddit} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
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

          {locationSubreddits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Location Subreddits ({profile.location})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {locationSubreddits.map(subreddit => (
                  <label key={subreddit} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
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

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-500">
              {selectedSubreddits.length} subreddit{selectedSubreddits.length !== 1 ? 's' : ''} selected
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
