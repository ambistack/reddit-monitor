'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from './ui/Toast'
import ModernCard from './ui/ModernCard'
import ModernButton from './ui/ModernButton'
import ModernBadge from './ui/ModernBadge'

interface MonitoredSubreddit {
  id: number
  subreddit_name: string
  keywords: string[]
  created_at: string
}

interface SubredditManagerProps {
  onUpdate?: () => void
  onKeywordManagerStateChange?: (isActive: boolean) => void
}

interface SubredditValidation {
  exists: boolean
  subreddit: string
  displayName?: string
  subscribers?: number
  description?: string
  private?: boolean
  nsfw?: boolean
  error?: string
  warning?: string
  method?: string
}

export default function ModernSubredditManager({ onUpdate, onKeywordManagerStateChange }: SubredditManagerProps) {
  const [monitoredSubreddits, setMonitoredSubreddits] = useState<MonitoredSubreddit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [validationCache, setValidationCache] = useState<Record<string, SubredditValidation>>({})
  const [removingSubreddits, setRemovingSubreddits] = useState<Set<number>>(new Set())
  const [profile, setProfile] = useState<{
    business_name?: string
    location?: string
    industry?: string
  } | null>(null)
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isGeneratingForAll, setIsGeneratingForAll] = useState(false)
  
  // New state for inline keyword management
  const [expandedSubreddit, setExpandedSubreddit] = useState<number | null>(null)
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>({})
  const [savingKeywords, setSavingKeywords] = useState<Set<number>>(new Set())
  const [generatingKeywords, setGeneratingKeywords] = useState<Set<number>>(new Set())
  const [suggestedKeywords, setSuggestedKeywords] = useState<Record<number, string[]>>({})
  
  const { addToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  // Notify parent when keyword manager state changes (now based on expanded state)
  useEffect(() => {
    onKeywordManagerStateChange?.(expandedSubreddit !== null)
  }, [expandedSubreddit, onKeywordManagerStateChange])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Load monitored subreddits
      const { data: subreddits, error } = await supabase
        .from('monitored_subreddits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading subreddits:', error)
        addToast({
          type: 'error',
          title: 'Error Loading Data',
          message: 'Could not load your monitored subreddits'
        })
        return
      }

      setMonitoredSubreddits(subreddits || [])
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while loading data'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateSubreddit = async (subredditName: string): Promise<SubredditValidation | null> => {
    const cacheKey = subredditName.toLowerCase()
    
    // Check cache first
    if (validationCache[cacheKey]) {
      return validationCache[cacheKey]
    }
    
    try {
      const response = await fetch('/api/validate-subreddit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subredditName })
      })

      if (!response.ok) {
        throw new Error('Validation request failed')
      }

      const result = await response.json()
      
      // Cache the result
      setValidationCache(prev => ({
        ...prev,
        [cacheKey]: result
      }))
      
      return result
    } catch (error) {
      console.error('Error validating subreddit:', error)
      return null
    }
  }


  const handleInputChange = async (query: string) => {
    setSearchTerm(query)
    
    // Clear any existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    if (!query.trim()) {
      setValidationStatus('idle')
      return
    }

    const cleanQuery = query.replace(/^r\//, '').trim()
    
    // Basic format validation only - no API calls for suggestions
    if (cleanQuery.length >= 3 && cleanQuery.length <= 21 && /^[A-Za-z0-9_]+$/.test(cleanQuery)) {
      setValidationStatus('checking')
      
      // Debounce the validation to avoid too many API calls
      const timeout = setTimeout(async () => {
        const validation = await validateSubreddit(cleanQuery)
        
        if (validation?.exists === true) {
          setValidationStatus('valid')
        } else {
          setValidationStatus('invalid')
        }
      }, 800) // Increased debounce time

      setValidationTimeout(timeout)
    } else {
      setValidationStatus('invalid')
    }
    
  }

  const addSubreddit = async (subredditName?: string) => {
    const nameToAdd = subredditName || searchTerm.trim()
    if (!nameToAdd.trim()) {
      addToast({
        type: 'error',
        title: 'Invalid Input',
        message: 'Please enter a subreddit name'
      })
      return
    }

    const cleanName = nameToAdd.replace(/^r\//, '').trim()
    
    // If adding from main button, require valid status
    if (!subredditName && validationStatus !== 'valid') {
      addToast({
        type: 'error',
        title: 'Invalid Subreddit',
        message: 'Please wait for validation to complete and ensure the subreddit is valid'
      })
      return
    }
    
    setIsAdding(true)
    
    try {
      // Always validate through Reddit API to ensure subreddit truly exists
      const validation = await validateSubreddit(cleanName)
      
      if (!validation?.exists) {
        addToast({
          type: 'error',
          title: 'Invalid Subreddit',
          message: `r/${cleanName} ${validation?.error || 'does not exist or is not accessible'}`
        })
        return
      }

      // Check if already monitored
      if (monitoredSubreddits.some(sub => sub.subreddit_name.toLowerCase() === cleanName.toLowerCase())) {
        addToast({
          type: 'warning',
          title: 'Already Monitored',
          message: `r/${cleanName} is already being monitored`
        })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile) {
        return
      }

      // Show warning for private subreddits
      if (validation.private) {
        addToast({
          type: 'warning',
          title: 'Private Subreddit',
          message: validation.warning || 'This subreddit is private or restricted'
        })
      }

      // Add to database
      const { error } = await supabase
        .from('monitored_subreddits')
        .insert({
          user_id: user.id,
          subreddit_name: validation.subreddit,
          keywords: [profile.industry, profile.business_name, profile.location].filter(Boolean)
        })

      if (error) {
        console.error('Error adding subreddit:', error)
        addToast({
          type: 'error',
          title: 'Failed to Add',
          message: 'Could not add subreddit to monitoring list'
        })
        return
      }

      // Success!
      await loadData()
      setSearchTerm('')
      setValidationStatus('idle')
      onUpdate?.()

      const successMessage = validation.subscribers
        ? `r/${validation.subreddit} added (${validation.subscribers?.toLocaleString()} subscribers)`
        : `r/${validation.subreddit} added successfully`

      addToast({
        type: 'success',
        title: 'Subreddit Added',
        message: successMessage
      })

    } catch (error) {
      console.error('Error adding subreddit:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred'
      })
    } finally {
      setIsAdding(false)
    }
  }

  const generateKeywordsForAll = async () => {
    if (!profile?.industry) {
      addToast({
        type: 'warning',
        title: 'Profile Incomplete',
        message: 'Please complete your profile to generate keywords'
      })
      return
    }

    setIsGeneratingForAll(true)

    try {
      // Generate keywords based on profile
      const response = await fetch('/api/suggest-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: profile.industry,
          businessName: profile.business_name,
          location: profile.location
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate keywords')
      }

      const { keywords: newKeywords } = await response.json()

      // Update all subreddits with the new keywords
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updatePromises = monitoredSubreddits.map(subreddit => 
        supabase
          .from('monitored_subreddits')
          .update({ keywords: newKeywords })
          .eq('id', subreddit.id)
          .eq('user_id', user.id)
      )

      await Promise.all(updatePromises)
      
      addToast({
        type: 'success',
        title: 'Keywords Updated',
        message: `Updated keywords for ${monitoredSubreddits.length} subreddits`
      })

      await loadData()
      onUpdate?.()

    } catch (error) {
      console.error('Error generating keywords for all:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update keywords for all subreddits'
      })
    } finally {
      setIsGeneratingForAll(false)
    }
  }

  const removeSubreddit = async (id: number, subredditName: string) => {
    setRemovingSubreddits(prev => new Set(prev).add(id))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('monitored_subreddits')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error removing subreddit:', error)
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Could not remove subreddit'
        })
      }

      // Wait for animation then refresh
      setTimeout(async () => {
        await loadData()
        onUpdate?.()
        setRemovingSubreddits(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }, 300)

    } catch (error) {
      console.error('Error removing subreddit:', error)
      setRemovingSubreddits(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // New keyword management functions
  const toggleKeywordManager = (subredditId: number) => {
    if (expandedSubreddit === subredditId) {
      setExpandedSubreddit(null)
    } else {
      setExpandedSubreddit(subredditId)
      // Initialize keyword input if not already set
      if (!keywordInputs[subredditId]) {
        setKeywordInputs(prev => ({ ...prev, [subredditId]: '' }))
      }
    }
  }

  const addKeyword = (subredditId: number, keyword: string) => {
    const cleanKeyword = keyword.trim().toLowerCase()
    
    if (!cleanKeyword) return
    
    const subreddit = monitoredSubreddits.find(s => s.id === subredditId)
    if (!subreddit) return

    if (subreddit.keywords.some(k => k.toLowerCase() === cleanKeyword)) {
      addToast({
        type: 'warning',
        title: 'Duplicate Keyword',
        message: 'This keyword is already in your list'
      })
      return
    }

    // Update local state immediately
    setMonitoredSubreddits(prev => 
      prev.map(s => 
        s.id === subredditId 
          ? { ...s, keywords: [...s.keywords, keyword.trim()] }
          : s
      )
    )

    // Clear input
    setKeywordInputs(prev => ({ ...prev, [subredditId]: '' }))
  }

  const removeKeyword = (subredditId: number, keywordIndex: number) => {
    setMonitoredSubreddits(prev => 
      prev.map(s => 
        s.id === subredditId 
          ? { ...s, keywords: s.keywords.filter((_, index) => index !== keywordIndex) }
          : s
      )
    )
  }

  const saveKeywords = async (subredditId: number) => {
    setSavingKeywords(prev => new Set(prev).add(subredditId))

    try {
      const subreddit = monitoredSubreddits.find(s => s.id === subredditId)
      if (!subreddit) return

      const { error } = await supabase
        .from('monitored_subreddits')
        .update({ keywords: subreddit.keywords })
        .eq('id', subredditId)

      if (error) {
        console.error('Error saving keywords:', error)
        throw new Error(`Update failed: ${error.message}`)
      }

      addToast({
        type: 'success',
        title: 'Keywords Saved',
        message: `Successfully updated ${subreddit.keywords.length} keywords`
      })

      onUpdate?.()

    } catch (error) {
      console.error('Error saving keywords:', error)
      
      let errorMessage = 'Could not save keywords'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      addToast({
        type: 'error',
        title: 'Save Failed', 
        message: errorMessage
      })
    } finally {
      setSavingKeywords(prev => {
        const newSet = new Set(prev)
        newSet.delete(subredditId)
        return newSet
      })
    }
  }

  const generateKeywordSuggestions = async (subredditId: number) => {
    if (!profile?.industry) {
      addToast({
        type: 'warning',
        title: 'Profile Incomplete',
        message: 'Please complete your profile to get personalized keyword suggestions'
      })
      return
    }

    setGeneratingKeywords(prev => new Set(prev).add(subredditId))
    
    try {
      const response = await fetch('/api/suggest-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: profile.industry,
          businessName: profile.business_name,
          location: profile.location
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestions')
      }

      const data = await response.json()
      setSuggestedKeywords(prev => ({
        ...prev,
        [subredditId]: data.keywords || []
      }))
      
      addToast({
        type: 'success',
        title: 'Keywords Generated',
        message: `Generated ${data.keywords?.length || 0} keyword suggestions`
      })

    } catch (error) {
      console.error('Error generating keywords:', error)
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: 'Could not generate keyword suggestions'
      })
    } finally {
      setGeneratingKeywords(prev => {
        const newSet = new Set(prev)
        newSet.delete(subredditId)
        return newSet
      })
    }
  }

  const addSuggestedKeyword = (subredditId: number, keyword: string) => {
    addKeyword(subredditId, keyword)
    setSuggestedKeywords(prev => ({
      ...prev,
      [subredditId]: prev[subredditId]?.filter(k => k !== keyword) || []
    }))
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Add New Subreddit */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Subreddit</h3>
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter exact subreddit name (e.g., 'technology', 'programming')"
              className={`
                w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 
                transition-all duration-200 bg-white/80 backdrop-blur-sm
                ${
                  validationStatus === 'checking' ? 'border-blue-300 focus:ring-blue-500' :
                  validationStatus === 'valid' ? 'border-green-500 bg-green-50/50 focus:ring-green-500' :
                  validationStatus === 'invalid' ? 'border-red-500 bg-red-50/50 focus:ring-red-500' :
                  'border-gray-300 focus:ring-blue-500'
                }
              `}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isAdding) {
                  addSubreddit()
                }
              }}
              disabled={isAdding}
            />
            {/* Status Icon */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {validationStatus === 'checking' && (
                <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {validationStatus === 'valid' && (
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {validationStatus === 'invalid' && (
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <ModernButton
            onClick={() => addSubreddit()}
            disabled={!searchTerm.trim() || isAdding || validationStatus !== 'valid'}
            loading={isAdding}
            variant={validationStatus === 'valid' ? 'primary' : 'secondary'}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </ModernButton>
        </div>
        
      </div>

      {/* Currently Monitored */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Currently Monitoring ({monitoredSubreddits.length} subreddits)
          </h3>
          {monitoredSubreddits.length > 0 && profile?.industry && (
            <ModernButton
              onClick={generateKeywordsForAll}
              loading={isGeneratingForAll}
              variant="outline"
              size="sm"
            >
              {isGeneratingForAll ? 'Updating...' : 'Update All Keywords'}
            </ModernButton>
          )}
        </div>
        
        {monitoredSubreddits.length === 0 ? (
          <ModernCard className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">No subreddits being monitored yet.</p>
            <p className="text-gray-400 text-sm mt-2">Use the search above to add some!</p>
          </ModernCard>
        ) : (
          <div className="space-y-3">
            {monitoredSubreddits.map(subreddit => {
              const isRemoving = removingSubreddits.has(subreddit.id)
              const isExpanded = expandedSubreddit === subreddit.id
              const isSaving = savingKeywords.has(subreddit.id)
              const isGenerating = generatingKeywords.has(subreddit.id)
              const suggestions = suggestedKeywords[subreddit.id] || []
              
              return (
                <ModernCard
                  key={subreddit.id}
                  className={`
                    transition-all duration-300 ease-in-out
                    ${isRemoving 
                      ? 'opacity-0 transform translate-x-full scale-95' 
                      : 'opacity-100 transform translate-x-0 scale-100'
                    }
                  `}
                  hover={!isRemoving}
                  padding="sm"
                >
                  <div className="space-y-4">
                    {/* Main subreddit info */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-gray-900">
                            r/{subreddit.subreddit_name}
                          </h4>
                          <a
                            href={`https://reddit.com/r/${subreddit.subreddit_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500">Keywords:</span>
                          {subreddit.keywords?.length > 0 ? (
                            subreddit.keywords.map((keyword, index) => (
                              <ModernBadge key={index} variant="default" size="sm">
                                {keyword}
                              </ModernBadge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ModernButton
                          onClick={() => toggleKeywordManager(subreddit.id)}
                          variant="outline"
                          size="sm"
                        >
                          {isExpanded ? 'Hide Keywords' : `Manage Keywords (${subreddit.keywords?.length || 0})`}
                        </ModernButton>
                        <ModernButton
                          onClick={() => removeSubreddit(subreddit.id, subreddit.subreddit_name)}
                          disabled={isRemoving}
                          variant="danger"
                          size="sm"
                        >
                          {isRemoving ? 'Removing...' : 'Remove'}
                        </ModernButton>
                      </div>
                    </div>

                    {/* Expanded keyword management section */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 pt-4 space-y-4">
                        {/* Current Keywords */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Current Keywords ({subreddit.keywords.length})
                          </h5>
                          {subreddit.keywords.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                              <p className="text-gray-500 text-sm">No keywords set</p>
                              <p className="text-gray-400 text-xs mt-1">Add some keywords below to start monitoring</p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {subreddit.keywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                >
                                  {keyword}
                                  <button
                                    onClick={() => removeKeyword(subreddit.id, index)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add New Keyword */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Add New Keyword</h5>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={keywordInputs[subreddit.id] || ''}
                              onChange={(e) => setKeywordInputs(prev => ({ 
                                ...prev, 
                                [subreddit.id]: e.target.value 
                              }))}
                              placeholder="Enter keyword..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addKeyword(subreddit.id, keywordInputs[subreddit.id] || '')
                                }
                              }}
                            />
                            <ModernButton
                              onClick={() => addKeyword(subreddit.id, keywordInputs[subreddit.id] || '')}
                              disabled={!keywordInputs[subreddit.id]?.trim()}
                              size="sm"
                            >
                              Add
                            </ModernButton>
                          </div>
                        </div>

                        {/* AI Suggestions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-700">
                              AI-Generated Suggestions
                            </h5>
                            <ModernButton
                              onClick={() => generateKeywordSuggestions(subreddit.id)}
                              disabled={isGenerating}
                              variant="outline"
                              size="sm"
                            >
                              {isGenerating ? 'Generating...' : 'Generate'}
                            </ModernButton>
                          </div>
                          
                          {suggestions.length > 0 ? (
                            <div className="bg-purple-50 rounded-lg p-3">
                              <p className="text-purple-800 text-xs mb-2">Click to add:</p>
                              <div className="flex flex-wrap gap-2">
                                {suggestions.map((keyword, index) => (
                                  <button
                                    key={index}
                                    onClick={() => addSuggestedKeyword(subreddit.id, keyword)}
                                    className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full hover:bg-purple-200 transition-colors"
                                  >
                                    + {keyword}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-gray-500 text-sm">
                                Click "Generate" to get AI-powered keyword suggestions based on your business profile
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Save Actions */}
                        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                          <ModernButton
                            onClick={() => setExpandedSubreddit(null)}
                            variant="outline"
                            size="sm"
                          >
                            Close
                          </ModernButton>
                          <ModernButton
                            onClick={() => saveKeywords(subreddit.id)}
                            disabled={isSaving}
                            loading={isSaving}
                            size="sm"
                          >
                            {isSaving ? 'Saving...' : 'Save Keywords'}
                          </ModernButton>
                        </div>
                      </div>
                    )}
                  </div>
                </ModernCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
