import { NextRequest, NextResponse } from 'next/server'

// List of known valid subreddits for fallback
const KNOWN_VALID_SUBREDDITS = [
  // Tech
  'technology', 'programming', 'webdev', 'javascript', 'python', 'reactjs', 'nodejs', 'opensource',
  'coding', 'softwaredevelopment', 'computerscience', 'learnprogramming', 'webdesign',
  
  // Business
  'business', 'entrepreneur', 'smallbusiness', 'startups', 'marketing', 'sales', 'freelance',
  'investing', 'personalfinance', 'stocks', 'cryptocurrency',
  
  // General/Popular
  'askreddit', 'news', 'worldnews', 'todayilearned', 'explainlikeimfive', 'science', 'space',
  'futurology', 'history', 'books', 'movies', 'music', 'art', 'photography',
  
  // Gaming
  'gaming', 'games', 'pcgaming', 'nintendo', 'playstation', 'xbox', 'steam',
  
  // Location-based (major cities)
  'seattle', 'seattlewa', 'nyc', 'chicago', 'losangeles', 'sanfrancisco', 'boston',
  'london', 'toronto', 'vancouver', 'australia', 'canada', 'unitedkingdom',
  
  // Food & Lifestyle
  'food', 'cooking', 'recipes', 'baking', 'fitness', 'loseit', 'running', 'yoga',
  'diy', 'homeimprovement', 'gardening', 'woodworking',
  
  // Industry-specific
  'realestate', 'construction', 'electricians', 'plumbing', 'legaladvice',
  'medicine', 'nursing', 'teachers', 'accounting', 'consulting'
]

export async function POST(request: NextRequest) {
  try {
    const { subredditName } = await request.json()

    if (!subredditName) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Clean the subreddit name (remove r/ prefix if present)
    const cleanName = subredditName.replace(/^r\//, '').trim()
    
    if (!cleanName) {
      return NextResponse.json(
        { error: 'Invalid subreddit name' },
        { status: 400 }
      )
    }

    console.log(`API: Validating subreddit: ${cleanName}`)

    // Basic format validation
    if (cleanName.length < 3 || cleanName.length > 21) {
      return NextResponse.json(
        { 
          exists: false, 
          subreddit: cleanName,
          error: 'Subreddit names must be 3-21 characters long' 
        },
        { status: 200 }
      )
    }

    // Check for invalid characters
    if (!/^[A-Za-z0-9_]+$/.test(cleanName)) {
      return NextResponse.json(
        { 
          exists: false, 
          subreddit: cleanName,
          error: 'Subreddit names can only contain letters, numbers, and underscores' 
        },
        { status: 200 }
      )
    }

    // Check if it's in our known valid list first
    if (KNOWN_VALID_SUBREDDITS.includes(cleanName.toLowerCase())) {
      console.log(`API: ✅ ${cleanName} is in known valid list`)
      return NextResponse.json({
        exists: true,
        subreddit: cleanName,
        method: 'known_valid',
        displayName: cleanName,
        warning: 'Validated using trusted subreddit list'
      })
    }

    // For unknown subreddits, try a simple validation but be more permissive
    try {
      console.log(`API: Testing unknown subreddit: ${cleanName}`)
      
      // Try posts endpoint with a more generic User-Agent
      const postsUrl = `https://www.reddit.com/r/${cleanName}/hot.json?limit=1`
      
      const response = await fetch(postsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RedditValidator/1.0)',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      console.log(`API: Posts response status: ${response.status}`)

      if (response.status === 200) {
        const data = await response.json()
        
        if (data?.data?.children && Array.isArray(data.data.children)) {
          console.log(`API: ✅ ${cleanName} is accessible`)
          return NextResponse.json({
            exists: true,
            subreddit: cleanName,
            method: 'posts_check',
            displayName: cleanName
          })
        }
      } else if (response.status === 404) {
        console.log(`API: ❌ ${cleanName} does not exist`)
        return NextResponse.json({
          exists: false,
          subreddit: cleanName,
          method: 'not_found',
          error: 'Subreddit not found'
        })
      } else if (response.status === 403) {
        console.log(`API: ❌ ${cleanName} is private/restricted`)
        return NextResponse.json({
          exists: false,
          subreddit: cleanName,
          method: 'private',
          error: 'This subreddit is private or restricted',
          private: true
        })
      }
    } catch (error) {
      console.log(`API: API check failed for ${cleanName}, being permissive:`, error)
    }

    // If API check fails but format is valid, allow it (be permissive)
    // This handles cases where Reddit's API is having issues or rate limiting
    console.log(`API: API validation failed for ${cleanName}, but format is valid - allowing it`)
    return NextResponse.json({
      exists: true,
      subreddit: cleanName,
      method: 'format_fallback',
      displayName: cleanName,
      warning: 'Could not fully validate - assuming valid based on format'
    })

  } catch (error) {
    console.error('Error in validate-subreddit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
