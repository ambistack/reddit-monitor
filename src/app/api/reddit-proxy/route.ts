import { NextRequest, NextResponse } from 'next/server'

// Reddit API response interface
interface RedditData {
  data?: {
    children?: unknown[]
  }
}

// Multiple Reddit data sources to avoid rate limiting
const REDDIT_SOURCES = [
  {
    name: 'reddit_json',
    baseUrl: 'https://www.reddit.com',
    userAgent: 'Mozilla/5.0 (compatible; RedditMonitor/1.0)',
    rateLimit: 1000 // ms between requests
  },
  {
    name: 'old_reddit',
    baseUrl: 'https://old.reddit.com',
    userAgent: 'RedditBot/1.0 (Business monitoring)',
    rateLimit: 1500
  },
  {
    name: 'reddit_www',
    baseUrl: 'https://www.reddit.com',
    userAgent: 'curl/7.68.0',
    rateLimit: 2000
  }
]

// Simple in-memory rate limiting
const rateLimitTracker: Record<string, number> = {}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      
      // If we get rate limited, try next source
      if (response.status === 429) {
        console.log(`Rate limited on attempt ${i + 1}, retrying...`)
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000))
        continue
      }
      
      return response
    } catch (error) {
      console.log(`Fetch attempt ${i + 1} failed:`, error)
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000))
    }
  }
  
  throw new Error('Max retries exceeded')
}

async function fetchRedditData(subreddit: string, limit = 25): Promise<{ data: RedditData; source: string }> {
  const errors: string[] = []
  
  // Try each source until one works
  for (const source of REDDIT_SOURCES) {
    const sourceKey = `${source.name}_${subreddit}`
    const now = Date.now()
    
    // Check rate limit for this source
    if (rateLimitTracker[sourceKey] && (now - rateLimitTracker[sourceKey]) < source.rateLimit) {
      console.log(`Rate limit active for ${source.name}, skipping...`)
      continue
    }
    
    try {
      const url = `${source.baseUrl}/r/${subreddit}/hot.json?limit=${limit}`
      console.log(`Trying ${source.name}: ${url}`)
      
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': source.userAgent,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      
      rateLimitTracker[sourceKey] = now
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Success with ${source.name}`)
        return { data, source: source.name }
      } else {
        const error = `${source.name}: HTTP ${response.status}`
        console.log(`❌ ${error}`)
        errors.push(error)
      }
      
    } catch (error) {
      const errorMsg = `${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.log(`❌ ${errorMsg}`)
      errors.push(errorMsg)
    }
    
    // Add delay between source attempts
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  throw new Error(`All sources failed: ${errors.join(', ')}`)
}

export async function POST(request: NextRequest) {
  try {
    const { subreddit, limit = 25 } = await request.json()
    
    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit parameter is required' },
        { status: 400 }
      )
    }
    
    console.log(`Reddit Proxy: Fetching r/${subreddit} with limit ${limit}`)
    
    const result = await fetchRedditData(subreddit, limit)
    
    return NextResponse.json({
      success: true,
      subreddit,
      source: result.source,
      posts: result.data?.data?.children || [],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Reddit Proxy Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      subreddit: request.url,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const subreddit = url.searchParams.get('subreddit')
  const limit = parseInt(url.searchParams.get('limit') || '25')
  
  if (!subreddit) {
    return NextResponse.json(
      { error: 'subreddit query parameter is required' },
      { status: 400 }
    )
  }
  
  try {
    const result = await fetchRedditData(subreddit, limit)
    
    return NextResponse.json({
      success: true,
      subreddit,
      source: result.source,
      posts: result.data?.data?.children || [],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      subreddit,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
