import { NextRequest, NextResponse } from 'next/server'

interface SubredditData {
  name: string
  over_18?: boolean
  subreddit_type?: string
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { suggestions: [] },
        { status: 200 }
      )
    }

    console.log(`API: Searching Reddit for subreddit suggestions: ${query}`)

    const suggestions: string[] = []

    // Method 1: Try Reddit's search_reddit_names API (best for finding subreddits by name)
    try {
      console.log(`API: Trying search_reddit_names for suggestions`)
      const searchUrl = `https://www.reddit.com/api/search_reddit_names.json?query=${encodeURIComponent(query)}&include_over_18=false`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`API: search_reddit_names response:`, data)
        
        if (data.names && Array.isArray(data.names)) {
          // Add all matching names, prioritize partial matches
          const exactMatches = data.names.filter((name: string) => 
            name.toLowerCase().startsWith(query.toLowerCase())
          )
          const partialMatches = data.names.filter((name: string) => 
            !name.toLowerCase().startsWith(query.toLowerCase()) && 
            name.toLowerCase().includes(query.toLowerCase())
          )
          
          suggestions.push(...exactMatches, ...partialMatches)
          console.log(`API: Found ${suggestions.length} suggestions from search_reddit_names`)
        }
      } else {
        console.log(`API: search_reddit_names failed with status ${response.status}`)
      }
    } catch (error) {
      console.log(`API: search_reddit_names error:`, error)
    }

    // Method 2: Try search_subreddits API for more detailed results (if we need more suggestions)
    if (suggestions.length < 5) {
      try {
        console.log(`API: Trying search_subreddits for more suggestions`)
        const searchUrl = `https://www.reddit.com/api/search_subreddits.json?query=${encodeURIComponent(query)}&include_over_18=false&limit=10`
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Reddit-Monitor/1.0 (Business monitoring tool)'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`API: search_subreddits response structure:`, Object.keys(data))
          
          if (data.subreddits && Array.isArray(data.subreddits)) {
            const subredditNames = data.subreddits
              .filter((sub: SubredditData) => {
                // Filter out NSFW, private, and restricted subreddits
                if (sub.over_18 === true) {
                  console.log(`API: Filtering out NSFW subreddit: ${sub.name}`)
                  return false
                }
                if (sub.subreddit_type === 'private' || sub.subreddit_type === 'restricted') {
                  console.log(`API: Filtering out private/restricted subreddit: ${sub.name}`)
                  return false
                }
                return sub.name && !suggestions.includes(sub.name)
              })
              .map((sub: SubredditData) => sub.name)
            
            suggestions.push(...subredditNames)
            console.log(`API: Added ${subredditNames.length} more suggestions from search_subreddits`)
          }
        } else {
          console.log(`API: search_subreddits failed with status ${response.status}`)
        }
      } catch (error) {
        console.log(`API: search_subreddits error:`, error)
      }
    }

    // Clean up and limit results
    const uniqueSuggestions = [...new Set(suggestions)]
      .filter(name => name && name.length >= 3) // Filter out very short names
      .slice(0, 8) // Limit to 8 suggestions

    console.log(`API: Returning ${uniqueSuggestions.length} unique suggestions:`, uniqueSuggestions)

    return NextResponse.json(
      { 
        suggestions: uniqueSuggestions,
        query,
        source: 'reddit_api'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in search-subreddits:', error)
    
    // Return empty suggestions on error rather than failing completely
    return NextResponse.json(
      { 
        suggestions: [],
        error: 'Search temporarily unavailable'
      },
      { status: 200 }
    )
  }
}
