'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import ConnectionStatus from '@/components/ui/ConnectionStatus'
import ModernSubredditManager from '@/components/ModernSubredditManager'
import ProfileEditor from '@/components/ProfileEditor'
import ModernCard from '@/components/ui/ModernCard'
import ModernButton from '@/components/ui/ModernButton'
import ModernDropdown, { DropdownItem, DropdownHeader, DropdownSeparator } from '@/components/ui/ModernDropdown'
import ModernBadge from '@/components/ui/ModernBadge'

interface Mention {
  id: number
  subreddit: string
  post_title: string
  post_url: string
  content: string
  author: string
  created_at: string
  flagged_keyword?: string | null
  keyword_context?: string | null
  match_type?: 'keyword' | 'location' | 'business' | 'industry' | null
}

interface Profile {
  business_name: string
  location: string
  industry: string
}

export default function Dashboard() {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [filteredMentions, setFilteredMentions] = useState<Mention[]>([])
  const [sortBy] = useState<{
    subreddit: 'asc' | 'desc' | null
    date: 'asc' | 'desc' | null
    keyword: 'asc' | 'desc' | null
  }>({ subreddit: null, date: 'desc', keyword: null })
  const [filterBy, setFilterBy] = useState<{
    subreddits: string[]
    keywords: string[]
  }>({ subreddits: [], keywords: [] })
  const [availableSubreddits, setAvailableSubreddits] = useState<string[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastMonitor, setLastMonitor] = useState<string | null>(null)
  const [showSubredditManager, setShowSubredditManager] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [monitoredCount, setMonitoredCount] = useState(0)
  const [isKeywordManagerActive, setIsKeywordManagerActive] = useState(false)
  const { addToast } = useToast()
  const supabase = createClient()

  // Sort and filter mentions when mentions, sortBy, or filterBy changes
  useEffect(() => {
    let filtered = [...mentions]

    // Apply filters first
    if (filterBy.subreddits.length > 0) {
      filtered = filtered.filter(mention => 
        filterBy.subreddits.includes(mention.subreddit)
      )
    }

    if (filterBy.keywords.length > 0) {
      filtered = filtered.filter(mention => 
        mention.flagged_keyword && filterBy.keywords.includes(mention.flagged_keyword)
      )
    }

    // Then apply sorts
    if (sortBy.subreddit) {
      filtered.sort((a, b) => {
        const comparison = a.subreddit.localeCompare(b.subreddit)
        return sortBy.subreddit === 'asc' ? comparison : -comparison
      })
    }

    if (sortBy.keyword) {
      filtered.sort((a, b) => {
        const keywordA = a.flagged_keyword || ''
        const keywordB = b.flagged_keyword || ''
        const comparison = keywordA.localeCompare(keywordB)
        return sortBy.keyword === 'asc' ? comparison : -comparison
      })
    }

    if (sortBy.date) {
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortBy.date === 'asc' ? dateA - dateB : dateB - dateA
      })
    }

    setFilteredMentions(filtered)
  }, [mentions, sortBy, filterBy])

  const loadData = useCallback(async () => {
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

      // Load ALL monitored subreddits
      const { data: subredditsData } = await supabase
        .from('monitored_subreddits')
        .select('subreddit_name')
        .eq('user_id', user.id)
      
      const allSubreddits = (subredditsData || []).map(s => s.subreddit_name).sort()
      setAvailableSubreddits(allSubreddits)
      setMonitoredCount(subredditsData?.length || 0)

      // Extract ALL unique keywords from monitored subreddits (not just from mentions)
      if (subredditsData && subredditsData.length > 0) {
        // Get all keywords from all monitored subreddits
        const { data: subredditKeywords } = await supabase
          .from('monitored_subreddits')
          .select('keywords')
          .eq('user_id', user.id)
        
        if (subredditKeywords) {
          const allKeywords = subredditKeywords
            .flatMap(sub => sub.keywords || [])
            .filter(Boolean)
          
          const uniqueKeywords = [...new Set(allKeywords)].sort()
          setAvailableKeywords(uniqueKeywords as string[])
        }
      } else {
        setAvailableKeywords([])
      }

    } catch (error) {
      console.error('Error loading data:', error)
      addToast({
        type: 'error',
        title: 'Loading Error',
        message: 'Could not load dashboard data'
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, addToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleSubredditFilter = (subreddit: string) => {
    setFilterBy(prev => ({
      ...prev,
      subreddits: prev.subreddits.includes(subreddit)
        ? prev.subreddits.filter(s => s !== subreddit)
        : [subreddit, ...prev.subreddits]
    }))
  }

  const toggleKeywordFilter = (keyword: string) => {
    setFilterBy(prev => ({
      ...prev,
      keywords: prev.keywords.includes(keyword)
        ? prev.keywords.filter(k => k !== keyword)
        : [keyword, ...prev.keywords]
    }))
  }

  const clearOldMentions = async () => {
    if (!confirm('Are you sure you want to clear all old mentions? This action cannot be undone.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        addToast({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please refresh the page and try again'
        })
        return
      }

      const { data: deletedData, error: deleteError } = await supabase
        .from('mentions')
        .delete()
        .eq('user_id', user.id)
        .select()

      if (deleteError) {
        const response = await fetch('/api/clear-mentions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        })

        const result = await response.json()
        
        if (response.ok) {
          addToast({
            type: 'success',
            title: 'Mentions Cleared',
            message: `Cleared ${result.cleared} mentions`
          })
          await loadData()
        } else {
          addToast({
            type: 'error',
            title: 'Clear Failed',
            message: result.error || 'Could not clear mentions'
          })
        }
        return
      }

      const deletedCount = deletedData?.length || 0
      
      addToast({
        type: 'success',
        title: 'Mentions Cleared',
        message: `Successfully deleted ${deletedCount} mentions`
      })
      
      await loadData()
      
    } catch (error) {
      console.error('Error clearing mentions:', error)
      addToast({
        type: 'error',
        title: 'Unexpected Error',
        message: 'Could not clear mentions. Please try again.'
      })
    }
  }

  const runMonitoring = async () => {
    setIsMonitoring(true)
    
    addToast({
      type: 'info',
      title: 'Monitoring Started',
      message: 'Searching for new mentions across your subreddits...'
    })

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
        await loadData()
        
        const totalFound = result.results?.reduce((sum: number, r: { found?: number }) => sum + (r.found || 0), 0) || 0
        const totalSaved = result.results?.reduce((sum: number, r: { saved?: number }) => sum + (r.saved || 0), 0) || 0
        
        if (totalSaved > 0) {
          addToast({
            type: 'success',
            title: 'New Mentions Found!',
            message: `Found ${totalFound} relevant posts, saved ${totalSaved} new mentions.`
          })
        } else if (totalFound > 0) {
          addToast({
            type: 'info',
            title: 'Monitoring Complete',
            message: `Found ${totalFound} relevant posts, but no new mentions (duplicates filtered out).`
          })
        } else {
          addToast({
            type: 'info',
            title: 'No New Mentions',
            message: 'No relevant posts found in this monitoring cycle.'
          })
        }
      } else {
        addToast({
          type: 'error',
          title: 'Monitoring Failed',
          message: result.error || 'Could not complete monitoring cycle'
        })
      }
    } catch (error) {
      console.error('Error running monitoring:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Could not connect to monitoring service. Please try again.'
      })
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <ModernCard className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </ModernCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <ConnectionStatus />

      {/* Modern Header */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-6 space-y-4 lg:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <img 
                      src="/reddit-logo.svg" 
                      alt="Reddit Logo" 
                      className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 flex-shrink-0 transition-all duration-200"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Reddit Monitor
                    </h1>
                  </div>
                  {profile && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-2 space-y-2 sm:space-y-0">
                      <p className="text-sm text-gray-600 truncate">
                        Monitoring for <span className="font-medium">{profile.business_name}</span> in <span className="font-medium">{profile.location}</span>
                      </p>
                      <div className="flex items-center space-x-2">
                        <ModernBadge variant="industry">{profile.industry}</ModernBadge>
                        <button
                          onClick={() => setShowProfileEditor(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <ModernButton
                    variant="secondary"
                    onClick={() => setShowSubredditManager(!showSubredditManager)}
                    size="sm"
                  >
                    {showSubredditManager ? 'Hide' : 'Manage'} Subreddits
                  </ModernButton>
                  <ModernButton
                    onClick={runMonitoring}
                    loading={isMonitoring}
                    size="sm"
                    icon={!isMonitoring && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  >
                    {isMonitoring ? 'Monitoring...' : 'Run Monitor'}
                  </ModernButton>
                  <ModernButton
                    variant="ghost"
                    onClick={signOut}
                    size="sm"
                  >
                    Sign Out
                  </ModernButton>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Subreddit Manager */}
            {showSubredditManager && (
              <ModernCard className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Subreddits</h2>
                  <button
                    onClick={() => setShowSubredditManager(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ModernSubredditManager 
                  onUpdate={loadData} 
                  onKeywordManagerStateChange={setIsKeywordManagerActive}
                />
              </ModernCard>
            )}

            <ProfileEditor
              isOpen={showProfileEditor}
              onClose={() => setShowProfileEditor(false)}
              onUpdate={loadData}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <ModernCard hover>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Mentions</p>
                    <p className="text-2xl font-bold text-gray-900">{mentions.length}</p>
                  </div>
                </div>
              </ModernCard>

              <ModernCard hover>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Subreddits</p>
                    <p className="text-2xl font-bold text-gray-900">{monitoredCount}</p>
                  </div>
                </div>
              </ModernCard>

              <ModernCard hover>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Last Check</p>
                    <p className="text-sm font-bold text-gray-900">
                      {lastMonitor || 'Never'}
                    </p>
                  </div>
                </div>
              </ModernCard>
            </div>

            {/* Mentions Section */}
            <ModernCard>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Mentions</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Posts mentioning your business, industry, or location
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {mentions.length > 0 && (
                    <ModernButton
                      variant="danger"
                      size="sm"
                      onClick={clearOldMentions}
                    >
                      Clear All
                    </ModernButton>
                  )}
                </div>
              </div>
              
              {/* Filter Controls */}
              {mentions.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 p-4 bg-gray-50/50 rounded-xl space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Showing {filteredMentions.length} of {mentions.length} mentions
                    </span>
                    {(filterBy.subreddits.length > 0 || filterBy.keywords.length > 0) && (
                      <ModernBadge variant="default">Filtered</ModernBadge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    {/* Subreddit Filter */}
                    <ModernDropdown
                      trigger={
                        <ModernButton
                          variant={filterBy.subreddits.length > 0 ? "primary" : "outline"}
                          size="sm"
                        >
                          Subreddits {filterBy.subreddits.length > 0 && `(${filterBy.subreddits.length})`}
                        </ModernButton>
                      }
                    >
                      <DropdownHeader>
                        Select Subreddits ({availableSubreddits.length} available)
                      </DropdownHeader>
                      <div className="max-h-64 overflow-y-auto">
                        {availableSubreddits.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            No subreddits available
                          </div>
                        ) : (
                          availableSubreddits.map(subreddit => (
                            <DropdownItem
                              key={subreddit}
                              onClick={() => toggleSubredditFilter(subreddit)}
                              selected={filterBy.subreddits.includes(subreddit)}
                            >
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                filterBy.subreddits.includes(subreddit)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {filterBy.subreddits.includes(subreddit) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              r/{subreddit}
                            </DropdownItem>
                          ))
                        )}
                      </div>
                      {filterBy.subreddits.length > 0 && (
                        <>
                          <DropdownSeparator />
                          <DropdownItem
                            onClick={() => setFilterBy(prev => ({ ...prev, subreddits: [] }))}
                          >
                            <span className="text-red-600">Clear all selections</span>
                          </DropdownItem>
                        </>
                      )}
                    </ModernDropdown>

                    {/* Keyword Filter */}
                    <ModernDropdown
                      trigger={
                        <ModernButton
                          variant={filterBy.keywords.length > 0 ? "primary" : "outline"}
                          size="sm"
                        >
                          Keywords {filterBy.keywords.length > 0 && `(${filterBy.keywords.length})`}
                        </ModernButton>
                      }
                    >
                      <DropdownHeader>
                        Select Keywords ({availableKeywords.length} available)
                      </DropdownHeader>
                      <div className="max-h-64 overflow-y-auto">
                        {availableKeywords.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            No keywords available
                          </div>
                        ) : (
                          availableKeywords.map(keyword => (
                            <DropdownItem
                              key={keyword}
                              onClick={() => toggleKeywordFilter(keyword)}
                              selected={filterBy.keywords.includes(keyword)}
                            >
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                filterBy.keywords.includes(keyword)
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-gray-300'
                              }`}>
                                {filterBy.keywords.includes(keyword) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              &quot;{keyword}&quot;
                            </DropdownItem>
                          ))
                        )}
                      </div>
                      {filterBy.keywords.length > 0 && (
                        <>
                          <DropdownSeparator />
                          <DropdownItem
                            onClick={() => setFilterBy(prev => ({ ...prev, keywords: [] }))}
                          >
                            <span className="text-red-600">Clear all selections</span>
                          </DropdownItem>
                        </>
                      )}
                    </ModernDropdown>
                  </div>
                </div>
              )}
            
              {mentions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No mentions found yet</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {monitoredCount === 0 
                      ? 'Add some subreddits to monitor, then click "Run Monitor" to start finding mentions'
                      : 'Click "Run Monitor" to search for recent posts mentioning your business'
                    }
                  </p>
                  {monitoredCount === 0 ? (
                    <ModernButton
                      onClick={() => setShowSubredditManager(true)}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }
                    >
                      Add Subreddits
                    </ModernButton>
                  ) : (
                    <ModernButton
                      onClick={runMonitoring}
                      loading={isMonitoring}
                      icon={!isMonitoring && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    >
                      {isMonitoring ? 'Searching...' : 'Start Monitoring'}
                    </ModernButton>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMentions.map((mention) => (
                    <div key={mention.id} className="p-4 sm:p-6 bg-white/50 rounded-xl border border-gray-100 hover:bg-white/80 transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-semibold text-blue-600 hover:text-blue-700 mb-3 leading-tight">
                            <a href={mention.post_url} target="_blank" rel="noopener noreferrer" className="break-words">
                              {mention.post_title}
                            </a>
                          </h4>
                          
                          {/* Keyword Context Display */}
                          {mention.flagged_keyword && mention.keyword_context && (
                            <div className="mb-4 p-3 sm:p-4 bg-gray-50/80 rounded-xl">
                              <div className="flex items-center flex-wrap gap-2 mb-3">
                                {mention.match_type && (
                                  <ModernBadge variant={mention.match_type}>
                                    {mention.match_type === 'keyword' ? 'Keyword' :
                                     mention.match_type === 'location' ? 'Location' :
                                     mention.match_type === 'business' ? 'Business' :
                                     'Industry'}
                                  </ModernBadge>
                                )}
                                <ModernBadge variant="default">&quot;{mention.flagged_keyword}&quot;</ModernBadge>
                                {filterBy.subreddits.length > 0 && (
                                  <ModernBadge variant="subreddit">r/{mention.subreddit}</ModernBadge>
                                )}
                              </div>
                              <div 
                                className="text-gray-700 text-xs sm:text-sm bg-white/80 p-2 sm:p-3 rounded-lg border font-mono leading-relaxed break-words overflow-hidden"
                                dangerouslySetInnerHTML={{ 
                                  __html: mention.keyword_context.replace(
                                    new RegExp(`(${mention.flagged_keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                  )
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                            <span className="truncate">r/{mention.subreddit}</span>
                            <span className="truncate">by u/{mention.author}</span>
                            <span className="whitespace-nowrap">{new Date(mention.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 sm:ml-4">
                          <ModernButton
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(mention.post_url, '_blank')}
                            className="w-full sm:w-auto"
                          >
                            <span className="sm:hidden">View Post</span>
                            <span className="hidden sm:inline">View on Reddit →</span>
                          </ModernButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ModernCard>
          </div>
    </div>
  )
}
