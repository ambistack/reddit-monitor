'use client'
import { useState, useEffect } from 'react'
import { useToast } from './ui/Toast'
import { createClient } from '@/lib/supabase'

interface KeywordManagerProps {
  subredditId: number
  subredditName: string
  currentKeywords: string[]
  profile: {
    business_name?: string
    location?: string
    industry?: string
  }
  onUpdate: () => void
  onClose: () => void
}

export default function KeywordManager({ 
  subredditId, 
  subredditName, 
  currentKeywords, 
  profile,
  onUpdate,
  onClose
}: KeywordManagerProps) {
  const [keywords, setKeywords] = useState<string[]>(currentKeywords || [])
  const [newKeyword, setNewKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const { addToast } = useToast()

  useEffect(() => {
    setKeywords(currentKeywords || [])
  }, [currentKeywords])

  const generateKeywordSuggestions = async () => {
    if (!profile?.industry) {
      addToast({
        type: 'warning',
        title: 'Profile Incomplete',
        message: 'Please complete your profile to get personalized keyword suggestions'
      })
      return
    }

    setIsGenerating(true)
    
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
      setSuggestedKeywords(data.keywords || [])
      
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
      setIsGenerating(false)
    }
  }

  const addKeyword = (keyword: string) => {
    const cleanKeyword = keyword.trim().toLowerCase()
    
    if (!cleanKeyword) return
    
    if (keywords.some(k => k.toLowerCase() === cleanKeyword)) {
      addToast({
        type: 'warning',
        title: 'Duplicate Keyword',
        message: 'This keyword is already in your list'
      })
      return
    }

    setKeywords(prev => [...prev, keyword.trim()])
    setNewKeyword('')
  }

  const removeKeyword = (indexToRemove: number) => {
    setKeywords(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const saveKeywords = async () => {
    setIsLoading(true)

    try {
      console.log('Attempting to save keywords:', {
        subredditId,
        keywords,
        keywordCount: keywords.length
      })
      
      // Try direct Supabase update first (should work since RLS policies are in place)
      const supabase = createClient()
      
      console.log('Using direct Supabase update...')
      const { data, error } = await supabase
        .from('monitored_subreddits')
        .update({ keywords })
        .eq('id', subredditId)
        .select()
      
      if (error) {
        console.error('Direct Supabase update failed:', error)
        throw new Error(`Update failed: ${error.message}`)
      }
      
      console.log('Direct update successful:', data)
      
      addToast({
        type: 'success',
        title: 'Keywords Saved',
        message: `Successfully updated ${keywords.length} keywords`
      })

      onUpdate()
      // Close the keyword manager after successful save
      onClose()

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
      setIsLoading(false)
    }
  }

  const addSuggestedKeyword = (keyword: string) => {
    addKeyword(keyword)
    setSuggestedKeywords(prev => prev.filter(k => k !== keyword))
  }

  // KeywordManager is now always rendered full-screen when active
  // No conditional rendering needed here
  return (
    <div 
      className="fixed inset-0 bg-white overflow-y-auto" 
      style={{ 
        zIndex: 2147483647, // Maximum possible z-index
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'white',
        overflow: 'hidden auto' // Hide horizontal overflow
      }}
    >
      {/* Extra backdrop to ensure nothing shows through */}
      <div 
        className="absolute inset-0 bg-white"
        style={{ zIndex: 1 }}
      />
      
      {/* Main content */}
      <div className="relative w-full min-h-screen px-4 sm:px-6 lg:px-8 py-8" style={{ zIndex: 2 }}>
        <div className="w-full max-w-7xl mx-auto">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">
                Manage Keywords for r/{subredditName}
              </h3>
              <p className="text-base text-gray-600 mt-2">
                Add, remove, and organize keywords for monitoring
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Current Keywords */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Current Keywords ({keywords.length})
          </h4>
          {keywords.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500 text-lg">No keywords set</p>
              <p className="text-gray-400 text-sm mt-1">Add some keywords below to start monitoring</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-base rounded-full"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="ml-3 text-blue-600 hover:text-blue-800 text-lg"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add New Keyword */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Add New Keyword</h4>
          <div className="flex space-x-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Enter keyword..."
              className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addKeyword(newKeyword)
                }
              }}
            />
            <button
              onClick={() => addKeyword(newKeyword)}
              disabled={!newKeyword.trim()}
              className="px-6 py-3 bg-blue-600 text-white text-base rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Generate Suggestions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              AI-Generated Suggestions
            </h4>
            <button
              onClick={generateKeywordSuggestions}
              disabled={isGenerating}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          
          {suggestedKeywords.length > 0 ? (
            <div className="bg-purple-50 rounded-lg p-6">
              <p className="text-purple-800 text-sm mb-3">Click to add:</p>
              <div className="flex flex-wrap gap-3">
                {suggestedKeywords.map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => addSuggestedKeyword(keyword)}
                    className="px-4 py-2 bg-purple-100 text-purple-800 text-base rounded-full hover:bg-purple-200 transition-colors"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-500 text-base">
                Click &quot;Generate&quot; to get AI-powered keyword suggestions based on your business profile
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-8 py-4 text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              saveKeywords()
              // onUpdate and onClose are called within saveKeywords
            }}
            disabled={isLoading}
            className="px-8 py-4 text-base bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Keywords'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
